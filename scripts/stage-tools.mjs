import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const tools={objdump:['romdev-toolchain-mips-gcc','mips-linux-gnu-objdump'],cpp:['romdev-toolchain-decomp-gcc','kmc-2.7.2/cpp'],cc1:['romdev-toolchain-decomp-gcc','kmc-2.7.2/cc1'],as:['romdev-toolchain-decomp-gcc','kmc-2.7.2/as'],ld:['romdev-toolchain-mips-gcc','mips-linux-gnu-ld'],objcopy:['romdev-toolchain-mips-gcc','mips-linux-gnu-objcopy']};
const pinned=JSON.parse(await readFile('docs/toolchain-lock.json','utf8'));
await mkdir('public/toolchains',{recursive:true});let manifest={};
for(const [name,[pkg,file]] of Object.entries(tools)){
 const base=`node_modules/${pkg}/wasm/${file}`;
 const js=await readFile(base+'.mjs','utf8');
 // Only host API binding changes: the actual compiler/assembler/linker WASM is untouched.
 await writeFile(`public/toolchains/${name}.mjs`,'const process = globalThis.__n64Process;\n'+js);
 await copyFile(base+'.wasm',`public/toolchains/${name}.wasm`);
 const wasm=await readFile(base+'.wasm');
 const hash=createHash('sha256').update(wasm).digest('hex');
 if(pinned[name]?.sha256!==hash)throw Error(`Toolchain hash mismatch for ${name}; refusing unreviewed binary.`);
 manifest[name]={package:pkg,file,sha256:createHash('sha256').update(wasm).digest('hex'),bytes:wasm.length};
}
await writeFile('public/toolchains/manifest.json',JSON.stringify(manifest,null,2));
console.log('Staged six pinned WASM tools (no compiler service).');
