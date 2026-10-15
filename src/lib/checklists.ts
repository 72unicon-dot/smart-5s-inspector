export const S5 = ['정리', '정돈', '청소', '청결', '습관화'] as const;
export type SCategory = (typeof S5)[number];
export type Industry = 'machining' | 'assembly' | 'warehouse';
export type ChecklistItem = { id: string; category: SCategory; text: string };
const base: Record<SCategory,string[]> = {
  정리:['불필요 자재와 폐기 대상이 구분되어 있는가?','장기 재공품이 식별·관리되는가?','불용 공구가 격리되어 있는가?','필요 품목만 작업장에 배치되는가?','폐기품 처리 기준이 준수되는가?'],
  정돈:['공구와 자재의 정위치가 표시되어 있는가?','통로와 출입구가 확보되어 있는가?','보관품의 명칭과 수량을 식별할 수 있는가?','자재의 선입선출이 지켜지는가?','설비 주변 배치가 표준을 따르는가?'],
  청소:['설비 외관과 바닥에 오염이 없는가?','누유·누수 등 이상이 확인·조치되는가?','청소도구가 지정 위치에 있는가?','작업 종료 후 청소가 수행되는가?','청소 중 발견한 이상을 보고하는가?'],
  청결:['5S 기준과 책임구역이 게시되는가?','주기적인 청결 점검을 실시하는가?','표시와 라벨이 유지되는가?','표준 사진 또는 기준 상태가 관리되는가?','이전 지적사항의 재발을 관리하는가?'],
  습관화:['작업자가 5S 기준을 이해하는가?','작업자가 스스로 정리정돈하는가?','정기 교육과 피드백을 수행하는가?','5S 점검 기록을 지속 관리하는가?','개선활동 결과를 구성원과 공유하는가?']
};
const overrides: Partial<Record<Industry,Partial<Record<SCategory,Record<number,string>>>>> = {
 machining:{청소:{0:'절삭칩과 절삭유 오염이 제거되는가?',1:'설비 누유와 절삭유 비산이 확인·조치되는가?'},정돈:{0:'치공구 및 공구가 정위치에 보관되는가?'}},
 assembly:{청소:{0:'조립대와 설비 주변의 이물질이 제거되는가?'},정돈:{2:'부품 용기와 품번 라벨이 식별 가능한가?'}},
 warehouse:{정돈:{3:'자재의 선입선출(FIFO)을 준수하는가?'},정리:{1:'장기재고와 불용재고가 식별·격리되는가?'}}
};
export function makeChecklist(industry:Industry):ChecklistItem[]{
 return S5.flatMap((category)=>base[category].map((text,i)=>({id:`${S5.indexOf(category)+1}-${i+1}`,category,text:overrides[industry]?.[category]?.[i]??text})));
}
