<script setup lang="ts">
import { STATUS_LABELS } from '@/messages/tasks'
import type { TaskStatus } from '@/types/task'

defineProps<{ status: TaskStatus }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-medium text-ink"
    :class="status === 'completed' ? 'bg-yellow' : 'bg-surface'"
  >
    {{ STATUS_LABELS[status] }}
  </span>
</template>
