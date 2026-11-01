import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRom,compareBytes,findBytes,elfFunction} from '../src/formats.js';
function rom(){const b=new Uint8Array(4096);b.set([0x80,0x37,0x12,0x40]);new DataView(b.buffer).setUint32(8,0x80000400);b.set(new TextEncoder().encode('HOMEMADE DEMO'),32);return b;}
test('N64 byte orders normalize identically without modifying input',()=>{const expected=rom();for(const step of [1,2,4]){const input=expected.slice();if(step>1)for(let i=0;i<input.length;i+=step)input.subarray(i,i+step).reverse();const before=input.slice();assert.deepEqual(normalizeRom(input.buffer).bytes,expected);assert.deepEqual(input,before);}assert.equal(normalizeRom(expected.buffer).entry,0x80000400);});
test('bad files fail with actionable errors',()=>{assert.throws(()=>normalizeRom(new Uint8Array(4096).buffer),/header magic/);assert.throws(()=>normalizeRom(new Uint8Array(3).buffer),/N64 ROM/);});
test('matching requires every byte and a valid range',()=>{assert.equal(compareBytes(new Uint8Array([1,2]),new Uint8Array([0,1,2]),1).exact,true);assert.equal(compareBytes(new Uint8Array([1,3]),new Uint8Array([1,2]),0).exact,false);for(const offset of [-1,1.5,2])assert.throws(()=>compareBytes(new Uint8Array([1]),new Uint8Array([1]),offset));});
test('search is instruction aligned, bounded and rejects empty candidates',()=>{assert.deepEqual(findBytes(new Uint8Array([1]),new Uint8Array([1,1,0,0,1,0,0,0,1]),2),[0,4]);assert.throws(()=>findBytes(new Uint8Array(),new Uint8Array()));});
test('function extraction rejects non-MIPS/non-ELF input',()=>{assert.throws(()=>elfFunction(new Uint8Array(64),'candidate'),/ELF32 MIPS/);});
