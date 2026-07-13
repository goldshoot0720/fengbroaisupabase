<template>
  <BaseModal
    v-model="isOpen"
    :title="title"
    :icon="icon"
    size="sm"
    @close="handleCancel"
  >
    <p class="confirm-message">{{ message }}</p>
    
    <template #footer>
      <BaseButton variant="ghost" @click="handleCancel">
        {{ cancelText }}
      </BaseButton>
      <BaseButton :variant="confirmVariant" @click="handleConfirm">
        {{ confirmText }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '確認操作' },
  message: { type: String, default: '您確定要執行此操作嗎？' },
  icon: { type: String, default: '⚠️' },
  confirmText: { type: String, default: '確認' },
  cancelText: { type: String, default: '取消' },
  confirmVariant: { 
    type: String, 
    default: 'danger',
    validator: (v) => ['primary', 'danger', 'warning'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleConfirm = () => {
  emit('confirm')
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>

<style scoped>
.confirm-message {
  color: var(--text-primary, #2c3e50);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

:global(.dark) .confirm-message {
  color: #f1f5f9;
}
</style>
