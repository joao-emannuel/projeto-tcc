<template>
  <div>
    <h1>Gerador de Modelos 3D</h1>
    <h2>A partir de texto</h2>
    <Tripo3D />
    <hr />
    <h2>A partir de imagem</h2>
    <ImageTo3D />
  </div>
</template>

<script setup>
import Tripo3D from '@/components/Tripo3D.vue';
import ImageTo3D from '@/components/ImageTo3D.vue';
</script>