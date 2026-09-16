<script setup>
import { onBeforeUnmount, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import SettingToggle from '@/components/SettingToggle.vue'
import useSidebar from '@/composables/useSidebar.js'
import usePreferences from '@/composables/usePreferences.js'
import { haircutFilters } from '@/data/haircuts.js'

const { isOpen: isSidebarOpen } = useSidebar()
const { preferences, storageError, updatePreference, resetPreferences } = usePreferences()
const feedback = ref('')
let feedbackTimeout

function notify(message) {
  clearTimeout(feedbackTimeout)
  feedback.value = preferences.notifications ? message : ''
  feedbackTimeout = setTimeout(() => { feedback.value = '' }, 3500)
}

function changePreference(key, value) {
  if (updatePreference(key, value)) notify('Preferência salva.')
  else feedback.value = ''
}

function restoreDefaults() {
  if (resetPreferences()) notify('Preferências restauradas.')
  else feedback.value = ''
}

onBeforeUnmount(() => clearTimeout(feedbackTimeout))
</script>

<template>
  <AppLayout>
    <section class="settings-page" :class="{ 'sidebar-open': isSidebarOpen }" aria-labelledby="settings-title">
      <div class="settings-content">
        <header class="settings-heading">
          <div>
            <span class="eyebrow">DO SEU JEITO</span>
            <h1 id="settings-title">Configurações</h1>
            <p>Pequenos ajustes para deixar sua experiência com a sua cara.</p>
          </div>
          <div class="heading-status">
            <span class="local-badge">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
              Neste navegador
            </span>
            <p class="settings-feedback" role="status" aria-live="polite">{{ feedback }}</p>
          </div>
        </header>

        <div class="settings-grid">
          <section class="settings-card" aria-labelledby="experience-title">
            <div class="card-heading">
              <span class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="4" /></svg>
              </span>
              <div><h2 id="experience-title">Sua experiência</h2><p>Conforto e avisos no dia a dia.</p></div>
            </div>
            <SettingToggle id="notifications" label="Receber notificações"
              description="Exibir avisos de confirmação dentro do VisionFade."
              :model-value="preferences.notifications" @update:model-value="changePreference('notifications', $event)" />
            <div class="row-divider"></div>
            <SettingToggle id="reduced-motion" label="Reduzir animações"
              description="Deixar as transições e os movimentos da interface mais discretos."
              :model-value="preferences.reducedMotion" @update:model-value="changePreference('reducedMotion', $event)" />
          </section>

          <section class="settings-card" aria-labelledby="customization-settings-title">
            <div class="card-heading">
              <span class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8.1 8.1 12 12m-12-4.2 12-12M14 10l-4 4" /></svg>
              </span>
              <div><h2 id="customization-settings-title">Seu próximo corte</h2><p>Comece mais perto do seu estilo.</p></div>
            </div>
            <SettingToggle id="auto-save" label="Salvar automaticamente"
              description="Lembrar seu último corte selecionado neste navegador."
              :model-value="preferences.autoSave" @update:model-value="changePreference('autoSave', $event)" />
            <div class="row-divider"></div>
            <div class="filter-setting">
              <label for="default-cut-filter">Filtro inicial de cortes</label>
              <p id="default-filter-description">Qual grupo você quer ver primeiro ao customizar?</p>
              <div class="select-wrapper">
                <select id="default-cut-filter" :value="preferences.defaultCutFilter" aria-describedby="default-filter-description"
                  @change="changePreference('defaultCutFilter', $event.target.value)">
                  <option v-for="filter in haircutFilters" :key="filter.id" :value="filter.id">{{ filter.label }}</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
              </div>
            </div>
          </section>
        </div>

        <footer class="settings-footer">
          <div class="save-note">
            <span class="save-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8" /></svg>
            </span>
            <div><h2>Preferências locais</h2><p>Seus ajustes ficam salvos neste navegador e podem ser alterados a qualquer momento.</p></div>
          </div>
          <button type="button" class="restore-button" @click="restoreDefaults">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4v6h6M3.8 9a8 8 0 1 1-.2 6" /></svg>
            Restaurar padrões
          </button>
        </footer>
        <p v-if="storageError" class="storage-error" role="alert">{{ storageError }}</p>
      </div>
    </section>
  </AppLayout>
</template>

<style scoped>
.settings-page { position: absolute; inset: max(76px, 10%) clamp(20px, 4vw, 64px) 9%; overflow-y: auto; container-type: inline-size; color: #d9d9d9; font-family: Inter, Arial, sans-serif; scrollbar-width: thin; scrollbar-color: #455764 transparent; }
.settings-page.sidebar-open { left: calc(max(200px, 10vw) + 0.5vw + clamp(24px, 4vw, 64px)); }
.settings-content { max-width: 1000px; margin-inline: auto; padding: 6px 6px 16px; }
svg { width: 20px; height: 20px; flex-shrink: 0; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.settings-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.heading-status { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.eyebrow { color: #8cb0ca; font-size: 10px; font-weight: 600; letter-spacing: 2px; }
h1 { margin: 8px 0; color: #f0f3f6; font-size: clamp(24px, 2.2vw, 30px); line-height: 1.25; font-weight: 600; letter-spacing: -0.6px; }
.settings-heading p { margin: 0; font-size: 13px; color: #8e9eb0; line-height: 1.6; }
.local-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #2c3a48; border-radius: 999px; background: #101923; color: #9fb7c9; font-size: 11px; }
.local-badge svg { width: 15px; height: 15px; }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.settings-card { min-width: 0; padding: 24px 24px 4px; border: 1px solid #2b3b4c; border-radius: 22px; background: linear-gradient(135deg, #161e2b, #10141de6); }
.card-heading { display: flex; align-items: center; gap: 13px; padding-bottom: 6px; }
.card-icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border: 1px solid #354c60; border-radius: 12px; background: #223344; color: #a6cce6; }
h2 { margin: 0; color: #dfe9f2; font-size: 16px; line-height: 1.5; font-weight: 500; }
.card-heading p { margin: 3px 0 0; color: #8296aa; font-size: 11px; line-height: 1.5; }
.row-divider { height: 1px; background: #283544; }
.filter-setting { padding-block: 20px; }
.filter-setting label { color: #e2eaf0; font-size: 14px; font-weight: 500; line-height: 1.5; }
.filter-setting p { margin: 6px 0 12px; font-size: 12px; line-height: 1.6; color: #8b9cae; }
.select-wrapper { position: relative; }
.select-wrapper select { appearance: none; width: 100%; padding: 10px 38px 10px 14px; border: 1px solid #3a5064; border-radius: 10px; background: #0f1823; color: #bad0e1; font: inherit; font-size: 12px; cursor: pointer; color-scheme: dark; }
.select-wrapper svg { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #8cb0ca; pointer-events: none; }
.settings-footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 20px; padding: 20px 22px; border: 1px solid #2a3b4d; border-radius: 18px; background: linear-gradient(110deg, #17293880, #10141d80); }
.save-note { display: flex; align-items: center; gap: 14px; }
.save-icon { color: #8cb0ca; }
.save-note h2 { font-size: 13px; }
.save-note p { max-width: 460px; margin: 4px 0 0; color: #8095a9; font-size: 11px; line-height: 1.6; }
.restore-button { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; gap: 8px; min-height: 36px; padding: 8px 14px; border: 1px solid #3e5265; border-radius: 999px; color: #b9ccda; background: transparent; font: inherit; font-size: 11px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.restore-button svg { width: 15px; height: 15px; }
.restore-button:hover { border-color: #8cb0ca; background: #243547; }
.restore-button:focus-visible, select:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 4px; }
.settings-heading .settings-feedback { min-height: 18px; margin: 0; text-align: right; font-size: 11px; color: #a5d8c4; }
.storage-error { margin: 12px 0 0; color: #edb3b3; font-size: 12px; line-height: 1.6; }
@container (max-width: 720px) { .settings-grid { grid-template-columns: minmax(0, 1fr); } .settings-footer { flex-wrap: wrap; } }
@container (max-width: 360px) { .settings-card { padding-inline: 16px; } .settings-footer { padding: 16px; } .settings-heading { gap: 12px; } .local-badge { font-size: 10px; } }
</style>
