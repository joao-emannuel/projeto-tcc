import { haircuts } from '../data/haircuts.js'

function validPhotoId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const id = String(value ?? '')
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null
}

function matchesRoute(route, destination) {
  const query = route.query || {}
  return route.name === destination.name && !route.hash
    && Object.keys(query).length === Object.keys(destination.query).length
    && Object.entries(destination.query).every(([key, value]) => query[key] === value)
}

export function createCustomizationFlow() {
  let activeStep = null
  let pendingNavigation = null

  function reset() {
    activeStep = null
    pendingNavigation = null
  }

  function authorize(from, name, query) {
    pendingNavigation = { from, destination: { name, query: { ...query } } }
    return { name, query: { ...query } }
  }

  function beginCustomization(photoId) {
    reset()
    const id = validPhotoId(photoId)
    return id ? authorize('home', 'customizar', { fotoId: id }) : null
  }

  function beginResult(route, cutId) {
    pendingNavigation = null
    if (activeStep?.name !== 'customizar' || !matchesRoute(route, activeStep)
      || !haircuts.some(cut => cut.id === cutId)) return null

    return authorize('customizar', 'resultadofinal', { fotoId: activeStep.query.fotoId, corte: cutId })
  }

  function guardNavigation(to, from) {
    // Cada autorização vale somente para a próxima navegação, sem localStorage.
    const permission = pendingNavigation
    pendingNavigation = null
    activeStep = null

    if (to.name !== 'customizar' && to.name !== 'resultadofinal') return true

    if (permission && permission.from === from.name && matchesRoute(to, permission.destination)) {
      activeStep = permission.destination
      return true
    }

    return { name: 'home', replace: true }
  }

  return { beginCustomization, beginResult, guardNavigation, reset }
}

export const customizationFlow = createCustomizationFlow()
