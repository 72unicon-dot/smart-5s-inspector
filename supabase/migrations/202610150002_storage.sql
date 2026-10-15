-- 2단계: 점검사진 비공개 버킷. 클라이언트가 버킷 직접 접근할 수 없도록 정책을 생성하지 않습니다.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('inspection-photos','inspection-photos',false,5000000,ARRAY['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- 사이트/현장 생성 및 사진 업로드는 서버의 검증된 API만 수행합니다.
