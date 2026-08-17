<template>
  <div class="max-w-sm mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-center mb-6">{{ modoCadastro ? 'Cadastro' : 'Login' }}</h1>

    <input v-model="loginInput" placeholder="Login" /><br><br>
    <input v-model="senha" type="password" placeholder="Senha" /><br><br>

    <button @click="enviar">{{ modoCadastro ? 'Cadastrar' : 'Entrar' }}</button>
    <br><br>

    <button @click="modoCadastro = !modoCadastro">
      {{ modoCadastro ? 'Já tenho conta, fazer login' : 'Não tenho conta, cadastrar' }}
    </button>

    <p v-if="mensagem">{{ mensagem }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { register, login as loginApi } from '@/services/auth';

const loginInput = ref('');
const senha = ref('');
const modoCadastro = ref(false);
const mensagem = ref('');

async function enviar() {
  mensagem.value = '';
  try {
    if (modoCadastro.value) {
      await register(loginInput.value, senha.value);
      mensagem.value = 'Cadastro realizado! Agora você pode fazer login.';
      modoCadastro.value = false;
    } else {
      const data = await loginApi(loginInput.value, senha.value);
      mensagem.value = `Bem-vindo(a), ${data.login}!`;
    }
  } catch (err) {
    mensagem.value = err.message;
  }
}
</script>