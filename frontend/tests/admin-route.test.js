import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRouteGuard } from '../src/router/routeGuard.js'

const destination = { name: 'administrador', meta: { requiresAuth: true, requiresAdmin: true } }
const origin = { name: 'home' }

function makeGuard(user, token = 'sessao-de-teste') {
  let resets = 0
  const guard = createRouteGuard({
    getUser: () => user,
    getToken: () => token,
    flow: { reset: () => { resets += 1 }, guardNavigation: () => true },
  })
  return { guard, getResets: () => resets }
}

test('rota administrativa exige usuário autenticado, papel administrativo e token', () => {
  for (const nivel_acesso of ['admin', 'administrador']) {
    const { guard } = makeGuard({ id: 7, nivel_acesso })
    assert.equal(guard(destination, origin), true)
  }

  for (const user of [{ id: 7, nivel_acesso: 'usuario' }, { id: 7 }, { id: 7, administrador: true }, { id: 7, nivel_acesso: 'admin', ativo: false }]) {
    const { guard, getResets } = makeGuard(user)
    assert.deepEqual(guard(destination, origin), { name: 'home', replace: true })
    assert.equal(getResets(), 1)
  }

  const { guard } = makeGuard({ id: 7, nivel_acesso: 'admin' }, null)
  assert.deepEqual(guard(destination, origin), { name: 'home', replace: true })
})

test('dados de usuário inválidos redirecionam ao login sem lançar erro de JSON', () => {
  for (const user of [null, undefined, '{broken', 'null', '[]', '"texto"', '{}', true]) {
    const { guard } = makeGuard(user)
    assert.deepEqual(guard(destination, origin), { name: 'login', replace: true })
  }
  const { guard } = makeGuard('{"id":7,"nivel_acesso":"admin"}')
  assert.equal(guard(destination, origin), true)
})
