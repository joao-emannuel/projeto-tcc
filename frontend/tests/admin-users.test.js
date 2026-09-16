import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer } from 'vue'
import useAdminUsers from '../src/composables/useAdminUsers.js'
import { getSessionUser, updateSessionUser } from '../src/services/session.js'

const admin = { id: 1, nome: 'Pedro Admin', apelido: 'pedro', email: 'pedro@example.test', telefone: '', nivel_acesso: 'admin', ativo: true }
const member = { id: 2, nome: 'João Silva', apelido: 'joao', email: 'joao@example.test', telefone: '', nivel_acesso: 'usuario', ativo: true }

async function mountAdmin(context, overrides = {}) {
  const calls = []
  const api = {
    list: async () => [{ ...admin }, { ...member }],
    requestRegistration: async body => { calls.push(['request', body]); return { cadastroId: 'pending-123', email: body.email, expiraEm: '2030-01-01T12:30:00Z' } },
    confirmRegistration: async (id, codigo) => { calls.push(['confirm', id, codigo]); return { usuario: { ...member, id: 3 } } },
    resendCode: async id => { calls.push(['resend', id]); return { cadastroId: id, email: 'novo@example.test' } },
    update: async (id, body) => { calls.push(['update', id, body]); return { usuario: { ...(id === 1 ? admin : member), ...body } } },
    recoverPassword: async id => { calls.push(['recover', id]); return { mensagem: 'E-mail enviado.' } },
    ...overrides,
  }
  const renderer = createRenderer({ createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null })
  let state
  const app = renderer.createApp({ setup() { state = useAdminUsers({ api, currentUser: admin }); return () => null } })
  app.mount({})
  context.after(() => app.unmount())
  await Promise.resolve()
  Object.assign(state.form, { nome: ' João Silva ', apelido: 'joao', email: 'novo@example.test', telefone: '', nivel_acesso: 'usuario' })
  return { state, calls }
}

test('cadastro só entra na lista após confirmação do código e mantém senha fora do painel', async context => {
  const { state, calls } = await mountAdmin(context)
  await state.createAccount()
  assert.equal(state.users.value.length, 2)
  assert.equal(state.pendingRegistration.value.cadastroId, 'pending-123')
  assert.equal(state.resendSeconds.value, 30)
  assert.equal(calls[0][1].nome, 'João Silva')
  assert.equal('senha' in calls[0][1], false)

  state.code.value = '001234'
  await state.verifyCode()
  assert.deepEqual(calls[1], ['confirm', 'pending-123', '001234'])
  assert.equal(state.users.value.length, 3)
  assert.equal(state.pendingRegistration.value, null)
  assert.equal(state.form.nome, '')
  assert.match(state.success.value, /senha temporária recebida por e-mail/)
})

test('código inválido não envia requisição e erro do servidor mantém cadastro e formulário', async context => {
  const { state, calls } = await mountAdmin(context, {
    confirmRegistration: async () => { throw new Error('Código expirado. Reenvie o código.') },
  })
  await state.createAccount()
  state.code.value = 'abc'
  await state.verifyCode()
  assert.equal(calls.length, 1)
  assert.match(state.modalError.value, /6 números/)
  state.code.value = '123456'
  await state.verifyCode()
  assert.match(state.modalError.value, /Código expirado/)
  assert.equal(state.pendingRegistration.value.cadastroId, 'pending-123')
  assert.equal(state.form.email, 'novo@example.test')
  assert.equal(state.users.value.length, 2)
})

test('fechar verificação preserva os dados e impede confirmação sem cadastro aberto', async context => {
  const { state, calls } = await mountAdmin(context)
  await state.createAccount()
  state.closeVerification()
  state.code.value = '123456'
  await state.verifyCode()
  assert.equal(calls.length, 1)
  assert.equal(state.pendingRegistration.value, null)
  assert.equal(state.form.email, 'novo@example.test')
})

