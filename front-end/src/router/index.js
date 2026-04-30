import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            component: () => import("../layouts/MainLayout.vue"),
            children: [
                {
                    path: "/",
                    component: () => import("../pages/LandingPage.vue"),
                    name: "LandingPage",
                },
                {
                    path: "/choose-artworks",
                    component: () => import("../pages/ChooseArt.vue"),
                    name: "ChooseArt",
                },
                {
                    path: "/virtual-museum",
                    component: () => import("../pages/VirtualMuseum.vue"),
                    name: "VirtualMuseum",
                },
            ],
        },
    ],
});

export default router;