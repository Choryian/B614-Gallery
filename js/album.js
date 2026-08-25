/* album.js — 원본 앨범 페이지를 한 장씩 넘겨보는 뷰어
   좌우 여백에 넘김 존을 두고, 마우스가 들어오면 화살표가 떠오른다. */
(function () {
  "use strict";

  if (window.B614Auth && !B614Auth.isAuthed()) {
    location.replace("index.html");
    return;
  }

  const PRELOAD = 2;      // 현재 페이지 앞뒤로 미리 받아둘 장 수
  const SWIPE_MIN = 50;   // 스와이프로 인정할 최소 이동(px)
  const EDGE_BAND = 0.22; // 화살표가 떠오르는 좌·우 가장자리 띠 (화면 폭 대비)
  const GAP_YEARS = [];   // 원본에 없는 해 — pages.json에서 산출

  const stage = document.getElementById("stage");
  const loading = document.getElementById("loading");
  const prevZone = document.getElementById("prevZone");
  const nextZone = document.getElementById("nextZone");
  const yearsEl = document.getElementById("years");
  const counter = document.getElementById("counter");
  const rail = document.getElementById("rail");
  const finis = document.getElementById("finis");

  let layers = [document.getElementById("imgA"), document.getElementById("imgB")];
  let front = 0;          // 지금 보이는 레이어
  let pages = [];
  let idx = 1;            // 1-based 관람 순번
  let ext = ".webp";
  let busy = false;

  /* WebP를 못 읽는 브라우저에는 JPEG를 준다.
     지원하지 않으면 toDataURL이 PNG로 되돌아오므로 접두사로 판별된다. */
  function pickExt() {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      return c.toDataURL("image/webp").indexOf("data:image/webp") === 0 ? ".webp" : ".jpg";
    } catch (e) {
      return ".jpg";
    }
  }

  const srcOf = (i) => "assets/pages/" + pages[i - 1].src + ext;

  function clamp(i) {
    return Math.min(pages.length, Math.max(1, i));
  }

  function readIdx() {
    const raw = parseInt(new URLSearchParams(location.search).get("p"), 10);
    return clamp(isNaN(raw) ? 1 : raw);
  }

  /* ---- 페이지 표시 ---- */

  function show(i, dir) {
    i = clamp(i);
    if (busy || i === idx) return;
    busy = true;

    const cur = layers[front];
    const nxt = layers[1 - front];

    nxt.className = "page-img " + (dir > 0 ? "from-right" : "from-left");
    nxt.alt = "앨범 " + i + "쪽";

    const reveal = () => {
      loading.classList.remove("is-on");
      nxt.classList.add("is-on");
      cur.classList.remove("is-on");
      front = 1 - front;
      idx = i;
      afterShow();
      setTimeout(() => { busy = false; }, 190);
    };

    const timer = setTimeout(() => loading.classList.add("is-on"), 140);
    nxt.onload = () => { clearTimeout(timer); reveal(); };
    nxt.onerror = () => { clearTimeout(timer); reveal(); };
    nxt.src = srcOf(i);
    if (nxt.complete && nxt.naturalWidth) { clearTimeout(timer); nxt.onload = null; reveal(); }
  }

  function afterShow() {
    const page = pages[idx - 1];

    counter.innerHTML =
      "<b>" + idx + "</b> / " + pages.length +
      (page.date ? '<span class="sep">·</span><span class="date">' + page.date + "</span>"
                 : '<span class="sep">·</span><span class="date">' + page.year + "년</span>");

    prevZone.disabled = idx === 1;
    nextZone.disabled = idx === pages.length;
    finis.classList.toggle("is-on", idx === pages.length);

    Array.prototype.forEach.call(yearsEl.querySelectorAll(".year"), (b) => {
      b.classList.toggle("is-current", Number(b.dataset.year) === page.year);
    });

    const url = location.pathname + "?p=" + idx;
    history.replaceState({ p: idx }, "", url);

    preload();
  }

  function preload() {
    for (let d = 1; d <= PRELOAD; d++) {
      [idx - d, idx + d].forEach((i) => {
        if (i >= 1 && i <= pages.length) new Image().src = srcOf(i);
      });
    }
  }

  const go = (d) => show(idx + d, d);

  /* ---- 연도 바 ---- */

  function buildYears() {
    const first = new Map();
    pages.forEach((p) => { if (!first.has(p.year)) first.set(p.year, p.i); });

    const years = Array.from(first.keys()).sort((a, b) => a - b);
    const lo = years[0], hi = years[years.length - 1];

    for (let y = lo; y <= hi; y++) {
      if (first.has(y)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "year";
        b.dataset.year = y;
        b.textContent = y;
        b.title = y + "년으로";
        b.addEventListener("click", () => {
          const target = first.get(y);
          show(target, target > idx ? 1 : -1);
        });
        yearsEl.appendChild(b);
      } else {
        // 원본에 그 해의 페이지가 없다. 지우면 20년이 촘촘해 보이므로 빈자리로 남긴다.
        GAP_YEARS.push(y);
        const dot = document.createElement("span");
        dot.className = "year-gap";
        dot.title = y + "년 — 남은 기록이 없습니다";
        yearsEl.appendChild(dot);
      }
    }
  }

  /* ---- 조작 ---- */

  function bind() {
    prevZone.addEventListener("click", () => go(-1));
    nextZone.addEventListener("click", () => go(1));

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
      else if (e.key === "Home") { show(1, -1); e.preventDefault(); }
      else if (e.key === "End") { show(pages.length, 1); e.preventDefault(); }
    });

    // 포인터가 좌·우 가장자리 띠에 들어오면 화살표를 띄우고,
    // 아래쪽으로 내려오면 연도 바가 올라온다
    document.addEventListener("mousemove", (e) => {
      const band = innerWidth * EDGE_BAND;
      prevZone.classList.toggle("is-near", e.clientX < band);
      nextZone.classList.toggle("is-near", e.clientX > innerWidth - band);
      rail.classList.toggle("is-open", e.clientY > innerHeight * 0.82);
    });
    document.addEventListener("mouseleave", () => {
      prevZone.classList.remove("is-near");
      nextZone.classList.remove("is-near");
      rail.classList.remove("is-open");
    });

    // 손가락으로 넘기기
    let x0 = null, y0 = null;
    stage.addEventListener("touchstart", (e) => {
      x0 = e.changedTouches[0].clientX;
      y0 = e.changedTouches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      x0 = y0 = null;
    }, { passive: true });

    addEventListener("popstate", () => {
      const i = readIdx();
      if (i !== idx) show(i, i > idx ? 1 : -1);
    });
  }

  /* 세로로 든 휴대폰에서는 가로 페이지가 작게 눕는다. 한 번만 귀띔하고 사라진다. */
  function rotateHint() {
    const el = document.getElementById("rotateHint");
    if (!el) return;
    const portrait = matchMedia("(hover:none) and (orientation:portrait)");
    let shown = false;
    try {
      shown = sessionStorage.getItem("b614_rotate_hint") === "1";
    } catch (e) {}
    if (!portrait.matches || shown) return;

    try {
      sessionStorage.setItem("b614_rotate_hint", "1");
    } catch (e) {}
    setTimeout(() => el.classList.add("is-on"), 600);
    setTimeout(() => el.classList.remove("is-on"), 5200);
  }

  /* ---- 시작 ---- */

  fetch("content/pages.json")
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((data) => {
      pages = data;
      if (!pages.length) throw new Error("빈 목록");

      ext = pickExt();
      buildYears();
      bind();
      rotateHint();

      // 첫 장은 전환 없이 그대로 세운다
      idx = 0;
      const start = readIdx();
      const el = layers[front];
      el.alt = "앨범 " + start + "쪽";
      el.onload = () => {
        loading.classList.remove("is-on");
        el.classList.add("is-on");
        idx = start;
        afterShow();
      };
      loading.classList.add("is-on");
      el.src = "assets/pages/" + pages[start - 1].src + ext;
    })
    .catch(() => {
      loading.classList.remove("is-on");
      counter.textContent = "앨범을 불러오지 못했습니다.";
    });
})();
