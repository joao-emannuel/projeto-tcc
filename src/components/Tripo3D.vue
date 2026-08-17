<template>
  <div>
    <input v-model="prompt" placeholder="Descreva a imagem que você quer gerar..." />
    <button @click="generateImage" :disabled="loadingImage">Gerar Imagem</button>
    <p v-if="loadingImage">Gerando imagem... {{ imageProgress }}%</p>

    <div v-if="imageUrl">
      <img :src="imageUrl" alt="Imagem gerada" style="max-width: 300px; border-radius: 12px;" />

      <br><br>
      <button @click="generateModel" :disabled="loadingModel">Gerar Modelo 3D a partir da imagem</button>
      <p v-if="loadingModel">Gerando modelo 3D... {{ modelProgress }}%</p>

      <div v-if="modelUrl">
        <ModelViewer :src="proxiedModelUrl" />
        <a :href="modelUrl" target="_blank">Baixar arquivo .glb</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { generateImage as gerarImagemApi, checkTextImageTask, generate3DFromImage, checkImageTask } from '@/services/meshy';
import ModelViewer from './ModelViewer.vue';

const prompt = ref('');
const loadingImage = ref(false);
const imageProgress = ref(0);
const imageUrl = ref(null);

const loadingModel = ref(false);
const modelProgress = ref(0);
const modelUrl = ref(null);

const proxiedModelUrl = computed(() =>
  modelUrl.value ? `http://localhost:3001/api/proxy-model?url=${encodeURIComponent(modelUrl.value)}` : null
);

async function generateImage() {
  if (!prompt.value.trim()) return;

  loadingImage.value = true;
  imageUrl.value = null;
  modelUrl.value = null;

  const taskId = await gerarImagemApi(prompt.value);
  pollImage(taskId);
}

async function pollImage(taskId) {
  const task = await checkTextImageTask(taskId);
  imageProgress.value = task.progress || 0;

  if (task.status === 'success') {
    imageUrl.value = task.output.image_url;
    loadingImage.value = false;
  } else if (['failed', 'cancelled', 'banned'].includes(task.status)) {
    loadingImage.value = false;
    alert('Falha ao gerar a imagem.');
  } else {
    setTimeout(() => pollImage(taskId), 2000);
  }
}

async function generateModel() {
  if (!imageUrl.value) return;

  loadingModel.value = true;
  modelUrl.value = null;

  const taskId = await generate3DFromImage(imageUrl.value);
  pollModel(taskId);
}

async function pollModel(taskId) {
  const task = await checkImageTask(taskId);
  modelProgress.value = task.progress || 0;

  if (task.status === 'success') {
    modelUrl.value = task.output.model_url;
    loadingModel.value = false;
  } else if (['failed', 'cancelled', 'banned'].includes(task.status)) {
    loadingModel.value = false;
    alert('Falha ao gerar o modelo.');
  } else {
    setTimeout(() => pollModel(taskId), 2000);
  }
}
</script>