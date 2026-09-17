import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer, nextTick } from 'vue'
import useGallery from '../src/composables/useGallery.js'
import { clearSession, saveSession } from '../src/services/session.js'

const samples = [
  { id: 1, corteNome: 'Clássico', criadoEm: '2030-01-02T12:00:00Z', favorito: false, previewUrl: null },
  { id: 2, corteNome: 'Low Fade', criadoEm: '2030-01-03T12:00:00Z', favorito: true, previewUrl: '/resultado-salvo.png' },
]
const session = (id = 1, token = 'gallery-session') => ({ id, nivel_acesso: 'usuario', sessionToken: token })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function mountGallery(context, overrides = {}) {
  saveSession(session())
  const calls = []
  const api = {
    list: async () => ({ resultados: samples.map(result => ({ ...result })) }),
    get: async id => { calls.push(['get', id]); return { resultado: { ...samples.find(item => item.id === id) } } },
    setFavorite: async (id, favorito) => { calls.push(['favorite', id, favorito]); return { resultado: { ...samples.find(item => item.id === id), favorito } } },
    remove: async id => { calls.push(['delete', id]); return { mensagem: 'Resultado excluído.' } },
    ...overrides,
  }
  const renderer = createRenderer({ createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null })
  let state
  const app = renderer.createApp({ setup() { state = useGallery({ api }); return () => null } })
  app.mount({})
  context.after(() => { app.unmount(); clearSession() })
  await nextTick()
  return { state, calls, app }
}

test('galeria vazia não inventa resultados e busca combina favoritos sem diferenciar acentos', async context => {
  const { state } = await mountGallery(context)
  assert.equal(state.results.value.length, 2)
  assert.equal(state.totalFavorites.value, 1)
  state.search.value = ' CLASSICO '
  assert.deepEqual(state.filteredResults.value.map(result => result.id), [1])
  state.filter.value = 'favorites'
  assert.deepEqual(state.filteredResults.value, [])
  state.search.value = 'fade'
  assert.deepEqual(state.filteredResults.value.map(result => result.id), [2])
  state.clearFilters()
  assert.equal(state.filteredResults.value.length, 2)
  state.results.value = []
  assert.deepEqual(state.filteredResults.value, [])
  assert.equal(state.totalFavorites.value, 0)
})

test('favoritar aguarda confirmação do servidor e atualiza filtro e contagem', async context => {
  const { state, calls } = await mountGallery(context)
  state.filter.value = 'favorites'
  await state.toggleFavorite(state.results.value[0])
  assert.deepEqual(calls, [['favorite', 1, true]])
  assert.equal(state.totalFavorites.value, 2)
  assert.equal(state.filteredResults.value.length, 2)
  await state.toggleFavorite(state.results.value[0])
  assert.equal(state.totalFavorites.value, 1)
  assert.deepEqual(state.filteredResults.value.map(result => result.id), [2])
})

test('falha ao favoritar preserva o resultado e bloqueia envios duplicados', async context => {
  const response = deferred()
  let requests = 0
  const { state } = await mountGallery(context, { setFavorite: () => { requests += 1; return response.promise } })
  const favorite = state.toggleFavorite(state.results.value[0])
  await state.toggleFavorite(state.results.value[0])
  state.askDelete(state.results.value[0])
  assert.equal(requests, 1)
  assert.equal(state.confirmation.value, null)
  assert.equal(state.results.value[0].favorito, false)
  assert.equal(state.pendingFavorites.value.has(1), true)
  response.reject(new Error('Não foi possível salvar o favorito.'))
  await favorite
  assert.equal(state.results.value[0].favorito, false)
  assert.match(state.actionError.value, /salvar o favorito/)
  assert.equal(state.pendingFavorites.value.size, 0)
})

test('exclusão exige confirmação e cancelar preserva o resultado', async context => {
  const { state, calls } = await mountGallery(context)
  await state.deleteResult()
  state.askDelete(state.results.value[0])
  assert.equal(calls.length, 0)
  state.closeDelete()
  await state.deleteResult()
  assert.equal(calls.length, 0)
  assert.equal(state.results.value.length, 2)
  state.askDelete(state.results.value[1])
  await state.deleteResult()
  assert.deepEqual(calls, [['delete', 2]])
  assert.deepEqual(state.results.value.map(result => result.id), [1])
  assert.equal(state.totalFavorites.value, 0)
  assert.equal(state.confirmation.value, null)
})

