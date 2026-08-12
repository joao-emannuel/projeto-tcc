<template>
  <div>
    <input type="file" accept="image/png, image/jpeg" @change="onFileChange" />
    <div v-if="preview">
      <img :src="preview" alt="preview" style="max-width: 200px" />
    </div>
    <button @click="generate" :disabled="loading || !preview">Gerar Modelo 3D a partir da imagem</button>

    <p v-if="loading">Gerando... {{ progress }}%</p>

    <div v-if="modelUrl">
      <p>Modelo pronto!</p>
      <a :href="modelUrl" target="_blank">Baixar arquivo .glb</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { generate3DFromImage, checkImageTask } from '@/services/meshy';

const preview = ref(null);
const loading = ref(false);
const progress = ref(0);
const modelUrl = ref(null);

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('Imagem muito grande. Escolha uma imagem menor que 5MB.');
    return;
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);

    preview.value = canvas.toDataURL('image/jpeg', 0.92);
    URL.revokeObjectURL(objectUrl);
  };

  img.onerror = () => {
    alert('Não foi possível ler essa imagem. Tente outro arquivo.');
    URL.revokeObjectURL(objectUrl);
  };

  img.src = objectUrl;
}

async function generate() {
  if (!preview.value) return;

  loading.value = true;
  modelUrl.value = null;

  const taskId = await generate3DFromImage(preview.value);
  poll(taskId);
}

async function poll(taskId) {
  const task = await checkImageTask(taskId);
  progress.value = task.progress || 0;

  if (task.status === 'success') {
    modelUrl.value = task.output.model_url;
    loading.value = false;
  } else if (['failed', 'cancelled', 'banned'].includes(task.status)) {
    loading.value = false;
    alert('Falha ao gerar o modelo.');
  } else {
    setTimeout(() => poll(taskId), 2000);
  }
}
</script>