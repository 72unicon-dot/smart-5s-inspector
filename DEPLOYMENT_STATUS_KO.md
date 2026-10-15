# 운영 배포 준비 상태

- Supabase 프로젝트와 테이블 및 25개×3 점검표는 구축되었습니다.
- Vercel 프로젝트는 생성됐지만 GitHub 연결과 배포는 완료되지 않았습니다.
- PDFKit은 WOFF 파일이 아닌 TTF 글꼴을 사용해야 합니다. Windows 기본 경로 C:/Windows/Fonts/malgun.ttf 또는 KOREAN_FONT_PATH를 이용하세요. 글꼴 파일은 이 패키지에 포함하지 않습니다.
- 이메일 발송은 본인 확인 없는 임의 주소 발송을 방지하기 위해 EMAIL_DELIVERY_ENABLED=false가 기본입니다. 메일 소유 확인·발송 제한·중복 방지 구현 후에만 운영 활성화하세요.
- DB 저장 성공과 실제 PDF 생성·이메일 발송 성공은 별개입니다. 실제 PDF/메일 통합 테스트 필요.
- Vercel 프로젝트: prj_xYyoxmpUt0j6bkKFWdkHIMXa3Bd0
- Supabase 프로젝트: ihdweoqvqvrpafmutetb
- 현재 GitHub 신규 저장소 생성 기능이 연결되어 있지 않아 업로드 전 GitHub 저장소 생성이 필요합니다.

## 로컬 테스트

```cmd
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

환경변수는 로컬 `.env.local`에 보관하고 저장소에 추가하지 마세요.
