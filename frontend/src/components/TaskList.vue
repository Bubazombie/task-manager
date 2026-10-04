<script setup lang="ts">
import type { Task, TaskStatus } from '@/types/task'
import TaskItem from './TaskItem.vue'

const PLACEHOLDER_ROWS = 3

defineProps<{
  tasks: readonly Task[]
  loading: boolean
  loadError: string | null
  updatingTaskIds: ReadonlySet<string>
  updateErrors: Readonly<Record<string, string>>
}>()

const emit = defineEmits<{
  retry: []
  'update-status': [id: string, status: TaskStatus]
}>()
</script>

<template>
  <div v-if="loading" role="status" class="px-4 py-5 sm:px-6">
    <p class="text-ink-muted">Loading tasks…</p>
    <div aria-hidden="true" class="mt-4 space-y-4">
      <div v-for="row in PLACEHOLDER_ROWS" :key="row" class="flex items-center gap-3">
        <span class="size-7 shrink-0 rounded-full border-2 border-ink/25"></span>
        <span class="h-4 flex-1 rounded-sm bg-ink/10"></span>
      </div>
    </div>
  </div>

  <div
    v-else-if="loadError"
    role="alert"
    class="m-4 rounded-sm border-2 border-danger bg-danger-surface p-4 sm:m-6"
  >
    <p class="text-danger">{{ loadError }}</p>
    <button
      type="button"
      class="focus-ring mt-3 min-h-11 rounded-sm border-2 border-ink bg-surface px-4 font-medium text-ink hover:bg-paper"
      @click="emit('retry')"
    >
      Retry
    </button>
  </div>

  <p v-else-if="tasks.length === 0" class="px-4 py-8 text-lg text-ink-muted sm:px-6">
    No tasks yet. Add your first one above.
  </p>

  <ul v-else aria-label="Tasks" class="divide-y divide-ink/25">
    <TaskItem
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      :updating="updatingTaskIds.has(task.id)"
      :error="updateErrors[task.id] ?? null"
      @update-status="(status) => emit('update-status', task.id, status)"
    />
  </ul>
</template>
