import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRom,compareBytes,findBytes,elfFunction} from '../src/formats.js';
function rom(){const b=new Uint8Array(4096);b.set([0x80,0x37,0x12,0x40]);new DataView(b.buffer).setUint32(8,0x80000400);b.set(new TextEncoder().encode('HOMEMADE DEMO'),32);return b;}
test('N64 byte orders normalize identically without modifying input',()=>{const expected=rom();for(const step of [1,2,4]){const input=expected.slice();if(step>1)for(let i=0;i<input.length;i+=step)input.subarray(i,i+step).reverse();const before=input.slice();assert.deepEqual(normalizeRom(input.buffer).bytes,expected);assert.deepEqual(input,before);}assert.equal(normalizeRom(expected.buffer).entry,0x80000400);});
test('bad files fail with actionable errors',()=>{assert.throws(()=>normalizeRom(new Uint8Array(4096).buffer),/header magic/);assert.throws(()=>normalizeRom(new Uint8Array(3).buffer),/N64 ROM/);});
test('matching requires every byte and a valid range',()=>{assert.equal(compareBytes(new Uint8Array([1,2]),new Uint8Array([0,1,2]),1).exact,true);assert.equal(compareBytes(new Uint8Array([1,3]),new Uint8Array([1,2]),0).exact,false);for(const offset of [-1,1.5,2])assert.throws(()=>compareBytes(new Uint8Array([1]),new Uint8Array([1]),offset));});
test('search is instruction aligned, bounded and rejects empty candidates',()=>{assert.deepEqual(findBytes(new Uint8Array([1]),new Uint8Array([1,1,0,0,1,0,0,0,1]),2),[0,4]);assert.throws(()=>findBytes(new Uint8Array(),new Uint8Array()));});
test('function extraction rejects non-MIPS/non-ELF input',()=>{assert.throws(()=>elfFunction(new Uint8Array(64),'candidate'),/ELF32 MIPS/);});

import {functionMetrics} from '../src/formats.js';
test('function metrics preserve zero, distinguish untested, and use desktop score formula',()=>{
 assert.equal(functionMetrics({best_score:0,n_insns:10}),'Score 0 · 100.0% match');
 assert.equal(functionMetrics({best_score:50,n_insns:10}),'Score 50 · 95.0% match');
 assert.match(functionMetrics({best_score:null,n_insns:10}),/Not checked/);
 assert.equal(functionMetrics({best_score:5000,n_insns:10}),'Score 5000 · 0.0% match');
 assert.equal(functionMetrics({best_score:50,n_insns:0}),'Score 50 · match —');
});

import {functionAssembly} from '../src/formats.js';
test('assembly view keeps only the selected function including internal labels',()=>{
 const asm='.data\nvalue: .word 1\n.ent helper\nhelper:\njr $31\n.end helper\n.ent candidate\ncandidate:\n$L2:\njr $31\n.end candidate\n.ent later\nlater:\n.end later';
 assert.equal(functionAssembly(asm,'candidate'),'.ent candidate\ncandidate:\n$L2:\njr $31\n.end candidate');
 assert.throws(()=>functionAssembly(asm,'missing'),/boundary/);
});

import {annotatedFunctionAssembly} from '../src/formats.js';
test('C annotations use source snapshot and subtract host context lines',()=>{
 const request={context:'typedef int Value;',source:'int candidate(void) {\n return 7;\n}'};
 const assembly='.ent candidate\ncandidate:\n.section .line\n.4byte 3 # /input.c:3\n.previous\n addiu $2,$0,7\n.end candidate';
 assert.match(annotatedFunctionAssembly(assembly,'candidate',request),/addiu.*# C:2 return 7;/);
 assert.doesNotMatch(annotatedFunctionAssembly('.ent candidate\ncandidate:\n jr $31\n.end candidate','candidate',request),/# C:/);
});

import {isExactHostMatch} from '../src/formats.js';
test('submit eligibility requires a full match at the pinned host offset',()=>{
 const task={id:'task',function:'f',romSha256:'rom',romOffset:4,byteCount:8,vram:0x80000400};
 const rom={sha256:'rom',bytes:new Uint8Array(16)};
 const result={request:{taskId:'task',functionName:'f'},bytes:new Uint8Array(8),functionAddress:task.vram};
 assert.equal(isExactHostMatch(task,result,rom),true);
 assert.equal(isExactHostMatch(task,{...result,bytes:new Uint8Array(4)},rom),false);
 assert.equal(isExactHostMatch(task,{...result,bytes:new Uint8Array(8).fill(1)},rom),false);
 assert.equal(isExactHostMatch({...task,id:'other'},result,rom),false);
 assert.equal(isExactHostMatch(task,result,{...rom,sha256:'other'}),false);
 assert.equal(isExactHostMatch(task,{...result,functionAddress:0},rom),false);
});
