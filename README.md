# B614 — 사진 앨범

원본 PDF 앨범(『B614 사진 앨범 2000~2019』 2nd edition, 72페이지)을
페이지 그대로 한 화면씩 넘겨보는 정적 사이트.

## 동선

```
index.html   입장 — 원본 표지(p1) + 비밀번호
  ↓
intro.html   상영관 — 필름 20프레임(원본 p2 연표의 사진들)
  ↓
album.html   앨범 — 원본 p3~p72, 70장
```

좌우 가장자리로 마우스를 옮기면 화살표가 떠오르고, 클릭하면 앞뒤로 넘어간다.
키보드 `←` `→` `Home` `End`, 휴대폰에서는 좌우 스와이프.
하단으로 마우스를 내리면 연도 점프 바가 올라온다.

## 구조

```
index.html  intro.html  album.html
css/    base.css(토큰)  enter.css  intro.css  album.css
js/     auth.js(게이트)  starfield.js  enter.js  intro.js  album.js
content/pages.json      70장의 순번·원본페이지·연도·날짜
assets/ cover/  pages/  bridge/
tools/  build_pages.py
```

## 다시 빌드하려면

원본 PDF를 저장소 **바깥**의 `../source/B614_album_2nd_edition.pdf` 에 두고:

```bash
python tools/build_pages.py --check   # 페이지 수·연도 판독만 확인
python tools/build_pages.py           # 렌더 + pages.json 생성
```

- 페이지 이미지는 WebP 200dpi(2000×1500)가 기본, JPEG 150dpi가 폴백이다.
- `content/pages.json` 은 **손으로 고치지 않는다.** PDF 텍스트에서 날짜를 읽어 생성된다.
- 2009~2011년은 원본에 페이지가 없다. 누락이 아니라 남은 기록이 없는 것이라,
  연도 바에서 지우지 않고 비활성 점으로 남긴다.

## 참고

- 입장 비밀번호는 클라이언트 SHA-256으로만 확인한다. 검색 노출은 `robots.txt` +
  `noindex` 로 막지만, 이미지 URL 자체는 직접 접근이 가능하다 — 지인 대상 아카이브 수준의 문단속이다.
- 게이트는 WebCrypto를 쓰므로 `file://` 로 직접 열면 동작하지 않는다. `https://` 또는 `localhost`로 열 것.
- 이전 버전(전시실 4개 + 퀴즈룸 구성)은 `v1` 태그에 남아 있다.
