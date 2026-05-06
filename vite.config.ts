import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Capacitor & Firebase packages are resolved at runtime via the importmap
// in index.html (esm.sh CDN). They are NOT installed as local node_modules
// on Vercel, so we must tell Rollup to leave them untouched (external).
const RUNTIME_EXTERNALS = [
  '@capawesome/capacitor-live-update',
  '@capacitor/core',
  '@capacitor/app',
  '@capacitor/cli',
  '@capacitor/preferences',
  '@codetrix-studio/capacitor-google-auth',
  /^firebase\//,   // matches firebase/app, firebase/auth, firebase/firestore, etc.
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: RUNTIME_EXTERNALS,
    },
  },
});
