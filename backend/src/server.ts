import { createApp } from './app.js'
import { config } from './config.js'

const app = createApp({ corsOrigin: config.corsOrigin })

app.listen(config.port, (error) => {
  if (error) {
    throw error
  }
  console.log(`Server listening on http://localhost:${config.port}`)
})
