import { z } from 'zod'

export const TASK_STATUSES = ['pending', 'completed'] as const
export const DEFAULT_TASK_STATUS: TaskStatus = 'pending'
export const TITLE_MAX_LENGTH = 200

const BODY_MUST_BE_OBJECT_MESSAGE = 'Request body must be a JSON object'

const taskStatusSchema = z.enum(TASK_STATUSES, {
  error: `Status must be one of: ${TASK_STATUSES.join(', ')}`,
})

const titleSchema = z
  .string({
    error: (issue) => (issue.input === undefined ? 'Title is required' : 'Title must be a string'),
  })
  .trim()
  .min(1, 'Title must not be empty')
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`)

// Replace the message only for a missing or non-object body; other issues keep their own.
const requestBodyError: z.core.$ZodErrorMap = (issue) =>
  issue.code === 'invalid_type' ? BODY_MUST_BE_OBJECT_MESSAGE : undefined

export const createTaskSchema = z.strictObject(
  { title: titleSchema, status: taskStatusSchema.optional() },
  { error: requestBodyError },
)

export const updateTaskSchema = z.strictObject(
  { status: taskStatusSchema },
  { error: requestBodyError },
)

export type TaskStatus = z.infer<typeof taskStatusSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>

export interface Task {
  id: string
  title: string
  status: TaskStatus
}
