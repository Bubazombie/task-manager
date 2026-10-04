import type { Task, TaskStatus } from '@/types/task'
import { request } from './http'

export function fetchTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks')
}

export function createTask(title: string): Promise<Task> {
  return request<Task>('/tasks', { method: 'POST', body: { title } })
}

export function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return request<Task>(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } })
}
