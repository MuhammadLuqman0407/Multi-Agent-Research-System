import axios from 'axios'

export type ResearchResponse = {
  topic: string
  search_results: string
  scraped_content: string
  report: string
  feedback: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 300000,
})

export async function runResearch(topic: string): Promise<ResearchResponse> {
  const { data } = await api.post<ResearchResponse>('/api/research', { topic })
  return data
}
