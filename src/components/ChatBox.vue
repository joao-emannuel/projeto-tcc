<template>
  <h1>PAGINA NÃO DISPONIVEL NO MOMENTO</h1>
</template>

<script setup>
import { ref } from 'vue';
import { sendMessage } from '@/services/ai';

const input = ref('');
const history = ref([]);
const loading = ref(false);

async function send() {
  if (!input.value.trim()) return;

  history.value.push({ role: 'user', content: input.value });
  loading.value = true;

  try {
    const reply = await sendMessage(history.value);
    history.value.push({ role: 'assistant', content: reply });
  } catch (e) {
    history.value.push({ role: 'assistant', content: 'Erro ao obter resposta.' });
  } finally {
    input.value = '';
    loading.value = false;
  }
}
</script>

<style scoped>
.chat-box { max-width: 500px; margin: 0 auto; }
.messages { min-height: 200px; margin-bottom: 1rem; }
.input-area { display: flex; gap: 0.5rem; }
input { flex: 1; padding: 0.5rem; }
</style>