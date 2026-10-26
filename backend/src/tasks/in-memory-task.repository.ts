import { randomUUID } from 'node:crypto'
import type { NewTask, TaskRepository } from './task.repository.js'
import type { Task, TaskStatus } from './task.schemas.js'

type Clock = () => Date

// Every method returns a copy so callers can never mutate the stored tasks.
export class InMemoryTaskRepository implements TaskRepository {
  // A Map keeps insertion order, which gives creation order for free.
  private readonly tasks = new Map<string, Task>()
  private readonly now: Clock

  // The clock is injectable so tests can assert exact timestamps.
  constructor(now: Clock = () => new Date()) {
    this.now = now
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()].map((task) => ({ ...task }))
  }

  async create(data: NewTask): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: data.title,
      status: data.status,
      createdAt: this.now().toISOString(),
    }
    this.tasks.set(task.id, task)
    return { ...task }
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task | undefined> {
    const task = this.tasks.get(id)
    if (!task) {
      return undefined
    }
    task.status = status
    return { ...task }
  }
}
