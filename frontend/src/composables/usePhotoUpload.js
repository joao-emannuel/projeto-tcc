import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadPhoto } from '../services/photos.js'

export default function usePhotoUpload() {
  const router = useRouter()
  const isUploading = ref(false)
  const errorMessage = ref('')

  async function onFileSelected(file) {
    if (!file || isUploading.value) return

    errorMessage.value = ''
    isUploading.value = true

    try {
      let usuario
      try {
        usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
      } catch {
        throw new Error('Faça login novamente para enviar uma foto.')
      }

      const photo = await uploadPhoto(file, usuario?.id)
      if (!photo?.id) {
        throw new Error('Não foi possível confirmar o salvamento da foto. Tente novamente.')
      }
      await router.push({ name: 'customizar', query: { fotoId: String(photo.id) } })
    } catch (error) {
      errorMessage.value = error.message || 'Não foi possível enviar a foto. Tente novamente.'
    } finally {
      isUploading.value = false
    }
  }

  return { isUploading, errorMessage, onFileSelected }
}
