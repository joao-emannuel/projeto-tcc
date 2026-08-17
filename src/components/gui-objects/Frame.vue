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

    const listLayout = ref(null) // null = sem list layout, objeto = configurado

    function registerListLayout(config) {
        listLayout.value = config
    }
    provide('registerListLayout', registerListLayout)

    provide('isInsideListLayout', computed(() => listLayout.value !== null))

    const containerStyle = computed(() => {
        if (!listLayout.value) return {}

        return {
            display: 'flex',
            flexDirection: listLayout.value.direction === 'horizontal' ? 'row' : 'column',
            alignItems:
                listLayout.value.align === 'center' ? 'center' :
                listLayout.value.align === 'end' ? 'flex-end' : 'flex-start',
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