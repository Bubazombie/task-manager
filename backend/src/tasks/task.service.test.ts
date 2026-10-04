import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../errors/not-found-error.js'
import { InMemoryTaskRepository } from './in-memory-task.repository.js'
import { TaskService } from './task.service.js'

let service: TaskService

beforeEach(() => {
  service = new TaskService(new InMemoryTaskRepository())
})

describe('TaskService', () => {
  it('creates a task with the default pending status', async () => {
    const task = await service.create({ title: 'Buy milk' })

    expect(task.status).toBe('pending')
  })

  it('keeps an explicitly provided status', async () => {
    const task = await service.create({ title: 'Buy milk', status: 'completed' })

    expect(task.status).toBe('completed')
  })

  it('lists tasks in creation order', async () => {
    const first = await service.create({ title: 'First' })
    const second = await service.create({ title: 'Second' })

    expect(await service.list()).toEqual([first, second])
  })

  it('updates the status in both directions', async () => {
    const task = await service.create({ title: 'Buy milk' })

    expect((await service.updateStatus(task.id, 'completed')).status).toBe('completed')
    expect((await service.updateStatus(task.id, 'pending')).status).toBe('pending')
  })

  it('throws NotFoundError when updating an unknown task', async () => {
    await expect(service.updateStatus('missing', 'completed')).rejects.toBeInstanceOf(NotFoundError)
  })
})
