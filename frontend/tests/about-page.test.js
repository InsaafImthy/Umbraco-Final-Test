import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAboutPage } from '../assets/js/api/about-page.js';
import { renderAbout } from '../assets/js/pages/about.js';

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

function person(index, properties = {}) {
  return {
    content: {
      id: `person-${index}`,
      contentType: 'leadershipPerson',
      properties: {
        name: `Person ${index}`,
        position: `Position ${index}`,
        biography: { markup: `<p>Biography ${index}</p>` },
        ...properties,
      },
    },
  };
}

function response(boardMembers = [], managementMembers = []) {
  return {
    id: 'about-page',
    name: 'About',
    contentType: 'aboutPage',
    properties: {
      pageTitle: 'About Us',
      introHeading: 'Energy Oman',
      introBody: { markup: '<p>Introduction</p>' },
      visionHeading: 'Vision',
      visionText: 'Vision copy',
      missionHeading: 'Mission',
      missionText: 'Mission copy',
      ceoMessage: { markup: '<p>CEO message</p>' },
      ceoName: 'CMS CEO',
      ceoPosition: 'Chief Executive Officer',
      boardHeading: 'CMS Board',
      boardMembers: { items: boardMembers },
      managementHeading: 'CMS Management',
      managementMembers: { items: managementMembers },
    },
  };
}

test('normalizes every member from both Block Lists in CMS order', () => {
  const board = Array.from({ length: 7 }, (_, index) => person(index + 1));
  const management = Array.from({ length: 11 }, (_, index) => person(index + 20));
  const page = normalizeAboutPage(response(board, management));

  assert.equal(page.leadership.board.members.length, 7);
  assert.equal(page.leadership.management.members.length, 11);
  assert.deepEqual(
    page.leadership.board.members.map((member) => member.name),
    board.map((_, index) => `Person ${index + 1}`),
  );
  assert.equal(page.ceo.name, 'CMS CEO');
});

test('normalizes optional photos and LinkedIn without inventing content', () => {
  const page = normalizeAboutPage(response([
    person(1, {
      photo: [{ name: 'Portrait', url: '/media/person.jpg' }],
      linkedinUrl: 'https://www.linkedin.com/in/example',
    }),
    person(2, { photo: null, linkedinUrl: '' }),
  ]));

  assert.equal(page.leadership.board.members[0].photo.url, '/media/person.jpg');
  assert.equal(page.leadership.board.members[0].linkedinUrl, 'https://www.linkedin.com/in/example');
  assert.equal(page.leadership.board.members[1].photo, null);
  assert.equal(page.leadership.board.members[1].linkedinUrl, '');
});

test('renderer supports missing photos and biographies of any length', () => {
  const veryLongBiography = `<p>${'Long biography sentence. '.repeat(250)}</p>`;
  const page = normalizeAboutPage(response([
    person(1, { biography: { markup: '<p>Short.</p>' }, photo: null }),
    person(2, { biography: { markup: veryLongBiography } }),
  ], [person(3)]));
  const rendered = renderAbout(page, fixtureDocument);

  assert.equal(byClass(rendered, 'profile-card').length, 3);
  assert.equal(byClass(rendered, 'profile-card__portrait__fallback').length, 3);
  assert.equal(byClass(rendered, 'leadership__tab').length, 2);
  assert.equal(byClass(rendered, 'profile-dialog').length, 1);
});

test('rejects responses for another content type', () => {
  assert.throws(
    () => normalizeAboutPage({ contentType: 'homePage', properties: {} }),
    /aboutPage contract/,
  );
});
