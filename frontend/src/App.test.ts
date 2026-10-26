import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tasksApi from '@/api/tasks'
import { ApiError } from '@/api/api-error'
import type { Task } from '@/types/task'
import App from './App.vue'

vi.mock('@/api/tasks')
const api = vi.mocked(tasksApi)

const existingTask: Task = {
  id: '1',
  title: 'Buy milk',
  status: 'pending',
  createdAt: '2026-03-01T10:00:00.000Z',
}

// Server order is creation order, so the default newest-first view shows these reversed.
const oldestPending: Task = {
  id: 'a',
  title: 'Oldest pending',
  status: 'pending',
  createdAt: '2026-03-01T10:00:00.000Z',
}
const middlePending: Task = {
  id: 'b',
  title: 'Middle pending',
  status: 'pending',
  createdAt: '2026-03-02T10:00:00.000Z',
}
const newestPending: Task = {
  id: 'c',
  title: 'Newest pending',
  status: 'pending',
  createdAt: '2026-03-03T10:00:00.000Z',
}
const completedTask: Task = {
  id: 'd',
  title: 'Water the plants',
  status: 'completed',
  createdAt: '2026-03-04T10:00:00.000Z',
}

let wrapper: VueWrapper | undefined

async function mountApp(): Promise<VueWrapper> {
  wrapper = mount(App, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

function announcement(app: VueWrapper): string {
  return app.find('[aria-live="polite"]').text()
}

function filterGroup(app: VueWrapper): DOMWrapper<Element> {
  return app.find('[role="group"][aria-label="Filter by status"]')
}

// Matches the whole accessible name, e.g. "Pending, 2 tasks", so a stray count cannot match.
function filterSegment(app: VueWrapper, label: string): DOMWrapper<Element> {
  const name = new RegExp(`^${label}, \\d+ tasks?$`)
  const segment = filterGroup(app)
    .findAll('button')
    .find((button) => name.test(button.attributes('aria-label') ?? ''))
  if (!segment) {
    throw new Error(`No filter segment labelled ${label}`)
  }
  return segment
}

function sortButton(app: VueWrapper): DOMWrapper<Element> {
  const button = app.findAll('button').find((item) => item.text().startsWith('Sort order:'))
  if (!button) {
    throw new Error('No sort button')
  }
  return button
}

function segmentNames(app: VueWrapper): (string | undefined)[] {
  return filterGroup(app)
    .findAll('button')
    .map((button) => button.attributes('aria-label'))
}

function rowTitles(app: VueWrapper): string[] {
  return app.findAll('li').map((item) => item.find('p').text())
}

function statusButton(app: VueWrapper, title: string): DOMWrapper<HTMLButtonElement> {
  const row = app.findAll('li').find((item) => item.find('p').text() === title)
  if (!row) {
    throw new Error(`No row titled ${title}`)
  }
  return row.find('button')
}

// Marks the given task as completed on the server, the way the real API would answer.
function completeOnServer(): void {
  api.updateTaskStatus.mockImplementation(async (id, status) => {
    const task = [oldestPending, middlePending, newestPending].find((item) => item.id === id)
    if (!task) {
      throw new ApiError('NOT_FOUND', `Task ${id} not found`, { status: 404 })
    }
    return { ...task, status }
  })
}

async function showPendingOnly(app: VueWrapper): Promise<void> {
  await filterSegment(app, 'Pending').trigger('click')
  await flushPromises()
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
    api.createTask.mockResolvedValue({
      id: '2',
      title: 'Call the bank',
      status: 'pending',
      createdAt: '2026-03-02T10:00:00.000Z',
    })
    const app = await mountApp()
    const input = app.find('input')

    await input.setValue('Call the bank')
    await app.find('form').trigger('submit')
    await flushPromises()

    expect(rowTitles(app)).toEqual(['Call the bank', 'Buy milk'])
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(input.element)
    expect(announcement(app)).toBe('Task added.')
  })

  it('marks a task as completed from the server response and announces it', async () => {
    api.updateTaskStatus.mockResolvedValue({ ...existingTask, status: 'completed' })
    const app = await mountApp()

    await statusButton(app, 'Buy milk').trigger('click')
    await flushPromises()

    const item = app.find('li')
    expect(api.updateTaskStatus).toHaveBeenCalledWith('1', 'completed')
    expect(item.text()).toContain('Completed')
    expect(statusButton(app, 'Buy milk').text()).toBe('Mark as pending')
    expect(announcement(app)).toBe('Marked as completed.')
  })

  describe('toolbar visibility', () => {
    it('is hidden while the tasks are loading', () => {
      api.fetchTasks.mockReturnValue(new Promise(() => {}))
      wrapper = mount(App, { attachTo: document.body })

      expect(filterGroup(wrapper).exists()).toBe(false)
    })

    it('is hidden when loading fails', async () => {
      api.fetchTasks.mockRejectedValue(new ApiError('INTERNAL_ERROR', 'Boom', { status: 500 }))
      const app = await mountApp()

      expect(filterGroup(app).exists()).toBe(false)
    })

    it('is hidden when there are no tasks', async () => {
      api.fetchTasks.mockResolvedValue([])
      const app = await mountApp()

      expect(filterGroup(app).exists()).toBe(false)
      expect(app.text()).toContain('No tasks yet. Add your first one above.')
    })

    it('is shown once tasks are loaded, with All and newest first selected', async () => {
      const app = await mountApp()

      expect(filterSegment(app, 'All').attributes('aria-pressed')).toBe('true')
      expect(sortButton(app).text()).toBe('Sort order: Newest first')
    })
  })

  describe('filtering and sorting', () => {
    beforeEach(() => {
      api.fetchTasks.mockResolvedValue([oldestPending, newestPending, completedTask])
    })

    it('shows only the tasks of the chosen status and announces the count', async () => {
      const app = await mountApp()

      await filterSegment(app, 'Completed').trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Water the plants'])
      expect(filterSegment(app, 'Completed').attributes('aria-pressed')).toBe('true')
      expect(announcement(app)).toBe('Showing 1 completed task.')

      await filterSegment(app, 'Pending').trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Newest pending', 'Oldest pending'])
      expect(announcement(app)).toBe('Showing 2 pending tasks.')

      await filterSegment(app, 'All').trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toHaveLength(3)
      expect(announcement(app)).toBe('Showing all 3 tasks.')
    })

    it('keeps the summary counting every task while a filter is active', async () => {
      const app = await mountApp()

      await filterSegment(app, 'Completed').trigger('click')
      await flushPromises()

      expect(app.find('header').text()).toContain('2 pending, 1 completed')
    })

    it('shows and announces a filter-specific empty state', async () => {
      api.fetchTasks.mockResolvedValue([oldestPending])
      const app = await mountApp()

      await filterSegment(app, 'Completed').trigger('click')
      await flushPromises()

      expect(app.find('ul').exists()).toBe(false)
      expect(app.text()).toContain('No completed tasks.')
      expect(app.text()).not.toContain('No tasks yet')
      expect(filterGroup(app).exists()).toBe(true)
      expect(announcement(app)).toBe('No completed tasks.')
    })

    it('toggles the sort order and announces it', async () => {
      const app = await mountApp()

      expect(rowTitles(app)).toEqual(['Water the plants', 'Newest pending', 'Oldest pending'])

      await sortButton(app).trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Oldest pending', 'Newest pending', 'Water the plants'])
      expect(sortButton(app).text()).toBe('Sort order: Oldest first')
      expect(announcement(app)).toBe('Sorted oldest first. 3 tasks shown.')
    })

    it('sorts within the active filter', async () => {
      const app = await mountApp()
      await showPendingOnly(app)

      await sortButton(app).trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Oldest pending', 'Newest pending'])
      expect(announcement(app)).toBe('Sorted oldest first. 2 tasks shown.')
    })
  })

  describe('filter counts', () => {
    beforeEach(() => {
      api.fetchTasks.mockResolvedValue([oldestPending, newestPending, completedTask])
    })

    it('counts every task per filter once loaded', async () => {
      const app = await mountApp()

      expect(segmentNames(app)).toEqual(['All, 3 tasks', 'Pending, 2 tasks', 'Completed, 1 task'])
    })

    it('updates after a status change', async () => {
      api.updateTaskStatus.mockResolvedValue({ ...newestPending, status: 'completed' })
      const app = await mountApp()

      await statusButton(app, 'Newest pending').trigger('click')
      await flushPromises()

      expect(segmentNames(app)).toEqual(['All, 3 tasks', 'Pending, 1 task', 'Completed, 2 tasks'])
    })

    it('updates after a task is created', async () => {
      api.createTask.mockResolvedValue({
        id: 'new',
        title: 'Call the bank',
        status: 'pending',
        createdAt: '2026-03-10T10:00:00.000Z',
      })
      const app = await mountApp()

      await app.find('input').setValue('Call the bank')
      await app.find('form').trigger('submit')
      await flushPromises()

      expect(segmentNames(app)).toEqual(['All, 4 tasks', 'Pending, 3 tasks', 'Completed, 1 task'])
    })

    it('stays the same whichever filter is active', async () => {
      const app = await mountApp()

      await filterSegment(app, 'Completed').trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Water the plants'])
      expect(segmentNames(app)).toEqual(['All, 3 tasks', 'Pending, 2 tasks', 'Completed, 1 task'])
    })
  })

  describe('when a status change hides the row', () => {
    beforeEach(() => {
      api.fetchTasks.mockResolvedValue([oldestPending, middlePending, newestPending])
      completeOnServer()
    })

    it('moves focus to the next row and announces that the task is hidden', async () => {
      const app = await mountApp()
      await showPendingOnly(app)
      statusButton(app, 'Middle pending').element.focus()

      await statusButton(app, 'Middle pending').trigger('click')
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Newest pending', 'Oldest pending'])
      expect(document.activeElement).toBe(statusButton(app, 'Oldest pending').element)
      expect(announcement(app)).toBe('Marked as completed. Hidden by the Pending filter.')
    })

    it('moves focus to the previous row when the hidden row was last', async () => {
      const app = await mountApp()
      await showPendingOnly(app)
      statusButton(app, 'Oldest pending').element.focus()

      await statusButton(app, 'Oldest pending').trigger('click')
      await flushPromises()

      expect(document.activeElement).toBe(statusButton(app, 'Middle pending').element)
    })

    it('moves focus to the selected filter segment when no row is left', async () => {
      api.fetchTasks.mockResolvedValue([oldestPending])
      const app = await mountApp()
      await showPendingOnly(app)
      statusButton(app, 'Oldest pending').element.focus()

      await statusButton(app, 'Oldest pending').trigger('click')
      await flushPromises()

      expect(app.text()).toContain('No pending tasks.')
      expect(document.activeElement).toBe(filterSegment(app, 'Pending').element)
      expect(announcement(app)).toBe('Marked as completed. Hidden by the Pending filter.')
    })

    it('moves focus to the next row when focus was already lost', async () => {
      const app = await mountApp()
      await showPendingOnly(app)
      ;(document.activeElement as HTMLElement | null)?.blur()
      expect(document.activeElement).toBe(document.body)

      await statusButton(app, 'Middle pending').trigger('click')
      await flushPromises()

      expect(document.activeElement).toBe(statusButton(app, 'Oldest pending').element)
    })

    it('leaves focus alone when the user moved it during the request', async () => {
      let respond: (task: Task) => void = () => {}
      api.updateTaskStatus.mockReturnValue(
        new Promise<Task>((resolve) => {
          respond = resolve
        }),
      )
      const app = await mountApp()
      await showPendingOnly(app)
      statusButton(app, 'Middle pending').element.focus()
      await statusButton(app, 'Middle pending').trigger('click')

      const input = app.find('input').element
      input.focus()
      respond({ ...middlePending, status: 'completed' })
      await flushPromises()

      expect(rowTitles(app)).toEqual(['Newest pending', 'Oldest pending'])
      expect(document.activeElement).toBe(input)
      expect(announcement(app)).toBe('Marked as completed. Hidden by the Pending filter.')
    })
  })

  describe('adding a task while a filter is active', () => {
    const newTask: Task = {
      id: 'new',
      title: 'Call the bank',
      status: 'pending',
      createdAt: '2026-03-10T10:00:00.000Z',
    }

    beforeEach(() => {
      api.fetchTasks.mockResolvedValue([oldestPending, completedTask])
      api.createTask.mockResolvedValue(newTask)
    })

    async function submitNewTask(app: VueWrapper): Promise<void> {
      await app.find('input').setValue(newTask.title)
      await app.find('form').trigger('submit')
      await flushPromises()
    }

    it('switches to All when the new task would be hidden, and announces it', async () => {
      const app = await mountApp()
      await filterSegment(app, 'Completed').trigger('click')
      await flushPromises()

      await submitNewTask(app)

      expect(filterSegment(app, 'All').attributes('aria-pressed')).toBe('true')
      expect(rowTitles(app)).toEqual(['Call the bank', 'Water the plants', 'Oldest pending'])
      expect(announcement(app)).toBe('Task added. Filter set to All.')
      expect(document.activeElement).toBe(app.find('input').element)
    })

    it('keeps the filter when the new task matches it', async () => {
      const app = await mountApp()
      await showPendingOnly(app)

      await submitNewTask(app)

      expect(filterSegment(app, 'Pending').attributes('aria-pressed')).toBe('true')
      expect(rowTitles(app)).toEqual(['Call the bank', 'Oldest pending'])
      expect(announcement(app)).toBe('Task added.')
    })
  })
})
