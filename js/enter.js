/* enter.js — 입장 게이트. 통과하면 상영관으로 넘긴다. */
(function () {
  "use strict";

  const form = document.getElementById("gateForm");
  const pw = document.getElementById("pw");
  const msg = document.getElementById("gateMsg");
  const stage = document.querySelector(".enter-stage");

  // 이미 인증된 채로 되돌아온 경우엔 문 앞에 세워두지 않는다
  if (window.B614Auth && B614Auth.isAuthed()) {
    location.replace("album.html");
    return;
  }

  function say(text, kind) {
    msg.textContent = text;
    msg.className = "gate-msg" + (kind ? " " + kind : "");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const value = pw.value;
    if (!value) {
      pw.focus();
      return;
    }

    say("확인하는 중…");
    const ok = await B614Auth.verify(value);

    if (ok) {
      B614Auth.setAuthed();
      say("환영합니다. 곧 상영이 시작됩니다.", "ok");
      stage.classList.add("fade-out");
      setTimeout(() => location.assign("intro.html"), 700);
      return;
    }

    say("이 앨범은 B614 친구들만 펼칠 수 있습니다.", "error");
    pw.value = "";
    // 리플로우를 강제해야 연속 실패에도 흔들림이 다시 재생된다
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
    pw.focus();
  });

  pw.focus();
})();
