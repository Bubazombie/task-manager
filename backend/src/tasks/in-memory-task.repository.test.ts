import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryTaskRepository } from './in-memory-task.repository.js'

const NOW = new Date('2026-03-14T09:26:53.589Z')

let repository: InMemoryTaskRepository

beforeEach(() => {
  repository = new InMemoryTaskRepository(() => NOW)
})

describe('InMemoryTaskRepository', () => {
  it('stores a task with a generated id and the creation time from the clock', async () => {
    const task = await repository.create({ title: 'Buy milk', status: 'pending' })

    expect(task).toEqual({
      id: expect.any(String),
      title: 'Buy milk',
      status: 'pending',
      createdAt: NOW.toISOString(),
    })
    expect(await repository.findAll()).toEqual([task])
  })

  it('uses the current time when no clock is given', async () => {
    const before = Date.now()
    const task = await new InMemoryTaskRepository().create({ title: 'Buy milk', status: 'pending' })
    const after = Date.now()

    const createdAt = Date.parse(task.createdAt)
    expect(createdAt).toBeGreaterThanOrEqual(before)
    expect(createdAt).toBeLessThanOrEqual(after)
  })

  it('keeps the creation time when the status changes', async () => {
    const created = await repository.create({ title: 'Buy milk', status: 'pending' })

    const updated = await repository.updateStatus(created.id, 'completed')

    expect(updated?.createdAt).toBe(created.createdAt)
  })

  it('returns tasks in insertion order', async () => {
    await repository.create({ title: 'First', status: 'pending' })
    await repository.create({ title: 'Second', status: 'pending' })

    const titles = (await repository.findAll()).map((task) => task.title)

    expect(titles).toEqual(['First', 'Second'])
  })

  it('returns undefined when updating an unknown id', async () => {
    expect(await repository.updateStatus('missing', 'completed')).toBeUndefined()
  })

  it('does not let callers mutate stored tasks through returned objects', async () => {
    const created = await repository.create({ title: 'Buy milk', status: 'pending' })
    created.title = 'Changed after create'

    const [listed] = await repository.findAll()
    if (listed) {
      listed.title = 'Changed after findAll'
    }

    const updated = await repository.updateStatus(created.id, 'completed')
    if (updated) {
      updated.title = 'Changed after update'
    }

    const [stored] = await repository.findAll()
    expect(stored?.title).toBe('Buy milk')
  })
})
