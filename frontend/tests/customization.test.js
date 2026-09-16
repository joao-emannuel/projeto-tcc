import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer, nextTick } from 'vue'
import useCustomization from '../src/composables/useCustomization.js'
import { customizationFlow } from '../src/services/customizationFlow.js'
import { createFlowRouter } from './helpers/flowRouter.js'
import usePreferences, { initPreferences } from '../src/composables/usePreferences.js'

async function mountCustomization(context, { authorize = true, savedPreferences = {}, savedCut = '' } = {}) {
  const values = new Map([
    ['visionfade.preferences', JSON.stringify(savedPreferences)], ['visionfade.lastCut', savedCut],
  ])
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } })
  context.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  })
  initPreferences()
  const router = createFlowRouter(context)
  const renderer = createRenderer({
    createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null,
  })
  let customization
  const app = renderer.createApp({ setup() { customization = useCustomization(); return () => null } })
  app.use(router)
  await router.push({ name: 'home' })
  if (authorize) await router.replace(customizationFlow.beginCustomization(42))
  await router.isReady()
  app.mount({})
  context.after(() => app.unmount())
  return { customization, router, values }
}

test('gerar exige a seleção de um corte disponível', async context => {
  const { customization, router } = await mountCustomization(context)
  assert.equal(customization.selectedCut.value, null)
  await customization.generateResult()
  assert.equal(router.currentRoute.value.name, 'customizar')

  customization.selectedCutId.value = 'corte-inexistente'
  assert.equal(customization.selectedCut.value, null)
  await customization.generateResult()
  assert.equal(router.currentRoute.value.name, 'customizar')
})

test('gerar preserva a foto enviada e encaminha o corte escolhido', async context => {
  const { customization, router } = await mountCustomization(context)
  customization.selectedCutId.value = 'low-fade'
  await customization.generateResult()
  assert.equal(router.currentRoute.value.name, 'resultadofinal')
  assert.deepEqual(router.currentRoute.value.query, { corte: 'low-fade', fotoId: '42' })
})

test('trocar o filtro mantém a escolha mesmo quando o corte fica oculto', async context => {
  const { customization, router } = await mountCustomization(context)
  customization.selectedCutId.value = 'buzzcut'
  assert.equal(customization.filteredCuts.value.length, 20)

  customization.activeFilter.value = 'long'
  assert.deepEqual(customization.filteredCuts.value.map(cut => cut.id), [
    'middle-part', 'flow-cut', 'curtain-fringe', 'top-knot',
  ])
  assert.equal(customization.selectedCut.value.name, 'Buzzcut')

  customization.activeFilter.value = 'all'
  assert.equal(customization.filteredCuts.value.length, 20)
  assert.equal(customization.selectedCutId.value, 'buzzcut')

  await customization.generateResult()
  assert.deepEqual(router.currentRoute.value.query, { corte: 'buzzcut', fotoId: '42' })
})

test('um corte válido não permite gerar sem a foto e a etapa autorizadas', async context => {
  const { customization, router } = await mountCustomization(context, { authorize: false })
  customization.selectedCutId.value = 'old-money'
  await customization.generateResult()
  assert.equal(router.currentRoute.value.name, 'home')
  assert.deepEqual(router.currentRoute.value.query, {})
})

test('customização usa o filtro preferido e só lembra escolhas enquanto salvar está ativo', async context => {
  const { customization, values } = await mountCustomization(context, {
    savedPreferences: { autoSave: true, defaultCutFilter: 'medium' }, savedCut: 'old-money',
  })
  assert.equal(customization.activeFilter.value, 'medium')
  assert.equal(customization.selectedCut.value.name, 'Old Money')
  assert.ok(customization.filteredCuts.value.every(cut => cut.category === 'medium'))
  customization.selectedCutId.value = 'low-fade'
  await nextTick()
  assert.equal(values.get('visionfade.lastCut'), 'low-fade')

  usePreferences().updatePreference('autoSave', false)
  customization.selectedCutId.value = 'buzzcut'
  await nextTick()
  assert.equal(values.has('visionfade.lastCut'), false)
  assert.equal(customization.selectedCut.value.name, 'Buzzcut')
})
