import {elfFunction,digest,automaticSymbols} from './formats.js';
import {createHost} from './host.js';
let rawCapture=null;
const host=createHost(text=>{if(rawCapture!==null)rawCapture+=text;else postMessage({type:'log',text});});
globalThis.__n64Process=host.process;
const wasmCache=new Map();
let toolManifest;
async function run(tool,args,capture=false){
 rawCapture=capture?"":null;let output="";const print=t=>{if(capture)output+=t+"\n";else postMessage({type:"log",text:t+"\n"});};
 postMessage({type:'log',text:`\n$ ${tool} ${args.join(' ')}\n`});
 if(!toolManifest){const response=await fetch('/toolchains/manifest.json');if(!response.ok)throw Error('Missing toolchain manifest. Run npm run stage.');toolManifest=await response.json();}
 if(!wasmCache.has(tool)){const r=await fetch(`/toolchains/${tool}.wasm`);if(!r.ok)throw Error(`Missing ${tool} WASM. Run npm run stage.`);const bytes=new Uint8Array(await r.arrayBuffer());if(await digest(bytes)!==toolManifest[tool]?.sha256)throw Error(`Toolchain integrity check failed for ${tool}.`);wasmCache.set(tool,bytes);}
 const {default:factory}=await import(/* @vite-ignore */ `/toolchains/${tool}.mjs`);
 let exit=0;
 const mod=await factory({wasmBinary:wasmCache.get(tool),noInitialRun:true,print,printErr:t=>postMessage({type:'log',text:t+'\n'}),quit:code=>{exit=code;}});
 host.process.exitCode=0;
 try{const result=mod.callMain(args);if(typeof result==='number')exit=result;}catch(e){if(typeof e.status==='number')exit=e.status;else throw e;}
 exit=exit||host.process.exitCode;if(exit)throw Error(`${tool} exited ${exit}. See tool output.`);const captured=output+(rawCapture||'');rawCapture=null;return captured;
}
onmessage=async({data})=>{try{
 if(data.type==='diff'){
  const args=['-D','-z','-b','binary','-m','mips:4300','-EB',`--adjust-vma=${data.address}`];
  host.fs.writeFileSync('/work/target.bin',new Uint8Array(data.target));host.fs.writeFileSync('/work/candidate.bin',new Uint8Array(data.candidate));
  const target=await run('objdump',[...args,'/work/target.bin'],true),candidate=await run('objdump',[...args,'/work/candidate.bin'],true);
  postMessage({type:'diff',id:data.id,target,candidate});return;
 }

 const {id,source,address=0x80000400,optimization='-O2',smallData='-G0',functionName='candidate',symbols={},context='',flags=null,taskId=null}=data;
 const accepted=new Set(['-G0','-G8','-mips3','-mgp32','-mfp32','-O0','-O1','-O2','-O3','-g','-g0','-g1','-g2','-g3']);
 if(flags!==null&&(!Array.isArray(flags)||flags.some(f=>!accepted.has(f))))throw Error('Unsupported host compiler flags.');
 const ccFlags=flags||[optimization,smallData,'-mips3','-mgp32','-mfp32'];
 const asmG=ccFlags.find(f=>/^-G[08]$/.test(f))||'-G0';
 if(!['-O0','-O1','-O2','-O3'].includes(optimization)||!['-G0','-G8'].includes(smallData)||!Number.isInteger(address)||address<0||address>0xffffffff||address%4)throw Error('Invalid compiler options or aligned VRAM address.');

 host.fs.writeFileSync('/work/input.c',context+'\n'+source);
 await run('cpp',['-undef','-D__mips__','-D__MIPSEB__','-D_LANGUAGE_C','/work/input.c','/work/input.i']);
 await run('cc1',['/work/input.i','-quiet',...ccFlags,'-o','/work/input.s']);
 const assembly=host.fs.readFileSync('/work/input.s','utf8');
 await run('as',['-EB','-mips3',asmG,'-o','/work/input.o','/work/input.s']);
 const resolvedSymbols=automaticSymbols(host.fs.readFileSync('/work/input.o'),symbols);
 for(const [name,value] of Object.entries(resolvedSymbols))if(!Object.hasOwn(symbols,name))postMessage({type:'log',text:`Resolved automatic symbol ${name} → 0x${value.toString(16)}\n`});
 const definitions=Object.entries(resolvedSymbols).map(([name,value])=>{if(!/^[A-Za-z_]\w*$/.test(name)||!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid external symbol.');return `${name} = 0x${value.toString(16)};`;});
 host.fs.writeFileSync('/work/link.ld',`${definitions.join("\n")}\nSECTIONS { . = 0x${Number(address).toString(16)}; .text : { *(.text*) } .rodata : { *(.rodata*) } .data : { *(.data*) } .bss : { *(.bss*) *(COMMON) } /DISCARD/ : { *(.reginfo) *(.MIPS.abiflags) *(.comment) *(.pdr) *(.gnu.attributes) } }`);
 await run('ld',['-EB','-T','/work/link.ld','-o','/work/output.elf','/work/input.o']);
 await run('objcopy',['-O','binary','--only-section=.text','/work/output.elf','/work/output.bin']);
 const textBytes=new Uint8Array(host.fs.readFileSync('/work/output.bin'));
 const fn=elfFunction(host.fs.readFileSync('/work/output.elf'),functionName);
 const bytes=fn.bytes;
 const elf=new Uint8Array(host.fs.readFileSync('/work/output.elf'));
 postMessage({type:'result',id,assembly,bytes,elf,textBytes,functionAddress:fn.address,toolchain:toolManifest,request:{source,context,flags,taskId,address,optimization,smallData,functionName,symbols:resolvedSymbols}},[bytes.buffer,elf.buffer]);
 }catch(e){rawCapture=null;postMessage({type:'error',id:data.id,error:e.stack||String(e)});}};
