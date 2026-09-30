import { getContentItem } from '../api/umbraco-api.js';
import { normalizeRichText } from '../api/normalizers.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { renderEmpty, renderError, renderLoading } from '../components/render-state.js';

const PAGE_ROUTES = {
  about: '/about-us',
  careers: '/careers',
  contact: '/contact-us',
  media: '/media',
  'investor-relations': '/investor-relations',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function appendRichText(target, value) {
  const { markup } = normalizeRichText(value);
  if (!markup) return false;
  const wrapper = element('div', 'rich-text');
  wrapper.innerHTML = markup;
  target.append(wrapper);
  return true;
}

function routeForPage(pageName) {
  if (pageName !== 'media-article') return PAGE_ROUTES[pageName];
  const params = new URLSearchParams(window.location.search);
  const selector = params.get('id') || params.get('slug');
  return selector ? `/media/${selector}` : null;
}

function createPage(page) {
  const properties = page.properties || {};
  const title = properties.pageTitle || properties.headline || properties.heading || page.name;
  const fragment = document.createDocumentFragment();

  const hero = element('header', 'page-hero');
  const heroContainer = element('div', 'container');
  heroContainer.append(element('h1', '', title));
  hero.append(heroContainer);
  fragment.append(hero);

  const section = element('section', 'section');
  section.setAttribute('data-reveal', '');
  const container = element('div', 'container');
  const content = element('div', 'page-content');
  const richTextFields = [
    properties.introduction,
    properties.introBody,
    properties.body,
    properties.summary,
  ];
  const appended = richTextFields.some((value) => appendRichText(content, value));
  if (!appended && properties.introHeading) content.append(element('h2', '', properties.introHeading));
  container.append(content);
  section.append(container);
  fragment.append(section);
  return fragment;
}

export async function initPlaceholder(target, pageName) {
  const route = routeForPage(pageName);
  if (!route) {
    renderEmpty(target);
    return;
  }

  renderLoading(target);
  try {
    const page = await getContentItem(route, { expand: 'properties[$all]' });
    if (!page) {
      renderEmpty(target);
      return;
    }
    document.title = page.properties?.metaTitle || page.properties?.pageTitle || page.properties?.headline || page.name;
    target.replaceChildren(createPage(page));
    reveal(target.querySelector('.page-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error);
  }
}
