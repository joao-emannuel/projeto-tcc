import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { haircutFilters, haircuts } from '../data/haircuts.js'
import { customizationFlow } from '../services/customizationFlow.js'
import usePreferences from './usePreferences.js'

export default function useCustomization() {
  const route = useRoute()
  const router = useRouter()
  const { preferences, getLastCut, saveLastCut } = usePreferences()
  const activeFilter = ref(preferences.defaultCutFilter)
  const selectedCutId = ref(getLastCut())
  const filteredCuts = computed(() => activeFilter.value === 'all'
    ? haircuts
    : haircuts.filter(cut => cut.category === activeFilter.value))
  const selectedCut = computed(() => haircuts.find(cut => cut.id === selectedCutId.value) || null)

  watch(selectedCutId, id => saveLastCut(id))

  function generateResult() {
    if (!selectedCut.value) return

    const destination = customizationFlow.beginResult(route, selectedCut.value.id)
    if (destination) return router.replace(destination)
  }

  return {
    filters: haircutFilters,
    activeFilter,
    filteredCuts,
    selectedCutId,
    selectedCut,
    generateResult,
  }
}
