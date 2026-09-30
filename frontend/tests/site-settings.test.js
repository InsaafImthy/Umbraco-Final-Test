import assert from 'node:assert/strict';
import test from 'node:test';

const siteSettingsResponse = {
  id: '4552c1e7-0aca-50f5-a176-0aa7986674d8',
  name: 'Site Settings',
  contentType: 'siteSettings',
  properties: {
    siteName: 'Energy Oman',
    logo: [{ name: 'Logo', url: '/media/logo.png' }],
    logoLight: [{ name: 'Light logo', url: '/media/logo-light.png' }],
    navigation: {
      items: [{
        content: {
          id: 'navigation-home',
          contentType: 'navigationItem',
          properties: {
            label: 'Home',
            link: [{ url: '/', title: 'Home', target: null }],
          },
        },
      }],
    },
    address: 'Mina Al-Fahal, Muscat, Sultanate of Oman',
    telephone: '+968 22646800',
    email: 'info@example.test',
    poBox: 'P.O. Box 828',
    socialLinks: {
      items: [{
        content: {
          id: 'social-linkedin',
          contentType: 'socialLink',
          properties: {
            platformName: 'LinkedIn',
            url: 'https://www.linkedin.com/company/example/',
          },
        },
      }],
    },
    footerLinks: {
      items: [{
        content: {
          id: 'footer-home',
          contentType: 'navigationItem',
          properties: {
            label: 'Home',
            link: [{ url: '/', title: 'Home', target: null }],
          },
        },
      }],
    },
    copyrightText: 'Copyright © 2026 Energy Oman',
  },
};

test('Site Settings uses the documented selector and shares one in-flight request', async () => {
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url.toString());
    return new Response(JSON.stringify(siteSettingsResponse), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  };

  const {
    getSiteSettings,
    SITE_SETTINGS_ID,
  } = await import('../assets/js/api/site-settings.js');
  const [first, second, third] = await Promise.all([
    getSiteSettings(),
    getSiteSettings(),
    getSiteSettings(),
  ]);

  assert.equal(requestedUrls.length, 1);
  const requestUrl = new URL(requestedUrls[0]);
  assert.equal(
    requestUrl.pathname,
    `/umbraco/delivery/api/v2/content/item/${SITE_SETTINGS_ID}`,
  );
  assert.equal(requestUrl.searchParams.get('expand'), 'properties[$all]');
  assert.equal(requestUrl.searchParams.get('culture'), 'en');
  assert.strictEqual(first, second);
  assert.strictEqual(second, third);
  assert.deepEqual(first.navigation, [{
    id: 'navigation-home',
    label: 'Home',
    href: '/',
    target: null,
  }]);
  assert.deepEqual(first.footerLinks, [{
    id: 'footer-home',
    label: 'Home',
    href: '/',
    target: null,
  }]);
  assert.equal(first.logo.url, '/media/logo.png');
  assert.equal(first.logoLight.url, '/media/logo-light.png');
  assert.equal(first.siteName, 'Energy Oman');
  assert.equal(first.telephone, '+968 22646800');
  assert.equal(first.email, 'info@example.test');
  assert.equal(first.address, 'Mina Al-Fahal, Muscat, Sultanate of Oman');
  assert.equal(first.poBox, 'P.O. Box 828');
  assert.deepEqual(first.socialLinks, [{
    id: 'social-linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/example/',
  }]);
  assert.equal(first.copyrightText, 'Copyright © 2026 Energy Oman');
});

test('a failed Site Settings request is not retained in the promise cache', async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) throw new TypeError('CMS offline');
    return new Response(JSON.stringify(siteSettingsResponse), { status: 200 });
  };

  const { getSiteSettings } = await import('../assets/js/api/site-settings.js?retry-test');
  await assert.rejects(getSiteSettings(), /Unable to reach Umbraco/);

  const settings = await getSiteSettings();
  assert.equal(requestCount, 2);
  assert.equal(settings.siteName, 'Energy Oman');
});
