<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskList from '@/components/TaskList.vue'
import TaskToolbar from '@/components/TaskToolbar.vue'
import { useTasks } from '@/composables/useTasks'
import {
  DEFAULT_TASK_FILTER,
  findNearestVisibleTaskId,
  useTaskView,
  type TaskFilter,
} from '@/composables/useTaskView'
import {
  TASK_ADDED_FILTER_RESET_MESSAGE,
  TASK_ADDED_MESSAGE,
  filterChangedMessage,
  sortChangedMessage,
  statusChangedMessage,
  taskHiddenMessage,
} from '@/messages/tasks'
import type { Task, TaskStatus } from '@/types/task'

const {
  tasks,
  summary,
  isLoading,
  loadError,
  isCreating,
  createError,
  updatingTaskIds,
  updateErrors,
  loadTasks,
  addTask,
  updateTaskStatus,
  clearCreateError,
} = useTasks()

const { filter, sortOrder, visibleTasks, filterCounts, matchesFilter, setFilter, toggleSortOrder } =
  useTaskView(tasks)

const newTitle = ref('')
const announcement = ref('')
const toolbar = useTemplateRef('toolbar')
const taskList = useTemplateRef('taskList')

const showToolbar = computed(() => !isLoading.value && !loadError.value && tasks.value.length > 0)

onMounted(loadTasks)

// Editing the title dismisses a server error that refers to the previous attempt.
watch(newTitle, clearCreateError)

// Clearing first makes screen readers repeat a message that is identical to the last one.
async function announce(message: string): Promise<void> {
  announcement.value = ''
  await nextTick()
  announcement.value = message
}

async function handleAdd(title: string): Promise<void> {
  const created = await addTask(title)
  if (!created) {
    return
  }
  newTitle.value = ''
  if (matchesFilter(created)) {
    await announce(TASK_ADDED_MESSAGE)
    return
  }
  setFilter(DEFAULT_TASK_FILTER)
  await announce(TASK_ADDED_FILTER_RESET_MESSAGE)
}

async function handleFilterChange(next: TaskFilter): Promise<void> {
  setFilter(next)
  await announce(filterChangedMessage(next, visibleTasks.value.length))
}

async function handleToggleSort(): Promise<void> {
  toggleSortOrder()
  await announce(sortChangedMessage(sortOrder.value, visibleTasks.value.length))
}

// A removed button may still be reported as focused, or the browser may fall back to the body.
function isFocusOnOrLostFrom(element: HTMLElement | null): boolean {
  const active = document.activeElement
  return active === null || active === document.body || active === element
}

function focusNearestRow(previousTasks: readonly Task[], hiddenId: string): void {
  const nearestId = findNearestVisibleTaskId(previousTasks, visibleTasks.value, hiddenId)
  const nearestButton = nearestId ? taskList.value?.getStatusButton(nearestId) : null
  if (nearestButton) {
    nearestButton.focus()
  } else {
    toolbar.value?.focusSelectedFilter()
  }
}

async function handleUpdateStatus(id: string, status: TaskStatus): Promise<void> {
  const previousTasks = visibleTasks.value
  const statusButton = taskList.value?.getStatusButton(id) ?? null

  const updated = await updateTaskStatus(id, status)
  if (!updated) {
    return
  }
  if (matchesFilter(updated)) {
    await announce(statusChangedMessage(updated.status))
    return
  }

  // The user may have moved on while the request ran; only step in if focus went with the row.
  await nextTick()
  if (isFocusOnOrLostFrom(statusButton)) {
    focusNearestRow(previousTasks, id)
  }
  await announce(taskHiddenMessage(updated.status, filter.value))
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-10 sm:py-16">
    <header>
      <h1 class="text-5xl font-extrabold tracking-tight text-ink text-shadow-misprint sm:text-7xl">
        Task Manager
      </h1>
      <p v-if="summary" class="mt-3 text-lg text-ink-muted">{{ summary }}</p>
    </header>

    <div class="mt-8 rounded-sm border-2 border-ink bg-surface shadow-print">
      <TaskForm
        v-model:title="newTitle"
        :submitting="isCreating"
        :server-error="createError"
        @submit="handleAdd"
      />
      <TaskToolbar
        v-if="showToolbar"
        ref="toolbar"
        class="border-t-2 border-ink"
        :filter="filter"
        :sort-order="sortOrder"
        :counts="filterCounts"
        @change-filter="handleFilterChange"
        @toggle-sort="handleToggleSort"
      />
      <div class="border-t-2 border-ink">
        <TaskList
          ref="taskList"
          :tasks="visibleTasks"
          :filter="filter"
          :loading="isLoading"
          :load-error="loadError"
          :updating-task-ids="updatingTaskIds"
          :update-errors="updateErrors"
          @retry="loadTasks"
          @update-status="handleUpdateStatus"
        />
      </div>
    </div>

    <p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>
  </main>
</template>
