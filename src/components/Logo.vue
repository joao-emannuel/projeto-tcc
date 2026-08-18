<!-- aq é a logo, que sera reutilizada em todas as telas, CUIDADO AO MEXER!!! @joao emannuel -->

<script setup>
import ImageLabel from '@/components/gui-objects/ImageLabel.vue';
import logoImg from '../assets/images/logo.png'

defineProps({
    positionXScale: { type: [String, Number], default: 1 },
    positionYScale: { type: [String, Number], default: 1 },
})
</script>

<template>
    <ImageLabel
        :src="logoImg"
        alt="VisionFade"
        object-fit="contain"
        width="7"
        height="7"
        min-width="200"
        :position-x-scale="positionXScale"
        :position-y-scale="positionYScale"
        anchor-x="0"
        anchor-y="0"
    />
</template>