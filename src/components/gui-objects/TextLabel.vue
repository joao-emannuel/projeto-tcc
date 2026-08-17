<script setup>
    const props = defineProps({
        text: { type: String, default: ''},
        minTextSize: { type: [String, Number], default: 12 }, // px — nunca menor que isso
        idealTextSize: { type: [String, Number], default: 2 }, // vw — tamanho que tenta escalar
        maxTextSize: { type: [String, Number], default: 24 }, // px — nunca maior que isso
        textColor: { type: String, default: '#ffffff' },
        textTransparency: { type: [String, Number], default: 0 },
        textFont: { type: String, default: 'arial' },
        textStyle: { type: String, default: 'normal' },
        positionXScale: { type: [String, Number], default: 0 }, // %
        positionXOffset: { type: [String, Number], default: 0 }, // px
        positionYScale: { type: [String, Number], default: 0 },
        positionYOffset: { type: [String, Number], default: 0 },
        anchorX: { type: [String, Number], default: 0.5 }, // 0 = esquerda, 0.5 = centro, 1 = direita
        anchorY: { type: [String, Number], default: 0.5 },
        ignoreLayout: { type: Boolean, default: false },
        marginTop: { type: [String, Number], default: null }, // px — sobrescreve o gap do UIListLayout, só pra este item
        marginBottom: { type: [String, Number], default: null }
    })

    import { computed, inject } from 'vue'
    const fontWeight = computed(() => props.textStyle === 'bold' ? 'bold' : 'normal')
    const fontStyle = computed(() => props.textStyle === 'italic' ? 'italic' : 'normal')

    const isInsideListLayout = inject('isInsideListLayout', computed(() => false))

    const rootStyle = computed(() => {
        const base = {
            fontSize: `clamp(${props.minTextSize}px, ${props.idealTextSize}vw, ${props.maxTextSize}px)`,
            color: `color-mix(in srgb, ${props.textColor} ${100 - props.textTransparency}%, transparent)`,
            fontFamily: props.textFont,
            fontWeight: fontWeight.value,
            fontStyle: fontStyle.value,
            whiteSpace: 'nowrap',
        }

        if (isInsideListLayout.value && !props.ignoreLayout) {
           return {
               ...base,
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
</script>

<template>
    <span :style="rootStyle">{{ text }}</span>
</template>