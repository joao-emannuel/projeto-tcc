<script setup>
import AppLayout from '@/layouts/AppLayout.vue'
import useCustomization from '@/composables/useCustomization.js'
import useSidebar from '@/composables/useSidebar.js'
import usePreferences from '@/composables/usePreferences.js'

const { filters, activeFilter, filteredCuts, selectedCutId, selectedCut, generateResult } = useCustomization()
const { isOpen: isSidebarOpen } = useSidebar()
const { preferences, storageError } = usePreferences()
</script>

<template>
  <AppLayout>
    <section class="customization-page" :class="{ 'sidebar-open': isSidebarOpen }"
      aria-labelledby="customization-title">
      <div class="customization-content">
        <RouterLink class="back-link" :to="{ name: 'home' }" replace>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
          </svg>
          Voltar
        </RouterLink>

        <header class="page-heading">
          <h1 id="customization-title">Customização do escaneamento</h1>
          <p>Escolha o corte que você quer experimentar no seu modelo 3D.</p>
        </header>

        <form @submit.prevent="generateResult">
          <div class="filter-row">
            <div class="cut-filter">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5h16l-6.5 7.5V19l-3-1.5v-5L4 5Z" />
              </svg>
              <select v-model="activeFilter" aria-label="Filtrar cortes por tamanho">
                <option v-for="filter in filters" :key="filter.id" :value="filter.id">{{ filter.label }}</option>
              </select>
              <svg class="filter-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </div>
            <div class="filter-status">
              <span v-if="preferences.notifications" class="photo-status" role="status">Foto recebida</span>
              <span class="cut-count">{{ filteredCuts.length }} cortes</span>
            </div>
          </div>

          <fieldset class="cuts-grid">
            <legend class="visually-hidden">Escolha um corte de cabelo</legend>
            <label v-for="cut in filteredCuts" :key="cut.id" class="cut-option">
              <input v-model="selectedCutId" type="radio" name="haircut" :value="cut.id" />
              <span class="cut-card">
                {{ cut.name }}
                <span v-if="selectedCutId === cut.id" class="selected-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-8" /></svg>
                </span>
              </span>
            </label>
          </fieldset>

          <p class="support-note">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 18h6m-5 3h4M8.5 14.5a6 6 0 1 1 7 0c-1 .7-1.5 1.5-1.5 3.5h-4c0-2-.5-2.8-1.5-3.5ZM12 1V0M3 5 1.5 4M21 5l1.5-1M2 12H0m24 0h-2" />
            </svg>
            <span>Sentiu falta de algum corte? Envie sua sugestão pelos nossos canais de contato.</span>
          </p>

          <div class="generation-actions">
            <p class="selection-summary" role="status" aria-live="polite">
              <template v-if="selectedCut">Corte selecionado: <strong>{{ selectedCut.name }}</strong></template>
              <template v-else>Selecione um corte para continuar.</template>
            </p>
            <button class="generate-button" type="submit" :disabled="!selectedCut">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18h6m-5 3h4M8.5 14.5a6 6 0 1 1 7 0c-1 .7-1.5 1.5-1.5 3.5h-4c0-2-.5-2.8-1.5-3.5Z" />
              </svg>
              Gerar resultado personalizado
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </button>
          </div>
          <p v-if="storageError" class="preference-error" role="alert">{{ storageError }}</p>
        </form>
      </div>
    </section>
  </AppLayout>
</template>

<style scoped>
.customization-page {
  position: absolute;
  inset: max(76px, 10%) clamp(20px, 4vw, 64px) 9%;
  overflow-y: auto;
  container-type: inline-size;
  color: #d9d9d9;
  font-family: Inter, Arial, sans-serif;
  scrollbar-width: thin;
  scrollbar-color: #455764 transparent;
}

.customization-page.sidebar-open {
  left: calc(max(200px, 10vw) + 0.5vw + clamp(24px, 4vw, 64px));
}

