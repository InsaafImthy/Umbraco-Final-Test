import { CMS_URL } from '../config.js';
import {
  getMediaListingPage,
  getNewsArticle,
  getNewsArticles,
  NewsArticleNotFoundError,
} from '../api/media-page.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { renderEmpty, renderError, renderLoading } from '../components/render-state.js';
import { getCurrentCulture, withCurrentCulture } from '../localization.js';

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

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function formatPublicationDate(value, locale = 'en-GB') {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

export function articleHref(article) {
  const params = new URLSearchParams();
  if (article.route) params.set('path', article.route);
  else if (article.id) params.set('id', article.id);
  params.set('culture', getCurrentCulture());
  return params.size ? `/media/article.html?${params.toString()}` : '';
}

export function articleSelectorFromLocation(locationRef = window.location) {
  const params = new URLSearchParams(locationRef.search || '');
  const path = params.get('path');
  const id = params.get('id') || params.get('key');
  const slug = params.get('slug');
  if (path) return path;
  if (id) return id;
  if (slug) return `/media/${slug.replace(/^\/+|\/+$/g, '')}`;
  return '';
}

function createPageHero(documentRef, title, introduction = '') {
  const hero = element(documentRef, 'header', 'page-hero media-hero');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'h1', '', title);
  container.append(heading);
  if (introduction) container.append(element(documentRef, 'p', 'media-hero__intro', introduction));
  hero.append(container);
  return hero;
}

function createCardImage(documentRef, article) {
  const media = element(documentRef, 'div', 'news-card__media');
  const imageUrl = absoluteMediaUrl(article.featuredImage);
  if (imageUrl) {
    const image = element(documentRef, 'img');
    image.src = imageUrl;
    image.alt = article.featuredImage?.name || '';
    image.loading = 'lazy';
    media.append(image);
  } else {
    const fallback = element(documentRef, 'span', 'news-card__media-fallback', 'News');
    fallback.setAttribute('aria-hidden', 'true');
    media.append(fallback);
  }
  return media;
}

function appendArticleMeta(documentRef, target, article, className) {
  const dateLabel = formatPublicationDate(article.publicationDate);
  if (!article.category && !dateLabel) return;
  const meta = element(documentRef, 'div', className);
  if (article.category) meta.append(element(documentRef, 'span', `${className}-category`, article.category));
  if (dateLabel) {
    const date = element(documentRef, 'time', `${className}-date`, dateLabel);
    date.dateTime = article.publicationDate;
    meta.append(date);
  }
  target.append(meta);
}

function createNewsCard(documentRef, article) {
  const card = element(documentRef, 'article', 'news-card');
  card.setAttribute('data-reveal', '');
  const href = articleHref(article);
  const mediaLink = element(documentRef, href ? 'a' : 'div', 'news-card__media-link');
  if (href) mediaLink.href = href;
  mediaLink.append(createCardImage(documentRef, article));

  const content = element(documentRef, 'div', 'news-card__content');
  appendArticleMeta(documentRef, content, article, 'news-card__meta');
  const heading = element(documentRef, 'h2', 'news-card__headline');
  if (href) {
    const link = element(documentRef, 'a', '', article.headline);
    link.href = href;
    heading.append(link);
  } else {
    heading.textContent = article.headline;
  }
  content.append(heading);
  if (article.summary) content.append(element(documentRef, 'p', 'news-card__summary', article.summary));
  if (href) {
    const readMore = element(documentRef, 'a', 'news-card__action', 'Read more');
    readMore.href = href;
    readMore.setAttribute('aria-label', article.headline ? `Read more: ${article.headline}` : 'Read article');
    content.append(readMore);
  }
  card.append(mediaLink, content);
  return card;
}

export function renderMediaListing(page, articles, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  fragment.append(createPageHero(documentRef, page.pageTitle, page.introduction));

  if (!articles.length) return fragment;
  const section = element(documentRef, 'section', 'section news-listing');
  section.setAttribute('aria-labelledby', 'news-listing-title');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'div', 'news-listing__heading');
  heading.append(element(documentRef, 'span', 'eyebrow', 'Media'));
  const title = element(documentRef, 'h2', '', 'Latest news');
  title.id = 'news-listing-title';
  heading.append(title);
  const grid = element(documentRef, 'div', 'news-listing__grid');
  articles.forEach((article) => grid.append(createNewsCard(documentRef, article)));
  container.append(heading, grid);
  section.append(container);
  fragment.append(section);
  return fragment;
}

