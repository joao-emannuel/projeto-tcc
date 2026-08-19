import { ref } from 'vue'

const isOpen = ref(true)

export default function SidebarLogic() {
  function onToggleSidebarClick() {
    isOpen.value = !isOpen.value
    console.log('Sidebar aberta?', isOpen.value)
  }

  return { isOpen, onToggleSidebarClick }
}