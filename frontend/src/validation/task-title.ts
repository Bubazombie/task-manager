import { TITLE_MAX_LENGTH } from '@/types/task'

export const TITLE_REQUIRED_MESSAGE = 'Enter a title for the task.'
export const TITLE_TOO_LONG_MESSAGE = `Shorten the title to ${TITLE_MAX_LENGTH} characters or fewer.`

// Same rules as the backend: trimmed, not empty, at most TITLE_MAX_LENGTH characters.
export function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return TITLE_REQUIRED_MESSAGE
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    return TITLE_TOO_LONG_MESSAGE
  }
  return null
}
