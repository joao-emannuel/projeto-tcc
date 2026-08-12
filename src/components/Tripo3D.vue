<template>
  <div>
    <input v-model="prompt" placeholder="Descreva o modelo 3D..." />
    <button @click="generate" :disabled="loading">Gerar Modelo 3D</button>

    <p v-if="loading">Gerando... {{ progress }}%</p>

    <div v-if="modelUrl">
      <p>Modelo pronto!</p>
      <a :href="modelUrl" target="_blank">Baixar arquivo .glb</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { generate3D, checkTask } from '@/services/meshy';

const prompt = ref('');
const loading = ref(false);
const progress = ref(0);
const modelUrl = ref(null);

async function generate() {
  if (!prompt.value.trim()) return;

  loading.value = true;
  modelUrl.value = null;

  const taskId = await generate3D(prompt.value);
  poll(taskId);
}

async function poll(taskId) {
  const task = await checkTask(taskId);
  progress.value = task.progress || 0;

  if (task.status === 'success') {
    modelUrl.value = task.output.model_url;
    loading.value = false;
  } else if (['failed', 'cancelled', 'banned'].includes(task.status)) {
    loading.value = false;
    alert('Falha ao gerar o modelo.');
  } else {
    setTimeout(() => poll(taskId), 2000); // consulta de novo em 2s
  }
}
</script>