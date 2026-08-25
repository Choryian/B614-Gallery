/* auth.js — 클라이언트 SHA-256 인증 (평문은 코드에 없음) */
(function () {
  "use strict";

  // 정답 해시 (CONTRACT.md 확정). 평문은 코드에 두지 않는다.
  const ANSWER_HASH =
    "79d29ec2b25a21ab256a7a0f84c5f2b3c46fa386bd4556120c4c5068502f8e8f";
  const FLAG_KEY = "b614_authed";

  // 입력 문자열의 SHA-256 16진 문자열 반환
  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function verify(input) {
    if (!input) return false;
    try {
      const hex = await sha256Hex(input.trim());
      return hex === ANSWER_HASH;
    } catch (e) {
      return false;
    }
  }

  function isAuthed() {
    try {
      return sessionStorage.getItem(FLAG_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function setAuthed() {
    try {
      sessionStorage.setItem(FLAG_KEY, "1");
    } catch (e) {}
  }
  function clear() {
    try {
      sessionStorage.removeItem(FLAG_KEY);
    } catch (e) {}
  }

  // 보호된 페이지에서 미인증이면 입구로 돌려보냄
  function guard() {
    if (!isAuthed()) {
      location.replace("index.html");
      return false;
    }
    return true;
  }

  window.B614Auth = { verify, isAuthed, setAuthed, clear, guard, sha256Hex };

  // 입장 화면 외에는 즉시 가드 (body class로 판별)
  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.classList.contains("page-album")) guard();
  });
})();
