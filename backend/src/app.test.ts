import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'
import { InMemoryTaskRepository } from './tasks/in-memory-task.repository.js'
import type { TaskRepository } from './tasks/task.repository.js'

const CORS_ORIGIN = 'http://localhost:5173'

function buildApp(taskRepository: TaskRepository = new InMemoryTaskRepository()) {
  return createApp({ corsOrigin: CORS_ORIGIN, taskRepository })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('app', () => {
  it('returns 404 in the standard error shape for an unknown route', async () => {
    const response = await request(buildApp()).get('/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /unknown not found' },
    })
  })

  it('allows the configured CORS origin', async () => {
    const response = await request(buildApp()).get('/tasks').set('Origin', CORS_ORIGIN)

    expect(response.headers['access-control-allow-origin']).toBe(CORS_ORIGIN)
  })

  it('does not send the X-Powered-By header', async () => {
    const response = await request(buildApp()).get('/tasks')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('hides internal errors behind a generic 500 response and logs them', async () => {
    const internalMessage = 'Database connection lost'
    const fail = (): Promise<never> => Promise.reject(new Error(internalMessage))
    const failingRepository: TaskRepository = { findAll: fail, create: fail, updateStatus: fail }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(buildApp(failingRepository)).get('/tasks')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
    })
    expect(response.text).not.toContain(internalMessage)
    expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ message: internalMessage }))
  })
})
