<!-- aq é a sidebar, que sera reutilizada em todas as telas, CUIDADO AO MEXER!!! @joao emannuel -->

<script setup>
import Frame from '@/components/gui-objects/Frame.vue';
import UIListLayout from '@/components/gui-objects/UIListLayout.vue';
import TextButton from '@/components/gui-objects/TextButton.vue';
import TextLabel from '@/components/gui-objects/TextLabel.vue';
import ImageLabel from '@/components/gui-objects/ImageLabel.vue';
import SidebarLogic from '@/logics/Sidebar.js';

// A Sidebar recebe posição de fora (quem usa <Sidebar/> decide onde ela fica na tela)
defineProps({
    positionXScale: { type: [String, Number], default: 50 },
    positionYScale: { type: [String, Number], default: 50 },
})

const { isOpen, onToggleSidebarClick } = SidebarLogic()

</script>

<template>
    <Frame class="SidebarFrame"
        background-color="#10141d"
        border-radius="30px"
        width="10"
        min-width="150"
        height="90"
        :position-x-scale="positionXScale"
        :position-y-scale="positionYScale"
        anchor-x="0"
        :style="{
            transition: 'transform 0.35s ease',
            transform: isOpen
                ? `translate(0%, -50%)`
                : `translate(-105%, -50%)`,
        }"
    >

    <TextButton class="pullBarButton"
        @click="onToggleSidebarClick"
        text=""
        background-color="#101926"
        border-radius="100"
        min-width="5"
        width="2"
        height="50"
        stroke="0"
        position-x-scale="100"
        position-y-scale="50"
        ignore-layout
    />

        <UIListLayout direction="vertical" horizontal-align="center" vertical-align="start" gap="10" />
        
        <TextButton class="LoginButton"
            text="Faça Login"
            text-size="20"
            text-style="normal"
            background-color=""
            text-color="#d9d9d9"
            stroke="0"
            border-radius="30"
            min-width="170"
            width="25"
            height="6"
            margin-top="20"
            margin-bottom="7"
            icon="/src/assets/icons/pessoa.svg"
            align-self="start"
            icon-side="left"
            icon-size="18"
            icon-gap="8"
        />

        <TextButton class="HomeButton"
            text="Início"
            text-size="18"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
            icon="/src/assets/icons/casa.svg"
            icon-side="left"
            icon-size="18"
            icon-gap="8"
        />

        <TextButton class="GalleryButton"
            text="Galeria"
            text-size="18"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
            icon="/src/assets/icons/paisagem.svg"
            icon-side="left"
            icon-size="18"
            icon-gap="8"
        />

        <TextButton class="SettingsButton"
            text="Configurações"
            text-size="18"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
            icon="/src/assets/icons/configuracoes.svg"
            icon-side="left"
            icon-size="18"
            icon-gap="8"
        />

        <Frame class="SidebarFrame"
            background-color=""
            width="100"
            height="30"
            position-y-scale="85"
            position-x-scale="50"
        >
            <UIListLayout direction="horizontal" horizontal-align="center" vertical-align="center" gap="10" />

            <TextLabel class="TextLabel"
            text="Entre em contato"
            min-text-size="10"
            ideal-text-size="10"
            text-style="bold"
            max-text-size="17"
            text-color="#586973"
            ignore-layout
            position-x-scale="50"
            position-y-scale="35"
            />

            <ImageLabel class="ImageLabel"
                src="/src/assets/icons/instagram.svg"
                height="10"
                width="10"
                min-height="15"
                min-width="15"
            />
            <ImageLabel class="ImageLabel"
                src="/src/assets/icons/twitter.svg"
                height="10"
                width="10"
                min-height="15"
                min-width="15"
            />
            <ImageLabel class="ImageLabel"
                src="/src/assets/icons/whatsapp.svg"
                height="10"
                width="10"
                min-height="15"
                min-width="15"
            />
            <ImageLabel class="ImageLabel"
                src="/src/assets/icons/facebook.svg"
                height="10"
                width="10"
                min-height="15"
                min-width="15"
            />
        </Frame>
    </Frame>
</template>