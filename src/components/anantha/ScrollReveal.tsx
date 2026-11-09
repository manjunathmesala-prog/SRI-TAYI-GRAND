'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.documentElement.classList.add('js-reveal');

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.08,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const observeElements = () => {
      const selectors = [
        '.reveal-on-scroll:not(.is-revealed)',
        '.reveal-fade:not(.is-revealed)',
        '.reveal-scale:not(.is-revealed)',
        '.reveal-stagger:not(.is-revealed)',
      ].join(',');

      const elements = document.querySelectorAll(selectors);
      elements.forEach((el) => observer.observe(el));
    };

    observeElements();

    let isScheduled = false;
    const debouncedObserve = () => {
      if (isScheduled) return;
      isScheduled = true;
      requestAnimationFrame(() => {
        observeElements();
        isScheduled = false;
      });
    };

    const mutationObserver = new MutationObserver(() => {
      debouncedObserve();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
