// Wearly site: reveal-on-scroll, sticky nav, outfit demo, try-on compare,
// light/dark screenshots, table of contents highlight. ~3 KB, no libraries.
(() => {
  const d = document, root = d.documentElement;
  root.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // reveal on scroll
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  const start = () => d.querySelectorAll(".reveal").forEach((el) => io ? io.observe(el) : el.classList.add("in"));
  d.readyState === "loading" ? d.addEventListener("DOMContentLoaded", start) : start();

  // ── first-party analytics: no cookies, skipped for Do Not Track / Global Privacy Control ──
  const EP = root.dataset.wa;
  const off = !EP || navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true || /localhost|127\.0\.0\.1/.test(location.hostname);
  let sid = "";
  try { sid = sessionStorage.getItem("wsid") || ""; if (!sid) { sid = Math.random().toString(36).slice(2, 14); sessionStorage.setItem("wsid", sid); } } catch { sid = Math.random().toString(36).slice(2, 14); }
  const q = new URLSearchParams(location.search);
  const send = (e, extra = {}) => {
    if (off) return;
    const body = JSON.stringify({ e, p: location.pathname, t: d.title.slice(0, 200), r: d.referrer || null, s: sid, w: innerWidth,
      us: q.get("utm_source"), um: q.get("utm_medium"), uc: q.get("utm_campaign"), ...extra });
    try { navigator.sendBeacon ? navigator.sendBeacon(EP, new Blob([body], { type: "text/plain" })) : fetch(EP, { method: "POST", body, keepalive: true }); } catch {}
  };
  send("pageview");
  let shownAt = Date.now(), engaged = 0, sentEngaged = false;
  d.addEventListener("visibilitychange", () => {
    if (d.visibilityState === "hidden") {
      engaged += Date.now() - shownAt;
      if (!sentEngaged && engaged > 1500) { send("engaged", { sec: Math.min(7200, Math.round(engaged / 1000)) }); sentEngaged = true; }
    } else { shownAt = Date.now(); }
  });
  d.addEventListener("click", (ev) => {
    const a = ev.target.closest && ev.target.closest("[data-track]");
    if (a) send("click", { l: a.dataset.track.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) });
  });

  d.addEventListener("DOMContentLoaded", () => {
    // nav background after scrolling
    const nav = d.querySelector("[data-nav]");
    const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // marquee: duplicate tiles for a seamless loop
    const mq = d.querySelector("[data-marquee]");
    if (mq && !reduce) mq.innerHTML += mq.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

    // gentle parallax on the hero phone
    const px = d.querySelector("[data-parallax]");
    if (px && !reduce) {
      let raf = 0;
      addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { px.style.translate = `0 ${Math.min(scrollY, 600) * -0.06}px`; }); }, { passive: true });
    }

    // outfit demo
    const data = d.getElementById("looks");
    if (data) {
      const looks = JSON.parse(data.textContent);
      const st = { w: "cold", o: "casual" };
      const figs = d.querySelectorAll("[data-look] figure");
      const why = d.querySelector("[data-why]"), match = d.querySelector("[data-match]");
      const render = () => {
        const L = looks[`${st.w}-${st.o}`];
        figs.forEach((f, i) => {
          const [name, label] = L[i], img = f.querySelector("img");
          f.classList.add("swap");
          setTimeout(() => {
            img.src = `/img/d-${name}-320.webp`;
            img.srcset = `/img/d-${name}-320.webp 320w, /img/d-${name}-800.webp 800w`;
            img.alt = label; f.querySelector("figcaption").textContent = label;
            img.decode ? img.decode().catch(() => {}).finally(() => f.classList.remove("swap")) : f.classList.remove("swap");
          }, reduce ? 0 : 140 + i * 50);
        });
        why.textContent = L[4];
        match.textContent = `${90 + ((st.w.length * 3 + st.o.length * 2) % 9)}% match`;
      };
      d.querySelectorAll("[data-w],[data-o]").forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.w ? "w" : "o";
        st[k] = b.dataset[k];
        send("click", { l: `demo-${st.w}-${st.o}` });
        b.parentElement.querySelectorAll(".pill").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
        render();
      }));
    }

    // try-on before/after
    const cmp = d.querySelector("[data-compare]");
    if (cmp) {
      const r = cmp.querySelector("[data-compare-range]");
      const set = () => cmp.style.setProperty("--p", r.value + "%");
      r.addEventListener("input", set); set();
    }

    // light/dark screenshots
    d.querySelectorAll("[data-theme-shots]").forEach((b) => b.addEventListener("click", () => {
      const dark = b.dataset.themeShots === "dark";
      b.parentElement.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
      d.querySelectorAll("img[data-light]").forEach((img) => {
        const n = dark ? img.dataset.dark : img.dataset.light;
        img.style.opacity = 0;
        const done = () => { img.style.opacity = 1; };
        img.onload = done;
        img.src = `/img/${n}-360.webp`; img.srcset = `/img/${n}-360.webp 360w, /img/${n}-720.webp 720w`;
        if (img.complete) done();
      });
    }));

    // table of contents: highlight the section in view
    const toc = d.querySelectorAll(".toc a");
    if (toc.length && "IntersectionObserver" in window) {
      const map = new Map([...toc].map((a) => [a.getAttribute("href").slice(1), a]));
      const obs = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { toc.forEach((a) => a.classList.remove("on")); map.get(e.target.id)?.classList.add("on"); }
      }), { rootMargin: "-20% 0px -70% 0px" });
      map.forEach((_, id) => { const h = d.getElementById(id); h && obs.observe(h); });
    }
  });
})();
