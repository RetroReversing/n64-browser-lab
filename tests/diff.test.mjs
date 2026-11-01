import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDisassembly,instructionDiff} from '../src/diff.js';
const ins=(word,opcode='addiu')=>({word,opcode,text:opcode,address:0x80000400});
test('reads objdump words including nops and branch encodings',()=>{
 const rows=parseDisassembly('80000400:\t03e00008 \tjr\tra\n80000404:\t00000000 \tnop\n');
 assert.equal(rows.length,2);assert.equal(rows[0].word,'03e00008');assert.equal(rows[1].opcode,'nop');
});
test('aligns inserted instructions and distinguishes operands and different opcodes',()=>{
 let model=instructionDiff([ins('01'),ins('02')],[ins('01'),ins('03','nop'),ins('02')]);
 assert.deepEqual(model.rows.map(r=>r.kind),['same','different','same']);
 assert.equal(model.rows[1].target,undefined);
 model=instructionDiff([ins('01')],[ins('02')]);assert.equal(model.rows[0].kind,'operands');
 model=instructionDiff([ins('01')],[ins('02','jr')]);assert.equal(model.rows[0].kind,'different');
});
test('does not treat identical text with different encoding as identical',()=>{
 assert.notEqual(instructionDiff([ins('01')],[ins('02')]).rows[0].kind,'same');
});

import {changedSourceLines} from '../src/diff.js';
test('maps differing candidate instructions to C lines without guessing target-only deletions',()=>{
 const row=(kind,line)=>({kind,candidate:{source:{line}}});
 const result=changedSourceLines({rows:[row('same',1),row('operands',3),row('different',3),row('moved',5),{kind:'different',target:{}},{kind:'different',candidate:{}}]});assert.deepEqual(result.map(({line,kind,count})=>({line,kind,count})),[{line:3,kind:'different',count:2},{line:5,kind:'moved',count:1}]);assert.equal(result[0].instructions.length,2);
});
