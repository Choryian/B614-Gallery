/* bridge.js — 비밀번호 입장 후 상영관(영화) 재생 → 끝나면 로비로 */
(function () {
  "use strict";

  // 인증되지 않은 접근은 입구로
  if (window.B614Auth && !B614Auth.isAuthed()) {
    location.replace("index.html");
    return;
  }

  // PDF 2페이지의 필름 20개 프레임 — 연도순 정렬(프레임 위치↔연도 라벨 매칭 결과)
  const ORDER = [
    [4, "2000"], [5, "2002"], [1, "2003"], [2, "2004"], [3, "2004"],
    [6, "2004"], [7, "2005"], [8, "2005"], [9, "2007"], [10, "2007"],
    [11, "2013"], [12, "2013"], [13, "2014"], [14, "2014"], [15, "2015"],
    [16, "2016"], [17, "2017"], [18, "2017"], [19, "2018"], [20, "2019"],
  ];
  const FRAMES = ORDER.map(([n, year]) => ({
    src: "assets/bridge/frame" + String(n).padStart(2, "0") + ".jpeg",
    year: year,
  }));

  const PER_FRAME = 900; // 프레임 한 장당(ms)

  const cinema = document.getElementById("cinema");
  const loader = document.getElementById("reelLoader");
  const leader = document.getElementById("leader");
  const leaderNum = document.getElementById("leaderNum");
  const titleCard = document.getElementById("titleCard");
  const montage = document.getElementById("montage");
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const yearEl = document.getElementById("montageYear");
  const endCard = document.getElementById("endCard");
  const skipBtn = document.getElementById("skipBtn");

  const timers = [];
  let done = false;
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  function goLobby() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    cinema.classList.add("fade-out");
    setTimeout(() => location.replace("lobby.html"), 950);
  }
  skipBtn.addEventListener("click", goLobby);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Enter") goLobby();
  });

  buildSeating();

  // 사진 미리 로드 후 상영 시작
  preload(FRAMES.map((f) => f.src)).then(start);
  // 혹시 로딩이 지나치게 늦어도 1.8초 뒤엔 시작
  setTimeout(() => start(), 1800);

  let started = false;
  function start() {
    if (started || done) return;
    started = true;
    runTimeline();
  }

  function runTimeline() {
    let t = 0;

    // 1) 로더 사라지고 카운트다운 리더
    at(t, () => {
      loader.style.opacity = "0";
    });
    t += 450;
    at(t, () => {
      hide(loader);
      show(leader);
    });
    [5, 4, 3, 2, 1].forEach((n) => {
      at(t, () => (leaderNum.textContent = n));
      t += 800;
    });
    at(t, () => hide(leader));

    // 2) 타이틀 카드
    at(t, () => show(titleCard));
    t += 2600;
    at(t, () => hide(titleCard));

    // 3) 사진 몽타주
    at(t, () => show(montage));
    FRAMES.forEach((f, i) => {
      at(t, () => paintFrame(i));
      t += PER_FRAME;
    });
    at(t, () => {
      hide(montage);
    });

    // 4) 종료 카드 → 로비
    at(t, () => show(endCard));
    t += 2200;
    at(t, goLobby);
  }

  let frontLayer = true;
  function paintFrame(i) {
    const f = FRAMES[i];
    const incoming = frontLayer ? imgA : imgB;
    const outgoing = frontLayer ? imgB : imgA;
    incoming.src = f.src;
    incoming.classList.remove("kb");
    void incoming.offsetWidth; // 애니메이션 재시작
    incoming.classList.add("show", "kb");
    outgoing.classList.remove("show");
    frontLayer = !frontLayer;

    yearEl.textContent = f.year;
    yearEl.classList.add("show");
  }

  // 객석 좌석 실루엣 생성(뒤→앞, 원근감)
  function buildSeating() {
    const wrap = document.getElementById("seating");
    if (!wrap) return;
    // [좌석수, 너비px, 높이px, 줄간격px] — 뒤→앞(원근감), 4열
    const rows = [
      [20, 30, 38, 3],
      [16, 42, 54, 7],
      [13, 58, 78, 12],
      [10, 80, 112, 18],
    ];
    rows.forEach((cfg) => {
      const [count, w, h, gap] = cfg;
      const row = document.createElement("div");
      row.className = "seat-row";
      row.style.gap = gap + "px";
      row.style.marginBottom = -(h * 0.3) + "px";
      const aisle = Math.floor(count / 2); // 중앙 통로
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.className = "seat";
        s.style.width = w + "px";
        s.style.height = h + "px";
        if (i === aisle) s.style.marginLeft = w * 1.1 + "px";
        row.appendChild(s);
      }
      wrap.appendChild(row);
    });
  }

  function preload(srcs) {
    return Promise.all(
      srcs.map(
        (s) =>
          new Promise((res) => {
            const im = new Image();
            im.onload = im.onerror = () => res();
            im.src = s;
          })
      )
    );
  }
})();
