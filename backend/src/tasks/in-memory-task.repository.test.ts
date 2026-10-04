import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryTaskRepository } from './in-memory-task.repository.js'

let repository: InMemoryTaskRepository

beforeEach(() => {
  repository = new InMemoryTaskRepository()
})

describe('InMemoryTaskRepository', () => {
  it('stores a task with a generated id', async () => {
    const task = await repository.create({ title: 'Buy milk', status: 'pending' })

    expect(task).toEqual({ id: expect.any(String), title: 'Buy milk', status: 'pending' })
    expect(await repository.findAll()).toEqual([task])
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