test('falha na exclusão mantém confirmação aberta para tentar novamente', async context => {
  let attempts = 0
  const { state } = await mountGallery(context, {
    remove: async () => { if (++attempts === 1) throw new Error('Servidor indisponível.') },
  })
  state.askDelete(state.results.value[0])
  await state.deleteResult()
  assert.equal(state.confirmation.value.id, 1)
  assert.equal(state.results.value.length, 2)
  assert.match(state.deleteError.value, /Servidor indisponível/)
  assert.equal(state.deleting.value, false)
  await state.deleteResult()
  assert.equal(state.results.value.length, 1)
  assert.equal(state.confirmation.value, null)
})

test('visualização consulta resultado atual e fechar ignora resposta atrasada', async context => {
  const response = deferred()
  const { state } = await mountGallery(context, { get: () => response.promise })
  const opening = state.openResult(state.results.value[0])
  assert.equal(state.selectedId.value, 1)
  assert.equal(state.detailLoading.value, true)
  state.closeResult()
  response.resolve({ resultado: { ...samples[0], corteNome: 'Atualizado' } })
  await opening
  assert.equal(state.selectedId.value, null)
  assert.equal(state.selected.value, null)
  assert.equal(state.results.value[0].corteNome, 'Clássico')
})

test('detalhe pode ser tentado novamente depois de uma falha', async context => {
  let attempts = 0
  const { state } = await mountGallery(context, {
    get: async () => {
      if (++attempts === 1) throw new Error('Não encontrado.')
      return { resultado: { ...samples[0], corteNome: 'Clássico atualizado' } }
    },
  })
  await state.openResult(samples[0])
  assert.equal(state.selectedId.value, 1)
  assert.equal(state.selected.value, null)
  assert.equal(state.detailError.value, 'Não encontrado.')
  await state.openResult(samples[0])
  assert.equal(state.selected.value.corteNome, 'Clássico atualizado')
  assert.equal(state.results.value[0].corteNome, 'Clássico atualizado')
  assert.equal(state.detailError.value, '')
})

test('falha ao carregar a galeria pode ser recuperada sem inventar dados', async context => {
  let attempts = 0
  const { state } = await mountGallery(context, {
    list: async () => {
      if (++attempts === 1) throw new Error('Conexão indisponível.')
      return { resultados: [] }
    },
  })
  assert.equal(state.error.value, 'Conexão indisponível.')
  assert.equal(state.loading.value, false)
  assert.deepEqual(state.results.value, [])
  await state.loadResults()
  assert.equal(state.error.value, '')
  assert.deepEqual(state.results.value, [])
})

test('trocar de conta limpa dados e ignora carregamento da conta anterior', async context => {
  const oldResponse = deferred()
  let requests = 0
  const { state } = await mountGallery(context, {
    list: () => ++requests === 1 ? oldResponse.promise : Promise.resolve({ resultados: [] }),
  })
  state.search.value = 'privado'
  saveSession(session(2, 'other-account'))
  await nextTick()
  await nextTick()
  oldResponse.resolve({ resultados: samples })
  await nextTick()
  assert.equal(requests, 2)
  assert.deepEqual(state.results.value, [])
  assert.equal(state.search.value, '')
  assert.equal(state.loading.value, false)
})

test('logout fecha detalhes e confirmação e ignora favorito antigo', async context => {
  const favoriteResponse = deferred()
  const { state } = await mountGallery(context, { setFavorite: () => favoriteResponse.promise })
  await state.openResult(samples[1])
  state.askDelete(samples[1])
  const saving = state.toggleFavorite(state.results.value[0])
  clearSession()
  await nextTick()
  favoriteResponse.resolve({ resultado: { ...samples[0], favorito: true } })
  await saving
  assert.deepEqual(state.results.value, [])
  assert.equal(state.selected.value, null)
  assert.equal(state.selectedId.value, null)
  assert.equal(state.confirmation.value, null)
  assert.equal(state.notice.value, '')
  assert.equal(state.pendingFavorites.value.size, 0)
})

test('nova sessão do mesmo usuário ignora erro e exclusão atrasados', async context => {
  const response = deferred()
  const { state } = await mountGallery(context, { remove: () => response.promise })
  state.askDelete(samples[0])
  const removing = state.deleteResult()
  saveSession(session(1, 'renewed-session'))
  await nextTick()
  await nextTick()
  response.reject(new Error('Erro da sessão anterior.'))
  await removing
  assert.equal(state.results.value.length, 2)
  assert.equal(state.deleteError.value, '')
  assert.equal(state.notice.value, '')
  assert.equal(state.deleting.value, false)
})

test('componente desmontado ignora respostas da galeria', async context => {
  const response = deferred()
  const { state, app } = await mountGallery(context, { get: () => response.promise })
  const opening = state.openResult(samples[0])
  app.unmount()
  response.resolve({ resultado: { ...samples[0], corteNome: 'Resposta antiga' } })
  await opening
  assert.equal(state.selected.value, null)
  assert.equal(state.results.value[0].corteNome, 'Clássico')
})
