<script setup>
const props = defineProps({
    text: { type: String, default: '' },
    minTextSize: { type: [String, Number], default: 12 },
    idealTextSize: { type: [String, Number], default: 2 },
    maxTextSize: { type: [String, Number], default: 24 },
    textMargin: { type: [String, Number], default: 10 },
    textColor: { type: String, default: '#ffffff' },
    textSide: { type: String, default: 'center' },
    stroke: { type: [String, Number], default: 1 },
    strokeColor: { type: String, default: '#ffffff' },
    backgroundColor: { type: String, default: '#404040' },
    backgroundTransparency: { type: [String, Number], default: 0 },
    glassBlur: { type: [String, Number], default: 0 },
    borderRadius: { type: String, default: '10' },
    textFont: { type: String, default: 'arial' },
    textStyle: { type: String, default: 'normal' },
    width: { type: [String, Number], default: 25 },
    height: { type: [String, Number], default: 10 },
    minWidth: { type: [String, Number], default: 0 },
    positionXScale: { type: [String, Number], default: 0 },
    positionXOffset: { type: [String, Number], default: 0 },
    positionYScale: { type: [String, Number], default: 0 },
    positionYOffset: { type: [String, Number], default: 0 },
    anchorX: { type: [String, Number], default: 0.5 },
    anchorY: { type: [String, Number], default: 0.5 },
    ignoreLayout: { type: Boolean, default: false },
    alignSelf: { type: String, default: null },
    marginTop: { type: [String, Number], default: null },
    marginBottom: { type: [String, Number], default: null },
    icon: { type: String, default: null },
    iconSide: { type: String, default: 'left' },
    iconSize: { type: [String, Number], default: 16 },
    iconGap: { type: [String, Number], default: 6 },
})

import { computed, inject } from 'vue'
const emit = defineEmits(['click'])

const fontWeight = computed(() => props.textStyle === 'bold' ? 'bold' : 'normal')
const fontStyle = computed(() => props.textStyle === 'italic' ? 'italic' : 'normal')

const isInsideListLayout = inject('isInsideListLayout', computed(() => false))

// Só ganha posição própria (fora do fluxo) quando NÃO está numa lista, ou
// quando ignoreLayout for explicitamente true.
const isPositioned = computed(() => !isInsideListLayout.value || props.ignoreLayout)

const positionTransform = computed(() =>
    `translate(-${props.anchorX * 100}%, -${props.anchorY * 100}%)`
)

const buttonStyle = computed(() => {
    const base = {
        position: 'relative',
        border: 'none',
        boxShadow: `inset 0 0 0 ${props.stroke}px ${props.strokeColor}`,
        borderRadius: props.borderRadius + 'px',
        width: `max(${props.minWidth}px, ${props.width}%)`,
        height: props.height + '%',
        cursor: 'pointer',
        background: 'transparent',
        padding: 0,
        overflow: 'hidden',
    }

    if (!isPositioned.value) {
        return {
            ...base,
            flexShrink: 0,
            alignSelf: props.alignSelf === 'end' ? 'flex-end'
                : props.alignSelf === 'center' ? 'center'
                    : props.alignSelf === 'start' ? 'flex-start'
                        : undefined,
            marginTop: props.marginTop !== null ? `${props.marginTop}px` : undefined,
            marginBottom: props.marginBottom !== null ? `${props.marginBottom}px` : undefined,
        }
    }

    return {
        ...base,
        position: 'absolute',
        left: `calc(${props.positionXScale}% + ${props.positionXOffset}px)`,
        top: `calc(${props.positionYScale}% - ${props.positionYOffset}px)`,
        '--pos-transform': positionTransform.value,
    }
})

const backgroundStyle = computed(() => ({
    position: 'absolute',
    inset: 0,
    background: props.backgroundColor,
    backdropFilter: `blur(${props.glassBlur}px)`,
    filter: `brightness(${100 - props.backgroundTransparency}%)`,
    zIndex: 0,
}))

const contentStyle = computed(() => ({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    flexDirection: props.iconSide === 'right' ? 'row-reverse' : 'row',
    justifyContent: props.textSide === 'left' ? 'flex-start' : props.textSide === 'right' ? 'flex-end' : 'center',
    gap: `${props.iconGap}px`,
    width: '100%',
    height: '100%',
    paddingLeft: props.textMargin + 'px',
    paddingRight: props.textMargin + 'px',
    boxSizing: 'border-box',
}))

const textStyle = computed(() => ({
    fontSize: `clamp(${props.minTextSize}px, ${props.idealTextSize}vw, ${props.maxTextSize}px)`,
    color: props.textColor,
    fontFamily: props.textFont,
    fontWeight: fontWeight.value,
    fontStyle: fontStyle.value,
    whiteSpace: 'nowrap',
}))

const iconStyle = computed(() => ({
    width: `${props.iconSize}px`,
    height: `${props.iconSize}px`,
    objectFit: 'contain',
    flexShrink: 0,
}))
</script>

<template>
    <button :style="buttonStyle" class="text-button-root" :class="{ 'is-positioned': isPositioned }"
        @click="emit('click')">
        <div :style="backgroundStyle"></div>
        <span :style="contentStyle">
            <img v-if="icon" :src="icon" :style="iconStyle" alt="" />
            <span :style="textStyle">{{ text }}</span>
        </span>
    </button>
</template>

<style scoped>
/* Botões DENTRO da lista (sem posição própria): CSS idêntico ao original,
   nenhuma variável nova, nenhum transform novo em repouso. */
.text-button-root:not(.is-positioned) {
    transition: filter 0.15s ease, transform 0.15s ease;
}

.text-button-root:not(.is-positioned):hover {
    transform: scale(1.03);
}

.text-button-root:not(.is-positioned):active {
    filter: brightness(0.9);
    transform: scale(0.98);
}

/* Botões COM posição própria: precisam manter o translate sempre,
   e somar o scale por cima no hover/active. */
.text-button-root.is-positioned {
    transition: filter 0.15s ease, transform 0.15s ease;
    transform: var(--pos-transform) scale(1);
}

.text-button-root.is-positioned:hover {
    transform: var(--pos-transform) scale(1.03);
}

.text-button-root.is-positioned:active {
    filter: brightness(0.9);
    transform: var(--pos-transform) scale(0.98);
}
</style>