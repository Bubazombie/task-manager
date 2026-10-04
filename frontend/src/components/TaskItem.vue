<script setup lang="ts">
import { computed } from 'vue'
import type { Task, TaskStatus } from '@/types/task'
import TaskStatusBadge from './TaskStatusBadge.vue'
import TaskStatusMark from './TaskStatusMark.vue'

const props = defineProps<{
  task: Task
  updating: boolean
  error: string | null
}>()

const emit = defineEmits<{ 'update-status': [status: TaskStatus] }>()

const isCompleted = computed(() => props.task.status === 'completed')
const actionLabel = computed(() => (isCompleted.value ? 'Mark as pending' : 'Mark as completed'))

// aria-disabled instead of disabled: a disabled button would drop keyboard focus mid-request.
function handleClick(): void {
  if (props.updating) {
    return
  }
  emit('update-status', isCompleted.value ? 'pending' : 'completed')
}
</script>

<template>
  <li class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
    <div class="flex min-w-0 flex-1 items-start gap-3">
      <TaskStatusMark :status="task.status" />
      <div class="min-w-0 flex-1">
        <p class="text-lg wrap-anywhere">
          <!-- The stroke transition only exists on the completed state, so it plays once on completion. -->
          <span
            class="marker-stroke"
            :class="
              isCompleted
                ? 'marker-stroke-full text-ink-muted line-through decoration-ink-muted motion-safe:transition-[background-size,color] motion-safe:duration-300 motion-safe:ease-out'
                : 'text-ink'
            "
          >
            {{ task.title }}
          </span>
        </p>
        <TaskStatusBadge class="mt-2" :status="task.status" />
        <p
          v-if="error"
          role="alert"
          class="mt-3 rounded-sm border-2 border-danger bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {{ error }}
        </p>
      </div>
    </div>
    <button
      type="button"
      :aria-disabled="updating ? 'true' : undefined"
      class="focus-ring min-h-11 w-full shrink-0 rounded-sm border-2 border-ink bg-surface px-4 font-medium text-ink hover:bg-paper aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto"
      @click="handleClick"
    >
      {{ actionLabel }}
    </button>
  </li>
</template>
