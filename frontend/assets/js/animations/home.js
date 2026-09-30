import { gsap } from 'gsap';
import { revealAll } from './reveal.js';

export function initHomeAnimations(root) {
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hero = root.querySelector('.home-hero');
  const heroMedia = hero?.querySelector('.home-hero__media');
  const heroContent = hero?.querySelector('.home-hero__content');
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (heroMedia) {
    timeline.fromTo(heroMedia, { scale: 1.08 }, { duration: 1.5, scale: 1 }, 0);
  }
  if (heroContent) {
    timeline.fromTo(heroContent, { autoAlpha: 0, y: 38 }, {
      autoAlpha: 1,
      duration: 0.9,
      y: 0,
    }, 0.15);
  }

  revealAll(root);

  const milestoneItems = [...root.querySelectorAll('.milestone')];
  const milestoneSection = root.querySelector('.milestones');
  if (!milestoneSection || !milestoneItems.length || typeof IntersectionObserver !== 'function') return;

  gsap.set(milestoneItems, { autoAlpha: 0, y: 24 });
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    gsap.to(milestoneItems, {
      autoAlpha: 1,
      duration: 0.65,
      ease: 'power2.out',
      stagger: 0.08,
      y: 0,
    });
    observer.disconnect();
  }, { rootMargin: '0px 0px -8%', threshold: 0.12 });
  observer.observe(milestoneSection);
}
