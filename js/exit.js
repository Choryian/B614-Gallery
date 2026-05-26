/* exit.js — 발행 정보 반영 */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", async function () {
    if (window.B614Auth && !B614Auth.isAuthed()) return;
    try {
      const data = await B614Catalog.load();
      const pub = data && data.gallery && data.gallery.published;
      if (pub) {
        document.getElementById("exitPub").textContent =
          "발행 · " + pub + " — B614";
      }
    } catch (e) {}
  });
})();
