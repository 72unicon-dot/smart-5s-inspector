import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const valid = new Set(['machining','assembly','warehouse']);

export async function GET(request: NextRequest) {
  const industry = new URL(request.url).searchParams.get('industry') ?? '';
  if (!valid.has(industry)) return NextResponse.json({error:'지원하지 않는 현장 유형입니다.'},{status:400});
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || key.includes('PASTE_')) return NextResponse.json({error:'Supabase 환경변수가 필요합니다.'},{status:503});
  const bearer = request.headers.get('authorization') ?? '';
  if (!bearer.startsWith('Bearer ')) return NextResponse.json({error:'로그인 없는 점검 세션을 먼저 시작하세요.'},{status:401});
  const supabase = createClient(url,key,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError} = await supabase.auth.getUser(bearer.slice(7));
  if (authError || !user) return NextResponse.json({error:'익명 세션이 유효하지 않습니다.'},{status:401});
  const {data:templates,error:templateError} = await supabase.from('checklist_templates').select('id,version,name')
    .eq('industry',industry).eq('is_active',true).order('version',{ascending:false}).limit(1);
  if(templateError || !templates?.length) return NextResponse.json({error:'활성 점검표를 찾지 못했습니다.'},{status:404});
  const {data:rows,error:itemError} = await supabase.from('checklist_items').select('id,category,position,question')
    .eq('template_id',templates[0].id).order('category').order('position');
  if(itemError || !rows || rows.length!==25) return NextResponse.json({error:'25개 기본 점검항목을 확인할 수 없습니다.'},{status:409});
  const cats=['정리','정돈','청소','청결','습관화'];
  return NextResponse.json({template:templates[0],items:rows.map(r=>({id:`${r.category}-${r.position}`,category:cats[r.category-1],text:r.question}))});
}
