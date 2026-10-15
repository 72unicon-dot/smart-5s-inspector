'use client';

import { useEffect, useMemo, useState } from 'react';
import { makeChecklist, type Industry, type ChecklistItem } from '../lib/checklists';
import { calculate, validateForSubmit } from '../lib/scoring.mjs';
import { browserSupabase } from '../lib/supabase-browser';

type Answer = { score?: number; note: string };
type Data = { email: string; site: string; area: string; industry: Industry; answers: Record<string, Answer> };
type Report = ReturnType<typeof calculate>;

const initial: Data = { email: '', site: '', area: '', industry: 'machining', answers: {} };
const categories = ['정리', '정돈', '청소', '청결', '습관화'];

export default function Home() {
  const [data, setData] = useState<Data>(initial);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSavedId, setCloudSavedId] = useState('');
  const [pdfLink,setPdfLink] = useState('');
  const [pdfWorking,setPdfWorking] = useState(false);
  const [mailWorking,setMailWorking] = useState(false);
  const [mailStatus,setMailStatus] = useState('');
  const [dbItems,setDbItems] = useState<ChecklistItem[] | null>(null);
  const [connectionStatus,setConnectionStatus] = useState('DB 연결 확인 중');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('s5-demo');
      if (saved) setData(JSON.parse(saved));
    } catch { /* Ignore invalid stored demo data. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem('s5-demo', JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    let cancelled=false;
    setDbItems(null);
    async function load() {
      const client=browserSupabase();
      if(!client) {setConnectionStatus('로컬 데모 모드 — .env.local 설정 필요'); return;}
      try {
        let {data:{session}} = await client.auth.getSession();
        if(!session) {
          const result = await client.auth.signInAnonymously();
          if(result.error) throw result.error;
          session=result.data.session;
        }
        if(!session) throw new Error('익명 세션 생성 실패');
        const response=await fetch(`/api/checklists?industry=${data.industry}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
        const payload=await response.json();
        if(!response.ok) throw new Error(payload.error || 'DB 점검표 조회 실패');
        if(!cancelled){setDbItems(payload.items);setConnectionStatus('Supabase 연결 · 점검표 25개 불러오기 성공');}
      }catch(e){if(!cancelled)setConnectionStatus(`DB 연결 실패: ${e instanceof Error?e.message:'알 수 없는 오류'}`);}
    }
    load();
    return ()=>{cancelled=true;};
  },[data.industry]);
  const items = useMemo(() => dbItems ?? makeChecklist(data.industry), [data.industry,dbItems]);
  const current = items.filter(item => item.category === categories[active]);
  const completed = items.filter(item => Number.isInteger(data.answers[item.id]?.score)).length;

  function update(id: string, patch: Partial<Answer>) {
    setData(previous => ({
      ...previous,
      answers: {
        ...previous.answers,
        [id]: { ...previous.answers[id], note: previous.answers[id]?.note ?? '', ...patch },
      },
    }));
    setReport(null);
    setCloudSavedId('');
    setPdfLink('');
  }

  function onPhoto(id: string, files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
        setError('사진은 이미지 파일이며 한 장당 8MB 이하여야 합니다.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(previous => ({
          ...previous,
          [id]: [...(previous[id] ?? []), String(reader.result)],
        }));
        setReport(null);
        setCloudSavedId('');
      };
      reader.readAsDataURL(file);
    }
  }

  async function saveToCloud() {
    setError(''); setCloudSaving(true);
    try {
      validateForSubmit(items,data.answers,photos);
      const client=browserSupabase();
      if(!client)throw new Error('Supabase 연결정보가 없습니다. .env.local을 설정하세요.');
      const {data:session}=await client.auth.getSession();
      let token=session.session?.access_token;
      if(!token){
        const signed=await client.auth.signInAnonymously();
        if(signed.error)throw signed.error;
        token=signed.data.session?.access_token;
      }
      if(!token)throw new Error('익명 세션을 시작하지 못했습니다.');
      const response=await fetch('/api/inspections',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...data,photos})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'클라우드 저장 실패');
      setCloudSavedId(result.inspectionId);
    }catch(e){setError(e instanceof Error?e.message:'서버 저장 실패');}
    finally{setCloudSaving(false);}
  }

  async function generatePdf(){
    if(!cloudSavedId)return;
    setPdfWorking(true);setError('');
    try{
      const client=browserSupabase();if(!client)throw new Error('Supabase 연결이 필요합니다.');
      const {data:{session}}=await client.auth.getSession();
      if(!session)throw new Error('점검 세션이 만료되었습니다.');
      const response=await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({inspectionId:cloudSavedId})});
      const json=await response.json();
      if(!response.ok)throw new Error(json.error||'PDF 생성 실패');
      setPdfLink(json.downloadUrl);
    }catch(e){setError(e instanceof Error?e.message:'PDF 생성 실패');}
    finally{setPdfWorking(false);}
  }

  async function sendReport(){
    if(!cloudSavedId||!pdfLink)return;
    setMailWorking(true);setError('');setMailStatus('');
    try{
      const client=browserSupabase();if(!client)throw new Error('Supabase 연결이 필요합니다.');
      const {data:{session}}=await client.auth.getSession();if(!session)throw new Error('세션이 만료되었습니다.');
      const response=await fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({inspectionId:cloudSavedId})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'이메일 전송 실패');
      setMailStatus('PDF 보고서가 입력하신 이메일 주소로 발송되었습니다.');
    }catch(e){setError(e instanceof Error?e.message:'이메일 전송 실패');}
    finally{setMailWorking(false);}
  }

  function finish() {
    setError('');
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.site.trim() || !data.area.trim()) {
        throw new Error('올바른 이메일, 사업장, 점검구역을 입력해 주세요.');
      }
      setReport(validateForSubmit(items, data.answers, photos));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '점검 결과를 확인해 주세요.');
    }
  }

  return (
    <main>
      <header>
        <div className="brand">SMART 5S <span>INSPECTOR</span></div>
        <small>제조현장 5S 모바일 점검 · 1~5점 평가</small>
      </header>

      <section className="panel">
<h2>1. 현장 정보</h2>
        <p role="status">{connectionStatus}</p>
        <div className="fields">
          <label>보고서 수신 이메일
            <input type="email" value={data.email} placeholder="inspector@company.com"
              onChange={event => setData(previous => ({ ...previous, email: event.target.value }))} />
          </label>
          <label>사업장
            <input value={data.site} placeholder="A공장"
              onChange={event => setData(previous => ({ ...previous, site: event.target.value }))} />
          </label>
          <label>점검구역
            <input value={data.area} placeholder="가공 1라인"
              onChange={event => setData(previous => ({ ...previous, area: event.target.value }))} />
          </label>
          <label>현장 유형
            <select value={data.industry} onChange={event => {
              setData(previous => ({ ...previous, industry: event.target.value as Industry, answers: {} }));
              setPhotos({});
              setReport(null);
              setCloudSavedId('');
            }}>
              <option value="machining">기계가공</option>
              <option value="assembly">조립</option>
              <option value="warehouse">창고·물류</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="between">
          <h2>2. 5S 점검표</h2><strong>{completed} / {items.length}개 평가</strong>
        </div>
        <div className="progress"><div style={{ width: `${completed / items.length * 100}%` }} /></div>
        <nav>
          {categories.map((name, index) => (
            <button type="button" key={name} className={active === index ? 'selected' : ''}
              onClick={() => setActive(index)}>{name}</button>
          ))}
        </nav>

        {current.map((item, index) => {
          const answer = data.answers[item.id];
          return (
            <article key={item.id}>
              <h3>{index + 1}. {item.text}</h3>
              <div className="scores">
                {[1, 2, 3, 4, 5].map(point => (
                  <button type="button" key={point} className={answer?.score === point ? 'selected' : ''}
                    onClick={() => update(item.id, { score: point })}>{point}점</button>
                ))}
              </div>
              {answer?.score !== undefined && answer.score <= 2 && (
                <p className="warn">1~2점: 문제점 설명과 사진을 반드시 등록해 주세요.</p>
              )}
              <textarea placeholder="현장 문제점 및 개선 의견" value={answer?.note ?? ''}
                onChange={event => update(item.id, { note: event.target.value })} />
              <label className="upload">📷 현장 사진 촬영 / 선택
                <input type="file" accept="image/*" capture="environment" multiple
                  onChange={event => onPhoto(item.id, event.target.files)} />
              </label>
              {(photos[item.id] ?? []).length > 0 && (
                <div className="photos">
                  {photos[item.id].map((source, photoIndex) => (
                    <div key={photoIndex}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={source} alt="현장 사진 미리보기" />
                      <button type="button" onClick={() => {
                        setPhotos(previous => ({
                          ...previous,
                          [item.id]: (previous[item.id] ?? []).filter((_, index) => index !== photoIndex),
                        }));
                        setReport(null);
                        setCloudSavedId('');
                      }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        <div className="actions">
          <button type="button" disabled={active === 0} onClick={() => setActive(index => index - 1)}>이전</button>
          {active < 4 ? (
            <button type="button" className="primary" onClick={() => setActive(index => index + 1)}>다음 영역</button>
          ) : (
            <button type="button" className="primary" onClick={finish}>점검 결과 확정(데모)</button>
          )}
        </div>
        {active !== 4 && <button type="button" className="complete" onClick={finish}>전체 점검 결과 확인</button>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {report && (
        <section className="panel report">
          <h2>3. 점검 결과 미리보기</h2>
          <div className="hero"><strong>{report.score} / 100</strong><span>{report.grade}</span></div>
          {Object.entries(report.breakdown).map(([category, summary]) => (
            <div className="result" key={category}>
              <b>{category}</b><span>{summary.normalized.toFixed(1)}점</span>
            </div>
          ))}
          <p>클라우드 저장 후 PDF 보고서를 생성할 수 있습니다. PDF 생성 후 이메일 발송 버튼으로 보고서를 보낼 수 있습니다.</p>
          <button type="button" onClick={saveToCloud} disabled={cloudSaving || Boolean(cloudSavedId)}>{cloudSaving?'Supabase 저장 중…':cloudSavedId?'Supabase 저장 완료':'Supabase에 점검·사진 저장'}</button>
          {cloudSavedId && <p>저장된 점검 ID: {cloudSavedId}</p>}
          {cloudSavedId && <button type="button" onClick={generatePdf} disabled={pdfWorking}>{pdfWorking?'PDF 생성 중…':'PDF 보고서 생성·저장'}</button>}
          {pdfLink && <a href={pdfLink} target="_blank" rel="noopener noreferrer">완성된 PDF 다운로드 (링크 10분 유효)</a>}
          {pdfLink && <button type="button" onClick={sendReport} disabled={mailWorking}>{mailWorking?'발송 중…':'PDF 보고서 이메일 발송'}</button>}
          {mailStatus && <p role="status">{mailStatus}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <button type="button" onClick={() => window.print()}>브라우저 인쇄 / PDF 저장</button>
        </section>
      )}

      <footer>개발 4단계 · 클라우드 저장 전에는 점검 답변만 로컬 보관됩니다. 사진은 새로고침 시 사라집니다. PDF 생성은 클라우드 저장 이후 가능합니다. 이메일 발송은 Resend 인증 도메인 및 서버 환경변수 설정 후 사용 가능합니다.</footer>
    </main>
  );
}
