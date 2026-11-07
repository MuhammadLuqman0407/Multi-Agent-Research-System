
import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent, MouseEvent } from 'react'

import axios from 'axios'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun } from 'docx'

import { runResearch, type ResearchResponse } from './utils/api'
import './App.css'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('cognitionx-theme')
    return saved === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function BrainLogo() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#4A90E2" />
    </svg>
  )
}

function friendlyError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return 'Unexpected error while contacting DeepThinker.'
  }

  const detail = err.response?.data?.detail

  const text =
    typeof detail === 'string'
      ? detail
      : JSON.stringify(detail ?? err.message ?? '')

  if (err.code === 'ERR_NETWORK') {
    return 'FastAPI is not reachable on port 8000.'
  }

  if (
    text.includes('rate_limit') ||
    text.includes('429') ||
    err.response?.status === 429
  ) {
    return 'Groq rate limit reached. Wait a few seconds and try again.'
  }

  if (typeof detail === 'string' && detail.length < 300) {
    return detail
  }

  return 'CognitionX could not complete this run. Try again in a moment.'
}

// Generate downloadable report files
async function generateDownloadFiles(result: ResearchResponse) {
  const content =
    `Final Report\n\n${result.report || 'No report returned.'}` +
    `\n\nCritic Review\n\n${result.feedback || 'No critic review returned.'}`

  // TXT
  const txtBlob = new Blob([content], {
    type: 'text/plain;charset=utf-8'
  })

  saveAs(txtBlob, 'report.txt')

  // TEX
  const texContent = content.replace(/([#$%&_{}])/g, '\\$1')

  const texBlob = new Blob(
    [texContent],
    { type: 'application/x-tex;charset=utf-8' }
  )

  saveAs(texBlob, 'report.tex')

  // PDF
  const pdf = new jsPDF()

  const lines = pdf.splitTextToSize(content, 180)

  let y = 20

  lines.forEach((line: string) => {
    if (y > 275) {
      pdf.addPage()
      y = 20
    }

    pdf.text(line, 15, y)
    y += 7
  })

  pdf.save('report.pdf')

  // DOCX
  const paragraphs = content.split('\n').map(
    (line) => new Paragraph({
      children: [new TextRun(line)]
    })
  )

  const doc = new Document({
    sections: [
      {
        children: paragraphs
      }
    ]
  })

  const docxBlob = await Packer.toBlob(doc)

  saveAs(docxBlob, 'report.docx')
}

function App() {
  // React states
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wave, setWave] = useState(false)
  const [result, setResult] = useState<ResearchResponse | null>(null)

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    try {
      localStorage.setItem('cognitionx-theme', theme)
    } catch {
      // Ignore storage errors
    }
  }, [theme])

  // Return home
  function goHome(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()

    setError('')
    setResult(null)
    setTopic('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Button animation
  function triggerWave() {
    setWave(false)

    window.requestAnimationFrame(() => {
      setWave(true)
    })
  }

  // Run research
  async function runQuery() {
    const query = topic.trim()

    triggerWave()

    if (query.length < 3) {
      setError('Enter a research question with at least 3 characters.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

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

  // Form submission
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runQuery()
  }

  // Enter key submission
  function onEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void runQuery()
    }
  }

  // Download handler
  async function handleDownload() {
    if (!result) return

    try {
      await generateDownloadFiles(result)
    } catch {
      setError('Unable to generate report files. Please try again.')
    }
  }

  return (
    <div className="shell">

      {/* Navigation */}
      <header className="nav">

        <a
          className="brand"
          href="#home"
          onClick={goHome}
          aria-label="CognitionX home"
        >
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
            onClick={() =>
              setTheme(theme === 'dark' ? 'light' : 'dark')
            }
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>

      </header>

      {/* Main */}
      <main id="home" className="main">

        {/* Hero */}
        <section className="hero">

          <p className="badge">
            AI-powered multi-agent research
          </p>

          <h1>
            Research deeper. Think smarter.
          </h1>

          <p className="lede">
            CognitionX DeepThinker is your research team.
            Search, analyze, verify, and generate comprehensive
            reports from one question.
          </p>

        </section>

        {/* Research Form */}
        <section
          id="research"
          className={`panel ${error ? 'panel-error' : ''}`}
        >

          <h2>
            What would you like DeepThinker to research?
          </h2>

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
                className={`send ${wave || loading ? 'wave' : ''
                  } ${error ? 'error-wave' : ''}`}
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
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 4.5 5.8 10.2l1.4 1.4L11 8.8V19h2V8.8l3.8 2.8 1.4-1.4z"
                    />
                  </svg>
                )}

              </button>

            </div>

          </form>

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          {loading && (
            <div className="progress" role="status">

              <span className="pulse" />

              Research agents are working through your question...

            </div>
          )}

        </section>

        {/* Research Results */}
        {result && (

          <section id="report" className="results">

            <p className="badge">
              CognitionX report
            </p>

            <h2 className="result-title">
              {result.topic}
            </h2>

            <article className="panel">

              <h2>Final report</h2>

              <pre>
                {result.report || 'No report returned.'}
              </pre>

            </article>

            <article className="panel">

              <h2>Critic review</h2>

              <pre>
                {result.feedback || 'No critic review returned.'}
              </pre>

            </article>

            <article className="panel">

              <h2>Search results</h2>

              <pre>
                {result.search_results || 'No search results returned.'}
              </pre>

            </article>

            <article className="panel">

              <h2>Scraped content</h2>

              <pre>
                {result.scraped_content || 'No scraped content returned.'}
              </pre>

            </article>

            {/* Download */}
            <button
              className="download-btn"
              type="button"
              onClick={handleDownload}
            >
              Download Report (PDF / DOCX / TEX / TXT)
            </button>

          </section>

        )}

      </main>

    </div>
  )
}

export default App
