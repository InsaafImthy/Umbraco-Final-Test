import { CMS_URL } from '../config.js';
import { getSiteSettings, SITE_SETTINGS_ID } from '../api/site-settings.js';
import { cultureUrl, getCurrentCulture, withCurrentCulture } from '../localization.js';

const MOBILE_BREAKPOINT = window.matchMedia('(max-width: 70rem)');
const FALLBACK_SETTINGS = {
  siteName: 'Site',
  logo: null,
  logoLight: null,
  navigation: [],
  address: '',
  telephone: '',
  email: '',
  poBox: '',
  socialLinks: [],
  footerLinks: [],
  copyrightText: '',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
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

function frontendHref(href) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href)) return href;

  const clean = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const routes = {
    '/about-us': '/about.html',
    '/careers': '/careers.html',
    '/media': '/media/',
    '/investor-relations': '/investor-relations.html',
    '/contact-us': '/contact.html',
  };
  return withCurrentCulture(routes[clean] || href);
}

function isCurrentHref(href) {
  const current = window.location.pathname.replace(/\/+$/, '') || '/';
  const target = frontendHref(href)?.replace(/\/+$/, '') || '/';
  return current === target || (target !== '/' && current.startsWith(`${target}/`));
}

function createBrand(settings, light = false) {
  const link = element('a', light ? 'site-footer__brand' : 'site-brand');
  link.href = withCurrentCulture('/');
  link.setAttribute('aria-label', `${settings.siteName}: home`);

  const media = light ? settings.logoLight : settings.logo;
  const mediaUrl = absoluteMediaUrl(media);
  if (mediaUrl) {
    const image = document.createElement('img');
    image.src = mediaUrl;
    image.alt = settings.siteName;
    image.decoding = 'async';
    link.append(image);
  } else {
    const name = element('span', 'site-brand__name', settings.siteName);
    link.append(name);
  }
  return link;
}

function socialAbbreviation(label) {
  return label.trim().slice(0, 2);
}

