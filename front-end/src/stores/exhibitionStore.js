import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExhibitionStore = defineStore('exhibition', () => {
    const themeData = ref({})
    const subThemes = ref([])
    
    // 1. Add this new ref
    const finalExhibition = ref(null) 

    const setExhibitionData = (initialData, themes) => {
        themeData.value = initialData
        subThemes.value = themes
    }

    // 2. Add this new function
    const setFinalExhibition = (data) => {
        finalExhibition.value = data
    } 

    // 3. Don't forget to return them!
    return { themeData, subThemes, finalExhibition, setExhibitionData, setFinalExhibition }
})
