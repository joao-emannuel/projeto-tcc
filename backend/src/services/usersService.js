import bcrypt from 'bcrypt'
import { findAllUsers, insertUser } from '../repositories/usersRepository.js'
import { ServiceError } from './serviceError.js'

export async function listUsers() {
  return findAllUsers()
}

export async function createUser({ nome, apelido, telefone, email, senha }) {
  try {
    const senhaHash = await bcrypt.hash(senha, 10)
    return await insertUser({ nome, apelido, telefone, email, senhaHash })
  } catch (err) {
    if (err.code === '23505') {
      throw new ServiceError('Apelido já está em uso.', 409)
    }
    throw err
  }
}
