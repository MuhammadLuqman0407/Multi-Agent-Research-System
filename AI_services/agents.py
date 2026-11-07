from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

if __package__:
    from .tools import scrape_url, web_search
else:
    from tools import scrape_url, web_search

load_dotenv()

# Use an available Groq model (openai/gpt-oss-20b)
llm = ChatGroq(
    model="openai/gpt-oss-20b",
    temperature=0,
    max_retries=6,
)

# 1st agent 
def build_search_agent():
    return create_agent(
        model=llm,
        tools=[web_search],
        system_prompt=(
            "You are a web research agent. Always call web_search for the user's "
            "topic. Return the search tool's source URLs and snippets without "
            "inventing facts or citations."
        ),
    )


# 2nd agent
def build_reader_agent():
    return create_agent(
        model=llm,
        tools=[scrape_url],
        system_prompt=(
            "You are a research reader agent. Choose a URL that appears in the "
            "provided search results, call scrape_url on it, and summarize only "
            "the content returned by that tool. Do not invent sources."
        ),
    )

# creat the chat template
writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "You are an expert research writer. Write clear, structured reports using "
            "only the supplied search and scraped content. Do not invent facts or "
            "citations; identify gaps when the evidence is limited."
        ),
    ),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

# create the critic chain

critic_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt | llm | StrOutputParser()

# if __name__ == "__main__":
    # print(scrape_url.invoke("https://dev.to/"))