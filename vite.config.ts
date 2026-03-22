import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(), 
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Saúde Mais - Farmácia Online',
            short_name: 'SaúdeMais',
            description: 'A maior plataforma digital de saúde em Moçambique. Encontre farmácias, compre medicamentos e consulte a nossa IA.',
            theme_color: '#0d9488',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            categories: ['medical', 'health', 'shopping'],
            lang: 'pt-MZ',
            icons: [
              {
                src: 'https://img.icons8.com/fluency/192/health-book.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://img.icons8.com/fluency/512/health-book.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'https://img.icons8.com/fluency/512/health-book.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ],
            screenshots: [
              {
                src: 'https://picsum.photos/seed/saudemais1/1080/1920',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Dashboard de Saúde'
              },
              {
                src: 'https://picsum.photos/seed/saudemais2/1920/1080',
                sizes: '1920x1080',
                type: 'image/png',
                form_factor: 'wide',
                label: 'Marketplace de Medicamentos'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
