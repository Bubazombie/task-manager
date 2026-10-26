import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { TaskFilter, TaskSortOrder } from '@/composables/useTaskView'
import TaskToolbar from './TaskToolbar.vue'

type Counts = Record<TaskFilter, number>

const COUNTS: Counts = { all: 3, pending: 2, completed: 1 }

let wrapper: VueWrapper<InstanceType<typeof TaskToolbar>> | undefined

function mountToolbar(
  props: { filter?: TaskFilter; sortOrder?: TaskSortOrder; counts?: Counts } = {},
): VueWrapper<InstanceType<typeof TaskToolbar>> {
  wrapper = mount(TaskToolbar, {
    attachTo: document.body,
    props: { filter: 'all', sortOrder: 'newest', counts: COUNTS, ...props },
  })
  return wrapper
}

function filterGroup(toolbar: VueWrapper) {
  return toolbar.find('[role="group"][aria-label="Filter by status"]')
}

// Matches the whole accessible name, e.g. "Pending, 2 tasks", so the count is checked too.
function segment(toolbar: VueWrapper, label: string) {
  const name = new RegExp(`^${label}, \\d+ tasks?$`)
  const match = filterGroup(toolbar)
    .findAll('button')
    .find((button) => name.test(button.attributes('aria-label') ?? ''))
  if (!match) {
    throw new Error(`No filter segment labelled ${label}`)
  }
  return match
}

function sortButton(toolbar: VueWrapper) {
  const match = toolbar.findAll('button').find((button) => button.text().startsWith('Sort order:'))
  if (!match) {
    throw new Error('No sort button')
  }
  return match
}

afterEach(() => {
  wrapper?.unmount()
})

describe('TaskToolbar', () => {
  it('offers All, Pending and Completed with their counts in a labelled group', () => {
    const toolbar = mountToolbar()

    const names = filterGroup(toolbar)
      .findAll('button')
      .map((button) => button.attributes('aria-label'))
    expect(names).toEqual(['All, 3 tasks', 'Pending, 2 tasks', 'Completed, 1 task'])
  })

  it('shows each count next to its label', () => {
    const toolbar = mountToolbar({ counts: { all: 12, pending: 7, completed: 5 } })

    expect(segment(toolbar, 'All').text()).toBe('All 12')
    expect(segment(toolbar, 'Pending').text()).toBe('Pending 7')
    expect(segment(toolbar, 'Completed').text()).toBe('Completed 5')
  })

  it('names a filter with no tasks naturally', () => {
    const toolbar = mountToolbar({ counts: { all: 2, pending: 2, completed: 0 } })

    expect(segment(toolbar, 'Completed').attributes('aria-label')).toBe('Completed, 0 tasks')
  })

  it('updates the counts when the prop changes', async () => {
    const toolbar = mountToolbar()

    await toolbar.setProps({ counts: { all: 4, pending: 2, completed: 2 } })

    expect(segment(toolbar, 'All').attributes('aria-label')).toBe('All, 4 tasks')
    expect(segment(toolbar, 'Completed').attributes('aria-label')).toBe('Completed, 2 tasks')
  })

  it('marks exactly the active filter as pressed', () => {
    const toolbar = mountToolbar({ filter: 'pending' })

    const pressed = filterGroup(toolbar).findAll('[aria-pressed="true"]')
    expect(pressed.map((button) => button.attributes('aria-label'))).toEqual(['Pending, 2 tasks'])
    expect(segment(toolbar, 'All').attributes('aria-pressed')).toBe('false')
    expect(segment(toolbar, 'Completed').attributes('aria-pressed')).toBe('false')
  })

  it('emits the chosen filter', async () => {
    const toolbar = mountToolbar()

    await segment(toolbar, 'Completed').trigger('click')

    expect(toolbar.emitted('change-filter')).toEqual([['completed']])
  })

  it('does nothing when the selected filter is pressed again', async () => {
    const toolbar = mountToolbar({ filter: 'pending' })

    await segment(toolbar, 'Pending').trigger('click')

    expect(toolbar.emitted('change-filter')).toBeUndefined()
  })

  it.each([
    ['newest', 'Newest first'],
    ['oldest', 'Oldest first'],
  ] as const)('labels the sort button with the %s order', (sortOrder, label) => {
    const toolbar = mountToolbar({ sortOrder })

    expect(sortButton(toolbar).text()).toBe(`Sort order: ${label}`)
  })

  it('emits toggle-sort when the sort button is clicked', async () => {
    const toolbar = mountToolbar()

    await sortButton(toolbar).trigger('click')

    expect(toolbar.emitted('toggle-sort')).toHaveLength(1)
  })

  it('can move focus to the selected filter segment', () => {
    const toolbar = mountToolbar({ filter: 'completed' })

    toolbar.vm.focusSelectedFilter()

    expect(document.activeElement).toBe(segment(toolbar, 'Completed').element)
  })
})
