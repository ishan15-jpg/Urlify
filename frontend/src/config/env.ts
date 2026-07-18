const env: Readonly<Record<string, string>> = {
  API_URL: import.meta.env.VITE_API_URL,
  RATE_LIMIT: import.meta.env.VITE_RATE_LIMIT
}

export default env;