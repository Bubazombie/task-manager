<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '@/types/task'

const props = defineProps<{ status: TaskStatus }>()

const isCompleted = computed(() => props.status === 'completed')
</script>

<template>
  <!-- Decorative: the status badge carries the meaning in text. -->
  <svg viewBox="0 0 24 24" aria-hidden="true" class="size-7 shrink-0">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke-width="2"
      class="stroke-ink"
      :class="
        isCompleted
          ? 'fill-yellow motion-safe:transition-[fill] motion-safe:duration-300'
          : 'fill-surface'
      "
    />
    <path
      d="M7.5 12.5l3 3 6-6.5"
      fill="none"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="stroke-ink"
      :class="
        isCompleted
          ? 'opacity-100 motion-safe:transition-opacity motion-safe:duration-300'
          : 'opacity-0'
      "
    />
  </svg>
</template>
