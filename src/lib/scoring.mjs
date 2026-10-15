export const CATEGORIES=['정리','정돈','청소','청결','습관화'];
export function calculate(items, answers){
  const breakdown={};
  for(const category of CATEGORIES){
    const group=items.filter(i=>i.category===category);
    if(group.length===0) throw new Error(`${category}: 최소 1개 항목 필요`);
    const values=group.map(i=>answers[i.id]?.score);
    if(values.some(v=>!Number.isInteger(v)||v<1||v>5)) throw new Error('모든 점검항목을 1~5점으로 평가해야 합니다.');
    const raw=values.reduce((a,b)=>a+b,0);
    breakdown[category]={raw,maximum:group.length*5,normalized:raw/(group.length*5)*100};
  }
  const aggregate=CATEGORIES.reduce((sum,c)=>sum+breakdown[c].normalized,0)/5;
  const score=Math.round(aggregate*10)/10;
  const grade=aggregate>=90?'우수':aggregate>=80?'양호':aggregate>=70?'보통':aggregate>=60?'미흡':'불량';
  return {score,grade,breakdown};
}
export function validateForSubmit(items,answers,photos){
  const summary=calculate(items,answers);
  for(const item of items){
    const a=answers[item.id];
    if(a.score<=2 && (!a.note?.trim() || (photos[item.id]??[]).length===0)) throw new Error(`${item.category}: ${item.text} — 1~2점은 문제점 설명과 사진이 필수입니다.`);
  }
  return summary;
}
