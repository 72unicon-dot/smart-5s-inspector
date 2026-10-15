import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { makeChecklist, type Industry } from '../../../lib/checklists';
import { validateForSubmit } from '../../../lib/scoring.mjs';

export const runtime = 'nodejs';
const allowed = ['machining','assembly','warehouse'];
function error(message: string, code = 400) { return NextResponse.json({ error: message }, { status: code }); }
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishable || !secret) return error('Supabase 환경변수가 설정되지 않았습니다.',503);
  const bearer = request.headers.get('authorization') || '';
  if (!bearer.startsWith('Bearer ')) return error('익명 세션 인증이 필요합니다.',401);
  const authClient = createClient(url, publishable, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await authClient.auth.getUser(bearer.slice(7));
  if (authError || !user) return error('유효하지 않은 사용자 세션입니다.',401);
  let body: any;
  try { body = await request.json(); } catch { return error('올바른 JSON이 필요합니다.'); }
  if (!allowed.includes(body?.industry) || typeof body?.site!=='string' || typeof body?.area!=='string' || typeof body?.email!=='string') return error('잘못된 현장 정보입니다.');
  const site=body.site.trim(), area=body.area.trim(), email=body.email.trim();
  if (!site || site.length>100 || !area || area.length>100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return error('사업장·점검구역·이메일을 확인해 주세요.');
  const items=makeChecklist(body.industry as Industry);
  const answers=body.answers;
  const photos=body.photos;
  if (!answers || typeof answers !== 'object' || !photos || typeof photos !== 'object') return error('점검 데이터가 없습니다.');
  const acceptedPhotos: Record<string,string[]>={};
  let photoCount=0, totalBytes=0;
  for(const item of items){
    const values=photos[item.id] || [];
    if (!Array.isArray(values) || values.length>5) return error('항목당 사진은 최대 5장입니다.');
    acceptedPhotos[item.id]=[];
    for(const x of values){
      if (typeof x!=='string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x)) return error('JPEG, PNG, WebP 이미지만 허용됩니다.');
      const b64=x.slice(x.indexOf(',')+1); const bytes=Math.floor(b64.length*0.75);
      if(bytes>5_000_000) return error('사진당 크기는 5MB 이하여야 합니다.');
      photoCount++; totalBytes+=bytes;
      if(photoCount>40 || totalBytes>20_000_000) return error('사진 전체 용량이 제한을 초과했습니다.');
      acceptedPhotos[item.id].push(x);
    }
  }
  let score;
  try { score=validateForSubmit(items,answers,acceptedPhotos); } catch(e){return error(e instanceof Error?e.message:'평가 검증 실패');}
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  // 이 단계는 관리자 서버 API를 통해서만 쓰기를 허용합니다. 브라우저에 비밀키를 전달하지 않습니다.
  const {data:siteRow,error:siteErr}=await admin.from('sites').insert({name:site,industry:body.industry}).select('id').single();
  if(siteErr || !siteRow) return error('사업장 저장 실패: '+siteErr?.message,500);
  const {data:areaRow,error:areaErr}=await admin.from('areas').insert({site_id:siteRow.id,name:area}).select('id').single();
  if(areaErr || !areaRow) return error('점검구역 저장 실패: '+areaErr?.message,500);
  const {data:templateRows,error:templateError}=await admin.from('checklist_templates').select('id').eq('industry',body.industry).eq('is_active',true).order('version',{ascending:false}).limit(1);
  if(templateError || !templateRows?.length) return error('점검표가 없습니다. 5S 초기 항목 SQL을 실행하세요.',500);
  const templateId=templateRows[0].id;
  const {data:dbItems,error:itemsError}=await admin.from('checklist_items').select('id,category,position').eq('template_id',templateId);
  if(itemsError || !dbItems || dbItems.length!==25) return error('DB 점검표 항목이 25개가 아닙니다.',500);
  const keyed=Object.fromEntries(dbItems.map(x=>[`${x.category}-${x.position}`,x.id]));
  const {data:record,error:inspectionErr}=await admin.from('inspections').insert({owner_id:user.id,area_id:areaRow.id,template_id:templateId,inspector_email:email,status:'draft',snapshot:{industry:body.industry,items}}).select('id').single();
  if(inspectionErr || !record)return error('점검 기록 저장 실패: '+inspectionErr?.message,500);
  const rows=items.map(item=>({inspection_id:record.id,item_id:keyed[item.id],score:answers[item.id].score,note:String(answers[item.id].note??'').slice(0,4000)}));
  if(rows.some(x=>!x.item_id)) return error('점검표 항목 매핑에 실패했습니다.',500);
  const {data:answerRows,error:answerError}=await admin.from('inspection_answers').insert(rows).select('id,item_id');
  if(answerError || !answerRows) return error('평가 결과 저장 실패: '+answerError?.message,500);
  const answerIds=Object.fromEntries(answerRows.map(row=>[row.item_id,row.id]));
  for(const item of items){
    for(const [idx,dataUrl] of acceptedPhotos[item.id].entries()){
      const match=/^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl)!;
      const ext=match[1]==='jpeg'?'jpg':match[1];
      const buf=Buffer.from(match[2],'base64');
      const path=`${user.id}/${record.id}/${item.id}-${idx}.${ext}`;
      const {error:uploadError}=await admin.storage.from('inspection-photos').upload(path,buf,{contentType:`image/${match[1]}`,upsert:false});
      if(uploadError) return error('사진 저장 실패: '+uploadError.message,500);
      const {error:photoErr}=await admin.from('inspection_photos').insert({inspection_id:record.id,answer_id:answerIds[keyed[item.id]],storage_path:path});
      if(photoErr) return error('사진 메타데이터 저장 실패: '+photoErr.message,500);
    }
  }
  // 모든 점검항목과 필수 사진이 업로드된 후에만 completed로 전환
  const {error:completeErr}=await admin.from('inspections').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',record.id).eq('owner_id',user.id).eq('status','draft');
  if(completeErr)return error('점검 완료 처리 실패: '+completeErr.message,500);
  return NextResponse.json({inspectionId:record.id,score:score.score,grade:score.grade,breakdown:score.breakdown});
}
