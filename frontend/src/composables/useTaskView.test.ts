import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/task'
import {
  DEFAULT_SORT_ORDER,
  DEFAULT_TASK_FILTER,
  findNearestVisibleTaskId,
  useTaskView,
} from './useTaskView'

const oldest: Task = {
  id: '1',
  title: 'Oldest',
  status: 'pending',
  createdAt: '2026-03-01T10:00:00.000Z',
}
const middle: Task = {
  id: '2',
  title: 'Middle',
  status: 'completed',
  createdAt: '2026-03-02T10:00:00.000Z',
}
const newest: Task = {
  id: '3',
  title: 'Newest',
  status: 'pending',
  createdAt: '2026-03-03T10:00:00.000Z',
}

function titles(tasks: readonly Task[]): string[] {
  return tasks.map((task) => task.title)
}

function viewOf(tasks: Task[]): ReturnType<typeof useTaskView> {
  return useTaskView(ref(tasks))
}

describe('useTaskView', () => {
  it('shows all tasks newest first by default', () => {
    const { filter, sortOrder, visibleTasks } = viewOf([oldest, middle, newest])

    expect(filter.value).toBe(DEFAULT_TASK_FILTER)
    expect(sortOrder.value).toBe(DEFAULT_SORT_ORDER)
    expect(titles(visibleTasks.value)).toEqual(['Newest', 'Middle', 'Oldest'])
  })

  it('sorts oldest first after toggling, and back again', () => {
    const { visibleTasks, toggleSortOrder } = viewOf([middle, newest, oldest])

    toggleSortOrder()
    expect(titles(visibleTasks.value)).toEqual(['Oldest', 'Middle', 'Newest'])

    toggleSortOrder()
    expect(titles(visibleTasks.value)).toEqual(['Newest', 'Middle', 'Oldest'])
  })

  it.each([
    ['pending', ['Newest', 'Oldest']],
    ['completed', ['Middle']],
    ['all', ['Newest', 'Middle', 'Oldest']],
  ] as const)('shows only %s tasks for that filter', (selected, expected) => {
    const { visibleTasks, setFilter } = viewOf([oldest, middle, newest])

    setFilter(selected)

    expect(titles(visibleTasks.value)).toEqual(expected)
  })

  it('keeps server order for tasks created at the same time, in both orders', () => {
    const sameTime = '2026-03-05T10:00:00.000Z'
    const firstSaved: Task = { ...oldest, id: 'a', title: 'First saved', createdAt: sameTime }
    const secondSaved: Task = { ...oldest, id: 'b', title: 'Second saved', createdAt: sameTime }
    const { visibleTasks, toggleSortOrder } = viewOf([firstSaved, secondSaved])

    expect(titles(visibleTasks.value)).toEqual(['First saved', 'Second saved'])
    toggleSortOrder()
    expect(titles(visibleTasks.value)).toEqual(['First saved', 'Second saved'])
  })

  it('follows changes to the source tasks without reordering them', () => {
    const source = ref<Task[]>([oldest])
    const { visibleTasks } = useTaskView(source)

    source.value = [...source.value, newest]

    expect(titles(visibleTasks.value)).toEqual(['Newest', 'Oldest'])
    expect(titles(source.value)).toEqual(['Oldest', 'Newest'])
  })

  it('tells whether a task matches the active filter', () => {
    const { matchesFilter, setFilter } = viewOf([oldest, middle])

    expect(matchesFilter(middle)).toBe(true)
    setFilter('pending')
    expect(matchesFilter(middle)).toBe(false)
    expect(matchesFilter(oldest)).toBe(true)
  })
})

describe('filterCounts', () => {
  it('counts every task per filter', () => {
    const { filterCounts } = viewOf([oldest, middle, newest])

    expect(filterCounts.value).toEqual({ all: 3, pending: 2, completed: 1 })
  })

  it('ignores the active filter', () => {
    const { filterCounts, setFilter } = viewOf([oldest, middle, newest])

    setFilter('completed')

    expect(filterCounts.value).toEqual({ all: 3, pending: 2, completed: 1 })
  })

  it('follows created tasks and status changes', () => {
    const source = ref<Task[]>([oldest])
    const { filterCounts } = useTaskView(source)

    source.value = [...source.value, newest]
    expect(filterCounts.value).toEqual({ all: 2, pending: 2, completed: 0 })

    source.value = source.value.map((task) =>
      task.id === newest.id ? { ...task, status: 'completed' } : task,
    )
    expect(filterCounts.value).toEqual({ all: 2, pending: 1, completed: 1 })
  })
})

describe('findNearestVisibleTaskId', () => {
  const previous = [newest, middle, oldest]

  it('prefers the row after the hidden one', () => {
    expect(findNearestVisibleTaskId(previous, [newest, oldest], middle.id)).toBe(oldest.id)
  })

  it('falls back to the row before when the hidden one was last', () => {
    expect(findNearestVisibleTaskId(previous, [newest, middle], oldest.id)).toBe(middle.id)
  })

  it('skips rows that are no longer visible either', () => {
    expect(findNearestVisibleTaskId(previous, [oldest], newest.id)).toBe(oldest.id)
  })

  it('returns undefined when no row is left', () => {
    expect(findNearestVisibleTaskId([middle], [], middle.id)).toBeUndefined()
  })

  it('returns undefined when the task was not in the previous view', () => {
    expect(findNearestVisibleTaskId([newest], [newest], 'missing')).toBeUndefined()
  })
})
