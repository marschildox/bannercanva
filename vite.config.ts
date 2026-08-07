import { defineConfig } from 'vite';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // One vendor chunk is deliberate (see below), so the default 500 kB notice
    // would fire on every build with nothing actionable behind it.
    chunkSizeWarningLimit: 800,
    // No manual chunking.
    //
    // Splitting React and Radix into separate chunks by path produced a
    // production-only crash: the Radix chunk evaluated before React's
    // namespace was initialised, so `React.forwardRef` was undefined and the
    // page rendered blank ("Cannot read properties of undefined (reading
    // 'forwardRef')"). Rollup's own chunking already understands the
    // dependency graph and orders shared modules correctly — the code-split
    // that actually matters here (the export dialog, html2canvas, JSZip, the
    // Anthropic SDK) comes from dynamic imports, not from this config.
  },
});
