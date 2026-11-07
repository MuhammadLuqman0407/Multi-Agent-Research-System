# 🧠 Multi-Agent Research System — CognitionX DeepThinker

An AI-powered multi-agent research system that searches, reads, writes, and critiques research reports — all from a single question typed in the UI.

---

## 📋 Prerequisites

- **Python 3.11+** (virtual-env recommended)
- **Node.js 20+** and npm (for the React/Vite frontend)
- **Docker & Docker Compose** *(optional — for one-command start)*
- A **Tavily** API key (web search) and a **Groq** API key (LLM)

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd Multi-Agent-Research-System
```

### 2. Create the `.env` files
Both the root `.env` and `AI_services/.env` must contain:
```dotenv
TAVILY_API_KEY=your-tavily-key
GROQ_API_KEY=your-groq-key
```

### 3. Install Python dependencies
```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 🖥️ How to Run All Servers

### Option A — Run Everything Locally (3 terminals)

#### Terminal 1 — Backend (FastAPI on port 8000)
```bash
# From the project root
.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2 — AI Services *(optional, if you extend it)*
```bash
cd AI_services
.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### Terminal 3 — Frontend (Vite dev server on port 5173)
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

### Option B — Docker Compose (single command)
```bash
docker-compose up --build
```
- Backend → `http://localhost:8000`
- Frontend → `http://localhost:5173`

---

## 🔄 How It Works

1. **User** types a research topic in the UI and clicks the submit button.
2. **Frontend** (`App.tsx`) sends a `POST /api/research` request to the backend.
3. **Backend** (`backend/main.py`) calls `run_research_pipeline(topic)` from `AI_services/pipeline.py`.
4. The **pipeline** runs 4 steps:
   - 🔍 **Search Agent** — uses Tavily to search the web for sources
   - 📖 **Reader Agent** — picks the best URL and scrapes full-text content
   - ✍️ **Writer Chain** — generates a structured research report
   - 🧐 **Critic Chain** — scores and reviews the report
5. **Backend** returns the full result (search results, scraped content, report, feedback) as JSON.
6. **Frontend** displays the report and review, shows the source material, and can export reports as PDF, Word, text, or LaTeX.

---

## 📂 Project Structure

```
Multi-Agent-Research-System/
├── .env                     # Root environment variables
├── agents.py                # Compatibility exports for AI_services agents
├── pipeline.py              # CLI entry point for the shared research pipeline
├── tools.py                 # Compatibility exports for AI_services tools
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # Docker multi-container setup
│
├── AI_services/             # ← Used by the backend
│   ├── .env                 # API keys (Tavily + Groq)
│   ├── agents.py            # LangChain agents (search, reader, writer, critic)
│   ├── pipeline.py          # Full research pipeline with retry logic
│   ├── tools.py             # Custom LangChain tools
│   └── requirements.txt
│
├── backend/
│   ├── main.py              # FastAPI app — POST /api/research endpoint
│   ├── Dockerfile           # Container definition
│   ├── requirements.txt
│   └── __init__.py
│
└── frontend/
    ├── public/
    │   └── logo.svg           # CognitionX brand mark and favicon
    ├── src/
    │   ├── App.tsx           # Main React component (form + results)
    │   ├── App.css           # Responsive UI and theme styling
    │   └── utils/api.ts      # Axios client → backend
    ├── package.json
    └── vite.config.ts
```

---

## ✅ Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | `AI_services/agents.py` used model `llama-3.1-8b-instant` — **not available** on this Groq account | Changed to `openai/gpt-oss-20b` |
| 2 | `AI_services/tools.py` had duplicate `from langchain.tools import tool` | Removed redundant import, kept `langchain_core.tools` |
| 3 | Root `tools.py` had the same duplicate import | Fixed |
| 4 | `.env` files had spaces around `=` (e.g., `KEY = "value"`) | Cleaned to `KEY=value` |
| 5 | Frontend `friendlyError()` truncated backend errors at 180 chars, hiding real messages | Raised limit to 300 chars |

---

## 🧪 Quick Test (CLI)

```bash
python AI_services/pipeline.py
# → Enter a research topic when prompted
```

---

## 🛠️ Troubleshooting

- **"CognitionX could not complete this run"** — The backend hit an error. Check the terminal running `uvicorn` for the full traceback.
- **"model does not exist"** — Your Groq API key doesn't have access to the configured model. Run the model-check script to see available models.
- **Rate limit (429)** — Groq free tier has token-per-minute limits. Wait a few seconds and try again.
- **Frontend can't reach backend** — Make sure the backend is running on port 8000. Check CORS settings in `backend/main.py`.
