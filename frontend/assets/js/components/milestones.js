import { CMS_URL } from '../config.js';

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

export function createMilestones(milestones, documentRef = document) {
  const items = milestones?.items || [];
  if (!items.length) return null;

  const section = element(documentRef, 'section', 'section milestones');
  const headingId = 'milestones-title';
  section.setAttribute('aria-labelledby', headingId);

  const container = element(documentRef, 'div', 'container');
  const header = element(documentRef, 'div', 'milestones__header');
  const heading = element(documentRef, 'div', 'section-heading section-heading--left');
  const title = element(documentRef, 'h2', '', milestones.heading);
  title.id = headingId;
  heading.append(title);

  const controls = element(documentRef, 'div', 'milestones__controls');
  const previous = element(documentRef, 'button', 'carousel-button', '←');
  previous.type = 'button';
  previous.setAttribute('aria-label', 'Previous milestones');
  const next = element(documentRef, 'button', 'carousel-button', '→');
  next.type = 'button';
  next.setAttribute('aria-label', 'Next milestones');
  const hasMultipleItems = items.length > 1;
  previous.disabled = !hasMultipleItems;
  next.disabled = !hasMultipleItems;
  controls.append(previous, next);
  header.append(heading, controls);

  const track = element(documentRef, 'ol', 'milestones__track');
  track.setAttribute('aria-label', milestones.heading || 'Milestones');

  items.forEach((item, index) => {
    const milestone = element(documentRef, 'li', 'milestone');
    milestone.dataset.sequence = String(item.sequenceNumber ?? index + 1);
    milestone.setAttribute('data-milestone-index', String(index));

    const imageUrl = absoluteMediaUrl(item.image);
    if (imageUrl) {
      const figure = element(documentRef, 'figure', 'milestone__media');
      const image = element(documentRef, 'img');
      image.src = imageUrl;
      image.alt = item.dateLabel ? `${item.dateLabel} milestone` : 'Milestone';
      image.loading = 'lazy';
      figure.append(image);
      milestone.append(figure);
    }

    if (item.dateLabel) {
      milestone.append(element(documentRef, 'time', 'milestone__date', item.dateLabel));
    }

    const marker = element(documentRef, 'span', 'milestone__marker');
    marker.setAttribute('aria-hidden', 'true');
    marker.append(element(documentRef, 'span', '', item.sequenceNumber ?? index + 1));
    milestone.append(marker);

    if (item.description) {
      milestone.append(element(documentRef, 'p', 'milestone__description', item.description));
    }
    track.append(milestone);
  });

  const updateControls = () => {
    if (!hasMultipleItems) return;
    const position = Math.abs(track.scrollLeft);
    const maximum = Math.max(track.scrollWidth - track.clientWidth, 0);
    previous.disabled = position <= 1;
    next.disabled = position >= maximum - 1;
  };
  const move = (direction) => {
    const inlineDirection = documentRef.documentElement?.dir === 'rtl' ? -1 : 1;
    track.scrollBy({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      left: direction * inlineDirection * Math.max(track.clientWidth * 0.72, 280),
    });
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', updateControls, { passive: true });
  globalThis.requestAnimationFrame?.(updateControls);

  container.append(header, track);
  section.append(container);
  return section;
}
