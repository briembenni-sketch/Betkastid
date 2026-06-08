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

  /* ---------- Clip slideshow (self-hosted Instagram video + photos) ----------
     Videos play inline (muted autoplay, advance when each clip ends); photo
     posts advance on a timer. Accessible, reduced-motion aware, off-screen
     pause, keyboard + touch. */
  const clipshow = document.querySelector("[data-clipshow]");
  if (clipshow) {
    const slides = Array.from(clipshow.querySelectorAll(".clipshow-slide"));
    const n = slides.length;

    if (n) {
      const stage    = clipshow.querySelector("[data-clipshow-stage]");
      const prevBtn  = clipshow.querySelector("[data-clipshow-prev]");
      const nextBtn  = clipshow.querySelector("[data-clipshow-next]");
      const toggleBtn = clipshow.querySelector("[data-clipshow-toggle]");
      const muteBtn  = clipshow.querySelector("[data-clipshow-mute]");
      const bar      = clipshow.querySelector("[data-clipshow-bar]");
      const curEl    = clipshow.querySelector("[data-clipshow-current]");
      const openLink = clipshow.querySelector("[data-clipshow-open]");
      const dotsWrap = clipshow.querySelector("[data-clipshow-dots]");
      const liveEl   = clipshow.querySelector("[data-clipshow-live]");
      const imgMs    = Math.max(2500, parseInt(clipshow.dataset.interval || "6000", 10));
      const coarse   = window.matchMedia("(hover: none), (pointer: coarse)").matches;

      const postUrl = (i) => "https://www.instagram.com/p/" + slides[i].dataset.code + "/";
      const isVideo = (i) => slides[i].dataset.type === "video";
      const mediaOf = (i) => slides[i].querySelector(".clipshow-media");
      const pad = (k) => String(k + 1).padStart(2, "0");
      const kind = (i) => (isVideo(i) ? "Myndband " : "Mynd ");

      let index = 0;
      let playing = !reduceMotion;
      let soundOn = false;
      let inView = true, dragging = false, running = false;
      let raf = null, imgStart = 0;

      const setBar = (p) => { if (bar) bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)).toFixed(4) + ")"; };

      /* Dots */
      const dots = slides.map((_, i) => {
        const d = document.createElement("button");
        d.type = "button";
        d.className = "clipshow-dot";
        d.setAttribute("aria-label", kind(i) + (i + 1));
        d.addEventListener("click", () => go(i));
        dotsWrap.appendChild(d);
        return d;
      });

      /* Wire a video element's buffering + ended events once */
      const prepVideo = (i) => {
        const v = mediaOf(i);
        if (!v || v.dataset.prepped) return v;
        v.dataset.prepped = "1";
        const slide = slides[i];
        v.addEventListener("waiting", () => slide.classList.add("is-buffering"));
        v.addEventListener("playing", () => slide.classList.remove("is-buffering"));
        v.addEventListener("canplay", () => slide.classList.remove("is-buffering"));
        v.addEventListener("ended", () => { if (index === i && playing) advance(); });
        return v;
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
        });
        dots.forEach((d, i) => d.setAttribute("aria-current", i === index ? "true" : "false"));
        if (curEl) curEl.textContent = pad(index);
        if (openLink) {
          openLink.href = postUrl(index);
          openLink.setAttribute("aria-label", "Opna klippu " + (index + 1) + " á Instagram");
        }
        if (liveEl) liveEl.textContent = kind(index) + (index + 1) + " af " + n;
      };

      /* Activate current slide: pause/rewind the others, start the active video
         (or the photo timer). Never (re)starts the rAF loop itself. */
      const setupActive = () => {
        slides.forEach((s, i) => {
          if (i !== index && isVideo(i)) {
            const v = mediaOf(i);
            if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
            s.classList.remove("is-buffering");
          }
        });
        imgStart = performance.now();
        if (isVideo(index)) {
          const v = prepVideo(index);
          if (!v) return;
          if (!v.getAttribute("src") && v.dataset.src) v.setAttribute("src", v.dataset.src);
          v.muted = !soundOn;
          if (playing && inView) {
            slides[index].classList.add("is-buffering");
            try { v.currentTime = 0; } catch (e) {}
            const pr = v.play();
            if (pr && pr.catch) pr.catch(() => {
              v.muted = true; soundOn = false; reflectMute();
              v.play().catch(() => slides[index].classList.remove("is-buffering"));
            });
          } else {
            v.pause();
          }
        }
      };

      const shouldRun = () => playing && inView && !dragging && n > 1;

      const loop = (now) => {
        if (!shouldRun()) { running = false; raf = null; return; }
        if (isVideo(index)) {
          const v = mediaOf(index);
          if (v && v.duration && isFinite(v.duration)) setBar(v.currentTime / v.duration);
          /* advance handled by the video "ended" event */
        } else {
          const p = (now - imgStart) / imgMs;
          if (p >= 1) advanceInline();
          else setBar(p);
        }
        raf = requestAnimationFrame(loop);
      };

      const kick = () => {
        if (running || !shouldRun()) return;
        running = true;
        raf = requestAnimationFrame(loop);
      };
      const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

      /* Step forward without touching the loop (called from inside loop / ended) */
      const advanceInline = () => {
        index = (index + 1) % n;
        render();
        setBar(0);
        setupActive();
      };
      const advance = () => { advanceInline(); kick(); };

      /* User navigation (pauses the outgoing video, then sets up the target) */
      const go = (i) => {
        if (isVideo(index)) { const cur = mediaOf(index); if (cur) cur.pause(); }
        index = ((i % n) + n) % n;
        render();
        setBar(0);
        setupActive();
        kick();
      };
      const nav = (d) => go(index + d);

      const reflectMute = () => {
        if (!muteBtn) return;
        muteBtn.classList.toggle("is-on", soundOn);
        muteBtn.setAttribute("aria-pressed", String(soundOn));
        muteBtn.setAttribute("aria-label", soundOn ? "Þagga niður" : "Kveikja á hljóði");
      };

      const setPlaying = (v) => {
        playing = v;
        toggleBtn.classList.toggle("is-playing", v);
        toggleBtn.setAttribute("aria-pressed", String(v));
        toggleBtn.setAttribute("aria-label", v ? "Gera hlé á sýningu" : "Spila sýningu");
        if (v) { setupActive(); kick(); }
        else { halt(); if (isVideo(index)) { const m = mediaOf(index); if (m) m.pause(); } }
      };

      const setSound = (on) => {
        soundOn = on;
        reflectMute();
        if (isVideo(index)) {
          const v = mediaOf(index);
          if (v) { v.muted = !soundOn; if (soundOn && playing && inView && v.paused) v.play().catch(() => {}); }
        }
      };

      /* Controls */
      if (prevBtn) prevBtn.addEventListener("click", () => nav(-1));
      if (nextBtn) nextBtn.addEventListener("click", () => nav(1));
      if (toggleBtn) toggleBtn.addEventListener("click", () => setPlaying(!playing));
      if (muteBtn) muteBtn.addEventListener("click", () => setSound(!soundOn));

      /* Click active media = play/pause (mouse); click a side peek = select it */
      slides.forEach((s, i) => {
        s.addEventListener("click", (e) => {
          if (s.dataset.pos === "active") {
            if (!coarse) { e.preventDefault(); setPlaying(!playing); }
          } else {
            e.preventDefault();
            go(i);
          }
        });
      });

      /* Keyboard */
      clipshow.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); nav(1); }
        else if (e.key === "Home") { e.preventDefault(); go(0); }
        else if (e.key === "End") { e.preventDefault(); go(n - 1); }
        else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setPlaying(!playing); }
        else if (e.key === "m" || e.key === "M") { setSound(!soundOn); }
      });

      /* Touch swipe (coarse pointers): swipe = navigate, tap = play/pause */
      if (coarse && stage) {
        const swipe = document.createElement("div");
        swipe.className = "clipshow-swipe";
        swipe.setAttribute("aria-hidden", "true");
        stage.appendChild(swipe);
        let x0 = 0, y0 = 0, moved = false;
        swipe.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; moved = false; dragging = true; halt(); });
        swipe.addEventListener("pointermove", (e) => { if (dragging && Math.abs(e.clientX - x0) > 8) moved = true; });
        const end = (e) => {
          if (!dragging) return;
          dragging = false;
          const dx = e.clientX - x0, dy = e.clientY - y0;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) nav(dx < 0 ? 1 : -1);
          else if (!moved) setPlaying(!playing);
          else kick();
        };
        swipe.addEventListener("pointerup", end);
        swipe.addEventListener("pointercancel", () => { dragging = false; kick(); });
      }

      /* Pause fully when scrolled out of view */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          if (inView) { setupActive(); kick(); }
          else { halt(); if (isVideo(index)) { const m = mediaOf(index); if (m) m.pause(); } }
        }, { threshold: 0.25 }).observe(clipshow);
      }

      /* Init */
      reflectMute();
      toggleBtn.classList.toggle("is-playing", playing);
      toggleBtn.setAttribute("aria-pressed", String(playing));
      toggleBtn.setAttribute("aria-label", playing ? "Gera hlé á sýningu" : "Spila sýningu");
      render();
      setBar(0);
      setupActive();
      if (playing) kick();
    }
  }
})();
