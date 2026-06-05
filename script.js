/* =================================================================
   Betkastið — interactions
   Vanilla JS, no dependencies. Accessible + reduced-motion aware.
   ================================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Current year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Sticky header shadow on scroll ---------- */
  const header = document.querySelector("[data-header]");
  if (header) {
    const onScroll = () => {
      header.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile navigation ---------- */
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("primary-nav");

  if (toggle && nav) {
    const root = document.documentElement;
    let navScrollY = 0;
    const setOpen = (open) => {
      const wasOpen = root.classList.contains("nav-open");
      nav.toggleAttribute("data-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Loka valmynd" : "Opna valmynd");
      toggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
      // Lock the background by pinning the body (not overflow:hidden, which iOS
      // ignores and which breaks the fixed menu). Save/restore the scroll spot.
      if (open && !wasOpen) {
        navScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = -navScrollY + "px";
        root.classList.add("nav-open");
      } else if (!open && wasOpen) {
        root.classList.remove("nav-open");
        document.body.style.top = "";
        const prevBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto"; // restore instantly, skip smooth-scroll
        window.scrollTo(0, navScrollY);
        root.style.scrollBehavior = prevBehavior;
      }
    };

    toggle.addEventListener("click", () => {
      setOpen(!nav.hasAttribute("data-open"));
    });

    // Close on link click
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.hasAttribute("data-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (
        nav.hasAttribute("data-open") &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        setOpen(false);
      }
    });

    // Reset when resizing up to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820 && nav.hasAttribute("data-open")) setOpen(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // small stagger for grouped items
            const delay = Math.min(i * 60, 240);
            setTimeout(() => entry.target.classList.add("is-visible"), delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Animated stat counters ---------- */
  // Deterministic Icelandic number formatting (dot thousands, comma decimals) so the
  // counts read the same on every browser, regardless of available locale data.
  const fmt = (value, decimals, decSep) => {
    const neg = value < 0;
    const parts = Math.abs(value).toFixed(decimals).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + parts.join(decSep || ",");
  };

  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const decSep = el.dataset.decSep || ",";
    if (Number.isNaN(target)) return;

    if (reduceMotion) {
      el.textContent = prefix + fmt(target, decimals, decSep) + suffix;
      return;
    }

    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = prefix + fmt(target * eased, decimals, decSep) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + fmt(target, decimals, decSep) + suffix;
    };
    requestAnimationFrame(step);
  };

  const counters = document.querySelectorAll(".stat-num[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCount);
    } else {
      const co = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runCount(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => co.observe(el));
    }
  }

  /* ---------- Scroll spy (active nav link) ---------- */
  const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((a) => {
              if (a.getAttribute("href") === "#" + id) {
                a.setAttribute("aria-current", "true");
              } else {
                a.removeAttribute("aria-current");
              }
            });
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }
})();
