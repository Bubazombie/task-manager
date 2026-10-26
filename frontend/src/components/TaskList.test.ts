import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { NO_TASKS_MESSAGE } from '@/messages/tasks'
import type { Task } from '@/types/task'
import TaskList from './TaskList.vue'

const tasks: Task[] = [
  { id: '2', title: 'Newer task', status: 'pending', createdAt: '2026-03-02T10:00:00.000Z' },
  { id: '1', title: 'Older task', status: 'completed', createdAt: '2026-03-01T10:00:00.000Z' },
]

function mountList(props: Partial<InstanceType<typeof TaskList>['$props']> = {}) {
  return mount(TaskList, {
    props: {
      tasks: [],
      filter: 'all',
      loading: false,
      loadError: null,
      updatingTaskIds: new Set<string>(),
      updateErrors: {},
      ...props,
    },
  })
}

describe('TaskList', () => {
  it('shows a loading state', () => {
    const list = mountList({ loading: true })

    expect(list.find('[role="status"]').text()).toContain('Loading tasks…')
    expect(list.find('ul').exists()).toBe(false)
  })

  it('shows an empty state when there are no tasks', () => {
    const list = mountList()

    expect(list.text()).toContain(NO_TASKS_MESSAGE)
    expect(list.find('ul').exists()).toBe(false)
  })

  it.each([
    ['pending', 'No pending tasks.'],
    ['completed', 'No completed tasks.'],
  ] as const)('shows a message for the %s filter when no task matches', (filter, message) => {
    const list = mountList({ filter })

    expect(list.text()).toContain(message)
    expect(list.text()).not.toContain(NO_TASKS_MESSAGE)
  })

  it('shows the load error with a Retry button that emits retry', async () => {
    const list = mountList({ loadError: 'Could not load your tasks.' })

    expect(list.find('[role="alert"]').text()).toContain('Could not load your tasks.')
    await list.find('button').trigger('click')

    expect(list.emitted('retry')).toHaveLength(1)
  })

  it('renders the tasks in the given order', () => {
    const list = mountList({ tasks })

    const titles = list.findAll('li').map((item) => item.find('p').text())
    expect(titles).toEqual(['Newer task', 'Older task'])
  })

  it('re-emits a status update with the task id', async () => {
    const list = mountList({ tasks })

    await list.findAll('li')[0]?.find('button').trigger('click')

    expect(list.emitted('update-status')).toEqual([['2', 'completed']])
  })

  it('passes the in-flight state and error to the matching item', () => {
    const list = mountList({
      tasks,
      updatingTaskIds: new Set(['1']),
      updateErrors: { '1': 'Could not update this task. Try again.' },
    })

    const [newer, older] = list.findAll('li')
    expect(newer?.find('button').attributes('aria-disabled')).toBeUndefined()
    expect(older?.find('button').attributes('aria-disabled')).toBe('true')
    expect(older?.find('[role="alert"]').text()).toBe('Could not update this task. Try again.')
  })

  it('gives access to the status button of a task by id', () => {
    const list = mountList({ tasks })

    const button = list.vm.getStatusButton('1')

    expect(button).toBe(list.findAll('li')[1]?.find('button').element)
    expect(list.vm.getStatusButton('missing')).toBeNull()
  })
})
