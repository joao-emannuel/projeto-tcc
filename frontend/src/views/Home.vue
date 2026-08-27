<script setup>
import { useRouter } from 'vue-router'
import Logo from '../components/Logo.vue'
import Sidebar from '../components/Sidebar.vue'
import Frame from '@/components/gui-objects/Frame.vue';
import TextLabel from '@/components/gui-objects/TextLabel.vue';
import TextButton from '@/components/gui-objects/TextButton.vue';
import ImageLabel from '@/components/gui-objects/ImageLabel.vue';

const router = useRouter()

function onLogoutClick() {
    localStorage.removeItem('usuario')
    router.push('/')
}
</script>

<template>
    <div class="bg-linear-to-b from-[#000000] to-[#1a2332] min-h-screen w-full relative">
        <main class="relative w-full h-screen">
            <Frame class="ScreenFrame" background-color="" width="100" height="100" position-x-scale="50"
                position-y-scale="50" position-x-offset="0" position-y-offset="0">

                <!-- LOGO E SIDEBAR -->
                <Logo position-x-scale="2" position-y-scale="0" />

                <Sidebar position-x-scale="0.5" position-y-scale="52" />

                <Frame class="ScreenFrame" background-color="" width="70" height="86" position-x-scale="50"
                    position-y-scale="50" position-x-offset="0" position-y-offset="0">

                    <Frame class="Frame" background-color="linear-gradient(0deg, #10141d, #161b26)" border-radius="30px"
                        width="50" height="20" position-x-scale="50" position-y-scale="10" position-x-offset="0"
                        position-y-offset="0">

                        <TextLabel class="TextLabel"
                            text="Transforme a experiência do cliente com tecnologia de escaneamento facial 3D e inteligência artificial. Nosso sistema analisa o formato do rosto, estilo, simetria e características únicas para criar cortes, barba e visuais totalmente personalizados."
                            text-wrapped="true" min-text-size="1" ideal-text-size="3.15" max-text-size="21"
                            text-style="normal" text-color="linear-gradient(0deg, #b5b5b5, #d6d6d6)"
                            position-x-scale="50" position-y-scale="50" position-x-offset="0" position-y-offset="0" />
                    </Frame>

                    

                </Frame>

                <!-- RODAPÉ -->
                <TextLabel class="TextLabel" text="VisionFade ®" min-text-size="1" ideal-text-size="10"
                    max-text-size="15" text-style="normal" text-color="#ffffff" text-transparency="90"
                    position-x-scale="50" position-y-scale="95" position-x-offset="0" position-y-offset="0" />

            </Frame>

        </main>
    </div>
</template>

<style scoped></style>