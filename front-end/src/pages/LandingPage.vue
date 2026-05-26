<template>
    <div class="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
        <!-- Hero Section -->
        <div class="text-center max-w-3xl mx-auto mb-12">
            <h1 class="text-5xl md:text-6xl font-normal tracking-tight text-gray-900 mb-6 font-serif">
                Design your <span class="italic text-gray-600">Exhibition</span>
            </h1>
            <p class="text-xl text-gray-800 leading-relaxed max-w-xl mx-auto">
                Enter a core concept, and our AI curatorial system will expand it into a fully realized virtual museum
                experience, complete with distinct sections and generated artworks.
            </p>
        </div>

        <!-- Input Form -->
        <div
            class="w-full max-w-xl bg-white p-8 md:p-10 rounded-2xl shadow-md border border-gray-300 transition-all hover:shadow-lg">
            <n-form ref="formRef" :model="formData" :rules="rules" size="large" @submit="handleCurate">
                <n-form-item label="Exhibition Theme" path="theme">
                    <n-input v-model:value="formData.theme"
                        placeholder="e.g., The isolation of modern cities, Echoes of childhood..." type="textarea"
                        :autosize="{ minRows: 2, maxRows: 4 }" class="bg-gray-50" />
                </n-form-item>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <n-form-item label="Mood / Atmosphere" path="mood">
                        <n-input v-model:value="formData.mood" placeholder="e.g., Melancholic" class="bg-gray-50" />
                    </n-form-item>

                    <n-form-item label="Visual Style" path="style">
                        <n-input v-model:value="formData.style" placeholder="e.g., Cyberpunk" class="bg-gray-50" />
                    </n-form-item>
                </div>

                <n-form-item label="Number of Sections" path="num_sections">
                    <n-input-number v-model:value="formData.num_sections" :min="1" :max="5" class="w-full bg-gray-50" />
                </n-form-item>

                <div class="mt-8 flex justify-end">
                    <n-button attr-type="submit" type="primary" color="#111827" size="large"
                        class="w-full md:w-auto px-10 tracking-wide" :loading="isLoading">
                        Curate Exhibition
                    </n-button>
                </div>
            </n-form>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { api } from '../helpers/axios'
import { useExhibitionStore } from '../stores/exhibitionStore'

const router = useRouter()
const formRef = ref(null)
const isLoading = ref(false)
const message = useMessage()
const exhibitionStore = useExhibitionStore()

const formData = ref({
    theme: '',
    mood: '',
    style: '',
    num_sections: 3
})

const rules = {
    theme: {
        required: true,
        message: 'Please enter a core theme for your exhibition.',
        trigger: 'blur'
    }
}

// Helper function to poll for image completion
const pollImage = (promptId) => {
    return new Promise((resolve, reject) => {
        // Set a timeout for this specific image generation
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`Image generation timed out for prompt_id: ${promptId}`));
        }, 180000); // 3 minute timeout per image

        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/curate/check-image/${promptId}`);
                if (response.data.status === 'completed') {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve(response.data.image_url);
                } else if (response.data.status === 'failed') {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    reject(new Error(`Image generation failed for prompt_id: ${promptId}`));
                }
                // If status is 'pending' or 'running', do nothing and wait for the next interval.
            } catch (error) {
                clearInterval(interval);
                clearTimeout(timeout);
                reject(error);
            }
        }, 3000); // Poll every 3 seconds
    });
};


const handleCurate = (e) => {
    e.preventDefault();
    formRef.value?.validate((errors) => {
        if (!errors) {
            isLoading.value = true;
            message.info('Step 1/2: Expanding theme with AI...');

            // 1. Get sub-themes from Ollama
            api.post('/curate/expand-theme', formData.value)
                .then(async (response) => {
                    const subThemes = response.data.sub_themes;
                    message.loading('Step 2/2: Generating all artworks... This may take a few minutes.');

                    // 2. For each sub-theme, queue 5 image generations and start polling
                    const imageGenerationPromises = [];
                    for (const theme of subThemes) {
                        for (let i = 0; i < 5; i++) {
                            const genPromise = api.post('/curate/generate-image', { prompt: theme.image_prompt })
                                .then(genResponse => pollImage(genResponse.data.prompt_id));
                            imageGenerationPromises.push(genPromise);
                        }
                    }

                    // 3. Wait for all images to be generated and polled
                    const allImageUrls = await Promise.all(imageGenerationPromises);

                    // 4. Assign the completed image URLs back to the sub-themes
                    for (let i = 0; i < subThemes.length; i++) {
                        const startIndex = i * 5;
                        const endIndex = startIndex + 5;
                        subThemes[i].images = allImageUrls.slice(startIndex, endIndex);
                    }

                    // 5. Save the complete data to Pinia and navigate
                    exhibitionStore.setExhibitionData(formData.value, subThemes);
                    message.success('Artwork generation complete! Please make your selections.');
                    router.push({ name: 'ChooseArt' });

                })
                .catch((error) => {
                    console.error('An error occurred during the curation process:', error);
                    message.error('An error occurred. Please check the console and try again.');
                })
                .finally(() => {
                    isLoading.value = false;
                });
        }
    });
};
</script>

<style scoped>
:deep(.n-form-item-label) {
    font-size: 1.125rem !important;
    font-weight: 600 !important;
    color: #1f2937 !important;
}

:deep(.n-input .n-input__input-el),
:deep(.n-input .n-input__textarea-el),
:deep(.n-input-number .n-input__input-el) {
    font-size: 1.125rem !important;
    color: #111827 !important;
}

:deep(.n-button .n-button__content) {
    font-size: 1.125rem !important;
    font-weight: 600 !important;
}
</style>