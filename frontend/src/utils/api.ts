import axios from 'axios'

/**
 * Shape of the response returned by the backend `/api/research` endpoint.
 */
export type ResearchResponse = {
  topic: string
  search_results: string
  scraped_content: string
  report: string
  feedback: string
}

/**
 * Helper for retrying a promise-returning function with exponential back‑off.
 * It is primarily used to mitigate Groq API rate‑limit (HTTP 429) responses.
 *
 * @param fn        The async function to execute.
 * @param attempts  Number of attempts (default 3).
 * @param delayMs   Base delay in ms before the first retry (defaults to 1000).
 */
async function retryRequest<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  let lastError: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const status = (err as any)?.response?.status
      // Only retry on rate‑limit (429) or network errors (no status)
      if (status && status !== 429) {
        // For other HTTP errors, fail fast
        throw err
      }
      // Wait before next attempt (exponential back‑off)
      const wait = delayMs * Math.pow(2, i)
      await new Promise(res => setTimeout(res, wait))
    }
  }
  // All attempts failed – re‑throw the last error
  throw lastError
}

// Axios instance configured for the FastAPI backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 300_000, // 5 minutes – enough for heavy research pipelines
})

/**
 * Calls the `/api/research` endpoint with built‑in retry support.
 * The backend forwards the request to the Groq LLM; if Groq returns a 429
 * (rate limit), this function will automatically retry a few times before
 * bubbling the error up to the UI where it is shown via `friendlyError`.
 */
export async function runResearch(topic: string): Promise<ResearchResponse> {
  return retryRequest(() =>
    api.post<ResearchResponse>('/api/research', { topic }).then(r => r.data)
  )
}
