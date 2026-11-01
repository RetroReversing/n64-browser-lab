import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBridge} from '../src/bridge.js';
test('explicit bridge rejects remote hosts, keeps bearer out of URLs, and clears access',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/pair')?{token:'TEST_CAPABILITY',project:'demo'}:{functions:[]}));};
 try{const b=createBridge();await assert.rejects(b.list(''),/Pair/);await assert.rejects(b.pair('https://external.example','CODE'),/loopback/);assert.equal(calls.length,0);await b.pair('http://127.0.0.1:6464','CODE');await b.list('candidate');assert.equal(calls[1].options.headers.Authorization,'Bearer TEST_CAPABILITY');assert(!calls.some(c=>c.url.includes('TEST_CAPABILITY')));assert.equal(calls[1].options.credentials,'omit');b.disconnect();await assert.rejects(b.list(''),/Pair/);}finally{globalThis.fetch=previous;}
});

test('pairing explains empty and non-JSON responses and preserves JSON host errors',async()=>{
 const previous=globalThis.fetch;
 try{for(const [body,status,message] of [['',200,/empty response.*HTTP 200/],['Not Found',404,/non-JSON response.*HTTP 404/],['{"error":"Code expired"}',400,/Code expired/],['{}',200,/pairing capability/]]){
  globalThis.fetch=async()=>new Response(body,{status});
  const b=createBridge();await assert.rejects(b.pair('http://127.0.0.1:6464','CODE'),message);await assert.rejects(b.list(''),/Pair/);
 }}finally{globalThis.fetch=previous;}
});

test('saved capability restores scope and expired capabilities clear authentication',async()=>{
 const previous=globalThis.fetch;
 try{const b=createBridge();globalThis.fetch=async()=>new Response(JSON.stringify({functions:[],project:'demo'}));
 await b.restore({base:'http://127.0.0.1:6464',token:'saved-token',project:'demo'});assert.equal(b.snapshot().project,'demo');
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Expired capability'}),{status:403});
 await assert.rejects(b.restore(b.snapshot()),/Expired/);await assert.rejects(b.list(''),/Pair/);
 await assert.rejects(b.restore({base:'https://remote.example',token:'saved-token'}),/Invalid saved/);
 }finally{globalThis.fetch=previous;}
});

test('submission sends the selected host variation ID for independent verification',async()=>{
 const previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify(url.endsWith('/pair')?{token:'cap',project:'demo'}:url.endsWith('/submit')?{job:'job'}:{state:'done',result:{matched:true}}));};
 try{const b=createBridge();await b.pair('http://127.0.0.1:6464','code');await b.submit('task','int f(void){return 0;}',undefined,'host-variant');assert.equal(calls.find(c=>c.url.endsWith('/submit')).body.variantId,'host-variant');}finally{globalThis.fetch=previous;}
});
