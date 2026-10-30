import React,{useEffect,useMemo,useRef,useState} from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import builtInSkills from '../../skills/skills.md?raw';
import {getSecret,setSecret,removeSecret} from './secureStorage';
import {Activity,ArrowLeft,Bot,Download,Check,ChevronDown,ChevronRight,Code2,Command,Eye,File,FileCode,Folder,FolderPlus,Github,Home,Menu,MessageSquare,MoreHorizontal,Play,Plus,RefreshCw,Rocket,Send,Settings,ShieldCheck,Smartphone,Terminal,Upload,X,Globe,Palette,Braces,FileText,FolderOpen} from 'lucide-react';

const DEFAULT_API=import.meta.env.VITE_API_BASE||'http://localhost:8000';
const starterFiles={
 'src/App.jsx':"export default function App(){\n  return (\n    <main>\n      <h1>Hello, OneByte</h1>\n      <p>Your next project starts here.</p>\n    </main>\n  );\n}\n",
 'src/styles.css':'* { box-sizing: border-box; }\nbody { margin: 0; font-family: sans-serif; }\n',
 'index.html':'<!doctype html>\n<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n'
};
const initialProvider={name:'OpenAI Compatible',baseUrl:'https://api.openai.com/v1',apiKey:'',models:[]};
const languageFor=p=>({jsx:'javascript',tsx:'typescript',js:'javascript',ts:'typescript',py:'python',html:'html',css:'css',json:'json',md:'markdown',xml:'xml',sh:'shell',yml:'yaml',yaml:'yaml',java:'java',kt:'kotlin',cpp:'cpp',c:'c',rs:'rust',go:'go',sql:'sql'}[p.split('.').pop()?.toLowerCase()]||'plaintext');
const fileIconFor=path=>{const ext=path.split('.').pop()?.toLowerCase();if(ext==='py'||ext==='sh')return Terminal;if(['js','jsx','ts','tsx','rs','go','c','cpp','java','kt'].includes(ext))return Code2;if(ext==='html')return Globe;if(ext==='css')return Palette;if(ext==='json')return Braces;if(['md','txt'].includes(ext))return FileText;return FileCode};
function createFileTree(paths){const root={};for(const path of paths){let node=root;const parts=path.split('/');parts.forEach((part,i)=>{node[part]??={children:{},path:null};if(i===parts.length-1)node[part].path=path;else node=node[part].children})}return root}


function buildPreviewHtml(files, nonce){
 let html=files['index.html']||files['public/index.html']||'';
 if(!html)return '';
 const cleanPath=p=>p.replace(/[?#].*$/,'').replace(/^\.\//,'').replace(/^\//,'');
 html=html.replace(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi,(tag,href)=>{
  const css=files[cleanPath(href)];return typeof css==='string'?'<style>\n'+css.replace(/<\/style/gi,'<\\/style')+'\n</style>':tag;
 });
 html=html.replace(/<script\b([^>]*)src=["']([^"']+\.js(?:\?[^"']*)?)["']([^>]*)><\/script>/gi,(tag,before,src,after)=>{
  const code=files[cleanPath(src)];if(typeof code!=='string')return tag;
  const type=(before+' '+after).match(/type=["']([^"']+)["']/i);
  return '<script'+(type?' type="'+type[1]+'"':'')+'>'+code.replace(/<\/script/gi,'<\\/script')+'</script>';
 });
 const audit='<script>(function(){const nonce='+JSON.stringify(nonce)+';function run(){const issues=[];const w=innerWidth;const nodes=[...document.querySelectorAll("button,a,input,select,textarea,[role=button]")].slice(0,100);const boxes=[];nodes.forEach((el,i)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return;const label=(el.innerText||el.getAttribute("aria-label")||el.getAttribute("placeholder")||el.tagName).trim().slice(0,36);if(r.width<40||r.height<40)issues.push({type:"small-target",label,detail:"Interactive target is smaller than 40px"});if(r.right>w+1||r.left< -1)issues.push({type:"overflow",label,detail:"Control extends outside viewport"});if(!el.innerText?.trim()&&!el.getAttribute("aria-label")&&!el.getAttribute("title")&&el.tagName!=="INPUT")issues.push({type:"missing-label",label,detail:"Control has no accessible label"});boxes.push({r,label})});for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2)issues.push({type:"overlap",label:a.label+" / "+b.label,detail:"Interactive controls overlap"})}if(document.documentElement.scrollWidth>w+2)issues.push({type:"page-overflow",label:"Page",detail:"Document exceeds viewport width"});parent.postMessage({type:"onebyte-visual-qa",nonce,viewport:{width:w,height:innerHeight},controls:nodes.length,issues},"*")}addEventListener("load",()=>setTimeout(run,350));addEventListener("resize",()=>setTimeout(run,250));setTimeout(run,800)})();</script>';
 if(/<\/body>/i.test(html))html=html.replace(/<\/body>/i,audit+'</body>');else html+=audit;
 return html;
}


