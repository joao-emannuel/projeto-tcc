import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadPhoto } from '../services/photos.js'
import { customizationFlow } from '../services/customizationFlow.js'

export default function usePhotoUpload() {
  const router = useRouter()
  const isUploading = ref(false)
  const errorMessage = ref('')
  let isMounted = true
  onBeforeUnmount(() => { isMounted = false })

  async function onFileSelected(file) {
    if (!file || isUploading.value || !isMounted || router.currentRoute.value.name !== 'home') return

    const originRoute = router.currentRoute.value
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
      if (!isMounted || router.currentRoute.value !== originRoute) return

      const destination = customizationFlow.beginCustomization(photo?.id)
      if (!destination) {
        throw new Error('Não foi possível confirmar o salvamento da foto. Tente novamente.')
      }
      await router.replace(destination)
    } catch (error) {
      errorMessage.value = error.message || 'Não foi possível enviar a foto. Tente novamente.'
    } finally {
      isUploading.value = false
    }
  }

  return { isUploading, errorMessage, onFileSelected }
}
