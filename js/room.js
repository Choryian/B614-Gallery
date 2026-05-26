/* room.js — 전시실 뷰: 액자 레일 + 방 내레이션 + 라이트박스 + 방 이동 */
(function () {
  "use strict";

  let data, rooms, room, roomIndex, exhibits;
  let lbIndex = 0;
  let hoverTimer = null;
  let suppressHoverUntil = 0;
  let scrollRAF = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (window.B614Auth && !B614Auth.isAuthed()) return;
    data = await B614Catalog.load();
    if (!data) return fail("전시 준비 중입니다.");

    rooms = data.rooms || [];
    const reqId = new URLSearchParams(location.search).get("room");
    roomIndex = rooms.findIndex((r) => String(r.id) === String(reqId));
    if (roomIndex < 0) roomIndex = 0;
    room = rooms[roomIndex];
    if (!room) return fail("전시실을 찾을 수 없습니다.");

    exhibits = room.exhibits || [];
    document.title = (room.title || "전시실") + " · B614";

    renderHead();
    renderNarration();
    renderGallery();
    wireNav();
    wireLightbox();
  }

  function fail(text) {
    document.getElementById("gallery").innerHTML =
      '<p class="gallery-empty">' + text + "</p>";
    document.getElementById("roomIntroOverlay").classList.add("hidden");
  }

  function renderHead() {
    document.getElementById("roomTitle").textContent = room.title || "전시실";
    document.getElementById("roomPeriod").textContent = room.period || "";
    document.getElementById("roomCount").textContent =
      "전시물 " + exhibits.length + "점";
  }

  function renderNarration() {
    const ov = document.getElementById("roomIntroOverlay");
    document.getElementById("introKicker").textContent =
      "ROOM " + (["", "I", "II", "III", "IV"][roomIndex + 1] || roomIndex + 1);
    document.getElementById("introRoomTitle").textContent = room.title || "";
    document.getElementById("introNarration").textContent =
      room.intro || room.period || "";
    document.getElementById("enterRoomBtn").addEventListener("click", () => {
      ov.classList.add("hidden");
    });
  }

  function renderGallery() {
    const gal = document.getElementById("gallery");
    gal.innerHTML = "";

    if (!exhibits.length) {
      gal.innerHTML =
        '<p class="gallery-empty">이 전시실은 준비 중입니다.</p>';
      appendEndCard(gal);
      return;
    }

    exhibits.forEach((ex, idx) => {
      const photos = (ex.photos || []).map(B614Catalog.photoSrc);
      const first = photos[0] || "";

      const wrap = document.createElement("article");
      wrap.className = "exhibit";
      wrap.style.animationDelay = Math.min(idx * 0.05, 0.4) + "s";

      const inner = photos.length
        ? '<img loading="lazy" alt="' +
          escapeAttr(ex.title || "") +
          '" src="' +
          escapeAttr(first) +
          '" onerror="this.outerHTML=\'<div class=&quot;ph-fallback&quot;>FILM</div>\'" />'
        : quoteCardHtml(ex);

      const countBadge =
        photos.length > 1
          ? '<span class="frame-count">+' + (photos.length - 1) + "</span>"
          : "";

      wrap.innerHTML =
        '<div class="frame" role="button" tabindex="0" aria-label="' +
        escapeAttr((ex.title || "전시물") + " 확대 보기") +
        '">' +
        '<div class="frame-mat">' +
        inner +
        countBadge +
        "</div></div>" +
        '<div class="label">' +
        '<p class="label-date">' +
        escapeHtml(ex.date || "") +
        "</p>" +
        '<h2 class="label-title">' +
        escapeHtml(ex.title || "무제") +
        "</h2>" +
        (ex.place
          ? '<p class="label-place">' + escapeHtml(ex.place) + "</p>"
          : "") +
        (ex.caption
          ? '<p class="label-cap">' + escapeHtml(ex.caption) + "</p>"
          : "") +
        '<p class="label-more">클릭하여 사연 읽기 →</p>' +
        "</div>";

      const frame = wrap.querySelector(".frame");
      frame.addEventListener("click", () => openLightbox(idx));
      frame.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(idx);
        }
      });

      wireHoverCenter(wrap);

      gal.appendChild(wrap);
    });

    appendEndCard(gal);
  }

  /* 호버/포커스 시 해당 카드를 레일 중앙으로 이동시키는 동작을 연결.
     일반 전시물과 마지막 안내 카드 모두 동일하게 사용한다. */
  function wireHoverCenter(el) {
    el.addEventListener("mouseenter", () => {
      if (Date.now() < suppressHoverUntil) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => centerExhibit(el), 55);
    });
    el.addEventListener("mouseleave", () => clearTimeout(hoverTimer));
    el.addEventListener("focusin", () => centerExhibit(el));
  }

  /* 마우스를 올린 전시물을 레일 중앙으로 이동. 거리와 무관하게 일정한 속도로
     느껴지도록 커스텀 애니메이션(약 280ms)을 쓴다. 스크롤 중 다른 전시물이
     커서 아래로 들어와 연쇄 발동하는 것을 막기 위해 일정 시간 hover를 무시한다.
     scroll-snap이 애니메이션과 충돌하지 않도록 애니메이션 동안만 끈다. */
  function centerExhibit(el) {
    if (!el || (lb && lb.classList.contains("open"))) return;
    const overlay = document.getElementById("roomIntroOverlay");
    if (overlay && !overlay.classList.contains("hidden")) return;

    const gal = document.getElementById("gallery");
    const galRect = gal.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta =
      elRect.left + elRect.width / 2 - (galRect.left + galRect.width / 2);
    const max = gal.scrollWidth - gal.clientWidth;
    const start = gal.scrollLeft;
    const target = Math.max(0, Math.min(start + delta, max));
    const dist = target - start;
    if (Math.abs(dist) < 2) return;

    suppressHoverUntil = Date.now() + 450;
    if (scrollRAF) cancelAnimationFrame(scrollRAF);
    gal.style.scrollSnapType = "none";

    const dur = 280;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      gal.scrollLeft = start + dist * e;
      if (p < 1) {
        scrollRAF = requestAnimationFrame(tick);
      } else {
        gal.style.scrollSnapType = "";
        scrollRAF = null;
      }
    }
    scrollRAF = requestAnimationFrame(tick);
  }

  function appendEndCard(gal) {
    const next = rooms[roomIndex + 1];
    const card = document.createElement("article");
    card.className = "exhibit end-card";
    const nextBtn = next
      ? '<a class="enter-btn" href="room.html?room=' +
        encodeURIComponent(next.id) +
        '">다음 전시실 ›</a>'
      : '<a class="enter-btn" href="exit.html">출구로 →</a>';
    card.innerHTML =
      '<div class="end-inner">' +
      "<h3>" +
      (next ? "다음 전시실" : "관람의 끝") +
      "</h3>" +
      "<p>" +
      (next
        ? escapeHtml(next.title || "") + " · " + escapeHtml(next.period || "")
        : "마지막 전시실까지 둘러보셨습니다.") +
      "</p>" +
      nextBtn +
      '<p style="margin-top:1.2rem"><a class="ghost-link" href="lobby.html">전시실 목록</a></p>' +
      "</div>";
    wireHoverCenter(card);
    gal.appendChild(card);
  }

  function wireNav() {
    const prev = document.getElementById("prevRoom");
    const next = document.getElementById("nextRoom");
    const lobby = document.getElementById("toLobby");

    if (rooms[roomIndex - 1]) {
      prev.href = "room.html?room=" + encodeURIComponent(rooms[roomIndex - 1].id);
    } else {
      prev.classList.add("disabled");
    }
    if (rooms[roomIndex + 1]) {
      next.href = "room.html?room=" + encodeURIComponent(rooms[roomIndex + 1].id);
    } else {
      next.textContent = "출구 ›";
      next.href = "exit.html";
    }
    lobby.addEventListener("click", () => location.assign("lobby.html"));
  }

  /* ---------- 라이트박스 ---------- */
  let lb, lbStage;
  function wireLightbox() {
    lb = document.getElementById("lightbox");
    lbStage = document.getElementById("lbStage");
    document.getElementById("lbClose").addEventListener("click", closeLightbox);
    document.getElementById("lbPrev").addEventListener("click", () => step(-1));
    document.getElementById("lbNext").addEventListener("click", () => step(1));
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowUp" && rotatePhoto) {
        e.preventDefault();
        rotatePhoto(-1);
      } else if (e.key === "ArrowDown" && rotatePhoto) {
        e.preventDefault();
        rotatePhoto(1);
      }
    });
  }

  function openLightbox(idx) {
    lbIndex = idx;
    renderLightbox();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("lbClose").focus();
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }
  function step(d) {
    const n = lbIndex + d;
    if (n < 0 || n >= exhibits.length) return;
    lbIndex = n;
    renderLightbox();
  }

  function renderLightbox() {
    const ex = exhibits[lbIndex];
    const photos = (ex.photos || []).map(B614Catalog.photoSrc);

    const n = photos.length;
    const imgs = n
      ? photos
          .map(
            (src, i) =>
              '<img class="lb-photo' +
              (i === 0 ? " active" : "") +
              '" alt="' +
              escapeAttr(ex.title || "") +
              '" src="' +
              escapeAttr(src) +
              '" onerror="this.outerHTML=\'<div class=&quot;ph-fallback&quot;>FILM</div>\'" />'
          )
          .join("") +
        (n > 1
          ? '<button class="lb-rot up" type="button" aria-label="이전 사진">▲</button>' +
            '<button class="lb-rot down" type="button" aria-label="다음 사진">▼</button>' +
            '<span class="lb-photo-idx">1 / ' + n + "</span>"
          : "")
      : quoteCardHtml(ex);

    const speakers =
      ex.speakers && ex.speakers.length
        ? '<div class="lb-speakers">' +
          ex.speakers
            .map((s) => '<span class="lb-speaker">(' + escapeHtml(s) + ")</span>")
            .join("") +
          "</div>"
        : "";

    lbStage.innerHTML =
      '<div class="lb-imgs">' +
      imgs +
      "</div>" +
      '<div class="lb-info">' +
      '<p class="lb-date">' +
      escapeHtml(ex.date || "") +
      "</p>" +
      '<h2 class="lb-title">' +
      escapeHtml(ex.title || "무제") +
      "</h2>" +
      (ex.place ? '<p class="lb-place">' + escapeHtml(ex.place) + "</p>" : "") +
      '<div class="lb-story">' +
      escapeHtml(ex.story || ex.caption || "기록이 준비 중입니다.") +
      "</div>" +
      speakers +
      "</div>";

    lbStage.scrollTop = 0;
    setupPhotoRotator();
    setupInfoFade();
    document
      .getElementById("lbPrev")
      .classList.toggle("disabled", lbIndex === 0);
    document
      .getElementById("lbNext")
      .classList.toggle("disabled", lbIndex === exhibits.length - 1);
  }

  /* 여러 장일 때: 한 장씩 크게 보여주고 위/아래 버튼으로 회전(순환) */
  let rotatePhoto = null; // 키보드(↑/↓)에서 호출
  function setupPhotoRotator() {
    rotatePhoto = null;
    const box = lbStage.querySelector(".lb-imgs");
    if (!box) return;
    const photos = [].slice.call(box.querySelectorAll(".lb-photo"));
    if (photos.length < 2) return; // 한 장이면 회전 불필요
    const idxEl = box.querySelector(".lb-photo-idx");
    let cur = 0;
    let busy = false;

    function go(dir) {
      if (busy || photos.length < 2) return;
      busy = true;
      const old = photos[cur];
      cur = (cur + dir + photos.length) % photos.length;
      const neu = photos[cur];
      // 들어오는 사진을 반대편에 위치시킨 뒤 제자리로
      neu.style.transition = "none";
      neu.style.transform =
        dir > 0
          ? "translateY(52px) rotateX(12deg)"
          : "translateY(-52px) rotateX(-12deg)";
      neu.classList.add("active");
      void neu.offsetWidth; // reflow
      neu.style.transition = "";
      neu.style.transform = "";
      // 나가는 사진
      old.style.transform =
        dir > 0
          ? "translateY(-52px) rotateX(-12deg)"
          : "translateY(52px) rotateX(12deg)";
      old.classList.remove("active");
      setTimeout(() => {
        old.style.transform = "";
        busy = false;
      }, 520);
      if (idxEl) idxEl.textContent = cur + 1 + " / " + photos.length;
    }

    box.querySelector(".lb-rot.up").addEventListener("click", () => go(-1));
    box.querySelector(".lb-rot.down").addEventListener("click", () => go(1));
    rotatePhoto = go; // ↑/↓ 키 연결
  }

  /* 오른쪽 글이 넘칠 때 하단에 '더 있음' 그라데이션 표시, 끝까지 내리면 사라진다. */
  function setupInfoFade() {
    const info = lbStage.querySelector(".lb-info");
    if (!info) return;
    const update = () => {
      const more = info.scrollHeight - info.clientHeight > 6;
      info.classList.toggle("has-more", more);
      const atBottom =
        info.scrollTop + info.clientHeight >= info.scrollHeight - 8;
      info.classList.toggle("at-bottom", atBottom);
    };
    info.addEventListener("scroll", update);
    requestAnimationFrame(() => requestAnimationFrame(update));
  }

  /* 사진이 없는 전시물용: 회상글에서 한 구절을 발췌해 글귀 액자로 보여준다. */
  function quoteCardHtml(ex) {
    const txt = String(ex.story || ex.caption || "").replace(/\s+/g, " ").trim();
    let q = txt;
    const cut = txt.search(/[.!?…]/);
    if (cut > 12 && cut < 88) q = txt.slice(0, cut + 1);
    else if (q.length > 90) q = q.slice(0, 88).trim() + "…";
    if (!q) q = ex.title || "B614";
    return (
      '<div class="quote-card">' +
      '<span class="quote-mark">“</span>' +
      '<p class="quote-text">' +
      escapeHtml(q) +
      "</p>" +
      '<span class="quote-by">B614</span>' +
      "</div>"
    );
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }
})();
