import {diffArrays} from 'diff';
import {highlightAssembly} from './assembly.js';
export function parseDisassembly(text){return text.split('\n').flatMap(line=>{const m=/^\s*([\da-f]+):\s+([\da-f]{8})\s+(.+?)\s*$/i.exec(line);if(!m)return [];const instruction=m[3].split(/\s+#/)[0].trim();return [{address:parseInt(m[1],16),word:m[2].toLowerCase(),text:instruction,opcode:instruction.split(/\s/)[0]}];});}
export function instructionDiff(target,candidate){
 const parts=diffArrays(target,candidate,{comparator:(a,b)=>a.word===b.word,timeout:100,maxEditLength:2048});
 const rows=[];const leftWords=new Set(target.map(x=>x.word)),rightWords=new Set(candidate.map(x=>x.word));
 const add=(a,b)=>{let kind=!a||!b?'different':a.word===b.word?'same':a.opcode===b.opcode?'operands':'different';if(kind!=='same'&&kind!=='operands'&&((a&&rightWords.has(a.word))||(b&&leftWords.has(b.word))))kind='moved';rows.push({target:a,candidate:b,kind});};
 if(!parts){for(let i=0;i<Math.max(target.length,candidate.length);i++)add(target[i],candidate[i]);return {rows,limited:true};}
 for(let i=0;i<parts.length;){if(!parts[i].added&&!parts[i].removed){for(const value of parts[i].value)add(value,value);
 i++;continue;}const removed=[],added=[];while(i<parts.length&&(parts[i].added||parts[i].removed)){(parts[i].removed?removed:added).push(...parts[i].value);i++;}for(let n=0;n<Math.max(removed.length,added.length);n++)add(removed[n],added[n]);}
 // Equal runs carry old entries from jsdiff; recover both addresses by walking aligned rows.
 let li=0,ri=0;for(const row of rows){if(row.target)row.target=target[li++];if(row.candidate)row.candidate=candidate[ri++];if(row.target&&row.candidate&&row.target.word===row.candidate.word)row.kind='same';}
 return {rows,limited:false};
}
function instructionCell(insn,other,kind){const cell=document.createElement('td');if(!insn){cell.className='diff-empty';cell.textContent='—';return cell;}const address=document.createElement('span');address.className='diff-address';address.textContent=insn.address.toString(16).toUpperCase();const bytes=document.createElement('span');bytes.className='diff-word';bytes.textContent=insn.word;const code=document.createElement('code');highlightAssembly(code,insn.text);
 if(kind==='operands'&&other){const tokens=insn.text.match(/\$[\w]+|0x[\da-f]+|[\w]+|\s+|./gi)||[];const opposite=other.text.match(/\$[\w]+|0x[\da-f]+|[\w]+|\s+|./gi)||[];const changes=diffArrays(opposite,tokens);code.replaceChildren();for(const change of changes){if(change.removed)continue;const span=document.createElement('span');highlightAssembly(span,change.value.join(''));if(change.added)span.className='operand-change';code.append(span);}}
 cell.append(address,bytes,code);if(insn.source){const comment=document.createElement('span');comment.className='asm-source-comment';comment.textContent=` # C:${insn.source.line} ${insn.source.text}`;cell.append(comment);}return cell;}
export function renderInstructionDiff(element,model,expanded=false){const table=document.createElement('table');table.className='diff-table';const head=document.createElement('thead'),tr=document.createElement('tr');for(const text of ['Target (your ROM)','Compiled attempt']){const th=document.createElement('th');th.textContent=text;tr.append(th);}head.append(tr);table.append(head);const body=document.createElement('tbody');
 const render=row=>{const tr=document.createElement('tr');tr.className=`diff-${row.kind}`;tr.append(instructionCell(row.target,row.candidate,row.kind),instructionCell(row.candidate,row.target,row.kind));body.append(tr);};
 for(let i=0;i<model.rows.length;){let end=i;while(end<model.rows.length&&model.rows[end].kind==='same')end++;if(!expanded&&end-i>8){model.rows.slice(i,i+3).forEach(render);const tr=document.createElement('tr'),td=document.createElement('td'),button=document.createElement('button');td.colSpan=2;td.className='diff-fold';button.textContent=`⋯ ${end-i-6} identical instructions ⋯`;button.onclick=()=>element.dispatchEvent(new Event('expanddiff'));td.append(button);tr.append(td);body.append(tr);model.rows.slice(end-3,end).forEach(render);i=end;}else{render(model.rows[i]);i++;}}
 table.append(body);element.replaceChildren(table);
}

export function changedSourceLines(model){
 const lines=new Map(),severity={operands:1,moved:2,different:3};
 for(const row of model.rows){const line=row.candidate?.source?.line;if(row.kind==='same'||!Number.isInteger(line)||line<1)continue;const entry=lines.get(line)||{line,kind:row.kind,count:0,instructions:[]};entry.count++;entry.instructions.push({kind:row.kind,target:row.target||null,candidate:row.candidate});if(severity[row.kind]>severity[entry.kind])entry.kind=row.kind;lines.set(line,entry);}
 return [...lines.values()].sort((a,b)=>a.line-b.line);
}
