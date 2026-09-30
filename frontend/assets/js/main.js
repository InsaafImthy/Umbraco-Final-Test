import { renderError } from './components/render-state.js';
import { initSiteShell } from './components/site-shell.js';
import { initAbout } from './pages/about.js';
import { initCareers } from './pages/careers.js';
import { initContact } from './pages/contact.js';
import { initHome } from './pages/home.js';
import { initInvestorRelations } from './pages/investor-relations.js';
import { initMediaArticle, initMediaListing } from './pages/media.js';
import { initPlaceholder } from './pages/placeholder.js';
import { applyDocumentCulture } from './localization.js';

applyDocumentCulture();

function applySiteNameToTitle(siteName) {
  if (!siteName || document.title.toLowerCase().includes(siteName.toLowerCase())) return;
  document.title = document.title ? `${document.title} | ${siteName}` : siteName;
}

async function bootstrap() {
  const target = document.querySelector('[data-page-content]');
  if (!target) return;

  const shellPromise = initSiteShell();
  const pageName = document.body.dataset.page;
  const initializers = {
    about: initAbout,
    careers: initCareers,
    contact: initContact,
    home: initHome,
    'investor-relations': initInvestorRelations,
    media: initMediaListing,
    'media-article': initMediaArticle,
  };
  const pagePromise = initializers[pageName]
    ? initializers[pageName](target)
    : initPlaceholder(target, pageName);

  const [settings] = await Promise.all([shellPromise, pagePromise]);
  applySiteNameToTitle(settings?.siteName);
}

bootstrap().catch((error) => {
  renderError(document.querySelector('[data-page-content]'), error);
});
