import { CMS_URL } from '../config.js';
import { getAboutPage } from '../api/about-page.js';
import { reveal, revealAll } from '../animations/reveal.js';
import { renderError, renderLoading } from '../components/render-state.js';

function element(documentRef, tag, className, text) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function absoluteMediaUrl(media) {
  if (!media?.url) return '';
  try {
    return new URL(media.url, CMS_URL).toString();
  } catch {
    return '';
  }
}

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function appendRichText(documentRef, target, markup, className = 'rich-text') {
  if (!markup) return false;
  const content = element(documentRef, 'div', className);
  content.innerHTML = markup;
  target.append(content);
  return true;
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function createPortrait(documentRef, media, name, className) {
  const frame = element(documentRef, 'div', className);
  const url = absoluteMediaUrl(media);
  if (url) {
    const image = element(documentRef, 'img');
    image.src = url;
    image.alt = name ? `${name} portrait` : '';
    image.loading = 'lazy';
    frame.append(image);
  } else {
    const fallback = element(documentRef, 'span', `${className}__fallback`, initials(name));
    fallback.setAttribute('aria-hidden', 'true');
    frame.append(fallback);
  }
  return frame;
}

function createHero(documentRef, title) {
  const hero = element(documentRef, 'header', 'page-hero about-hero');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'h1', '', title);
  container.append(heading);
  hero.append(container);
  return hero;
}

function createIntroduction(documentRef, introduction) {
  if (!introduction.heading && !introduction.body && !introduction.media) return null;

  const section = element(documentRef, 'section', 'section about-introduction');
  if (introduction.heading) section.setAttribute('aria-labelledby', 'about-introduction-title');
  else section.setAttribute('aria-label', 'Introduction');
  section.setAttribute('data-reveal', '');
  const container = element(documentRef, 'div', 'container about-introduction__grid');
  const content = element(documentRef, 'div', 'about-introduction__content');
  if (introduction.heading) {
    const eyebrow = element(documentRef, 'span', 'eyebrow', 'About us');
    const heading = element(documentRef, 'h2', '', introduction.heading);
    heading.id = 'about-introduction-title';
    content.append(eyebrow, heading);
  }
  appendRichText(documentRef, content, introduction.body, 'about-introduction__body rich-text');
  container.append(content);

  const imageUrl = absoluteMediaUrl(introduction.media);
  if (imageUrl) {
    const figure = element(documentRef, 'figure', 'about-introduction__media');
    const image = element(documentRef, 'img');
    image.src = imageUrl;
    image.alt = introduction.media?.name || '';
    image.loading = 'lazy';
    figure.append(image);
    container.append(figure);
  }

  section.append(container);
  return section;
}

function createPurpose(documentRef, vision, mission) {
  const statements = [vision, mission].filter((item) => item.heading || item.text);
  if (!statements.length) return null;

  const section = element(documentRef, 'section', 'about-purpose');
  section.setAttribute('aria-label', 'Vision and mission');
  const container = element(documentRef, 'div', 'container about-purpose__grid');

  statements.forEach((statement, index) => {
    const article = element(documentRef, 'article', 'about-purpose__card');
    article.setAttribute('data-reveal', '');
    article.append(element(documentRef, 'span', 'about-purpose__number', String(index + 1).padStart(2, '0')));
    if (statement.heading) article.append(element(documentRef, 'h2', '', statement.heading));
    if (statement.text) article.append(element(documentRef, 'p', '', statement.text));
    container.append(article);
  });

  section.append(container);
  return section;
}

function createCeo(documentRef, ceo) {
  if (!ceo.message && !ceo.name && !ceo.position && !ceo.image) return null;

  const section = element(documentRef, 'section', 'section ceo-message');
  section.setAttribute('aria-labelledby', 'ceo-message-title');
  const container = element(documentRef, 'div', 'container ceo-message__grid');
  const portrait = createPortrait(documentRef, ceo.image, ceo.name, 'ceo-message__portrait');
  portrait.setAttribute('data-reveal', '');

  const content = element(documentRef, 'div', 'ceo-message__content');
  content.setAttribute('data-reveal', '');
  content.append(element(documentRef, 'span', 'eyebrow', 'Leadership'));
  const heading = element(documentRef, 'h2', '', "CEO's Message");
  heading.id = 'ceo-message-title';
  content.append(heading);
  appendRichText(documentRef, content, ceo.message, 'ceo-message__quote rich-text');
  if (ceo.name || ceo.position) {
    const signature = element(documentRef, 'div', 'ceo-message__signature');
    if (ceo.name) signature.append(element(documentRef, 'strong', '', ceo.name));
    if (ceo.position) signature.append(element(documentRef, 'span', '', ceo.position));
    content.append(signature);
  }

  container.append(portrait, content);
  section.append(container);
  return section;
}

