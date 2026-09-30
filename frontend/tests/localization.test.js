import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDocumentCulture,
  cultureUrl,
  getCurrentCulture,
  withCurrentCulture,
} from '../assets/js/localization.js';

test('only the supported Umbraco culture codes en and ar are accepted', () => {
  assert.equal(getCurrentCulture({ search: '?culture=ar' }), 'ar');
  assert.equal(getCurrentCulture({ search: '?culture=en' }), 'en');
  assert.equal(getCurrentCulture({ search: '?culture=ar-OM' }), 'en');
  assert.equal(getCurrentCulture({ search: '' }), 'en');
});

test('document language and direction follow the selected culture', () => {
  const documentRef = { documentElement: {} };
  applyDocumentCulture(documentRef, 'ar');
  assert.deepEqual(documentRef.documentElement, { lang: 'ar', dir: 'rtl' });
  applyDocumentCulture(documentRef, 'en');
  assert.deepEqual(documentRef.documentElement, { lang: 'en', dir: 'ltr' });
});

test('language and internal navigation URLs preserve culture without touching external URLs', () => {
  const locationRef = {
    href: 'http://localhost:5173/about.html?culture=en#team',
    origin: 'http://localhost:5173',
    search: '?culture=ar',
  };
  assert.equal(cultureUrl('ar', locationRef), '/about.html?culture=ar#team');
  assert.equal(withCurrentCulture('/contact.html#map', locationRef), '/contact.html?culture=ar#map');
  assert.equal(withCurrentCulture('https://example.com/', locationRef), 'https://example.com/');
});
