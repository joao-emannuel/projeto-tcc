import { customizationFlow } from '../services/customizationFlow.js'
import { getSessionToken, getSessionUser, isAdminUser } from '../services/session.js'

function parseUser(value) {
  try {
    const user = typeof value === 'string' ? JSON.parse(value) : value
    return user && typeof user === 'object' && !Array.isArray(user) && user.id ? user : null
  } catch {
    return null
  }
}

export function createRouteGuard({ flow = customizationFlow, getUser = getSessionUser, getToken = getSessionToken } = {}) {
  return (to, from) => {
    const user = parseUser(getUser())
    const loggedIn = Boolean(user)

    if (to.meta.requiresAuth && !loggedIn) {
      flow.reset()
      return { name: 'login', replace: true }
    }
    if (to.meta.guestOnly && loggedIn) {
      flow.reset()
      return { name: 'home', replace: true }
    }

    if (to.meta.requiresAdmin && (!getToken() || !isAdminUser(user))) {
      flow.reset()
      return { name: 'home', replace: true }
    }

    return flow.guardNavigation(to, from)
  }
}
