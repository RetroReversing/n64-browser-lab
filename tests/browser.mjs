/** Real Chromium integration test. No ROM is required; optional local ROM stays outside the repo.
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs BROWSER_EXECUTABLE=/path/to/chrome npm run test:browser
 */
import {createServer} from 'node:http';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('dist');const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error('path');const file=path===root?join(root,'index.html'):path;const data=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.wasm':'application/wasm'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const scratch=await mkdtemp(join(tmpdir(),'n64-browser-test-'));try{
 const page=await browser.newPage({viewport:{width:1400,height:1000},acceptDownloads:true});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.lab);
 const r=await page.evaluate(()=>lab.compile({source:'int candidate(int a,int b){return a+b;}',functionName:'candidate'}));
 assert.deepEqual(r.bytes,[3,224,0,8,0,133,16,33]);assert.equal(r.functionAddress,0x80000400);
 const fixture=new Uint8Array(8192);fixture.set([0x80,0x37,0x12,0x40]);new DataView(fixture.buffer).setUint32(8,0x80000400);fixture.set(new TextEncoder().encode('HOMEMADE WASM DEMO'),0x20);fixture.set(r.bytes,4096);await writeFile(join(scratch,'demo.z64'),fixture);
 await page.locator('#romFile').setInputFiles(join(scratch,'demo.z64'));await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('ROM loaded'));
 await page.selectOption('#preset','add');await page.click('#compile');await page.waitForFunction(()=>!document.querySelector('#compare').disabled);await page.click('#compare');assert.match(await page.locator('#comparison').textContent(),/Exact byte match · 8 bytes/);
 // Export must bind the source that produced the bytes, not uncompiled edits in the editor.
 await page.fill('#source','int candidate(void){return 12345;}');const downloadPromise=page.waitForEvent('download');await page.click('#proposal');const download=await downloadPromise;const location=join(scratch,'proposal.json');await download.saveAs(location);const proposal=JSON.parse(await readFile(location,'utf8'));assert.match(proposal.source,/a \+ b/);assert.equal(proposal.hostRecheckRequired,true);assert.equal(proposal.localExact,true);
 const ext=await page.evaluate(()=>lab.compile({source:'extern int helper(int); int candidate(int x){return helper(x)+1;}',functionName:'candidate',symbols:{helper:0x80001000}}));assert(ext.bytes.some((_,i)=>i%4===0&&ext.bytes[i]===0x0c&&ext.bytes[i+2]===0x04));
 await assert.rejects(page.evaluate(()=>lab.compile({source:'int candidate(void){ return broken syntax; }',functionName:'candidate'})),/cc1 exited/);
 await assert.rejects(page.evaluate(()=>lab.compile({source:'extern int missing(void); int candidate(void){return missing();}',functionName:'candidate'})),/ld exited/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert(requests.every(r=>r.method==='GET'));assert(requests.every(r=>new URL(r.url).hostname==='127.0.0.1'));
 console.log('Browser PASS: WASM compile/assemble/link, exact bytes, local ROM, bound export, external relocation, syntax/link errors, mobile, no uploads.');
}finally{await browser.close();server.close();await rm(scratch,{recursive:true,force:true});}
