import { defineStore } from 'pinia';

export const useToastStore = defineStore('toast', {
    state: () => ({
        message: '',
    }),
    actions: {
        setMessage(msg) {
            this.message = msg;
        },
        clearMessage() {
            this.message = '';
        },
    },
});