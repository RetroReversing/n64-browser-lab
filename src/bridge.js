/** Explicit loopback bridge. Capability stays in this module's memory, never a URL or localStorage. */
export function createBridge(){
 let base='',token='',project='';
 async function request(action,body={},authenticated=true){
  if(authenticated&&!token)throw Error('Pair with the desktop app first.');
  const response=await fetch(`${base}/api/browser-bridge/${action}`,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||`Desktop app returned ${response.status}`);return data;
 }
 return {
  async pair(url,code){const u=new URL(url);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use a loopback desktop app URL, such as http://127.0.0.1:6464.');base=u.origin;token='';const r=await request('pair',{code},false);token=r.token;project=r.project;return r;},
  list:search=>request('functions',{search}),
  task:functionId=>request('task',{functionId}),
  async submit(taskId,source,onProgress){const {job}=await request('submit',{taskId,source});for(let i=0;i<240;i++){const r=await request('result',{job});if(r.state==='done')return r.result;if(r.state==='error'||r.state==='cancelled')throw Error(r.error||'Host verification failed. Fetch a new task.');onProgress?.('Desktop compiler is checking the candidate…');await new Promise(r=>setTimeout(r,500));}throw Error('Host verification is still running. Check the desktop app before fetching another task.');},
  disconnect(){token='';project='';base='';},
  get project(){return project;}
 };
}
