<template>
    <n-layout class="min-h-screen bg-gray-50 text-gray-900">
        <n-layout-header class="p-4" bordered>
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold tracking-wider">AI Curatorial System</h1>
            </div>
        </n-layout-header>

        <n-layout-content class="container mx-auto p-4 md:p-6">
            <router-view />
        </n-layout-content>

        <n-layout-footer class="text-center p-4 text-sm text-gray-500" bordered>
            <p class="text-lg">&copy; 2026 Reynard. Introduction to Artificial Intelligence & Arts.</p>
        </n-layout-footer>
    </n-layout>
</template>

<script setup>
// This component is the main wrapper for our application.
</script>