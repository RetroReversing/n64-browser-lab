import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBridge} from '../src/bridge.js';
test('explicit bridge rejects remote hosts, keeps bearer out of URLs, and clears access',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/pair')?{token:'TEST_CAPABILITY',project:'demo'}:{functions:[]}));};
 try{const b=createBridge();await assert.rejects(b.list(''),/Pair/);await assert.rejects(b.pair('https://external.example','CODE'),/loopback/);assert.equal(calls.length,0);await b.pair('http://127.0.0.1:6464','CODE');await b.list('candidate');assert.equal(calls[1].options.headers.Authorization,'Bearer TEST_CAPABILITY');assert(!calls.some(c=>c.url.includes('TEST_CAPABILITY')));assert.equal(calls[1].options.credentials,'omit');b.disconnect();await assert.rejects(b.list(''),/Pair/);}finally{globalThis.fetch=previous;}
});
