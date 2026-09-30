import { CMS_URL } from '../config.js';
import { getHomePage } from '../api/home-page.js';
import { getSiteSettings } from '../api/site-settings.js';
import { createMilestones } from '../components/milestones.js';
import { initHomeAnimations } from '../animations/home.js';
import { renderError, renderLoading } from '../components/render-state.js';
import { withCurrentCulture } from '../localization.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function absoluteMediaUrl(media) {
  if (!media?.url) return '';
  try {
    return new URL(media.url, CMS_URL).toString();
  } catch {
    return '';
  }
}

function frontendHref(href) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href)) return href;
  const clean = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const route = {
    '/about-us': '/about.html',
    '/careers': '/careers.html',
    '/media': '/media/',
    '/investor-relations': '/investor-relations.html',
    '/contact-us': '/contact.html',
  }[clean] || href;
  return withCurrentCulture(route);
}

function appendRichText(target, markup, className = 'rich-text') {
  if (!markup) return;
  const content = element('div', className);
  content.innerHTML = markup;
  target.append(content);
}

function createCmsLink(linkData, className) {
  if (!linkData?.href) return null;
  const link = element('a', className, linkData.label);
  link.href = frontendHref(linkData.href);
  if (linkData.target) {
    link.target = linkData.target;
    if (linkData.target === '_blank') link.rel = 'noopener noreferrer';
  }
  return link;
}

function createHero(hero) {
  const section = element('section', 'home-hero');
  section.setAttribute('aria-labelledby', 'home-hero-title');

  const media = element('div', 'home-hero__media');
  const videoUrl = absoluteMediaUrl(hero.video);
  const backgroundUrl = absoluteMediaUrl(hero.background);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (backgroundUrl) media.style.backgroundImage = `url("${backgroundUrl}")`;
  if (videoUrl && !reducedMotion) {
    const video = element('video');
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    const source = element('source');
    source.src = videoUrl;
    video.append(source);
    media.append(video);
  }
  section.append(media, element('div', 'home-hero__overlay'));

  const container = element('div', 'container home-hero__container');
  const content = element('div', 'home-hero__content');
  const title = element('h1', '', hero.title);
  title.id = 'home-hero-title';
  content.append(title);
  if (hero.subtitle) content.append(element('p', 'home-hero__summary', hero.subtitle));
  const cta = createCmsLink(hero.cta, 'button button--light');
  if (cta) content.append(cta);
  container.append(content);
  section.append(container);
  return section;
}

function createStrategicStatements(statements) {
  if (!statements.length) return null;
  const section = element('section', 'strategic-section');
  section.setAttribute('aria-label', 'Strategic statements');
  const grid = element('div', 'strategic-grid');

  statements.forEach((item, index) => {
    const card = element('article', 'strategic-card');
    card.setAttribute('data-reveal', '');
    const imageUrl = absoluteMediaUrl(item.image);
    if (imageUrl) {
      const media = element('div', 'strategic-card__media');
      media.style.backgroundImage = `url("${imageUrl}")`;
      card.append(media);
    }
    const content = element('div', 'strategic-card__content');
    content.append(element('span', 'strategic-card__number', String(index + 1).padStart(2, '0')));
    if (item.heading) content.append(element('h2', '', item.heading));
    appendRichText(content, item.description, 'strategic-card__description rich-text');
    card.append(content);
    grid.append(card);
  });
  section.append(grid);
  return section;
}

