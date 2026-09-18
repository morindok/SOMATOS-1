import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];

  // mount /api handlers in dev (self-contained store, no Supabase needed)
  try {
    // @ts-ignore
    const api = await import('./vite-api-dev.js');
    plugins.push(api.somatosApiDev());
  } catch (e) {
    console.warn('[somatos] dev api middleware unavailable:', (e as Error)?.message || e);
  }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    server: {
      watch: {
        // local store writes + logs must never trigger HMR/reload
        ignored: ['**/data/**', '**/dev.log'],
      },
      hmr: {
        overlay: false,
      },
    },
  };
})
