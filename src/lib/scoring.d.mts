export type Summary={score:number;grade:string;breakdown:Record<string,{raw:number;maximum:number;normalized:number}>};
export function calculate(items:readonly {id:string;category:string}[],answers:Record<string,{score?:number;note?:string}>):Summary;
export function validateForSubmit(items:readonly {id:string;category:string;text:string}[],answers:Record<string,{score?:number;note?:string}>,photos:Record<string,string[]>):Summary;
