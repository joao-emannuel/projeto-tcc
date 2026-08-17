<template>
    <model-viewer
        :src="src"
        alt="Modelo 3D Gerado"
        camera-controls
        auto-rotate
        shadow-intesity="1"
        exposure="1"
        style="width: 100%; height: 400px; background: #0f1117; border-radius: 12px;"
    ></model-viewer>
</template>

<script setup>
    defineProps({
        src: {type:String, required: true}
    })
</script>