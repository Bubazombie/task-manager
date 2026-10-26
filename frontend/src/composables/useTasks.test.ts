import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/api-error'
import { NETWORK_ERROR_MESSAGE } from '@/api/http'
import * as tasksApi from '@/api/tasks'
import type { Task } from '@/types/task'
import { LOAD_ERROR_MESSAGE, UPDATE_ERROR_MESSAGE, useTasks } from './useTasks'

vi.mock('@/api/tasks')
const api = vi.mocked(tasksApi)

const first: Task = {
  id: '1',
  title: 'First',
  status: 'pending',
  createdAt: '2026-03-01T10:00:00.000Z',
}
const second: Task = {
  id: '2',
  title: 'Second',
  status: 'completed',
  createdAt: '2026-03-02T10:00:00.000Z',
}
const serverError = new ApiError('INTERNAL_ERROR', 'Database connection lost', { status: 500 })
const networkError = new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE)

async function loadedTasks(tasks: Task[] = [first, second]): Promise<ReturnType<typeof useTasks>> {
  api.fetchTasks.mockResolvedValue(tasks)
  const state = useTasks()
  await state.loadTasks()
  return state
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useTasks', () => {
  describe('loadTasks', () => {
    it('keeps tasks in server order and tracks the loading state', async () => {
      api.fetchTasks.mockResolvedValue([first, second])
      const { tasks, isLoading, loadTasks } = useTasks()

      const loading = loadTasks()
      expect(isLoading.value).toBe(true)
      await loading

      expect(isLoading.value).toBe(false)
      expect(tasks.value).toEqual([first, second])
    })

    it('exposes a user-facing message when loading fails', async () => {
      api.fetchTasks.mockRejectedValue(serverError)
      const { tasks, loadError, loadTasks } = useTasks()

      await loadTasks()

      expect(loadError.value).toBe(LOAD_ERROR_MESSAGE)
      expect(tasks.value).toEqual([])
    })

    it('shows the network message when the server cannot be reached', async () => {
      api.fetchTasks.mockRejectedValue(networkError)
      const { loadError, loadTasks } = useTasks()

      await loadTasks()

      expect(loadError.value).toBe(NETWORK_ERROR_MESSAGE)
    })

    it('clears the error when a retry succeeds', async () => {
      api.fetchTasks.mockRejectedValueOnce(serverError).mockResolvedValueOnce([first])
      const { tasks, loadError, loadTasks } = useTasks()

      await loadTasks()
      await loadTasks()

      expect(loadError.value).toBeNull()
      expect(tasks.value).toEqual([first])
    })
  })

  describe('addTask', () => {
    it('appends the created task and resolves to it', async () => {
      const created: Task = {
        id: '3',
        title: 'Third',
        status: 'pending',
        createdAt: '2026-03-03T10:00:00.000Z',
      }
      api.createTask.mockResolvedValue(created)
      const { tasks, isCreating, addTask } = await loadedTasks()

      const adding = addTask('Third')
      expect(isCreating.value).toBe(true)
      const result = await adding

      expect(result).toEqual(created)
      expect(isCreating.value).toBe(false)
      expect(api.createTask).toHaveBeenCalledWith('Third')
      expect(tasks.value).toEqual([first, second, created])
    })

    it('keeps the error and leaves the list unchanged when creating fails', async () => {
      api.createTask.mockRejectedValue(serverError)
      const { tasks, createError, addTask } = await loadedTasks()

      const result = await addTask('Third')

      expect(result).toBeNull()
      expect(createError.value).toBe(serverError)
      expect(tasks.value).toEqual([first, second])
    })

    it('clears the create error on request', async () => {
      api.createTask.mockRejectedValue(serverError)
      const { createError, addTask, clearCreateError } = await loadedTasks()
      await addTask('Third')

      clearCreateError()

      expect(createError.value).toBeNull()
    })
  })

  describe('updateTaskStatus', () => {
    it('replaces the task in place with the server response', async () => {
      const updated: Task = { ...first, status: 'completed' }
      api.updateTaskStatus.mockResolvedValue(updated)
      const { tasks, updatingTaskIds, updateTaskStatus } = await loadedTasks()

      const updating = updateTaskStatus(first.id, 'completed')
      expect(updatingTaskIds.value.has(first.id)).toBe(true)
      const result = await updating

      expect(result).toEqual(updated)
      expect(updatingTaskIds.value.has(first.id)).toBe(false)
      expect(api.updateTaskStatus).toHaveBeenCalledWith(first.id, 'completed')
      expect(tasks.value).toEqual([updated, second])
    })

    it('keeps an error for that task and leaves it unchanged when updating fails', async () => {
      api.updateTaskStatus.mockRejectedValue(serverError)
      const { tasks, updateErrors, updateTaskStatus } = await loadedTasks()

      const result = await updateTaskStatus(first.id, 'completed')

      expect(result).toBeNull()
      expect(updateErrors.value[first.id]).toBe(UPDATE_ERROR_MESSAGE)
      expect(tasks.value).toEqual([first, second])
    })

    it('clears the previous error for that task on a new attempt', async () => {
      api.updateTaskStatus
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ ...first, status: 'completed' })
      const { updateErrors, updateTaskStatus } = await loadedTasks()

      await updateTaskStatus(first.id, 'completed')
      await updateTaskStatus(first.id, 'completed')

      expect(updateErrors.value[first.id]).toBeUndefined()
    })
  })

  describe('summary', () => {
    it('is null when there are no tasks', async () => {
      const { summary } = await loadedTasks([])

      expect(summary.value).toBeNull()
    })

    it('counts pending and completed tasks and follows status changes', async () => {
      api.updateTaskStatus.mockResolvedValue({ ...first, status: 'completed' })
      const { summary, updateTaskStatus } = await loadedTasks()

      expect(summary.value).toBe('1 pending, 1 completed')

      await updateTaskStatus(first.id, 'completed')

      expect(summary.value).toBe('0 pending, 2 completed')
    })
  })
})
