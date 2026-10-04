import { z } from 'zod'

const DEFAULT_PORT = 3000
const MAX_PORT = 65535
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  // Browsers send a bare origin (no path, no trailing slash), so anything else would never match.
  CORS_ORIGIN: z
    .url({ protocol: /^https?$/ })
    .default(DEFAULT_CORS_ORIGIN)
    .transform((value) => new URL(value).origin),
})

export interface Config {
  port: number
  corsOrigin: string
}

// Fail at startup rather than at the first request that needs a bad value.
function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
  }
  return { port: result.data.PORT, corsOrigin: result.data.CORS_ORIGIN }
}

export const config: Config = loadConfig(process.env)
