/* quiz.js — B614 추억 퀴즈룸: 3문제 라운드, 오답 시 재도전, 전부 정답 시 축하 */
(function () {
  "use strict";

  if (window.B614Auth && !B614Auth.isAuthed()) {
    location.replace("index.html");
    return;
  }

  const ROUND = 3; // 한 라운드 문제 수
  const DIFF_ORDER = ["하", "중", "상"]; // 출제 순서(쉬움→어려움)

  let pools = { 하: [], 중: [], 상: [] };
  let round = []; // 이번 라운드 3문제
  let step = 0; // 현재 문제 인덱스(0~2)

  const $ = (id) => document.getElementById(id);
  const stage = () => $("quizStage");
  const failScreen = () => $("failScreen");
  const winScreen = () => $("successScreen");

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const data = await loadQuiz();
    const qs = (data && data.questions) || [];
    qs.forEach((q) => {
      if (pools[q.difficulty]) pools[q.difficulty].push(q);
    });
    if (!qs.length) {
      $("qText").textContent = "퀴즈를 준비 중입니다. 잠시 후 다시 찾아주세요.";
      $("qOptions").innerHTML = "";
      return;
    }
    $("failRetry").addEventListener("click", startRound);
    $("winRetry").addEventListener("click", startRound);
    startRound();
  }

  async function loadQuiz() {
    for (const url of ["content/quiz.json", "js/quiz-sample.json"]) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (e) {}
    }
    return null;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  function startRound() {
    // 난이도별 한 문제씩, 풀이 비어있으면 전체에서 보충
    const all = [].concat(pools.하, pools.중, pools.상);
    round = [];
    const used = new Set();
    DIFF_ORDER.forEach((d) => {
      const pool = pools[d].filter((q) => !used.has(q));
      const q = pool.length ? pick(pool) : pick(all.filter((x) => !used.has(x)));
      if (q) {
        used.add(q);
        round.push(q);
      }
    });
    // 혹시 부족하면 채우기
    while (round.length < ROUND) {
      const q = pick(all.filter((x) => !used.has(x)));
      if (!q) break;
      used.add(q);
      round.push(q);
    }
    step = 0;
    show(stage());
    hide(failScreen());
    hide(winScreen());
    renderProgress();
    renderQuestion();
  }

  function renderProgress() {
    const el = $("quizProgress");
    el.innerHTML = "";
    for (let i = 0; i < round.length; i++) {
      const d = document.createElement("span");
      d.className = "dot" + (i < step ? " done" : i === step ? " cur" : "");
      el.appendChild(d);
    }
  }

  function renderQuestion() {
    const q = round[step];
    renderProgress();
    const diff = $("qDiff");
    diff.textContent = q.difficulty || "";
    diff.className = "q-diff d-" + (q.difficulty || "");
    $("qText").textContent = q.q;

    // 보기 셔플(정답 위치 무작위화)
    const opts = q.options.map((text, i) => ({ text, correct: i === q.answer }));
    const shown = shuffle(opts);
    const ul = $("qOptions");
    ul.innerHTML = "";
    shown.forEach((o, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "q-opt";
      btn.type = "button";
      btn.innerHTML =
        '<span class="mk">' + "ABCD"[i] + "</span>" + escapeHtml(o.text);
      btn.addEventListener("click", () => answer(btn, o.correct, ul));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function answer(btn, correct, ul) {
    // 중복 클릭 방지
    [...ul.querySelectorAll("button")].forEach((b) => (b.disabled = true));
    if (correct) {
      btn.classList.add("correct");
      setTimeout(() => {
        step++;
        if (step >= round.length) showWin();
        else renderQuestion();
      }, 650);
    } else {
      btn.classList.add("wrong");
      // 정답도 표시
      const q = round[step];
      [...ul.querySelectorAll("button")].forEach((b) => {
        if (b.textContent.replace(/^[ABCD]/, "").trim() === q.options[q.answer])
          b.classList.add("correct");
      });
      setTimeout(showFail, 900);
    }
  }

  function showFail() {
    hide(stage());
    hide(winScreen());
    show(failScreen());
    $("failMsg").textContent =
      step === 0
        ? "첫 문제부터 만만치 않죠? 다시 도전해 보세요."
        : (step + 1) + "번째 문제에서 멈췄어요. 그 시절을 더 떠올려 볼까요?";
  }

  function showWin() {
    hide(stage());
    hide(failScreen());
    show(winScreen());
    launchConfetti();
  }

  function launchConfetti() {
    const box = $("confetti");
    box.innerHTML = "";
    const colors = ["#ffce4d", "#c9a25a", "#7fd6a2", "#e88a8a", "#9db4ff", "#f1ecdf"];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2.4 + Math.random() * 2.6 + "s";
      c.style.animationDelay = Math.random() * 1.2 + "s";
      c.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      box.appendChild(c);
    }
  }

  function show(el) {
    el && el.classList.remove("hidden");
  }
  function hide(el) {
    el && el.classList.add("hidden");
  }
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }
})();
