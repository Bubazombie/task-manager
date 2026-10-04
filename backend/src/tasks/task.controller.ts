import type { Request, Response } from 'express'
import { createTaskSchema, updateTaskSchema } from './task.schemas.js'
import type { TaskService } from './task.service.js'

export interface TaskController {
  list(req: Request, res: Response): Promise<void>
  create(req: Request, res: Response): Promise<void>
  updateStatus(req: Request<{ id: string }>, res: Response): Promise<void>
}

// Invalid input throws a ZodError, which the error-handling middleware turns into a 400.
export function createTaskController(service: TaskService): TaskController {
  return {
    async list(_req, res) {
      res.status(200).json(await service.list())
    },

    async create(req, res) {
      const input = createTaskSchema.parse(req.body)
      res.status(201).json(await service.create(input))
    },

    async updateStatus(req, res) {
      const { status } = updateTaskSchema.parse(req.body)
      res.status(200).json(await service.updateStatus(req.params.id, status))
    },
  }
}