export default function App(){
 const [files,setFiles]=useState(()=>{try{return JSON.parse(localStorage.getItem('onebyte.files'))||starterFiles}catch{return starterFiles}});
 const [selected,setSelected]=useState('src/App.jsx');
 const [screen,setScreen]=useState('projects');
 const [drawer,setDrawer]=useState(false);
 const [settings,setSettings]=useState(false);
 const [provider,setProvider]=useState(()=>{try{return {...initialProvider,...JSON.parse(localStorage.getItem('onebyte.provider'))}}catch{return initialProvider}});
 const [model,setModel]=useState(()=>localStorage.getItem('onebyte.model')||'gpt-4.1-mini');
 const [plannerModel,setPlannerModel]=useState(()=>localStorage.getItem('onebyte.plannerModel')||'gpt-4.1-mini');
 const [reviewModel,setReviewModel]=useState(()=>localStorage.getItem('onebyte.reviewModel')||'gpt-4.1-mini');
 const [apiBase,setApiBase]=useState(()=>localStorage.getItem('onebyte.apiBase')||DEFAULT_API);
 useEffect(()=>{localStorage.setItem('onebyte.apiBase',apiBase.trim().replace(/\/+$/,''))},[apiBase]);
 const [githubToken,setGithubToken]=useState('');
 const [secretsReady,setSecretsReady]=useState(false);
 const [repoName,setRepoName]=useState('onebyte-project');
 const [project,setProject]=useState(()=>localStorage.getItem('onebyte.project')||'My first project');
 const [projectDescription,setProjectDescription]=useState(()=>localStorage.getItem('onebyte.description')||'');
 const [publishInfo,setPublishInfo]=useState(null);
 const [showPublishDetails,setShowPublishDetails]=useState(false);
 const [previewReport,setPreviewReport]=useState(null);
 const [previewRevision,setPreviewRevision]=useState(0);
 const previewFrameRef=useRef(null);
 const reviewRevision=useRef(0);
 const previewNonce=useRef('onebyte-'+Math.random().toString(36).slice(2)).current;
 const previewHtml=useMemo(()=>buildPreviewHtml(files,previewNonce),[files,previewNonce]);
 const [task,setTask]=useState('');
 const [logs,setLogs]=useState(['Your AI workspace is ready. Connect a model in Settings to start building.']);
 const [busy,setBusy]=useState(false);
 const [tab,setTab]=useState('agent');
 const [plan,setPlan]=useState(null);
 const [review,setReview]=useState(null);
 const [notice,setNotice]=useState('');
 const [showFilePicker,setShowFilePicker]=useState(false);
 const [projectKind,setProjectKind]=useState('Web app');
 const [projects,setProjects]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem('onebyte.projects'));if(saved?.length)return saved}catch{}return [{id:'default',name:localStorage.getItem('onebyte.project')||'My first project',kind:'Web app',files:(()=>{try{return JSON.parse(localStorage.getItem('onebyte.files'))||starterFiles}catch{return starterFiles}})()}]});
 const [activeProjectId,setActiveProjectId]=useState(()=>localStorage.getItem('onebyte.activeProject')||'default');
 const [queue,setQueue]=useState(()=>{try{return (JSON.parse(localStorage.getItem('onebyte.queue'))||[]).map(q=>q.status==='running'?{...q,status:'queued'}:q)}catch{return []}});
 const [queueBusy,setQueueBusy]=useState(false);
 const queueRunnerRef=useRef(false);
 const [skills,setSkills]=useState(()=>localStorage.getItem('onebyte.skills')||builtInSkills);
 const [modelFilter,setModelFilter]=useState('');
 const [showModelDetails,setShowModelDetails]=useState(false);
 const [modelTests,setModelTests]=useState({});
 const [expandedFolders,setExpandedFolders]=useState({});
 const importRef=useRef(null);
 const folderRef=useRef(null);
 const editorRef=useRef(null);
 useEffect(()=>{const receive=e=>{if(e.source!==previewFrameRef.current?.contentWindow||e.data?.type!=='onebyte-visual-qa'||e.data?.nonce!==previewNonce)return;setPreviewReport(e.data)};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[previewNonce]);
 const flash=s=>{setNotice(s);window.clearTimeout(flash.timer);flash.timer=window.setTimeout(()=>setNotice(''),2800)};
 useEffect(()=>{localStorage.setItem('onebyte.files',JSON.stringify(files))},[files]);
 useEffect(()=>{localStorage.setItem('onebyte.project',project)},[project]);
 useEffect(()=>{localStorage.setItem('onebyte.description',projectDescription)},[projectDescription]);
 useEffect(()=>{setProjects(ps=>{const record={id:activeProjectId,name:project,description:projectDescription,kind:projectKind,files};const next=ps.some(p=>p.id===activeProjectId)?ps.map(p=>p.id===activeProjectId?record:p):[record,...ps];localStorage.setItem('onebyte.projects',JSON.stringify(next));return next})},[files,project,projectDescription,projectKind,activeProjectId]);
 useEffect(()=>{reviewRevision.current+=1;setReview(null);setPublishInfo(null)},[files,project,projectDescription,projectKind]);
 useEffect(()=>{setPreviewReport(null)},[files]);
 useEffect(()=>{localStorage.setItem('onebyte.activeProject',activeProjectId)},[activeProjectId]);
 useEffect(()=>{localStorage.setItem('onebyte.skills',skills)},[skills]);
 useEffect(()=>{localStorage.setItem('onebyte.queue',JSON.stringify(queue))},[queue]);
 useEffect(()=>{const {apiKey,...safe}=provider;localStorage.setItem('onebyte.provider',JSON.stringify(safe))},[provider]);
 useEffect(()=>{localStorage.setItem('onebyte.model',model)},[model]);
 useEffect(()=>{localStorage.setItem('onebyte.plannerModel',plannerModel)},[plannerModel]);
 useEffect(()=>{localStorage.setItem('onebyte.reviewModel',reviewModel)},[reviewModel]);
 useEffect(()=>{localStorage.setItem('onebyte.apiBase',apiBase.trim().replace(/\/+$/,''))},[apiBase]);
 useEffect(()=>{let alive=true;(async()=>{try{const [apiKey,token]=await Promise.all([getSecret('provider_api_key'),getSecret('github_token')]);if(!alive)return;setProvider(p=>({...p,apiKey:apiKey||''}));setGithubToken(token||'')}catch(e){flash('Secure storage unavailable: '+e.message)}finally{if(alive)setSecretsReady(true)}})();return()=>{alive=false}},[]);
 useEffect(()=>{if(!secretsReady)return;(provider.apiKey?setSecret('provider_api_key',provider.apiKey):removeSecret('provider_api_key')).catch(e=>flash('Could not store provider key securely: '+e.message))},[provider.apiKey,secretsReady]);
 useEffect(()=>{if(!secretsReady)return;(githubToken?setSecret('github_token',githubToken):removeSecret('github_token')).catch(e=>flash('Could not store GitHub token securely: '+e.message))},[githubToken,secretsReady]);
 const fileList=useMemo(()=>Object.keys(files).sort((a,b)=>a.localeCompare(b)),[files]);
 const activeContent=files[selected]||'';
 const fileTree=useMemo(()=>createFileTree(fileList),[fileList]);
 function renderFileTree(nodes,parent=''){return Object.entries(nodes).sort((a,b)=>{const af=!!a[1].path,bf=!!b[1].path;return af===bf?a[0].localeCompare(b[0]):af?1:-1}).map(([name,node])=>{const path=parent?parent+'/'+name:name;if(node.path){const Icon=fileIconFor(node.path);return <button key={node.path} title={node.path} className={'drawer-file '+(node.path===selected?'chosen':'')} style={{paddingLeft:12+path.split('/').length*9}} onClick={()=>{setSelected(node.path);go('editor')}}><Icon size={15}/><span>{name}</span></button>}const open=expandedFolders[path]!==false;return <div className='tree-folder' key={path}><button className='drawer-folder' style={{paddingLeft:10+path.split('/').length*8}} onClick={()=>setExpandedFolders(v=>({...v,[path]:!open}))}><ChevronRight className={open?'tree-chevron open':''} size={13}/>{open?<FolderOpen size={15}/>:<Folder size={15}/>}<span>{name}</span></button>{open&&renderFileTree(node.children,path)}</div>})}

 async function switchProject(p){if(queueBusy||queue.some(q=>q.status==='queued'||q.status==='running'))return flash('Finish or remove pending queue tasks before switching projects');setActiveProjectId(p.id);setProject(p.name);setProjectDescription(p.description||'');setProjectKind(p.kind||'Web app');setFiles(p.files||starterFiles);setSelected(Object.keys(p.files||starterFiles)[0]||'');setPlan(null);setReview(null);go('editor')}
 async function newProject(){if(queueBusy||queue.some(q=>q.status==='queued'||q.status==='running'))return flash('Finish or remove pending queue tasks before creating another project');const name=window.prompt('Project name');if(!name?.trim())return;const description=window.prompt('Describe the project and its required features');if(!description?.trim())return flash('A project description is required');const kind=window.prompt('Project type: Website, Android app, CLI, or Desktop app',projectKind)||projectKind;if(!provider.apiKey){setSettings(true);return flash('Connect a planner model first')}setActiveProjectId(crypto.randomUUID());setProject(name.trim());setProjectDescription(description.trim());setProjectKind(kind);setFiles(starterFiles);setSelected('src/App.jsx');setPlan(null);setReview(null);setScreen('assistant');setTab('plan');setLogs([{role:'assistant',text:'Analyzing your project brief and preparing the architecture…'}]);try{const r=await fetch(apiBase+'/api/agent/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:plannerModel||model,name:name.trim(),description,kind,files:{},skills})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Planning failed');setPlan(d.plan);setLogs(l=>[...l,{role:'assistant',text:d.summary||'Project plan is ready.'}]);flash('Project analyzed and plan created')}catch(e){setLogs(l=>[...l,{role:'error',text:e.message}]);flash(e.message)}}
 function addFile(){const path=window.prompt('New file path (example: src/main.py)');if(!path?.trim())return;const clean=path.trim().replace(/^\/+/, '');if(clean.split('/').includes('..'))return flash('Invalid file path');setFiles(f=>({...f,[clean]:f[clean]||''}));setSelected(clean);setScreen('editor');setDrawer(false)}
 async function importFiles(list){
  const next={...files};let totalBytes=Object.values(next).reduce((n,v)=>n+(typeof v==='string'?new Blob([v]).size:0),0);let imported=0;let skipped=0;
  const normalizePath=value=>String(value||'').replace(/\\/g,'/').replace(/^\.\/+/, '');
  const isTextPath=value=>{const name=value.split('/').pop().toLowerCase();const ext=name.includes('.')?name.split('.').pop():'';return ['js','jsx','ts','tsx','mjs','cjs','py','html','htm','css','scss','sass','less','json','md','txt','xml','svg','yml','yaml','toml','ini','cfg','conf','sh','bat','ps1','java','kt','c','h','cpp','hpp','cs','go','rs','php','rb','swift','sql','graphql','vue','svelte','astro','gradle','properties','proto','dart','ex','exs','erl','hs','lua','r','m','mm','plist','xcconfig','ipynb','csv','tsv','rst','adoc','lock'].includes(ext)||['dockerfile','makefile','license','readme','.gitignore','.dockerignore','.env.example','.env.sample','.env.template'].includes(name)};
  const safePath=value=>{const path=normalizePath(value);const parts=path.split('/');const name=parts.at(-1)?.toLowerCase()||'';const sensitive=name==='.env'||(name.startsWith('.env.')&&!['.env.example','.env.sample','.env.template'].includes(name))||['.npmrc','.pypirc','credentials','credentials.json','secrets.json','service-account.json','id_rsa','id_ed25519','known_hosts'].includes(name)||/\\.(pem|key|p12|pfx|keystore|jks)$/.test(name);return !!path&&!path.startsWith('/')&&!/^[a-z]:/i.test(path)&&!parts.some(part=>!part||part==='..'||part==='.')&&!parts.some(part=>['.git','node_modules','.venv','venv','__pycache__'].includes(part.toLowerCase()))&&!sensitive};
  try{
   for(const file of Array.from(list||[])){
    if(file.name.toLowerCase().endsWith('.zip')){
     if(file.size>20*1024*1024)throw Error('ZIP archive exceeds the 20 MB compressed-size limit');
     const zip=await JSZip.loadAsync(file,{checkCRC32:true});const entries=Object.entries(zip.files).filter(([,item])=>!item.dir);
     if(entries.length>150)throw Error('ZIP archive contains more than 150 files');
     for(const [rawPath,item] of entries){
      const path=normalizePath(rawPath);if(!safePath(path)||!isTextPath(path)){skipped++;continue;}
      const declaredSize=item._data?.uncompressedSize;if(typeof declaredSize==='number'&&(declaredSize>500000||totalBytes+declaredSize>8*1024*1024))throw Error('ZIP contents exceed the 8 MB uncompressed import limit');
      const value=await item.async('string');const bytes=new Blob([value]).size;
      if(bytes>500000||totalBytes+bytes>8*1024*1024)throw Error('Imported files exceed the 8 MB text limit');
      next[path]=value;totalBytes+=bytes;imported++;
     }
    }else{
     const path=normalizePath(file.webkitRelativePath||file.name);
     if(!safePath(path)||!isTextPath(path)){skipped++;continue;}
     if(file.size>500000||totalBytes+file.size>8*1024*1024)throw Error('Imported files exceed the 8 MB text limit');
     next[path]=await file.text();totalBytes+=file.size;imported++;
    }
    if(Object.keys(next).length>150)throw Error('A project can contain at most 150 imported files');
   }
   setFiles(next);const first=Object.keys(next).find(p=>p!==selected);if(first)setSelected(first);setScreen('editor');setDrawer(false);flash(imported+' source files imported'+(skipped?' · '+skipped+' unsupported/unsafe files skipped':''));
  }catch(e){flash('Import failed: '+e.message)}
 }
 async function testModel(modelId){setModelTests(v=>({...v,[modelId]:{loading:true}}));try{const r=await fetch(apiBase+'/api/providers/test-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:modelId})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Model test failed');setModelTests(v=>({...v,[modelId]:d}))}catch(e){setModelTests(v=>({...v,[modelId]:{ok:false,http_status:null,detail:e.message}}))}}
 async function loadModels(){if(!provider.apiKey)return flash('Enter your provider API key');try{const r=await fetch(apiBase+'/api/providers/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Could not load models');setProvider(p=>({...p,models:d.models||[]}));if(d.models?.[0]){setModel(d.models[0].id);setPlannerModel(d.models[0].id);setReviewModel(d.models[0].id)}flash('Model list refreshed')}catch(e){flash(e.message)}}
 function fixPreviewFindings(){if(!previewReport?.issues?.length)return flash('No preview findings to send');const prompt='Review and fix these observed HTML preview layout/accessibility findings. Inspect the actual project files, make focused fixes, preserve the intended design, and explain any heuristic false positives. Do not claim screenshot-based visual review. Findings:\\n'+JSON.stringify(previewReport.issues,null,2);setQueue(q=>[...q,{id:Date.now()+Math.random(),text:prompt,status:'queued'}]);setLogs(l=>[...l,{role:'user',text:'Fix the issues found by the preview layout audit'}]);setScreen('assistant');setTab('agent');flash('Preview findings added to the coding queue')}
 function startPlanImplementation(){if(!plan)return;const prompt='Implement the approved project plan end-to-end. Follow its architecture, requirements, file tree and acceptance criteria. Create complete files, preserve existing working code, and report any blocked requirement.\nApproved plan:\n'+JSON.stringify(plan,null,2);setQueue(q=>[...q,{id:Date.now()+Math.random(),text:prompt,status:'queued'}]);setLogs(l=>[...l,{role:'user',text:'Start implementation from the approved project plan'}]);setTab('agent');setScreen('assistant');flash('Full project plan added to implementation queue')}
 async function runTask(){if(!task.trim())return;if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}const prompt=task.trim();setQueue(q=>[...q,{id:Date.now()+Math.random(),text:prompt,status:'queued'}]);setLogs(l=>[...l,{role:'user',text:prompt}]);setTask('');setScreen('assistant');flash('Added to implementation queue')}
 async function executeStreaming(next){
  const response=await fetch(apiBase+'/api/agent/execute/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model,task:next.text,project:{name:project,description:projectDescription,kind:projectKind,files},skills})});
  if(!response.ok){let detail='Streaming request failed';try{detail=(await response.json()).detail||detail}catch{}throw Error(detail)}
  if(!response.body)throw Error('This browser does not support streaming responses');
  const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let summary='';let completed=false;let activePath=null;let previousContent;
  const restorePartial=()=>{if(!activePath)return;const path=activePath;const old=previousContent;setFiles(prev=>{const nextFiles={...prev};if(old===undefined)delete nextFiles[path];else nextFiles[path]=old;return nextFiles});activePath=null;previousContent=undefined};
  const handle=line=>{if(!line.trim())return;let event;try{event=JSON.parse(line)}catch{return}
   if(event.type==='summary_delta'){summary+=event.text||''}
   else if(event.type==='file_start'){if(activePath)throw Error('The model started a new file before closing '+activePath);activePath=event.path;previousContent=files[event.path];setReview(null);setSelected(event.path);setFiles(prev=>({...prev,[event.path]:''}));setScreen('editor');setLogs(l=>[...l,{role:'assistant',text:'Writing '+event.path+' …'}])}
   else if(event.type==='file_delta'){setFiles(prev=>({...prev,[event.path]:(prev[event.path]||'')+(event.text||'')}))}
   else if(event.type==='file_end'){if(activePath===event.path){activePath=null;previousContent=undefined}setSelected(event.path);setLogs(l=>[...l,{role:'assistant',text:'Finished '+event.path}])}
   else if(event.type==='error'){throw Error(event.message||'AI streaming failed')}
   else if(event.type==='done'){completed=true;setLogs(l=>[...l,{role:'assistant',text:event.summary||summary||'Code generation completed.'}]);setTab('agent');flash('Live code generation completed')}
  };
  try{
   while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines)handle(line)}
   pending+=decoder.decode();if(pending.trim())handle(pending);
  }catch(error){restorePartial();throw error}
  finally{reader.releaseLock()}
  if(!completed){restorePartial();throw Error('The model stream ended before the completion event. Check the generated files and retry if needed.')}
 }
 useEffect(()=>{const next=queue.find(q=>q.status==='queued');if(!next||queueBusy||queueRunnerRef.current||!provider.apiKey)return;queueRunnerRef.current=true;setQueueBusy(true);setBusy(true);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'running'}:x));(async()=>{try{await executeStreaming(next);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'done'}:x));flash('AI response received')}catch(e){setLogs(l=>[...l,{role:'error',text:e.message}]);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'failed',error:e.message}:x));flash(e.message)}finally{setBusy(false);queueRunnerRef.current=false;setQueueBusy(false)}})()},[queue,queueBusy,provider.apiKey,provider.baseUrl,apiBase,model,project,projectKind,files,skills]);
 async function doReview(){if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}const revision=reviewRevision.current;setReview({loading:true});try{const r=await fetch(apiBase+'/api/agent/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:reviewModel,project:{name:project,description:projectDescription,kind:projectKind,files},skills})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Review failed');if(revision!==reviewRevision.current){setReview(null);return flash('Project changed during review. Run the review again on the latest files.')}setReview(d)}catch(e){if(revision===reviewRevision.current)setReview({error:e.message})}}
 async function importGitHubRepo(){if(queueBusy||queue.some(q=>q.status==='queued'||q.status==='running'))return flash('Finish or remove pending queue tasks before importing another project');if(!githubToken){setSettings(true);return flash('Add a GitHub token first')}if(!repoName.includes('/'))return flash('Enter an existing repository as owner/name');try{const r=await fetch(apiBase+'/api/github/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:githubToken,repository:repoName})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Repository import failed');setProject(d.name);setProjectDescription(d.description||'');setActiveProjectId('github-'+repoName.replace('/','-'));setFiles(d.files||{});setSelected(Object.keys(d.files||{})[0]||'');setPlan(null);setReview(null);setSettings(false);setScreen('editor');flash('Imported '+d.files_imported+' files from '+repoName)}catch(e){flash(e.message)}}
 async function publish(){if(!githubToken){setSettings(true);return flash('Add a GitHub token in Settings')}if(!review||review.error||review.loading){setTab('review');setScreen('assistant');return flash('Run the expert review before publishing')}if(review.score<10||(review.findings||[]).some(f=>['high','medium','low'].includes(String(f.severity).toLowerCase()))){setTab('review');setScreen('assistant');return flash('The expert review must score 10/10 with no actionable findings before publishing')}try{const r=await fetch(apiBase+'/api/github/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:githubToken,repo_name:repoName.split('/').pop(),existing_repo:repoName.includes('/')?repoName:null,description:projectDescription,kind:projectKind,files})});const d=await r.json();if(!r.ok)throw Error(d.detail||'GitHub publish failed');setPublishInfo(d);setShowPublishDetails(false);flash('Published successfully');setLogs(l=>[...l,{role:'assistant',text:'GitHub repository: '+d.repository+(d.workflow_url?' · Build workflow: '+d.workflow_url:'')}])}catch(e){flash(e.message)}}
 function go(next){setScreen(next);setDrawer(false)}
 const openImport=()=>importRef.current?.click();
 return <div className="app-shell">
  <header className="topbar">
   <button className="icon-btn menu-btn" aria-label="Open menu" onClick={()=>setDrawer(true)}><Menu/></button>
   <button className="brand" onClick={()=>go('projects')}><span className="brand-mark">1</span><span>onebyte<span className="brand-muted">coder</span></span></button>
   <div className="top-project" onClick={()=>go('projects')}><span>{project}</span><ChevronDown size={14}/></div>
   <button className="icon-btn top-settings" aria-label="Settings" onClick={()=>setSettings(true)}><Settings/></button>
  </header>

  {drawer&&<div className="scrim" onClick={()=>setDrawer(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}>
   <div className="drawer-head"><div className="brand"><span className="brand-mark">1</span><span>onebyte<span className="brand-muted">coder</span></span></div><button className="icon-btn" onClick={()=>setDrawer(false)}><X/></button></div>
   <div className="drawer-section">WORKSPACE</div>
   <button className="drawer-link" onClick={()=>go('projects')}><Home/>Projects</button>
   <button className="drawer-link" onClick={()=>go('editor')}><Code2/>Code editor</button>
   <button className="drawer-link" onClick={()=>go('assistant')}><Bot/>AI assistant</button>
   <button className="drawer-link" onClick={()=>go('preview')}><Eye/>Preview</button>
   <div className="drawer-section">PROJECT FILES <button className="mini-action" onClick={addFile}><Plus size={15}/></button></div>
   <div className="drawer-files">{renderFileTree(fileTree)}</div>
   <button className="drawer-link" onClick={openImport}><Upload/>Import files / ZIP</button>
   <button className="drawer-link" onClick={()=>folderRef.current?.click()}><FolderPlus/>Import folder</button>
   <div className="drawer-bottom"><button className="drawer-link" onClick={()=>{setSettings(true);setDrawer(false)}}><Settings/>Settings & connections</button><div className="connection-state"><span className={provider.apiKey?'online-dot':'offline-dot'}/>{provider.apiKey?'AI provider connected':'AI provider not connected'}</div></div>
  </aside></div>}

  <main className="main-content">
   {screen==='projects'&&<section className="page projects-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Projects</h1><p>Pick up where you left off or start something new.</p></div><button className="primary-btn" onClick={newProject}><Plus size={17}/> New</button></div>
    <div className='project-list'>{projects.map(p=>{const Icon=fileIconFor(Object.keys(p.files||{}).sort()[0]||'');return <button className='project-card current-project' key={p.id} onClick={()=>switchProject(p)}><div className='project-card-icon'><Icon/></div><div className='project-card-info'><span className='card-kicker'>{p.id===activeProjectId?'ACTIVE PROJECT':'PROJECT'}</span><h2>{p.name}</h2><p>{p.kind||'Project'} · {Object.keys(p.files||{}).length} files · {languageFor(Object.keys(p.files||{}).sort()[0]||'')}</p></div><ChevronRight className='card-arrow'/></button>})}</div>
    {publishInfo&&<div className="publish-result"><div className="publish-result-head"><div><b>Project published</b><small>{publishInfo.files_uploaded} files uploaded</small></div><button className="secondary-btn" onClick={()=>setShowPublishDetails(v=>!v)}>Details</button></div>{showPublishDetails&&<div className="publish-result-details"><a href={publishInfo.repository} target="_blank" rel="noreferrer">Open GitHub repository</a>{publishInfo.workflow_url&&<a href={publishInfo.workflow_url} target="_blank" rel="noreferrer">Build and deployment workflow</a>}{publishInfo.pages_note&&<p>{publishInfo.pages_note}</p>}<small>Publishing source does not mean the build or deployment has completed. Check the workflow result before sharing the deliverable.</small></div>}</div>}
    <div className="section-heading"><h3>Quick start</h3></div>
    <div className="quick-grid"><button className="quick-card" onClick={()=>{setProjectKind('Web app');go('editor')}}><span className="quick-icon blue"><Code2/></span><b>Web app</b><small>HTML, CSS, JavaScript</small></button><button className="quick-card" onClick={()=>{setProjectKind('Python');go('editor')}}><span className="quick-icon green"><Terminal/></span><b>Python project</b><small>Scripts and tools</small></button><button className="quick-card" onClick={openImport}><span className="quick-icon purple"><Upload/></span><b>Import project</b><small>ZIP or source files</small></button><button className="quick-card" onClick={()=>{setSettings(true)}}><span className="quick-icon amber"><Bot/></span><b>Connect AI</b><small>Choose your model</small></button></div>
    <div className="tip-card"><div className="tip-icon"><Smartphone/></div><div><b>Built for coding on the go</b><p>Your workspace, files and editor are arranged for a phone screen.</p></div></div>
   </section>}

   {screen==='editor'&&<section className="editor-page">
    <div className="editor-toolbar"><button className="tool-pill" onClick={()=>setDrawer(true)}><Folder size={15}/> Files <span className="count">{fileList.length}</span></button><div className="editor-actions"><button className="icon-btn" onClick={addFile} aria-label="New file"><Plus/></button><button className="icon-btn" onClick={()=>go('preview')} aria-label="Preview"><Play/></button><button className="icon-btn" onClick={publish} aria-label="Publish to GitHub"><Github/></button></div></div>
    <button className="file-tab" onClick={()=>setShowFilePicker(v=>!v)}><FileCode size={15}/><span>{selected}</span><ChevronDown size={14}/><span className="tab-spacer"/><span className="language-label">{languageFor(selected)}</span></button>
    {showFilePicker&&<div className="file-picker">{fileList.map(path=><button key={path} onClick={()=>{setSelected(path);setShowFilePicker(false)}}><FileCode size={14}/>{path}</button>)}</div>}
    <div className="editor-canvas"><Editor height="100%" theme="vs-dark" language={languageFor(selected)} path={selected} value={activeContent} onChange={v=>setFiles(f=>({...f,[selected]:v??''}))} onMount={editor=>{editorRef.current=editor}} options={{minimap:{enabled:false},fontSize:14,automaticLayout:true,wordWrap:'on',scrollBeyondLastLine:false,padding:{top:16,bottom:20},lineNumbers:'on',glyphMargin:false,folding:true,renderLineHighlight:'line',overviewRulerLanes:0,contextmenu:true,quickSuggestions:true,tabSize:2,scrollbar:{horizontalScrollbarSize:6,verticalScrollbarSize:6},stickyScroll:{enabled:false},readOnly:false}}/></div>
    <div className="editor-status"><span className={busy?"stream-indicator":""}><span className={busy?"offline-dot":"online-dot"}/>{busy?"STREAMING CODE":"Ready"}</span><span>{languageFor(selected).toUpperCase()}</span><span>{activeContent.split('\n').length} lines</span></div>
   </section>}

   {screen==='assistant'&&<section className="page assistant-page">
    <div className="page-heading compact"><div><div className="eyebrow">AI WORKSPACE</div><h1>Assistant</h1><p>Plan, build and review your project.</p></div><button className="model-chip" onClick={()=>setSettings(true)}><Bot size={14}/>{model}<ChevronDown size={13}/></button></div>
    <div className="assistant-tabs"><button className={tab==='agent'?'selected':''} onClick={()=>setTab('agent')}><MessageSquare size={15}/> Chat</button><button className={tab==='plan'?'selected':''} onClick={()=>setTab('plan')}><Command size={15}/> Plan</button><button className={tab==='review'?'selected':''} onClick={()=>setTab('review')}><ShieldCheck size={15}/> Review</button></div>
    {tab==='agent'?<><div className="chat-feed">{logs.map((entry,i)=>typeof entry==='string'?<div className="chat-message system" key={i}>{entry}</div>:<div className={'chat-message '+entry.role} key={i}><span className="message-role">{entry.role==='user'?'YOU':entry.role==='error'?'ERROR':'ONEBYTE AI'}</span><p>{entry.text}</p></div>)}{busy&&<div className="chat-message assistant"><span className="typing"><i/><i/><i/></span> Working on your request…</div>}</div><div className="queue-card"><div className="queue-card-head"><b>Implementation queue</b><span>{queue.filter(q=>q.status==='queued').length} waiting · {queue.filter(q=>q.status==='done').length} completed</span></div>{queue.map(q=><div className="queue-row" key={q.id}><span className={'queue-status '+q.status}>{q.status==='done'?'✓':q.status==='running'?'…':q.status==='failed'?'!':'○'}</span><span>{q.text}</span>{q.error&&<small>{q.error}</small>}{q.status==='failed'&&<button title="Retry task" aria-label="Retry task" onClick={()=>setQueue(items=>items.map(x=>x.id===q.id?{...x,status:'queued',error:undefined}:x))}><RefreshCw size={13}/></button>}<button title="Remove task" aria-label="Remove task" onClick={()=>setQueue(items=>items.filter(x=>x.id!==q.id))}><X size={13}/></button></div>)}</div><div className="chat-composer"><textarea value={task} onChange={e=>setTask(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();runTask()}}} placeholder="Ask OneByte to build or change something…" rows={2}/><div className="composer-bottom"><span>Enter to send · Shift + Enter for new line</span><button className="send-btn" disabled={busy||!task.trim()} onClick={runTask}>{busy?'…':<Send size={17}/>}</button></div></div></>:tab==='plan'?<div className="assistant-panel"><h3>Implementation plan</h3>{plan?<><p>{plan.summary}</p>{plan.architecture&&<div className="plan-detail"><b>Architecture</b><p>{plan.architecture}</p></div>}{plan.stack?.length>0&&<div className="plan-detail"><b>Recommended stack</b>{plan.stack.map((x,i)=><span className="plan-chip" key={i}>{x}</span>)}</div>}{plan.requirements?.length>0&&<div className="plan-detail"><b>Requirements</b>{plan.requirements.map((x,i)=><div className="plan-bullet" key={i}>• {x}</div>)}</div>}{plan.file_tree?.length>0&&<div className="plan-detail"><b>Proposed file tree</b>{plan.file_tree.map((x,i)=><code className="plan-tree-line" key={i}>{x}</code>)}</div>}{plan.acceptance_criteria?.length>0&&<div className="plan-detail"><b>Acceptance criteria</b>{plan.acceptance_criteria.map((x,i)=><div className="plan-bullet" key={i}>✓ {x}</div>)}</div>}{plan.risks?.length>0&&<div className="plan-detail"><b>Risks & assumptions</b>{plan.risks.map((x,i)=><div className="plan-bullet" key={i}>! {x}</div>)}</div>}{(plan.steps||[]).map((step,i)=><div className="plan-step" key={i}><span>{i+1}</span>{step}</div>)}<button className="primary-btn wide-btn" onClick={startPlanImplementation}><Rocket size={16}/> Start implementation</button></>:<div className="empty-state"><Command/><b>No plan yet</b><p>Describe what you want to build in Chat and the agent will prepare an implementation plan.</p><button className="secondary-btn" onClick={()=>setTab('agent')}>Open chat</button></div>}</div>:<div className="assistant-panel"><h3>Code review</h3><p className="muted-text">Run an independent review of the files currently in your project.</p><label>Review model</label><select className="full-select" value={reviewModel} onChange={e=>setReviewModel(e.target.value)}><option value={reviewModel}>{reviewModel}</option>{provider.models.filter(m=>m.id!==reviewModel).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="primary-btn wide-btn" onClick={doReview}><ShieldCheck size={16}/> Run code review</button>{review?.loading?<p>Review in progress…</p>:review?.error?<p className="error-text">{review.error}</p>:review&&<div className="review-result"><div className="review-score">{review.score}<small>/10</small></div><b>{review.summary}</b>{(review.findings||[]).map((f,i)=><div className="finding" key={i}><span className={'severity '+f.severity}>{f.severity}</span><b>{f.title}</b><p>{f.description}</p><small>{f.file||'Project-wide'}</small></div>)}</div>}</div>}
   </section>}

   {screen==='preview'&&<section className="page preview-page"><div className="page-heading compact"><div><div className="eyebrow">PROJECT OUTPUT</div><h1>Preview</h1><p>See your project as it comes together.</p></div><button className="icon-btn" onClick={()=>{setPreviewReport(null);setPreviewRevision(v=>v+1);flash('Re-running layout and accessibility checks…')}}><RefreshCw/></button></div><div className="preview-device"><div className="device-top"><span/><span/><span/></div>{(files['index.html']||files['public/index.html'])?<iframe key={previewRevision} ref={previewFrameRef} className="html-preview" title="Project preview" sandbox="allow-scripts" srcDoc={previewHtml}/>: <div className="preview-empty"><div className="preview-symbol"><Play/></div><h2>Runtime adapter required</h2><p>Website projects can use the HTML preview when an index.html file is available. Python, CLI and Android projects require an isolated runtime or build worker before execution.</p><button className="secondary-btn" onClick={()=>go('editor')}><Code2 size={15}/> Back to editor</button></div>}</div>{previewReport&&<div className="preview-audit"><div><b>Layout audit</b><span>{previewReport.controls} controls · {previewReport.issues.length} findings · {previewReport.viewport.width}×{previewReport.viewport.height}</span></div>{previewReport.issues.length===0?<p>No layout issues detected by the current DOM checks. This is not a screenshot-based visual review.</p>:previewReport.issues.slice(0,20).map((issue,i)=><div className="audit-issue" key={i}><b>{issue.type}</b><span>{issue.label}</span><small>{issue.detail}</small></div>)}<small>Automated DOM heuristics only. They do not replace screenshot review or runtime testing across devices.</small>{previewReport.issues.length>0&&<button className="secondary-btn" onClick={fixPreviewFindings}>Send findings to Coder</button>}</div>}<div className="preview-note"><Activity size={16}/><span>Preview status: <b>{previewHtml?'HTML sandbox loaded':'Runtime unavailable'}</b></span></div></section>}
  </main>

  <nav className="bottom-nav">
   <button className={screen==='projects'?'active':''} onClick={()=>go('projects')}><Home/><span>Projects</span></button>
   <button className={screen==='editor'?'active':''} onClick={()=>go('editor')}><Code2/><span>Editor</span></button>
   <button className={screen==='assistant'?'active':''} onClick={()=>go('assistant')}><Bot/><span>AI</span></button>
   <button className={screen==='preview'?'active':''} onClick={()=>go('preview')}><Eye/><span>Preview</span></button>
  </nav>

  {settings&&<div className="modal-scrim" onClick={()=>setSettings(false)}><section className="settings-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title"><div><div className="eyebrow">CONFIGURATION</div><h2>Settings & connections</h2></div><button className="icon-btn" onClick={()=>setSettings(false)}><X/></button></div><div className="settings-scroll"><div className="settings-group"><h3>AI provider</h3><label>Provider name</label><input value={provider.name} onChange={e=>setProvider(p=>({...p,name:e.target.value}))} placeholder="Provider name"/><label>API base URL</label><input value={provider.baseUrl} onChange={e=>setProvider(p=>({...p,baseUrl:e.target.value}))} placeholder="https://api.example.com/v1"/><label>API key</label><input type="password" autoComplete="off" value={provider.apiKey} onChange={e=>setProvider(p=>({...p,apiKey:e.target.value}))} placeholder="Paste your API key"/><label>Model</label><select value={model} onChange={e=>setModel(e.target.value)}><option value={model}>{model}</option>{provider.models.filter(m=>m.id!==model).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><label>Planner model</label><select value={plannerModel} onChange={e=>setPlannerModel(e.target.value)}><option value={plannerModel}>{plannerModel}</option>{provider.models.filter(m=>m.id!==plannerModel).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="secondary-btn full-btn" onClick={loadModels}><RefreshCw size={15}/> Load available models</button><button className="text-action" onClick={()=>setShowModelDetails(v=>!v)}>{showModelDetails?'Hide model details':'Show model details'}</button>{showModelDetails&&<div className="model-metadata"><input value={modelFilter} onChange={e=>setModelFilter(e.target.value)} placeholder="Filter model IDs"/>{provider.models.filter(m=>m.id.toLowerCase().includes(modelFilter.toLowerCase())).map(m=><div className="model-meta-row" key={m.id}><b>{m.id}</b><span>Context: {m.context_window||'Not provided'}</span><span>Input: {m.input_price??'Not provided'} · Output: {m.output_price??'Not provided'}</span><span>{modelTests[m.id]?.loading?'Testing…':modelTests[m.id]?.ok?'HTTP 200 · '+(modelTests[m.id].latency_ms??'')+' ms':modelTests[m.id]?'Failed · HTTP '+(modelTests[m.id].http_status??'network'):'Not tested'}</span>{modelTests[m.id]?.detail&&<small className="model-test-detail">{modelTests[m.id].detail}</small>}<button className="model-test-btn" disabled={!!modelTests[m.id]?.loading||!provider.apiKey} onClick={()=>testModel(m.id)}>Test</button></div>)}<small className="helper-text">Context, pricing and coding-test results are shown only when a provider supplies verified metadata. A successful HTTP response is not a coding benchmark.</small></div>}<small className="helper-text">On Android, provider and GitHub tokens are encrypted at rest with AES-GCM using an Android Keystore key. Browser preview keeps secrets in memory only.</small></div><div className="settings-group"><h3>Skills.md · Persistent instructions</h3><label>Project and design skills</label><textarea value={skills} onChange={e=>setSkills(e.target.value)} rows={7} placeholder="# My skills&#10;&#10;## Premium UI design&#10;- Use a consistent design system&#10;- Review spacing, contrast and responsive states&#10;&#10;## Architecture&#10;- Explain stack and file structure before coding"/><small className="helper-text">These instructions are attached to every coding request. Built-in skills are also stored in skills/skills.md.</small></div><div className="settings-group"><h3>Backend connection</h3><label>API server URL</label><input value={apiBase} onChange={e=>setApiBase(e.target.value)} placeholder="https://your-api.example.com"/><small className="helper-text">On a real phone, localhost points to the phone itself. Set this to your deployed backend URL.</small></div><div className="settings-group"><h3>GitHub</h3><label>Personal access token</label><input type="password" autoComplete="off" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="github_pat_…"/><label>New repository name or existing owner/name</label><input value={repoName} onChange={e=>setRepoName(e.target.value)} placeholder="my-project or owner/repository"/><button className="secondary-btn full-btn" onClick={importGitHubRepo}><Download size={15}/> Import existing repository</button><button className="secondary-btn full-btn" onClick={()=>{setSettings(false);publish()}}><Github size={15}/> Publish / update current project</button></div></div><button className="primary-btn save-settings" onClick={()=>{setSettings(false);flash('Settings saved')}}><Check size={16}/> Done</button></section></div>}

  <input ref={importRef} type="file" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  {notice&&<div className="toast"><Check size={15}/>{notice}</div>}
 </div>;
}
