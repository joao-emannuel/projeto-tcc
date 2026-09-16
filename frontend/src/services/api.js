import { clearSession, getSessionToken } from './session.js'

const apiUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '')

export async function apiRequest(path, {
  body,
  headers,
  fallbackMessage = 'Não foi possível concluir a solicitação.',
  ...options
} = {}) {
  let response
  const isFile = typeof Blob !== 'undefined' && body instanceof Blob
  const sessionToken = getSessionToken()
  const requestHeaders = {
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...(body !== undefined ? {
      'Content-Type': isFile ? body.type || 'application/octet-stream' : 'application/json'
    } : {}),
    ...headers,
  }

  try {
    response = await fetch(`${apiUrl}/${path.replace(/^\/+/, '')}`, {
      ...options,
      headers: requestHeaders,
      ...(body !== undefined ? { body: isFile ? body : JSON.stringify(body) } : {})
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor.')
  }

  let data = null

  if (response.status === 401 && sessionToken && getSessionToken() === sessionToken
    && requestHeaders.Authorization === `Bearer ${sessionToken}`) {
    clearSession()
  }

  if (response.status !== 204) {
    try {
      data = await response.json()
    } catch {
      const error = new Error(response.ok ? 'O servidor retornou uma resposta inválida.' : fallbackMessage)
      error.status = response.status
      throw error
    }
  }

  if (!response.ok) {
    const error = new Error(data?.erro || fallbackMessage)
    error.status = response.status
    throw error
  }

  return data
}
