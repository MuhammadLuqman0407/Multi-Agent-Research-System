import asyncio
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
AI_DIR = ROOT / "AI_services"

sys.path.insert(0, str(AI_DIR))
load_dotenv(AI_DIR / ".env")
load_dotenv(ROOT / ".env")

from pipeline import run_research_pipeline  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cognitionx")

app = FastAPI(title="CognitionX", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)


class ResearchResponse(BaseModel):
    topic: str
    search_results: str
    scraped_content: str
    report: str
    feedback: str


@app.get("/")
def root():
    return {
        "service": "CognitionX",
        "health": "/health",
        "research": "/api/research",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "CognitionX"}


@app.post("/api/research", response_model=ResearchResponse)
async def research(payload: ResearchRequest):
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    try:
        state = await asyncio.to_thread(run_research_pipeline, topic)
    except Exception as exc:
        logger.exception("Research pipeline failed")
        message = str(exc) or "Research pipeline failed"
        if "rate_limit" in message.lower() or "429" in message:
            raise HTTPException(
                status_code=429,
                detail="Groq rate limit reached. Wait a few seconds and press Enter again.",
            ) from exc
        raise HTTPException(status_code=500, detail=message) from exc

    return ResearchResponse(
        topic=topic,
        search_results=str(state.get("search_results") or ""),
        scraped_content=str(state.get("scraped_content") or ""),
        report=str(state.get("report") or ""),
        feedback=str(state.get("feedback") or ""),
    )
