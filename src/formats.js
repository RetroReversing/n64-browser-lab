const decoder=new TextDecoder();
export const hex=(n,width=8)=>Number(n).toString(16).toUpperCase().padStart(width,'0');
export function normalizeRom(input){
 const src=new Uint8Array(input);if(src.length<0x1000||src.length>64*1024*1024||src.length%4)throw Error('Choose an uncompressed N64 ROM between 4 KiB and 64 MiB, with a size divisible by four.');
 const magic=Array.from(src.subarray(0,4),x=>hex(x,2)).join('');const out=src.slice();let order;
 if(magic==='80371240')order='Big endian (.z64)';
 else if(magic==='37804012'){order='Byte swapped (.v64)';for(let i=0;i<out.length;i+=2){[out[i],out[i+1]]=[out[i+1],out[i]];}}
 else if(magic==='40123780'){order='Little endian (.n64)';for(let i=0;i<out.length;i+=4){[out[i],out[i+1],out[i+2],out[i+3]]=[out[i+3],out[i+2],out[i+1],out[i]];}}
 else throw Error('Not an N64 ROM: unsupported header magic. Unzip the ROM first.');
 const view=new DataView(out.buffer);return {bytes:out,order,title:decoder.decode(out.subarray(0x20,0x34)).replace(/\0/g,'').trim(),gameCode:decoder.decode(out.subarray(0x3b,0x3f)),entry:view.getUint32(8),size:out.length};
}
export function elfFunction(input,name){
 const bytes=new Uint8Array(input);const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<52||d.getUint32(0)!==0x7f454c46||bytes[4]!==1||bytes[5]!==2||d.getUint16(18)!==8)throw Error('Expected a big-endian ELF32 MIPS executable.');
 const shoff=d.getUint32(32),size=d.getUint16(46),count=d.getUint16(48);
 const section=i=>{const p=shoff+i*size;if(i>=count||p+40>bytes.length)throw Error('Invalid ELF section.');return {type:d.getUint32(p+4),address:d.getUint32(p+12),offset:d.getUint32(p+16),size:d.getUint32(p+20),link:d.getUint32(p+24),entsize:d.getUint32(p+36)};};
 for(let i=0;i<count;i++){const sym=section(i);if(sym.type!==2)continue;const str=section(sym.link);if(sym.entsize!==16||sym.offset+sym.size>bytes.length)throw Error('Invalid ELF symbols.');
  for(let p=sym.offset;p<sym.offset+sym.size;p+=16){const ni=d.getUint32(p),si=d.getUint16(p+14);if(ni>=str.size||!si||si>=count)continue;const start=str.offset+ni,end=bytes.indexOf(0,start);const label=decoder.decode(bytes.subarray(start,end));
   if(label!==name)continue;const address=d.getUint32(p+4),length=d.getUint32(p+8),sec=section(si),offset=sec.offset+address-sec.address;
   if(!length||offset<sec.offset||offset+length>sec.offset+sec.size||offset+length>bytes.length)throw Error('Function has no valid byte range.');
   return {name,address,bytes:bytes.slice(offset,offset+length)};
  }
 }
 throw Error(`No defined function named ${name}. Set Function to the C entry point (not a prototype).`);
}
export function compareBytes(candidate,rom,offset){
 if(!Number.isSafeInteger(offset)||offset<0||offset+candidate.length>rom.length)throw Error('The candidate extends beyond the ROM. Check the ROM offset.');
 let equal=0;for(let i=0;i<candidate.length;i++)equal+=candidate[i]===rom[offset+i];return {exact:equal===candidate.length,equal,total:candidate.length,percent:100*equal/candidate.length};
}
export function findBytes(candidate,rom,limit=100){if(!candidate.length)throw Error('Compile a function first.');const result=[];for(let i=0;i<=rom.length-candidate.length;i+=4){let j=0;while(j<candidate.length&&rom[i+j]===candidate[j])j++;if(j===candidate.length){result.push(i);if(result.length===limit)break;}}return result;}
export async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>hex(b,2)).join('').toLowerCase();}
// Only undefined symbols may inherit automatic address names; never override a C definition.
export function automaticSymbols(input,known={}){
 const bytes=new Uint8Array(input),d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),result={...known};
 if(bytes.length<52||d.getUint32(0)!==0x7f454c46||bytes[4]!==1||bytes[5]!==2||d.getUint16(18)!==8)throw Error('Expected a big-endian ELF32 MIPS object.');
 const start=d.getUint32(32),stride=d.getUint16(46),count=d.getUint16(48);
 const section=i=>{const p=start+i*stride;if(i>=count||p+40>bytes.length)throw Error('Invalid ELF section.');return {type:d.getUint32(p+4),offset:d.getUint32(p+16),size:d.getUint32(p+20),link:d.getUint32(p+24),entry:d.getUint32(p+36)};};
 for(let i=0;i<count;i++){const sym=section(i);if(sym.type!==2)continue;const str=section(sym.link);if(sym.entry!==16||sym.size%16||sym.offset+sym.size>bytes.length||str.offset+str.size>bytes.length)throw Error('Invalid ELF symbols.');
 for(let p=sym.offset;p<sym.offset+sym.size;p+=16){if(d.getUint16(p+14)!==0)continue;const n=d.getUint32(p);if(n>=str.size)continue;const a=str.offset+n,b=bytes.indexOf(0,a);if(b<a||b>=str.offset+str.size)continue;const name=decoder.decode(bytes.subarray(a,b));if(Object.hasOwn(result,name))continue;const m=/^(?:func|D|B|jtbl|L|RO|STR|FLT|DBL|bss|data|sub|gUnknown|unk|off|dword|word|byte|loc)_([0-9A-Fa-f]{1,8})(?:_overlay_[0-9]{3})?$/.exec(name);if(m)result[name]=parseInt(m[1],16);}}
 return result;
}
