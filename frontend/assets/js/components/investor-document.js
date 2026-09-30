import { CMS_URL } from '../config.js';

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

function formatDate(value, locale = 'en-GB') {
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

function createThumbnail(documentRef, document) {
  const media = element(documentRef, 'div', 'investor-document__thumbnail');
  const thumbnailUrl = absoluteMediaUrl(document.thumbnail);
  if (thumbnailUrl) {
    const image = element(documentRef, 'img');
    image.src = thumbnailUrl;
    image.alt = document.thumbnail?.name || '';
    image.loading = 'lazy';
    media.append(image);
  } else {
    const fallback = element(documentRef, 'span', 'investor-document__file-icon', 'DOC');
    fallback.setAttribute('aria-hidden', 'true');
    media.append(fallback);
  }
  return media;
}

function createAction(documentRef, href, label, modifier = '') {
  const link = element(documentRef, 'a', `investor-document__action${modifier ? ` ${modifier}` : ''}`, label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

export function createInvestorDocument(document, documentRef = globalThis.document) {
  const card = element(documentRef, 'article', `investor-document${document.featured ? ' investor-document--featured' : ''}`);
  card.setAttribute('data-reveal', '');
  card.append(createThumbnail(documentRef, document));

  const content = element(documentRef, 'div', 'investor-document__content');
  const header = element(documentRef, 'div', 'investor-document__meta');
  if (document.category) header.append(element(documentRef, 'span', 'investor-document__category', document.category));
  const dateLabel = formatDate(document.publicationDate);
  if (dateLabel) {
    const date = element(documentRef, 'time', 'investor-document__date', dateLabel);
    date.dateTime = document.publicationDate;
    header.append(date);
  }
  if (document.featured) header.append(element(documentRef, 'span', 'investor-document__featured', 'Featured'));
  if (header.children.length) content.append(header);

  if (document.title) content.append(element(documentRef, 'h3', 'investor-document__title', document.title));
  if (document.description) content.append(element(documentRef, 'p', 'investor-document__description', document.description));

  const fileUrl = absoluteMediaUrl(document.file);
  const externalUrl = safeExternalUrl(document.externalLink);
  if (fileUrl || externalUrl) {
    const actions = element(documentRef, 'div', 'investor-document__actions');
    if (fileUrl) {
      actions.append(createAction(
        documentRef,
        fileUrl,
        document.file?.name ? `View ${document.file.name}` : 'View document',
      ));
    }
    if (externalUrl) {
      actions.append(createAction(documentRef, externalUrl, 'Open external link', 'investor-document__action--secondary'));
    }
    content.append(actions);
  }

  card.append(content);
  return card;
}
