import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

function copyDts() {
  return {
    name: 'copy-dts',
    closeBundle() {
      mkdirSync(resolve(__dirname, 'dist/react'), { recursive: true });
      mkdirSync(resolve(__dirname, 'dist/calendars'), { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/intl-datepicker.d.ts'),
        resolve(__dirname, 'dist/intl-datepicker.d.ts'),
      );
      copyFileSync(
        resolve(__dirname, 'src/full.d.ts'),
        resolve(__dirname, 'dist/full.d.ts'),
      );
      copyFileSync(
        resolve(__dirname, 'src/calendars/calendar.d.ts'),
        resolve(__dirname, 'dist/calendars/calendar.d.ts'),
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
        'full': resolve(__dirname, 'src/full.js'),
        'react/index': resolve(__dirname, 'src/react/index.js'),
        'calendars/persian': resolve(__dirname, 'src/calendars/persian.js'),
        'calendars/islamic': resolve(__dirname, 'src/calendars/islamic.js'),
        'calendars/hebrew': resolve(__dirname, 'src/calendars/hebrew.js'),
        'calendars/buddhist': resolve(__dirname, 'src/calendars/buddhist.js'),
        'calendars/japanese': resolve(__dirname, 'src/calendars/japanese.js'),
        'calendars/indian': resolve(__dirname, 'src/calendars/indian.js'),
        'calendars/ethiopic': resolve(__dirname, 'src/calendars/ethiopic.js'),
        'calendars/coptic': resolve(__dirname, 'src/calendars/coptic.js'),
        'calendars/roc': resolve(__dirname, 'src/calendars/roc.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@internationalized/date', 'react'],
    },
    minify: 'esbuild',
  },
  plugins: [copyDts()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test-setup.js'],
  },
});
