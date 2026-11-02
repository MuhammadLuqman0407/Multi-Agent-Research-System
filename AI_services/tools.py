from langchain.tools import tool
from langchain_core.tools import tool
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from tavily import TavilyClient
from rich import print

import requests
import os

load_dotenv()

tavily = TavilyClient(api_key = os.getenv("TAVILY_API_KEY"))

@tool
def web_search(query : str) -> str:
    """
    Use this tool to search the web for information. 
    Input should be a search query.
    Output will be a summary of the search results.
    """

    try:
        results = tavily.search(query, max_results=3)
        out = []

        for res in results["results"]:
            title = res.get("title", "No title")
            url = res.get("url", "No URL")
            snippet = res.get("content", "No snippet")
            out.append(f"Title: {title}\nURL: {url}\nSnippet: {snippet}\n")


        return "\n---\n".join(out) 
        
    except Exception as e:
        print(f"[red]Error during web search: {e}[/red]")
        return "An error occurred during the web search."

# print(web_search.invoke("What are the recent news about the PCB"))

@tool
def scrape_url(url: str) -> str:
    """
    Scrape and return clean text content from a given URL for deeper reading.
    """
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for tag in soup(["script", "style", "header", "footer", "nav"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)[:3000]
    except Exception as e:
        print(f"[red]Error during URL scraping: {e}[/red]")
        return "An error occurred while scraping the URL."

# print(scrape_url.invoke("https://dev.to/574n13y/an-in-depth-look-at-nginx-the-modern-web-server-and-its-applications-in-web-and-application-backend-infrastructure-28pn"))