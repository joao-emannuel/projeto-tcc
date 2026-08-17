<script setup>
    const props = defineProps({
        direction: { type: String, default: 'vertical' },
        align: { type: String, default: 'start' },
        gap: { type: [String, Number], default: 10 },
    })

    import { inject, watch } from 'vue'

    const registerListLayout = inject('registerListLayout', null)

    if (registerListLayout) {
        watch(
            () => [props.direction, props.align, props.gap],
            () => {
                registerListLayout({
                    direction: props.direction,
                    align: props.align,
                    gap: props.gap,
                })
            },
            { immediate: true }
        )
    }
</script>

<template>
</template>