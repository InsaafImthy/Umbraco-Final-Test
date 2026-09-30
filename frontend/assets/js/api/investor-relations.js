import { getContentCollection, getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import {
  normalizeBlockList,
  normalizeLink,
  normalizeMedia,
  normalizeRichText,
} from './normalizers.js';

const DOCUMENT_PAGE_SIZE = 100;
const DOCUMENT_FIELDS = 'properties[title,category,publicationDate,description,file,thumbnail,externalLink,featured]';

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.date === 'string') return value.date;
  return '';
}

function normalizeCategory(value) {
  const category = Array.isArray(value) ? value[0] : value;
  if (typeof category === 'string') return category;
  return category?.value || category?.name || '';
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function normalizeInvestorRelationsPage(page) {
  if (!page || page.contentType !== 'investorRelationsPage') {
    throw new TypeError('The Investor Relations response did not match the documented investorRelationsPage contract.');
  }

  const properties = page.properties || {};
  return {
    name: page.name || '',
    pageTitle: properties.pageTitle || page.name || '',
    introduction: normalizeRichText(properties.introduction).markup,
    quickLinks: normalizeBlockList(properties.quickLinks).map((item) => ({
      id: item.id,
      label: item.properties.label || '',
      link: normalizeLink(item.properties.link),
    })).filter((item) => item.label || item.link?.href),
    keyFigures: {
      heading: properties.keyFiguresHeading || '',
      text: properties.keyFiguresText || '',
    },
  };
}

export function normalizeInvestorDocument(item) {
  if (!item || item.contentType !== 'investorDocument') {
    throw new TypeError('The Investor Document response did not match the documented investorDocument contract.');
  }

  const properties = item.properties || {};
  return {
    id: item.id || '',
    title: properties.title || item.name || '',
    category: normalizeCategory(properties.category),
    publicationDate: normalizeDate(properties.publicationDate),
    description: properties.description || '',
    file: normalizeMedia(properties.file),
    thumbnail: normalizeMedia(properties.thumbnail),
    externalLink: properties.externalLink || '',
    featured: normalizeBoolean(properties.featured),
  };
}

function publicationTimestamp(document) {
  if (!document.publicationDate) return Number.NEGATIVE_INFINITY;
  const value = document.publicationDate;
  const timestamp = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortInvestorDocuments(documents) {
  return [...documents].sort((left, right) => {
    if (left.featured !== right.featured) return left.featured ? -1 : 1;
    const dateDifference = publicationTimestamp(right) - publicationTimestamp(left);
    if (dateDifference) return dateDifference;
    return left.title.localeCompare(right.title);
  });
}

export function categorizeInvestorDocuments(documents) {
  const categories = [...new Set(documents.map((document) => document.category).filter(Boolean))];
  return new Map(categories.map((category) => [
    category,
    sortInvestorDocuments(documents.filter((document) => document.category === category)),
  ]));
}

export async function getInvestorRelationsPage() {
  const page = await getContentItem(CONTENT_IDS.investorRelations, { expand: 'properties[quickLinks]' });
  return normalizeInvestorRelationsPage(page);
}

export async function getInvestorDocuments() {
  const items = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (items.length < total) {
    const response = await getContentCollection({
      fetch: `children:${CONTENT_IDS.investorRelations}`,
      filter: 'contentType:investorDocument',
      fields: DOCUMENT_FIELDS,
      expand: 'properties[file,thumbnail]',
      skip,
      take: DOCUMENT_PAGE_SIZE,
    });
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    items.push(...pageItems);
    total = Number.isFinite(response?.total) ? response.total : items.length;
    skip += pageItems.length;
    if (!pageItems.length) break;
  }

  return sortInvestorDocuments(items.map(normalizeInvestorDocument));
}
