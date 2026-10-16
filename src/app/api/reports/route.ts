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
  let font:Buffer;try{font=await readFile(process.env.KOREAN_FONT_PATH || path.join(process.cwd(), 'assets', 'NanumGothic.ttf'));}catch{return bad('한글 폰트 파일 없음. KOREAN_FONT_PATH를 확인하세요.',500);}
  const doc=new PDFDocument({size:'A4',margin:45});const chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));
  const ended=new Promise<Buffer>((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});doc.registerFont('kr',font);doc.font('kr');
  const labels=['정리','정돈','청소','청결','습관화'];
  const navy='#152B4B',blue='#2867B6',gray='#64748B',light='#EDF3FA',red='#BC4149';
  const pw=doc.page.width,ph=doc.page.height,left=45,right=pw-45,usable=right-left;
  const date=new Date(i.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
  let pageNo=1;
  const text=(value:string,x:number,y:number,width:number,size=10,color=navy,options:PDFKit.Mixins.TextOptions={})=>{
    doc.font('kr').fontSize(size).fillColor(color).text(value,x,y,{width,lineBreak:false,...options});
  };
  const chrome=(heading:string)=>{
    doc.rect(0,0,pw,14).fill(navy);
    text('SMART 5S INSPECTOR',left,28,250,9,blue);
    text('5S DIAGNOSTIC REPORT',right-170,28,170,8,gray,{align:'right'});
    text(heading,left,65,usable,19,navy);
    doc.moveTo(left,ph-51).lineTo(right,ph-51).lineWidth(.6).strokeColor('#D9E3EF').stroke();
    text((site?.name||'사업장 미지정')+'  |  '+(area?.name||'구역 미지정')+'  |  '+date,left,ph-40,usable-70,8,gray);
    text(String(pageNo).padStart(2,'0'),right-36,ph-40,36,8,gray,{align:'right'});
  };
  const newPage=(heading:string)=>{doc.addPage();pageNo++;chrome(heading);};
  const list=[...answers].sort((a,b)=>{
    const x=itemMap.get(a.item_id)!,y=itemMap.get(b.item_id)!;
    return x.category-y.category||x.position-y.position;
  });
  const low=list.filter(a=>a.score<=2);
  const lowest=scores.indexOf(Math.min(...scores));
  chrome('제조현장 5S 종합 진단');
  doc.roundedRect(left,124,usable,95,10).fill(light);
  text('종합 5S 지수',left+18,142,200,10,gray);
  text(overall.toFixed(1)+' / 100',left+18,165,290,28,navy);
  text(grade,right-109,168,90,16,red,{align:'center'});
  text('5S 활동별 수준',left,243,usable,13,navy);
  scores.forEach((score,index)=>{
    const y=282+index*37;
    text(labels[index],left,y,65,10,navy);
    doc.roundedRect(left+78,y+1,318,11,5).fill('#E8EEF6');
    doc.roundedRect(left+78,y+1,318*score/100,11,5)
      .fill(score<60?red:score<70?'#C77B2B':blue);
    text(score.toFixed(1)+'점',right-66,y,65,10,navy,{align:'right'});
  });
  doc.roundedRect(left,494,usable,117,9).fill('#F4F7FB');
  text('핵심 진단 결과',left+15,508,usable-30,11,navy);
  text('• 최저 평가 영역: '+labels[lowest]+' '+scores[lowest].toFixed(1)+'점',left+15,533,usable-30,10,navy);
  text('• 우선 검토가 필요한 1~2점 항목: '+low.length+'건',left+15,556,usable-30,10,navy);
  text('• 지적사항을 개선과제로 등록하고 재점검으로 확인',left+15,579,usable-30,9,gray);
  doc.roundedRect(left,633,usable,91,9).fill('#EDF4FC');
  text('권고 실행 방향',left+15,647,usable-30,11,navy);
  text('정위치·표준배치 정비 → 개선 담당 지정 → 전후사진 확인',left+15,672,usable-30,9,navy);
  text('※ 개선 권고는 점검 정보 기반 제안이며, 담당자·기한은 별도 확정 필요',left+15,699,usable-30,8,gray);
  // Page 2: prioritized actionable findings (no invented completion date or assignee)
  newPage('주요 지적사항 및 개선 권고');
  text('우선순위는 점수 기준(1점 최우선, 2점 후순위)으로 정렬했습니다.',left,111,usable,9,gray);
  const actions=low.sort((a,b)=>a.score-b.score);
  let actionY=145;
  for(const a of actions){
    const item=itemMap.get(a.item_id)!;
    const note=String(a.note||'지적 내용 미입력').slice(0,140);
    const h=76;
    if(actionY+h>ph-76){newPage('주요 지적사항 및 개선 권고 · 계속');actionY=112;}
    doc.roundedRect(left,actionY,usable,h-7,7).fill('#F4F7FB');
    doc.roundedRect(left+11,actionY+12,40,20,7).fill(a.score===1?'#FCE9EA':'#FFF0DE');
    text(a.score+'점',left+18,actionY+16,30,9,a.score===1?red:'#B66E20');
    text(labels[item.category-1]+'  '+item.position+'. '+item.question,left+62,actionY+9,usable-74,9,navy);
    text('현장 의견: '+note,left+62,actionY+29,usable-74,8,gray);
    text('개선 제안: 원인 확인 · 정위치/표준 점검 · 담당자 지정 · 재확인',left+62,actionY+49,usable-74,8,blue);
    actionY+=h;
  }
  // Photo evidence: consistent two-column card layout with controlled pagination.
  const photoEntries=(photos||[]).slice(0,18);
  if(photoEntries.length){
    newPage('현장 사진 증빙');
    let photoIndex=0;
    let y=118;
    for(const p of photoEntries){
      if(photoIndex>0 && photoIndex%6===0){newPage('현장 사진 증빙 · 계속');y=118;}
      const col=photoIndex%2,row=Math.floor((photoIndex%6)/2);
      const x=left+col*(usable/2+2);
      y=118+row*213;
      const cw=usable/2-8,ch=191;
      doc.roundedRect(x,y,cw,ch,7).fill('#F4F7FB');
      const a=list.find(v=>v.id===p.answer_id);
      const item=a?itemMap.get(a.item_id):null;
      const label=item?labels[item.category-1]+' '+item.position+' · '+a?.score+'점':'현장 사진';
      text(label,x+9,y+9,cw-18,8,navy);
      const {data:file}=await db.storage.from('inspection-photos').download(p.storage_path);
      if(file){
        try{
          const bytes=Buffer.from(await file.arrayBuffer());
          doc.image(bytes,x+9,y+32,{fit:[cw-18,127],align:'center',valign:'center'});
        }catch{text('지원되지 않는 이미지',x+10,y+83,cw-20,8,gray);}
      }else{text('사진 조회 불가',x+10,y+83,cw-20,8,gray);}
      if(a?.note)text(String(a.note).slice(0,55),x+9,y+169,cw-18,8,gray);
      photoIndex++;
    }
  }
  newPage('25개 세부 평가표');
  text('점수 1~2점은 우선 개선 검토, 3점은 관찰, 4~5점은 유지관리 대상입니다.',left,109,usable,8,gray);
  let tableY=140;
  for(const a of list){
    const item=itemMap.get(a.item_id)!;
    const height=a.note?.trim()?51:34;
    if(tableY+height>ph-78){newPage('25개 세부 평가표 · 계속');tableY=112;}
    doc.rect(left,tableY,usable,height).fill((Math.floor(tableY)%2)?'#F7F9FC':'#F1F5FA');
    text(labels[item.category-1],left+9,tableY+10,48,8,navy);
    text(item.question,left+65,tableY+8,usable-137,8,navy);
    text(a.score+' / 5',right-61,tableY+10,51,9,a.score<=2?red:a.score===3?'#C77B2B':'#147D72',{align:'right'});
    if(a.note?.trim())text('점검 의견: '+String(a.note).slice(0,150),left+65,tableY+28,usable-137,7.6,gray);
    tableY+=height+2;
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