function createSubsidiaries(subsidiaries) {
  if (!subsidiaries.items.length) return null;
  const section = element('section', 'section subsidiaries');
  section.setAttribute('aria-labelledby', 'subsidiaries-title');
  const container = element('div', 'container');
  const heading = element('div', 'section-heading');
  const title = element('h2', '', subsidiaries.heading);
  title.id = 'subsidiaries-title';
  heading.append(title);

  const grid = element('div', 'subsidiaries-grid');
  subsidiaries.items.forEach((item) => {
    const card = element(item.link?.href ? 'a' : 'article', 'subsidiary-card');
    card.setAttribute('data-reveal', '');
    if (item.link?.href) {
      card.href = frontendHref(item.link.href);
      if (item.link.target) {
        card.target = item.link.target;
        if (item.link.target === '_blank') card.rel = 'noopener noreferrer';
      }
    }

    const logoUrl = absoluteMediaUrl(item.logo);
    const identity = element('div', 'subsidiary-card__identity');
    if (logoUrl) {
      const image = element('img');
      image.src = logoUrl;
      image.alt = item.name;
      image.loading = 'lazy';
      identity.append(image);
    } else if (item.name) {
      identity.append(element('span', 'subsidiary-card__name', item.name));
    }
    card.append(identity);
    if (item.name && logoUrl) card.append(element('h3', '', item.name));
    if (item.description) card.append(element('p', '', item.description));
    if (item.link?.label) card.append(element('span', 'subsidiary-card__link', item.link.label));
    grid.append(card);
  });
  container.append(heading, grid);
  section.append(container);
  return section;
}

function createContactDetails(settings) {
  if (!settings) return null;
  const items = [
    settings.address ? { label: 'Office', value: settings.address } : null,
    settings.telephone ? { label: 'Telephone', value: settings.telephone, href: `tel:${settings.telephone.replace(/\s/g, '')}` } : null,
    settings.email ? { label: 'Email', value: settings.email, href: `mailto:${settings.email}` } : null,
  ].filter(Boolean);
  if (!items.length) return null;

  const contact = element('address', 'closing-contact__details');
  contact.setAttribute('aria-label', 'Contact information');
  items.forEach((item) => {
    const row = element('div', 'closing-contact__detail');
    row.append(element('span', 'closing-contact__label', item.label));
    if (item.href) {
      const link = element('a', '', item.value);
      link.href = item.href;
      row.append(link);
    } else {
      row.append(element('span', '', item.value));
    }
    contact.append(row);
  });
  return contact;
}

function createClosing(closing, settings) {
  if (!closing.heading && !closing.text && !settings) return null;
  const section = element('section', 'closing-contact');
  if (closing.heading) {
    section.setAttribute('aria-labelledby', 'closing-contact-title');
  } else {
    section.setAttribute('aria-label', 'Contact information');
  }
  const mediaUrl = absoluteMediaUrl(closing.media);
  if (mediaUrl) {
    const media = element('div', 'closing-contact__media');
    media.style.backgroundImage = `url("${mediaUrl}")`;
    section.append(media);
  }
  section.append(element('div', 'closing-contact__overlay'));

  const container = element('div', 'container closing-contact__grid');
  const content = element('div', 'closing-contact__content');
  if (closing.heading) {
    const heading = element('h2', '', closing.heading);
    heading.id = 'closing-contact-title';
    content.append(heading);
  }
  appendRichText(content, closing.text, 'closing-contact__text rich-text');
  const contact = createContactDetails(settings);
  container.append(content);
  if (contact) container.append(contact);
  section.append(container);
  return section;
}

export function renderHome(page, siteSettings = null) {
  const fragment = document.createDocumentFragment();
  [
    createHero(page.hero),
    createStrategicStatements(page.strategicStatements),
    createMilestones(page.milestones),
    createSubsidiaries(page.subsidiaries),
    createClosing(page.closing, siteSettings),
  ].filter(Boolean).forEach((section) => fragment.append(section));
  return fragment;
}

export async function initHome(target) {
  renderLoading(target, 'Loading the home page…');

  try {
    const [page, siteSettings] = await Promise.all([
      getHomePage(),
      getSiteSettings().catch(() => null),
    ]);

    document.title = page.metaTitle || page.name;
    const description = document.querySelector('meta[name="description"]');
    if (description && page.metaDescription) description.content = page.metaDescription;

    const home = renderHome(page, siteSettings);
    target.replaceChildren(home);
    try {
      initHomeAnimations(target);
    } catch (animationError) {
      console.error('Home page motion could not be initialized; rendered content remains available.', animationError);
    }
  } catch (error) {
    renderError(target, error, 'The home page is temporarily unavailable.');
  }
}
