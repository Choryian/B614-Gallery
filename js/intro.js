/* intro.js — 입장 게이트 검증 + 로비 전환 */
(function () {
  "use strict";

  // 이미 인증된 상태로 인트로에 다시 오면 바로 로비로
  if (window.B614Auth && B614Auth.isAuthed()) {
    location.replace("lobby.html");
    return;
  }

  // 카탈로그의 환영 문구를 인트로에 반영 (있으면)
  if (window.B614Catalog) {
    /* catalog.js 가 인트로엔 로드되지 않으므로 생략 가능 */
  }

  const form = document.getElementById("gateForm");
  const pw = document.getElementById("pw");
  const msg = document.getElementById("gateMsg");
  const card = document.querySelector(".intro-card");

  if (!form) return;

  let busy = false;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    msg.className = "gate-msg";
    msg.textContent = "확인 중…";

    const ok = await B614Auth.verify(pw.value);

    if (ok) {
      msg.className = "gate-msg ok";
      msg.textContent = "환영합니다. 상영관으로 모시는 중…";
      B614Auth.setAuthed();
      card.classList.add("fade-out");
      setTimeout(() => location.assign("bridge.html"), 700);
    } else {
      busy = false;
      msg.className = "gate-msg error";
      msg.textContent = "이 갤러리는 B614 친구들만 입장할 수 있습니다.";
      card.classList.remove("shake");
      void card.offsetWidth; // reflow → 애니메이션 재시작
      card.classList.add("shake");
      pw.select();
    }
  });

  pw.addEventListener("input", function () {
    if (msg.classList.contains("error")) {
      msg.className = "gate-msg";
      msg.textContent = "";
    }
  });
})();
