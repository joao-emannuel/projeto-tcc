<script setup>
    const props = defineProps({
        direction: { type: String, default: 'vertical' }, // 'vertical' ou 'horizontal' — igual FillDirection do Roblox
        horizontalAlign: { type: String, default: 'start' }, // 'start' | 'center' | 'end' — igual HorizontalAlignment do Roblox (Left/Center/Right)
        verticalAlign: { type: String, default: 'start' },   // 'start' | 'center' | 'end' — igual VerticalAlignment do Roblox (Top/Center/Bottom)
        gap: { type: [String, Number], default: 10 },
    })

    import { inject, watch } from 'vue'

    const registerListLayout = inject('registerListLayout', null)

    if (registerListLayout) {
        // watch garante que qualquer mudança nas props atualize o Frame pai em tempo real.
        watch(
            () => [props.direction, props.horizontalAlign, props.verticalAlign, props.gap],
            () => {
                registerListLayout({
                    direction: props.direction,
                    horizontalAlign: props.horizontalAlign,
                    verticalAlign: props.verticalAlign,
                    gap: props.gap,
                })
            },
            { immediate: true }
        )
    }
</script>

<template>
    
</template>