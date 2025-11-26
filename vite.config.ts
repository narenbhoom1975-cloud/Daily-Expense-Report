import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This is critical: It maps the 'process.env.API_KEY' used in geminiService.ts
      // to the 'VITE_API_KEY' you set in Netlify or your .env file.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  };
});