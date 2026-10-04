import { createApp } from './app.js'
import { config } from './config.js'
import { InMemoryTaskRepository } from './tasks/in-memory-task.repository.js'

const app = createApp({
  corsOrigin: config.corsOrigin,
  taskRepository: new InMemoryTaskRepository(),
})

app.listen(config.port, (error) => {
  if (error) {
    throw error
  }
  console.log(`Server listening on http://localhost:${config.port}`)
})
