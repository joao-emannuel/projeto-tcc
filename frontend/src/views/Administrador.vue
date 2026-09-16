<script setup>
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppModal from '@/components/AppModal.vue'
import useSidebar from '@/composables/useSidebar.js'
import useAdminUsers from '@/composables/useAdminUsers.js'

const { isOpen: isSidebarOpen } = useSidebar()
const {
  users, search, statusFilter, roleFilter, filteredUsers, totalActive, totalAdmins, isSelf,
  loading, busy, error, formError, modalError, success, accessDenied, form, pendingRegistration,
  code, resendSeconds, editing, confirmation, loadUsers, createAccount, closeVerification,
  resendCode, verifyCode, openEdit, closeEdit, saveUser, askConfirmation, closeConfirmation, confirmAction,
} = useAdminUsers()

const confirmationTitle = computed(() => {
  if (!confirmation.value) return ''
  if (confirmation.value.type === 'password') return 'Enviar recuperação de senha'
  return confirmation.value.user.ativo ? 'Desativar usuário' : 'Reativar usuário'
})
const expiresLabel = computed(() => {
  const date = new Date(pendingRegistration.value?.expiraEm)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
})
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
</script>

<template>
  <AppLayout>
    <section class="admin-page" :class="{ 'sidebar-open': isSidebarOpen }" aria-labelledby="admin-title">
      <div class="admin-content">
        <header class="page-heading">
          <div>
            <span class="eyebrow">GESTÃO DE ACESSOS</span>
            <h1 id="admin-title">Interface do Administrador</h1>
            <p>Organize os usuários e acompanhe quem faz parte do VisionFade.</p>
          </div>
          <span class="admin-badge"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg> Área administrativa</span>
        </header>

        <p v-if="success" class="feedback success" role="status">{{ success }}</p>
        <div v-if="accessDenied" class="feedback error" role="alert">
          Seu acesso administrativo não está disponível. Entre novamente com uma conta de administrador.
          <RouterLink to="/">Ir para o login</RouterLink>
        </div>

        <div class="admin-grid">
          <section class="admin-card users-card" aria-labelledby="users-title">
            <div class="card-heading">
              <div><h2 id="users-title">Usuários <span class="count-badge">{{ users.length }}</span></h2><p>{{ totalActive }} ativos <span aria-hidden="true">·</span> {{ totalAdmins }} administradores</p></div>
              <button type="button" class="icon-button" :disabled="loading || busy" aria-label="Atualizar lista de usuários" title="Atualizar lista" @click="loadUsers">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 13-1L20 9M4 15l1.5 3a7.5 7.5 0 0 0 13-1" /></svg>
              </button>
            </div>
            <div class="search-field">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
              <input v-model="search" type="search" aria-label="Buscar usuários" placeholder="Buscar nome, apelido ou e-mail" />
            </div>
            <div class="list-filters">
              <select v-model="statusFilter" aria-label="Filtrar usuários por status"><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
              <select v-model="roleFilter" aria-label="Filtrar usuários por perfil"><option value="all">Todos os perfis</option><option value="usuario">Usuários</option><option value="admin">Administradores</option></select>
            </div>
            <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
            <p v-if="loading" class="empty-state" role="status">Carregando usuários…</p>
            <p v-else-if="!filteredUsers.length" class="empty-state">{{ users.length ? 'Nenhum usuário corresponde à sua busca.' : 'Nenhum usuário para exibir.' }}</p>
            <ul v-else class="users-list" aria-label="Lista de usuários">
              <li v-for="user in filteredUsers" :key="user.id" class="user-row" :class="{ inactive: !user.ativo }">
                <div class="user-summary">
                  <span class="user-avatar" aria-hidden="true">{{ initials(user.nome) }}</span>
                  <div class="user-details"><h3>{{ user.nome }} <span v-if="isSelf(user)" class="self-label">Você</span></h3><p>{{ user.apelido }} <span aria-hidden="true">·</span> {{ user.email }}</p></div>
                </div>
                <div class="user-bottom">
                  <div class="user-badges"><span class="status-badge" :class="user.ativo ? 'active' : 'inactive'">{{ user.ativo ? 'Ativo' : 'Inativo' }}</span><span class="role-badge">{{ user.nivel_acesso === 'admin' ? 'Administrador' : 'Usuário' }}</span></div>
                  <div class="user-actions">
                    <button type="button" class="icon-button" :disabled="busy || accessDenied" :aria-label="`Editar ${user.nome}`" title="Editar usuário" @click="openEdit(user)">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l5-1L21 7l-4-4L5 15l-1 5ZM13 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" /></svg>
                    </button>
                    <button type="button" class="icon-button" :disabled="busy || accessDenied || !user.ativo" :aria-label="`Enviar recuperação de senha para ${user.nome}`" title="Enviar recuperação de senha" @click="askConfirmation('password', user)">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="9" r="5" /><path d="m12 13 8 8m-5-5 3-3m0 6 3-3" /></svg>
                    </button>
                    <button type="button" class="icon-button" :class="{ 'deactivate-button': user.ativo }" :disabled="busy || accessDenied || isSelf(user)" :aria-label="`${user.ativo ? 'Desativar' : 'Reativar'} ${user.nome}`" :title="isSelf(user) ? 'Você não pode desativar sua própria conta' : user.ativo ? 'Desativar usuário' : 'Reativar usuário'" @click="askConfirmation('status', user)">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v9M7 5a9 9 0 1 0 10 0" /></svg>
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-if="!loading && filteredUsers.length" class="list-caption">{{ filteredUsers.length }} de {{ users.length }} usuários <span>Editar · recuperar senha · ativar/desativar</span></p>
          </section>

          <section class="admin-card create-card" aria-labelledby="create-title">
            <div class="card-heading"><div><h2 id="create-title">Adicionar novo usuário</h2><p>O cadastro só é concluído após verificar o e-mail.</p></div></div>
            <form class="account-form" @submit.prevent="createAccount">
              <fieldset :disabled="busy || accessDenied">
                <label>Nome completo<input v-model="form.nome" name="nome" autocomplete="off" required maxlength="120" placeholder="Nome do usuário" /></label>
                <div class="field-pair"><label>Apelido<input v-model="form.apelido" name="apelido" autocomplete="off" required maxlength="50" placeholder="Como prefere ser chamado" /></label><label>Telefone<input v-model="form.telefone" name="telefone" type="tel" autocomplete="off" maxlength="25" placeholder="(00) 00000-0000" /></label></div>
                <label>E-mail<input v-model="form.email" name="email" type="email" autocomplete="off" required maxlength="254" placeholder="usuario@exemplo.com" /></label>
                <label>Perfil de acesso<select v-model="form.nivel_acesso" name="perfil"><option value="usuario">Usuário</option><option value="admin">Administrador</option></select></label>
                <p v-if="form.nivel_acesso === 'admin'" class="field-hint">Administradores também podem cadastrar e gerenciar outros usuários.</p>
              </fieldset>
              <div class="verification-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 6 9 7 9-7" /></svg><p>Enviaremos um código para este e-mail. Peça ao usuário somente o código recebido, pelo WhatsApp.</p></div>
              <p v-if="formError" class="feedback error" role="alert">{{ formError }}</p>
              <button type="submit" class="primary-button create-button" :disabled="busy || accessDenied"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{{ busy && !pendingRegistration ? 'Enviando…' : 'Criar conta' }}</button>
            </form>
          </section>
        </div>
        <p class="page-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></svg>Desativar bloqueia o acesso e preserva os dados. O usuário escolhe sua nova senha no primeiro login.</p>
      </div>
    </section>

    <AppModal :open="!!pendingRegistration" title="Código de verificação" description="Confirme o e-mail para concluir a criação da conta." :busy="busy" @close="closeVerification">
      <form id="verify-account-form" class="modal-form" @submit.prevent="verifyCode">
        <p class="modal-copy">Enviamos um código para <strong>{{ pendingRegistration?.email }}</strong>. Peça ao usuário que envie apenas esse código pelo WhatsApp.</p>
        <label for="verification-code">Código de 6 números</label>
        <input id="verification-code" v-model="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="000000" :disabled="busy || accessDenied" />
        <p v-if="expiresLabel" class="field-hint">O código é válido até {{ expiresLabel }}.</p>
        <button type="button" class="text-button" :disabled="busy || resendSeconds > 0 || accessDenied" @click="resendCode">{{ resendSeconds ? `Reenviar código em ${resendSeconds}s` : 'Reenviar código' }}</button>
        <p v-if="modalError" class="feedback error" role="alert">{{ modalError }}</p>
        <p class="field-hint">Ao fechar, a conta continuará sem ser criada. Os dados do formulário serão mantidos.</p>
      </form>
      <template #footer><button type="button" class="secondary-button" :disabled="busy" @click="closeVerification">Cancelar</button><button type="submit" form="verify-account-form" class="primary-button" :disabled="busy || accessDenied">{{ busy ? 'Aguarde…' : 'Verificar e criar conta' }}</button></template>
    </AppModal>

    <AppModal :open="!!editing" title="Editar usuário" description="Atualize os dados e as permissões de acesso." :busy="busy" @close="closeEdit">
      <form v-if="editing" id="edit-account-form" class="modal-form" @submit.prevent="saveUser">
        <fieldset :disabled="busy || accessDenied">
          <label>Nome completo<input v-model="editing.nome" required maxlength="120" autocomplete="off" /></label>
          <div class="field-pair"><label>Apelido<input v-model="editing.apelido" required maxlength="50" autocomplete="off" /></label><label>Telefone<input v-model="editing.telefone" type="tel" maxlength="25" autocomplete="off" /></label></div>
          <label>E-mail<input :value="editing.email" type="email" readonly /></label>
          <p class="field-hint">Este e-mail já foi verificado e não pode ser alterado aqui.</p>
          <label>Perfil de acesso<select v-model="editing.nivel_acesso" :disabled="isSelf(editing)"><option value="usuario">Usuário</option><option value="admin">Administrador</option></select></label>
          <p v-if="isSelf(editing)" class="field-hint">Seu próprio perfil de administrador será mantido.</p>
        </fieldset>
        <p v-if="modalError" class="feedback error" role="alert">{{ modalError }}</p>
      </form>
      <template #footer><button type="button" class="secondary-button" :disabled="busy" @click="closeEdit">Cancelar</button><button type="submit" form="edit-account-form" class="primary-button" :disabled="busy || accessDenied">{{ busy ? 'Salvando…' : 'Salvar alterações' }}</button></template>
    </AppModal>

    <AppModal :open="!!confirmation" :title="confirmationTitle" :busy="busy" @close="closeConfirmation">
      <div v-if="confirmation" class="modal-form">
        <p v-if="confirmation.type === 'password'" class="modal-copy">Enviar um link de recuperação para <strong>{{ confirmation.user.email }}</strong>? O próprio usuário definirá a nova senha.</p>
        <p v-else class="modal-copy"><strong>{{ confirmation.user.nome }}</strong> {{ confirmation.user.ativo ? 'deixará de acessar o VisionFade. Seus dados serão preservados e você poderá reativar a conta depois.' : 'poderá acessar o VisionFade novamente.' }}</p>
        <p v-if="modalError" class="feedback error" role="alert">{{ modalError }}</p>
      </div>
      <template #footer><button type="button" class="secondary-button" :disabled="busy" @click="closeConfirmation">Cancelar</button><button type="button" class="primary-button" :disabled="busy || accessDenied" @click="confirmAction">{{ busy ? 'Aguarde…' : 'Confirmar' }}</button></template>
    </AppModal>
  </AppLayout>
