import os
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain_core.tools import tool
from tavily import TavilyClient

load_dotenv()

@tool
def web_search(query: str) -> str:
    """
    Use this tool to search the web for information. 
    Input should be a search query.
    Output will be a summary of the search results.
    """

    query = query.strip()
    if not query:
        raise ValueError("A search query is required.")

    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not configured.")

    results = TavilyClient(api_key=api_key).search(query, max_results=3)
    entries = []
    for result in results.get("results", []):
        url = result.get("url")
        if not url:
            continue
        title = result.get("title") or "Untitled source"
        snippet = result.get("content") or "No summary provided."
        entries.append(f"Title: {title}\nURL: {url}\nSnippet: {snippet}")

    if not entries:
        raise RuntimeError("Web search returned no usable sources.")

    return "\n---\n".join(entries)

@tool
def scrape_url(url: str) -> str:
    """
    Scrape and return clean text content from a given URL for deeper reading.
    """
    parsed_url = urlparse(url.strip())
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise ValueError("The source URL must use HTTP or HTTPS.")

    response = requests.get(
        parsed_url.geturl(),
        timeout=15,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "header", "footer", "nav"]):
        tag.decompose()

    content = soup.get_text(separator=" ", strip=True)
    if not content:
        raise RuntimeError("The source page did not contain readable text.")

    return content[:3000]