export async function register(login, senha) {
  const res = await fetch('http://localhost:3001/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, senha }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
  return data;
}

export async function login(login_, senha) {
  const res = await fetch('http://localhost:3001/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: login_, senha }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
  return data;
}