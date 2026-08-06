<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/about">About</RouterLink>
    <RouterLink to="/chat">Chat IA</RouterLink>
  </nav>

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