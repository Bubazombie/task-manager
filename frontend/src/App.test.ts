import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tasksApi from '@/api/tasks'
import type { Task } from '@/types/task'
import App from './App.vue'

vi.mock('@/api/tasks')
const api = vi.mocked(tasksApi)

const existingTask: Task = { id: '1', title: 'Buy milk', status: 'pending' }

let wrapper: VueWrapper | undefined

async function mountApp(): Promise<VueWrapper> {
  wrapper = mount(App, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

function announcement(app: VueWrapper): string {
  return app.find('[aria-live="polite"]').text()
}

beforeEach(() => {
  vi.resetAllMocks()
  api.fetchTasks.mockResolvedValue([existingTask])
})

afterEach(() => {
  wrapper?.unmount()
})

describe('App', () => {
  it('loads and shows the tasks with a summary', async () => {
    const app = await mountApp()

    expect(app.find('li').text()).toContain('Buy milk')
    expect(app.text()).toContain('1 pending, 0 completed')
  })

  it('adds a task: shows it first, clears the input, keeps focus, and announces it', async () => {
    api.createTask.mockResolvedValue({ id: '2', title: 'Call the bank', status: 'pending' })
    const app = await mountApp()
    const input = app.find('input')

    await input.setValue('Call the bank')
    await app.find('form').trigger('submit')
    await flushPromises()

    expect(app.findAll('li').map((item) => item.find('p').text())).toEqual([
      'Call the bank',
      'Buy milk',
    ])
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(input.element)
    expect(announcement(app)).toBe('Task added.')
  })

  it('marks a task as completed from the server response and announces it', async () => {
    api.updateTaskStatus.mockResolvedValue({ ...existingTask, status: 'completed' })
    const app = await mountApp()

    await app.find('li button').trigger('click')
    await flushPromises()

    const item = app.find('li')
    expect(api.updateTaskStatus).toHaveBeenCalledWith('1', 'completed')
    expect(item.text()).toContain('Completed')
    expect(item.find('button').text()).toBe('Mark as pending')
    expect(announcement(app)).toBe('Marked as completed.')
  })
})
