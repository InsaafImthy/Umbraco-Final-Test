import { getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import { normalizeLink, normalizeMedia, normalizeRichText } from './normalizers.js';

export function normalizeCareersPage(page) {
  if (!page || page.contentType !== 'careersPage') {
    throw new TypeError('The Careers Page response did not match the documented careersPage contract.');
  }

  const properties = page.properties || {};
  return {
    name: page.name || '',
    pageTitle: properties.pageTitle || page.name || '',
    heading: properties.heading || '',
    body: normalizeRichText(properties.body).markup,
    image: normalizeMedia(properties.image),
    cta: normalizeLink(properties.cta),
  };
}

export async function getCareersPage() {
  const page = await getContentItem(CONTENT_IDS.careers, { expand: 'properties[$all]' });
  return normalizeCareersPage(page);
}
