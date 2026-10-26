<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { TASK_FILTERS, type TaskFilter, type TaskSortOrder } from '@/composables/useTaskView'
import {
  FILTER_GROUP_LABEL,
  FILTER_LABELS,
  SORT_ORDER_LABELS,
  SORT_ORDER_PREFIX,
  filterSegmentLabel,
} from '@/messages/tasks'

const props = defineProps<{
  filter: TaskFilter
  sortOrder: TaskSortOrder
  counts: Readonly<Record<TaskFilter, number>>
}>()

const emit = defineEmits<{
  'change-filter': [filter: TaskFilter]
  'toggle-sort': []
}>()

const filterGroup = useTemplateRef('filterGroup')

// Pressing the selected segment again changes nothing, so exactly one is always selected.
function selectFilter(next: TaskFilter): void {
  if (next !== props.filter) {
    emit('change-filter', next)
  }
}

function focusSelectedFilter(): void {
  filterGroup.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
}

defineExpose({ focusSelectedFilter })
</script>

<template>
  <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div
      ref="filterGroup"
      role="group"
      :aria-label="FILTER_GROUP_LABEL"
      class="flex divide-x-2 divide-ink rounded-sm border-2 border-ink shadow-print-sm"
    >
      <button
        v-for="option in TASK_FILTERS"
        :key="option"
        type="button"
        :aria-pressed="option === filter ? 'true' : 'false'"
        :aria-label="filterSegmentLabel(option, counts[option])"
        class="focus-ring flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-sm whitespace-nowrap first:rounded-l-xs last:rounded-r-xs sm:flex-none sm:flex-row sm:gap-1.5 sm:px-4 sm:py-0 sm:text-base"
        :class="
          option === filter
            ? 'bg-ink font-semibold text-paper'
            : 'bg-surface font-medium text-ink hover:bg-paper'
        "
        @click="selectFilter(option)"
      >
        {{ FILTER_LABELS[option] }}
        <!-- Below sm the count sits under the label: three labels plus counts do not fit 320px. -->
        <span
          class="rounded-full px-1.5 text-xs font-semibold tabular-nums"
          :class="option === filter ? 'bg-paper text-ink' : 'bg-ink/10 text-ink'"
        >
          {{ counts[option] }}
        </span>
      </button>
    </div>

    <button
      type="button"
      class="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border-2 border-ink bg-surface px-4 font-medium text-ink shadow-print-sm hover:bg-paper sm:w-auto"
      @click="emit('toggle-sort')"
    >
      <span>
        <span class="sr-only">{{ SORT_ORDER_PREFIX }}</span>
        {{ SORT_ORDER_LABELS[sortOrder] }}
      </span>
      <!-- Decorative: the label carries the order in text. Down means newest first. -->
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="size-5 shrink-0"
        :class="sortOrder === 'oldest' ? 'rotate-180' : undefined"
      >
        <path
          d="M12 5v14M6 13l6 6 6-6"
          fill="none"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="stroke-ink"
        />
      </svg>
    </button>
  </div>
</template>
