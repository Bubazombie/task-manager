import express, { type Express } from 'express'
import cors from 'cors'
import { errorHandler } from './errors/error-handler.js'
import { NotFoundError } from './errors/not-found-error.js'
import { createTaskController } from './tasks/task.controller.js'
import type { TaskRepository } from './tasks/task.repository.js'
import { createTaskRouter } from './tasks/task.router.js'
import { TaskService } from './tasks/task.service.js'

// A task body is a short title and a status; anything bigger is rejected early.
const JSON_BODY_LIMIT = '10kb'

export interface AppDependencies {
  corsOrigin: string
  taskRepository: TaskRepository
}

// Dependencies are passed in so tests can build an isolated app.
export function createApp({ corsOrigin, taskRepository }: AppDependencies): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: corsOrigin }))
  app.use(express.json({ limit: JSON_BODY_LIMIT }))

  const taskController = createTaskController(new TaskService(taskRepository))
  app.use('/tasks', createTaskRouter(taskController))

  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`))
  })
  app.use(errorHandler)

  return app
}
