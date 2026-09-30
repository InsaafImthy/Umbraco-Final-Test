import { CMS_URL } from '../config.js';
import { getCareersPage } from '../api/careers-page.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { renderError, renderLoading } from '../components/render-state.js';
import { withCurrentCulture } from '../localization.js';

function element(documentRef, tag, className, text) {
  const node = documentRef.createElement(tag);
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
  const [pathAndQuery, hash = ''] = href.split('#', 2);
  const [path, query = ''] = pathAndQuery.split('?', 2);
  const clean = path.replace(/\/+$/, '') || '/';
  const route = {
    '/about-us': '/about.html',
    '/careers': '/careers.html',
    '/media': '/media/',
    '/investor-relations': '/investor-relations.html',
    '/contact-us': '/contact.html',
  }[clean] || path;
  return withCurrentCulture(`${route}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`);
}

function createHero(documentRef, title) {
  const hero = element(documentRef, 'header', 'page-hero careers-hero');
  const container = element(documentRef, 'div', 'container');
  container.append(element(documentRef, 'h1', '', title));
  hero.append(container);
  return hero;
}

export function renderCareers(page, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  fragment.append(createHero(documentRef, page.pageTitle));

  const section = element(documentRef, 'section', 'section careers-content');
  section.setAttribute('aria-labelledby', 'careers-content-title');
  const container = element(documentRef, 'div', 'container careers-content__grid');
  const content = element(documentRef, 'div', 'careers-content__copy');
  content.setAttribute('data-reveal', '');
  content.append(element(documentRef, 'span', 'eyebrow', 'Careers'));
  const heading = element(documentRef, 'h2', '', page.heading || page.pageTitle);
  heading.id = 'careers-content-title';
  content.append(heading);
  if (page.body) {
    const body = element(documentRef, 'div', 'careers-content__body rich-text');
    body.innerHTML = page.body;
    content.append(body);
  }
  if (page.cta?.href && page.cta.label) {
    const cta = element(documentRef, 'a', 'button button--primary careers-content__cta', page.cta.label);
    cta.href = frontendHref(page.cta.href);
    if (page.cta.target) {
      cta.target = page.cta.target;
      if (page.cta.target === '_blank') cta.rel = 'noopener noreferrer';
    }
    content.append(cta);
  }

  const imageUrl = absoluteMediaUrl(page.image);
  if (imageUrl) {
    const figure = element(documentRef, 'figure', 'careers-content__media');
    figure.setAttribute('data-reveal', '');
    const image = element(documentRef, 'img');
    image.src = imageUrl;
    image.alt = page.image?.name || '';
    image.loading = 'lazy';
    figure.append(image);
    container.append(figure);
  }
  container.append(content);
  section.append(container);
  fragment.append(section);
  return fragment;
}

export async function initCareers(target) {
  renderLoading(target, 'Loading careers…');
  try {
    const page = await getCareersPage();
    document.title = page.pageTitle || page.name;
    target.replaceChildren(renderCareers(page));
    reveal(target.querySelector('.careers-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error, 'Careers content is temporarily unavailable.');
  }
}
