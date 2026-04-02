/* ============================================================
   EGR CONSULTING — MAIN.JS
   Navigation · Animations · Multi-Step Form · Analytics
   ============================================================ */

'use strict';

/* ── Sticky Nav ── */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active nav link
  const links = nav.querySelectorAll('.nav-links a');
  const path  = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* ── Mobile Menu ── */
(function initMobileMenu() {
  const hamburger  = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  function toggle() {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  hamburger.addEventListener('click', toggle);

  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) toggle();
  });
})();

/* ── AOS Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
      easing:   'ease-out-quad',
      once:     true,
      offset:   60,
    });
  }
});

/* ── Smooth Scroll for anchor links ── */
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.querySelector(anchor.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ── Multi-Step Form ── */
(function initMultiStepForm() {
  const form     = document.querySelector('#intake-form');
  if (!form) return;

  const steps      = Array.from(form.querySelectorAll('.form-step'));
  const fillBar    = form.querySelector('.progress-fill');
  const stepLabels = Array.from(form.querySelectorAll('.progress-step-label'));
  const nextBtns   = Array.from(form.querySelectorAll('[data-next]'));
  const prevBtns   = Array.from(form.querySelectorAll('[data-prev]'));
  let   current    = 0;

  function goTo(idx) {
    steps[current].classList.remove('active');
    stepLabels[current].classList.remove('active');
    stepLabels[current].classList.add('done');

    current = idx;
    steps[current].classList.add('active');
    stepLabels.forEach((l, i) => {
      l.classList.toggle('active', i === current);
      if (i < current) l.classList.add('done');
    });

    const pct = (current / (steps.length - 1)) * 100;
    if (fillBar) fillBar.style.width = pct + '%';

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(idx) {
    const step    = steps[idx];
    const inputs  = step.querySelectorAll('[required]');
    let   valid   = true;

    inputs.forEach(input => {
      input.style.borderColor = '';
      if (!input.value.trim()) {
        input.style.borderColor = '#e53e3e';
        valid = false;
      }
    });

    return valid;
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!validateStep(current)) return;
      if (current < steps.length - 1) goTo(current + 1);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (current > 0) {
        steps[current].classList.remove('active');
        current--;
        steps[current].classList.add('active');
        stepLabels.forEach((l, i) => l.classList.toggle('active', i === current));
        const pct = (current / (steps.length - 1)) * 100;
        if (fillBar) fillBar.style.width = pct + '%';
      }
    });
  });

  // Radio option selection
  form.querySelectorAll('.radio-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const group = opt.closest('.form-radio-group');
      group.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Formspree + conversion tracking
  form.addEventListener('submit', e => {
    // Fire conversion events
    if (typeof fbq === 'function')   fbq('track', 'Lead');
    if (typeof gtag === 'function')  gtag('event', 'generate_lead', { event_category: 'form', event_label: 'intake_form' });
  });
})();

/* ── Book a Call Button Tracking ── */
document.querySelectorAll('a[href="book.html"], .book-cta').forEach(el => {
  el.addEventListener('click', () => {
    if (typeof fbq === 'function')  fbq('track', 'Schedule');
    if (typeof gtag === 'function') gtag('event', 'book_call_click', { event_category: 'CTA', event_label: el.textContent.trim() });
  });
});

/* ── Contact Form ── */
(function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    if (typeof fbq === 'function')  fbq('track', 'Lead');
    if (typeof gtag === 'function') gtag('event', 'generate_lead', { event_category: 'form', event_label: 'contact_form' });
  });
})();

/* ── Thank You Page ── */
(function initThankYou() {
  if (!document.querySelector('.thankyou-hero')) return;

  if (typeof fbq === 'function')  fbq('track', 'CompleteRegistration');
  if (typeof gtag === 'function') gtag('event', 'consultation_booked', { event_category: 'conversion', event_label: 'thank_you_page' });
})();

/* ── Counter Animation ── */
(function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const end   = parseFloat(el.dataset.count);
      const dur   = 1800;
      const step  = 16;
      const inc   = end / (dur / step);
      let   cur   = 0;
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';

      const timer = setInterval(() => {
        cur += inc;
        if (cur >= end) {
          cur = end;
          clearInterval(timer);
        }
        el.textContent = prefix + (Number.isInteger(end) ? Math.round(cur) : cur.toFixed(1)) + suffix;
      }, step);

      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
})();

/* ── Calendly Embed ── */
(function initCalendly() {
  const el = document.getElementById('calendly-embed');
  if (!el) return;
  // ⚠️  REPLACE the URL below with your actual Calendly scheduling link
  // Example: 'https://calendly.com/ericgrosa/30min'
  const CALENDLY_URL = 'https://calendly.com/erickgrosa/30min';

  if (CALENDLY_URL === 'https://calendly.com/erickgrosa/30min') return; // Show placeholder until URL is set

  if (typeof Calendly !== 'undefined') {
    Calendly.initInlineWidget({
      url:    CALENDLY_URL,
      parentElement: el,
      prefill: {},
      utm: {}
    });
  }
})();

/* ── Copy email to clipboard ── */
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    });
  });
});
