import { Router } from 'express'
import type { TaskController } from './task.controller.js'

export function createTaskRouter(controller: TaskController): Router {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.patch('/:id', controller.updateStatus)

  return router
}
