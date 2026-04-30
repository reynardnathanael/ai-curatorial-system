<template>
    <div class="max-w-6xl mx-auto py-16 px-6 md:px-12" v-if="exhibition">

        <!-- Exhibition Header -->
        <div class="text-center mb-20 space-y-8">
            <h1 class="text-5xl md:text-6xl font-serif text-gray-900 tracking-tight leading-tight">
                {{ exhibition.exhibition_title }}
            </h1>
            <div class="w-24 h-1 bg-gray-300 mx-auto rounded-full"></div>
            <p class="text-xl text-gray-800 leading-relaxed max-w-4xl mx-auto font-light text-justify">
                {{ exhibition.introduction }}
            </p>
        </div>

        <!-- Exhibition Sections -->
        <div class="space-y-32">
            <div v-for="(section, idx) in exhibition.sections" :key="idx" class="space-y-10">

                <!-- Section Header -->
                <div class="border-b border-gray-200 pb-6">
                    <h2 class="text-4xl font-serif text-gray-900 mb-4">{{ section.title }}</h2>
                    <p class="text-lg text-gray-600 leading-relaxed">{{ section.description }}</p>
                </div>

                <!-- Artworks Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    <div v-for="(art, artIdx) in section.artworks" :key="artIdx" class="group flex flex-col gap-6">

                        <!-- Artwork Image -->
                        <div
                            class="relative w-full aspect-square overflow-hidden rounded-xl shadow-md bg-gray-100 border border-gray-200">
                            <!-- Using no-referrer to ensure ComfyUI images load properly -->
                            <img :src="art.url" :alt="art.artwork_title"
                                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                referrerpolicy="no-referrer" />
                        </div>

                        <!-- Artwork Details -->
                        <div class="space-y-3">
                            <h3 class="text-2xl font-bold text-gray-900 font-serif">{{ art.artwork_title }}</h3>
                            <p class="text-gray-700 text-base leading-relaxed text-justify">
                                {{ art.artwork_description }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Restart Button -->
        <div class="mt-32 pb-12 text-center border-t border-gray-200 pt-12">
            <n-button size="large" type="primary" color="#111827" class="px-8 text-lg" @click="goHome">
                Curate Another Exhibition
            </n-button>
        </div>
    </div>

    <!-- Loading Fallback -->
    <div v-else class="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
        <n-spin size="large" />
        <p class="text-xl text-gray-600 font-serif">Preparing your gallery walls...</p>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExhibitionStore } from '../stores/exhibitionStore'

const router = useRouter()
const store = useExhibitionStore()

const exhibition = computed(() => store.finalExhibition)

const goHome = () => {
    router.push('/')
}
</script>