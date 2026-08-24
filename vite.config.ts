/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
