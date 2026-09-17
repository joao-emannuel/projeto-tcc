<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AppModal from '@/components/AppModal.vue'
import useGallery from '@/composables/useGallery.js'
import useSidebar from '@/composables/useSidebar.js'
import usePreferences from '@/composables/usePreferences.js'

const router = useRouter()
const { isOpen: isSidebarOpen } = useSidebar()
const { preferences } = usePreferences()
const {
  results, search, filter, totalFavorites, filteredResults, loading, error, actionError, notice,
  pendingFavorites, selectedId, selected, detailLoading, detailError, confirmation, deleting, deleteError,
  loadResults, toggleFavorite, openResult, closeResult, askDelete, closeDelete, deleteResult, clearFilters,
} = useGallery()
const failedPreviews = ref(new Set())
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : dateFormatter.format(date)
}

function hasPreview(result) {
  return Boolean(result.previewUrl) && !failedPreviews.value.has(result.previewUrl)
}

function markPreviewUnavailable(result) {
  failedPreviews.value = new Set([...failedPreviews.value, result.previewUrl])
}

function createSimulation() {
  router.push({ name: 'home' })
}
</script>

<template>
  <AppLayout>
    <section class="gallery-page" :class="{ 'sidebar-open': isSidebarOpen }" aria-labelledby="gallery-title">
      <div class="gallery-content">
        <header class="gallery-heading">
          <div>
            <span class="eyebrow">SEUS ESTILOS</span>
            <h1 id="gallery-title">Galeria</h1>
            <p>Reveja seus resultados e guarde os cortes que mais combinam com você.</p>
          </div>
          <button type="button" class="primary-button" @click="createSimulation">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Criar uma simulação
          </button>
        </header>

        <div class="collection-summary" aria-live="polite">
          <span class="summary-item">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8" cy="9" r="1.5" /><path d="m3 16 5-4 5 4 3-3 5 4" /></svg>
            <strong>{{ results.length }}</strong> {{ results.length === 1 ? 'resultado salvo' : 'resultados salvos' }}
          </span>
          <span class="summary-item">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" /></svg>
            <strong>{{ totalFavorites }}</strong> {{ totalFavorites === 1 ? 'favorito' : 'favoritos' }}
          </span>
          <span class="private-note">Sua coleção pessoal</span>
        </div>

        <div class="gallery-toolbar">
          <label class="search-field">
            <span class="visually-hidden">Buscar pelo nome do corte</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input v-model="search" type="search" placeholder="Buscar pelo nome do corte" :disabled="loading || Boolean(error)">
          </label>
          <div class="filter-group" role="group" aria-label="Filtrar resultados">
            <button type="button" :class="{ active: filter === 'all' }" :aria-pressed="filter === 'all'" @click="filter = 'all'">Todos</button>
            <button type="button" :class="{ active: filter === 'favorites' }" :aria-pressed="filter === 'favorites'" @click="filter = 'favorites'">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" /></svg>
              Favoritos
            </button>
          </div>
        </div>

        <p v-if="actionError" class="error-message" role="alert">{{ actionError }}</p>
        <p v-if="notice && preferences.notifications" class="notice" role="status">{{ notice }}</p>

        <div v-if="loading" class="state-panel compact-state" role="status" aria-live="polite">
          <span class="state-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9M3 3v6h6" /></svg></span>
          <h2>Carregando sua galeria…</h2>
        </div>

        <div v-else-if="error" class="state-panel compact-state" role="alert">
          <span class="state-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v.1" /></svg></span>
          <h2>Não foi possível carregar a galeria</h2>
          <p>{{ error }}</p>
          <button type="button" class="secondary-button" @click="loadResults">Tentar novamente</button>
        </div>

        <div v-else-if="!results.length" class="state-panel empty-collection">
          <div class="empty-art" aria-hidden="true">
            <svg viewBox="0 0 160 128" fill="none">
              <rect x="30" y="15" width="100" height="93" rx="16" transform="rotate(-9 80 62)" class="back-sheet" />
              <rect x="34" y="19" width="100" height="93" rx="16" class="front-sheet" />
              <rect x="48" y="33" width="72" height="48" rx="8" />
              <circle cx="67" cy="48" r="5" />
              <path d="m48 72 21-16 19 16 13-11 19 14M51 94h43m9 0h14" />
              <circle cx="130" cy="25" r="15" class="star-disc" />
              <path d="m130 17 2.3 4.7 5.2.7-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.7 5.2-.7Z" class="art-star" />
            </svg>
          </div>
          <span class="eyebrow">CADA CORTE, UMA POSSIBILIDADE</span>
          <h2>Seu próximo estilo começa aqui</h2>
          <p>Seus resultados salvos aparecerão aqui.<br>Reveja suas simulações, favorite as melhores e encontre seu próximo corte.</p>
          <button type="button" class="primary-button" @click="createSimulation">
            Criar uma simulação
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
          </button>
        </div>

        <div v-else-if="!filteredResults.length" class="state-panel compact-state">
          <span class="state-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
          <h2>{{ filter === 'favorites' && !search.trim() ? 'Seus favoritos ficam aqui' : 'Nenhum resultado encontrado' }}</h2>
          <p>{{ filter === 'favorites' && !search.trim() ? 'Toque na estrela de um resultado para guardá-lo entre seus preferidos.' : 'Experimente outro nome de corte ou veja todos os resultados.' }}</p>
          <button type="button" class="secondary-button" @click="clearFilters">Ver todos os resultados</button>
        </div>

        <div v-else class="results-grid">
          <article v-for="result in filteredResults" :key="result.id" class="result-card">
            <button type="button" class="preview-button" :aria-label="`Visualizar ${result.corteNome}`" @click="openResult(result)">
              <img v-if="hasPreview(result)" :src="result.previewUrl" :alt="`Resultado do corte ${result.corteNome}`" loading="lazy" @error="markPreviewUnavailable(result)">
              <span v-else class="preview-placeholder">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8" cy="9" r="1.5" /><path d="m3 16 5-4 5 4 3-3 5 4" /></svg>
                Prévia indisponível
              </span>
              <span class="preview-caption">Visualizar resultado <span aria-hidden="true">↗</span></span>
            </button>
            <div class="result-info">
              <div class="result-heading"><h2>{{ result.corteNome }}</h2><span v-if="result.favorito" class="favorite-tag">Favorito</span></div>
              <time :datetime="result.criadoEm">{{ formatDate(result.criadoEm) }}</time>
              <div class="result-actions">
                <button type="button" class="favorite-button" :class="{ 'is-favorite': result.favorito }"
                  :aria-label="`${result.favorito ? 'Remover dos favoritos' : 'Favoritar'}: ${result.corteNome}`"
                  :aria-pressed="result.favorito" :disabled="pendingFavorites.has(result.id) || deleting" @click="toggleFavorite(result)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" /></svg>
                  {{ pendingFavorites.has(result.id) ? 'Salvando…' : result.favorito ? 'Favoritado' : 'Favoritar' }}
                </button>
                <button type="button" class="delete-button" :aria-label="`Excluir resultado: ${result.corteNome}`"
                  :disabled="pendingFavorites.has(result.id) || deleting" @click="askDelete(result)">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>
                  Excluir
                </button>
              </div>
            </div>
          </article>
        </div>

        <footer class="gallery-footer">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6m-5 3h4m-5-7a6 6 0 1 1 6 0v1H9Z" /></svg>
          <p>Encontrou seu favorito? Abra o resultado salvo para mostrar ao seu barbeiro.</p>
        </footer>
      </div>
    </section>

    <AppModal :open="selectedId !== null" :title="selected?.corteNome || 'Resultado salvo'" description="Um estilo da sua coleção." @close="closeResult">
      <p v-if="detailLoading" class="modal-note" role="status">Carregando resultado…</p>
      <div v-else-if="detailError" class="detail-error">
        <p class="error-message" role="alert">{{ detailError }}</p>
        <button type="button" class="secondary-button" @click="openResult({ id: selectedId })">Tentar novamente</button>
      </div>
      <template v-else-if="selected">
        <div class="detail-preview">
          <img v-if="hasPreview(selected)" :src="selected.previewUrl" :alt="`Resultado do corte ${selected.corteNome}`" @error="markPreviewUnavailable(selected)">
          <span v-else class="preview-placeholder">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8" cy="9" r="1.5" /><path d="m3 16 5-4 5 4 3-3 5 4" /></svg>
            Prévia indisponível para este resultado
          </span>
        </div>
        <dl class="result-details"><div><dt>Corte escolhido</dt><dd>{{ selected.corteNome }}</dd></div><div><dt>Salvo em</dt><dd>{{ formatDate(selected.criadoEm) }}</dd></div></dl>
      </template>
      <template #footer><button type="button" class="secondary-button" @click="closeResult">Fechar</button></template>
    </AppModal>

    <AppModal :open="Boolean(confirmation)" title="Excluir resultado?" :busy="deleting"
      :description="`O resultado de ${confirmation?.corteNome || 'este corte'} será removido da sua galeria. Esta ação não pode ser desfeita.`" @close="closeDelete">
      <p v-if="deleteError" class="error-message" role="alert">{{ deleteError }}</p>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="deleting" @click="closeDelete">Cancelar</button>
        <button type="button" class="danger-button" :disabled="deleting" @click="deleteResult">{{ deleting ? 'Excluindo…' : 'Excluir resultado' }}</button>
      </template>
    </AppModal>
  </AppLayout>
