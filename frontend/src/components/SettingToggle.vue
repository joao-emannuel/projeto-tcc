<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String, required: true },
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="setting-row">
    <div class="setting-copy">
      <h3 :id="`${id}-label`">{{ label }}</h3>
      <p :id="`${id}-description`">{{ description }}</p>
    </div>
    <div class="switch-control">
      <button type="button" class="setting-switch" role="switch" :aria-checked="modelValue"
        :aria-labelledby="`${id}-label`" :aria-describedby="`${id}-description`"
        @click="emit('update:modelValue', !modelValue)">
        <span class="switch-thumb">
          <svg v-if="modelValue" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 8 2.5 2.5L12 5" /></svg>
          <svg v-else viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 8h6" /></svg>
        </span>
      </button>
      <span class="switch-state" :class="{ enabled: modelValue }" aria-hidden="true">{{ modelValue ? 'Ativado' : 'Desativado' }}</span>
    </div>
  </div>
</template>

<style scoped>
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-block: 22px; }
.setting-copy { min-width: 0; }
h3 { margin: 0; color: #e2eaf0; font-size: 14px; font-weight: 500; line-height: 1.5; }
p { margin: 6px 0 0; max-width: 300px; color: #8b9cae; font-size: 12px; line-height: 1.6; }
.switch-control { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; gap: 6px; min-width: 62px; }
.setting-switch { display: flex; align-items: center; width: 46px; height: 26px; padding: 3px; border: 1px solid #68545b; border-radius: 999px; background: #382c34; cursor: pointer; transition: background 0.18s, border-color 0.18s; }
.switch-thumb { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #b9a9af; color: #382c34; transition: transform 0.18s, background 0.18s; }
.switch-thumb svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.setting-switch[aria-checked='true'] { background: #25463f; border-color: #538e7d; }
.setting-switch[aria-checked='true'] .switch-thumb { transform: translateX(20px); background: #b4e3d0; color: #234a3b; }
.setting-switch:hover { filter: brightness(1.18); }
.setting-switch:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 4px; }
.switch-state { font-size: 10px; color: #aa979e; }
.switch-state.enabled { color: #9dcebc; }
</style>
