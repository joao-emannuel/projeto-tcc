<script setup>
import AppLayout from '@/layouts/AppLayout.vue'
import Frame from '@/components/gui-objects/Frame.vue'
import TextLabel from '@/components/gui-objects/TextLabel.vue'
import UIListLayout from '@/components/gui-objects/UIListLayout.vue'
import PhotoUpload from '@/components/PhotoUpload.vue'
import usePhotoUpload from '@/composables/usePhotoUpload.js'

const { isUploading, errorMessage, onFileSelected } = usePhotoUpload()
</script>

<template>
  <AppLayout>
    <Frame class="ScreenFrame" background-color="" width="70" height="86" position-x-scale="50" position-y-scale="50"
      position-x-offset="0" position-y-offset="0">

      <UIListLayout direction="vertical" horizontal-align="center" gap="80" />

      <Frame class="Frame" background-color="linear-gradient(0deg, #10141d, #161b26)" border-radius="30px" width="50"
        height="20" position-x-scale="50" position-y-scale="10" position-x-offset="0" position-y-offset="0">
        <TextLabel class="TextLabel"
          text="Transforme a experiência do cliente com tecnologia de escaneamento facial 3D e inteligência artificial. Nosso sistema analisa o formato do rosto, estilo, simetria e características únicas para criar cortes, barba e visuais totalmente personalizados."
          text-wrapped min-text-size="1" ideal-text-size="3.15" max-text-size="21" text-style="normal"
          text-color="linear-gradient(0deg, #b5b5b5, #d6d6d6)" position-x-scale="50" position-y-scale="50"
          position-x-offset="0" position-y-offset="0" text-font="" />
      </Frame>

      <Frame class="scan-panel" background-color="linear-gradient(0deg, #10141d, #070f17)" width="100" height="50"
        min-height="300" stroke="3" stroke-color="#e8fafa" border-radius="30px">
        <div class="scan-content">
          <div class="scan-copy">
            <Frame background-color="" width="100" height="100" position-x-scale="50" position-y-scale="50">
              <UIListLayout direction="vertical" horizontal-align="start" vertical-align="center" gap="10" />
              <TextLabel text="Fazer o escaneamento facial" min-text-size="19" ideal-text-size="6"
                max-text-size="23" text-wrapped text-align="start" text-color="#d1d1d1" />
              <TextLabel text="Envie uma foto nítida do seu rosto para começarmos." min-text-size="14" ideal-text-size="4.3"
                max-text-size="17" text-wrapped text-align="start" text-color="#808080" />
            </Frame>
          </div>
          <PhotoUpload :loading="isUploading" :error-message="errorMessage" @select="onFileSelected" />
        </div>
      </Frame>
    </Frame>
  </AppLayout>
</template>

<style scoped>
.scan-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px;
  height: 100%;
  padding: 20px 28px;
  box-sizing: border-box;
}

.scan-copy { position: relative; min-width: 0; margin-left: 12%; }

@media (max-width: 800px) {
  .scan-panel { min-height: 480px; }
  .scan-content { grid-template-columns: minmax(0, 1fr); grid-template-rows: 120px 1fr; gap: 16px; }
  .scan-copy { margin-left: 0; }
}
</style>
