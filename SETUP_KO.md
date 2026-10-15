# Smart 5S Inspector — Supabase 연동 단계

1. Supabase 프로젝트: https://supabase.com/dashboard/project/ihdweoqvqvrpafmutetb
2. SQL Editor에서 `supabase/seed_5s.sql`을 **한 번만** 실행합니다. 업종 3종 × 25항목(총 75개)이 생성됩니다.
3. Authentication → Providers → Anonymous Sign-ins를 활성화합니다.
4. `.env.local.example`을 `.env.local`로 복사하고 Supabase Project Settings → API Keys에서 **publishable key**를, 서버 전용 secret key는 `SUPABASE_SERVICE_ROLE_KEY`에 입력합니다. 키를 채팅·GitHub에 공유하지 마세요.
5. `npm install` 이후 `npm run dev`를 실행합니다.
6. 25개 항목을 점검하고, 1~2점 항목에 문제 설명/사진을 등록한 뒤 'Supabase에 점검·사진 저장'을 실행합니다.
7. Supabase Table Editor → inspections / inspection_answers 및 Storage → inspection-photos에서 결과를 확인합니다.

주의: 현재 서버 업로드는 사진을 JSON base64로 전송하므로 대용량 사진을 여러 장 등록하면 Vercel 요청 크기 제한을 초과할 수 있습니다. 운영 전 클라이언트 압축 및 사전서명/인증 직접 업로드 방식으로 전환하십시오. 점검 진행 중 DB 자동저장, 사진 복구, 이메일 인증, PDF 메일 발송은 아직 구현되지 않았습니다. 익명 세션과 데이터 소유권에 대한 통합 테스트도 필요합니다.
