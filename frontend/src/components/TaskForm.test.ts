import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/api/api-error'
import { NETWORK_ERROR_MESSAGE } from '@/api/http'
import { TITLE_MAX_LENGTH } from '@/types/task'
import { TITLE_REQUIRED_MESSAGE, TITLE_TOO_LONG_MESSAGE } from '@/validation/task-title'
import TaskForm from './TaskForm.vue'

let wrapper: VueWrapper | undefined

function mountForm(props: { submitting?: boolean; serverError?: ApiError | null } = {}) {
  const form = mount(TaskForm, {
    attachTo: document.body,
    props: {
      title: '',
      'onUpdate:title': (value: string) => form.setProps({ title: value }),
      submitting: false,
      serverError: null,
      ...props,
    },
  })
  wrapper = form
  return form
}

async function submitWith(form: VueWrapper, title: string): Promise<void> {
  await form.find('input').setValue(title)
  await form.find('form').trigger('submit')
}

afterEach(() => {
  wrapper?.unmount()
})

describe('TaskForm', () => {
  it('has a visible label for the input', () => {
    const form = mountForm()

    const label = form.find('label')
    expect(label.text()).toBe('New task')
    expect(label.attributes('for')).toBe(form.find('input').attributes('id'))
  })

  it.each(['', '   '])('rejects the title %j and links the error to the input', async (title) => {
    const form = mountForm()

    await submitWith(form, title)

    const input = form.find('input')
    const error = form.find('[role="alert"]')
    expect(error.text()).toBe(TITLE_REQUIRED_MESSAGE)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain(error.attributes('id'))
    expect(form.emitted('submit')).toBeUndefined()
  })

  it('rejects a title over the maximum length', async () => {
    const form = mountForm()

    await submitWith(form, 'a'.repeat(TITLE_MAX_LENGTH + 1))

    expect(form.text()).toContain(TITLE_TOO_LONG_MESSAGE)
    expect(form.emitted('submit')).toBeUndefined()
  })

  it('accepts a title of exactly the maximum length', async () => {
    const form = mountForm()

    await submitWith(form, 'a'.repeat(TITLE_MAX_LENGTH))

    expect(form.emitted('submit')).toEqual([['a'.repeat(TITLE_MAX_LENGTH)]])
  })

  it('emits the trimmed title', async () => {
    const form = mountForm()

    await submitWith(form, '  Buy milk  ')

    expect(form.emitted('submit')).toEqual([['Buy milk']])
  })

  it('removes the error as soon as the title becomes valid', async () => {
    const form = mountForm()
    await submitWith(form, '')

    await form.find('input').setValue('Buy milk')

    expect(form.find('[role="alert"]').exists()).toBe(false)
    expect(form.find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('shows a character counter only near the limit', async () => {
    const form = mountForm()

    await form.find('input').setValue('a'.repeat(159))
    expect(form.text()).not.toContain('of 200 characters')

    await form.find('input').setValue('a'.repeat(160))
    expect(form.text()).toContain('160 of 200 characters')
  })

  it('disables the button and does not submit again while submitting', async () => {
    const form = mountForm({ submitting: true })

    await submitWith(form, 'Buy milk')

    const button = form.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Adding…')
    expect(form.emitted('submit')).toBeUndefined()
  })

  it('returns focus to the input when submitting finishes', async () => {
    const form = mountForm({ submitting: true })
    form.find('button').element.focus()

    await form.setProps({ submitting: false })

    expect(document.activeElement).toBe(form.find('input').element)
  })

  it('shows a server validation detail for the title as the field error', async () => {
    const serverError = new ApiError('VALIDATION_ERROR', 'Request validation failed', {
      status: 400,
      details: [{ field: 'title', message: 'Title must not be empty' }],
    })
    const form = mountForm({ serverError })

    expect(form.find('[role="alert"]').text()).toBe('Title must not be empty')
    expect(form.find('input').attributes('aria-invalid')).toBe('true')
  })

  it('shows other server errors as a form-level message', () => {
    const serverError = new ApiError('INTERNAL_ERROR', 'Database connection lost', { status: 500 })
    const form = mountForm({ serverError })

    expect(form.find('[role="alert"]').text()).toBe('Could not add the task. Try again.')
    expect(form.text()).not.toContain('Database connection lost')
  })

  it('shows the network message when the server cannot be reached', () => {
    const form = mountForm({ serverError: new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE) })

    expect(form.find('[role="alert"]').text()).toBe(NETWORK_ERROR_MESSAGE)
  })
})
