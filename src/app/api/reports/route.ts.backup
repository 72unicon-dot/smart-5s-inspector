import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
const bad=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function POST(req:NextRequest){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, pub=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!pub||!secret)return bad('Supabase 서버 환경변수가 없습니다.',503);
  const bearer=req.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer '))return bad('인증이 필요합니다.',401);
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:ae}=await auth.auth.getUser(bearer.slice(7));if(ae||!user)return bad('인증 실패',401);
  let requestBody:{inspectionId?:string};try{requestBody=await req.json();}catch{return bad('요청 데이터 오류');}
  const id=requestBody.inspectionId||'';if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id))return bad('점검 ID 오류');
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:i,error:ie}=await db.from('inspections').select('id,status,template_id,area_id,created_at').eq('id',id).eq('owner_id',user.id).single();
  if(ie||!i)return bad('다른 사용자의 점검은 조회할 수 없습니다.',404);
  if(i.status!=='completed')return bad('완료된 점검만 보고서 생성 가능');
  const [{data:answers,error:ansErr},{data:items,error:itemErr},{data:photos}]=await Promise.all([
    db.from('inspection_answers').select('id,item_id,score,note').eq('inspection_id',id),
    db.from('checklist_items').select('id,category,position,question').eq('template_id',i.template_id),
    db.from('inspection_photos').select('answer_id,storage_path').eq('inspection_id',id)]);
  if(ansErr||itemErr||!answers||!items||answers.length!==items.length||!items.length)return bad('점검항목 누락',409);
  const itemMap=new Map(items.map(x=>[x.id,x]));const pmap=new Map<string,string[]>();
  for(const p of photos||[])pmap.set(p.answer_id,[...(pmap.get(p.answer_id)||[]),p.storage_path]);
  const groups:number[][]=[[],[],[],[],[]];
  for(const a of answers){const item=itemMap.get(a.item_id);if(!item||a.score<1||a.score>5||!Number.isInteger(a.score))return bad('평가 데이터 오류',409);groups[item.category-1].push(a.score);
    if(a.score<=2&&(!a.note?.trim()||!(pmap.get(a.id)||[]).length))return bad('1~2점 항목은 의견과 사진이 필수입니다.',409);}
  if(groups.some(a=>a.length===0)||answers.length!==items.length)return bad('5S 항목 누락',409);
  const scores=groups.map(a=>a.reduce((x,y)=>x+y,0)/a.length/5*100);
  const overall=Math.round(scores.reduce((x,y)=>x+y,0)/5*10)/10;
  const grade=overall>=90?'우수':overall>=80?'양호':overall>=70?'보통':overall>=60?'미흡':'불량';
  const {data:area}=i.area_id?await db.from('areas').select('name,site_id').eq('id',i.area_id).single():{data:null};
  const {data:site}=area?.site_id?await db.from('sites').select('name').eq('id',area.site_id).single():{data:null};
  let font:Buffer;try{font=await readFile(process.env.KOREAN_FONT_PATH || (process.platform === 'win32' ? 'C:/Windows/Fonts/malgun.ttf' : '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'));}catch{return bad('한글 폰트 파일 없음. KOREAN_FONT_PATH를 확인하세요.',500);}
  const doc=new PDFDocument({size:'A4',margin:45});const chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));
  const ended=new Promise<Buffer>((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});doc.registerFont('kr',font);doc.font('kr');
  const labels=['정리','정돈','청소','청결','습관화'];
  const header=(title:string)=>{doc.fontSize(17).fillColor('#173a68').text(title);doc.moveDown(.8).fillColor('#232d3d');};
  const space=(size:number)=>{if(doc.y+size>750){doc.addPage();header('5S 점검 결과 · 계속');}};
  header('Smart 5S Inspector · 5S 진단 보고서');
  doc.fontSize(10).text(`사업장: ${site?.name||'미지정'}`).text(`점검구역: ${area?.name||'미지정'}`).text(`점검일: ${new Date(i.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}`);
  doc.moveDown().fontSize(22).fillColor('#2363b0').text(`${overall.toFixed(1)} / 100    ${grade}`);doc.fillColor('#232d3d').moveDown();
  header('활동별 종합 점수');
  scores.forEach((n,index)=>{const y=doc.y;doc.fontSize(11).text(labels[index],45,y,{width:75});doc.fillColor('#e6eff9').rect(125,y+3,320,13).fill();doc.fillColor('#2a74c5').rect(125,y+3,320*n/100,13).fill();doc.fillColor('#232d3d').text(n.toFixed(1)+'점',465,y,{width:70,align:'right'});doc.y=y+29;});
  doc.moveDown();header('세부 점검 및 개선 권고');
  const sorted=[...answers].sort((a,b)=>{const x=itemMap.get(a.item_id)!,y=itemMap.get(b.item_id)!;return x.category-y.category||x.position-y.position;});
  for(const a of sorted){const item=itemMap.get(a.item_id)!;space(80);doc.fontSize(10).fillColor('#153f75').text(`${labels[item.category-1]} ${item.position}. ${item.question}  [${a.score}점]`);doc.fillColor('#232d3d');if(a.note?.trim())doc.fontSize(9).text('점검 의견: '+a.note.slice(0,500));if(a.score<=2)doc.fontSize(9).text('개선 권고: 원인 분석 → 담당자 지정 → 시정조치 → 효과 확인');
    for(const storedPath of (pmap.get(a.id)||[]).slice(0,2)){space(180);const {data:file,error:fe}=await db.storage.from('inspection-photos').download(storedPath);if(fe||!file){doc.text('사진 조회 불가');continue;}try{const bytes=Buffer.from(await file.arrayBuffer());doc.image(bytes,{fit:[210,145],align:'center'});doc.moveDown(.6);}catch{doc.text('지원되지 않는 사진 형식');}}
    doc.moveDown(.6);
  }
  doc.end();let pdf:Buffer;try{pdf=await ended;}catch{return bad('PDF 생성에 실패했습니다.',500);}
  const objectPath=`${user.id}/${id}/5s-report.pdf`;
  const {error:ue}=await db.storage.from('inspection-reports').upload(objectPath,pdf,{contentType:'application/pdf',upsert:true});if(ue)return bad('PDF 저장 실패: '+ue.message,500);
  const {data:old}=await db.from('reports').select('id').eq('inspection_id',id).limit(1);
  if(old?.length){const {error:e}=await db.from('reports').update({storage_path:objectPath,score:overall}).eq('id',old[0].id);if(e)return bad('보고서 갱신 오류',500);}
  else {const {error:e}=await db.from('reports').insert({inspection_id:id,storage_path:objectPath,score:overall});if(e)return bad('보고서 기록 오류',500);}
  const {data:link,error:le}=await db.storage.from('inspection-reports').createSignedUrl(objectPath,600);if(le||!link)return bad('PDF 링크 생성 실패',500);
  return NextResponse.json({downloadUrl:link.signedUrl,score:overall,grade});
}
