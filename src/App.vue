<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="sticky top-0 z-10 bg-[#1a1d27]/90 backdrop-blur border-b border-[#2a2e38]">
    <nav class="max-w-5xl mx-auto flex items-center justify-center gap-2 px-4 py-4">
      <RouterLink to="/" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition" active-class="!text-emerald-400 !bg-emerald-400/10">Home</RouterLink>
      <RouterLink to="/about" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition" active-class="!text-emerald-400 !bg-emerald-400/10">About</RouterLink>
      <RouterLink to="/chat" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition" active-class="!text-emerald-400 !bg-emerald-400/10">Chat IA</RouterLink>
      <RouterLink to="/gerar-3d" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition" active-class="!text-emerald-400 !bg-emerald-400/10">Gerar 3D</RouterLink>
    </nav>
  </header>
  <RouterView />
</template>

<style scoped>
nav {
  padding: 1rem;
  text-align: center;
}
nav a {
  margin: 0 1rem;
}
</style>