function createSocialLinks(links) {
  const list = element('ul', 'social-links');
  links.forEach((item) => {
    const entry = document.createElement('li');
    const link = element('a', 'social-link', socialAbbreviation(item.label));
    link.href = item.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${item.label} (opens in a new tab)`);
    entry.append(link);
    list.append(entry);
  });
  return list;
}

function createLanguageControl() {
  const culture = getCurrentCulture();
  const language = element('div', 'language');
  const toggle = element('button', 'language-control');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'language-menu');
  toggle.setAttribute('aria-label', 'Choose language');
  toggle.textContent = culture === 'ar' ? 'Arabic' : 'English';

  const menu = element('ul', 'language-menu');
  menu.id = 'language-menu';
  menu.hidden = true;
  [
    { code: 'en', label: 'English', direction: 'ltr' },
    { code: 'ar', label: 'Arabic', direction: 'rtl' },
  ].forEach(({ code, label, direction }) => {
    const item = document.createElement('li');
    const link = element('a', '', label);
    link.href = cultureUrl(code);
    link.lang = code;
    link.dir = direction;
    if (code === culture) link.setAttribute('aria-current', 'true');
    item.append(link);
    menu.append(item);
  });
  language.append(toggle, menu);

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
  });

  language.addEventListener('focusout', (event) => {
    if (language.contains(event.relatedTarget)) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  });
  language.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.hidden) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    toggle.focus();
  });
  return language;
}

function createNavigation(items) {
  const navigation = element('nav', 'primary-navigation');
  navigation.id = 'primary-navigation';
  navigation.setAttribute('aria-label', 'Primary navigation');
  const list = element('ul', 'primary-navigation__list');

  items.forEach((item) => {
    const listItem = element('li', 'primary-navigation__item');
    const link = element('a', 'primary-navigation__link', item.label);
    link.href = frontendHref(item.href);
    if (item.target) {
      link.target = item.target;
      if (item.target === '_blank') link.rel = 'noopener noreferrer';
    }
    if (isCurrentHref(item.href)) link.setAttribute('aria-current', 'page');
    listItem.append(link);
    list.append(listItem);
  });
  navigation.append(list);
  return navigation;
}

function createMenuToggle(navigation) {
  const toggle = element('button', 'menu-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', navigation.id);
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.append(element('span'), element('span'), element('span'), element('span', 'visually-hidden', 'Menu'));

  const setOpen = (open, restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.toggleAttribute('data-open', open);
    document.body.classList.toggle('navigation-open', open);
    if (open) navigation.querySelector('a, button')?.focus();
    if (!open && restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a') && MOBILE_BREAKPOINT.matches) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (event.key === 'Escape' && open) {
      setOpen(false, true);
      return;
    }
    if (event.key !== 'Tab' || !open || !MOBILE_BREAKPOINT.matches) return;
    const focusable = [...navigation.querySelectorAll('a[href], button:not([disabled])')]
      .filter((item) => item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  MOBILE_BREAKPOINT.addEventListener('change', (event) => {
    if (!event.matches) setOpen(false);
  });
  return toggle;
}

function createHeader(settings) {
  const fragment = document.createDocumentFragment();
  const utility = element('div', 'utility-bar');
  const utilityInner = element('div', 'container utility-bar__inner');
  const contact = element('div', 'utility-bar__contact');

  if (settings.poBox) {
    const address = element('span', 'utility-link');
    address.append(element('span', 'utility-link__icon', '●'), document.createTextNode(settings.poBox));
    contact.append(address);
  }
  if (settings.email) {
    const email = element('a', 'utility-link');
    email.href = `mailto:${settings.email}`;
    email.append(element('span', 'utility-link__icon', '✉'), document.createTextNode(settings.email));
    contact.append(email);
  }

  const actions = element('div', 'utility-bar__actions');
  actions.append(createLanguageControl());
  if (settings.socialLinks.length) actions.append(createSocialLinks(settings.socialLinks));
  utilityInner.append(contact, actions);
  utility.append(utilityInner);

  const main = element('div', 'main-header');
  const mainInner = element('div', 'container main-header__inner');
  mainInner.append(createBrand(settings));
  if (settings.navigation.length) {
    const navigation = createNavigation(settings.navigation);
    mainInner.append(navigation, createMenuToggle(navigation));
  }
  main.append(mainInner);
  fragment.append(utility, main);
  return fragment;
}

function createFooter(settings) {
  const main = element('div', 'container site-footer__main');
  const about = element('div', 'site-footer__about');
  about.append(createBrand(settings, true));
  if (settings.address) about.append(element('p', 'site-footer__intro', settings.address));

  const footerColumns = [about];
  if (settings.footerLinks.length) {
    const linksColumn = element('nav');
    linksColumn.setAttribute('aria-label', 'Footer navigation');
    const links = element('ul', 'site-footer__links');
    settings.footerLinks.forEach((item) => {
      const row = document.createElement('li');
      const link = element('a', '', item.label);
      link.href = frontendHref(item.href);
      if (item.target) {
        link.target = item.target;
        if (item.target === '_blank') link.rel = 'noopener noreferrer';
      }
      row.append(link);
      links.append(row);
    });
    linksColumn.append(links);
    footerColumns.push(linksColumn);
  }

  const contactItems = [
    settings.telephone ? { label: settings.telephone, href: `tel:${settings.telephone.replace(/\s/g, '')}` } : null,
    settings.email ? { label: settings.email, href: `mailto:${settings.email}` } : null,
    settings.poBox ? { label: settings.poBox } : null,
  ].filter(Boolean);
  if (contactItems.length || settings.socialLinks.length) {
    const contactColumn = document.createElement('address');
    contactColumn.setAttribute('aria-label', 'Contact information');
    if (contactItems.length) {
      const contactList = element('ul', 'site-footer__contact');
      contactItems.forEach((item) => {
        const row = document.createElement('li');
        if (item.href) {
          const link = element('a', '', item.label);
          link.href = item.href;
          row.append(link);
        } else {
          row.textContent = item.label;
        }
        contactList.append(row);
      });
      contactColumn.append(contactList);
    }
    if (settings.socialLinks.length) contactColumn.append(createSocialLinks(settings.socialLinks));
    footerColumns.push(contactColumn);
  }
  main.append(...footerColumns);

  const bottom = element('div', 'container site-footer__bottom');
  bottom.append(element('span', '', settings.copyrightText));
  return [main, bottom];
}

function renderShell(header, footer, settings) {
  header.replaceChildren(createHeader(settings));
  footer.replaceChildren(...createFooter(settings));
}

export async function initSiteShell() {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  if (!header || !footer) return;

  renderShell(header, footer, FALLBACK_SETTINGS);

  try {
    const settings = await getSiteSettings();
    renderShell(header, footer, settings);
    return settings;
  } catch (error) {
    console.error(
      `Unable to load Site Settings (${SITE_SETTINGS_ID}); using the structural shell fallback.`,
      error,
    );
    header.setAttribute('data-content-unavailable', 'true');
    footer.setAttribute('data-content-unavailable', 'true');
    return null;
  }
}
