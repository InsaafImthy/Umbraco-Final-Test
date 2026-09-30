import { getContentItem } from './umbraco-api.js';
import { CONTENT_IDS } from './content-ids.js';
import { getCurrentCulture } from '../localization.js';
import {
  normalizeMedia,
  normalizeNavigation,
  normalizeSocialLinks,
} from './normalizers.js';

export const SITE_SETTINGS_ID = CONTENT_IDS.siteSettings;

const siteSettingsPromises = new Map();

export function normalizeSiteSettings(page) {
  if (!page || page.contentType !== 'siteSettings') {
    throw new TypeError('The Site Settings response did not match the documented siteSettings contract.');
  }

  const properties = page.properties || {};
  return {
    siteName: properties.siteName || 'Site',
    logo: normalizeMedia(properties.logo),
    logoLight: normalizeMedia(properties.logoLight),
    navigation: normalizeNavigation(properties.navigation),
    address: properties.address || '',
    telephone: properties.telephone || '',
    email: properties.email || '',
    poBox: properties.poBox || '',
    socialLinks: normalizeSocialLinks(properties.socialLinks),
    footerLinks: normalizeNavigation(properties.footerLinks),
    copyrightText: properties.copyrightText || '',
  };
}

export function getSiteSettings() {
  const culture = getCurrentCulture();
  if (!siteSettingsPromises.has(culture)) {
    const request = getContentItem(SITE_SETTINGS_ID, {
      expand: 'properties[$all]',
      culture,
    })
      .then(normalizeSiteSettings)
      .catch((error) => {
        siteSettingsPromises.delete(culture);
        throw error;
      });
    siteSettingsPromises.set(culture, request);
  }

  return siteSettingsPromises.get(culture);
}
