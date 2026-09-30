import { getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import {
  normalizeBlockList,
  normalizeLink,
  normalizeMedia,
  normalizeRichText,
} from './normalizers.js';

export function normalizeHomePage(page) {
  if (!page || page.contentType !== 'homePage') {
    throw new TypeError('The Home Page response did not match the documented homePage contract.');
  }

  const properties = page.properties || {};
  return {
    name: page.name || '',
    metaTitle: properties.metaTitle || '',
    metaDescription: properties.metaDescription || '',
    hero: {
      title: properties.heroTitle || page.name || '',
      subtitle: properties.heroSubtitle || '',
      background: normalizeMedia(properties.heroBackground),
      video: normalizeMedia(properties.heroVideo),
      cta: normalizeLink(properties.heroCta),
    },
    strategicStatements: normalizeBlockList(properties.strategicStatements).map((item) => ({
      id: item.id,
      heading: item.properties.heading || '',
      description: normalizeRichText(item.properties.description).markup,
      image: normalizeMedia(item.properties.image),
    })),
    milestones: {
      heading: properties.milestonesHeading || '',
      items: normalizeBlockList(properties.milestones).map((item) => ({
        id: item.id,
        dateLabel: item.properties.dateLabel || '',
        sequenceNumber: item.properties.sequenceNumber ?? null,
        description: item.properties.description || '',
        image: normalizeMedia(item.properties.image),
      })),
    },
    subsidiaries: {
      heading: properties.subsidiariesHeading || '',
      items: normalizeBlockList(properties.subsidiaries).map((item) => ({
        id: item.id,
        name: item.properties.name || '',
        logo: normalizeMedia(item.properties.logo),
        description: item.properties.description || '',
        link: normalizeLink(item.properties.link),
      })),
    },
    closing: {
      heading: properties.closingHeading || '',
      text: normalizeRichText(properties.closingText).markup,
      media: normalizeMedia(properties.closingMedia),
    },
  };
}

export async function getHomePage() {
  const page = await getContentItem(CONTENT_IDS.home, { expand: 'properties[$all]' });
  return normalizeHomePage(page);
}
