import { Resend } from 'resend'
import dotenv from 'dotenv'
dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)

const resultado = await resend.emails.send({
  from: 'naoresponda@visionfade.com.br',
  to: 'xetelbinha66@gmail.com', // coloca um e-mail real seu
  subject: 'Teste',
  html: '<p>Isso é um teste.</p>'
})

console.log(resultado)