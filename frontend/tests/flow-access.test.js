import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCustomizationFlow, customizationFlow } from '../src/services/customizationFlow.js'
import { createFlowRouter, goInHistory } from './helpers/flowRouter.js'

test('links diretos e recarregamentos das etapas redirecionam para o início', async context => {
  for (const path of ['/customizar?fotoId=42', '/resultadofinal?fotoId=42&corte=low-fade']) {
    const router = createFlowRouter(context, { flow: createCustomizationFlow() })
    await router.push(path)
    assert.equal(router.currentRoute.value.name, 'home')
  }
})

test('usuário deslogado continua sendo enviado ao login', async context => {
  const router = createFlowRouter(context, { getUser: () => null })
  await router.push('/customizar?fotoId=42')
  assert.equal(router.currentRoute.value.name, 'login')
  await router.push('/resultadofinal?fotoId=42&corte=low-fade')
  assert.equal(router.currentRoute.value.name, 'login')
})

test('upload e seleção permitem o fluxo completo uma vez; voltar e avançar não reabrem resultado', async context => {
  const router = createFlowRouter(context)
  await router.push({ name: 'configuracoes' })
  await router.push({ name: 'home' })
  await router.replace(customizationFlow.beginCustomization(42))
  assert.equal(router.currentRoute.value.name, 'customizar')
  const result = customizationFlow.beginResult(router.currentRoute.value, 'low-fade')
  await router.replace(result)
  assert.equal(router.currentRoute.value.name, 'resultadofinal')
  assert.deepEqual(router.currentRoute.value.query, { fotoId: '42', corte: 'low-fade' })

  await goInHistory(router, -1)
  assert.equal(router.currentRoute.value.name, 'configuracoes', 'customizar foi removida do histórico')
  await goInHistory(router, 1)
  assert.equal(router.currentRoute.value.name, 'home')
  await router.push(result)
  assert.equal(router.currentRoute.value.name, 'home', 'autorização consumida não pode ser reutilizada')
})

test('sair da customização impede acessá-la pelo botão voltar', async context => {
  const router = createFlowRouter(context)
  await router.push({ name: 'home' })
  await router.replace(customizationFlow.beginCustomization(42))
  await router.push({ name: 'configuracoes' })
  await goInHistory(router, -1)
  assert.equal(router.currentRoute.value.name, 'home')
})

test('alterar a foto, acrescentar parâmetros ou mudar o corte não aproveita a autorização', async context => {
  const router = createFlowRouter(context)
  await router.push({ name: 'home' })
  const destination = customizationFlow.beginCustomization(42)
  destination.query.fotoId = '99'
  await router.replace(destination)
  assert.equal(router.currentRoute.value.name, 'home')

  await router.replace(customizationFlow.beginCustomization(42))
  await router.push('/customizar?fotoId=42&outro=1')
  assert.equal(router.currentRoute.value.name, 'home')

  await router.replace(customizationFlow.beginCustomization(42))
  const result = customizationFlow.beginResult(router.currentRoute.value, 'low-fade')
  result.query.corte = 'buzzcut'
  await router.replace(result)
  assert.equal(router.currentRoute.value.name, 'home')
})

test('mudança de rota consome autorização pendente e valida a origem da transição', async context => {
  const router = createFlowRouter(context)
  await router.push({ name: 'home' })
  const destination = customizationFlow.beginCustomization(42)
  await router.push({ name: 'configuracoes' })
  await router.push({ name: 'home' })
  await router.replace(destination)
  assert.equal(router.currentRoute.value.name, 'home')

  await router.push({ name: 'configuracoes' })
  await router.replace(customizationFlow.beginCustomization(42))
  assert.equal(router.currentRoute.value.name, 'home')
})

test('nova instância de fluxo não herda a autorização da sessão anterior', async context => {
  const previous = createCustomizationFlow()
  const destination = previous.beginCustomization(42)
  assert.equal(previous.guardNavigation({ ...destination, hash: '' }, { name: 'home' }), true)
  const restartedRouter = createFlowRouter(context, { flow: createCustomizationFlow() })
  await restartedRouter.push(destination)
  assert.equal(restartedRouter.currentRoute.value.name, 'home')
})

test('foto e corte precisam ser válidos, inclusive quando usados fora da interface', () => {
  const flow = createCustomizationFlow()
  for (const id of [null, '', 0, -1, 'abc', ['42'], Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(flow.beginCustomization(id), null)
  }
  const destination = flow.beginCustomization(42)
  flow.guardNavigation(destination, { name: 'home' })
  assert.equal(flow.beginResult(destination, 'corte-inexistente'), null)
  assert.equal(flow.beginResult({ ...destination, query: { fotoId: ['42', '43'] } }, 'low-fade'), null)
})

test('clique duplicado em gerar não reaproveita a navegação cancelada', async context => {
  const router = createFlowRouter(context)
  await router.push({ name: 'home' })
  await router.replace(customizationFlow.beginCustomization(42))
  const first = router.replace(customizationFlow.beginResult(router.currentRoute.value, 'low-fade'))
  const second = router.replace(customizationFlow.beginResult(router.currentRoute.value, 'low-fade'))
  await Promise.all([first, second])
  assert.equal(router.currentRoute.value.name, 'resultadofinal')
  await router.push({ name: 'home' })
  await router.push('/resultadofinal?fotoId=42&corte=low-fade')
  assert.equal(router.currentRoute.value.name, 'home')
})
