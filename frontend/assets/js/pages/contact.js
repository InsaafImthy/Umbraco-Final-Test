import { getContactPage } from '../api/contact-page.js';
import { getSiteSettings } from '../api/site-settings.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { renderError, renderLoading } from '../components/render-state.js';

function element(documentRef, tag, className, text) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function mergeContactDetails(page, settings = null) {
  return {
    ...page,
    address: settings?.address || '',
    telephone: settings?.telephone || '',
    email: settings?.email || '',
    poBox: settings?.poBox || '',
  };
}

export function emailHref(value) {
  const email = String(value || '').trim();
  return email ? `mailto:${email}` : '';
}

export function telephoneHref(value) {
  const telephone = String(value || '').trim().replace(/[^\d+*#,;]/g, '');
  return telephone ? `tel:${telephone}` : '';
}

function validCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

function safeEmbedUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function mapUrls(contact) {
  const embedUrl = safeEmbedUrl(contact.mapEmbedUrl);
  const coordinates = validCoordinates(contact.mapLatitude, contact.mapLongitude);
  if (embedUrl) {
    return {
      embedUrl,
      locationUrl: coordinates
        ? `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=16/${coordinates.latitude}/${coordinates.longitude}`
        : embedUrl,
    };
  }
  if (!coordinates) return null;

  const latitudeDelta = 0.012;
  const longitudeDelta = 0.018;
  const bbox = [
    coordinates.longitude - longitudeDelta,
    coordinates.latitude - latitudeDelta,
    coordinates.longitude + longitudeDelta,
    coordinates.latitude + latitudeDelta,
  ].join(',');
  const params = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${coordinates.latitude},${coordinates.longitude}`,
  });
  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?${params.toString()}`,
    locationUrl: `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=16/${coordinates.latitude}/${coordinates.longitude}`,
  };
}

function createHero(documentRef, contact) {
  const hero = element(documentRef, 'header', 'page-hero contact-hero');
  const container = element(documentRef, 'div', 'container contact-hero__inner');
  container.append(element(documentRef, 'h1', '', contact.pageTitle));
  if (contact.introduction) {
    const introduction = element(documentRef, 'div', 'contact-hero__introduction rich-text');
    introduction.innerHTML = contact.introduction;
    container.append(introduction);
  }
  hero.append(container);
  return hero;
}

function createContactItem(documentRef, label, value, href = '') {
  if (!value) return null;
  const item = element(documentRef, 'div', 'contact-details__item');
  item.setAttribute('data-reveal', '');
  item.append(element(documentRef, 'span', 'contact-details__label', label));
  if (href) {
    const link = element(documentRef, 'a', 'contact-details__value', value);
    link.href = href;
    item.append(link);
  } else {
    item.append(element(documentRef, 'span', 'contact-details__value', value));
  }
  return item;
}

function createContactDetails(documentRef, contact) {
  const items = [
    createContactItem(documentRef, 'Company office location', contact.address),
    createContactItem(documentRef, 'Telephone number', contact.telephone, telephoneHref(contact.telephone)),
    createContactItem(documentRef, 'E-mail', contact.email, emailHref(contact.email)),
    createContactItem(documentRef, 'Postal address', contact.poBox),
  ].filter(Boolean);
  if (!items.length) return null;

  const section = element(documentRef, 'section', 'section contact-details');
  section.setAttribute('aria-labelledby', 'contact-details-title');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'div', 'section-heading section-heading--left');
  heading.append(element(documentRef, 'span', 'eyebrow', 'Get in touch'));
  const title = element(documentRef, 'h2', '', 'Contact information');
  title.id = 'contact-details-title';
  heading.append(title);
  const address = element(documentRef, 'address', 'contact-details__grid');
  address.append(...items);
  container.append(heading, address);
  section.append(container);
  return section;
}

function createMap(documentRef, contact) {
  const urls = mapUrls(contact);
  if (!urls) return null;
  const section = element(documentRef, 'section', 'contact-map');
  section.setAttribute('aria-labelledby', 'contact-map-title');
  const heading = element(documentRef, 'div', 'container contact-map__heading');
  const title = element(documentRef, 'h2', '', 'Find our office');
  title.id = 'contact-map-title';
  const external = element(documentRef, 'a', 'contact-map__link', 'Open location in a new tab');
  external.href = urls.locationUrl;
  external.target = '_blank';
  external.rel = 'noopener noreferrer';
  heading.append(title, external);

  const frame = element(documentRef, 'iframe', 'contact-map__frame');
  frame.src = urls.embedUrl;
  frame.title = contact.address ? `Map showing ${contact.address}` : 'Company office location';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'no-referrer-when-downgrade';
  frame.setAttribute('allowfullscreen', '');
  section.append(heading, frame);
  return section;
}

export function renderContact(contact, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  [
    createHero(documentRef, contact),
    createContactDetails(documentRef, contact),
    createMap(documentRef, contact),
  ].filter(Boolean).forEach((section) => fragment.append(section));
  return fragment;
}

export async function initContact(target) {
  renderLoading(target, 'Loading contact information…');
  try {
    const [page, settings] = await Promise.all([
      getContactPage(),
      getSiteSettings().catch(() => null),
    ]);
    const contact = mergeContactDetails(page, settings);
    document.title = contact.pageTitle || contact.name;
    target.replaceChildren(renderContact(contact));
    reveal(target.querySelector('.contact-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error, 'Contact information is temporarily unavailable.');
  }
}
