import reference from './data/operand-hints.json' with {type:'json'};
const names=['zero','at','v0','v1','a0','a1','a2','a3','t0','t1','t2','t3','t4','t5','t6','t7','s0','s1','s2','s3','s4','s5','s6','s7','t8','t9','k0','k1','gp','sp','fp','ra'];
function register(text){const raw=text.toLowerCase();if(/^\$(?:[0-9]|[12][0-9]|3[01])$/.test(raw))return names[Number(raw.slice(1))];const clean=raw.replace(/^\$/,'');if(clean==='s8')return 'fp';if(names.includes(clean)||/^f(?:[0-9]|[12][0-9]|3[01])$/.test(clean))return clean;return null;}
function operand(text){const raw=text.trim(),mem=/^(.*?)\(([^()]+)\)$/.exec(raw);if(mem)return {kind:'memory',base:register(mem[2]),offset:mem[1]||'0',raw};const reg=register(raw);return reg?{kind:'register',reg,raw}:{kind:'value',raw};}
function operands(instruction){return instruction.text.replace(/^\s*\S+\s*/,'').split(',').filter(Boolean).map(operand);}
function equalValue(a,b){const number=text=>/^-?(?:0x[\da-f]+|\d+)$/i.test(text)?(text.startsWith('-0x')?-Number(text.slice(1)):Number(text)):NaN;return a===b||(!Number.isNaN(number(a))&&number(a)===number(b));}
export function operandHints(target,candidate){
 if(!target||!candidate||target.opcode!==candidate.opcode||target.word===candidate.word)return [];
 const a=operands(target),b=operands(candidate),changes=[],result=[];let memory=null,otherChange=false;
 const add=(type,observed)=>{const item=reference.hints[type];result.push({type,observed,cause:item.cause,check:item.check});};
 for(let i=0;i<Math.max(a.length,b.length);i++){
  const left=a[i],right=b[i];if(!left||!right){otherChange=true;continue;}
  if(left.kind==='register'&&right.kind==='register'){if(left.reg!==right.reg)changes.push({from:left.reg,to:right.reg});}
  else if(left.kind==='memory'&&right.kind==='memory'){
   if(left.base&&right.base&&left.base!==right.base)changes.push({from:left.base,to:right.base});
   if(!equalValue(left.offset,right.offset))memory={left,right};
  }else if(!equalValue(left.raw,right.raw))otherChange=true;
 }
 if(changes.length){
  const fixed=changes.some(x=>[x.from,x.to].some(r=>['zero','sp','gp','ra'].includes(r)));
  let observed=`Register operand${changes.length===1?'':'s'} changed (target → compiled): ${changes.map(x=>`${x.from} → ${x.to}`).join(', ')}.`;
  if(/^(?:bnez|beqz)l?$/.test(target.opcode)&&!memory&&!otherChange)observed+=` Both instructions test ${target.opcode.startsWith('bnez')?'nonzero':'zero'} and keep the same branch destination.`;
  add(fixed?'fixedRegister':'register',observed);
  if(changes.some(x=>[x.from,x.to].every(r=>['v0','v1'].includes(r))))add('valueRegisters','About v0 and v1');
 }
 if(memory){const {left,right}=memory;const type=left.base===right.base&&left.base==='sp'?'stackOffset':left.base===right.base&&left.base==='gp'?'globalPointer':'memoryOffset';add(type,`Memory operand changed: ${left.raw} → ${right.raw}.`);}
 if(otherChange)add(/^(?:j(?:al|r|alr)?|b|b(?:eq|ne|ge|gt|le|lt|al|c1)[a-z]*)$/.test(target.opcode)?'branchTarget':'immediate','Other operands differ between target and compiled instructions.');
 if(!result.length&&target.word!==candidate.word)add('encoding','Instruction words differ even though the decoded operands appear equivalent.');
 return result;
}
