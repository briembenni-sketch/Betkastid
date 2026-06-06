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

  /* ---------- Instagram clip slideshow ---------- */
  const clipshow = document.querySelector("[data-clipshow]");
  if (clipshow) {
    const slides = Array.from(clipshow.querySelectorAll(".clipshow-slide"));
    const n = slides.length;

    if (n) {
      const stage = clipshow.querySelector("[data-clipshow-stage]");
      const prevBtn = clipshow.querySelector("[data-clipshow-prev]");
      const nextBtn = clipshow.querySelector("[data-clipshow-next]");
      const toggleBtn = clipshow.querySelector("[data-clipshow-toggle]");
      const bar = clipshow.querySelector("[data-clipshow-bar]");
      const curEl = clipshow.querySelector("[data-clipshow-current]");
      const openLink = clipshow.querySelector("[data-clipshow-open]");
      const dotsWrap = clipshow.querySelector("[data-clipshow-dots]");
      const liveEl = clipshow.querySelector("[data-clipshow-live]");
      const interval = Math.max(2500, parseInt(clipshow.dataset.interval || "8000", 10));
      const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

      const postUrl = (i) => "https://www.instagram.com/p/" + slides[i].dataset.code + "/";
      const pad = (k) => String(k + 1).padStart(2, "0");

      let index = 0;
      let playing = !reduceMotion;
      let hovering = false, focusWithin = false, dragging = false, inView = true, running = false;
      let raf = null, startT = 0, elapsed = 0;
      let swipeEl = null;

      /* Build the dot navigation */
      const dots = slides.map((_, i) => {
        const d = document.createElement("button");
        d.type = "button";
        d.className = "clipshow-dot";
        d.setAttribute("aria-label", "Klippa " + (i + 1));
        d.addEventListener("click", () => jump(i));
        dotsWrap.appendChild(d);
        return d;
      });

      /* Lazily inject an Instagram embed iframe into a slide (once) */
      const mount = (i) => {
        const slide = slides[i];
        if (slide.dataset.mounted) return;
        const card = slide.querySelector(".clipshow-card");
        const frame = document.createElement("iframe");
        frame.className = "clipshow-embed";
        frame.src = postUrl(i) + "embed/";
        frame.loading = "lazy";
        frame.title = "Betkastið — klippa " + (i + 1) + " á Instagram";
        frame.setAttribute("scrolling", "no");
        frame.setAttribute("frameborder", "0");
        frame.setAttribute("allowtransparency", "true");
        frame.allow = "encrypted-media; picture-in-picture; web-share; clipboard-write";
        frame.addEventListener("load", () => slide.classList.add("is-loaded"));
        card.appendChild(frame);
        slide.dataset.mounted = "1";
      };

      /* Signed distance from the active slide, wrapping the shortest way round */
      const rel = (i) => {
        let o = i - index;
        if (o > n / 2) o -= n;
        if (o < -n / 2) o += n;
        return o;
      };

      const render = () => {
        slides.forEach((s, i) => {
          const o = rel(i);
          let pos = "far-next";
          if (o === 0) pos = "active";
          else if (o === -1) pos = "prev";
          else if (o === 1) pos = "next";
          else if (o < 0) pos = "far-prev";
          s.dataset.pos = pos;
          s.setAttribute("aria-hidden", o === 0 ? "false" : "true");
          const poster = s.querySelector(".clipshow-poster");
          if (poster) poster.tabIndex = o === 0 ? 0 : -1;
        });
        mount(index);
        mount((index + 1) % n);
        mount((index - 1 + n) % n);
        dots.forEach((d, i) => d.setAttribute("aria-current", i === index ? "true" : "false"));
        if (curEl) curEl.textContent = pad(index);
        if (openLink) {
          openLink.href = postUrl(index);
          openLink.setAttribute("aria-label", "Opna klippu " + (index + 1) + " á Instagram");
        }
        if (swipeEl) swipeEl.href = postUrl(index);
        if (liveEl) liveEl.textContent = "Klippa " + (index + 1) + " af " + n;
      };

      const shouldRun = () => playing && inView && !hovering && !focusWithin && !dragging && n > 1;

      const loop = (now) => {
        if (!shouldRun()) { running = false; raf = null; return; }
        elapsed = now - startT;
        const p = elapsed / interval;
        if (p >= 1) {
          index = (index + 1) % n;
          render();
          elapsed = 0; startT = now;
          if (bar) bar.style.transform = "scaleX(0)";
        } else if (bar) {
          bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
        }
        raf = requestAnimationFrame(loop);
      };

      const kick = () => {
        if (running || !shouldRun()) return;
        running = true;
        startT = performance.now() - elapsed;
        raf = requestAnimationFrame(loop);
      };
      const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

      const go = (i) => {
        index = (i % n + n) % n;
        render();
        elapsed = 0; startT = performance.now();
        if (bar) bar.style.transform = "scaleX(0)";
        kick();
      };
      const nav = (d) => go(index + d);
      const jump = (i) => go(i);

      const setPlaying = (v) => {
        playing = v;
        toggleBtn.classList.toggle("is-playing", v);
        toggleBtn.setAttribute("aria-pressed", String(v));
        toggleBtn.setAttribute("aria-label", v ? "Gera hlé á sýningu" : "Spila sýningu");
        if (v) kick(); else halt();
      };

      /* Controls */
      if (prevBtn) prevBtn.addEventListener("click", () => nav(-1));
      if (nextBtn) nextBtn.addEventListener("click", () => nav(1));
      if (toggleBtn) toggleBtn.addEventListener("click", () => setPlaying(!playing));

      /* Click a side peek to bring it to the front */
      slides.forEach((s, i) => {
        s.addEventListener("click", (e) => {
          if (s.dataset.pos === "active") return; // active embed handles its own click
          e.preventDefault();
          jump(i);
        });
      });

      /* Pause while pointing at or focused within the player */
      if (!coarse) {
        clipshow.addEventListener("pointerenter", () => { hovering = true; halt(); });
        clipshow.addEventListener("pointerleave", () => { hovering = false; kick(); });
      }
      clipshow.addEventListener("focusin", () => { focusWithin = true; halt(); });
      clipshow.addEventListener("focusout", (e) => {
        if (!clipshow.contains(e.relatedTarget)) { focusWithin = false; kick(); }
      });

      /* Keyboard: arrows navigate, space toggles play, home/end jump */
      clipshow.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); nav(1); }
        else if (e.key === "Home") { e.preventDefault(); jump(0); }
        else if (e.key === "End") { e.preventDefault(); jump(n - 1); }
        else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setPlaying(!playing); }
      });

      /* Touch: a swipe layer over the stage (coarse pointers only, so the embed
         stays directly clickable with a mouse). Swipe = navigate, tap = open. */
      if (coarse && stage) {
        swipeEl = document.createElement("a");
        swipeEl.className = "clipshow-swipe";
        swipeEl.setAttribute("aria-hidden", "true");
        swipeEl.tabIndex = -1;
        swipeEl.target = "_blank";
        swipeEl.rel = "noopener";
        swipeEl.href = postUrl(index);
        stage.appendChild(swipeEl);

        let x0 = 0, y0 = 0, moved = false;
        swipeEl.addEventListener("pointerdown", (e) => {
          x0 = e.clientX; y0 = e.clientY; moved = false; dragging = true; halt();
        });
        swipeEl.addEventListener("pointermove", (e) => {
          if (dragging && Math.abs(e.clientX - x0) > 8) moved = true;
        });
        const end = (e) => {
          if (!dragging) return;
          dragging = false;
          const dx = e.clientX - x0, dy = e.clientY - y0;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
            e.preventDefault();
            nav(dx < 0 ? 1 : -1);
          } else if (!moved) {
            window.open(postUrl(index), "_blank", "noopener");
          } else {
            kick();
          }
        };
        swipeEl.addEventListener("click", (e) => e.preventDefault());
        swipeEl.addEventListener("pointerup", end);
        swipeEl.addEventListener("pointercancel", () => { dragging = false; kick(); });
      }

      /* Pause when the player scrolls out of view */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          if (inView) kick(); else halt();
        }, { threshold: 0.2 }).observe(clipshow);
      }

      /* Init */
      toggleBtn.classList.toggle("is-playing", playing);
      toggleBtn.setAttribute("aria-pressed", String(playing));
      toggleBtn.setAttribute("aria-label", playing ? "Gera hlé á sýningu" : "Spila sýningu");
      render();
      if (bar) bar.style.transform = "scaleX(0)";
      startT = performance.now();
      if (playing) kick();
    }
  }
})();
