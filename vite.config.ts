import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // The 50m country outlines are a deliberate lazy-loaded chunk (~240 kB gzipped).
    chunkSizeWarningLimit: 800,
  },
});
