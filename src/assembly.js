import {instructionDescription} from './instructions.js';
// Render text nodes only: compiler output never becomes HTML.
export function highlightAssembly(element,text){
 const fragment=document.createDocumentFragment(),opcodes=new Map();
 // Also recognize instructions preceded by the raw address/word in gutter details.
 for(const match of text.matchAll(/^[ \t]*(?:[\da-fA-F]{8}\s+[\da-fA-F]{8}\s+)?([A-Za-z_][\w.]*)(?![\w.])/gm)){
  const index=match.index+match[0].lastIndexOf(match[1]);if(text[index+match[1].length]!==':')opcodes.set(index,match[1]);
 }
 const pattern=/(#[^\n]*|"(?:\\.|[^"\\])*"|\$[A-Za-z0-9_]+|\.[A-Za-z_]\w*|\b(?:0x[\da-fA-F]+|\d+)\b|[A-Za-z_][\w.]*)/gm;
 let offset=0;
 for(const match of text.matchAll(pattern)){
  fragment.append(document.createTextNode(text.slice(offset,match.index)));
  const token=match[0],span=document.createElement('span');
  span.className=token.startsWith('#')?'asm-comment':token.startsWith('"')?'asm-string':token.startsWith('$')?'asm-register':token.startsWith('.')?'asm-directive':opcodes.has(match.index)?'asm-opcode':/^\d/.test(token)?'asm-number':text[match.index+token.length]===':'?'asm-label':'';
  if(span.className==='asm-opcode'||span.className==='asm-directive'){
   const description=instructionDescription(token.trim());if(description){span.title=description;span.setAttribute('aria-label',description);span.classList.add('asm-explained');}
  }
  span.textContent=token;fragment.append(span);offset=match.index+token.length;
 }
 fragment.append(document.createTextNode(text.slice(offset)));element.replaceChildren(fragment);
}
