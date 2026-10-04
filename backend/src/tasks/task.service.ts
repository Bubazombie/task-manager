import { NotFoundError } from '../errors/not-found-error.js'
import type { TaskRepository } from './task.repository.js'
import {
  DEFAULT_TASK_STATUS,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
} from './task.schemas.js'

export class TaskService {
  private readonly repository: TaskRepository

  constructor(repository: TaskRepository) {
    this.repository = repository
  }

  list(): Promise<Task[]> {
    return this.repository.findAll()
  }

  create(input: CreateTaskInput): Promise<Task> {
    return this.repository.create({
      title: input.title,
      status: input.status ?? DEFAULT_TASK_STATUS,
    })
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.repository.updateStatus(id, status)
    if (!task) {
      throw new NotFoundError(`Task ${id} not found`)
    }
    return task
  }
}