test('reenvio respeita intervalo e usa cadastro pendente atual', async context => {
  const { state, calls } = await mountAdmin(context)
  await state.createAccount()
  await state.resendCode()
  assert.equal(calls.length, 1)
  state.resendSeconds.value = 0
  state.code.value = '123456'
  await state.resendCode()
  assert.deepEqual(calls[1], ['resend', 'pending-123'])
  assert.equal(state.resendSeconds.value, 30)
  assert.equal(state.code.value, '')
})

test('busca ignora acentos e combina filtros de status e perfil', async context => {
  const { state } = await mountAdmin(context)
  state.search.value = 'joao'
  assert.deepEqual(state.filteredUsers.value.map(user => user.id), [2])
  state.roleFilter.value = 'admin'
  assert.equal(state.filteredUsers.value.length, 0)
  state.search.value = 'EXAMPLE.TEST'
  assert.deepEqual(state.filteredUsers.value.map(user => user.id), [1])
  state.statusFilter.value = 'inactive'
  assert.equal(state.filteredUsers.value.length, 0)
})

test('administrador não desativa nem rebaixa a própria conta e edição não altera e-mail', async context => {
  const previousUser = getSessionUser()
  updateSessionUser(admin)
  context.after(() => updateSessionUser(previousUser))
  const { state, calls } = await mountAdmin(context)
  state.askConfirmation('status', admin)
  assert.equal(state.confirmation.value, null)
  state.openEdit(admin)
  state.editing.value.nivel_acesso = 'usuario'
  state.editing.value.ativo = false
  state.editing.value.email = 'outro@example.test'
  state.editing.value.nome = 'Pedro atualizado'
  await state.saveUser()
  const sent = calls[0][2]
  assert.equal(sent.nivel_acesso, 'admin')
  assert.equal(sent.ativo, true)
  assert.equal('email' in sent, false)
  assert.equal(state.users.value[0].nome, 'Pedro atualizado')
  assert.equal(getSessionUser().nome, 'Pedro atualizado')
})

test('perfil administrador legado participa do filtro e abre edição como admin', async context => {
  const legacy = { ...admin, nivel_acesso: 'administrador' }
  const { state } = await mountAdmin(context, { list: async () => [legacy, member] })
  state.roleFilter.value = 'admin'
  assert.equal(state.totalAdmins.value, 1)
  assert.deepEqual(state.filteredUsers.value.map(user => user.id), [1])
  state.openEdit(legacy)
  assert.equal(state.editing.value.nivel_acesso, 'admin')
})

test('desativação e recuperação só executam após confirmação', async context => {
  const { state, calls } = await mountAdmin(context)
  state.askConfirmation('status', member)
  assert.equal(calls.length, 0)
  await state.confirmAction()
  assert.deepEqual(calls[0], ['update', 2, { ativo: false }])
  assert.equal(state.users.value.find(user => user.id === 2).ativo, false)
  assert.equal(state.confirmation.value, null)
  state.askConfirmation('password', member)
  assert.equal(calls.length, 1)
  await state.confirmAction()
  assert.deepEqual(calls[1], ['recover', 2])
  assert.equal(state.success.value, 'E-mail enviado.')
})

test('requisições duplicadas são bloqueadas enquanto envio está em andamento', async context => {
  let resolveRequest
  let requests = 0
  const { state } = await mountAdmin(context, {
    requestRegistration: () => { requests += 1; return new Promise(resolve => { resolveRequest = resolve }) },
  })
  const sending = state.createAccount()
  await state.createAccount()
  assert.equal(requests, 1)
  assert.equal(state.busy.value, true)
  resolveRequest({ cadastroId: 'once', email: 'novo@example.test' })
  await sending
  assert.equal(state.busy.value, false)
})

test('falha de permissão mantém formulário e bloqueia novas alterações', async context => {
  let requests = 0
  const { state } = await mountAdmin(context, {
    requestRegistration: async () => { requests += 1; throw Object.assign(new Error('Acesso negado.'), { status: 403 }) },
  })
  await state.createAccount()
  assert.equal(state.accessDenied.value, true)
  assert.equal(state.formError.value, 'Acesso negado.')
  assert.equal(state.form.email, 'novo@example.test')
  await state.createAccount()
  assert.equal(requests, 1)
})
