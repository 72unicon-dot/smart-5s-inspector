# 4단계: 실제 Supabase 연결 및 사진 저장 테스트

프로젝트: smart-5s-inspector / ID: ihdweoqvqvrpafmutetb

1. ZIP 파일을 풀고 폴더의 모든 파일을 `C:\kimsabu\smart-5s-inspector-starter`에 덮어씁니다.
2. Supabase Dashboard → Authentication → Providers에서 **Anonymous Sign-ins** 활성화 여부를 확인합니다. (로그인 폼은 없습니다.)
3. 프로젝트 폴더에서 `.env.local.example` 파일을 복사해 `.env.local` 파일을 만듭니다.
4. `.env.local`에서 `NEXT_PUBLIC_SUPABASE_URL`은 `https://ihdweoqvqvrpafmutetb.supabase.co`로 설정합니다. `NEXT_PUBLIC_SUPABASE_ANON_KEY`에는 Dashboard → Project Settings → API Keys의 **publishable key**(또는 legacy anon)를 넣습니다. `SUPABASE_SERVICE_ROLE_KEY`에는 서버 전용 **service_role key** 또는 호환 secret key를 넣습니다. **서버 비밀키는 NEXT_PUBLIC 접두어를 붙이지 말고, 채팅·GitHub에 업로드하지 마세요.**
5. CMD에서 `npm install` 이후 `npm run dev`를 실행하고 `http://localhost:3000`에 접속합니다.
6. 현장 유형을 바꿔보고 `Supabase 연결 · 점검표 25개 불러오기 성공` 메시지가 뜨는지 확인합니다.
7. 사업장, 점검구역, 이메일을 입력하고 25항목을 모두 1~5점으로 평가합니다. 1~2점 항목은 설명과 사진이 반드시 필요합니다.
8. **Supabase에 점검·사진 저장** 버튼을 클릭합니다. 점검 ID가 나오면 DB Table Editor의 `inspections`와 `inspection_answers`, Storage의 `inspection-photos`를 확인합니다.
9. 아직 PDF 자동 생성 및 이메일 발송은 없습니다. 사진은 새로고침 시 복원되지 않으며, 이 버전은 운영이 아닌 실사용 전 통합검증 단계입니다.

**유의:** 이미 생성된 스키마를 재실행하지 마세요. 5S 점검표 75개는 현재 DB에서 조회하여 확인한 상태입니다. PDF 및 이메일은 다음 개발 단계입니다. API는 base64 사진을 한번에 전송하므로 실제 배포 전 업로드 방식을 개선해야 합니다.

오류 발생 시 브라우저 개발자도구 Console의 에러 **텍스트만** 공유해 주세요. API 키나 .env.local 전체 내용은 보내지 마세요.
