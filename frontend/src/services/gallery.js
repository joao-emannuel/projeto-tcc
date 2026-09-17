import { apiRequest } from './api.js'

export const galleryApi = {
  list: () => apiRequest('/galeria'),
  get: id => apiRequest(`/galeria/${encodeURIComponent(id)}`),
  setFavorite: (id, favorito) => apiRequest(`/galeria/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: { favorito },
  }),
  remove: id => apiRequest(`/galeria/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
