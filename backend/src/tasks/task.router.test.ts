import type { Express } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { InMemoryTaskRepository } from './in-memory-task.repository.js'
import { TITLE_MAX_LENGTH } from './task.schemas.js'

const CORS_ORIGIN = 'http://localhost:5173'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

let app: Express

beforeEach(() => {
  app = createApp({ corsOrigin: CORS_ORIGIN, taskRepository: new InMemoryTaskRepository() })
})

function postTask(body: object): request.Test {
  return request(app).post('/tasks').send(body)
}

function expectValidationError(response: request.Response, field: string): void {
  expect(response.status).toBe(400)
  expect(response.body.error.code).toBe('VALIDATION_ERROR')
  expect(response.body.error.details).toContainEqual(expect.objectContaining({ field }))
}

describe('GET /tasks', () => {
  it('returns an empty list when there are no tasks', async () => {
    const response = await request(app).get('/tasks')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('returns tasks in creation order', async () => {
    await postTask({ title: 'First' })
    await postTask({ title: 'Second' })

    const response = await request(app).get('/tasks')

    expect(response.status).toBe(200)
    expect(response.body.map((task: { title: string }) => task.title)).toEqual(['First', 'Second'])
  })
})

describe('POST /tasks', () => {
  it('creates a pending task with a generated id', async () => {
    const response = await postTask({ title: 'Buy milk' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      title: 'Buy milk',
      status: 'pending',
    })
  })

  it('trims the title', async () => {
    const response = await postTask({ title: '  Buy milk  ' })

    expect(response.body.title).toBe('Buy milk')
  })

  it('accepts an explicit status', async () => {
    const response = await postTask({ title: 'Buy milk', status: 'completed' })

    expect(response.status).toBe(201)
    expect(response.body.status).toBe('completed')
  })

  it('accepts a title of exactly the maximum length', async () => {
    const response = await postTask({ title: 'a'.repeat(TITLE_MAX_LENGTH) })

    expect(response.status).toBe(201)
  })

  it('makes the created task visible in the list', async () => {
    const created = await postTask({ title: 'Buy milk' })

    const response = await request(app).get('/tasks')

    expect(response.body).toEqual([created.body])
  })

  it('rejects a missing title', async () => {
    expectValidationError(await postTask({}), 'title')
  })

  it('rejects a whitespace-only title', async () => {
    expectValidationError(await postTask({ title: '   ' }), 'title')
  })

  it('rejects a title over the maximum length', async () => {
    expectValidationError(await postTask({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }), 'title')
  })

  it('rejects an invalid status', async () => {
    expectValidationError(await postTask({ title: 'Buy milk', status: 'done' }), 'status')
  })

  it('rejects a client-provided id as an unknown field', async () => {
    const response = await postTask({ title: 'Buy milk', id: 'abc' })

    expectValidationError(response, 'id')
    expect(response.body.error.details).toContainEqual({ field: 'id', message: 'Unknown field' })
  })

  it('rejects a body that is not JSON', async () => {
    const response = await request(app)
      .post('/tasks')
      .set('Content-Type', 'text/plain')
      .send('Buy milk')

    expectValidationError(response, 'body')
    expect(response.body.error.details).toContainEqual({
      field: 'body',
      message: 'Request body must be a JSON object',
    })
  })

  it('rejects malformed JSON', async () => {
    const response = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title":')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('rejects a body over the size limit', async () => {
    const response = await postTask({ title: 'a'.repeat(20 * 1024) })

    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})

describe('PATCH /tasks/:id', () => {
  it('marks a pending task as completed', async () => {
    const created = await postTask({ title: 'Buy milk' })

    const response = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .send({ status: 'completed' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ...created.body, status: 'completed' })
  })

  it('moves a completed task back to pending', async () => {
    const created = await postTask({ title: 'Buy milk', status: 'completed' })

    const response = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .send({ status: 'pending' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('pending')
  })

  it('persists the new status', async () => {
    const created = await postTask({ title: 'Buy milk' })
    await request(app).patch(`/tasks/${created.body.id}`).send({ status: 'completed' })

    const response = await request(app).get('/tasks')

    expect(response.body[0].status).toBe('completed')
  })

  it.each([UNKNOWN_ID, 'not-a-uuid'])('returns 404 for unknown id %s', async (id) => {
    const response = await request(app).patch(`/tasks/${id}`).send({ status: 'completed' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('rejects an invalid status', async () => {
    const created = await postTask({ title: 'Buy milk' })

    const response = await request(app).patch(`/tasks/${created.body.id}`).send({ status: 'done' })

    expectValidationError(response, 'status')
  })

  it('rejects a missing status', async () => {
    const created = await postTask({ title: 'Buy milk' })

    const response = await request(app).patch(`/tasks/${created.body.id}`).send({})

    expectValidationError(response, 'status')
  })

  it('rejects unknown fields', async () => {
    const created = await postTask({ title: 'Buy milk' })

    const response = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .send({ status: 'completed', title: 'Renamed' })

    expectValidationError(response, 'title')
  })
})
