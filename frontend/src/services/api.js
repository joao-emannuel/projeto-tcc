const apiUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '')

export async function apiRequest(path, {
  body,
  headers,
  fallbackMessage = 'Não foi possível concluir a solicitação.',
  ...options
} = {}) {
  let response
  const isFile = typeof Blob !== 'undefined' && body instanceof Blob

  try {
    response = await fetch(`${apiUrl}/${path.replace(/^\/+/, '')}`, {
      ...options,
      headers: {
        ...(body !== undefined ? {
          'Content-Type': isFile ? body.type || 'application/octet-stream' : 'application/json'
        } : {}),
        ...headers
      },
      ...(body !== undefined ? { body: isFile ? body : JSON.stringify(body) } : {})
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor.')
  }

  let data = null

  if (response.status !== 204) {
    try {
      data = await response.json()
    } catch {
      throw new Error(response.ok ? 'O servidor retornou uma resposta inválida.' : fallbackMessage)
    }
  }

  if (!response.ok) {
    throw new Error(data?.erro || fallbackMessage)
  }

  return data
}
