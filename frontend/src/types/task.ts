// Mirrors the backend contract in backend/src/tasks/task.schemas.ts.
export const TASK_STATUSES = ['pending', 'completed'] as const
export const TITLE_MAX_LENGTH = 200

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Task {
  id: string
  title: string
  status: TaskStatus
  // ISO 8601, assigned by the server when the task is created.
  createdAt: string
}
