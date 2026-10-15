import test from 'node:test';import assert from 'node:assert/strict';import {calculate,validateForSubmit} from '../src/lib/scoring.mjs';
const cats=['정리','정돈','청소','청결','습관화'];const items=cats.map((category,id)=>({id:String(id),category,text:'test'}));
const all=(score)=>Object.fromEntries(items.map(i=>[i.id,{score,note:'문제'}]));
test('1점 20점, 5점 100점',()=>{assert.equal(calculate(items,all(1)).score,20);assert.equal(calculate(items,all(5)).score,100)});
test('0점 금지',()=>assert.throws(()=>calculate(items,all(0))));
test('N/A 금지',()=>assert.throws(()=>calculate(items,Object.fromEntries(items.map(i=>[i.id,{score:null}])))));
test('미평가 완료 금지',()=>assert.throws(()=>calculate(items,{})));
test('1~2점 사진 필수',()=>assert.throws(()=>validateForSubmit(items,all(2),{})));
test('2점 문제 사진 존재 시 완료',()=>assert.equal(validateForSubmit(items,all(2),Object.fromEntries(items.map(i=>[i.id,['photo']]))).score,40));
