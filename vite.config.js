import { defineConfig } from 'vite';
import solidStyled from 'vite-plugin-solid-styled';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solidPlugin(),
    solidStyled({
      prefix: 'my-prefix', // optional
      filter: {
        include: 'src/**/*.{js,tsx,jsx}',
        exclude: 'node_modules/**/*.{js,tsx,jsx}',
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 3001,
    allowedHosts: ['sb-57uldkezu6za.vercel.run'],
    proxy: {
      '/auth': 'http://127.0.0.1:3000',
      '/user': 'http://127.0.0.1:3000',
      '/rain': 'http://127.0.0.1:3000',
      '/announcements': 'http://127.0.0.1:3000',
      '/items': 'http://127.0.0.1:3000',
      '/trading': 'http://127.0.0.1:3000',
      '/leaderboard': 'http://127.0.0.1:3000',
      '/cases': {
        target: 'http://127.0.0.1:3000',
        bypass: (req) => {
          // Let browser navigations fall through to Vite's SPA fallback
          const accept = req.headers['accept'] || ''
          if (accept.includes('text/html')) return req.url
        }
      },
      '/battles': {
        target: 'http://127.0.0.1:3000',
        bypass: (req) => {
          const accept = req.headers['accept'] || ''
          if (accept.includes('text/html')) return req.url
        }
      },
      '/roulette': {
        target: 'http://127.0.0.1:3000',
        bypass: (req) => {
          const accept = req.headers['accept'] || ''
          if (accept.includes('text/html')) return req.url
        }
      },
      '/crash': 'http://127.0.0.1:3000',
      '/coinflip': 'http://127.0.0.1:3000',
      '/jackpot': 'http://127.0.0.1:3000',
      '/slots': 'http://127.0.0.1:3000',
      '/mines': 'http://127.0.0.1:3000',
      '/slides': 'http://127.0.0.1:3000',
      '/admin': {
        target: 'http://127.0.0.1:3000',
        bypass: (req) => {
          const accept = req.headers['accept'] || ''
          if (accept.includes('text/html')) return req.url
        }
      },
      '/surveys': 'http://127.0.0.1:3000',
      '/fairness': 'http://127.0.0.1:3000',
    }
  },
  build: {
    target: 'esnext'
  },
});
