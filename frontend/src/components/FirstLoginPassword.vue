<script setup>
import AppModal from './AppModal.vue'
import useFirstLoginPassword from '../composables/useFirstLoginPassword.js'

const { isOpen, novaSenha, confirmarSenha, errorMessage, successMessage, busy, dismiss, savePassword } = useFirstLoginPassword()
</script>

<template>
  <AppModal :open="isOpen" title="Escolha sua nova senha" :busy="busy"
    description="Bem-vindo ao VisionFade! Você entrou com uma senha inicial. Se quiser, escolha uma nova senha para os próximos acessos."
    @close="dismiss">
    <form class="password-form" @submit.prevent="savePassword">
      <label for="first-login-password">Nova senha</label>
      <input id="first-login-password" v-model="novaSenha" type="password" autocomplete="new-password"
        placeholder="Pelo menos 8 caracteres" minlength="8" required :disabled="busy" autofocus />
      <label for="first-login-confirmation">Confirmar nova senha</label>
      <input id="first-login-confirmation" v-model="confirmarSenha" type="password" autocomplete="new-password"
        placeholder="Repita sua nova senha" minlength="8" required :disabled="busy" />
      <p v-if="errorMessage" class="password-error" role="alert">{{ errorMessage }}</p>
      <button type="submit" class="save-password" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar nova senha' }}</button>
      <button type="button" class="skip-password" :disabled="busy" @click="dismiss">Continuar com a senha inicial</button>
    </form>
  </AppModal>
  <p v-if="successMessage" class="password-success" role="status">{{ successMessage }}</p>
</template>

<style scoped>
.password-form { display: flex; flex-direction: column; }
.password-form label { margin-bottom: 7px; font-size: 12px; color: #aabccc; }
.password-form input { width: 100%; margin-bottom: 18px; padding: 13px 15px; border: 1px solid #3a4c60; border-radius: 12px; background: #263241; color: #f0f4f8; font: inherit; font-size: 15px; }
.password-form input::placeholder { color: #7f94a8; }
.save-password { align-self: center; min-width: 200px; padding: 12px 22px; border: 1px solid #7398b2; border-radius: 999px; color: #ecf3fa; background: linear-gradient(90deg, #203b50, #132330); font: inherit; font-size: 14px; cursor: pointer; }
.skip-password { align-self: center; padding: 10px 0 0; border: 0; background: transparent; color: #94aabd; font: inherit; font-size: 12px; cursor: pointer; }
.password-form :disabled { opacity: .55; cursor: wait; }
.password-form :focus-visible { outline: 2px solid #a1e6f5; outline-offset: 3px; }
.password-error { margin: 0 0 16px; color: #edb0b0; font-size: 12px; line-height: 1.5; }
.password-success { position: fixed; z-index: 50; top: 20px; right: 24px; max-width: calc(100vw - 48px); padding: 14px 20px; border: 1px solid #477c70; border-radius: 14px; background: #15352e; color: #c0e3d6; font: 13px Inter, Arial, sans-serif; }
</style>
