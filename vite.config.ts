import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // The 50m country outlines are a deliberate lazy-loaded chunk (~240 kB gzipped).
    chunkSizeWarningLimit: 800,
  },
  test: {
    // Tests sit next to the code they cover. The logic under test is plain TypeScript, so no DOM is needed.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
