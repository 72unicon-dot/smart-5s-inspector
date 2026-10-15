# Smart 5S Inspector · Phase 2

## 현재 상태
- 모바일 5S 25개 항목, 1~5점, N/A 없음, 점수 집계
- 익명 Supabase 사용자 인증 후 서버 API를 통한 점검·사진 저장
- DB 연결 전에는 데모 기능만 작동합니다.
- **PDF 자동 생성, 이메일 전송, 관리자 화면, 운영용 남용 방지 및 현장별 매핑은 아직 미구현입니다.**

## Windows 설치 및 실행
1. ZIP의 `smart-5s-inspector-starter` 폴더 내용물을 기존 프로젝트 폴더에 복사하여 덮어씁니다.
2. `cmd`에서 `npm install` 실행
3. `.env.example`을 `.env.local`로 복사하고 Supabase 설정값을 입력 (키는 공개하지 마세요)
4. Supabase 프로젝트의 SQL Editor에서 `supabase/migrations/202610150001_init.sql`, 그 다음 `202610150002_storage.sql` 실행
5. Supabase 대시보드 > Authentication > Providers > Anonymous Sign-ins 활성화
6. `npm run dev` 실행 후 http://localhost:3000 열기
7. 점검 후 종합 결과에서 `Supabase에 점검·사진 저장` 버튼 클릭

## 주의
- `SUPABASE_SERVICE_ROLE_KEY`는 비공개 서버 환경변수로만 유지합니다. NEXT_PUBLIC_ 접두사를 붙이지 마세요.
- 클라우드 사진 업로드는 저장 시 일괄 처리됩니다. 모바일 네트워크/서버 요청 본문 크기 제한에 따라 큰 사진은 실패할 수 있습니다. 이 버전은 실사용 배포용이 아니라 통합 테스트용입니다.
- 최종 운영 전 업로드 사전서명 URL, 이미지 압축, 저장 오류 롤백, 속도 제한, CAPTCHA, 이메일 인증, 재시도/멱등성, 보안 검증을 보완하세요.
- 사업장/현장 정보는 현재 새 점검마다 생성됩니다. 다음 단계에서 마스터 선택/재사용으로 개선할 예정입니다.
