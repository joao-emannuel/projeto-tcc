<script setup>
    const props = defineProps({
        placeholderText: { type: String, default: ''},
        textType: { type: String, default: 'text'},
        backgroundColor: { type: String, default: '#404040' },
        backgroundTransparency: { type: [String, Number], default: 0 },
        textColor: { type: String, default: '#ffffff' },
        textSide: { type: String, default: 'center' },
        textMargin: {type: [String, Number], default: 10},
        textSize: { type: [String, Number], default: 1},
        stroke: { type: [String, Number], default: 0 },
        strokeColor: { type: String, default: '#ffffff' },
        placeholderColor: { type: String, default: '#ffffff' },
        placeholderTextColor: { type: String, default: '#000000' },
        borderRadius: { type: String, default: '10' }, // px
        width : { type: [String, Number], default: 25 }, // % do pai
        height : { type: [String, Number], default: 10 }, // % do pai
        minWidth: { type: [String, Number], default: 0 }, // px — largura nunca menor que isso
        positionXScale: { type: [String, Number], default: 0 }, // %
        positionXOffset: { type: [String, Number], default: 0 }, // px
        positionYScale: { type: [String, Number], default: 0 },
        positionYOffset: { type: [String, Number], default: 0 },
        anchorX: { type: [String, Number], default: 0.5 }, // 0 = esquerda, 0.5 = centro, 1 = direita
        anchorY: { type: [String, Number], default: 0.5 },
        ignoreLayout: { type: Boolean, default: false },
    })

    import { computed, inject } from 'vue'
    const fontWeight = computed(() => props.textStyle === 'bold' ? 'bold' : 'normal')
    const fontStyle = computed(() => props.textStyle === 'italic' ? 'italic' : 'normal')

    const text = defineModel('text', { default: '' })

    // Igual ao TextLabel: se estiver dentro de um Frame com <UIListLayout />,
    // entra em modo fluxo normal (sem position absolute manual).
    const isInsideListLayout = inject('isInsideListLayout', computed(() => false))

    const rootStyle = computed(() => {
        const base = {
            background: `color-mix(in srgb, ${props.backgroundColor} ${100 - props.backgroundTransparency}%, transparent)`,
            color: props.textColor,
            fontSize: props.textSize + 'px',
            textAlign: props.textSide,
            border: 'none',
            boxShadow: `inset 0 0 0 ${props.stroke}px ${props.strokeColor}`,
            fontWeight: fontWeight.value,
            fontStyle: fontStyle.value,
            paddingLeft: props.textMargin + 'px',
            paddingRight: props.textMargin + 'px',
            borderRadius: props.borderRadius + 'px',
            width: `max(${props.minWidth}px, ${props.width}%)`,
            height: props.height + '%',
            '--placeholder-color': props.placeholderColor,
        }

        if (isInsideListLayout.value && !props.ignoreLayout) {
            return {
                ...base,
                flexShrink: 0,
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
    <input
        v-model="text"
        :type="textType"
        :placeholder="placeholderText"
        :style="rootStyle"
        class="textbox-input outline-none"
    />
</template>

<style scoped>
    .textbox-input::placeholder {
        color: var(--placeholder-color);
    }

    .textbox-input {
        transition: filter 0.15s ease, box-shadow 0.15s ease;
    }

    .textbox-input:focus {
        filter: brightness(1.25);
        outline: none;
    }

    .textbox-input:active {
        filter: brightness(1.5);
    }
</style>