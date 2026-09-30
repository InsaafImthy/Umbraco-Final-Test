import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNewsArticles,
  normalizeNewsArticle,
  sortNewsNewestFirst,
} from '../assets/js/api/media-page.js';
import {
  articleHref,
  articleSelectorFromLocation,
  formatPublicationDate,
  renderMediaListing,
  renderNewsArticle,
} from '../assets/js/pages/media.js';

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

function newsItem(index, date, properties = {}) {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    name: `News ${index}`,
    contentType: 'newsArticle',
    route: { path: `/media/news-${index}` },
    properties: {
      headline: `Headline ${index}`,
      publicationDate: date,
      summary: `Summary ${index}`,
      category: 'Press Releases',
      featuredImage: [{ name: `Image ${index}`, url: `/media/news-${index}.jpg` }],
      ...properties,
    },
  };
}

test('seeded three news records render dynamically newest first', () => {
  const articles = sortNewsNewestFirst([
    newsItem(3, '2022-09-19', { headline: 'Energy Development Oman Receives a Norway Delegation' }),
    newsItem(1, '2024-06-28', { headline: 'Energy Development Oman Successfully Issues Seven-Year US$750 Million Sukuk' }),
    newsItem(2, '2023-06-01', { headline: 'EDO Signs MoU with Siemens Energy in Oman' }),
  ].map(normalizeNewsArticle));
  const rendered = renderMediaListing({ pageTitle: 'Our News', introduction: 'Latest.' }, articles, fixtureDocument);

  assert.equal(byClass(rendered, 'news-card').length, 3);
  assert.deepEqual(
    byClass(rendered, 'news-card__headline').map((heading) => heading.children[0].textContent),
    [
      'Energy Development Oman Successfully Issues Seven-Year US$750 Million Sukuk',
      'EDO Signs MoU with Siemens Energy in Oman',
      'Energy Development Oman Receives a Norway Delegation',
    ],
  );
});

test('a newly published Backoffice child appears without frontend source changes', async () => {
  const originalFetch = globalThis.fetch;
  const publishedItems = [
    newsItem(1, '2024-06-28'),
    newsItem(2, '2023-06-01'),
    newsItem(3, '2022-09-19'),
    newsItem(4, '2026-08-18'),
  ];
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ total: publishedItems.length, items: publishedItems }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  };

  try {
    const articles = await getNewsArticles();
    assert.equal(articles.length, 4);
    assert.equal(articles[0].headline, 'Headline 4');
    assert.equal(requestedUrl.searchParams.get('fetch'), 'children:1247aa9b-6aed-5e87-ad46-f76590ea9d14');
    assert.equal(requestedUrl.searchParams.get('culture'), 'en');
    assert.equal(requestedUrl.searchParams.get('filter'), 'contentType:newsArticle');
    assert.equal(requestedUrl.searchParams.get('fields').includes('body'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('article links and selectors use the Delivery API route with ID fallback', () => {
  assert.equal(
    articleHref({ route: '/media/a published article', id: 'unused' }),
    '/media/article.html?path=%2Fmedia%2Fa+published+article&culture=en',
  );
  assert.equal(articleHref({ route: '', id: 'article-key' }), '/media/article.html?id=article-key&culture=en');
  assert.equal(articleSelectorFromLocation({ search: '?path=%2Fmedia%2Farticle-one' }), '/media/article-one');
  assert.equal(articleSelectorFromLocation({ search: '?key=article-key' }), 'article-key');
});

test('detail renderer includes body, optional attachment, and external URL', () => {
  const article = normalizeNewsArticle(newsItem(1, { date: '2024-06-28', timeZone: null }, {
    body: { markup: '<p>Full article body.</p>' },
    documentAttachment: [{ name: 'Release PDF', url: '/media/release.pdf' }],
    externalUrl: 'https://example.com/source',
  }));
  const rendered = renderNewsArticle(article, fixtureDocument);

  assert.equal(byClass(rendered, 'news-article__body')[0].innerHTML, '<p>Full article body.</p>');
  assert.equal(byClass(rendered, 'news-article__actions').length, 1);
  assert.equal(formatPublicationDate(article.publicationDate), '28 June 2024');
});
