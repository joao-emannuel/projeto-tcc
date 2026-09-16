import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer } from 'vue'
import { uploadPhoto } from '../src/services/photos.js'
import usePhotoUpload from '../src/composables/usePhotoUpload.js'
import { createFlowRouter, goInHistory } from './helpers/flowRouter.js'

const file = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'foto do rosto.png', { type: 'image/png' })
const savedPhoto = { id: 42, usuario_id: 7, nome_original: 'foto do rosto.png' }

test('envia os bytes da foto com nome e usuário e preserva os metadados retornados', async context => {
  const selected = file()
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify(savedPhoto), { status: 201 })
  )
  assert.deepEqual(await uploadPhoto(selected, 7), savedPhoto)
  const [url, options] = fetchMock.mock.calls[0].arguments
  const address = new URL(url)
  assert.equal(address.pathname, '/api/fotos')
  assert.equal(address.searchParams.get('usuarioId'), '7')
  assert.equal(address.searchParams.get('nome'), selected.name)
  assert.equal(options.method, 'POST')
  assert.equal(options.headers['Content-Type'], 'image/png')
  assert.equal(options.body, selected)
})

test('rejeita formato, tamanho e usuário inválidos antes de enviar', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Não deveria enviar') })
  const cases = [
    [new File(['x'], 'arquivo.txt', { type: 'text/plain' }), 7, /JPG ou PNG/],
    [new File([], 'vazia.png', { type: 'image/png' }), 7, /vazio/],
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }), 7, /10 MB/],
    [file(), null, /login novamente/],
  ]
  for (const [selected, userId, message] of cases) {
    await assert.rejects(uploadPhoto(selected, userId), message)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

async function mountUpload(context) {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => JSON.stringify({ id: 7 }) },
  })
  context.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  })
  const router = createFlowRouter(context)
  const renderer = createRenderer({
    createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null,
  })
  let upload
  const app = renderer.createApp({ setup() { upload = usePhotoUpload(); return () => null } })
  app.use(router)
  await router.push({ name: 'configuracoes' })
  await router.push({ name: 'home' })
  await router.isReady()
  app.mount({})
  context.after(() => app.unmount())
  return { upload, router, app }
}

test('aguarda salvar, impede envio duplicado e redireciona com o ID da foto', async context => {
  let finishRequest
  const fetchMock = context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finishRequest = resolve }))
  const { upload, router } = await mountUpload(context)
  const pending = upload.onFileSelected(file())
  assert.equal(upload.isUploading.value, true)
  assert.equal(router.currentRoute.value.path, '/inicio')
  await upload.onFileSelected(file())
  assert.equal(fetchMock.mock.callCount(), 1)
  finishRequest(new Response(JSON.stringify(savedPhoto), { status: 201 }))
  await pending
  assert.equal(upload.isUploading.value, false)
  assert.equal(router.currentRoute.value.path, '/customizar')
  assert.equal(router.currentRoute.value.query.fotoId, '42')
  await goInHistory(router, -1)
  assert.equal(router.currentRoute.value.name, 'configuracoes', 'a transição substitui o início no histórico')
})

test('falha ao salvar mantém a tela e permite tentar novamente', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ erro: 'Erro ao salvar a foto.' }), { status: 500 }))
  const { upload, router } = await mountUpload(context)
  await upload.onFileSelected(file())
  assert.equal(upload.isUploading.value, false)
  assert.equal(upload.errorMessage.value, 'Erro ao salvar a foto.')
  assert.equal(router.currentRoute.value.path, '/inicio')
})

test('upload concluído depois de sair do início não muda a tela nem autoriza o link', async context => {
  let finishRequest
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finishRequest = resolve }))
  const { upload, router } = await mountUpload(context)
  const pending = upload.onFileSelected(file())
  await router.push({ name: 'configuracoes' })
  await router.push({ name: 'home' })
  finishRequest(new Response(JSON.stringify(savedPhoto), { status: 201 }))
  await pending
  assert.equal(router.currentRoute.value.name, 'home')
  await router.push('/customizar?fotoId=42')
  assert.equal(router.currentRoute.value.name, 'home')
})

test('upload concluído após desmontar o componente não redireciona', async context => {
  let finishRequest
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finishRequest = resolve }))
  const { upload, router, app } = await mountUpload(context)
  const replaceMock = context.mock.method(router, 'replace')
  const pending = upload.onFileSelected(file())
  app.unmount()
  finishRequest(new Response(JSON.stringify(savedPhoto), { status: 201 }))
  await pending
  assert.equal(replaceMock.mock.callCount(), 0)
  await router.push('/customizar?fotoId=42')
  assert.equal(router.currentRoute.value.name, 'home')
})

test('resposta sem ID válido de foto não autoriza a customização', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ id: 'invalido' }), { status: 201 }))
  const { upload, router } = await mountUpload(context)
  await upload.onFileSelected(file())
  assert.equal(router.currentRoute.value.name, 'home')
  assert.match(upload.errorMessage.value, /confirmar o salvamento/)
})
