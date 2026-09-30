import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCareersPage } from '../assets/js/api/careers-page.js';
import { normalizeContactPage } from '../assets/js/api/contact-page.js';
import { renderCareers } from '../assets/js/pages/careers.js';
import {
  emailHref,
  mapUrls,
  mergeContactDetails,
  renderContact,
  telephoneHref,
} from '../assets/js/pages/contact.js';

class FixtureElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.innerHTML = '';
    this.style = {};
    this.textContent = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

const fixtureDocument = {
  createDocumentFragment() {
    return new FixtureElement('fragment');
  },
  createElement(tagName) {
    return new FixtureElement(tagName);
  },
};

function findAll(root, predicate) {
  if (!root) return [];
  const matches = predicate(root) ? [root] : [];
  return matches.concat(root.children.flatMap((child) => findAll(child, predicate)));
}

function byClass(root, className) {
  return findAll(root, (node) => node.className.split(/\s+/).includes(className));
}

test('Careers renders body, response media URL, and CTA entirely from CMS fields', () => {
  const page = normalizeCareersPage({
    name: 'Careers',
    contentType: 'careersPage',
    properties: {
      pageTitle: 'CMS Careers',
      heading: 'CMS heading',
      body: { markup: '<p>CMS body.</p>' },
      image: [{ name: 'Careers image', url: '/media/careers.jpg' }],
      cta: [{ title: 'CMS CTA', url: 'https://example.com/jobs', target: '_blank' }],
    },
  });
  const rendered = renderCareers(page, fixtureDocument);
  const links = findAll(rendered, (node) => node.tagName === 'A');
  const images = findAll(rendered, (node) => node.tagName === 'IMG');

  assert.equal(byClass(rendered, 'careers-content__body')[0].innerHTML, '<p>CMS body.</p>');
  assert.equal(images[0].src, 'https://localhost:44385/media/careers.jpg');
  assert.equal(links[0].textContent, 'CMS CTA');
  assert.equal(links[0].href, 'https://example.com/jobs');
});

test('Careers does not invent a CTA when CMS CTA is missing', () => {
  const page = normalizeCareersPage({
    name: 'Careers',
    contentType: 'careersPage',
    properties: { pageTitle: 'Careers', heading: 'Join us', body: '<p>Body.</p>' },
  });
  const rendered = renderCareers(page, fixtureDocument);
  assert.equal(findAll(rendered, (node) => node.tagName === 'A').length, 0);
});

test('Contact details have one CMS owner in shared Site Settings', () => {
  const page = normalizeContactPage({
    name: 'Contact',
    contentType: 'contactPage',
    properties: {
      pageTitle: 'Contact Us',
      address: 'Legacy page address',
      email: 'legacy-page@example.com',
    },
  });
  const merged = mergeContactDetails(page, {
    address: 'Settings address',
    telephone: '+968 1111 2222',
    email: 'settings@example.com',
    poBox: 'Settings PO Box',
  });

  assert.equal(merged.address, 'Settings address');
  assert.equal(merged.telephone, '+968 1111 2222');
  assert.equal(merged.email, 'settings@example.com');
  assert.equal(merged.poBox, 'Settings PO Box');
});

test('mailto and tel schemes are constructed only from raw CMS values at presentation time', () => {
  assert.equal(emailHref(' enquiries+investors@example.com '), 'mailto:enquiries+investors@example.com');
  assert.equal(telephoneHref('+968 (22) 646-800'), 'tel:+96822646800');
  assert.equal(emailHref(''), '');
  assert.equal(telephoneHref(''), '');
});

test('Contact uses its map fields and renders contact details from Site Settings', () => {
  const page = normalizeContactPage({
    name: 'Contact',
    contentType: 'contactPage',
    properties: {
      pageTitle: 'Contact Us',
      introduction: { markup: '<p>Get in touch.</p>' },
      mapLatitude: '23.6169',
      mapLongitude: '58.5068',
      mapEmbedUrl: 'https://maps.example.com/embed/location',
    },
  });
  const contact = mergeContactDetails(page, {
    address: 'CMS address',
    telephone: '+968 22646800',
    email: 'cms@example.com',
    poBox: 'CMS PO Box',
  });
  const rendered = renderContact(contact, fixtureDocument);
  const frame = findAll(rendered, (node) => node.tagName === 'IFRAME')[0];
  const values = byClass(rendered, 'contact-details__value').map((node) => node.textContent);

  assert.equal(frame.src, 'https://maps.example.com/embed/location');
  assert.deepEqual(values, ['CMS address', '+968 22646800', 'cms@example.com', 'CMS PO Box']);
});

test('valid CMS coordinates produce a key-free fallback map without provider secrets', () => {
  const urls = mapUrls({ mapEmbedUrl: '', mapLatitude: '23.6169', mapLongitude: '58.5068' });
  assert.equal(urls.embedUrl.startsWith('https://www.openstreetmap.org/export/embed.html?'), true);
  assert.equal(urls.embedUrl.includes('key='), false);
  assert.equal(mapUrls({ mapEmbedUrl: '', mapLatitude: 'invalid', mapLongitude: '58.5068' }), null);
});
