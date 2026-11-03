import re
import time

from agents import build_reader_agent, build_search_agent, writer_chain, critic_chain


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


def _last_message_text(result) -> str:
    messages = result.get("messages") if isinstance(result, dict) else None
    if not messages:
        return _as_text(result)
    last = messages[-1]
    return _as_text(getattr(last, "content", last))


def _invoke_with_retry(run, retries=5):
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
            match = re.search(r"try again in ([0-9.]+)s", text, re.I)
            if match:
                wait = float(match.group(1)) + 0.75
            time.sleep(wait)
    raise last_error


def run_research_pipeline(topic: str) -> dict:
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
    state["search_results"] = _last_message_text(search_result)

    reader_agent = build_reader_agent()
    reader_result = _invoke_with_retry(lambda: reader_agent.invoke({
        "messages": [(
            "user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{state['search_results'][:800]}"
        )]
    }))
    state["scraped_content"] = _last_message_text(reader_result)

    research_combined = (
        f"SEARCH RESULTS : \n {state['search_results'][:1500]} \n\n"
        f"DETAILED SCRAPED CONTENT : \n{state['scraped_content'][:1500]}"
    )

    state["report"] = _as_text(_invoke_with_retry(lambda: writer_chain.invoke({
        "topic": topic,
        "research": research_combined
    })))

    state["feedback"] = _as_text(_invoke_with_retry(lambda: critic_chain.invoke({
        "report": state["report"][:2500]
    })))

    return state


if __name__ == "__main__":
    topic = input("\n Enter a research topic : ")
    run_research_pipeline(topic)
