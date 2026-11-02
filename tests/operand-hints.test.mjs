import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operandHints} from '../src/operand-hints.js';
const ins=(text,word)=>({text,word,opcode:text.split(/\s/)[0]});
test('explains the reported v1 versus v0 branch without claiming a proven cause',()=>{
 const hints=operandHints(ins('bnez v1,0x8002aa6c','14600003'),ins('bnez v0,0x8002aa6c','14400003'));
 assert.match(hints[0].observed,/v1 → v0/);assert.match(hints[0].observed,/same branch destination/);assert.match(hints[0].cause,/Often register allocation/);assert(hints.some(x=>x.type==='valueRegisters'));
});
test('numeric register aliases do not create false register changes',()=>{
 const hints=operandHints(ins('bnez $3,0x8002aa6c','1'),ins('bnez v1,0x8002aa6c','2'));assert.deepEqual(hints.map(x=>x.type),['encoding']);
});
test('separates stack layout, memory fields, branch destinations, and fixed registers',()=>{
 assert.equal(operandHints(ins('lw v0,16(sp)','1'),ins('lw v0,20(sp)','2'))[0].type,'stackOffset');
 assert.equal(operandHints(ins('lw v0,16(a0)','1'),ins('lw v0,20(a0)','2'))[0].type,'memoryOffset');
 assert.equal(operandHints(ins('lw v0,16(gp)','1'),ins('lw v0,20(gp)','2'))[0].type,'globalPointer');
 assert.equal(operandHints(ins('bnez v0,0x8002aa6c','1'),ins('bnez v0,0x8002aa70','2'))[0].type,'branchTarget');
 assert.equal(operandHints(ins('addu v0,a0,zero','1'),ins('addu v0,a0,a1','2'))[0].type,'fixedRegister');
 assert.equal(operandHints(ins('addiu v0,a0,1','1'),ins('addiu v0,a0,2','2'))[0].type,'immediate');
 assert.equal(operandHints(ins('break 1','1'),ins('break 2','2'))[0].type,'immediate');
});
test('does not invent operand hints for different opcodes or equal instruction words',()=>{
 assert.deepEqual(operandHints(ins('lw v0,0(a0)','1'),ins('lh v0,0(a0)','2')),[]);
 assert.deepEqual(operandHints(ins('jr ra','1'),ins('jr ra','1')),[]);
 assert.deepEqual(operandHints(null,ins('jr ra','1')),[]);
});
