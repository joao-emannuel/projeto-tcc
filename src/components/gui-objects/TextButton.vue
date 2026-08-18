<script setup>
    const props = defineProps({
        text: { type: String, default: ''},
        textSize: { type: [String, Number], default: 2 }, // px
        textMargin: { type: [String, Number], default: 10 }, // px
        textColor: { type: String, default: '#ffffff' },
        textSide: { type: String, default: 'center' },
        stroke: { type: [String, Number], default: 1 },
        strokeColor: { type: String, default: '#ffffff' },
        backgroundColor: { type: String, default: '#404040' },
        backgroundTransparency: { type: [String, Number], default: 0 }, // 0 = normal, 100 = totalmente escurecido
        glassBlur: { type: [String, Number], default: 0 }, // px — quanto maior, mais forte o efeito vidro
        borderRadius: { type: String, default: '10' }, // px
        textFont: { type: String, default: 'arial' },
        textStyle: { type: String, default: 'normal' },
        width : { type: [String, Number], default: 25 }, // % do pai
        height : { type: [String, Number], default: 10 }, // % do pai
        minWidth: { type: [String, Number], default: 0 }, // px
        positionXScale: { type: [String, Number], default: 0 }, // %
        positionXOffset: { type: [String, Number], default: 0 }, // px
        positionYScale: { type: [String, Number], default: 0 },
        positionYOffset: { type: [String, Number], default: 0 },
        anchorX: { type: [String, Number], default: 0.5 }, // 0 = esquerda, 0.5 = centro, 1 = direita
        anchorY: { type: [String, Number], default: 0.5 },
        ignoreLayout: { type: Boolean, default: false },
        alignSelf: { type: String, default: null }, // 'start' | 'center' | 'end' — sobrescreve o align do UIListLayout pai, só pra este item
        marginTop: { type: [String, Number], default: null }, // px — sobrescreve o gap do UIListLayout, só pra este item
        marginBottom: { type: [String, Number], default: null },
        icon: { type: String, default: null }, // URL/path da imagem do ícone. null = sem ícone
        iconSide: { type: String, default: 'left' }, // 'left' | 'right' — de que lado do texto o ícone fica
        iconSize: { type: [String, Number], default: 16 }, // px — tamanho do ícone (quadrado)
        iconGap: { type: [String, Number], default: 6 }, // px — espaço entre ícone e texto
    })

    import { computed, inject } from 'vue'
    const emit = defineEmits(['click'])

    const fontWeight = computed(() => props.textStyle === 'bold' ? 'bold' : 'normal')
    const fontStyle = computed(() => props.textStyle === 'italic' ? 'italic' : 'normal')

    const isInsideListLayout = inject('isInsideListLayout', computed(() => false))

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

    const backgroundStyle = computed(() => ({
        position: 'absolute',
        inset: 0,
        background: props.backgroundColor,
        backdropFilter: `blur(${props.glassBlur}px)`,
        filter: `brightness(${100 - props.backgroundTransparency}%)`,
        zIndex: 0,
    }))

    // Conteúdo (ícone + texto): fica por cima da camada de fundo, sem filtro
    // nenhum, então nunca escurece junto com o background.
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
        fontSize: props.textSize + 'px',
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
    <button :style="buttonStyle" class="text-button-root" @click="emit('click')">
        <div :style="backgroundStyle"></div>
        <span :style="contentStyle">
            <img v-if="icon" :src="icon" :style="iconStyle" alt="" />
            <span :style="textStyle">{{ text }}</span>
        </span>
    </button>
</template>

<style scoped>
.text-button-root {
    transition: filter 0.15s ease, transform 0.15s ease;
}

.text-button-root:hover { transform: scale(1.03); }

.text-button-root:active {
    filter: brightness(0.9);
    transform: scale(0.98);
}
</style>