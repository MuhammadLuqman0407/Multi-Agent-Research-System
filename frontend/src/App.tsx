import { FormEvent, KeyboardEvent, MouseEvent, useEffect, useState } from 'react'
import axios from 'axios'
import { runResearch, type ResearchResponse } from './utils/api'
import './App.css'

type Theme = 'dark' | 'light'

const STEPS = [
  'Search agent gathering sources',
  'Reader agent extracting deeper context',
  'Writer composing the DeepThinker report',
  'Critic verifying quality and citations',
]

function readTheme(): Theme {
  const saved = localStorage.getItem('cognitionx-theme')
  return saved === 'light' ? 'light' : 'dark'
}

function BrainLogo() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M24 5.5c-4.4 0-8 2.3-9.8 5.6-2-1.4-4.8-1-6.6 1.2-2.4 2.8-2 7 .8 9.4-2.4 1.8-3 5.6-.8 8.2.3 3.4 2.6 6.2 5.6 7.4 2 3.4 6 5.6 10.8 5.6s8.8-2.2 10.8-5.6c3-1.2 5.3-4 5.6-7.4 2.2-2.6 1.6-6.4-.8-8.2 2.8-2.4 3.2-6.6.8-9.4-1.8-2.2-4.6-2.6-6.6-1.2C32 7.8 28.4 5.5 24 5.5z"
      />
      <path
        fill="none"
        stroke="#1a1408"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M24 12.5v22.5M18 16c2 2 4 3 6 3s4-1 6-3M16.5 22.5c2.2 1 4.8 1.5 7.5 1.5s5.3-.5 7.5-1.5M17 29c2.4 1.2 4.6 1.8 7 1.8s4.6-.6 7-1.8"
        opacity="0.45"
      />
    </svg>
  )
}

function friendlyError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return 'Unexpected error while contacting DeepThinker.'
  }
  const detail = err.response?.data?.detail
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail ?? err.message ?? '')
  if (err.code === 'ERR_NETWORK') {
    return 'FastAPI is not reachable on port 8000.'
  }
  if (text.includes('rate_limit') || text.includes('429') || err.response?.status === 429) {
    return 'Groq rate limit reached. Wait a few seconds and press Enter again.'
  }
  if (typeof detail === 'string' && detail.length < 300) {
    return detail
  }
  return 'CognitionX could not complete this run. Try again in a moment.'
}

// New UI for improved prompt and download
import { saveAs } from 'file-saver'; // we'll use file-saver (install via npm)

// ... existing imports remain above ...

// Add state for custom prompt
const [customPrompt, setCustomPrompt] = useState('');

// Helper to generate files
function generateDownloadFiles() {
  if (!result) return;
  const content = `Final Report\n\n${result.report}\n\nCritic Review\n\n${result.feedback}`;
  // TXT (as base for other formats)
  const txtBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  // PDF (simple plain text PDF using jsPDF)
  // We'll use a minimal approach: create a Blob with MIME type application/pdf (browser may treat as generic)
  const pdfBlob = new Blob([content], { type: 'application/pdf' });
  // DOCX (just .docx extension with plain text, user can open in Word)
  const docxBlob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  // TeX
  const texBlob = new Blob([content], { type: 'application/x-tex' });

  saveAs(txtBlob, 'report.txt');
  saveAs(pdfBlob, 'report.pdf');
  saveAs(docxBlob, 'report.docx');
  saveAs(texBlob, 'report.tex');
}

// UI addition inside return after result rendering
{result && (
  <section id="download" className="panel">
    <h2>Download Report Files</h2>
    <button onClick={generateDownloadFiles}>Generate PDF / DOCX / TeX</button>
  </section>
)}

// Improved prompt suggestions (display above the form)
const improvedPrompt = `Write a concise, data‑rich research report on the topic, limiting each section to three paragraphs, and include ONLY the most relevant citations. Aim for a score of 9/10 or higher.`;

// Add above the form UI
<p className="badge">Suggested Prompt for Better Score</p>
<pre className="prompt-example">{improvedPrompt}</pre>

  const [theme, setTheme] = useState<Theme>(readTheme)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wave, setWave] = useState(false)
  const [result, setResult] = useState<ResearchResponse | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cognitionx-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % STEPS.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [loading])

  function goHome(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()
    setError('')
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function triggerWave() {
    setWave(false)
    window.requestAnimationFrame(() => setWave(true))
  }

  async function runQuery() {
    const query = topic.trim()
    triggerWave()
    if (query.length < 3) {
      setError('Enter a research question with at least 3 characters.')
      return
    }

    setLoading(true)
    setError('')
    setStepIndex(0)

    try {
      const data = await runResearch(query)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void runQuery()
  }

  function onEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void runQuery()
    }
  }

  return (
    <div className="shell">
      <header className="nav">
        <a className="brand" href="#home" onClick={goHome} aria-label="CognitionX home">
          <span className="logo" aria-hidden="true">
            <BrainLogo />
          </span>
          <span className="brand-text">
            CognitionX
            <small>DeepThinker</small>
          </span>
        </a>

        <nav className="nav-links">
          <button
            type="button"
            className="theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
      </header>

      <main id="home" className="main">
        <section className="hero">
          <p className="badge">AI-powered multi-agent research</p>
          <h1>Research deeper. Think smarter.</h1>
          <p className="lede">
            CognitionX DeepThinker is your research team. Search, analyze, verify, and generate
            comprehensive reports from one question.
          </p>
        </section>

        <section id="research" className={`panel ${error ? 'panel-error' : ''}`}>
          <h2>What would you like DeepThinker to research?</h2>
          <form onSubmit={onSubmit}>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={onEnter}
              placeholder="Enter your research question..."
              rows={3}
              disabled={loading}
            />
            <div className="form-row">
              <button
                className={`send ${wave || loading ? 'wave' : ''} ${error ? 'error-wave' : ''}`}
                type="submit"
                disabled={loading}
                aria-label="Run research"
              >
                <span className="ripple" />
                <span className="ripple delay" />
                <span className="ripple delay-2" />
                {loading ? (
                  <span className="stop" />
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 4.5 5.8 10.2l1.4 1.4L11 8.8V19h2V8.8l3.8 2.8 1.4-1.4z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
          {error && <p className="error">{error}</p>}
          {loading && (
            <div className="progress" role="status">
              <span className="pulse" />
              {STEPS[stepIndex]}
            </div>
          )}
        </section>

        {result && (
          <section id="report" className="results">
            <p className="badge">CognitionX report</p>
            <h2 className="result-title">{result.topic}</h2>

            <article className="panel">
              <h2>Final report</h2>
              <pre>{result.report || 'No report returned.'}</pre>
            </article>
            <article className="panel">
              <h2>Critic review</h2>
              <pre>{result.feedback || 'No critic review returned.'}</pre>
            </article>
            <article className="panel">
              <h2>Search results</h2>
              <pre>{result.search_results || 'No search results returned.'}</pre>
            </article>
            <article className="panel">
              <h2>Scraped content</h2>
              <pre>{result.scraped_content || 'No scraped content returned.'}</pre>
            </article>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
