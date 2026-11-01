// Render text nodes only: compiler output never becomes HTML.
export function highlightAssembly(element,text){
 const fragment=document.createDocumentFragment();
 const pattern=/(#[^\n]*|"(?:\\.|[^"\\])*"|\$[A-Za-z0-9_]+|\.[A-Za-z_]\w*|\b(?:0x[\da-fA-F]+|\d+)\b|^[ \t]*[A-Za-z_]\w*(?=:)|^[ \t]*[A-Za-z_]\w*)/gm;
 let offset=0;
 for(const match of text.matchAll(pattern)){
  fragment.append(document.createTextNode(text.slice(offset,match.index)));
  const token=match[0],span=document.createElement('span');
  span.className=token.startsWith('#')?'asm-comment':token.startsWith('"')?'asm-string':token.startsWith('$')?'asm-register':token.startsWith('.')?'asm-directive':/^\d/.test(token)?'asm-number':text[match.index+token.length]===':'?'asm-label':'asm-opcode';
  span.textContent=token;fragment.append(span);offset=match.index+token.length;
 }
 fragment.append(document.createTextNode(text.slice(offset)));element.replaceChildren(fragment);
}
