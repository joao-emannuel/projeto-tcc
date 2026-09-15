<script setup>
import { computed, inject, ref, provide } from 'vue'

const props = defineProps({
    backgroundColor: { type: String, default: 'transparent' },
    borderRadius: { type: String, default: '0px' },
    stroke: { type: [String, Number], default: 0 }, // espessura do contorno em px
    strokeColor: { type: String, default: '#ffffff' },
    width: { type: [String, Number], default: 100 },  // % do pai
    height: { type: [String, Number], default: 100 }, // % do pai
    minWidth: { type: [String, Number], default: null },  // px — nunca menor que isso
    minHeight: { type: [String, Number], default: null }, // px — nunca menor que isso
    positionXScale: { type: [String, Number], default: 0 },  // %
    positionXOffset: { type: [String, Number], default: 0 }, // px
    positionYScale: { type: [String, Number], default: 0 }, // %
    positionYOffset: { type: [String, Number], default: 0 }, // px
    anchorX: { type: [String, Number], default: 0.5 }, // 0 = esquerda, 0.5 = centro, 1 = direita
    anchorY: { type: [String, Number], default: 0.5 }, // 0 = topo, 0.5 = centro, 1 = baixo
    ignoreLayout: { type: Boolean, default: false }, // mantém a posição manual mesmo dentro de uma lista
})

// A lista do pai posiciona este Frame; a lista deste Frame organiza seus filhos.
const parentHasListLayout = inject('isInsideListLayout', ref(false))

const positionStyle = computed(() => {
    if (parentHasListLayout.value && !props.ignoreLayout) {
        return {
            position: 'relative',
            flexShrink: 0,
        }
    }

    return {
        position: 'absolute',
        left: `calc(${props.positionXScale}% + ${props.positionXOffset}px)`,
        top: `calc(${props.positionYScale}% + ${props.positionYOffset}px)`,
        transform: `translate(-${props.anchorX * 100}%, -${props.anchorY * 100}%)`,
    }
})

const widthCss = computed(() =>
    props.minWidth !== null
        ? `max(${props.minWidth}px, ${props.width}%)`
        : `${props.width}%`
)

const heightCss = computed(() =>
    props.minHeight !== null
        ? `max(${props.minHeight}px, ${props.height}%)`
        : `${props.height}%`
)

// ---- Suporte a UIListLayout (igual Roblox) ----
const listLayout = ref(null) // null = sem list layout, objeto = configurado

function registerListLayout(config) {
    listLayout.value = config
}
provide('registerListLayout', registerListLayout)

provide('isInsideListLayout', computed(() => listLayout.value !== null))

// Traduz 'start' | 'center' | 'end' pro valor CSS equivalente.
function toFlexValue(align) {
    if (align === 'center') return 'center'
    if (align === 'end') return 'flex-end'
    return 'flex-start'
}

const containerStyle = computed(() => {
    if (!listLayout.value) return {}

    const isHorizontal = listLayout.value.direction === 'horizontal'

    // Igual Roblox: HorizontalAlignment e VerticalAlignment são sempre
    // nomeados de forma fixa, independente da FillDirection. Aqui a
    // gente traduz isso pro par certo de propriedades CSS (que trocam
    // de eixo dependendo da flex-direction).
    return {
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        // Eixo principal (na direção da lista) = justify-content
        justifyContent: isHorizontal
            ? toFlexValue(listLayout.value.horizontalAlign)
            : toFlexValue(listLayout.value.verticalAlign),
        // Eixo cruzado (perpendicular) = align-items
        alignItems: isHorizontal
            ? toFlexValue(listLayout.value.verticalAlign)
            : toFlexValue(listLayout.value.horizontalAlign),
        gap: `${listLayout.value.gap}px`,
    }
})
</script>

<template>
    <div :style="{
        background: backgroundColor,
        borderRadius: borderRadius,
        boxShadow: `inset 0 0 0 ${stroke}px ${strokeColor}`,
        width: widthCss,
        height: heightCss,
        ...positionStyle,
        ...containerStyle,
    }" class="frame-root">
        <slot></slot>
    </div>
</template>

<style scoped>
.frame-root {
    container-type: size;
}
</style>
