import express, { type Express } from 'express'
import cors from 'cors'

export interface AppOptions {
  corsOrigin: string
}

// Dependencies are passed in so tests can build an isolated app.
export function createApp({ corsOrigin }: AppOptions): Express {
  const app = express()

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())

  return app
}