.customization-content { max-width: 1000px; margin-inline: auto; padding: 4px 6px 16px; }
svg { width: 18px; height: 18px; flex-shrink: 0; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 20px;
  border: 1px solid #303b48;
  border-radius: 999px;
  color: #d9d9d9;
  font-size: 13px;
  text-decoration: none;
  transition: background-color 0.15s, border-color 0.15s;
}
.back-link:hover { background: #10141d; border-color: #8cb0ca; }
.page-heading { margin: 20px 0 24px; }
.page-heading h1 { margin: 0; color: #f0f3f6; font-size: clamp(22px, 2.1vw, 28px); font-weight: 600; line-height: 1.3; letter-spacing: -0.6px; }
.page-heading p { margin: 8px 0 0; font-size: 13px; line-height: 1.6; color: #9aa8b8; }

.filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
.cut-filter { position: relative; display: flex; align-items: center; color: #d0dae3; }
.cut-filter > svg { position: absolute; left: 10px; width: 15px; height: 15px; pointer-events: none; }
.cut-filter > .filter-chevron { left: auto; right: 10px; }
.cut-filter select {
  appearance: none;
  border: 1px solid #303b48;
  border-radius: 999px;
  padding: 5px 32px;
  background: #0b111a;
  color: inherit;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  color-scheme: dark;
}
.cut-count { color: #7c8c9d; font-size: 12px; }
.filter-status { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.photo-status { color: #99c4b7; font-size: 11px; }
.photo-status::before { content: '✓'; margin-right: 5px; }
.preference-error { margin: 12px 0 0; color: #edb3b3; font-size: 12px; line-height: 1.6; }

.cuts-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 24px; min-width: 0; border: 0; padding: 0; margin: 0; }
.cut-option { position: relative; min-width: 0; cursor: pointer; }
.cut-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.cut-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  height: 100%;
  padding: 8px 10px;
  border: 2px solid #547f9b;
  border-radius: 10px;
  background: linear-gradient(0deg, #10141d, #161b26);
  color: #adc7d9;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  line-height: 1.35;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.cut-option:hover .cut-card { border-color: #8cb0ca; background: #1b2a39; color: #e8fafa; }
.cut-option input:checked + .cut-card { border-color: #83c8ed; background: linear-gradient(110deg, #21445f, #142b40); color: #f0faff; box-shadow: 0 0 0 1px #83c8ed26; }
.selected-check { position: absolute; top: -8px; right: -6px; display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; background: #a5daf3; color: #142b40; }
.selected-check svg { width: 14px; height: 14px; stroke-width: 2.5; }

.support-note { display: flex; align-items: flex-start; gap: 8px; margin: 20px 0 22px; color: #7f91a3; font-size: 12px; line-height: 1.5; }
.support-note svg { width: 16px; height: 18px; color: #8cb0ca; }
.generation-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.selection-summary { margin: 0; font-size: 12px; line-height: 1.6; color: #8a9aab; }
.selection-summary strong { color: #adc7d9; font-weight: 500; }
.generate-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-left: auto;
  min-height: 44px;
  padding: 10px 22px;
  border: 1px solid #2692d7;
  border-radius: 999px;
  background: linear-gradient(100deg, #008bff, #075393);
  color: #fff;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: filter 0.15s;
}
.generate-button:hover:enabled { filter: brightness(1.13); }
.generate-button:disabled { background: #303c49; border-color: #3a4653; color: #82909e; cursor: not-allowed; }
.back-link:focus-visible, .cut-filter select:focus-visible, .generate-button:focus-visible,
.cut-option input:focus-visible + .cut-card { outline: 2px solid #a1e6f5; outline-offset: 4px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

@container (max-width: 650px) {
  .cuts-grid { column-gap: 16px; }
  .cut-card { font-size: 13px; }
}
@container (max-width: 540px) {
  .cuts-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .generation-actions { align-items: stretch; flex-direction: column; }
  .generate-button { margin-left: 0; }
}
@container (max-width: 420px) {
  .cuts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-row { align-items: flex-start; flex-direction: column; }
}
@container (max-width: 250px) {
  .cuts-grid { grid-template-columns: minmax(0, 1fr); }
  .generate-button { padding-inline: 10px; }
  .generate-button svg { display: none; }
}
</style>
