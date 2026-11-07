import re
import time

if __package__:
    from .agents import (
        build_reader_agent,
        build_search_agent,
        critic_chain,
        writer_chain,
    )
else:
    from agents import (
        build_reader_agent,
        build_search_agent,
        critic_chain,
        writer_chain,
    )


def _as_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("content") or ""))
            else:
                parts.append(str(getattr(item, "text", None) or item))
        return "\n".join(part for part in parts if part)
    return str(value)


def _invoke_with_retry(run, retries: int = 5):
    if retries < 1:
        raise ValueError("At least one pipeline attempt is required.")

    last_error = None
    for _ in range(retries):
        try:
            return run()
        except Exception as exc:
            last_error = exc
            text = str(exc)
            if "rate_limit" not in text.lower() and "429" not in text:
                raise
            wait = 6.0
            match = re.search(r"try again in ([0-9.]+)s", text, re.IGNORECASE)
            if match:
                wait = float(match.group(1)) + 0.75
            time.sleep(wait)
    if last_error is not None:
        raise last_error
    raise RuntimeError("The pipeline could not complete its request.")


def _tool_output(result, tool_name: str) -> str:
    messages = result.get("messages") if isinstance(result, dict) else None
    if not messages:
        return ""

    outputs = []
    for message in messages:
        if getattr(message, "name", None) != tool_name:
            continue
        content = _as_text(getattr(message, "content", ""))
        if getattr(message, "status", "success") == "error":
            raise RuntimeError(f"{tool_name} failed: {content}")
        outputs.append(content)

    return "\n\n".join(output for output in outputs if output.strip()).strip()


def _require_output(value, stage: str) -> str:
    text = _as_text(value).strip()
    if not text:
        raise RuntimeError(f"The {stage} stage returned no usable content.")
    return text


def run_research_pipeline(topic: str) -> dict:
    topic = topic.strip()
    if len(topic) < 3:
        raise ValueError("Enter a research topic with at least 3 characters.")

    state = {
        "search_results": "",
        "scraped_content": "",
        "report": "",
        "feedback": "",
    }

    search_agent = build_search_agent()
    search_result = _invoke_with_retry(lambda: search_agent.invoke({
        "messages": [("user", f"Find recent, reliable and detailed information about : {topic}")]
    }))
    state["search_results"] = _require_output(
        _tool_output(search_result, "web_search"),
        "search agent",
    )
    if not re.search(r"https?://\S+", state["search_results"]):
        raise RuntimeError("The search agent returned no source URLs.")

    reader_agent = build_reader_agent()
    reader_result = _invoke_with_retry(lambda: reader_agent.invoke({
        "messages": [(
            "user",
            (
                f"Based on the following search results about '{topic}', "
                f"choose a listed source and scrape it for deeper content. "
                f"Use the scrape_url tool and return its findings.\n\n"
                f"Search Results:\n{state['search_results']}"
            )
        )]
    }))
    state["scraped_content"] = _require_output(
        _tool_output(reader_result, "scrape_url"),
        "reader agent",
    )

    research_combined = (
        f"SEARCH RESULTS:\n{state['search_results']}\n\n"
        f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
    )

    state["report"] = _require_output(_invoke_with_retry(lambda: writer_chain.invoke({
        "topic": topic,
        "research": research_combined
    })), "writer")

    state["feedback"] = _require_output(_invoke_with_retry(lambda: critic_chain.invoke({
        "report": state["report"][:2500]
    })), "critic")

    return state


if __name__ == "__main__":
    topic = input("\nEnter a research topic: ")
    result = run_research_pipeline(topic)
    print("\nFinal Report\n")
    print(result["report"])
    print("\nCritic Review\n")
    print(result["feedback"])
