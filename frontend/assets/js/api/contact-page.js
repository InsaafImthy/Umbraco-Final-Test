import { getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import { normalizeRichText } from './normalizers.js';

export function normalizeContactPage(page) {
  if (!page || page.contentType !== 'contactPage') {
    throw new TypeError('The Contact Page response did not match the documented contactPage contract.');
  }

  const properties = page.properties || {};
  return {
    name: page.name || '',
    pageTitle: properties.pageTitle || page.name || '',
    introduction: normalizeRichText(properties.introduction).markup,
    mapLatitude: properties.mapLatitude || '',
    mapLongitude: properties.mapLongitude || '',
    mapEmbedUrl: properties.mapEmbedUrl || '',
  };
}

export async function getContactPage() {
  const page = await getContentItem(CONTENT_IDS.contact);
  return normalizeContactPage(page);
}
