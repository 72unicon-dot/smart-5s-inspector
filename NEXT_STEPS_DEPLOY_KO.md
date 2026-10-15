# Smart 5S Inspector — GitHub/Vercel 배포

## 확인된 원격 프로젝트
- GitHub: https://github.com/72unicon-dot/smart-5s-inspector (공개 저장소, 현재 비어 있음)
- Vercel 프로젝트명: smart-5s-inspector (생성됨, 배포 전)
- Supabase: https://supabase.com/dashboard/project/ihdweoqvqvrpafmutetb

## 1. Windows에서 빌드 점검
CMD에서 이 폴더로 이동한 뒤 `npm install`, `npm test`, `npm run build`를 실행하세요. npm 패키지가 설치되지 않으면 먼저 설치 문제를 해결해야 합니다.

## 2. GitHub 업로드
`PUBLISH_TO_GITHUB_WINDOWS.cmd`를 실행하면 Git 설치를 확인하고 업로드 대상 파일을 보여 준 다음 명시적으로 승인받아 공개 GitHub에 업로드합니다. 파일에 API 키를 입력하거나 `.env.local`을 커밋하지 마세요. GitHub 인증 대화상자는 Git for Windows의 인증 절차를 따라 진행합니다.

## 3. Vercel Git 연결
Vercel 대시보드에서 기존 `smart-5s-inspector` 프로젝트에 GitHub 저장소를 연결하거나, Vercel 프로젝트를 import하여 배포합니다. 기존 프로젝트가 중복 생성되지 않도록 주의합니다.

## 4. 환경변수
Vercel 프로젝트의 Settings → Environment Variables에서 아래를 등록합니다. 실제 비밀키는 대시보드에만 입력합니다.
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (또는 앱 코드에서 사용하는 publishable key 변수명)
- SUPABASE_SERVICE_ROLE_KEY (서버 전용)
- RESEND_API_KEY (메일 테스트 전 필수)
- REPORT_FROM_EMAIL (인증된 발신 도메인 주소)

## 5. 실사용 검증
점검표 25개 조회 → 점수·사진 입력 → 저장 → 보고서 생성 → 다운로드를 순서대로 검증합니다. PDF에는 한글 TTF 글꼴이 서버에서 제공되어야 하므로 배포 단계에서 파일경로와 글꼴 라이선스를 별도 확인해야 합니다. 이메일 발송은 수신주소 인증을 구현하기 전 비활성화되어 있습니다.

## 주의
이 패키지는 운영 배포 검증이 완료된 제품이 아닙니다. 특히 전체 npm 빌드, PDF 글꼴, 메일 서비스가 아직 검증되지 않았습니다.
