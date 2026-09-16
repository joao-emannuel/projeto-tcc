<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
const dialog = ref(null)

async function syncDialog() {
  await nextTick()
  if (!dialog.value) return
  if (props.open && !dialog.value.open) dialog.value.showModal()
  else if (!props.open && dialog.value.open) dialog.value.close()
}

function requestClose() {
  if (!props.busy) emit('close')
}

function onBackdropClick(event) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose()
}

watch(() => props.open, syncDialog)
onMounted(syncDialog)
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="app-modal" :aria-label="title" :aria-busy="busy"
      @cancel.prevent="requestClose" @click="onBackdropClick">
      <button class="modal-close" type="button" aria-label="Fechar janela" :disabled="busy" @click="requestClose">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <header class="modal-heading">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </header>
      <div class="modal-body"><slot /></div>
      <footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.app-modal { margin: auto; width: min(480px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 38px 30px 28px; border: 1px solid #364b60; border-radius: 24px; background: linear-gradient(145deg, #192333, #101720); box-shadow: 0 22px 90px #0009; color: #d9e3ed; font-family: Inter, Arial, sans-serif; color-scheme: dark; }
.app-modal::backdrop { background: #02060cb8; backdrop-filter: blur(5px); }
.modal-close { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: #99aec2; cursor: pointer; }
.modal-close:hover { background: #2b3b4f; color: #fff; }
.modal-close:disabled { opacity: .4; cursor: wait; }
.modal-close svg { width: 19px; height: 19px; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
.modal-heading { margin-bottom: 24px; text-align: center; }
.modal-heading h2 { margin: 0; font-size: 23px; font-weight: 600; line-height: 1.35; color: #f1f5f9; letter-spacing: -.4px; }
.modal-heading p { margin: 12px 0 0; color: #9aabba; font-size: 13px; line-height: 1.7; }
.modal-footer { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.modal-close:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 2px; }
@media (max-width: 480px) { .app-modal { padding-inline: 22px; } }
</style>
