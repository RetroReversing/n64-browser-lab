import {Volume,createFsFromVolume} from 'memfs';
import path from 'path-browserify';
import {Buffer} from 'buffer';
export function createHost(output){
 const volume=new Volume();const fs=createFsFromVolume(volume);let cwd='/work';
 fs.mkdirSync('/work',{recursive:true});fs.mkdirSync('/tmp',{recursive:true});
 fs.mkdirSync('/dev',{recursive:true});fs.writeFileSync('/dev/null','');
 const write=fs.writeSync.bind(fs),read=fs.readSync.bind(fs);
 fs.writeSync=(fd,buf,...args)=>{
  if(fd===1||fd===2){const offset=args[0]||0,length=args[1]??buf.length;output(new TextDecoder().decode(buf.subarray(offset,offset+length)));return length;}
  return write(fd,buf,...args);
 };
 fs.readSync=(fd,...args)=>fd===0?0:read(fd,...args);
 const process={argv:['browser','tool'],platform:'linux',stdin:{isTTY:false},cwd:()=>cwd,chdir:p=>{cwd=path.resolve(cwd,p);},exitCode:0,
  binding:name=>{if(name==='constants')return {fs:fs.constants};throw Error(`Unsupported host binding: ${name}`);},
  getBuiltinModule:name=>{if(name==='module')return {createRequire:()=>require};throw Error(`Unsupported host module: ${name}`);}};
 function require(name){
  if(name==='fs')return fs;
  if(name==='path')return path;
  if(name==='url')return {fileURLToPath:u=>new URL(u).pathname};
  if(name==='crypto')return {randomFillSync:a=>crypto.getRandomValues(a)};
  if(name==='child_process')return {spawnSync:()=>{throw Error('Native processes are unavailable. Browser pipeline runs explicit WASM passes.');}};
  throw Error(`Unsupported host module: ${name}`);
 }
 return {fs,process,Buffer};
}
