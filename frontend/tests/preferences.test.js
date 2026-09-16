import assert from 'node:assert/strict'
import { test } from 'node:test'
import usePreferences, { initPreferences } from '../src/composables/usePreferences.js'

function mockBrowser(context, initial = {}) {
  const values = new Map(Object.entries(initial))
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
  for (const [name, value] of Object.entries({
    localStorage,
    document: { documentElement: { dataset: {} } },
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, value })
    context.after(() => {
      if (original) Object.defineProperty(globalThis, name, original)
      else delete globalThis[name]
    })
  }
  return { values, localStorage }
}

test('restaura as escolhas e aplica a preferência de movimento ao abrir a página', context => {
  mockBrowser(context, {
    'visionfade.preferences': JSON.stringify({
      notifications: false, autoSave: true, reducedMotion: true, defaultCutFilter: 'long',
    }),
    'visionfade.lastCut': 'flow-cut',
  })
  initPreferences()
  const { preferences, storageError, getLastCut } = usePreferences()

  assert.deepEqual({ ...preferences }, {
    notifications: false, autoSave: true, reducedMotion: true, defaultCutFilter: 'long',
  })
  assert.equal(getLastCut(), 'flow-cut')
  assert.equal(document.documentElement.dataset.reduceMotion, 'true')
  assert.equal(storageError.value, '')
})

test('dados corrompidos, campos inválidos e cortes removidos têm valores seguros', context => {
  const { values } = mockBrowser(context)
  for (const saved of ['{broken', 'null', '[]', '"texto"']) {
    values.set('visionfade.preferences', saved)
    initPreferences()
    assert.deepEqual({ ...usePreferences().preferences }, {
      notifications: true, autoSave: false, reducedMotion: false, defaultCutFilter: 'all',
    })
  }

  values.set('visionfade.preferences', JSON.stringify({
    notifications: false, autoSave: true, reducedMotion: 'true', defaultCutFilter: 'inexistente',
  }))
  values.set('visionfade.lastCut', 'corte-removido')
  initPreferences()
  const { preferences, getLastCut } = usePreferences()
  assert.deepEqual({ ...preferences }, {
    notifications: false, autoSave: true, reducedMotion: false, defaultCutFilter: 'all',
  })
  assert.equal(getLastCut(), '')
})

test('alterações válidas persistem para a próxima visita e entradas inválidas são ignoradas', context => {
  const { values } = mockBrowser(context)
  initPreferences()
  const { updatePreference, preferences } = usePreferences()
  assert.equal(updatePreference('reducedMotion', true), true)
  assert.equal(updatePreference('defaultCutFilter', 'medium'), true)
  assert.equal(document.documentElement.dataset.reduceMotion, 'true')
  const saved = values.get('visionfade.preferences')
  assert.equal(updatePreference('notifications', 'false'), false)
  assert.equal(updatePreference('defaultCutFilter', 'invalid'), false)
  assert.equal(updatePreference('senha', 'teste'), false)
  assert.equal(values.get('visionfade.preferences'), saved)

  initPreferences()
  assert.equal(preferences.reducedMotion, true)
  assert.equal(preferences.defaultCutFilter, 'medium')
  assert.equal(preferences.notifications, true)
})

test('lembrar o corte exige consentimento e desativar a opção remove só essa lembrança', context => {
  const { values } = mockBrowser(context, { usuario: 'conta-original', fotoId: '42' })
  initPreferences()
  const { updatePreference, saveLastCut, getLastCut } = usePreferences()
  assert.equal(saveLastCut('buzzcut'), false)
  assert.equal(values.has('visionfade.lastCut'), false)

  updatePreference('autoSave', true)
  assert.equal(saveLastCut('buzzcut'), true)
  assert.equal(saveLastCut('corte-inexistente'), false)
  initPreferences()
  assert.equal(getLastCut(), 'buzzcut')

  updatePreference('autoSave', false)
  assert.equal(getLastCut(), '')
  assert.equal(values.has('visionfade.lastCut'), false)
  updatePreference('autoSave', true)
  assert.equal(getLastCut(), '')
  assert.equal(values.get('usuario'), 'conta-original')
  assert.equal(values.get('fotoId'), '42')
})

test('restaurar padrões mantém a conta e apaga o corte lembrado', context => {
  const { values } = mockBrowser(context, {
    'visionfade.preferences': JSON.stringify({ autoSave: true, reducedMotion: true }),
    'visionfade.lastCut': 'old-money',
    usuario: 'conta-original',
  })
  initPreferences()
  const { resetPreferences, preferences, getLastCut } = usePreferences()
  assert.equal(resetPreferences(), true)
  assert.deepEqual({ ...preferences }, {
    notifications: true, autoSave: false, reducedMotion: false, defaultCutFilter: 'all',
  })
  assert.equal(document.documentElement.dataset.reduceMotion, 'false')
  assert.equal(getLastCut(), '')
  assert.equal(values.has('visionfade.lastCut'), false)
  assert.equal(values.get('usuario'), 'conta-original')
  initPreferences()
  assert.equal(preferences.autoSave, false)
})

test('armazenamento bloqueado mantém a interface utilizável e informa que não salvou', context => {
  const { localStorage } = mockBrowser(context)
  localStorage.getItem = () => { throw new Error('acesso bloqueado') }
  localStorage.setItem = () => { throw new Error('acesso bloqueado') }
  initPreferences()
  const { storageError, updatePreference, preferences, saveLastCut } = usePreferences()
  assert.match(storageError.value, /carregar/)
  assert.equal(updatePreference('reducedMotion', true), false)
  assert.equal(preferences.reducedMotion, true)
  assert.equal(document.documentElement.dataset.reduceMotion, 'true')
  assert.match(storageError.value, /Não foi possível salvar/)
  updatePreference('autoSave', true)
  assert.equal(saveLastCut('buzzcut'), false)
  assert.match(storageError.value, /Não foi possível lembrar/)
})

test('pode inicializar sem APIs do navegador', context => {
  mockBrowser(context)
  delete globalThis.localStorage
  delete globalThis.document
  assert.doesNotThrow(() => initPreferences())
  const { preferences, updatePreference, storageError } = usePreferences()
  assert.equal(preferences.defaultCutFilter, 'all')
  assert.equal(updatePreference('notifications', false), false)
  assert.equal(preferences.notifications, false)
  assert.notEqual(storageError.value, '')
})
