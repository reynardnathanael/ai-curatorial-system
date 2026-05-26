<template>
    <div class="fixed inset-0 z-40 w-full h-full bg-[#2E1423] overflow-hidden font-sans">
        <!-- Kaboom Game Canvas -->
        <canvas ref="gameCanvas" class="w-full h-full block focus:outline-none" tabindex="0"></canvas>

        <!-- Exit Button -->
        <button @click="exitMuseum"
            class="absolute top-6 left-6 bg-black/60 hover:bg-black/80 text-white border border-white/10 px-5 py-2.5 rounded-full z-10 shadow-lg transition-all flex items-center gap-2 text-sm font-medium tracking-wide">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Exit Exhibition
        </button>

        <!-- Instructions Overlay -->
        <div
            class="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-full pointer-events-none z-10 shadow-lg border border-white/10">
            <p class="text-sm font-medium tracking-wide">Use Arrow Keys to Move &bull; Walk UP to an Art Desk to
                interact</p>
        </div>

        <!-- Artwork Display Modal -->
        <div v-if="showModal"
            class="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4 md:p-8 backdrop-blur-sm transition-opacity"
            @click.self="closeModal">

            <!-- Main Section Modal -->
            <div
                class="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8 md:p-12 shadow-2xl relative border border-gray-200">
                <!-- Close Button -->
                <button @click="closeModal"
                    class="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <!-- Section Info -->
                <div class="mb-10 text-center">
                    <h2 class="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-6 tracking-wide">{{
                        activeSection?.title || 'Exhibition Section' }}</h2>
                    <div class="h-px w-32 bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-6">
                    </div>
                    <p class="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto font-light">{{
                        activeSection?.description || 'Explore the curated artworks for this theme.' }}</p>
                </div>

                <!-- Selected Artworks Grid -->
                <div class="flex flex-wrap justify-center gap-8 mb-10">
                    <div v-for="(art, idx) in displayArtworks" :key="idx" @click="openArtDetailModal(art)"
                        class="group relative w-56 aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-gray-100 border border-gray-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer">
                        <img :src="art.url"
                            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerpolicy="no-referrer" />
                        <div
                            class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p class="text-white font-bold text-lg">View Details</p>
                        </div>
                    </div>
                </div>

                <div class="text-center">
                    <button @click="closeModal"
                        class="bg-gray-900 text-white px-10 py-3 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-700 transition-transform hover:scale-105">
                        Resume Exploring
                    </button>
                </div>

                <!-- Artwork Detail Modal (Nested) -->
                <div v-if="showArtDetailModal"
                    class="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 rounded-2xl"
                    @click.self="closeArtDetailModal">

                    <div
                        class="max-w-5xl w-full bg-white rounded-lg shadow-2xl flex flex-col md:flex-row gap-8 p-8 border border-gray-300 max-h-[85vh]">
                        <!-- Large Image -->
                        <div class="w-full md:w-1/2 flex-shrink-0">
                            <img :src="activeArtwork.url"
                                class="rounded-lg shadow-lg w-full h-auto object-contain max-h-[75vh]"
                                referrerpolicy="no-referrer" />
                        </div>
                        <!-- Artwork Curation -->
                        <div class="w-full md:w-1/2 flex flex-col">
                            <h3 class="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4">{{
                                activeArtwork.artwork_title }}</h3>
                            <div class="h-px bg-gray-200 mb-4"></div>
                            <div class="flex-grow overflow-y-auto pr-4">
                                <p class="text-gray-600 leading-relaxed text-base">{{ activeArtwork.artwork_description
                                    }}</p>
                            </div>
                            <div class="mt-auto pt-6 text-right">
                                <button @click="closeArtDetailModal"
                                    class="bg-gray-800 text-white px-8 py-2 rounded-full font-semibold text-sm hover:bg-gray-600 transition-colors">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useExhibitionStore } from '../stores/exhibitionStore'

// Import the game logic file directly into Vue
import { startExhibition } from '../game/exhibitionLevel'

const router = useRouter()
const message = useMessage()
const store = useExhibitionStore()

const gameCanvas = ref(null)
const showModal = ref(false)
const activeSectionId = ref(null)
const showArtDetailModal = ref(false)
const activeArtwork = ref(null)
let gameInstance = null

// Read the exact sections array safely from Pinia
const exhibitionSections = computed(() => {
    const data = store.finalExhibition
    if (!data) return []
    return data.sections || data
})

const activeSection = computed(() => {
    if (!activeSectionId.value) return null
    return exhibitionSections.value[activeSectionId.value - 1]
})

const displayArtworks = computed(() => {
    if (!activeSection.value) return [];
    // The final curated data has a `sections` array, and each section has an `artworks` array.
    if (activeSection.value.artworks) {
        return activeSection.value.artworks;
    }
    // Fallback for older data structures that might just have image URLs
    const imageUrls = activeSection.value.selected_images || activeSection.value.images || [];
    return imageUrls.map(url => ({
        url: url,
        artwork_title: 'Artwork',
        artwork_description: 'No detailed curation available for this artwork.'
    }));
});

onMounted(() => {
    if (exhibitionSections.value.length === 0) {
        message.warning('No curated exhibition found! Please generate an exhibition first.')
        router.push('/')
        return
    }

    // Start Kaboom and attach it securely to the template's <canvas>
    gameInstance = startExhibition(gameCanvas.value, exhibitionSections.value.length, (sectionId) => {
        activeSectionId.value = sectionId
        showModal.value = true
        if (gameInstance) gameInstance.pause();
    })

    gameCanvas.value.focus() // Fix for immediate keyboard input
})

onUnmounted(() => {
    // Clean up the Kaboom instance when the component is destroyed
    if (gameInstance) {
        gameInstance.destroy();
        gameInstance = null;
    }
})

const openArtDetailModal = (artwork) => {
    activeArtwork.value = artwork;
    showArtDetailModal.value = true;
}

const closeArtDetailModal = () => {
    showArtDetailModal.value = false;
    activeArtwork.value = null;
}

const closeModal = () => {
    showModal.value = false
    activeSectionId.value = null
    closeArtDetailModal(); // Also close the detail modal if it's open
    if (gameInstance) {
        gameInstance.resume()
        gameCanvas.value.focus()
    }
}

const exitMuseum = () => {
    router.push('/')
}
</script>