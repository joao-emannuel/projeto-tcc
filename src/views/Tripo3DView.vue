<template>
 <div class="max-w-3xl mx-auto px-4 py-10">
    <h1 class="text-3xl font-bold text-center mb-2">Gerador de Modelos 3D</h1>
    <p class="text-center text-gray-400 mb-10">Crie modelos 3D a partir de texto ou de uma imagem</p>

    <section class="bg-[#1a1d27] border border-[#2a2e38] rounded-2xl p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 text-emerald-400">A partir de texto</h2>
      <Tripo3D />
    </section>

    <section class="bg-[#1a1d27] border border-[#2a2e38] rounded-2xl p-6">
      <h2 class="text-lg font-semibold mb-4 text-emerald-400">A partir de imagem</h2>
      <ImageTo3D />
    </section>
  </div>
</template>

<script setup>
import Tripo3D from '@/components/Tripo3D.vue';
import ImageTo3D from '@/components/ImageTo3D.vue';
</script>