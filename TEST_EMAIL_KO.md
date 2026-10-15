# 이메일 테스트 및 배포 점검

테스트 수신 주소: `72unicon@gmail.com` (실제 발송 전 주소 소유 확인 필요)

## 현재 확인 사항
- Supabase 프로젝트: ihdweoqvqvrpafmutetb
- Vercel 프로젝트: prj_xYyoxmpUt0j6bkKFWdkHIMXa3Bd0
- 실제 점검 저장 25개 및 사진 DB 기록 5건 확인
- PDF 및 Resend 이메일 실제 발송 미검증

## 배포 전 필수 준비
1. GitHub에 비공개 `smart-5s-inspector` 저장소를 만들고 이 프로젝트를 등록합니다.
2. Vercel 프로젝트와 저장소를 연결합니다.
3. Vercel 프로젝트 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 입력합니다. 값은 사용자 대시보드에서 직접 설정하고 공유하지 않습니다.
4. PDFKit에 사용 가능한 한국어 TTF 파일을 서버 실행 위치에 별도로 마련하고 `KOREAN_FONT_PATH`를 설정합니다. Vercel 서버에는 Windows 맑은 고딕 경로가 존재하지 않습니다.
5. `EMAIL_DELIVERY_ENABLED=false`를 유지합니다. 사용자 소유 이메일 확인, 발송량 제한, 일회성 토큰 및 중복 방지 구현이 끝난 뒤에만 true로 변경합니다.
6. Resend의 인증된 발신 도메인 및 `RESEND_API_KEY`, `REPORT_FROM_EMAIL`을 설정합니다.

## 실행 검증
- `npm ci` 또는 `npm install`
- `npm run typecheck`
- `npm test`
- `npm run build`
- 배포 후 사진 업로드 및 한글 PDF 다운로드 실제 점검 테스트
- 인증된 테스트 수신주소로 첨부 PDF 수신 확인

## 현재 장애
- 연결된 Vercel API에서 환경변수 조회 시 HTTP 403 권한 부족
- 개발 컨테이너 npm 설치 시간 초과로 전체 빌드 검증 미완료
- GitHub 신규 저장소 생성 액션이 연결 도구에 없음
