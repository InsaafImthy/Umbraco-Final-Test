import { getContentCollection, getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import { normalizeMedia, normalizeRichText } from './normalizers.js';

const NEWS_PAGE_SIZE = 100;
const LISTING_FIELDS = 'properties[headline,publicationDate,summary,category,featuredImage]';

export class NewsArticleNotFoundError extends Error {
  constructor(message = 'News article not found.') {
    super(message);
    this.name = 'NewsArticleNotFoundError';
    this.code = 'NEWS_ARTICLE_NOT_FOUND';
  }
}

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.date === 'string') return value.date;
  return '';
}

function normalizeRoute(value) {
  if (typeof value === 'string') return value;
  return value?.path || '';
}

export function normalizeMediaListingPage(page) {
  if (!page || page.contentType !== 'mediaListingPage') {
    throw new TypeError('The Media Listing response did not match the documented mediaListingPage contract.');
  }

  const properties = page.properties || {};
  return {
    name: page.name || '',
    pageTitle: properties.pageTitle || page.name || '',
    introduction: properties.introduction || '',
  };
}

export function normalizeNewsArticle(item) {
  if (!item || item.contentType !== 'newsArticle') {
    throw new TypeError('The News Article response did not match the documented newsArticle contract.');
  }

  const properties = item.properties || {};
  return {
    id: item.id || '',
    route: normalizeRoute(item.route),
    name: item.name || '',
    headline: properties.headline || item.name || '',
    publicationDate: normalizeDate(properties.publicationDate),
    featuredImage: normalizeMedia(properties.featuredImage),
    summary: properties.summary || '',
    category: properties.category || '',
    body: normalizeRichText(properties.body).markup,
    attachment: normalizeMedia(properties.documentAttachment),
    externalUrl: properties.externalUrl || '',
  };
}

function publicationTimestamp(article) {
  const value = article.publicationDate;
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortNewsNewestFirst(articles) {
  return [...articles].sort((left, right) => {
    const dateDifference = publicationTimestamp(right) - publicationTimestamp(left);
    if (dateDifference) return dateDifference;
    return left.headline.localeCompare(right.headline);
  });
}

export async function getMediaListingPage() {
  const page = await getContentItem(CONTENT_IDS.media);
  return normalizeMediaListingPage(page);
}

export async function getNewsArticles() {
  const items = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (items.length < total) {
    const response = await getContentCollection({
      fetch: `children:${CONTENT_IDS.media}`,
      filter: 'contentType:newsArticle',
      fields: LISTING_FIELDS,
      expand: 'properties[featuredImage]',
      skip,
      take: NEWS_PAGE_SIZE,
    });
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    items.push(...pageItems);
    total = Number.isFinite(response?.total) ? response.total : items.length;
    skip += pageItems.length;
    if (!pageItems.length) break;
  }

  return sortNewsNewestFirst(items.map(normalizeNewsArticle));
}

export async function getNewsArticle(selector) {
  if (!selector) throw new NewsArticleNotFoundError();
  const item = await getContentItem(selector, { expand: 'properties[$all]' });
  if (!item || item.contentType !== 'newsArticle') throw new NewsArticleNotFoundError();
  return normalizeNewsArticle(item);
}
