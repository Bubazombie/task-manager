import type { Task, TaskStatus } from './task.schemas.js'

export type NewTask = Omit<Task, 'id'>

// Async so a database-backed implementation can replace the in-memory one without touching callers.
export interface TaskRepository {
  findAll(): Promise<Task[]>
  create(data: NewTask): Promise<Task>
  updateStatus(id: string, status: TaskStatus): Promise<Task | undefined>
}
