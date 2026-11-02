import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {instructionInfo,instructionDescription} from '../src/instructions.js';
const reference=JSON.parse(readFileSync(new URL('../src/data/mips-instructions.json',import.meta.url)));
test('reference covers CPU families and common aliases with nonempty descriptions',()=>{
 assert(Object.keys(reference.instructions).length>=260);
 for(const [name,entry] of Object.entries(reference.instructions)){assert(/^[a-z][a-z0-9.]*(?:\.[a-z]+)*$|^\.word$/.test(name),name);assert(entry.description.length>15,name);assert(entry.category,name);}
 for(const name of ['addiu','dsra32','tgeiu','tltiu','ll','scd','eret','tlbwi','bc1tl','add.s','cvt.w.d','c.ueq.s','c.ngt.d','dmfc1','nop','move','li','bnez'])assert(instructionInfo(name),name);
});
test('descriptions distinguish sign extension, aliases and likely delay slots',()=>{
 assert.match(instructionDescription(' ADDIU '),/sign-extended/);
 assert.match(instructionDescription('nop'),/alias/);
 assert.equal(instructionInfo('beq').delaySlot,'always');assert.equal(instructionInfo('beql').delaySlot,'taken-only');
 assert.equal(instructionInfo('unrecognised'),null);assert.equal(instructionDescription('constructor'),null);
});
