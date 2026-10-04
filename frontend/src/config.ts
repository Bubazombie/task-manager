const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export interface Config {
  apiBaseUrl: string
}

// Fail at startup with a clear message instead of sending requests to a broken URL.
function parseApiBaseUrl(value: string | undefined): string {
  const url = value?.trim() || DEFAULT_API_BASE_URL
  if (!URL.canParse(url)) {
    throw new Error(`Invalid VITE_API_BASE_URL: "${url}"`)
  }
  return url.replace(/\/+$/, '')
}

export const config: Config = {
  apiBaseUrl: parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
}
