import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h } from 'vue'

const filename = '../src/components/gui-objects/TextLabel.vue'
const source = await readFile(new URL(filename, import.meta.url), 'utf8')
const { descriptor } = parse(source, { filename })
const { content } = compileScript(descriptor, { id: 'TextLabel', inlineTemplate: true })
const code = content.replace(/from (['"])vue\1/g, `from '${import.meta.resolve('vue')}'`)
const TextLabel = (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default

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

function mount(context, props = {}) {
  const root = node('root')
  const app = renderer.createApp({ render: () => h(TextLabel, { text: 'Texto curto', ...props }) })
  app.mount(root)
  context.after(() => app.unmount())
  return root.children[0]
}

test('textWrapped centraliza texto curto por padrão', (context) => {
  const label = mount(context, { textWrapped: true })
  assert.equal(label.props.style.textAlign, 'center')
  assert.equal(label.props.style.justifyContent, 'center')
  assert.equal(label.props.style.width, '100%')
  assert.equal(label.props.style.maxWidth, '100%')
  assert.equal(label.props.style.whiteSpace, 'normal')
  assert.equal(label.children.find((child) => child.type === 'span').text, 'Texto curto')
})

for (const [textAlign, justifyContent] of [['start', 'flex-start'], ['end', 'flex-end']]) {
  test(`textWrapped alinha texto curto em ${textAlign}`, (context) => {
    const label = mount(context, { textWrapped: true, textAlign })
    assert.equal(label.props.style.textAlign, textAlign)
    assert.equal(label.props.style.justifyContent, justifyContent)
    assert.equal(label.props.style.flexDirection, 'row')
  })
}

for (const [textAlign, justifyContent] of [['start', 'flex-end'], ['center', 'center'], ['end', 'flex-start']]) {
  test(`ícone à direita preserva alinhamento ${textAlign} do conjunto`, (context) => {
    const label = mount(context, {
      textWrapped: true,
      textAlign,
      icon: '/upload.svg',
      iconSide: 'right',
      iconSize: 20,
      iconGap: 8,
    })
    assert.equal(label.props.style.textAlign, textAlign)
    assert.equal(label.props.style.justifyContent, justifyContent)
    assert.equal(label.props.style.flexDirection, 'row-reverse')
    assert.equal(label.props.style.gap, '8px')
    const elements = label.children.filter((child) => child.type !== 'comment')
    assert.deepEqual(elements.map((child) => child.type), ['img', 'span'])
    assert.equal(elements[0].props.src, '/upload.svg')
    assert.equal(elements[0].props.style.width, '20px')
    assert.equal(elements[0].props.style.flexShrink, 0)
  })
}

test('textWrapped false preserva posição manual e estilos sem alinhamento adicional', (context) => {
  const label = mount(context, {
    textWrapped: false,
    textAlign: 'end',
    positionXScale: 50,
    positionYScale: 40,
    positionXOffset: 12,
    positionYOffset: 7,
    anchorX: 0,
    anchorY: 1,
  })
  const style = label.props.style
  assert.equal(style.whiteSpace, 'nowrap')
  assert.equal(style.position, 'absolute')
  assert.equal(style.left, 'calc(50% + 12px)')
  assert.equal(style.top, 'calc(40% - 7px)')
  assert.equal(style.transform, 'translate(-0%, -100%)')
  for (const property of ['width', 'maxWidth', 'textAlign', 'justifyContent']) {
    assert.equal(style[property], undefined)
  }
})
