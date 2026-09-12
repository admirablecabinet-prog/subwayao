import { defineConfig } from 'vite';

// Static funnel + game site. index.html is the funnel; the game lives in public/
// (game.html, game.css, game.js, js/, assets/). Vite serves and copies them as-is.
export default defineConfig({
  server: {
    allowedHosts: ['.e2b.app'],
  },
});
