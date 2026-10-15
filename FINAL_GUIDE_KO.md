# Smart 5S Inspector 최종 연결 가이드

## 현재 구현
- Supabase 5S 점검 25개 조회 / 익명 인증
- 1~5점 필수 평가 및 낮은 점수의 문제점·사진 검증
- 점검과 이미지 Supabase 저장
- PDF 생성·비공개 Storage 저장·10분 다운로드 URL
- Resend REST API 이메일 첨부 발송, DB 발송 기록

## 설치
기존 C:\kimsabu\smart-5s-inspector-starter 에 파일을 덮어쓴 후 `npm install`, `npm run dev`. 기존 `.env.local`은 덮어쓰지 마세요.

## 환경변수
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(publishable), `SUPABASE_SERVICE_ROLE_KEY`는 기존 값 유지. 추가로 Resend에서 확인한 발신 도메인의 `REPORT_FROM_EMAIL`, 발급한 `RESEND_API_KEY`를 서버 환경변수로 입력. 키를 채팅/저장소에 공개하지 마세요.

## 보고서 순서
25개 점검 완료 → Supabase 점검·사진 저장 → PDF 보고서 생성·저장 → PDF 보고서 이메일 발송. PDF 보고서 생성 기능은 서버에서 한글 폰트 사용 가능 여부 검증 필요.

## 운영 전 필수 미완료 사항
- 이메일을 임의로 입력할 수 있으므로 수신 이메일 소유 확인(일회성 메일 인증) 도입 후 운영 공개
- 요청 빈도 제한 / 봇 방어 / 중복 요청 DB 레벨 멱등성
- 5S 체크리스트 마스터 변경 시 PDF는 점검 당시 snapshot 기준으로 생성하도록 개편
- 장시간 사진 업로드 시 복구/재시도, 트랜잭션 및 고아 데이터 정리
- Next.js 전체 빌드, 실제 사진 포함 PDF, Resend 도메인 인증과 메일 수신 검증
- Vercel에 환경변수를 등록하고 GitHub와 연동하여 배포

이 패키지는 실제 제조 현장 운영용 출시 검증을 마친 서비스가 아닌 배포 준비 단계의 통합 구현본입니다.
