/* =================================================================
   Betkastið — episodes archive, search/sort/filter, episode page + player
   Pulls every episode live from the public RSS feed (CORS-enabled),
   classifies by topic, powers the searchable/sortable/filterable archive,
   renders the dedicated episode page (thattur.html?ep=…) and plays in-page.
   Vanilla JS, accessible, reduced-motion aware.
   ================================================================= */
(function () {
  "use strict";

  const FEED = "https://anchor.fm/s/10a51d438/podcast/rss";
  const SHOW = "https://open.spotify.com/show/7bT5TGtyCpSrZZnTYmk7fm";
  const APPLE = "https://podcasts.apple.com/is/search?term=Betkasti%C3%B0";
  const YOUTUBE = "https://www.youtube.com/results?search_query=Betkasti%C3%B0";
  const ITUNES_NS = "http://www.itunes.com/dtds/podcast-1.0.dtd";
  const PAGE = 12;

  const CATS = [
    { id: "all", label: "Allir" },
    { id: "english", label: "Enski & evrópskur" },
    { id: "besta", label: "Besta deildin" },
    { id: "nedri", label: "Neðri deildir" },
    { id: "handbolti", label: "Handbolti" },
    { id: "karfa", label: "Körfubolti" },
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
    return "annad";
  }

  /* ---------- formatting ---------- */
  const MONTHS = ["jan.", "feb.", "mars", "apr.", "maí", "jún.", "júl.", "ág.", "sep.", "okt.", "nóv.", "des."];
  function fmtDate(s) { const d = new Date(s); return isNaN(d) ? "" : d.getDate() + ". " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function durToSec(d) { if (!d) return 0; if (d.indexOf(":") > -1) return d.split(":").map(Number).reduce((a, b) => a * 60 + b, 0); return parseInt(d, 10) || 0; }
  function fmtDur(d) { const sec = durToSec(d); if (!sec) return ""; const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? h + " klst " + m + " mín" : m + " mín"; }
  function clock(t) { t = Math.max(0, Math.floor(t || 0)); const m = Math.floor(t / 60), s = t % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const attr = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function plain(htmlStr) {
    if (!htmlStr) return "";
    let s = htmlStr.replace(/<\/(p|div|li)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    const ta = document.createElement("textarea"); ta.innerHTML = s; s = ta.value;
    return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function slugify(s) {
    return (s || "").toLowerCase()
      .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
      .replace(/[óòôö]/g, "o").replace(/[úùûü]/g, "u").replace(/[ýÿ]/g, "y")
      .replace(/þ/g, "th").replace(/ð/g, "d").replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  /* ---------- parse ---------- */
  function parse(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("RSS parse error");
    return Array.from(doc.querySelectorAll("item")).map((it) => {
      const get = (sel) => { const el = it.querySelector(sel); return el ? el.textContent.trim() : ""; };
      const ns = (tag, a) => { const el = it.getElementsByTagNameNS(ITUNES_NS, tag)[0]; return el ? (a ? el.getAttribute(a) : el.textContent.trim()) : ""; };
      const enc = it.querySelector("enclosure");
      const title = get("title");
      const link = get("link");
      const guid = get("guid");
      const desc = plain(get("description") || ns("summary"));
      const tail = (guid || "").replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
      return {
        title, link,
        audio: enc ? enc.getAttribute("url") : "",
        img: ns("image", "href"),
        dur: fmtDur(ns("duration")),
        date: fmtDate(get("pubDate")),
        cat: classify(title),
        desc,
        spotify: link && /spotify\.com/.test(link) ? link : SHOW,
        slug: (slugify(title) || "thattur") + (tail ? "-" + tail : ""),
        search: (title + " " + desc).toLowerCase(),
      };
    }).filter((e) => e.audio).map((e, i) => (e.i = i, e));
  }

  /* ---------- state + elements ---------- */
  const state = { all: [], cat: "all", q: "", sort: "new", shown: PAGE };
  let grid, filtersEl, moreBtn, countEl, heroBtn, searchEl, sortEl;

  function visible() {
    const q = state.q.trim().toLowerCase();
    let list = state.all.filter((e) => (state.cat === "all" || e.cat === state.cat) && (!q || e.search.indexOf(q) > -1));
    if (state.sort === "old") list = list.slice().reverse();
    return list;
  }

  function renderFilters() {
    const counts = {};
    state.all.forEach((e) => (counts[e.cat] = (counts[e.cat] || 0) + 1));
    filtersEl.innerHTML = CATS.filter((c) => c.id === "all" || counts[c.id]).map((c) => {
      const n = c.id === "all" ? state.all.length : counts[c.id];
      const on = c.id === state.cat;
      return '<button class="chip' + (on ? " is-active" : "") + '" type="button" data-cat="' + c.id +
        '" aria-pressed="' + on + '">' + esc(c.label) + ' <span class="chip-n">· ' + n + "</span></button>";
    }).join("");
  }

  function cardHTML(e) {
    return '<a class="ep-card" style="--i:' + e.i + '" href="thattur.html?ep=' + attr(e.slug) + '">' +
      '<span class="ep-cover">' +
      (e.img ? '<img loading="lazy" src="' + attr(e.img) + '" alt="" width="400" height="400">' : "") +
      '<span class="ep-badge">' + esc(labelOf(e.cat)) + "</span>" +
      '<span class="ep-playbtn" aria-hidden="true"><svg class="ic"><use href="#i-play"></use></svg></span>' +
      "</span>" +
      '<span class="ep-body"><span class="ep-title">' + esc(e.title) + "</span>" +
      '<span class="ep-meta">' + [e.date, e.dur].filter(Boolean).join(" · ") + "</span></span></a>";
  }

  function render() {
    const list = visible();
    grid.innerHTML = list.slice(0, state.shown).map(cardHTML).join("") ||
      '<p class="ep-empty">Engir þættir fundust' + (state.q ? ' fyrir „' + esc(state.q) + "”" : "") + ".</p>";
    moreBtn.hidden = state.shown >= list.length;
    if (countEl) {
      const where = state.cat !== "all" ? " í flokknum „" + labelOf(state.cat) + "”" : "";
      countEl.textContent = state.q ? list.length + " þættir fundust" + where : list.length + " þættir" + (where || " í safninu");
    }
  }

  function setFilter(cat) {
    state.cat = cat; state.shown = PAGE;
    filtersEl.querySelectorAll(".chip").forEach((b) => { const on = b.dataset.cat === cat; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
    if (state.all.length) render();
  }

  function fail() {
    const tb = document.querySelector(".ep-toolbar"); if (tb) tb.style.display = "none";
    if (filtersEl) filtersEl.hidden = true;
    moreBtn.hidden = true;
    grid.innerHTML = '<div class="ep-fallback">' +
      "<p>Ekki tókst að sækja þáttalistann í augnablikinu, hér eru allir þættirnir á Spotify:</p>" +
      '<iframe title="Betkastið á Spotify" loading="lazy" src="https://open.spotify.com/embed/show/7bT5TGtyCpSrZZnTYmk7fm" height="420" allow="encrypted-media"></iframe>' +
      '<a class="btn btn-primary" href="' + SHOW + '" target="_blank" rel="noopener">Opna á Spotify</a></div>';
  }

  /* ---------- player ---------- */
  const player = {};
  function initPlayer() {
    const el = document.getElementById("player");
    if (!el) return;
    Object.assign(player, {
      el, audio: document.getElementById("p-audio"), art: document.getElementById("p-art"),
      title: document.getElementById("p-title"), toggle: document.getElementById("p-toggle"),
      seek: document.getElementById("p-seek"), cur: document.getElementById("p-cur"),
      durEl: document.getElementById("p-dur"), close: document.getElementById("p-close"),
      icon: document.querySelector("#p-toggle use"), seeking: false,
    });
    player.toggle.addEventListener("click", () => { if (player.audio.paused) player.audio.play(); else player.audio.pause(); });
    player.close.addEventListener("click", () => { player.audio.pause(); player.el.classList.remove("is-on"); document.body.classList.remove("player-open"); });
    player.audio.addEventListener("play", () => player.icon.setAttribute("href", "#i-pause"));
    player.audio.addEventListener("pause", () => player.icon.setAttribute("href", "#i-play"));
    player.audio.addEventListener("loadedmetadata", () => { player.durEl.textContent = clock(player.audio.duration); });
    player.audio.addEventListener("timeupdate", () => {
      if (player.seeking || !player.audio.duration) return;
      player.seek.value = String((player.audio.currentTime / player.audio.duration) * 1000);
      player.cur.textContent = clock(player.audio.currentTime);
    });
    player.audio.addEventListener("ended", () => player.icon.setAttribute("href", "#i-play"));
    player.seek.addEventListener("input", () => { player.seeking = true; if (player.audio.duration) player.cur.textContent = clock((player.seek.value / 1000) * player.audio.duration); });
    player.seek.addEventListener("change", () => { if (player.audio.duration) player.audio.currentTime = (player.seek.value / 1000) * player.audio.duration; player.seeking = false; });
  }
  function playEpisode(ep) {
    if (!player.el || !ep || !ep.audio) return;
    player.audio.src = ep.audio; player.art.src = ep.img || ""; player.title.textContent = ep.title;
    player.seek.value = "0"; player.cur.textContent = "0:00";
    player.el.classList.add("is-on"); document.body.classList.add("player-open");
    const p = player.audio.play(); if (p && p.catch) p.catch(() => {});
  }

  /* ---------- episode detail page (thattur.html) ---------- */
  function renderDetail() {
    const status = document.getElementById("ed-status");
    const card = document.getElementById("episode");
    const slug = new URLSearchParams(location.search).get("ep");
    const ep = state.all.find((e) => e.slug === slug);
    if (!ep) {
      if (status) status.innerHTML = 'Þátturinn fannst ekki. <a href="thaettir.html">Sjá alla þætti</a>.';
      return;
    }
    document.title = ep.title + " · Betkastið";
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById("ed-art").src = ep.img || "";
    document.getElementById("ed-art").alt = ep.title;
    set("ed-badge", labelOf(ep.cat));
    set("ed-meta", [ep.date, ep.dur].filter(Boolean).join(" · "));
    set("ed-title", ep.title);
    const desc = document.getElementById("ed-desc");
    desc.innerHTML = "";
    (ep.desc || "Engin lýsing í boði fyrir þennan þátt.").split(/\n{2,}/).forEach((para) => {
      const p = document.createElement("p");
      para.split(/\n/).forEach((line, i) => { if (i) p.appendChild(document.createElement("br")); p.appendChild(document.createTextNode(line)); });
      desc.appendChild(p);
    });
    document.getElementById("ed-spotify").href = ep.spotify;
    document.getElementById("ed-apple").href = APPLE;
    document.getElementById("ed-youtube").href = YOUTUBE;
    document.getElementById("ed-play").addEventListener("click", () => playEpisode(ep));
    if (status) status.hidden = true;
    card.hidden = false;
  }

  /* ---------- wiring ---------- */
  function wireArchive() {
    filtersEl.addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) setFilter(b.dataset.cat); });
    moreBtn.addEventListener("click", () => { state.shown += PAGE; render(); });
    if (searchEl) searchEl.addEventListener("input", () => { state.q = searchEl.value; state.shown = PAGE; render(); });
    if (sortEl) sortEl.addEventListener("change", () => { state.sort = sortEl.value; state.shown = PAGE; render(); });
  }
  function wireHero() {
    heroBtn.addEventListener("click", (e) => { e.preventDefault(); if (state.all.length) playEpisode(state.all[0]); else window.location.href = "thaettir.html"; });
  }
  function skeletons() { let s = ""; for (let i = 0; i < 8; i++) s += '<div class="ep-skel"><div class="sk"></div><div class="sk sk2"></div></div>'; grid.innerHTML = s; }

  /* ---------- boot ---------- */
  function boot() {
    grid = document.getElementById("ep-grid");
    filtersEl = document.getElementById("ep-filters");
    moreBtn = document.getElementById("ep-more");
    countEl = document.getElementById("ep-count");
    heroBtn = document.getElementById("play-latest");
    searchEl = document.getElementById("ep-search");
    sortEl = document.getElementById("ep-sort");

    initPlayer();

    const hasArchive = !!grid;
    const hasDetail = !!document.getElementById("episode");
    const hasHero = !!heroBtn;
    if (!hasArchive && !hasDetail && !hasHero) return;

    if (hasArchive) { wireArchive(); skeletons(); }
    if (hasHero) wireHero();

    const ctrl = "AbortController" in window ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 12000);

    fetch(FEED, ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then((xml) => {
        clearTimeout(timer);
        state.all = parse(xml);
        if (!state.all.length) { if (hasArchive) fail(); return; }
        if (hasArchive) {
          const p = new URLSearchParams(location.search).get("flokkur");
          if (p && CATS.some((c) => c.id === p)) state.cat = p;
          renderFilters(); render();
        }
        if (hasDetail) renderDetail();
      })
      .catch((err) => {
        clearTimeout(timer); console.error("Betkastið episodes:", err);
        if (hasArchive) fail();
        if (hasDetail) { const s = document.getElementById("ed-status"); if (s) s.innerHTML = 'Ekki tókst að sækja þáttinn. <a href="thaettir.html">Sjá alla þætti</a>.'; }
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
