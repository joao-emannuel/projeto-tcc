<script setup>
import { ref } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})
const emit = defineEmits(['select'])
const fileInput = ref(null)
const isDragging = ref(false)

function openFilePicker() {
  if (!props.loading) fileInput.value?.click()
}

function onInputChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file && !props.loading) emit('select', file)
}

function onDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && !props.loading) emit('select', file)
}
</script>

<template>
  <div class="photo-upload">
    <input ref="fileInput" class="file-input" type="file" accept="image/jpeg,image/png"
      aria-label="Selecionar foto do rosto" :disabled="loading" @change="onInputChange" />
    <button type="button" class="upload-target" :class="{ 'is-dragging': isDragging }"
      :disabled="loading" :aria-busy="loading" aria-label="Selecionar uma foto JPG ou PNG de até 10 MB"
      @click="openFilePicker" @dragover.prevent="isDragging = !loading" @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop">
      <svg class="upload-icon" viewBox="0 0 80 96" fill="none" aria-hidden="true">
        <path d="M45 5H17C10 5 6 9 6 16v64c0 7 4 11 11 11h45c7 0 11-4 11-11V33L45 5Z" />
        <path d="M45 5v21c0 5 2 7 7 7h21M40 76V48m0 0L26 58m14-10 14 10" />
      </svg>
      <span v-if="loading" class="upload-title" role="status">Salvando foto…</span>
      <span v-else class="upload-title"><strong>Arraste uma foto</strong> ou clique aqui</span>
      <span class="upload-hint">JPG, PNG · Até 10 MB</span>
    </button>
    <p v-if="errorMessage" class="upload-error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.photo-upload {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  gap: 10px;
  font-family: Arial, sans-serif;
}

.file-input { display: none; }

.upload-target {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 210px;
  padding: 24px 12px;
  background: transparent;
  border: 3px dashed #444;
  border-radius: 30px;
  color: #c8c8c8;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.upload-target:hover,
.upload-target:focus-visible,
.upload-target.is-dragging {
  border-color: #7ab3c1;
  background-color: #7ab3c10d;
}

.upload-target:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 4px; }
.upload-target:disabled { cursor: wait; opacity: 0.65; }
.upload-icon { width: 72px; height: 88px; margin-bottom: 16px; stroke: #6598a6; stroke-width: 2.3; }
.upload-title { font-size: 17px; line-height: 1.4; }
.upload-title strong { font-weight: 500; color: #fff; }
.upload-hint { margin-top: 4px; color: #808080; font-size: 14px; }
.upload-error { margin: 0; color: #f08080; font-size: 14px; line-height: 1.4; }
</style>
