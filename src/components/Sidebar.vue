<!-- aq é a sidebar, que sera reutilizada em todas as telas, CUIDADO AO MEXER!!! @joao emannuel -->

<script setup>
import Frame from '@/components/gui-objects/Frame.vue';
import UIListLayout from '@/components/gui-objects/UIListLayout.vue';
import TextButton from '@/components/gui-objects/TextButton.vue';
import TextLabel from '@/components/gui-objects/TextLabel.vue';

// A Sidebar recebe posição de fora (quem usa <Sidebar/> decide onde ela fica na tela)
defineProps({
    positionXScale: { type: [String, Number], default: 50 },
    positionYScale: { type: [String, Number], default: 50 },
})
</script>

<template>
    <Frame class="SidebarFrame"
        background-color="#10141d"
        border-radius="30px"
        width="10"
        height="90"
        :position-x-scale="positionXScale"
        :position-y-scale="positionYScale"
    >

        <UIListLayout direction="vertical" align="center" gap="10" />
        
        <TextButton class="esqueceuSenhaButton"
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
        />

        <TextButton
            text="Início"
            text-size="15"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
        />

        <TextButton
            text="Galeria"
            text-size="15"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
        />

        <TextButton
            text="Configurações"
            text-size="15"
            border-radius="100"
            stroke="0"
            background-color="linear-gradient(90deg, #8CB0CA, #455764)"
            background-transparency="40"
            text-color="#d9d9d9"
            width="90"
            height="5"
        />

        <TextLabel class="TextLabel"
            text="Entre em contato"
            min-text-size="10"
            ideal-text-size="10"
            max-text-size="17"
            text-color="#586973"
            margin-top="500"
        />

    </Frame>
</template>