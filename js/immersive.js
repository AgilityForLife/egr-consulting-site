/* ============================================================
   EGR CONSULTING — IMMERSIVE.JS
   Reusable, data-attribute-driven scrollytelling engine.
   Built on GSAP 3.12.x + ScrollTrigger (loaded via CDN before this file).

   Activation: only runs if <body data-immersive> is present.

   ── Public API (data attributes) ──────────────────────────────
   [data-scene]        Section entrance (fade/rise/scale in on enter).
   [data-zoom-bg]       Container whose [data-zoom-layer] child (or
                        .zoom-layer fallback) scrubs scale 1 -> 1.18
                        across the section's scroll ("breathing" bg).
   [data-zoom-layer]    The layer inside a [data-zoom-bg] that zooms.
   [data-tunnel-exit]   Hero pins + scrub-zooms/blurs/fades out so the
                        page feels like it's tunneling through the hero.
   [data-tunnel]        Container with 3+ [data-tunnel-item] children;
                        pins and scrubs items through z-space like a
                        tunnel flythrough (desktop only). Non-desktop:
                        renders as a normal stacked list — engine must
                        NOT hide/alter items on those tiers.
   [data-tunnel-item]   Individual card inside [data-tunnel].
   [data-parallax]      Scrubbed y-parallax. Optional [data-speed]
                        (default 0.18).
   [data-words]         Splits textContent into word spans and staggers
                        them in on enter. Skipped if element has child
                        elements (only pure-text nodes supported).
   [data-magnetic]      Magnetic button pull toward cursor (desktop only).

   ── Responsive tiers (gsap.matchMedia) ─────────────────────────
   Desktop  (min-width:1024px) and (prefers-reduced-motion:no-preference)
            and (pointer:fine)                → full effects.
   Tablet   (min-width:768px) and (max-width:1023px)
            and (prefers-reduced-motion:no-preference)
                                               → scenes + bg zoom only,
                                                 no pinning.
   Mobile   (max-width:767px)
            and (prefers-reduced-motion:no-preference)
                                               → simple fade/rise scenes
                                                 only.
   Reduced motion                              → no JS effects; inline
                                                 transforms/opacity are
                                                 cleared so content is
                                                 fully visible.

   ── AOS coexistence rule ───────────────────────────────────────
   An element must never carry BOTH data-aos and data-scene — that
   would double-animate it. This engine enforces that defensively by
   skipping any [data-scene] element that still has a data-aos
   attribute (it is left entirely to AOS instead). The authoritative
   fix, however, is authorial: pages should simply not put both
   attributes on the same element. See index.html for the pattern
   (top-level sections use data-scene with data-aos removed; inner
   elements keep data-aos).
   ============================================================ */