function createMemberCard(documentRef, member, group, index) {
  const article = element(documentRef, 'article', 'profile-card');
  article.setAttribute('data-reveal', '');
  const trigger = element(documentRef, 'button', 'profile-card__trigger');
  trigger.type = 'button';
  trigger.dataset.profileGroup = group;
  trigger.dataset.profileIndex = String(index);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-label', member.name ? `View profile for ${member.name}` : 'View team member profile');

  trigger.append(createPortrait(documentRef, member.photo, member.name, 'profile-card__portrait'));
  const content = element(documentRef, 'span', 'profile-card__content');
  if (member.name) content.append(element(documentRef, 'strong', 'profile-card__name', member.name));
  if (member.position) content.append(element(documentRef, 'span', 'profile-card__position', member.position));
  content.append(element(documentRef, 'span', 'profile-card__action', 'View profile'));
  trigger.append(content);
  article.append(trigger);
  return article;
}

function createProfilePanel(documentRef, group, panelId, labelId, selected) {
  const panel = element(documentRef, 'div', 'leadership__panel');
  panel.id = panelId;
  panel.dataset.profilePanel = group.key;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', labelId);
  panel.hidden = !selected;

  const grid = element(documentRef, 'div', 'leadership__grid');
  group.members.forEach((member, index) => grid.append(createMemberCard(documentRef, member, group.key, index)));
  panel.append(grid);
  return panel;
}

function createProfileDialog(documentRef) {
  const overlay = element(documentRef, 'div', 'profile-dialog');
  overlay.dataset.profileDialog = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'profile-dialog-name');
  overlay.hidden = true;

  const dialog = element(documentRef, 'div', 'profile-dialog__window');
  const close = element(documentRef, 'button', 'profile-dialog__close', '×');
  close.type = 'button';
  close.dataset.profileClose = '';
  close.setAttribute('aria-label', 'Close profile');
  const layout = element(documentRef, 'div', 'profile-dialog__layout');
  const portrait = element(documentRef, 'div', 'profile-dialog__portrait');
  portrait.dataset.profilePortrait = '';
  const content = element(documentRef, 'div', 'profile-dialog__content');
  const name = element(documentRef, 'h2', '', '');
  name.id = 'profile-dialog-name';
  name.dataset.profileName = '';
  const position = element(documentRef, 'p', 'profile-dialog__position');
  position.dataset.profilePosition = '';
  const biography = element(documentRef, 'div', 'profile-dialog__biography rich-text');
  biography.dataset.profileBiography = '';
  const linkedin = element(documentRef, 'a', 'profile-dialog__linkedin', 'LinkedIn');
  linkedin.dataset.profileLinkedin = '';
  linkedin.target = '_blank';
  linkedin.rel = 'noopener noreferrer';
  content.append(name, position, biography, linkedin);
  layout.append(portrait, content);
  dialog.append(close, layout);
  overlay.append(dialog);
  return overlay;
}

