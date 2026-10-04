import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/task'
import TaskItem from './TaskItem.vue'

const pendingTask: Task = { id: '1', title: 'Buy milk', status: 'pending' }
const completedTask: Task = { id: '2', title: 'Water the plants', status: 'completed' }

function mountItem(task: Task, { updating = false, error = null as string | null } = {}) {
  return mount(TaskItem, { props: { task, updating, error } })
}

describe('TaskItem', () => {
  it('shows the title and the status as text', () => {
    const item = mountItem(pendingTask)

    expect(item.text()).toContain('Buy milk')
    expect(item.text()).toContain('Pending')
  })

  it('offers to mark a pending task as completed', async () => {
    const item = mountItem(pendingTask)

    const button = item.find('button')
    expect(button.text()).toBe('Mark as completed')
    await button.trigger('click')

    expect(item.emitted('update-status')).toEqual([['completed']])
  })

  it('offers to set a completed task back to pending', async () => {
    const item = mountItem(completedTask)

    expect(item.text()).toContain('Completed')
    const button = item.find('button')
    expect(button.text()).toBe('Mark as pending')
    await button.trigger('click')

    expect(item.emitted('update-status')).toEqual([['pending']])
  })

  it('blocks the button while its request is in flight without removing it from focus order', async () => {
    const item = mountItem(pendingTask, { updating: true })

    const button = item.find('button')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')

    expect(item.emitted('update-status')).toBeUndefined()
  })

  it('shows an update error next to the task', () => {
    const item = mountItem(pendingTask, { error: 'Could not update this task. Try again.' })

    expect(item.find('[role="alert"]').text()).toBe('Could not update this task. Try again.')
  })
})
