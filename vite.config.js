import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/intl-datepicker.js'),
      formats: ['es'],
      fileName: 'intl-datepicker',
    },
    rollupOptions: {
      external: ['@internationalized/date', 'react'],
    },
    minify: 'terser',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
