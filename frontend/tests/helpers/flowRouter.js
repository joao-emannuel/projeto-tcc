import { createMemoryHistory, createRouter } from 'vue-router'
import { createRouteGuard } from '../../src/router/routeGuard.js'
import { customizationFlow } from '../../src/services/customizationFlow.js'

export function createFlowRouter(context, options = {}) {
  const flow = options.flow || customizationFlow
  flow.reset()
  context.after(() => flow.reset())
  const component = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'login', component, meta: { guestOnly: true } },
      { path: '/inicio', name: 'home', component, meta: { requiresAuth: true } },
      { path: '/configuracoes', name: 'configuracoes', component, meta: { requiresAuth: true } },
      { path: '/customizar', name: 'customizar', component, meta: { requiresAuth: true } },
      { path: '/resultadofinal', name: 'resultadofinal', component, meta: { requiresAuth: true } },
    ],
  })
  router.beforeEach(createRouteGuard({ flow, getUser: options.getUser || (() => '{"id":7}') }))
  return router
}

export function goInHistory(router, delta) {
  return new Promise((resolve, reject) => {
    const removeError = router.onError(reject)
    const removeAfter = router.afterEach(() => {
      removeAfter()
      removeError()
      resolve()
    })
    router.go(delta)
  })
}
