import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

function copyStaticPlugin() {
  return {
    name: 'copy-static',
    closeBundle() {
      copyFileSync(
        resolve(__dirname, 'public/manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      
      try {
        mkdirSync(resolve(__dirname, 'dist/images'), { recursive: true });
        mkdirSync(resolve(__dirname, 'dist/styles'), { recursive: true });
      } catch (e) {
        // folder mungkin sudah ada
      }

      copyFileSync(
        resolve(__dirname, 'keywords/keywords.txt'),
        resolve(__dirname, 'dist/keywords.txt')
      );

      copyFileSync(
        resolve(__dirname, 'src/popup/popup.html'),
        resolve(__dirname, 'dist/popup.html')
      );

      copyFileSync(
        resolve(__dirname, 'src/popup/popup.css'),
        resolve(__dirname, 'dist/popup.css')
      );

      copyFileSync(
        resolve(__dirname, 'src/content/content.css'),
        resolve(__dirname, 'dist/styles/content.css')
      );
    }
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        background: resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js'
      }
    }
  },
  plugins: [copyStaticPlugin()]
});
