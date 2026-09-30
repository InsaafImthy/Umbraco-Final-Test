import { getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import { normalizeBlockList, normalizeMedia, normalizeRichText } from './normalizers.js';

function normalizePerson(item) {
  const properties = item.properties || {};

  return {
    id: item.id,
    name: properties.name || '',
    position: properties.position || '',
    photo: normalizeMedia(properties.photo),
    biography: normalizeRichText(properties.biography).markup,
    linkedinUrl: properties.linkedinUrl || '',
  };
}

export function normalizeAboutPage(page) {
  if (!page || page.contentType !== 'aboutPage') {
    throw new TypeError('The About Page response did not match the documented aboutPage contract.');
  }

  const properties = page.properties || {};

  return {
    name: page.name || '',
    pageTitle: properties.pageTitle || page.name || '',
    introduction: {
      heading: properties.introHeading || '',
      body: normalizeRichText(properties.introBody).markup,
      media: normalizeMedia(properties.introMedia),
    },
    vision: {
      heading: properties.visionHeading || '',
      text: properties.visionText || '',
    },
    mission: {
      heading: properties.missionHeading || '',
      text: properties.missionText || '',
    },
    ceo: {
      message: normalizeRichText(properties.ceoMessage).markup,
      name: properties.ceoName || '',
      position: properties.ceoPosition || '',
      image: normalizeMedia(properties.ceoImage),
    },
    leadership: {
      board: {
        heading: properties.boardHeading || '',
        members: normalizeBlockList(properties.boardMembers).map(normalizePerson),
      },
      management: {
        heading: properties.managementHeading || '',
        members: normalizeBlockList(properties.managementMembers).map(normalizePerson),
      },
    },
  };
}

export async function getAboutPage() {
  const page = await getContentItem(CONTENT_IDS.about, { expand: 'properties[$all]' });
  return normalizeAboutPage(page);
}
