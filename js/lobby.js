/* lobby.js — 카탈로그를 읽어 전시실 문(door) 렌더 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (window.B614Auth && !B614Auth.isAuthed()) return; // guard 가 이미 처리
    const data = await B614Catalog.load();
    const doorsEl = document.getElementById("doors");

    if (!data) {
      doorsEl.innerHTML =
        '<p class="gallery-empty">전시 준비 중입니다. 잠시 후 다시 찾아주세요.</p>';
      return;
    }

    const g = data.gallery || {};
    if (g.title) document.getElementById("lobbyTitle").textContent = g.title;
    if (g.subtitle) document.getElementById("lobbySub").textContent = g.subtitle;
    if (g.period) document.getElementById("lobbyPeriod").textContent = g.period;
    document.title = (g.title || "B614") + " · 로비";

    const rooms = data.rooms || [];
    doorsEl.innerHTML = "";

    rooms.forEach((room, i) => {
      const exhibits = room.exhibits || [];
      // 대표 사진: 첫 전시물의 첫 사진
      let cover = "";
      for (const ex of exhibits) {
        if (ex.photos && ex.photos.length) {
          cover = B614Catalog.photoSrc(ex.photos[0]);
          break;
        }
      }
      const photoCount = exhibits.reduce(
        (n, ex) => n + ((ex.photos && ex.photos.length) || 0),
        0
      );

      const a = document.createElement("a");
      a.className = "door";
      a.href = "room.html?room=" + encodeURIComponent(room.id);
      a.style.animationDelay = i * 0.08 + "s";
      a.setAttribute(
        "aria-label",
        "전시실 " + (i + 1) + ": " + (room.title || "")
      );

      const frame = cover
        ? '<div class="door-frame"><img loading="lazy" alt="" src="' +
          escapeAttr(cover) +
          '" onerror="this.parentNode.classList.add(\'empty\');this.remove();this.parentNode.textContent=\'B614\'" /></div>'
        : '<div class="door-frame empty">B614</div>';

      a.innerHTML =
        frame +
        '<div class="door-body">' +
        '<p class="door-no">ROOM ' +
        romanOrNum(i + 1) +
        "</p>" +
        '<h2 class="door-title">' +
        escapeHtml(room.title || "전시실") +
        "</h2>" +
        '<p class="door-period">' +
        escapeHtml(room.period || "") +
        "</p>" +
        '<p class="door-meta">전시물 ' +
        exhibits.length +
        "점 · 사진 " +
        photoCount +
        "장</p>" +
        '<p class="door-cta">입장하기 →</p>' +
        "</div>";

      doorsEl.appendChild(a);
    });

    if (!rooms.length) {
      doorsEl.innerHTML =
        '<p class="gallery-empty">아직 전시실이 준비되지 않았습니다.</p>';
    }
  }

  function romanOrNum(n) {
    return ["", "I", "II", "III", "IV", "V", "VI"][n] || String(n);
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