(function () {
  'use strict';

  if (!document.body.hasAttribute('data-immersive')) return;
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ── Scroll progress bar (inject once) ── */
  function initProgressBar() {
    if (document.querySelector('.scroll-progress')) return;

    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    var fill = document.createElement('div');
    fill.className = 'scroll-progress-fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    if (typeof ScrollTrigger === 'undefined') return;

    gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' });
    ScrollTrigger.create({
      start: 0,
      end: function () {
        return document.documentElement.scrollHeight - window.innerHeight;
      },
      scrub: 0.3,
      onUpdate: function (self) {
        gsap.set(fill, { scaleX: self.progress });
      },
    });
  }

  /* ── Nav hide/reveal on scroll direction ── */
  function initNavHide() {
    var nav = document.querySelector('.nav');
    if (!nav || typeof ScrollTrigger === 'undefined') return;

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: function (self) {
        var mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu && mobileMenu.classList.contains('open')) return;

        if (self.scroll() > 400 && self.direction === 1) {
          nav.classList.add('nav-hidden');
        } else if (self.direction === -1) {
          nav.classList.remove('nav-hidden');
        }
      },
    });
  }

  /* ── [data-scene] section entrances ── */
  function initScenes(context) {
    var scenes = gsap.utils.toArray('[data-scene]').filter(function (el) {
      // AOS coexistence rule: never double-animate an element that
      // still carries data-aos — leave it entirely to AOS.
      return !el.hasAttribute('data-aos');
    });

    scenes.forEach(function (el) {
      // Sections that contain a pinned ScrollTrigger element (tunnel
      // container/exit) must not be left with an inline transform —
      // any transform on an ancestor creates a new containing block
      // and breaks position:fixed pinning for descendants. clearProps
      // removes the transform once the entrance settles at scale:1.
      var hasPinnedDescendant = !!el.querySelector('[data-tunnel], [data-tunnel-exit]');

      gsap.set(el, { opacity: 0, y: 48, scale: 0.96 });

      gsap.to(el, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        clearProps: hasPinnedDescendant ? 'transform' : undefined,
        scrollTrigger: {
          trigger: el,
          start: 'top 78%',
          once: true,
        },
      });
    });
  }

  /* ── Simple mobile-tier fade/rise scenes (no scale, cheaper) ── */
  function initSimpleScenes() {
    var scenes = gsap.utils.toArray('[data-scene]').filter(function (el) {
      return !el.hasAttribute('data-aos');
    });

    scenes.forEach(function (el) {
      var hasPinnedDescendant = !!el.querySelector('[data-tunnel], [data-tunnel-exit]');

      gsap.set(el, { opacity: 0, y: 24 });

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: hasPinnedDescendant ? 'transform' : undefined,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      });
    });
  }

  /* ── [data-zoom-bg] background breathing zoom ── */
  function initZoomBg() {
    var sections = gsap.utils.toArray('[data-zoom-bg]');

    sections.forEach(function (section) {
      var layer = section.querySelector('[data-zoom-layer]') || section.querySelector('.zoom-layer');
      if (!layer) return;

      gsap.set(layer, { scale: 1, transformOrigin: 'center center' });

      gsap.to(layer, {
        scale: 1.18,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      });
    });
  }

  /* ── [data-tunnel-exit] hero pin + zoom-through ── */
  function initTunnelExit() {
    var hero = document.querySelector('[data-tunnel-exit]');
    if (!hero) return;

    var layer = hero.querySelector('[data-zoom-layer]');

    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: '+=60%',
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.8,
      onUpdate: function (self) {
        var p = self.progress;
        gsap.set(hero, {
          scale: 1 + p * 0.45,
          opacity: 1 - p,
          filter: 'blur(' + (p * 6).toFixed(2) + 'px)',
        });
      },
      onLeave: function () {
        gsap.set(hero, { opacity: 0 });
      },
      onLeaveBack: function () {
        gsap.set(hero, { opacity: 1 });
      },
    });

    if (layer) {
      gsap.set(layer, { scale: 1, transformOrigin: 'center center' });
      gsap.to(layer, {
        scale: 1.2,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=60%',
          scrub: 0.8,
        },
      });
    }
  }

  /* ── [data-brand-bridge] EGR mark + sprint-cycle ring ──
     Choreography (scrubbed on desktop, timed once on tablet/mobile):
       1. EGR mark scales 0.55 -> 1, opacity 0 -> 1 (continues the
          hero's tunnel z-motion into the dark bridge section).
       2. Ring draws itself via stroke-dashoffset (pathLength-based)
          while rotating slightly 0 -> 45deg.
       3. The 4 node dots + labels light up in a clockwise stagger
          (opacity .25 -> 1, small scale pop).
       4. Tagline fades up last.
     Reversible on desktop since the whole thing lives on one
     scrubbed timeline. ── */
  function setupBrandRingGeometry(section) {
    var path = section.querySelector('[data-ring-path]');
    if (!path) return null;

    var length = 0;
    try {
      length = path.getTotalLength();
    } catch (err) {
      length = 1445; // fallback ~ circumference of r=230 circle
    }

    path.style.strokeDasharray = length;
    return length;
  }

  function initBrandBridge(mm) {
    var section = document.querySelector('[data-brand-bridge]');
    if (!section) return;

    var ringWrap = section.querySelector('[data-brand-ring-wrap]');
    var mark = section.querySelector('.brand-bridge-mark');
    var nodes = gsap.utils.toArray('[data-ring-node]', section);
    var arrows = gsap.utils.toArray('[data-ring-arrow]', section);
    var labels = gsap.utils.toArray('[data-brand-label]', section);
    var mobileLabels = gsap.utils.toArray('[data-brand-label-mobile]', section);
    var tagline = section.querySelector('[data-brand-tagline]');
    var length = setupBrandRingGeometry(section);
    var path = section.querySelector('[data-ring-path]');

    if (!mark || !path) return;

    var allDots = nodes.concat(arrows);

    function buildTimeline() {
      var tl = gsap.timeline({ paused: true });

      tl.fromTo(mark, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);

      if (length) {
        tl.fromTo(path, { strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.5, ease: 'none' }, 0.05);
      }
      if (ringWrap) {
        tl.fromTo(ringWrap, { rotate: 0 }, { rotate: 45, duration: 0.55, ease: 'none', transformOrigin: 'center center' }, 0.05);
      }

      if (allDots.length) {
        tl.fromTo(
          allDots,
          { opacity: 0.25, scale: 0.7, transformOrigin: 'center center' },
          { opacity: 1, scale: 1, duration: 0.28, stagger: 0.08, ease: 'back.out(2)' },
          0.3
        );
      }
      if (labels.length) {
        tl.fromTo(
          labels,
          { opacity: 0.25, scale: 0.85, transformOrigin: 'center center' },
          { opacity: 1, scale: 1, duration: 0.28, stagger: 0.08, ease: 'back.out(2)' },
          0.3
        );
      }
      if (mobileLabels.length) {
        tl.fromTo(
          mobileLabels,
          { opacity: 0.25, y: 8 },
          { opacity: 1, y: 0, duration: 0.28, stagger: 0.08, ease: 'power2.out' },
          0.3
        );
      }

      if (tagline) {
        tl.fromTo(tagline, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.68);
      }

      return tl;
    }

    // Initial state so there's no flash-of-final-state before the
    // ScrollTrigger/timeline takes over.
    gsap.set(mark, { scale: 0.55, opacity: 0 });
    if (length) gsap.set(path, { strokeDashoffset: length });
    if (allDots.length) gsap.set(allDots, { opacity: 0.25, scale: 0.7 });
    if (labels.length) gsap.set(labels, { opacity: 0.25, scale: 0.85 });
    if (mobileLabels.length) gsap.set(mobileLabels, { opacity: 0.25, y: 8 });
    if (tagline) gsap.set(tagline, { opacity: 0, y: 20 });

    if (mm.conditions.desktop) {
      var tl = buildTimeline();
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=120%',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.8,
        animation: tl,
      });
    } else if (mm.conditions.tablet) {
      var tlTablet = buildTimeline();
      tlTablet.timeScale(1 / 1.4); // stretch to ~1.4s total duration
      ScrollTrigger.create({
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none none',
        onEnter: function () {
          tlTablet.play(0);
        },
      });
    } else if (mm.conditions.mobile) {
      // Simple fade/rise entrance for the whole section; ring is
      // pre-drawn (no scrub-driven stroke animation on mobile).
      if (length) gsap.set(path, { strokeDashoffset: 0 });
      gsap.set(mark, { scale: 1, opacity: 0 });
      if (allDots.length) gsap.set(allDots, { opacity: 1, scale: 1 });
      if (labels.length) gsap.set(labels, { opacity: 1, scale: 1 });

      gsap.set(section, { opacity: 0, y: 32 });
      gsap.to(section, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 88%',
          once: true,
        },
      });
      gsap.to(mark, {
        opacity: 1,
        duration: 0.6,
        delay: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 88%',
          once: true,
        },
      });
      if (mobileLabels.length) {
        gsap.set(mobileLabels, { opacity: 1, y: 0 });
      }
      if (tagline) {
        gsap.fromTo(
          tagline,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: 0.25,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 88%',
              once: true,
            },
          }
        );
      }
    }
  }

  /* ── [data-tunnel] pinned flythrough sequence (desktop only) ── */
  function initTunnel() {
    var containers = gsap.utils.toArray('[data-tunnel]');

    containers.forEach(function (container) {
      var items = gsap.utils.toArray('[data-tunnel-item]', container);
      if (items.length < 3) return;

      gsap.set(items, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        scale: 0.55,
      });
      gsap.set(container, { position: 'relative' });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: '+=' + items.length * 100 + '%',
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.8,
        },
      });

      items.forEach(function (item, i) {
        var segment = 1 / items.length;
        var start = i * segment;

        tl.fromTo(
          item,
          { scale: 0.55, opacity: 0 },
          { scale: 1, opacity: 1, duration: segment * 0.4, ease: 'power1.out' },
          start
        )
          .to(
            item,
            { scale: 1.35, opacity: 0, duration: segment * 0.6, ease: 'power1.in' },
            start + segment * 0.4
          );
      });
    });
  }

  /* ── [data-parallax] scrubbed y-parallax ── */
  function initParallax() {
    var els = gsap.utils.toArray('[data-parallax]');

    els.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-speed')) || 0.18;

      gsap.fromTo(
        el,
        { yPercent: -100 * speed },
        {
          yPercent: 100 * speed,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') || el.parentElement || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });
  }

  /* ── [data-words] word-by-word split + stagger reveal ── */
  function initWords() {
    var els = gsap.utils.toArray('[data-words]');

    els.forEach(function (el) {
      try {
        if (el.children.length > 0) return; // only pure-text nodes supported
        if (el.dataset.wordsSplit === 'true') return;

        var text = el.textContent;
        var words = text.split(/(\s+)/).filter(function (w) { return w.length > 0; });

        el.innerHTML = '';
        var spans = [];

        words.forEach(function (word) {
          if (/^\s+$/.test(word)) {
            el.appendChild(document.createTextNode(word));
            return;
          }
          var span = document.createElement('span');
          span.textContent = word;
          span.style.display = 'inline-block';
          el.appendChild(span);
          spans.push(span);
        });

        el.dataset.wordsSplit = 'true';

        gsap.set(spans, { opacity: 0, y: '0.6em' });
        gsap.to(spans, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.04,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        });
      } catch (err) {
        /* swallow — never let a split failure break the page */
      }
    });
  }

  /* ── [data-magnetic] magnetic buttons (desktop only) ── */
  function initMagnetic() {
    var els = gsap.utils.toArray('[data-magnetic]');

    els.forEach(function (el) {
      var strength = 10;

      function onMove(e) {
        var rect = el.getBoundingClientRect();
        var relX = e.clientX - (rect.left + rect.width / 2);
        var relY = e.clientY - (rect.top + rect.height / 2);
        var x = gsap.utils.clamp(-strength, strength, relX * 0.3);
        var y = gsap.utils.clamp(-strength, strength, relY * 0.3);

        gsap.to(el, { x: x, y: y, duration: 0.3, ease: 'power2.out' });
      }

      function onLeave() {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      }

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  /* ── Reduced motion: guarantee full visibility, no transforms ── */
  function clearForReducedMotion() {
    var selectors = [
      '[data-scene]',
      '[data-zoom-layer]',
      '[data-tunnel-item]',
      '[data-parallax]',
      '[data-magnetic]',
      '.brand-bridge-mark',
      '[data-brand-ring-wrap]',
      '[data-ring-node]',
      '[data-ring-arrow]',
      '[data-brand-label]',
      '[data-brand-label-mobile]',
      '[data-brand-tagline]',
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.filter = '';
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
      });
    });

    var ringPath = document.querySelector('[data-brand-bridge] [data-ring-path]');
    if (ringPath) {
      ringPath.style.strokeDasharray = '';
      ringPath.style.strokeDashoffset = '';
    }
  }

  /* ── matchMedia tiers ── */
  var mm = gsap.matchMedia();

  mm.add(
    {
      desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference) and (pointer: fine)',
      tablet: '(min-width: 768px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)',
      mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
      reduced: '(prefers-reduced-motion: reduce)',
    },
    function (context) {
      var conditions = context.conditions;

      if (conditions.reduced) {
        clearForReducedMotion();
        return;
      }

      // Progress bar + nav hide are lightweight enough for all
      // motion-enabled tiers.
      initProgressBar();
      initNavHide();

      if (conditions.desktop) {
        initScenes();
        initZoomBg();
        initTunnelExit();
        initBrandBridge(context);
        initTunnel();
        initParallax();
        initWords();
        initMagnetic();
      } else if (conditions.tablet) {
        initScenes();
        initZoomBg();
        initBrandBridge(context);
        // No pinning, no tunnel flythrough, no magnetic on tablet.
      } else if (conditions.mobile) {
        initSimpleScenes();
        initBrandBridge(context);
        // Simple fade/rise only — no zoom-bg, no tunnel, no parallax.
      }

      return function cleanup() {
        // gsap.matchMedia() handles killing tweens/ScrollTriggers
        // created within this context automatically on media change.
      };
    }
  );

  /* ── Refresh handling once everything (images/fonts) has loaded ── */
  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
})();
