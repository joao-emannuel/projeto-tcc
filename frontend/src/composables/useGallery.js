import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { galleryApi } from '../services/gallery.js'
import { getSessionToken, sessionUser } from '../services/session.js'

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export default function useGallery({ api = galleryApi } = {}) {
  const results = ref([])
  const search = ref('')
  const filter = ref('all')
  const loading = ref(false)
  const error = ref('')
  const actionError = ref('')
  const notice = ref('')
  const pendingFavorites = ref(new Set())
  const selectedId = ref(null)
  const selected = ref(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const confirmation = ref(null)
  const deleting = ref(false)
  const deleteError = ref('')
  let disposed = false
  let loadVersion = 0
  let detailVersion = 0

  const totalFavorites = computed(() => results.value.filter(result => result.favorito).length)
  const filteredResults = computed(() => {
    const term = normalize(search.value.trim())
    return results.value.filter(result => (!term || normalize(result.corteNome).includes(term))
      && (filter.value !== 'favorites' || result.favorito))
  })

  function captureSession() {
    return { userId: sessionUser.value?.id, token: getSessionToken() }
  }

  function isCurrentSession(session) {
    return !disposed && Boolean(session.token) && session.token === getSessionToken()
      && session.userId === sessionUser.value?.id
  }

  function updateResult(result) {
    const index = results.value.findIndex(item => item.id === result.id)
    if (index >= 0) results.value.splice(index, 1, result)
    if (selected.value?.id === result.id) selected.value = result
  }

  async function loadResults() {
    if (loading.value) return
    const session = captureSession()
    if (!isCurrentSession(session)) return
    const version = ++loadVersion
    loading.value = true
    error.value = ''
    try {
      const data = await api.list()
      if (isCurrentSession(session) && version === loadVersion) results.value = data.resultados
    } catch (cause) {
      if (isCurrentSession(session) && version === loadVersion) error.value = cause.message || 'Não foi possível carregar sua galeria.'
    } finally {
      if (isCurrentSession(session) && version === loadVersion) loading.value = false
    }
  }

  async function toggleFavorite(result) {
    if (pendingFavorites.value.has(result.id) || deleting.value) return
    const session = captureSession()
    if (!isCurrentSession(session)) return
    pendingFavorites.value = new Set([...pendingFavorites.value, result.id])
    actionError.value = ''
    notice.value = ''
    try {
      const { resultado } = await api.setFavorite(result.id, !result.favorito)
      if (isCurrentSession(session)) {
        updateResult(resultado)
        notice.value = resultado.favorito ? 'Resultado adicionado aos favoritos.' : 'Resultado removido dos favoritos.'
      }
    } catch (cause) {
      if (isCurrentSession(session)) actionError.value = cause.message || 'Não foi possível atualizar o favorito.'
    } finally {
      if (isCurrentSession(session)) pendingFavorites.value = new Set([...pendingFavorites.value].filter(id => id !== result.id))
    }
  }

  async function openResult(result) {
    const session = captureSession()
    if (!isCurrentSession(session)) return
    const version = ++detailVersion
    selectedId.value = result.id
    selected.value = null
    detailError.value = ''
    detailLoading.value = true
    try {
      const { resultado } = await api.get(result.id)
      if (isCurrentSession(session) && version === detailVersion) {
        selected.value = resultado
        updateResult(resultado)
      }
    } catch (cause) {
      if (isCurrentSession(session) && version === detailVersion) detailError.value = cause.message || 'Não foi possível abrir este resultado.'
    } finally {
      if (isCurrentSession(session) && version === detailVersion) detailLoading.value = false
    }
  }

  function closeResult() {
    detailVersion += 1
    selectedId.value = null
    selected.value = null
    detailLoading.value = false
    detailError.value = ''
  }

  function askDelete(result) {
    if (deleting.value || pendingFavorites.value.has(result.id)) return
    confirmation.value = result
    deleteError.value = ''
  }

  function closeDelete() {
    if (deleting.value) return
    confirmation.value = null
    deleteError.value = ''
  }

  async function deleteResult() {
    if (deleting.value || !confirmation.value) return
    const session = captureSession()
    if (!isCurrentSession(session)) return
    const id = confirmation.value.id
    deleting.value = true
    deleteError.value = ''
    actionError.value = ''
    notice.value = ''
    try {
      await api.remove(id)
      if (isCurrentSession(session)) {
        results.value = results.value.filter(result => result.id !== id)
        confirmation.value = null
        if (selectedId.value === id) closeResult()
        notice.value = 'Resultado excluído da sua galeria.'
      }
    } catch (cause) {
      if (isCurrentSession(session)) deleteError.value = cause.message || 'Não foi possível excluir este resultado.'
    } finally {
      if (isCurrentSession(session)) deleting.value = false
    }
  }

  function clearFilters() {
    search.value = ''
    filter.value = 'all'
  }

  watch([() => sessionUser.value?.id, getSessionToken], () => {
    loadVersion += 1
    results.value = []
    loading.value = false
    error.value = ''
    actionError.value = ''
    notice.value = ''
    pendingFavorites.value = new Set()
    confirmation.value = null
    deleting.value = false
    deleteError.value = ''
    clearFilters()
    closeResult()
    loadResults()
  })

  onMounted(loadResults)
  onBeforeUnmount(() => { disposed = true })

  return {
    results, search, filter, totalFavorites, filteredResults, loading, error, actionError, notice,
    pendingFavorites, selectedId, selected, detailLoading, detailError, confirmation, deleting, deleteError,
    loadResults, toggleFavorite, openResult, closeResult, askDelete, closeDelete, deleteResult, clearFilters,
  }
}
