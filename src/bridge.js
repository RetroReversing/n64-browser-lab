/** Explicit loopback bridge. Capability never goes in URLs; caller may persist its snapshot for reconnection. */
export function createBridge(){
 let base='',token='',project='';
 async function request(action,body={},authenticated=true){
  if(authenticated&&!token)throw Error('Pair with the desktop app first.');
  const response=await fetch(`${base}/api/browser-bridge/${action}`,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const text=await response.text();let data;
  try{data=JSON.parse(text);}catch{throw Error(`The desktop app returned ${text.trim()?'a non-JSON response':'an empty response'} (HTTP ${response.status}). Check the desktop URL and install/restart a decompdecomp build with browser-worker pairing support, then create a new code in Settings → Pair a browser worker.`);}
  if(!response.ok)throw Error(data?.error||`Desktop app returned HTTP ${response.status}.`);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('The desktop app returned an invalid bridge response. Check the desktop URL and update decompdecomp.');
  return data;
 }
 return {
  async pair(url,code){const u=new URL(url);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use a loopback desktop app URL, such as http://127.0.0.1:6464.');base=u.origin;token='';const r=await request('pair',{code},false);if(typeof r.token!=='string'||!r.token||typeof r.project!=='string'||!r.project)throw Error('The desktop app did not return a pairing capability. Update decompdecomp and create a new pairing code.');token=r.token;project=r.project;return r;},
  snapshot:()=>({base,token,project}),
  async restore(saved){const u=new URL(saved.base);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.origin!==saved.base||typeof saved.token!=='string'||!saved.token)throw Error('Invalid saved connection.');base=u.origin;token=saved.token;project=saved.project;try{return await request('functions',{search:''});}catch(e){token='';project='';throw e;}},
  list:search=>request('functions',{search}),
  task:functionId=>request('task',{functionId}),
  async submit(taskId,source,onProgress,variantId=null){const {job}=await request('submit',{taskId,source,...(variantId?{variantId}:{})});for(let i=0;i<240;i++){const r=await request('result',{job});if(r.state==='done')return r.result;if(r.state==='error'||r.state==='cancelled')throw Error(r.error||'Host verification failed. Fetch a new task.');onProgress?.('Desktop compiler is checking the candidate…');await new Promise(r=>setTimeout(r,500));}throw Error('Host verification is still running. Check the desktop app before fetching another task.');},
  disconnect(){token='';project='';base='';},
  get project(){return project;}
 };
}
