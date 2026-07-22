const env: Readonly<Record<string, string>> = {
  API_URL: import.meta.env.VITE_API_URL,
  RATE_LIMIT: import.meta.env.VITE_RATE_LIMIT,
  REFRESH_INTERVAL: import.meta.env.VITE_REFRESH_INTERVAL
}

export default env;