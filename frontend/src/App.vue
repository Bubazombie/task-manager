<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskList from '@/components/TaskList.vue'
import { useTasks } from '@/composables/useTasks'
import type { TaskStatus } from '@/types/task'

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

const newTitle = ref('')
const announcement = ref('')

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
  if (await addTask(title)) {
    newTitle.value = ''
    await announce('Task added.')
  }
}

async function handleUpdateStatus(id: string, status: TaskStatus): Promise<void> {
  if (await updateTaskStatus(id, status)) {
    await announce(status === 'completed' ? 'Marked as completed.' : 'Marked as pending.')
  }
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
      <div class="border-t-2 border-ink">
        <TaskList
          :tasks="tasks"
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
