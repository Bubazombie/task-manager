import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { TASK_STATUSES, type Task } from '@/types/task'

export const ALL_TASKS_FILTER = 'all'
export const TASK_FILTERS = [ALL_TASKS_FILTER, ...TASK_STATUSES] as const
export const DEFAULT_TASK_FILTER: TaskFilter = ALL_TASKS_FILTER
export const DEFAULT_SORT_ORDER: TaskSortOrder = 'newest'

export type TaskFilter = (typeof TASK_FILTERS)[number]
export type TaskSortOrder = 'newest' | 'oldest'

export interface UseTaskView {
  filter: Readonly<Ref<TaskFilter>>
  sortOrder: Readonly<Ref<TaskSortOrder>>
  visibleTasks: ComputedRef<readonly Task[]>
  filterCounts: ComputedRef<Readonly<Record<TaskFilter, number>>>
  matchesFilter(task: Task): boolean
  setFilter(filter: TaskFilter): void
  toggleSortOrder(): void
}

function compareByCreatedAt(a: Task, b: Task): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt)
}

function taskMatchesFilter(task: Task, filter: TaskFilter): boolean {
  return filter === ALL_TASKS_FILTER || task.status === filter
}

// How the list is shown. The tasks themselves stay in server order in useTasks.
export function useTaskView(tasks: Readonly<Ref<readonly Task[]>>): UseTaskView {
  const filter = ref<TaskFilter>(DEFAULT_TASK_FILTER)
  const sortOrder = ref<TaskSortOrder>(DEFAULT_SORT_ORDER)

  function matchesFilter(task: Task): boolean {
    return taskMatchesFilter(task, filter.value)
  }

  // filter() returns a new array, so sorting it in place never touches the source.
  // Array sort is stable, so tasks with the same createdAt keep server order.
  const visibleTasks = computed(() => {
    const direction = sortOrder.value === 'newest' ? -1 : 1
    return tasks.value.filter(matchesFilter).sort((a, b) => direction * compareByCreatedAt(a, b))
  })

  // Counted over all tasks, not the filtered view, so each segment tells what it would show.
  const filterCounts = computed(() => {
    const entries = TASK_FILTERS.map((option) => [
      option,
      tasks.value.filter((task) => taskMatchesFilter(task, option)).length,
    ])
    // Every filter gets an entry above, so the record is complete.
    return Object.fromEntries(entries) as Record<TaskFilter, number>
  })

  function setFilter(next: TaskFilter): void {
    filter.value = next
  }

  function toggleSortOrder(): void {
    sortOrder.value = sortOrder.value === 'newest' ? 'oldest' : 'newest'
  }

  return {
    filter,
    sortOrder,
    visibleTasks,
    filterCounts,
    matchesFilter,
    setFilter,
    toggleSortOrder,
  }
}

/*
 * When a row leaves the view, pick the row that takes its place (the next one), else the one
 * above it. Both lists are needed because other rows may have changed while a request ran.
 */
export function findNearestVisibleTaskId(
  previous: readonly Task[],
  current: readonly Task[],
  removedId: string,
): string | undefined {
  const index = previous.findIndex((task) => task.id === removedId)
  if (index === -1) {
    return undefined
  }
  const isVisible = (task: Task): boolean => current.some((visible) => visible.id === task.id)
  const next = previous.slice(index + 1).find(isVisible)
  const before = previous.slice(0, index).reverse().find(isVisible)
  return (next ?? before)?.id
}
