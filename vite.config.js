import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';
import { minify } from 'terser';

function copyDts() {
  return {
    name: 'copy-dts',
    closeBundle() {
      mkdirSync(resolve(__dirname, 'dist/react'), { recursive: true });
      mkdirSync(resolve(__dirname, 'dist/calendars'), { recursive: true });
      mkdirSync(resolve(__dirname, 'dist/labels'), { recursive: true });
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
        resolve(__dirname, 'src/labels/labels.d.ts'),
        resolve(__dirname, 'dist/labels/labels.d.ts'),
      );
      copyFileSync(
        resolve(__dirname, 'src/react/index.d.ts'),
        resolve(__dirname, 'dist/react/index.d.ts'),
      );
    },
  };
}

/**
 * Vite's built-in terser plugin skips library ES output
 * (chunks/dep-*.js: `if (config.build.lib && outputOptions.format === "es") return null`).
 * We want terser anyway so its property mangler can rewrite every `_*` private
 * field/method across the bundle — something the consumer's bundler can't easily do.
 */
function terserPlugin(terserOptions) {
  return {
    name: 'terser-lib-es',
    apply: 'build',
    async generateBundle(_, bundle) {
      const chunks = Object.values(bundle).filter(
        (c) => c.type === 'chunk' && c.fileName.endsWith('.js'),
      );
      await Promise.all(
        chunks.map(async (chunk) => {
          const result = await minify(chunk.code, {
            ...terserOptions,
            module: true,
            sourceMap: false,
          });
          if (result.code) chunk.code = result.code;
        }),
      );
    },
  };
}

export default defineConfig({
  build: {
    // Keep class fields native so terser's property mangler sees them as
    // real property accesses; otherwise esbuild lowers them to
    // `__publicField(this, "_state", ...)` and the string-keyed setter is
    // opaque to mangle.properties.
    target: 'es2022',
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
        'labels/fa': resolve(__dirname, 'src/labels/fa.js'),
        'labels/ar': resolve(__dirname, 'src/labels/ar.js'),
        'labels/he': resolve(__dirname, 'src/labels/he.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@internationalized/date', 'react'],
    },
    minify: false,
  },
  plugins: [
    copyDts(),
    terserPlugin({
      // All `_*` identifiers are private internal class fields/methods —
      // none leak into events, the IntlDatepicker public API, React props,
      // or computed property access (verified by audit before enabling).
      mangle: { properties: { regex: /^_/ } },
      compress: { passes: 2 },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test-setup.js'],
  },
});
