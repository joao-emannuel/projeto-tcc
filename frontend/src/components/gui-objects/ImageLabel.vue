<script setup>
const props = defineProps({
    src: { type: String, default: '' }, // URL ou path da imagem
    alt: { type: String, default: '' },
    objectFit: { type: String, default: 'contain' }, // 'cover' | 'contain' | 'fill' | 'none'
    backgroundTransparency: { type: [String, Number], default: 0 }, // 0 = normal, 100 = invisível
    borderRadius: { type: String, default: '0' }, // px
    stroke: { type: [String, Number], default: 0 },
    strokeColor: { type: String, default: '#ffffff' },
    width: { type: [String, Number], default: 25 }, // % do pai
    height: { type: [String, Number], default: 25 }, // % do pai
    minWidth: { type: [String, Number], default: 0 }, // px
    minHeight: { type: [String, Number], default: 0 }, // px
    positionXScale: { type: [String, Number], default: 0 }, // %
    positionXOffset: { type: [String, Number], default: 0 }, // px
    positionYScale: { type: [String, Number], default: 0 },
    positionYOffset: { type: [String, Number], default: 0 },
    anchorX: { type: [String, Number], default: 0.5 }, // 0 = esquerda, 0.5 = centro, 1 = direita
    anchorY: { type: [String, Number], default: 0.5 },
    ignoreLayout: { type: Boolean, default: false }, // true = ignora o UIListLayout do Frame pai
    alignSelf: { type: String, default: null }, // 'start' | 'center' | 'end'
    marginTop: { type: [String, Number], default: null }, // px — sobrescreve o gap do UIListLayout, só pra este item
    marginBottom: { type: [String, Number], default: null },
})

import { computed, inject } from 'vue'

const isInsideListLayout = inject('isInsideListLayout', computed(() => false))

const rootStyle = computed(() => {
    const base = {
        width: `max(${props.minWidth}px, ${props.width}%)`,
        height: `max(${props.minHeight}px, ${props.height}%)`,
        borderRadius: props.borderRadius + 'px',
        boxShadow: `inset 0 0 0 ${props.stroke}px ${props.strokeColor}`,
        overflow: 'hidden',
        opacity: (100 - props.backgroundTransparency) / 100,
    }

    if (isInsideListLayout.value && !props.ignoreLayout) {
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
        transform: `translate(-${props.anchorX * 100}%, -${props.anchorY * 100}%)`,
    }
})

const imgStyle = computed(() => ({
    width: '100%',
    height: '100%',
    objectFit: props.objectFit,
    display: 'block',
}))
</script>

<template>
    <div :style="rootStyle">
        <img :src="src" :alt="alt" :style="imgStyle" :draggable="false" />
    </div>
</template>