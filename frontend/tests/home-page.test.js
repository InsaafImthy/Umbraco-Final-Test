import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeHomePage } from '../assets/js/api/home-page.js';
import { createMilestones } from '../assets/js/components/milestones.js';
import { renderHome } from '../assets/js/pages/home.js';

class FixtureElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
    this.style = {};
    this.textContent = '';
    this.clientWidth = 0;
    this.scrollLeft = 0;
    this.scrollWidth = 0;
  }

  append(...children) {
    this.children.push(...children);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  scrollBy() {}
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

function milestoneBlock(index, properties = {}) {
  return {
    content: {
      id: `milestone-${index}`,
      contentType: 'milestoneItem',
      properties: {
        dateLabel: `Date ${index}`,
        sequenceNumber: index,
        description: `Description ${index}`,
        ...properties,
      },
    },
  };
}

function homeResponse(milestoneBlocks) {
  return {
    id: 'home-page',
    name: 'Home',
    contentType: 'homePage',
    properties: {
      heroTitle: 'CMS hero',
      strategicStatements: { items: [] },
      milestonesHeading: 'CMS milestones',
      milestones: { items: milestoneBlocks },
      subsidiaries: { items: [] },
    },
  };
}

for (const count of [0, 1, 8, 9, 20]) {
  test(`milestone renderer supports a ${count}-item CMS fixture`, () => {
    const blocks = Array.from({ length: count }, (_, index) => milestoneBlock(index + 1));
    const page = normalizeHomePage(homeResponse(blocks));
    const rendered = createMilestones(page.milestones, fixtureDocument);

    if (count === 0) {
      assert.equal(rendered, null);
      return;
    }

    const items = byClass(rendered, 'milestone');
    assert.equal(items.length, count);
    assert.deepEqual(
      byClass(rendered, 'milestone__date').map((item) => item.textContent),
      blocks.map((_, index) => `Date ${index + 1}`),
    );
    assert.deepEqual(
      items.map((item) => item.dataset.sequence),
      blocks.map((_, index) => String(index + 1)),
    );

    const controls = findAll(rendered, (node) => node.tagName === 'BUTTON');
    assert.equal(controls.length, 2);
    assert.equal(controls.every((button) => button.disabled), count === 1);
  });
}

test('milestone renderer preserves reordered CMS Block List order', () => {
  const blocks = [
    milestoneBlock(2, { dateLabel: 'Second published first' }),
    milestoneBlock(1, { dateLabel: 'First published second' }),
  ];
  const page = normalizeHomePage(homeResponse(blocks));
  const rendered = createMilestones(page.milestones, fixtureDocument);

  assert.deepEqual(
    byClass(rendered, 'milestone__date').map((item) => item.textContent),
    ['Second published first', 'First published second'],
  );
});

test('milestone renderer handles present and missing images', () => {
  const blocks = [
    milestoneBlock(1, { image: [{ name: 'Milestone image', url: '/media/milestone.jpg' }] }),
    milestoneBlock(2, { image: null }),
  ];
  const page = normalizeHomePage(homeResponse(blocks));
  const rendered = createMilestones(page.milestones, fixtureDocument);
  const images = findAll(rendered, (node) => node.tagName === 'IMG');

  assert.equal(images.length, 1);
  assert.equal(images[0].src, 'https://localhost:44385/media/milestone.jpg');
  assert.equal(images[0].alt, 'Date 1 milestone');
});

test('milestone renderer tolerates missing optional properties', () => {
  const page = normalizeHomePage(homeResponse([milestoneBlock(1, {
    dateLabel: '',
    sequenceNumber: null,
    description: '',
    image: null,
  })]));
  const rendered = createMilestones(page.milestones, fixtureDocument);

  assert.equal(byClass(rendered, 'milestone').length, 1);
  assert.equal(byClass(rendered, 'milestone__date').length, 0);
  assert.equal(byClass(rendered, 'milestone__description').length, 0);
  assert.equal(byClass(rendered, 'milestone__marker')[0].children[0].textContent, '1');
});

test('reduced motion keeps the CMS hero image and does not start its video', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  globalThis.document = fixtureDocument;
  globalThis.window = {
    matchMedia: () => ({ matches: true }),
  };

  try {
    const rendered = renderHome({
      hero: {
        title: 'CMS hero',
        subtitle: '',
        background: { url: '/media/hero.jpg' },
        video: { url: '/media/hero.mp4' },
        cta: null,
      },
      strategicStatements: [],
      milestones: { heading: '', items: [] },
      subsidiaries: { heading: '', items: [] },
      closing: {},
    });

    assert.equal(findAll(rendered, (node) => node.tagName === 'VIDEO').length, 0);
    assert.equal(
      byClass(rendered, 'home-hero__media')[0].style.backgroundImage,
      'url("https://localhost:44385/media/hero.jpg")',
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
