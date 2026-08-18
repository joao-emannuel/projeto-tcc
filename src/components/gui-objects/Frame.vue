<script setup>
    const props = defineProps({
        backgroundColor: { type: String, default: 'transparent' },
        borderRadius: { type: String, default: '0px' },
        width: { type: [String, Number], default: 100 },  // % do pai
        height: { type: [String, Number], default: 100 }, // % do pai
        minWidth: { type: [String, Number], default: null },  // px — nunca menor que isso
        minHeight: { type: [String, Number], default: null }, // px — nunca menor que isso
        positionXScale: { type: [String, Number], default: 0 },  // %
        positionXOffset: { type: [String, Number], default: 0 }, // px
        positionYScale: { type: [String, Number], default: 0 }, // %
        positionYOffset: { type: [String, Number], default: 0 }, // px
    })

    import { computed, ref, provide } from 'vue'

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
    <div
        :style="{
            backgroundColor: backgroundColor,
            borderRadius: borderRadius,
            width: widthCss,
            height: heightCss,
            position: 'absolute',
            left: `calc(${positionXScale}% + ${positionXOffset}px)`,
            top: `calc(${positionYScale}% + ${positionYOffset}px)`,
            transform: 'translate(-50%, -50%)',
            ...containerStyle,
        }"
        class="frame-root"
    >
        <slot></slot>
    </div>
</template>

<style scoped>
    .frame-root {
        position: relative;
        container-type: size;
    }
</style>