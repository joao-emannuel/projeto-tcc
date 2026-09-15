import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h, nextTick } from 'vue'

async function loadComponent(name) {
  const filename = `../src/components/gui-objects/${name}.vue`
  const source = await readFile(new URL(filename, import.meta.url), 'utf8')
  const { descriptor } = parse(source, { filename })
  const { content } = compileScript(descriptor, { id: name, inlineTemplate: true })
  const code = content.replace(/from (['"])vue\1/g, `from '${import.meta.resolve('vue')}'`)
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default
}

const Frame = await loadComponent('Frame')
const UIListLayout = await loadComponent('UIListLayout')
const node = (type) => ({ type, props: {}, children: [], parent: null })
const renderer = createRenderer({
  createElement: node,
  createText: () => node('text'),
  createComment: () => node('comment'),
  setText: (element, text) => { element.text = text },
  setElementText: (element, text) => { element.text = text },
  patchProp: (element, key, previous, next) => { element.props[key] = next },
  parentNode: (element) => element.parent,
  nextSibling: (element) => element.parent?.children[element.parent.children.indexOf(element) + 1],
  insert(element, parent, anchor = null) {
    element.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, element)
  },
  remove(element) {
    const siblings = element.parent?.children
    if (siblings) siblings.splice(siblings.indexOf(element), 1)
  },
})

async function mount(context, render) {
  const root = node('root')
  const app = renderer.createApp({ render })
  app.mount(root)
  context.after(() => app.unmount())
  await nextTick()
  function find(element, id) {
    if (element.props.id === id) return element
    for (const child of element.children) {
      const match = find(child, id)
      if (match) return match
    }
  }
  return (id) => find(root, id).props.style
}

const manualPosition = {
  positionXScale: 50, positionYScale: 40,
  positionXOffset: 12, positionYOffset: 7, anchorX: 0, anchorY: 1,
}

function assertManual(style) {
  assert.equal(style.position, 'absolute')
  assert.equal(style.left, 'calc(50% + 12px)')
  assert.equal(style.top, 'calc(40% + 7px)')
  assert.equal(style.transform, 'translate(-0%, -100%)')
}

function assertInList(style) {
  assert.equal(style.position, 'relative')
  assert.equal(style.flexShrink, 0)
  for (const property of ['left', 'top', 'transform']) {
    assert.equal(style[property], undefined)
  }
}

test('Frame sem lista no pai preserva coordenadas e âncoras manuais', async (context) => {
  const style = await mount(context, () => h(Frame, { id: 'frame', ...manualPosition }))
  assertManual(style('frame'))
})

test('lista posiciona os Frames filhos sem deslocar seu próprio Frame', async (context) => {
  const style = await mount(context, () => h(Frame, { id: 'parent', ...manualPosition }, () => [
    h(UIListLayout, { direction: 'vertical', gap: 30 }),
    h(Frame, { id: 'first', ...manualPosition, width: 50, height: 20 }),
    h(Frame, { id: 'second', ...manualPosition }),
  ]))
  assertManual(style('parent'))
  assert.equal(style('parent').display, 'flex')
  assert.equal(style('parent').flexDirection, 'column')
  assert.equal(style('parent').gap, '30px')
  assertInList(style('first'))
  assertInList(style('second'))
  assert.equal(style('first').width, '50%')
  assert.equal(style('first').height, '20%')
})

test('ignoreLayout e Frames intermediários preservam o escopo de cada lista', async (context) => {
  const style = await mount(context, () => h(Frame, null, () => [
    h(UIListLayout),
    h(Frame, { id: 'card' }, () => [
      h(Frame, { id: 'grandchild', ...manualPosition }),
    ]),
    h(Frame, { id: 'contact', ...manualPosition, ignoreLayout: true }, () => [
      h(UIListLayout, { direction: 'horizontal' }),
      h(Frame, { id: 'contactChild', ...manualPosition }),
    ]),
  ]))
  assertInList(style('card'))
  assertManual(style('grandchild'))
  assertManual(style('contact'))
  assert.equal(style('contact').flexDirection, 'row')
  assertInList(style('contactChild'))
})
