<template>
    <div class="max-w-7xl mx-auto py-12 px-4 md:px-8">
        <!-- Header -->
        <div class="mb-12 text-center">
            <h1 class="text-4xl md:text-5xl font-serif text-gray-900 mb-4 tracking-tight">
                Curate your <span class="italic text-gray-600">Artworks</span>
            </h1>
            <p class="text-xl text-gray-800 max-w-2xl mx-auto">
                Your exhibition has been outlined. Please select <span class="font-bold">2 to 3 artworks</span> that
                best
                represent the vision for each section.
            </p>
        </div>

        <!-- Exhibition Sections -->
        <div class="space-y-16">
            <div v-for="(section, sectionIndex) in sections" :key="sectionIndex"
                class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">

                <!-- Section Info -->
                <div class="mb-6">
                    <div class="flex items-center gap-3 mb-2">
                        <n-tag type="info" size="large" round class="font-bold">Section {{ sectionIndex + 1 }}</n-tag>
                        <h2 class="text-2xl font-bold text-gray-900">{{ section.title }}</h2>
                    </div>
                    <p class="text-lg text-gray-600 leading-relaxed">{{ section.description }}</p>
                    <div class="mt-2 text-sm font-medium" :class="getSelectionColor(section)">
                        Selected: {{ getSelectedCount(section) }} / 3 (Min: 2)
                    </div>
                </div>

                <!-- Artwork Grid -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div v-for="(img, imgIndex) in section.images" :key="imgIndex"
                        class="relative group cursor-pointer transition-transform hover:scale-[1.02]"
                        @click="toggleSelection(sectionIndex, imgIndex)">

                        <!-- Generated Image -->
                        <div class="relative w-full aspect-square rounded-xl overflow-hidden shadow-sm bg-gray-100">
                            <img :src="img.url" class="w-full h-full object-cover" referrerpolicy="no-referrer"
                                @error="(e) => console.error('Image blocked by browser:', img.url)" />

                            <!-- Selection Overlay -->
                            <div class="absolute inset-0 border-4 transition-all duration-200"
                                :class="img.selected ? 'border-blue-500 bg-blue-500/20' : 'border-transparent hover:border-gray-300'">
                                <div v-if="img.selected"
                                    class="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                            d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Floating Action Bar for Submission -->
        <div class="sticky bottom-8 mt-12 flex justify-center z-50">
            <div class="bg-white p-4 rounded-full shadow-xl border border-gray-200 flex items-center gap-6 px-8">
                <span class="text-lg font-medium text-gray-800">
                    Sections Ready: <span :class="canSubmit ? 'text-green-600' : 'text-orange-500'">{{ readySections }}
                        / {{ sections.length }}</span>
                </span>
                <n-button type="primary" size="large" color="#111827" :disabled="!canSubmit" :loading="isSubmitting"
                    @click="handleSubmitToPostCuration" class="px-8 text-lg font-bold">
                    Curate Selected Artworks
                </n-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { api } from '../helpers/axios'
import { useExhibitionStore } from '../stores/exhibitionStore'

const router = useRouter()
const message = useMessage()
const exhibitionStore = useExhibitionStore()

const sections = ref([])
const isSubmitting = ref(false)

onMounted(() => {
    // If there is no data in the store, redirect back to home
    if (!exhibitionStore.subThemes || exhibitionStore.subThemes.length === 0) {
        message.warning('No exhibition theme found. Please start from the beginning.')
        router.push('/')
        return
    }

    // The data from the store now contains the complete image URLs.
    sections.value = exhibitionStore.subThemes.map(theme => {
        return {
            ...theme,
            images: theme.images.map(imageUrl => ({
                url: String(imageUrl).replace('127.0.0.1', 'localhost').replace(/['"]/g, ''),
                selected: false
            }))
        }
    })
})

// Selection logic for artworks
const toggleSelection = (sectionIndex, imgIndex) => {
    const section = sections.value[sectionIndex]
    const img = section.images[imgIndex]

    const currentSelected = getSelectedCount(section)

    if (img.selected) {
        img.selected = false // Deselect
    } else {
        if (currentSelected >= 3) {
            message.warning('You can only select up to 3 images per section.')
            return
        }
        img.selected = true // Select
    }
}

const getSelectedCount = (section) => {
    return section.images.filter(img => img.selected).length
}

const getSelectionColor = (section) => {
    const count = getSelectedCount(section)
    if (count >= 2 && count <= 3) return 'text-green-600'
    return 'text-orange-500'
}

const readySections = computed(() => {
    return sections.value.filter(s => getSelectedCount(s) >= 2).length
})

const canSubmit = computed(() => {
    return sections.value.length > 0 && readySections.value === sections.value.length
})

const handleSubmitToPostCuration = async () => {
    isSubmitting.value = true
    const loadingMessage = message.loading('AI is visually analyzing your selected artworks. This may take a few minutes...', { duration: 0 })

    // Collect all selected images grouped by section
    const finalSelection = sections.value.map(section => ({
        title: section.title,
        description: section.description,
        image_prompt: section.image_prompt,
        selected_images: section.images.filter(img => img.selected).map(img => img.url)
    }))

    console.log("Sending to Ollama for Post-Curation:", finalSelection)

    // Send the final selection to the backend for the last curation step
    api.post('/curate/post-curation', {
        theme_data: exhibitionStore.themeData,
        selection: finalSelection
    }, { timeout: 300000 }).then(response => { // 5-minute timeout
        loadingMessage.destroy()
        exhibitionStore.setFinalExhibition(response.data.curation)
        message.success('Final curation complete! Entering virtual museum...')
        router.push({ name: 'VirtualMuseum' })
    }).catch(error => {
        loadingMessage.destroy()
        message.error('Failed to get final curation. Please try again.')
        console.error(error)
    }).finally(() => {
        isSubmitting.value = false
    })
}
</script>