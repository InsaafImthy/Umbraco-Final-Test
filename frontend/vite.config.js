import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        home: page('./index.html'),
        about: page('./about.html'),
        careers: page('./careers.html'),
        contact: page('./contact.html'),
        investorRelations: page('./investor-relations.html'),
        media: page('./media/index.html'),
        newsArticle: page('./media/article.html'),
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
});
