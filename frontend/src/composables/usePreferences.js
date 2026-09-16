import { reactive, readonly, ref } from 'vue'
import { haircutFilters, haircuts } from '../data/haircuts.js'

const preferencesKey = 'visionfade.preferences'
const lastCutKey = 'visionfade.lastCut'
const defaults = Object.freeze({
  notifications: true,
  autoSave: false,
  reducedMotion: false,
  defaultCutFilter: 'all',
})

const preferences = reactive({ ...defaults })
const storageError = ref('')
let lastCutId = ''
let initialized = false

function isValidPreference(key, value) {
  if (key === 'defaultCutFilter') return haircutFilters.some(filter => filter.id === value)
  return Object.hasOwn(defaults, key) && typeof value === 'boolean'
}

function isValidCut(id) {
  return haircuts.some(cut => cut.id === id)
}

function storage() {
  const value = globalThis.localStorage
  if (!value) throw new Error('Armazenamento indisponível')
  return value
}

function applyReducedMotion() {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.reduceMotion = String(preferences.reducedMotion)
  }
}

function persistPreferences() {
  storageError.value = ''
  try {
    const target = storage()
    target.setItem(preferencesKey, JSON.stringify(preferences))
    if (!preferences.autoSave) target.removeItem(lastCutKey)
    return true
  } catch {
    storageError.value = 'Não foi possível salvar as preferências neste navegador. As alterações valem apenas enquanto esta página estiver aberta.'
    return false
  }
}

export function initPreferences() {
  initialized = true
  Object.assign(preferences, defaults)
  lastCutId = ''
  storageError.value = ''

  try {
    const target = storage()
    const saved = target.getItem(preferencesKey)
    let parsed
    try {
      parsed = JSON.parse(saved)
    } catch {
      parsed = null
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const key of Object.keys(defaults)) {
        if (isValidPreference(key, parsed[key])) preferences[key] = parsed[key]
      }
    }

    if (preferences.autoSave) {
      const savedCut = target.getItem(lastCutKey)
      if (isValidCut(savedCut)) lastCutId = savedCut
    }
  } catch {
    storageError.value = 'Não foi possível carregar as preferências deste navegador.'
  }

  applyReducedMotion()
}

function updatePreference(key, value) {
  if (!isValidPreference(key, value)) return false
  preferences[key] = value
  if (!preferences.autoSave) lastCutId = ''
  applyReducedMotion()
  return persistPreferences()
}

function resetPreferences() {
  Object.assign(preferences, defaults)
  lastCutId = ''
  applyReducedMotion()
  return persistPreferences()
}

function getLastCut() {
  return preferences.autoSave ? lastCutId : ''
}

function saveLastCut(id) {
  if (!preferences.autoSave || !isValidCut(id)) return false
  lastCutId = id
  storageError.value = ''
  try {
    storage().setItem(lastCutKey, id)
    return true
  } catch {
    storageError.value = 'Não foi possível lembrar o corte neste navegador. Sua seleção continua disponível nesta página.'
    return false
  }
}

export function usePreferences() {
  if (!initialized) initPreferences()

  return {
    preferences: readonly(preferences),
    storageError: readonly(storageError),
    updatePreference,
    resetPreferences,
    getLastCut,
    saveLastCut,
  }
}

export default usePreferences
