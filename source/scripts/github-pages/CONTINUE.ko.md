# 다른 AI에게 그대로 전달하기

아래 문장을 복사해서 GitHub가 연결된 AI에게 보내면 됩니다.

```text
내가 만들던 수박정원 게임을 현재 상태에서 이어서 개발해 줘.
저장소는 https://github.com/sanghyun8420/my_Ai_app2 이고 이미 공개 중이야.
새 프로젝트를 만들지 말고 이 저장소의 최신 main을 읽어 줘.
먼저 AGENTS.md와 source/HANDOFF.ko.md를 읽고 현재 구조와 저장 규칙을 파악해 줘.
수정 원본은 source/이고, 루트 파일은 GitHub Pages 실행용 생성 파일이야.
Node.js24 환경에서 source/의 npm install, npm test, npm run build로 확인하고,
npm run dev로 localhost:4173의 게임과 별도 로컬 API를 실행해 확인해 줘.
저장소 루트의 node source/scripts/sync-pages.mjs로 공개 파일도 갱신해 줘.
기존 보석·동전·구매 내역·업적·기록은 보존해 줘.
보석은 다섯 게임 공용, 동전은 게임별이고, 과학 모드와 닉네임 순위·서버 백업·복구 코드까지 추가된 상태야.
동일 닉네임으로 남의 기록을 가져오지 않도록 비공개 복구 키와 서버 저장 버전 충돌 처리를 유지해 줘.
기존 API 주소는 유지해 줘. GitHub 연결만으로 기존 Sites 서버 배포 권한이 생기는 것은 아니므로,
서버 변경이 필요할 때는 source/HANDOFF.ko.md의 배포 구분을 따라 줘.
내 다음 요청부터 실제 코드 수정과 검사를 진행해 줘.
```

공개 게임: https://sanghyun8420.github.io/my_Ai_app2/

코드 ZIP을 받은 경우에는 ZIP을 첨부하고 같은 문장을 보내도 됩니다. ZIP 안의 개발 프로젝트 루트가 GitHub의 `source/`에 해당합니다. 개인 비밀번호나 토큰은 전달할 필요가 없습니다.
