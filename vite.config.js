import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

function copyDts() {
  return {
    name: 'copy-dts',
    closeBundle() {
      mkdirSync(resolve(__dirname, 'dist/react'), { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/intl-datepicker.d.ts'),
        resolve(__dirname, 'dist/intl-datepicker.d.ts'),
      );
      copyFileSync(
        resolve(__dirname, 'src/react/index.d.ts'),
        resolve(__dirname, 'dist/react/index.d.ts'),
      );
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: {
        'intl-datepicker': resolve(__dirname, 'src/intl-datepicker.js'),
        'react/index': resolve(__dirname, 'src/react/index.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@internationalized/date', 'react'],
    },
    minify: 'terser',
  },
  plugins: [copyDts()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
