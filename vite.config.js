import { defineConfig } from 'vite'

// Delivery Racer only. The pages are in delivery/ (served at /delivery/ by `vite`); the code is src/delivery.
// No Cloudflare plugin, no Worker: this repository is not deployed.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        delivery: 'delivery/index.html', powerups: 'delivery/powerups.html', sides: 'delivery/sides.html',
        police: 'delivery/police.html', editor: 'delivery/editor.html', gimmicks: 'delivery/gimmicks.html',
        cargo: 'delivery/cargo.html',
      },
    },
  },
})
