import { findAllUsers } from '../repositories/usersRepository.js'
import { publicUser } from './sessionService.js'

export async function listUsers() {
  return (await findAllUsers()).map(publicUser)
}
