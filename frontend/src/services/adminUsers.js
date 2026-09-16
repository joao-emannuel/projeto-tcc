import { apiRequest } from './api.js'

export const adminUsersApi = {
  list: () => apiRequest('/admin/usuarios', { fallbackMessage: 'Não foi possível carregar os usuários.' }),
  requestRegistration: body => apiRequest('/admin/cadastros', {
    method: 'POST', body, fallbackMessage: 'Não foi possível enviar o código de verificação.',
  }),
  resendCode: id => apiRequest(`/admin/cadastros/${encodeURIComponent(id)}/reenviar`, {
    method: 'POST', fallbackMessage: 'Não foi possível reenviar o código.',
  }),
  confirmRegistration: (id, codigo) => apiRequest(`/admin/cadastros/${encodeURIComponent(id)}/confirmar`, {
    method: 'POST', body: { codigo }, fallbackMessage: 'Não foi possível confirmar o cadastro.',
  }),
  update: (id, body) => apiRequest(`/admin/usuarios/${id}`, {
    method: 'PATCH', body, fallbackMessage: 'Não foi possível salvar as alterações.',
  }),
  recoverPassword: id => apiRequest(`/admin/usuarios/${id}/recuperar-senha`, {
    method: 'POST', fallbackMessage: 'Não foi possível enviar a recuperação de senha.',
  }),
}
