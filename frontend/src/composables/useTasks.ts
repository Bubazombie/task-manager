import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { ApiError, getUserMessage } from '@/api/api-error'
import * as tasksApi from '@/api/tasks'
import type { Task, TaskStatus } from '@/types/task'

export const LOAD_ERROR_MESSAGE =
  'Could not load your tasks. Check that the server is running, then retry.'
export const UPDATE_ERROR_MESSAGE = 'Could not update this task. Try again.'
const UNEXPECTED_ERROR_MESSAGE = 'Something unexpected happened. Try again.'

export interface UseTasks {
  tasks: Readonly<Ref<readonly Task[]>>
  summary: ComputedRef<string | null>
  isLoading: Readonly<Ref<boolean>>
  loadError: Readonly<Ref<string | null>>
  isCreating: Readonly<Ref<boolean>>
  createError: Readonly<Ref<ApiError | null>>
  updatingTaskIds: Readonly<Ref<ReadonlySet<string>>>
  updateErrors: Readonly<Ref<Readonly<Record<string, string>>>>
  loadTasks(): Promise<void>
  addTask(title: string): Promise<Task | null>
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null>
  clearCreateError(): void
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError('UNEXPECTED_RESPONSE', UNEXPECTED_ERROR_MESSAGE)
}

// Tasks are kept in server order (creation order); useTaskView decides how they are shown.
// Actions resolve to the task from the server, or null when the action failed or was skipped.
export function useTasks(): UseTasks {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const isCreating = ref(false)
  const createError = ref<ApiError | null>(null)
  const updatingTaskIds = ref(new Set<string>())
  const updateErrors = ref<Record<string, string>>({})

  const summary = computed(() => {
    if (tasks.value.length === 0) {
      return null
    }
    const completed = tasks.value.filter((task) => task.status === 'completed').length
    return `${tasks.value.length - completed} pending, ${completed} completed`
  })

  async function loadTasks(): Promise<void> {
    isLoading.value = true
    loadError.value = null
    try {
      tasks.value = await tasksApi.fetchTasks()
    } catch (error) {
      loadError.value = getUserMessage(error, LOAD_ERROR_MESSAGE)
    } finally {
      isLoading.value = false
    }
  }

  async function addTask(title: string): Promise<Task | null> {
    if (isCreating.value) {
      return null
    }
    isCreating.value = true
    createError.value = null
    try {
      const created = await tasksApi.createTask(title)
      tasks.value = [...tasks.value, created]
      return created
    } catch (error) {
      createError.value = toApiError(error)
      return null
    } finally {
      isCreating.value = false
    }
  }

  async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null> {
    if (updatingTaskIds.value.has(id)) {
      return null
    }
    updatingTaskIds.value.add(id)
    delete updateErrors.value[id]
    try {
      const updated = await tasksApi.updateTaskStatus(id, status)
      tasks.value = tasks.value.map((task) => (task.id === updated.id ? updated : task))
      return updated
    } catch (error) {
      updateErrors.value[id] = getUserMessage(error, UPDATE_ERROR_MESSAGE)
      return null
    } finally {
      updatingTaskIds.value.delete(id)
    }
  }

  function clearCreateError(): void {
    createError.value = null
  }

  return {
    tasks,
    summary,
    isLoading,
    loadError,
    isCreating,
    createError,
    updatingTaskIds,
    updateErrors,
    loadTasks,
    addTask,
    updateTaskStatus,
    clearCreateError,
  }
}
