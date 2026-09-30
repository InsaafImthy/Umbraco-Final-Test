import { gsap } from 'gsap';

export function reveal(element) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
    autoAlpha: 1,
    duration: 0.7,
    ease: 'power2.out',
    y: 0,
  });
}

export function revealAll(root = document) {
  const elements = [...root.querySelectorAll('[data-reveal]')];
  if (!elements.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver !== 'function') return;

  gsap.set(elements, { autoAlpha: 0, y: 28 });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      gsap.to(entry.target, {
        autoAlpha: 1,
        duration: 0.75,
        ease: 'power2.out',
        y: 0,
      });
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8%', threshold: 0.12 });

  elements.forEach((element) => observer.observe(element));
}
