<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { getUserMessage, type ApiError } from '@/api/api-error'
import { TITLE_MAX_LENGTH } from '@/types/task'
import { validateTitle } from '@/validation/task-title'

const COUNTER_THRESHOLD = 160
const ADD_ERROR_MESSAGE = 'Could not add the task. Try again.'

const props = defineProps<{
  submitting: boolean
  serverError: ApiError | null
}>()

const emit = defineEmits<{ submit: [title: string] }>()

const title = defineModel<string>('title', { required: true })

const inputId = useId()
const errorId = useId()
const counterId = useId()
const input = useTemplateRef('input')

// Validate only after a failed submit, then live, so the user is not scolded while typing.
const showValidation = ref(false)

const titleLength = computed(() => title.value.trim().length)
const showCounter = computed(() => titleLength.value >= COUNTER_THRESHOLD)
const isOverLimit = computed(() => titleLength.value > TITLE_MAX_LENGTH)

const clientError = computed(() => (showValidation.value ? validateTitle(title.value) : null))
const serverFieldError = computed(
  () => props.serverError?.details.find((detail) => detail.field === 'title')?.message ?? null,
)
const fieldError = computed(() => clientError.value ?? serverFieldError.value)
const formError = computed(() =>
  props.serverError && !serverFieldError.value
    ? getUserMessage(props.serverError, ADD_ERROR_MESSAGE)
    : null,
)

const describedBy = computed(() => {
  const ids = [fieldError.value ? errorId : null, showCounter.value ? counterId : null]
  return ids.filter((id) => id !== null).join(' ') || undefined
})

// Whatever the outcome, put the user back in the field so they can keep typing.
watch(
  () => props.submitting,
  (isSubmitting) => {
    if (!isSubmitting) {
      input.value?.focus()
    }
  },
)

function handleSubmit(): void {
  if (props.submitting) {
    return
  }
  if (validateTitle(title.value)) {
    showValidation.value = true
    input.value?.focus()
    return
  }
  showValidation.value = false
  emit('submit', title.value.trim())
}
</script>

<template>
  <form novalidate class="px-4 py-5 sm:px-6 sm:py-6" @submit.prevent="handleSubmit">
    <label :for="inputId" class="block text-lg font-semibold text-ink">New task</label>
    <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
      <input
        :id="inputId"
        ref="input"
        v-model="title"
        type="text"
        autocomplete="off"
        placeholder="e.g. Review the onboarding checklist"
        :readonly="submitting"
        :aria-invalid="fieldError ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="focus-ring min-h-12 w-full min-w-0 flex-1 rounded-sm border-2 border-ink bg-surface px-3 text-base text-ink placeholder:text-ink-muted aria-invalid:border-danger"
      />
      <button
        type="submit"
        :disabled="submitting"
        class="focus-ring min-h-12 shrink-0 rounded-sm border-2 border-ink bg-ink px-5 font-semibold text-paper shadow-print-sm transition-[translate,box-shadow] duration-75 enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-print-pressed disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
      >
        {{ submitting ? 'Adding…' : 'Add task' }}
      </button>
    </div>

    <p v-if="fieldError" :id="errorId" role="alert" class="mt-2 text-danger">
      {{ fieldError }}
    </p>
    <p
      v-if="showCounter"
      :id="counterId"
      class="mt-2 text-sm"
      :class="isOverLimit ? 'font-semibold text-danger' : 'text-ink-muted'"
    >
      {{ titleLength }} of {{ TITLE_MAX_LENGTH }} characters
    </p>
    <p
      v-if="formError"
      role="alert"
      class="mt-3 rounded-sm border-2 border-danger bg-danger-surface px-3 py-2 text-danger"
    >
      {{ formError }}
    </p>
  </form>
</template>
