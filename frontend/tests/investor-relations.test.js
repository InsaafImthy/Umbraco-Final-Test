import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categorizeInvestorDocuments,
  getInvestorDocuments,
  normalizeInvestorDocument,
} from '../assets/js/api/investor-relations.js';
import { createInvestorDocument } from '../assets/js/components/investor-document.js';
import { renderInvestorRelations } from '../assets/js/pages/investor-relations.js';

class FixtureElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.hidden = false;
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

function documentItem(index, category, properties = {}) {
  return {
    id: `document-${index}`,
    name: `Document ${index}`,
    contentType: 'investorDocument',
    properties: {
      title: `Document ${index}`,
      category,
      publicationDate: `2025-0${Math.min(index, 9)}-01`,
      description: `Description ${index}`,
      featured: false,
      ...properties,
    },
  };
}

const page = {
  name: 'Investor Relations',
  pageTitle: 'Investor Relations',
  introduction: '<p>Investment information.</p>',
  quickLinks: [],
  keyFigures: { heading: 'Key Numbers', text: 'CMS figures.' },
};

const investorCategories = [
  'Financial Statements',
  'Credit Ratings',
  'Investor Presentations',
  'USD Programs',
  'OMR Sukuk',
  'ESG',
];

test('all six investor categories render their seeded documents', () => {
  const documents = investorCategories.map((category, index) => (
    normalizeInvestorDocument(documentItem(index + 1, category))
  ));
  const rendered = renderInvestorRelations(page, documents, fixtureDocument);

  assert.equal(byClass(rendered, 'investor-documents__tab').length, 6);
  assert.equal(byClass(rendered, 'investor-documents__panel').length, 6);
  assert.equal(byClass(rendered, 'investor-document').length, 6);
  assert.equal(byClass(rendered, 'investor-documents__empty').length, 0);
});

test('category tabs are derived from published documents', () => {
  const documents = investorCategories.slice(0, 5).map((category, index) => (
    normalizeInvestorDocument(documentItem(index + 1, category))
  ));
  const rendered = renderInvestorRelations(page, documents, fixtureDocument);

  assert.deepEqual([...categorizeInvestorDocuments(documents).keys()], investorCategories.slice(0, 5));
  assert.equal(byClass(rendered, 'investor-documents__panel').length, 5);
  assert.equal(byClass(rendered, 'investor-documents__empty').length, 0);
});

test('reusable document renderer uses exact Media Picker URLs from the response', () => {
  const document = normalizeInvestorDocument(documentItem(1, 'Financial Statements', {
    file: [{ name: 'Statement PDF', url: '/media/statement.pdf' }],
    thumbnail: [{ name: 'Statement cover', url: '/media/statement-cover.jpg' }],
    externalLink: 'https://example.com/investors',
    featured: true,
  }));
  const rendered = createInvestorDocument(document, fixtureDocument);
  const links = findAll(rendered, (node) => node.tagName === 'A');
  const images = findAll(rendered, (node) => node.tagName === 'IMG');

  assert.equal(images[0].src, 'https://localhost:44385/media/statement-cover.jpg');
  assert.equal(links[0].href, 'https://localhost:44385/media/statement.pdf');
  assert.equal(links[1].href, 'https://example.com/investors');
  assert.equal(rendered.className.includes('investor-document--featured'), true);
});

test('a newly published Backoffice document appears without source changes', async () => {
  const originalFetch = globalThis.fetch;
  const items = investorCategories.map((category, index) => documentItem(index + 1, category));
  items.push(documentItem(7, 'Financial Statements', { title: 'Newly Published Statement' }));
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ total: items.length, items }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  };

  try {
    const documents = await getInvestorDocuments();
    assert.equal(documents.length, 7);
    assert.equal(documents.some((document) => document.title === 'Newly Published Statement'), true);
    assert.equal(requestedUrl.searchParams.get('fetch'), 'children:3bc2fa02-2471-5049-8d9f-1bde911e5d6a');
    assert.equal(requestedUrl.searchParams.get('culture'), 'en');
    assert.equal(requestedUrl.searchParams.get('filter'), 'contentType:investorDocument');
    assert.equal(requestedUrl.searchParams.get('expand'), 'properties[file,thumbnail]');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
