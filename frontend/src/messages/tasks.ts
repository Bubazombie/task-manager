import { ALL_TASKS_FILTER, type TaskFilter, type TaskSortOrder } from '@/composables/useTaskView'
import type { TaskStatus } from '@/types/task'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
}

export const FILTER_LABELS: Record<TaskFilter, string> = {
  [ALL_TASKS_FILTER]: 'All',
  ...STATUS_LABELS,
}

export const SORT_ORDER_LABELS: Record<TaskSortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
}

export const FILTER_GROUP_LABEL = 'Filter by status'
// Read before the visible order so the button is not mistaken for an action label.
export const SORT_ORDER_PREFIX = 'Sort order:'

export const NO_TASKS_MESSAGE = 'No tasks yet. Add your first one above.'
export const TASK_ADDED_MESSAGE = 'Task added.'
export const TASK_ADDED_FILTER_RESET_MESSAGE = `${TASK_ADDED_MESSAGE} Filter set to ${FILTER_LABELS[ALL_TASKS_FILTER]}.`

function taskNoun(count: number): string {
  return count === 1 ? 'task' : 'tasks'
}

function countTasks(count: number): string {
  return `${count} ${taskNoun(count)}`
}

function lowercaseStatus(status: TaskStatus): string {
  return STATUS_LABELS[status].toLowerCase()
}

// Accessible name of a filter segment, e.g. "Pending, 2 tasks".
export function filterSegmentLabel(filter: TaskFilter, count: number): string {
  return `${FILTER_LABELS[filter]}, ${countTasks(count)}`
}

export function emptyListMessage(filter: TaskFilter): string {
  return filter === ALL_TASKS_FILTER ? NO_TASKS_MESSAGE : `No ${lowercaseStatus(filter)} tasks.`
}

export function statusChangedMessage(status: TaskStatus): string {
  return `Marked as ${lowercaseStatus(status)}.`
}

export function taskHiddenMessage(status: TaskStatus, filter: TaskFilter): string {
  return `${statusChangedMessage(status)} Hidden by the ${FILTER_LABELS[filter]} filter.`
}

export function filterChangedMessage(filter: TaskFilter, shownCount: number): string {
  if (shownCount === 0) {
    return emptyListMessage(filter)
  }
  if (filter === ALL_TASKS_FILTER) {
    return `Showing all ${countTasks(shownCount)}.`
  }
  return `Showing ${shownCount} ${lowercaseStatus(filter)} ${taskNoun(shownCount)}.`
}

export function sortChangedMessage(order: TaskSortOrder, shownCount: number): string {
  return `Sorted ${SORT_ORDER_LABELS[order].toLowerCase()}. ${countTasks(shownCount)} shown.`
}
