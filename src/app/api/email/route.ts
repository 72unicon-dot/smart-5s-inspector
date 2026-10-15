import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
const failure=(error:string,status=400)=>NextResponse.json({error},{status});
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishable=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 // Public delivery remains disabled until recipient ownership verification is implemented.
 if(process.env.EMAIL_DELIVERY_ENABLED !== 'true')return failure('이메일 발송은 수신주소 인증 기능 구현 전까지 비활성화되어 있습니다.',503);
 const emailKey=process.env.RESEND_API_KEY;
 const from=process.env.REPORT_FROM_EMAIL;
 if(!url||!publishable||!secret)return failure('DB 환경변수가 누락되었습니다.',503);
 if(!emailKey||!from)return failure('이메일 서비스 설정이 필요합니다. Vercel 환경변수 RESEND_API_KEY, REPORT_FROM_EMAIL을 확인하세요.',503);
 const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!token)return failure('인증이 필요합니다.',401);
 const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return failure('인증 실패',401);
 let input:{inspectionId?:string};try{input=await request.json();}catch{return failure('잘못된 요청');}
 const id=input.inspectionId||'';if(!uuid.test(id))return failure('점검 ID 오류');
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:inspection}=await db.from('inspections').select('id,inspector_email,status').eq('id',id).eq('owner_id',user.id).single();
 if(!inspection||inspection.status!=='completed')return failure('점검을 조회할 수 없습니다.',404);
 const {data:report}=await db.from('reports').select('id,storage_path,score').eq('inspection_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(!report)return failure('먼저 PDF를 생성하세요.',409);
 const {data:deliveries,error:deliveryError}=await db.from('email_deliveries').select('id,status,sent_at').eq('report_id',report.id).order('sent_at',{ascending:false}).limit(10);
 if(deliveryError)return failure('발송 내역 조회 실패',500);
 if(deliveries?.some(d=>d.status==='sent'))return failure('이 보고서는 이미 발송되었습니다.',409);
 // One recipient per report; protects against open email relay abuse. Registration must use a verified recipient strategy before production.
 const {data:pdf,error:fileError}=await db.storage.from('inspection-reports').download(report.storage_path);
 if(fileError||!pdf)return failure('PDF 파일을 불러올 수 없습니다.',500);
 if(pdf.size>9_000_000)return failure('PDF가 9MB를 초과하여 첨부할 수 없습니다. 다운로드 링크를 사용하세요.',413);
 const bytes=Buffer.from(await pdf.arrayBuffer());
 const {data:queued,error:queueError}=await db.from('email_deliveries').insert({report_id:report.id,recipient:inspection.inspector_email,status:'queued'}).select('id').single();
 if(queueError||!queued)return failure('발송 요청 저장 실패',500);
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${emailKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[inspection.inspector_email],subject:'[Smart 5S Inspector] 제조현장 5S 점검 보고서',html:`<h2>5S 점검 보고서</h2><p>종합 점수: ${report.score ?? '-'}점</p><p>상세 내용은 첨부 PDF를 확인해 주세요.</p>`,attachments:[{filename:'smart-5s-report.pdf',content:bytes.toString('base64')}],})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof result.message==='string'?result.message:'이메일 서비스 오류');
  await db.from('email_deliveries').update({status:'sent',sent_at:new Date().toISOString()}).eq('id',queued.id);
  return NextResponse.json({ok:true,recipient:inspection.inspector_email});
 }catch(e){await db.from('email_deliveries').update({status:'failed',error_message:String(e).slice(0,500)}).eq('id',queued.id);return failure('이메일 발송 실패: '+(e instanceof Error?e.message:'서비스 오류'),502);}
}
