/* catalog.js — content/catalog.json 우선 로드, 없으면 sample 로 폴백 */
(function () {
  "use strict";

  let _cache = null;

  async function tryFetch(url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && Array.isArray(data.rooms)) return data;
      return null;
    } catch (e) {
      return null;
    }
  }

  async function load() {
    if (_cache) return _cache;
    // 1순위: 통합 단계에서 채워질 실제 카탈로그
    let data = await tryFetch("../content/catalog.json");
    // 2순위: 같은 디렉터리에 복사돼 있을 수도 있음
    if (!data) data = await tryFetch("content/catalog.json");
    // 폴백: 개발/검증용 샘플
    if (!data) {
      data = await tryFetch("js/sample-catalog.json");
      if (data) data.__sample = true;
    }
    _cache = data;
    return data;
  }

  // 파일명 → 사이트 경로
  function photoSrc(filename) {
    if (!filename) return "";
    return "assets/photos/" + filename;
  }

  window.B614Catalog = { load, photoSrc };
})();
