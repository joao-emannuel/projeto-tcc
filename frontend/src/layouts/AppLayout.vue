<script setup>
import Logo from '@/components/Logo.vue'
import Sidebar from '@/components/Sidebar.vue'
import Frame from '@/components/gui-objects/Frame.vue'
import TextLabel from '@/components/gui-objects/TextLabel.vue'
</script>

<template>
  <div class="bg-linear-to-b from-[#000000] to-[#1a2332] min-h-screen w-full relative">
    <main class="relative w-full h-screen">
      <Frame class="ScreenFrame" background-color="" width="100" height="100" position-x-scale="50"
        position-y-scale="50" position-x-offset="0" position-y-offset="0">
        <Logo position-x-scale="2" position-y-scale="0" />
        <Sidebar position-x-scale="0.5" position-y-scale="52" />

        <slot />

        <TextLabel class="TextLabel" text="VisionFade ®" min-text-size="1" ideal-text-size="10" max-text-size="15"
          text-style="normal" text-color="#ffffff" text-transparency="90" position-x-scale="50" position-y-scale="95"
          position-x-offset="0" position-y-offset="0" />
      </Frame>
    </main>
  </div>
</template>
