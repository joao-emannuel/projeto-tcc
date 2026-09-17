<script setup>
import Frame from '@/components/gui-objects/Frame.vue'
import UIListLayout from '@/components/gui-objects/UIListLayout.vue'
import TextButton from '@/components/gui-objects/TextButton.vue'
import TextLabel from '@/components/gui-objects/TextLabel.vue'
import ImageLabel from '@/components/gui-objects/ImageLabel.vue'
import useSidebar from '@/composables/useSidebar.js'

defineProps({
    positionXScale: { type: [String, Number], default: 50 },
    positionYScale: { type: [String, Number], default: 50 },
})

const {
    isOpen, onToggleSidebarClick, estaLogado, textoBoasVindas, onLogoutClick,
    isHomeActive, isSettingsActive, onHomeClick, onSettingsClick, isGalleryActive, onGalleryClick,
    isAdminActive, isAdministrator, onAdminClick,
} = useSidebar()

</script>

<template>
    <Frame class="SidebarFrame" background-color="#10141d" border-radius="30px" width="10" min-width="200" height="90"
        :position-x-scale="positionXScale" :position-y-scale="positionYScale" anchor-x="0" :style="{
            transition: 'transform 0.35s ease',
            transform: isOpen
                ? `translate(0%, -50%)`
                : `translate(-105%, -50%)`,
        }">

        <TextButton class="pullBarButton" @click="onToggleSidebarClick" text="" background-color="#101926"
            :aria-label="isOpen ? 'Recolher barra lateral' : 'Abrir barra lateral'" :aria-expanded="isOpen"
            border-radius="100" min-width="5" width="2" height="50" stroke="0" position-x-scale="100"
            position-y-scale="50" ignore-layout />

        <UIListLayout direction="vertical" horizontal-align="center" vertical-align="start" gap="10" />

        <TextLabel class="UserLabel" :text="textoBoasVindas" min-text-size="15" ideal-text-size="20" max-text-size="20"
            text-style="normal" text-color="#d9d9d9" icon="/src/assets/icons/pessoa.svg" align-self="start"
            icon-side="left" icon-size="18" icon-gap="8" margin-top="20" margin-bottom="7" />

        <p v-if="isAdministrator" class="administrator-label">Você é administrador</p>

        <TextButton class="HomeButton" text="Início" @click="onHomeClick"
            :aria-current="isHomeActive ? 'page' : undefined" ideal-text-size="20" max-text-size="20"
            border-radius="100" :stroke="isHomeActive ? 1 : 0" stroke-color="#8CB0CA"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            :background-transparency="isHomeActive ? 12 : 40" text-color="#d9d9d9" width="90" height="5"
            icon="/src/assets/icons/casa.svg" icon-side="left" icon-size="18" icon-gap="8" />

        <TextButton class="GalleryButton" text="Galeria" @click="onGalleryClick"
            :aria-current="isGalleryActive ? 'page' : undefined" ideal-text-size="20" max-text-size="20"
            border-radius="100" :stroke="isGalleryActive ? 1 : 0" stroke-color="#8CB0CA"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            :background-transparency="isGalleryActive ? 12 : 40" text-color="#d9d9d9" width="90" height="5"
            icon="/src/assets/icons/paisagem.svg" icon-side="left" icon-size="18" icon-gap="8" />

        <TextButton class="SettingsButton" text="Configurações" @click="onSettingsClick"
            :aria-current="isSettingsActive ? 'page' : undefined" ideal-text-size="20" max-text-size="20"
            border-radius="100" :stroke="isSettingsActive ? 1 : 0" stroke-color="#8CB0CA"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            :background-transparency="isSettingsActive ? 12 : 40" text-color="#d9d9d9" width="90" height="5"
            icon="/src/assets/icons/configuracoes.svg" icon-side="left" icon-size="18" icon-gap="8" />

        <TextButton v-if="isAdministrator" class="AdminButton" :text="'Interface do\nAdministrador'"
            @click="onAdminClick" :aria-current="isAdminActive ? 'page' : undefined" ideal-text-size="20"
            max-text-size="20" min-text-size="20" border-radius="100" :stroke="isAdminActive ? 1 : 0"
            stroke-color="#8CB0CA" background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            :background-transparency="isAdminActive ? 12 : 40" text-color="#d9d9d9" width="90" height="7"
            icon="/src/assets/icons/admin.svg" icon-side="left" icon-size="20" icon-gap="8" text-wrapped="true" />

        <Frame class="SidebarFrame" background-color="" width="100" height="30" position-y-scale="85"
            position-x-scale="50" ignore-layout>
            <UIListLayout direction="horizontal" horizontal-align="center" vertical-align="center" gap="10" />

            <TextLabel class="TextLabel" text="Entre em contato" min-text-size="10" ideal-text-size="10"
                text-style="bold" max-text-size="17" text-color="#586973" ignore-layout position-x-scale="50"
                position-y-scale="35" />

            <ImageLabel class="ImageLabel" src="/src/assets/icons/instagram.svg" height="10" width="10" min-height="15"
                min-width="15" />
            <ImageLabel class="ImageLabel" src="/src/assets/icons/twitter.svg" height="10" width="10" min-height="15"
                min-width="15" />
            <ImageLabel class="ImageLabel" src="/src/assets/icons/whatsapp.svg" height="10" width="10" min-height="15"
                min-width="15" />
            <ImageLabel class="ImageLabel" src="/src/assets/icons/facebook.svg" height="10" width="10" min-height="15"
                min-width="15" />
        </Frame>

        <TextButton v-if="estaLogado" class="LogoutButton" @click="onLogoutClick" text="Sair" ideal-text-size="20"
            max-text-size="20" border-radius="100" stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)" background-transparency="40"
            text-color="#d9d9d9" width="90" height="5" icon="/src/assets/icons/sair.svg" icon-side="left" icon-size="25"
            icon-gap="3" ignore-layout position-x-scale="50" position-y-scale="93" />

    </Frame>
</template>

<style scoped>
.administrator-label {
    margin: -9px 0 4px;
    color: #96aab9;
    font: 12px/1.4 Inter, Arial, sans-serif;
}

.administrator-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 90%;
    min-height: 46px;
    flex-shrink: 0;
    padding: 6px 12px;
    border: 1px solid transparent;
    border-radius: 30px;
    color: #d9d9d9;
    background: linear-gradient(90deg, #8cb0ca99, #45576499);
    cursor: pointer;
    font: 13px/1.2 Inter, Arial, sans-serif;
    text-align: left;
}

.administrator-button svg {
    width: 17px;
    height: 20px;
    flex-shrink: 0;
}

.administrator-button:hover {
    background: linear-gradient(90deg, #8cb0cabb, #455764bb);
}

.administrator-button.is-active {
    border-color: #8cb0ca;
    background: linear-gradient(90deg, #8cb0cae0, #455764e0);
}

.administrator-button:focus-visible {
    outline: 2px solid #8cb0ca;
    outline-offset: 3px;
}
</style>