</template>

<style scoped>
.admin-page { position: absolute; inset: max(76px, 10%) clamp(20px, 4vw, 64px) 9%; overflow-y: auto; container-type: inline-size; color: #d9d9d9; font-family: Inter, Arial, sans-serif; scrollbar-width: thin; scrollbar-color: #455764 transparent; }
.admin-page.sidebar-open { left: calc(max(200px, 10vw) + 0.5vw + clamp(24px, 4vw, 64px)); }
.admin-content { max-width: 1120px; margin-inline: auto; padding: 6px 6px 20px; }
svg { width: 18px; height: 18px; flex-shrink: 0; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.page-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; }
.eyebrow { color: #8cb0ca; font-size: 10px; font-weight: 600; letter-spacing: 2px; }
h1 { margin: 8px 0; color: #f0f3f6; font-size: clamp(23px, 2.2vw, 29px); line-height: 1.25; font-weight: 600; letter-spacing: -0.6px; }
.page-heading p { margin: 0; color: #8e9eb0; font-size: 12px; line-height: 1.6; }
.admin-badge { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border: 1px solid #2c3a48; border-radius: 999px; background: #101923; color: #9fb7c9; font-size: 10px; }
.admin-badge svg { width: 15px; height: 15px; }
.admin-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.admin-card { min-width: 0; padding: 22px; border: 1px solid #2b3b4c; border-radius: 22px; background: linear-gradient(135deg, #161e2b, #10141df2); }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
h2 { display: flex; align-items: center; gap: 9px; margin: 0; color: #e4edf5; font-size: 16px; line-height: 1.5; font-weight: 500; }
.card-heading p { margin: 5px 0 0; color: #8196aa; font-size: 11px; line-height: 1.6; }
.count-badge { padding: 1px 7px; border: 1px solid #35516a; border-radius: 7px; background: #223344; color: #b3d5eb; font-size: 11px; }
input, select { box-sizing: border-box; width: 100%; min-width: 0; min-height: 39px; border: 1px solid #334656; border-radius: 10px; padding: 9px 12px; background: #101821; color: #dce7ef; font: inherit; font-size: 12px; line-height: 1.5; color-scheme: dark; }
input::placeholder { color: #718497; }
input[readonly] { color: #8094a6; background: #131b23; }
select { cursor: pointer; }
.search-field { position: relative; }
.search-field svg { position: absolute; left: 12px; top: 12px; width: 15px; height: 15px; color: #849fb4; }
.search-field input { padding-left: 36px; }
.list-filters { display: flex; gap: 10px; margin: 12px 0 6px; }
.list-filters select { min-height: 32px; padding: 6px 8px; font-size: 10px; border-color: #2b3b4a; color: #adbdcc; }
.users-list { max-height: 350px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #455764 transparent; list-style: none; margin: 0; padding: 0; }
.user-row { padding: 15px 0; border-bottom: 1px solid #2a3846; }
.user-row:last-child { border-bottom: 0; }
.user-summary { display: flex; align-items: center; gap: 10px; }
.user-avatar { display: grid; place-items: center; flex-shrink: 0; width: 33px; height: 33px; border: 1px solid #3d5d72; border-radius: 10px; background: linear-gradient(130deg, #274259, #1a2b3b); color: #b7d7ed; font-size: 11px; font-weight: 500; }
.user-details { min-width: 0; }
.user-details h3 { margin: 0; color: #dce5ee; font-size: 12px; font-weight: 500; line-height: 1.6; overflow-wrap: anywhere; }
.user-details p { margin: 2px 0 0; color: #8298ab; font-size: 10px; line-height: 1.6; overflow-wrap: anywhere; }
.self-label { margin-left: 3px; color: #739bb7; font-size: 9px; }
.user-bottom { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 8px 0 0 43px; }
.user-badges, .user-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.status-badge, .role-badge { font-size: 9px; line-height: 1.5; }
.status-badge { border-radius: 5px; padding: 2px 6px; }
.status-badge.active { color: #a2cbbb; background: #23473b80; }
.status-badge.inactive { color: #adacb6; background: #383946; }
.role-badge { color: #839cb3; }
.icon-button { display: inline-grid; place-items: center; flex-shrink: 0; width: 29px; height: 29px; padding: 5px; border: 1px solid #33495b; border-radius: 8px; background: #15222f; color: #9fbcd0; cursor: pointer; transition: background .15s; }
.icon-button svg { width: 14px; height: 14px; }
.icon-button:hover:enabled { background: #2a4054; color: #dcebf5; }
.deactivate-button { color: #c69ba1; }
.empty-state { margin: 0; padding: 45px 10px; color: #8d9daf; text-align: center; font-size: 12px; line-height: 1.7; }
.list-caption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin: 10px 0 0; padding-top: 13px; border-top: 1px solid #293a49; color: #8ba2b6; font-size: 9px; line-height: 1.6; }
.list-caption span { color: #71879b; }
fieldset { display: flex; flex-direction: column; gap: 13px; min-width: 0; border: 0; margin: 0; padding: 0; }
label { display: flex; flex-direction: column; gap: 6px; color: #b6c6d4; font-size: 11px; line-height: 1.5; }
.field-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.field-hint { margin: 0; color: #8197ab; font-size: 11px; line-height: 1.6; }
.verification-note { display: flex; align-items: flex-start; gap: 9px; margin: 18px 0; padding: 11px 12px; border: 1px solid #30495d; border-radius: 12px; background: #182d3e66; }
.verification-note svg { margin-top: 2px; color: #8cb0ca; width: 16px; height: 16px; }
.verification-note p { margin: 0; color: #8ea9bf; font-size: 10px; line-height: 1.7; }
.primary-button, .secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 39px; padding: 9px 19px; border: 1px solid #6388a1; border-radius: 999px; color: #e1edf6; background: linear-gradient(100deg, #25485f, #10212f); font: inherit; font-size: 12px; line-height: 1.5; cursor: pointer; transition: filter .15s; }
.primary-button:hover:enabled { filter: brightness(1.18); }
.create-button { width: 100%; }
.secondary-button { background: transparent; border-color: #415669; color: #a9becf; }
.secondary-button:hover:enabled { background: #1c2a39; }
.text-button { align-self: flex-start; padding: 0; border: 0; background: none; color: #9cc8e5; font: inherit; font-size: 11px; cursor: pointer; }
button:disabled, select:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid #a1e6f5; outline-offset: 3px; }
.feedback { margin: 0 0 16px; padding: 11px 13px; border-radius: 10px; font-size: 12px; line-height: 1.65; overflow-wrap: anywhere; }
.success { border: 1px solid #35594c; color: #afd8c8; background: #162d25; }
.error { border: 1px solid #65454c; color: #e2b0b8; background: #301c2680; }
.feedback a { display: inline-block; margin-left: 6px; color: inherit; text-decoration: underline; }
.page-note { display: flex; align-items: flex-start; gap: 8px; margin: 18px 5px 0; color: #7f94a8; font-size: 11px; line-height: 1.6; }
.page-note svg { width: 15px; height: 15px; margin-top: 1px; }
.modal-form { display: flex; flex-direction: column; gap: 14px; }
.modal-copy { margin: 0; color: #a4b5c5; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.modal-copy strong { color: #d0e1ee; font-weight: 500; }
.modal-form .feedback { margin: 0; }
.modal-form .code-input { min-height: 50px; font-size: 23px; text-align: center; letter-spacing: 8px; background: #293440; }
@container (max-width: 760px) { .admin-grid { grid-template-columns: minmax(0, 1fr); } .users-list { max-height: 310px; } }
@container (max-width: 350px) { .admin-card { padding: 16px; } .field-pair { grid-template-columns: minmax(0, 1fr); } .user-bottom { padding-left: 0; } .list-caption span { display: none; } }
@media (max-width: 460px) { .modal-form .field-pair { grid-template-columns: minmax(0, 1fr); } }
</style>