</template>

<style scoped>
.gallery-page { position: absolute; inset: max(76px, 10%) clamp(20px, 4vw, 64px) 9%; overflow-y: auto; container-type: inline-size; color: #d9d9d9; font-family: Inter, Arial, sans-serif; scrollbar-width: thin; scrollbar-color: #455764 transparent; }
.gallery-page.sidebar-open { left: calc(max(200px, 10vw) + 0.5vw + clamp(24px, 4vw, 64px)); }
.gallery-content { max-width: 1080px; margin-inline: auto; padding: 6px 6px 16px; }
svg { width: 20px; height: 20px; flex-shrink: 0; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
button, input { font: inherit; }
button { cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 4px; }
.eyebrow { color: #8cb0ca; font-size: 10px; font-weight: 600; letter-spacing: 2px; }
.gallery-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
h1 { margin: 8px 0; color: #f0f3f6; font-size: clamp(24px, 2.2vw, 30px); line-height: 1.25; font-weight: 600; letter-spacing: -.6px; }
.gallery-heading p { max-width: 510px; margin: 0; color: #8e9eb0; font-size: 13px; line-height: 1.6; }
.primary-button, .secondary-button, .danger-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 40px; padding: 10px 18px; border: 1px solid #496b87; border-radius: 999px; color: #d9e9f6; font-size: 12px; line-height: 1.4; text-align: center; transition: background .15s, border-color .15s; }
.primary-button { background: linear-gradient(110deg, #285b83, #1b354a); }
.primary-button:hover { border-color: #8cb0ca; background: linear-gradient(110deg, #34709c, #254961); }
.primary-button svg { width: 16px; height: 16px; }
.gallery-heading .primary-button { flex-shrink: 0; }
.secondary-button { background: #1b2939; border-color: #3c5267; }
.secondary-button:hover { background: #293c50; border-color: #8cb0ca; }
.danger-button { background: #562f38; border-color: #874854; color: #ffe1e5; }
.danger-button:hover { background: #6a3944; }
.collection-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 14px 25px; padding: 15px 18px; border: 1px solid #2b3b4c; border-radius: 15px; background: linear-gradient(110deg, #192a3a99, #10192399); }
.summary-item { display: inline-flex; align-items: center; gap: 7px; color: #8fa4b7; font-size: 11px; }
.summary-item svg { width: 17px; height: 17px; margin-right: 2px; color: #8cb0ca; }
.summary-item strong { font-size: 14px; font-weight: 600; color: #dce8f2; }
.private-note { margin-left: auto; color: #71879b; font-size: 10px; }
.gallery-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-block: 22px; }
.search-field { display: flex; align-items: center; gap: 10px; width: min(390px, 100%); min-width: 0; padding: 10px 14px; border: 1px solid #2d3f51; border-radius: 12px; background: #101923; color: #8098ac; }
.search-field svg { width: 17px; height: 17px; }
.search-field input { min-width: 0; width: 100%; border: 0; background: transparent; color: #dbe5ef; font-size: 12px; line-height: 1.6; color-scheme: dark; }
.search-field input::placeholder { color: #74889c; }
.filter-group { display: flex; flex-shrink: 0; gap: 4px; padding: 4px; border: 1px solid #2d3c4d; border-radius: 12px; background: #101923; }
.filter-group button { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 8px 13px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: #93a7b9; font-size: 11px; }
.filter-group button svg { width: 14px; height: 14px; }
.filter-group button.active { border-color: #425f78; background: #253b4f; color: #d5e5f2; }
.filter-group button:hover { color: #e2edf6; }
.state-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 34px 24px; border: 1px solid #2b3d50; border-radius: 22px; background: radial-gradient(ellipse at 50% 15%, #28476455, transparent 65%), linear-gradient(135deg, #161e2b, #10141de6); text-align: center; }
.state-panel h2 { margin: 12px 0 10px; color: #dfeaf4; font-size: 21px; font-weight: 500; line-height: 1.4; letter-spacing: -.3px; }
.state-panel p { max-width: 450px; margin: 0; color: #8b9fb2; font-size: 12px; line-height: 1.8; }
.state-panel .primary-button, .state-panel .secondary-button { margin-top: 22px; }
.empty-art { width: 148px; margin-bottom: 18px; color: #789dbb; }
.empty-art svg { display: block; width: 100%; height: auto; stroke-width: 1.3; }
.back-sheet { fill: #152537; stroke: #3a526a; }
.front-sheet { fill: #1a2e41; stroke: #567d9e; }
.star-disc { fill: #2b4961; stroke: #6088a6; }
.art-star { fill: #91b5cf; stroke: #b5d4e8; stroke-width: 1; }
.compact-state { min-height: 300px; }
.state-icon { display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid #3b556e; border-radius: 15px; background: #22374c; color: #9ec1dc; }
.state-icon svg { width: 24px; height: 24px; }
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 225px), 1fr)); gap: 20px; }
.result-card { min-width: 0; overflow: hidden; border: 1px solid #2b3e51; border-radius: 18px; background: linear-gradient(135deg, #192231, #101720); }
.preview-button { display: block; position: relative; width: 100%; padding: 0; border: 0; background: #132131; color: #a4bfd3; }
.preview-button img { display: block; width: 100%; height: 190px; object-fit: cover; }
.preview-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 190px; padding: 20px; box-sizing: border-box; background: radial-gradient(ellipse at 50% 40%, #243d5555, transparent 75%); color: #8a9fb1; font-size: 11px; line-height: 1.6; text-align: center; }
.preview-placeholder svg { width: 42px; height: 42px; color: #547b9b; stroke-width: 1.2; }
.preview-caption { display: flex; justify-content: space-between; gap: 8px; padding: 11px 16px; background: #142233; color: #a7c4da; font-size: 11px; line-height: 1.5; }
.preview-button:hover .preview-caption { background: #233b51; color: #dceefa; }
.result-info { padding: 16px; }
.result-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.result-heading h2 { min-width: 0; margin: 0; color: #dfeaf4; font-size: 15px; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.favorite-tag { padding: 3px 6px; border: 1px solid #45617a; border-radius: 6px; color: #a8c8df; background: #263c50; font-size: 9px; }
.result-info time { display: block; margin-top: 6px; color: #8296a9; font-size: 11px; }
.result-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #2a394b; }
.favorite-button, .delete-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 0; border: 0; background: transparent; font-size: 10px; line-height: 1.5; color: #9eb6c9; }
.favorite-button svg, .delete-button svg { width: 15px; height: 15px; }
.favorite-button svg { fill: none; }
.favorite-button.is-favorite { color: #b3d5eb; }
.favorite-button.is-favorite svg { fill: #628da966; }
.favorite-button:hover { color: #d7edfc; }
.delete-button { color: #a38d98; }
.delete-button:hover { color: #e8a3b0; }
.gallery-footer { display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 20px; color: #71879b; }
.gallery-footer svg { width: 17px; height: 17px; color: #8cb0ca; }
.gallery-footer p { margin: 0; font-size: 10px; line-height: 1.6; }
.notice { margin: 0 0 18px; color: #a4d7c2; font-size: 12px; line-height: 1.6; }
.error-message { margin: 0 0 18px; color: #edb3b3; font-size: 12px; line-height: 1.6; }
.modal-note { text-align: center; color: #9eafbe; font-size: 13px; }
.detail-error { text-align: center; }
.detail-preview { overflow: hidden; border: 1px solid #2f465b; border-radius: 15px; background: #101b28; }
.detail-preview img { display: block; width: 100%; max-height: 42dvh; object-fit: contain; }
.detail-preview .preview-placeholder { min-height: 210px; }
.result-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0 0; }
.result-details dt { margin-bottom: 6px; color: #7f96a9; font-size: 11px; }
.result-details dd { margin: 0; color: #d0e0ed; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@container (max-width: 700px) { .gallery-heading { align-items: flex-start; flex-wrap: wrap; gap: 16px; } .gallery-toolbar { flex-wrap: wrap; gap: 12px; } .search-field { width: 100%; } .private-note { margin-left: 0; } }
@container (max-width: 360px) { .state-panel { padding: 28px 16px; } .state-panel h2 { font-size: 19px; } .empty-art { width: 120px; } .collection-summary { padding: 14px; gap: 12px; } .filter-group { flex-wrap: wrap; } .gallery-footer { align-items: flex-start; } .primary-button { padding-inline: 14px; } }
</style>
