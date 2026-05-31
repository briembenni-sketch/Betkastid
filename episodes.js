/* =================================================================
   Betkastið — episodes + on-site player
   Pulls every episode live from the public RSS feed (CORS-enabled),
   classifies by topic, renders a filterable grid and plays in-page.
   Vanilla JS, no dependencies. Accessible + reduced-motion aware.
   ================================================================= */
(function () {
  "use strict";

  const FEED = "https://anchor.fm/s/10a51d438/podcast/rss";
  const SPOTIFY = "https://open.spotify.com/show/7bT5TGtyCpSrZZnTYmk7fm";
  const ITUNES_NS = "http://www.itunes.com/dtds/podcast-1.0.dtd";
  const PAGE = 9;

  const CATS = [
    { id: "all", label: "Allir þættir" },
    { id: "english", label: "Enski & evrópskur" },
    { id: "besta", label: "Besta deildin" },
    { id: "nedri", label: "Neðri deildir" },
    { id: "handbolti", label: "Handbolti" },
    { id: "karfa", label: "Körfubolti" },
    { id: "vidtal", label: "Viðtöl & gestir" },
    { id: "annad", label: "Annað" },
  ];
  const labelOf = (id) => (CATS.find((c) => c.id === id) || { label: "Annað" }).label;

  function classify(title) {
    const s = (title || "").toLowerCase();
    if (/handbolt|olís|handkast/.test(s)) return "handbolti";
    if (/körfu|\bnba\b|bónus deild/.test(s)) return "karfa";
    if (/lengjudeild|neðri deild|[2-5]\s*&\s*[2-5]|[2-5]\.\s*&|[2-5]\.\s*deild|playoff/.test(s)) return "nedri";
    if (/\bensk|úrvalsdeild|premier|\bprem\b|arsenal|\bcity\b|bayern|chelsea|amorim|\bpep\b|\bslot\b|champions|champa|evrópukeppni|hitaklefinn|afcon/.test(s)) return "english";
    if (/besta deild|bestu deild|bestu kvenna|besta kvenna|íslandsmeistar|víkingur|stemning hjá kr/.test(s)) return "besta";
    if (/\s[x×]\s|content creator|stórmeistari|reynslusaga/.test(s)) return "vidtal";
    return "annad";
  }

  /* ---------- formatting ---------- */
  const MONTHS = ["jan.", "feb.", "mars", "apr.", "maí", "jún.", "júl.", "ág.", "sep.", "okt.", "nóv.", "des."];
  function fmtDate(s) {
    const d = new Date(s);
    return isNaN(d) ? "" : d.getDate() + ". " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function durToSec(d) {
    if (!d) return 0;
    if (d.indexOf(":") > -1) return d.split(":").map(Number).reduce((a, b) => a * 60 + b, 0);
    return parseInt(d, 10) || 0;
  }
  function fmtDur(d) {
    const sec = durToSec(d);
    if (!sec) return "";
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h ? h + " klst " + m + " mín" : m + " mín";
  }
  function clock(t) {
    t = Math.max(0, Math.floor(t || 0));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const attr = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- parse ---------- */
  function parse(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("RSS parse error");
    return Array.from(doc.querySelectorAll("item"))
      .map((it) => {
        const get = (sel) => {
          const el = it.querySelector(sel);
          return el ? el.textContent.trim() : "";
        };
        const nsGet = (tag, a) => {
          const el = it.getElementsByTagNameNS(ITUNES_NS, tag)[0];
          return el ? el.getAttribute(a) || el.textContent.trim() : "";
        };
        const enc = it.querySelector("enclosure");
        const title = get("title");
        return {
          title,
          audio: enc ? enc.getAttribute("url") : "",
          img: nsGet("image", "href"),
          dur: fmtDur(nsGet("duration")),
          date: fmtDate(get("pubDate")),
          cat: classify(title),
        };
      })
      .filter((e) => e.audio);
  }

  /* ---------- state + elements ---------- */
  const state = { all: [], cat: "all", shown: PAGE };
  let grid, filtersEl, moreBtn, countEl, heroBtn;

  const visible = () => (state.cat === "all" ? state.all : state.all.filter((e) => e.cat === state.cat));

  function renderFilters() {
    const counts = {};
    state.all.forEach((e) => (counts[e.cat] = (counts[e.cat] || 0) + 1));
    filtersEl.innerHTML = CATS.filter((c) => c.id === "all" || counts[c.id])
      .map((c) => {
        const n = c.id === "all" ? state.all.length : counts[c.id];
        const on = c.id === state.cat;
        return (
          '<button class="chip' + (on ? " is-active" : "") + '" type="button" data-cat="' + c.id +
          '" aria-pressed="' + on + '">' + esc(c.label) + ' <span class="chip-n">' + n + "</span></button>"
        );
      })
      .join("");
  }

  function cardHTML(e, i) {
    return (
      '<article class="ep-card" style="--i:' + i + '" data-audio="' + attr(e.audio) + '" data-img="' + attr(e.img) + '" data-title="' + attr(e.title) + '">' +
      '<div class="ep-cover">' +
      (e.img ? '<img loading="lazy" src="' + attr(e.img) + '" alt="" width="400" height="400">' : "") +
      '<span class="ep-badge">' + esc(labelOf(e.cat)) + "</span>" +
      '<button class="ep-playbtn" type="button" aria-label="Spila: ' + attr(e.title) + '"><svg class="ic" aria-hidden="true"><use href="#i-play"></use></svg></button>' +
      "</div>" +
      '<div class="ep-body">' +
      '<h3 class="ep-title">' + esc(e.title) + "</h3>" +
      '<p class="ep-meta">' + [e.date, e.dur].filter(Boolean).join(" · ") + "</p>" +
      "</div></article>"
    );
  }

  function render() {
    const list = visible();
    grid.innerHTML =
      list.slice(0, state.shown).map(cardHTML).join("") ||
      '<p class="ep-empty">Engir þættir í þessum flokki.</p>';
    moreBtn.hidden = state.shown >= list.length;
    if (countEl) {
      countEl.textContent =
        list.length + " þættir" + (state.cat !== "all" ? " í flokknum „" + labelOf(state.cat) + "”" : " í safninu");
    }
  }

  function setFilter(cat) {
    state.cat = cat;
    state.shown = PAGE;
    if (filtersEl) {
      filtersEl.querySelectorAll(".chip").forEach((b) => {
        const on = b.dataset.cat === cat;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    if (state.all.length) render();
  }

  function fail() {
    if (filtersEl) filtersEl.hidden = true;
    moreBtn.hidden = true;
    grid.innerHTML =
      '<div class="ep-fallback">' +
      "<p>Ekki tókst að sækja þáttalistann í augnablikinu — hér eru allir þættirnir á Spotify:</p>" +
      '<iframe title="Betkastið á Spotify" loading="lazy" src="https://open.spotify.com/embed/show/7bT5TGtyCpSrZZnTYmk7fm" height="420" allow="encrypted-media"></iframe>' +
      '<a class="btn btn-primary" href="' + SPOTIFY + '" target="_blank" rel="noopener">Opna á Spotify</a>' +
      "</div>";
  }

  /* ---------- player ---------- */
  const player = {};
  function initPlayer() {
    const el = document.getElementById("player");
    if (!el) return;
    Object.assign(player, {
      el,
      audio: document.getElementById("p-audio"),
      art: document.getElementById("p-art"),
      title: document.getElementById("p-title"),
      toggle: document.getElementById("p-toggle"),
      seek: document.getElementById("p-seek"),
      cur: document.getElementById("p-cur"),
      durEl: document.getElementById("p-dur"),
      close: document.getElementById("p-close"),
      icon: document.querySelector("#p-toggle use"),
      seeking: false,
    });

    player.toggle.addEventListener("click", () => {
      if (player.audio.paused) player.audio.play();
      else player.audio.pause();
    });
    player.close.addEventListener("click", () => {
      player.audio.pause();
      player.el.classList.remove("is-on");
      document.body.classList.remove("player-open");
    });
    player.audio.addEventListener("play", () => player.icon.setAttribute("href", "#i-pause"));
    player.audio.addEventListener("pause", () => player.icon.setAttribute("href", "#i-play"));
    player.audio.addEventListener("loadedmetadata", () => {
      player.durEl.textContent = clock(player.audio.duration);
    });
    player.audio.addEventListener("timeupdate", () => {
      if (player.seeking || !player.audio.duration) return;
      player.seek.value = String((player.audio.currentTime / player.audio.duration) * 1000);
      player.cur.textContent = clock(player.audio.currentTime);
    });
    player.audio.addEventListener("ended", () => player.icon.setAttribute("href", "#i-play"));
    player.seek.addEventListener("input", () => {
      player.seeking = true;
      if (player.audio.duration) player.cur.textContent = clock((player.seek.value / 1000) * player.audio.duration);
    });
    player.seek.addEventListener("change", () => {
      if (player.audio.duration) player.audio.currentTime = (player.seek.value / 1000) * player.audio.duration;
      player.seeking = false;
    });
  }

  function playEpisode(ep) {
    if (!player.el || !ep || !ep.audio) return;
    player.audio.src = ep.audio;
    player.art.src = ep.img || "";
    player.title.textContent = ep.title;
    player.seek.value = "0";
    player.cur.textContent = "0:00";
    player.el.classList.add("is-on");
    document.body.classList.add("player-open");
    const p = player.audio.play();
    if (p && p.catch) p.catch(() => {});
  }

  /* ---------- wiring ---------- */
  function wire() {
    // filter chips
    filtersEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (b) setFilter(b.dataset.cat);
    });
    // play from a card
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".ep-card");
      if (!card || !card.dataset.audio) return;
      playEpisode({ audio: card.dataset.audio, img: card.dataset.img, title: card.dataset.title });
    });
    // load more
    moreBtn.addEventListener("click", () => {
      state.shown += PAGE;
      render();
    });
    // category cards (Flokkar) -> filter + scroll
    document.querySelectorAll("[data-cat-link]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setFilter(a.dataset.catLink);
        const t = document.getElementById("thaettir");
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    // hero "play latest"
    if (heroBtn) {
      heroBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.all.length) playEpisode(state.all[0]);
        else document.getElementById("thaettir").scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  function skeletons() {
    let s = "";
    for (let i = 0; i < 6; i++) s += '<div class="ep-skel"><div class="sk"></div><div class="sk sk2"></div></div>';
    grid.innerHTML = s;
  }

  /* ---------- boot ---------- */
  function boot() {
    grid = document.getElementById("ep-grid");
    filtersEl = document.getElementById("ep-filters");
    moreBtn = document.getElementById("ep-more");
    countEl = document.getElementById("ep-count");
    heroBtn = document.getElementById("play-latest");
    if (!grid) return;

    initPlayer();
    wire();
    skeletons();

    const ctrl = "AbortController" in window ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 12000);

    fetch(FEED, ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then((xml) => {
        clearTimeout(timer);
        state.all = parse(xml);
        if (!state.all.length) return fail();
        renderFilters();
        render();
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error("Betkastið episodes:", err);
        fail();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
