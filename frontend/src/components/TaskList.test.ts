import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/task'
import TaskList from './TaskList.vue'

const tasks: Task[] = [
  { id: '2', title: 'Newer task', status: 'pending' },
  { id: '1', title: 'Older task', status: 'completed' },
]

function mountList(props: Partial<InstanceType<typeof TaskList>['$props']> = {}) {
  return mount(TaskList, {
    props: {
      tasks: [],
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

    expect(list.text()).toContain('No tasks yet. Add your first one above.')
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
})
