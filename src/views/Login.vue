<script setup>
import LoginLogic from '../logics/Login.js'
import Logo from '../components/Logo.vue'
import Sidebar from '../components/Sidebar.vue'
import Frame from '@/components/gui-objects/Frame.vue';
import UIListLayout from '@/components/gui-objects/UIListLayout.vue';
import TextLabel from '@/components/gui-objects/TextLabel.vue';
import TextBox from '@/components/gui-objects/TextBox.vue';
import TextButton from '@/components/gui-objects/TextButton.vue';

const { usernameOrEmail, password, errorMessage, onLoginClick, onForgotPasswordClick } = LoginLogic()
</script>

<template>
  <div class="bg-linear-to-b from-[#000000] to-[#1a2332] min-h-screen w-full relative">
    <main class="relative w-full h-screen">
      <Frame class="ScreenFrame"
        background-color=""
        width="100"
        height="100"
        position-x-scale="50"
        position-y-scale="50"
        position-x-offset="0"
        position-y-offset="0"
      >

        <!-- Logo e Sidebar -->
        <Logo
          position-x-scale="2"
          position-y-scale="0"
        />

        <Sidebar
          position-x-scale="6"
          position-y-scale="52"
        />

        <!-- Área decorativa da direita -->
        <Frame class="EnchecaoDeLinguicaFrame"
          background-color=""
          width="50"
          height="100"
          position-x-scale="75"
          position-y-scale="50"
          position-x-offset="0"
          position-y-offset="0"
        >

          <UIListLayout direction="vertical" horizontal-align="center" gap="100" />

        </Frame>

        <!-- Formulário de login -->
        <Frame class="LoginFrame"
          background-color=""
          width="17"
          height="30"
          position-x-scale="22"
          position-y-scale="40"
          position-x-offset="0"
          position-y-offset="0"
        >

          <UIListLayout direction="vertical" horizontal-align="start" gap="30" />

          <TextLabel class="TextLabel"
            text="Faça o seu login"
            min-text-size="15"
            ideal-text-size="20"
            text-style="bold"
            text-color="#ffffff"
          />

          <TextBox class="usernameOrEmailTextBox"
            v-model:text="usernameOrEmail"
            placeholder-text="Usuário ou e-mail"
            placeholder-color="#8a8a8a"
            background-color="#333333"
            text-color="#ffffff"
            text-size="20"
            text-side="left"
            stroke="0"
            min-width="200"
            width="100"
            height="15"
          />

          <TextBox class="passwordTextBox"
            v-model:text="password"
            placeholder-text="Senha"
            placeholder-color="#8a8a8a"
            background-color="#333333"
            text-color="#ffffff"
            text-size="20"
            text-type="password"
            text-side="left"
            stroke="0"
            min-width="200"
            width="100"
            height="15"
          />

          <TextButton class="forgotPasswordButton"
            @click="onForgotPasswordClick"
            text="Esqueci minha senha"
            text-size="15"
            text-style="normal"
            background-color=""
            text-color="#d9d9d9"
            stroke="0"
            border-radius="30"
            min-width="170"
            width="25"
            height="6"
            align-self="end"
            margin-top="-20"
            margin-bottom="-20"
          />

          <TextButton class="confirmarButton"
            @click="onLoginClick"
            text="Fazer Login"
            text-size="20"
            text-style="normal"
            background-color="linear-gradient(90deg, #15222b, #0c141a)"
            background-transparency="0"
            text-color="#d9d9d9"
            stroke="0.75"
            stroke-color="#c2c2c2"
            border-radius="30"
            min-width="200"
            width="40"
            height="17"
          />

          <Transition name="fade">
            <TextLabel class="ErrorTextLabel"
              v-if="errorMessage"
              :text="errorMessage"
              min-text-size="15"
              ideal-text-size="15"
              max-text-size="18"
              text-color="#d65151"
              icon="/src/assets/icons/erro.svg"
              align-self="start"
              icon-side="right"
              icon-size="20"
              icon-gap="5"
            />
          </Transition>

        </Frame>

        <!-- Rodapé -->
        <TextLabel class="TextLabel"
          text="VisionFade ®"
          min-text-size="1"
          ideal-text-size="10"
          max-text-size="15"
          text-style="normal"
          text-color="#ffffff"
          text-transparency="90"
          position-x-scale="50"
          position-y-scale="95"
          position-x-offset="0"
          position-y-offset="0"
        />

      </Frame>

    </main>
  </div>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.4s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>