function createLeadership(documentRef, leadership) {
  const groups = [
    { key: 'board', ...leadership.board },
    { key: 'management', ...leadership.management },
  ].filter((group) => group.members.length);
  if (!groups.length) return null;

  const section = element(documentRef, 'section', 'section section--soft leadership');
  section.setAttribute('aria-labelledby', 'leadership-title');
  const container = element(documentRef, 'div', 'container');
  const heading = element(documentRef, 'div', 'section-heading');
  heading.append(element(documentRef, 'span', 'eyebrow', 'Our team'));
  const title = element(documentRef, 'h2', '', groups[0].heading || 'Leadership');
  title.id = 'leadership-title';
  heading.append(title);
  container.append(heading);

  if (groups.length > 1) {
    const tabs = element(documentRef, 'div', 'leadership__tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Leadership groups');
    groups.forEach((group, index) => {
      const tab = element(documentRef, 'button', 'leadership__tab', group.heading || 'Team');
      tab.type = 'button';
      tab.id = `leadership-${group.key}-tab`;
      tab.dataset.profileTab = group.key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `leadership-${group.key}-panel`);
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
      tabs.append(tab);
    });
    container.append(tabs);
  }

  groups.forEach((group, index) => {
    container.append(createProfilePanel(
      documentRef,
      group,
      `leadership-${group.key}-panel`,
      groups.length > 1 ? `leadership-${group.key}-tab` : 'leadership-title',
      index === 0,
    ));
  });
  container.append(createProfileDialog(documentRef));
  section.append(container);
  return section;
}

export function renderAbout(page, documentRef = document) {
  const fragment = documentRef.createDocumentFragment();
  [
    createHero(documentRef, page.pageTitle),
    createIntroduction(documentRef, page.introduction),
    createPurpose(documentRef, page.vision, page.mission),
    createCeo(documentRef, page.ceo),
    createLeadership(documentRef, page.leadership),
  ].filter(Boolean).forEach((section) => fragment.append(section));
  return fragment;
}

function initTabs(root) {
  const tabs = [...root.querySelectorAll('[data-profile-tab]')];
  if (!tabs.length) return;

  const selectTab = (selected, focus = false) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = root.querySelector(`[data-profile-panel="${tab.dataset.profileTab}"]`);
      if (panel) panel.hidden = !active;
    });
    const title = root.querySelector('#leadership-title');
    if (title) title.textContent = selected.textContent;
    if (focus) selected.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      selectTab(tabs[nextIndex], true);
    });
  });
}

function initProfileDialog(root, leadership) {
  const overlay = root.querySelector('[data-profile-dialog]');
  if (!overlay) return;
  const closeButton = overlay.querySelector('[data-profile-close]');
  const portrait = overlay.querySelector('[data-profile-portrait]');
  const name = overlay.querySelector('[data-profile-name]');
  const position = overlay.querySelector('[data-profile-position]');
  const biography = overlay.querySelector('[data-profile-biography]');
  const linkedin = overlay.querySelector('[data-profile-linkedin]');
  let returnFocus = null;

  const close = () => {
    overlay.hidden = true;
    document.body.classList.remove('profile-open');
    returnFocus?.focus();
  };

  const open = (member, trigger) => {
    returnFocus = trigger;
    portrait.replaceChildren(createPortrait(document, member.photo, member.name, 'profile-dialog__portrait-frame'));
    name.textContent = member.name;
    name.hidden = !member.name;
    position.textContent = member.position;
    position.hidden = !member.position;
    biography.innerHTML = member.biography;
    biography.hidden = !member.biography;
    const linkedinUrl = safeExternalUrl(member.linkedinUrl);
    linkedin.hidden = !linkedinUrl;
    if (linkedinUrl) linkedin.href = linkedinUrl;
    else linkedin.removeAttribute('href');
    overlay.hidden = false;
    document.body.classList.add('profile-open');
    globalThis.requestAnimationFrame?.(() => closeButton.focus());
  };

  root.querySelectorAll('[data-profile-index]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const members = leadership[trigger.dataset.profileGroup]?.members || [];
      const member = members[Number(trigger.dataset.profileIndex)];
      if (member) open(member, trigger);
    });
  });
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('a[href], button:not([disabled])')]
      .filter((node) => !node.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

export function initAboutInteractions(root, leadership) {
  initTabs(root);
  initProfileDialog(root, leadership);
}

export async function initAbout(target) {
  renderLoading(target, 'Loading the About page…');
  try {
    const page = await getAboutPage();
    document.title = page.pageTitle || page.name;
    target.replaceChildren(renderAbout(page));
    initAboutInteractions(target, page.leadership);
    reveal(target.querySelector('.about-hero h1'));
    revealAll(target);
  } catch (error) {
    renderError(target, error, 'The About page is temporarily unavailable.');
  }
}
