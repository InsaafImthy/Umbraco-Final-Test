import {
  categorizeInvestorDocuments,
  getInvestorDocuments,
  getInvestorRelationsPage,
} from '../api/investor-relations.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { createInvestorDocument } from '../components/investor-document.js';
import { renderError, renderLoading } from '../components/render-state.js';
import { withCurrentCulture } from '../localization.js';

function element(documentRef, tag, className, text) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function frontendHref(href) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href)) return href;
  const url = new URL(href, window.location.origin);
  const cleanPath = url.pathname.replace(/\/+$/, '') || '/';
  const frontendPath = {
    '/contact-us': '/contact.html',
    '/investor-relations': '/investor-relations.html',
  }[cleanPath] || url.pathname;
  return withCurrentCulture(`${frontendPath}${url.search}${url.hash}`);
}

function createHero(documentRef, page) {
  const hero = element(documentRef, 'header', 'investor-hero');
  const container = element(documentRef, 'div', 'container investor-hero__inner');
  container.append(element(documentRef, 'span', 'investor-hero__eyebrow', 'Investor Relations'));
  container.append(element(documentRef, 'h1', '', page.pageTitle));
  if (page.introduction) {
    const introduction = element(documentRef, 'div', 'investor-hero__introduction rich-text');
    introduction.innerHTML = page.introduction;
    container.append(introduction);
  }
  hero.append(container);
  return hero;
}

function createQuickLinks(documentRef, links) {
  if (!links.length) return null;
  const section = element(documentRef, 'section', 'section investor-quick-links');
  section.setAttribute('aria-labelledby', 'investor-quick-links-title');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'div', 'section-heading section-heading--left');
  heading.append(element(documentRef, 'span', 'eyebrow', 'Explore'));
  const title = element(documentRef, 'h2', '', 'Quick links');
  title.id = 'investor-quick-links-title';
  heading.append(title);
  const grid = element(documentRef, 'div', 'investor-quick-links__grid');

  links.forEach((item) => {
    const href = item.link?.href;
    const card = element(documentRef, href ? 'a' : 'div', 'investor-quick-link');
    card.setAttribute('data-reveal', '');
    if (href) {
      card.href = frontendHref(href);
      if (item.link.target) {
        card.target = item.link.target;
        if (item.link.target === '_blank') card.rel = 'noopener noreferrer';
      }
    }
    card.append(element(documentRef, 'h3', '', item.label || item.link?.label));
    card.append(element(documentRef, 'span', 'investor-quick-link__action', item.link?.label || 'Explore'));
    grid.append(card);
  });

  container.append(heading, grid);
  section.append(container);
  return section;
}

function createKeyFigures(documentRef, keyFigures) {
  if (!keyFigures.heading && !keyFigures.text) return null;
  const section = element(documentRef, 'section', 'investor-key-figures');
  section.setAttribute('aria-labelledby', 'investor-key-figures-title');
  const container = element(documentRef, 'div', 'container investor-key-figures__inner');
  const heading = element(documentRef, 'h2', '', keyFigures.heading || 'Key figures');
  heading.id = 'investor-key-figures-title';
  container.append(heading);
  if (keyFigures.text) container.append(element(documentRef, 'p', '', keyFigures.text));
  section.append(container);
  return section;
}

function createCategoryPanel(documentRef, category, documents, active) {
  const slug = slugify(category);
  const panel = element(documentRef, 'div', 'investor-documents__panel');
  panel.id = slug;
  panel.dataset.investorPanel = slug;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `investor-tab-${slug}`);
  panel.hidden = !active;

  if (!documents.length) {
    const empty = element(documentRef, 'div', 'investor-documents__empty');
    empty.setAttribute('role', 'status');
    empty.append(element(documentRef, 'h3', '', category));
    empty.append(element(documentRef, 'p', '', 'No published documents are available in this category.'));
    panel.append(empty);
    return panel;
  }

  const grid = element(documentRef, 'div', 'investor-documents__grid');
  documents.forEach((document) => grid.append(createInvestorDocument(document, documentRef)));
  panel.append(grid);
  return panel;
}

function createDocuments(documentRef, documents) {
  const categorized = categorizeInvestorDocuments(documents);
  const categories = [...categorized.keys()];
  const section = element(documentRef, 'section', 'section section--soft investor-documents');
  section.setAttribute('aria-labelledby', 'investor-documents-title');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'div', 'section-heading');
  heading.append(element(documentRef, 'span', 'eyebrow', 'Reports and resources'));
  const title = element(documentRef, 'h2', '', 'Investor documents');
  title.id = 'investor-documents-title';
  heading.append(title);

  const tabs = element(documentRef, 'div', 'investor-documents__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Investor document categories');
  categories.forEach((category, index) => {
    const slug = slugify(category);
    const tab = element(documentRef, 'button', 'investor-documents__tab');
    tab.type = 'button';
    tab.id = `investor-tab-${slug}`;
    tab.dataset.investorTab = slug;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', slug);
    tab.setAttribute('aria-selected', String(index === 0));
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.append(element(documentRef, 'span', '', category));
    tab.append(element(documentRef, 'small', '', categorized.get(category).length));
    tabs.append(tab);
  });

  container.append(heading, tabs);
  categories.forEach((category, index) => {
    container.append(createCategoryPanel(documentRef, category, categorized.get(category), index === 0));
  });
  section.append(container);
  return section;
}

export function renderInvestorRelations(page, documents, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  [
    createHero(documentRef, page),
    createQuickLinks(documentRef, page.quickLinks),
    createKeyFigures(documentRef, page.keyFigures),
    createDocuments(documentRef, documents),
  ].filter(Boolean).forEach((section) => fragment.append(section));
  return fragment;
}

export function initInvestorDocumentTabs(root, windowRef = window) {
  const tabs = [...root.querySelectorAll('[data-investor-tab]')];
  if (!tabs.length) return;

  const selectTab = (selected, { focus = false, updateHash = false } = {}) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = root.querySelector(`[data-investor-panel="${tab.dataset.investorTab}"]`);
      if (panel) panel.hidden = !active;
    });
    if (updateHash) windowRef.history.replaceState(null, '', `#${selected.dataset.investorTab}`);
    if (focus) selected.focus();
  };

  const selectFromHash = () => {
    const slug = windowRef.location.hash.replace(/^#/, '');
    const tab = tabs.find((candidate) => candidate.dataset.investorTab === slug);
    if (tab) selectTab(tab);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab, { updateHash: true }));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      selectTab(tabs[nextIndex], { focus: true, updateHash: true });
    });
  });
  windowRef.addEventListener('hashchange', selectFromHash);
  selectFromHash();
}

export async function initInvestorRelations(target) {
  renderLoading(target, 'Loading investor relations…');
  try {
    const [page, documents] = await Promise.all([
      getInvestorRelationsPage(),
      getInvestorDocuments(),
    ]);
    document.title = page.pageTitle || page.name;
    target.replaceChildren(renderInvestorRelations(page, documents));
    initInvestorDocumentTabs(target);
    reveal(target.querySelector('.investor-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error, 'Investor relations content is temporarily unavailable.');
  }
}