function createArticleImage(documentRef, article) {
  const imageUrl = absoluteMediaUrl(article.featuredImage);
  if (!imageUrl) return null;
  const figure = element(documentRef, 'figure', 'news-article__featured');
  const image = element(documentRef, 'img');
  image.src = imageUrl;
  image.alt = article.featuredImage?.name || '';
  figure.append(image);
  return figure;
}

function createArticleActions(documentRef, article) {
  const attachmentUrl = absoluteMediaUrl(article.attachment);
  const externalUrl = safeExternalUrl(article.externalUrl);
  if (!attachmentUrl && !externalUrl) return null;
  const actions = element(documentRef, 'div', 'news-article__actions');
  if (attachmentUrl) {
    const attachment = element(
      documentRef,
      'a',
      'button button--primary',
      article.attachment?.name ? `View ${article.attachment.name}` : 'View attachment',
    );
    attachment.href = attachmentUrl;
    attachment.target = '_blank';
    attachment.rel = 'noopener noreferrer';
    actions.append(attachment);
  }
  if (externalUrl) {
    const external = element(documentRef, 'a', 'news-article__external', 'View original source');
    external.href = externalUrl;
    external.target = '_blank';
    external.rel = 'noopener noreferrer';
    actions.append(external);
  }
  return actions;
}

export function renderNewsArticle(article, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  const header = element(documentRef, 'header', 'news-article__header');
  const headerContainer = element(documentRef, 'div', 'container news-article__header-inner');
  const back = element(documentRef, 'a', 'news-article__back', '← All news');
  back.href = withCurrentCulture('/media/');
  headerContainer.append(back);
  appendArticleMeta(documentRef, headerContainer, article, 'news-article__meta');
  const title = element(documentRef, 'h1', '', article.headline);
  headerContainer.append(title);
  if (article.summary) headerContainer.append(element(documentRef, 'p', 'news-article__summary', article.summary));
  header.append(headerContainer);
  fragment.append(header);

  const section = element(documentRef, 'article', 'section news-article');
  const container = element(documentRef, 'div', 'container news-article__container');
  const featured = createArticleImage(documentRef, article);
  if (featured) container.append(featured);
  if (article.body) {
    const body = element(documentRef, 'div', 'news-article__body rich-text');
    body.innerHTML = article.body;
    container.append(body);
  }
  const actions = createArticleActions(documentRef, article);
  if (actions) container.append(actions);
  section.append(container);
  fragment.append(section);
  return fragment;
}

export function renderNewsNotFound(target, documentRef = document) {
  const section = element(documentRef, 'section', 'section news-not-found');
  const content = element(documentRef, 'div', 'container news-not-found__content');
  content.append(element(documentRef, 'span', 'news-not-found__code', '404'));
  content.append(element(documentRef, 'h1', '', 'Article not found'));
  content.append(element(documentRef, 'p', '', 'The news article may have moved, expired, or is not currently published.'));
  const back = element(documentRef, 'a', 'button button--primary', 'Return to all news');
  back.href = withCurrentCulture('/media/');
  content.append(back);
  section.append(content);
  target.replaceChildren(section);
}

export async function initMediaListing(target) {
  renderLoading(target, 'Loading the latest news…');
  try {
    const [page, articles] = await Promise.all([getMediaListingPage(), getNewsArticles()]);
    document.title = page.pageTitle || page.name;
    target.replaceChildren(renderMediaListing(page, articles));
    if (!articles.length) {
      renderEmpty(target, 'No published news articles are available yet.');
      return;
    }
    reveal(target.querySelector('.media-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error, 'The news listing is temporarily unavailable.');
  }
}

export async function initMediaArticle(target) {
  const selector = articleSelectorFromLocation();
  if (!selector) {
    document.title = 'Article not found';
    renderNewsNotFound(target);
    return;
  }

  renderLoading(target, 'Loading the article…');
  try {
    const article = await getNewsArticle(selector);
    document.title = article.headline || article.name;
    target.replaceChildren(renderNewsArticle(article));
    reveal(target.querySelector('.news-article__header h1'));
    revealAll(target);
  } catch (error) {
    if (error instanceof NewsArticleNotFoundError || error?.status === 404) {
      document.title = 'Article not found';
      renderNewsNotFound(target);
      return;
    }
    renderError(target, error, 'The news article is temporarily unavailable.');
  }
}
