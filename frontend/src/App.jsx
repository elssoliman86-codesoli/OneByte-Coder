import React,{useEffect,useMemo,useRef,useState} from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import builtInSkills from '../../skills/skills.md?raw';
import {Activity,ArrowLeft,Bot,Check,ChevronDown,ChevronRight,Code2,Command,Eye,File,FileCode,Folder,FolderPlus,Github,Home,Menu,MessageSquare,MoreHorizontal,Play,Plus,RefreshCw,Rocket,Send,Settings,ShieldCheck,Smartphone,Terminal,Upload,X} from 'lucide-react';

const DEFAULT_API=import.meta.env.VITE_API_BASE||'http://localhost:8000';
const starterFiles={
 'src/App.jsx':"export default function App(){\n  return (\n    <main>\n      <h1>Hello, OneByte</h1>\n      <p>Your next project starts here.</p>\n    </main>\n  );\n}\n",
 'src/styles.css':'* { box-sizing: border-box; }\nbody { margin: 0; font-family: sans-serif; }\n',
 'index.html':'<!doctype html>\n<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n'
};
const initialProvider={name:'OpenAI Compatible',baseUrl:'https://api.openai.com/v1',apiKey:'',models:[]};
const languageFor=p=>({jsx:'javascript',tsx:'typescript',js:'javascript',ts:'typescript',py:'python',html:'html',css:'css',json:'json',md:'markdown',xml:'xml',sh:'shell',yml:'yaml',yaml:'yaml',java:'java',kt:'kotlin',cpp:'cpp',c:'c',rs:'rust',go:'go',sql:'sql'}[p.split('.').pop()?.toLowerCase()]||'plaintext');

export default function App(){
 const [files,setFiles]=useState(()=>{try{return JSON.parse(localStorage.getItem('onebyte.files'))||starterFiles}catch{return starterFiles}});
 const [selected,setSelected]=useState('src/App.jsx');
 const [screen,setScreen]=useState('projects');
 const [drawer,setDrawer]=useState(false);
 const [settings,setSettings]=useState(false);
 const [provider,setProvider]=useState(()=>{try{return {...initialProvider,...JSON.parse(sessionStorage.getItem('onebyte.provider'))}}catch{return initialProvider}});
 const [model,setModel]=useState('gpt-4.1-mini');
 const [plannerModel,setPlannerModel]=useState('gpt-4.1-mini');
 const [reviewModel,setReviewModel]=useState('gpt-4.1-mini');
 const [apiBase,setApiBase]=useState(DEFAULT_API);
 const [githubToken,setGithubToken]=useState('');
 const [repoName,setRepoName]=useState('onebyte-project');
 const [project,setProject]=useState(()=>localStorage.getItem('onebyte.project')||'My first project');
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
 const [queue,setQueue]=useState([]);
 const [queueBusy,setQueueBusy]=useState(false);
 const [skills,setSkills]=useState(()=>localStorage.getItem('onebyte.skills')||builtInSkills);
 const [modelFilter,setModelFilter]=useState('');
 const [showModelDetails,setShowModelDetails]=useState(false);
 const importRef=useRef(null);
 const folderRef=useRef(null);
 const editorRef=useRef(null);
 const flash=s=>{setNotice(s);window.clearTimeout(flash.timer);flash.timer=window.setTimeout(()=>setNotice(''),2800)};
 useEffect(()=>{localStorage.setItem('onebyte.files',JSON.stringify(files))},[files]);
 useEffect(()=>{localStorage.setItem('onebyte.project',project)},[project]);
 useEffect(()=>{setProjects(ps=>{const record={id:activeProjectId,name:project,kind:projectKind,files};const next=ps.some(p=>p.id===activeProjectId)?ps.map(p=>p.id===activeProjectId?record:p):[record,...ps];localStorage.setItem('onebyte.projects',JSON.stringify(next));return next})},[files,project,projectKind,activeProjectId]);
 useEffect(()=>{localStorage.setItem('onebyte.activeProject',activeProjectId)},[activeProjectId]);
 useEffect(()=>{localStorage.setItem('onebyte.skills',skills)},[skills]);
 useEffect(()=>{const {apiKey,...safe}=provider;sessionStorage.setItem('onebyte.provider',JSON.stringify(safe))},[provider]);
 const fileList=useMemo(()=>Object.keys(files).sort((a,b)=>a.localeCompare(b)),[files]);
 const activeContent=files[selected]||'';
 async function switchProject(p){setActiveProjectId(p.id);setProject(p.name);setProjectKind(p.kind||'Web app');setFiles(p.files||starterFiles);setSelected(Object.keys(p.files||starterFiles)[0]||'');setPlan(null);setReview(null);go('editor')}
 async function newProject(){const name=window.prompt('Project name');if(!name?.trim())return;const description=window.prompt('Describe the project and its required features');if(!description?.trim())return flash('A project description is required');if(!provider.apiKey){setSettings(true);return flash('Connect a planner model first')}setActiveProjectId(crypto.randomUUID());setProject(name.trim());setFiles(starterFiles);setSelected('src/App.jsx');setPlan(null);setReview(null);setScreen('assistant');setTab('plan');setLogs([{role:'assistant',text:'Analyzing your project brief and preparing the architecture…'}]);try{const r=await fetch(apiBase+'/api/agent/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:plannerModel||model,name:name.trim(),description,kind:projectKind,files:{}})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Planning failed');setPlan(d.plan);setLogs(l=>[...l,{role:'assistant',text:d.summary||'Project plan is ready.'}]);flash('Project analyzed and plan created')}catch(e){setLogs(l=>[...l,{role:'error',text:e.message}]);flash(e.message)}}
 function addFile(){const path=window.prompt('New file path (example: src/main.py)');if(!path?.trim())return;const clean=path.trim().replace(/^\/+/, '');if(clean.split('/').includes('..'))return flash('Invalid file path');setFiles(f=>({...f,[clean]:f[clean]||''}));setSelected(clean);setScreen('editor');setDrawer(false)}
 async function importFiles(list){const next={...files};try{for(const file of Array.from(list||[])){if(file.name.toLowerCase().endsWith('.zip')){const zip=await JSZip.loadAsync(file);for(const [path,item] of Object.entries(zip.files)){if(!item.dir&&!path.split('/').includes('..')){const value=await item.async('string');if(value.length<500000)next[path]=value}}}else if(file.size<500000){next[file.webkitRelativePath||file.name]=await file.text()}}setFiles(next);const first=Object.keys(next).find(p=>p!==selected);if(first)setSelected(first);setScreen('editor');setDrawer(false);flash('Project files imported')}catch(e){flash('Import failed: '+e.message)}}
 async function loadModels(){if(!provider.apiKey)return flash('Enter your provider API key');try{const r=await fetch(apiBase+'/api/providers/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Could not load models');setProvider(p=>({...p,models:d.models||[]}));if(d.models?.[0]){setModel(d.models[0].id);setPlannerModel(d.models[0].id);setReviewModel(d.models[0].id)}flash('Model list refreshed')}catch(e){flash(e.message)}}
 async function runTask(){if(!task.trim())return;if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}const prompt=task.trim();setQueue(q=>[...q,{id:Date.now()+Math.random(),text:prompt,status:'queued'}]);setLogs(l=>[...l,{role:'user',text:prompt}]);setTask('');setScreen('assistant');flash('Added to implementation queue')}
 async function executeStreaming(next){
  const response=await fetch(apiBase+'/api/agent/execute/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model,task:next.text,project:{name:project,description:projectKind,files},skills})});
  if(!response.ok){let detail='Streaming request failed';try{detail=(await response.json()).detail||detail}catch{}throw Error(detail)}
  if(!response.body)throw Error('This browser does not support streaming responses');
  const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let summary='';let completed=false;
  const handle=line=>{if(!line.trim())return;let event;try{event=JSON.parse(line)}catch{return}
   if(event.type==='summary_delta'){summary+=event.text||''}
   else if(event.type==='file_start'){setReview(null);setSelected(event.path);setFiles(prev=>({...prev,[event.path]:''}));setScreen('editor');setLogs(l=>[...l,{role:'assistant',text:'Writing '+event.path+' …'}])}
   else if(event.type==='file_delta'){setFiles(prev=>({...prev,[event.path]:(prev[event.path]||'')+(event.text||'')}))}
   else if(event.type==='file_end'){setSelected(event.path);setLogs(l=>[...l,{role:'assistant',text:'Finished '+event.path}])}
   else if(event.type==='error'){throw Error(event.message||'AI streaming failed')}
   else if(event.type==='done'){completed=true;setLogs(l=>[...l,{role:'assistant',text:event.summary||summary||'Code generation completed.'}]);setTab('agent');flash('Live code generation completed')}
  };
  try{while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\\n');pending=lines.pop()||'';for(const line of lines)handle(line)}pending+=decoder.decode();if(pending.trim())handle(pending)}
  finally{reader.releaseLock()}
  if(!completed)throw Error('The model stream ended before the completion event. Check the generated files and retry if needed.');
 }
 useEffect(()=>{const next=queue.find(q=>q.status==='queued');if(!next||queueBusy||!provider.apiKey)return;setQueueBusy(true);setBusy(true);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'running'}:x));(async()=>{try{await executeStreaming(next);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'done'}:x));flash('AI response received')}catch(e){setLogs(l=>[...l,{role:'error',text:e.message}]);setQueue(q=>q.map(x=>x.id===next.id?{...x,status:'failed',error:e.message}:x));flash(e.message)}finally{setBusy(false);setQueueBusy(false)}})()},[queue,queueBusy,provider.apiKey,provider.baseUrl,apiBase,model,project,projectKind,files,skills]);
 async function doReview(){if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}setReview({loading:true});try{const r=await fetch(apiBase+'/api/agent/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:reviewModel,project:{name:project,description:projectKind,files}})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Review failed');setReview(d)}catch(e){setReview({error:e.message})}}
 async function publish(){if(!githubToken){setSettings(true);return flash('Add a GitHub token in Settings')}if(!review||review.error||review.loading){setTab('review');setScreen('assistant');return flash('Run the expert review before publishing')}if(review.score<10||(review.findings||[]).some(f=>f.severity==='high')){setTab('review');setScreen('assistant');return flash('The expert review must reach 10/10 with no high-severity findings before publishing')}try{const r=await fetch(apiBase+'/api/github/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:githubToken,repo_name:repoName,description:project,files})});const d=await r.json();if(!r.ok)throw Error(d.detail||'GitHub publish failed');flash('Published successfully');setLogs(l=>[...l,{role:'assistant',text:'GitHub repository: '+d.repository}])}catch(e){flash(e.message)}}
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
   <div className="drawer-files">{fileList.map(path=><button key={path} className={'drawer-file '+(path===selected?'chosen':'')} onClick={()=>{setSelected(path);go('editor')}}><FileCode size={15}/><span>{path}</span></button>)}</div>
   <button className="drawer-link" onClick={openImport}><Upload/>Import files / ZIP</button>
   <button className="drawer-link" onClick={()=>folderRef.current?.click()}><FolderPlus/>Import folder</button>
   <div className="drawer-bottom"><button className="drawer-link" onClick={()=>{setSettings(true);setDrawer(false)}}><Settings/>Settings & connections</button><div className="connection-state"><span className={provider.apiKey?'online-dot':'offline-dot'}/>{provider.apiKey?'AI provider connected':'AI provider not connected'}</div></div>
  </aside></div>}

  <main className="main-content">
   {screen==='projects'&&<section className="page projects-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Projects</h1><p>Pick up where you left off or start something new.</p></div><button className="primary-btn" onClick={newProject}><Plus size={17}/> New</button></div>
    <div className='project-list'>{projects.map(p=><button className='project-card current-project' key={p.id} onClick={()=>switchProject(p)}><div className='project-card-icon'><Code2/></div><div className='project-card-info'><span className='card-kicker'>{p.id===activeProjectId?'ACTIVE PROJECT':'PROJECT'}</span><h2>{p.name}</h2><p>{p.kind||'Project'} · {Object.keys(p.files||{}).length} files · {languageFor(Object.keys(p.files||{})[0]||'')}</p></div><ChevronRight className='card-arrow'/></button>)}</div>
    <div className="section-heading"><h3>Quick start</h3></div>
    <div className="quick-grid"><button className="quick-card" onClick={()=>{setProjectKind('Web app');go('editor')}}><span className="quick-icon blue"><Code2/></span><b>Web app</b><small>HTML, CSS, JavaScript</small></button><button className="quick-card" onClick={()=>{setProjectKind('Python');go('editor')}}><span className="quick-icon green"><Terminal/></span><b>Python project</b><small>Scripts and tools</small></button><button className="quick-card" onClick={openImport}><span className="quick-icon purple"><Upload/></span><b>Import project</b><small>ZIP or source files</small></button><button className="quick-card" onClick={()=>{setSettings(true)}}><span className="quick-icon amber"><Bot/></span><b>Connect AI</b><small>Choose your model</small></button></div>
    <div className="tip-card"><div className="tip-icon"><Smartphone/></div><div><b>Built for coding on the go</b><p>Your workspace, files and editor are arranged for a phone screen.</p></div></div>
   </section>}

   {screen==='editor'&&<section className="editor-page">
    <div className="editor-toolbar"><button className="tool-pill" onClick={()=>setDrawer(true)}><Folder size={15}/> Files <span className="count">{fileList.length}</span></button><div className="editor-actions"><button className="icon-btn" onClick={addFile} aria-label="New file"><Plus/></button><button className="icon-btn" onClick={()=>go('preview')} aria-label="Preview"><Play/></button><button className="icon-btn" onClick={publish} aria-label="Publish to GitHub"><Github/></button></div></div>
    <button className="file-tab" onClick={()=>setShowFilePicker(v=>!v)}><FileCode size={15}/><span>{selected}</span><ChevronDown size={14}/><span className="tab-spacer"/><span className="language-label">{languageFor(selected)}</span></button>
    {showFilePicker&&<div className="file-picker">{fileList.map(path=><button key={path} onClick={()=>{setSelected(path);setShowFilePicker(false)}}><FileCode size={14}/>{path}</button>)}</div>}
    <div className="editor-canvas"><Editor height="100%" theme="vs-dark" language={languageFor(selected)} path={selected} value={activeContent} onChange={v=>setFiles(f=>({...f,[selected]:v??''}))} onMount={editor=>{editorRef.current=editor}} options={{minimap:{enabled:false},fontSize:14,automaticLayout:true,wordWrap:'on',scrollBeyondLastLine:false,padding:{top:16,bottom:20},lineNumbers:'on',glyphMargin:false,folding:true,renderLineHighlight:'line',overviewRulerLanes:0,contextmenu:true,quickSuggestions:true,tabSize:2,scrollbar:{horizontalScrollbarSize:6,verticalScrollbarSize:6},stickyScroll:{enabled:false},readOnly:false}}/></div>
    <div className="editor-status"><span><span className="online-dot"/> Ready</span><span>{languageFor(selected).toUpperCase()}</span><span>{activeContent.split('\n').length} lines</span></div>
   </section>}

   {screen==='assistant'&&<section className="page assistant-page">
    <div className="page-heading compact"><div><div className="eyebrow">AI WORKSPACE</div><h1>Assistant</h1><p>Plan, build and review your project.</p></div><button className="model-chip" onClick={()=>setSettings(true)}><Bot size={14}/>{model}<ChevronDown size={13}/></button></div>
    <div className="assistant-tabs"><button className={tab==='agent'?'selected':''} onClick={()=>setTab('agent')}><MessageSquare size={15}/> Chat</button><button className={tab==='plan'?'selected':''} onClick={()=>setTab('plan')}><Command size={15}/> Plan</button><button className={tab==='review'?'selected':''} onClick={()=>setTab('review')}><ShieldCheck size={15}/> Review</button></div>
    {tab==='agent'?<><div className="chat-feed">{logs.map((entry,i)=>typeof entry==='string'?<div className="chat-message system" key={i}>{entry}</div>:<div className={'chat-message '+entry.role} key={i}><span className="message-role">{entry.role==='user'?'YOU':entry.role==='error'?'ERROR':'ONEBYTE AI'}</span><p>{entry.text}</p></div>)}{busy&&<div className="chat-message assistant"><span className="typing"><i/><i/><i/></span> Working on your request…</div>}</div><div className="queue-card"><div className="queue-card-head"><b>Implementation queue</b><span>{queue.filter(q=>q.status==='queued').length} waiting · {queue.filter(q=>q.status==='done').length} completed</span></div>{queue.map(q=><div className="queue-row" key={q.id}><span className={'queue-status '+q.status}>{q.status==='done'?'✓':q.status==='running'?'…':q.status==='failed'?'!':'○'}</span><span>{q.text}</span>{q.error&&<small>{q.error}</small>}<button onClick={()=>setQueue(items=>items.filter(x=>x.id!==q.id))}><X size={13}/></button></div>)}</div><div className="chat-composer"><textarea value={task} onChange={e=>setTask(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();runTask()}}} placeholder="Ask OneByte to build or change something…" rows={2}/><div className="composer-bottom"><span>Enter to send · Shift + Enter for new line</span><button className="send-btn" disabled={busy||!task.trim()} onClick={runTask}>{busy?'…':<Send size={17}/>}</button></div></div></>:tab==='plan'?<div className="assistant-panel"><h3>Implementation plan</h3>{plan?<><p>{plan.summary}</p>{plan.architecture&&<div className="plan-detail"><b>Architecture</b><p>{plan.architecture}</p></div>}{plan.stack?.length>0&&<div className="plan-detail"><b>Recommended stack</b>{plan.stack.map((x,i)=><span className="plan-chip" key={i}>{x}</span>)}</div>}{plan.requirements?.length>0&&<div className="plan-detail"><b>Requirements</b>{plan.requirements.map((x,i)=><div className="plan-bullet" key={i}>• {x}</div>)}</div>}{plan.file_tree?.length>0&&<div className="plan-detail"><b>Proposed file tree</b>{plan.file_tree.map((x,i)=><code className="plan-tree-line" key={i}>{x}</code>)}</div>}{plan.acceptance_criteria?.length>0&&<div className="plan-detail"><b>Acceptance criteria</b>{plan.acceptance_criteria.map((x,i)=><div className="plan-bullet" key={i}>✓ {x}</div>)}</div>}{plan.risks?.length>0&&<div className="plan-detail"><b>Risks & assumptions</b>{plan.risks.map((x,i)=><div className="plan-bullet" key={i}>! {x}</div>)}</div>}{(plan.steps||[]).map((step,i)=><div className="plan-step" key={i}><span>{i+1}</span>{step}</div>)}</>:<div className="empty-state"><Command/><b>No plan yet</b><p>Describe what you want to build in Chat and the agent will prepare an implementation plan.</p><button className="secondary-btn" onClick={()=>setTab('agent')}>Open chat</button></div>}</div>:<div className="assistant-panel"><h3>Code review</h3><p className="muted-text">Run an independent review of the files currently in your project.</p><label>Review model</label><select className="full-select" value={reviewModel} onChange={e=>setReviewModel(e.target.value)}><option value={reviewModel}>{reviewModel}</option>{provider.models.filter(m=>m.id!==reviewModel).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="primary-btn wide-btn" onClick={doReview}><ShieldCheck size={16}/> Run code review</button>{review?.loading?<p>Review in progress…</p>:review?.error?<p className="error-text">{review.error}</p>:review&&<div className="review-result"><div className="review-score">{review.score}<small>/10</small></div><b>{review.summary}</b>{(review.findings||[]).map((f,i)=><div className="finding" key={i}><span className={'severity '+f.severity}>{f.severity}</span><b>{f.title}</b><p>{f.description}</p><small>{f.file||'Project-wide'}</small></div>)}</div>}</div>}
   </section>}

   {screen==='preview'&&<section className="page preview-page"><div className="page-heading compact"><div><div className="eyebrow">PROJECT OUTPUT</div><h1>Preview</h1><p>See your project as it comes together.</p></div><button className="icon-btn" onClick={()=>flash('Runtime is not configured yet')}><RefreshCw/></button></div><div className="preview-device"><div className="device-top"><span/><span/><span/></div>{(files['index.html']||files['public/index.html'])?<iframe className="html-preview" title="Project preview" sandbox="allow-scripts" srcDoc={files['index.html']||files['public/index.html']}/>: <div className="preview-empty"><div className="preview-symbol"><Play/></div><h2>Runtime adapter required</h2><p>Website projects can use the HTML preview when an index.html file is available. Python, CLI and Android projects require an isolated runtime or build worker before execution.</p><button className="secondary-btn" onClick={()=>go('editor')}><Code2 size={15}/> Back to editor</button></div>}</div><div className="preview-note"><Activity size={16}/><span>Preview status: <b>Not running</b></span></div></section>}
  </main>

  <nav className="bottom-nav">
   <button className={screen==='projects'?'active':''} onClick={()=>go('projects')}><Home/><span>Projects</span></button>
   <button className={screen==='editor'?'active':''} onClick={()=>go('editor')}><Code2/><span>Editor</span></button>
   <button className={screen==='assistant'?'active':''} onClick={()=>go('assistant')}><Bot/><span>AI</span></button>
   <button className={screen==='preview'?'active':''} onClick={()=>go('preview')}><Eye/><span>Preview</span></button>
  </nav>

  {settings&&<div className="modal-scrim" onClick={()=>setSettings(false)}><section className="settings-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title"><div><div className="eyebrow">CONFIGURATION</div><h2>Settings & connections</h2></div><button className="icon-btn" onClick={()=>setSettings(false)}><X/></button></div><div className="settings-scroll"><div className="settings-group"><h3>AI provider</h3><label>Provider name</label><input value={provider.name} onChange={e=>setProvider(p=>({...p,name:e.target.value}))} placeholder="Provider name"/><label>API base URL</label><input value={provider.baseUrl} onChange={e=>setProvider(p=>({...p,baseUrl:e.target.value}))} placeholder="https://api.example.com/v1"/><label>API key</label><input type="password" autoComplete="off" value={provider.apiKey} onChange={e=>setProvider(p=>({...p,apiKey:e.target.value}))} placeholder="Paste your API key"/><label>Model</label><select value={model} onChange={e=>setModel(e.target.value)}><option value={model}>{model}</option>{provider.models.filter(m=>m.id!==model).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><label>Planner model</label><select value={plannerModel} onChange={e=>setPlannerModel(e.target.value)}><option value={plannerModel}>{plannerModel}</option>{provider.models.filter(m=>m.id!==plannerModel).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="secondary-btn full-btn" onClick={loadModels}><RefreshCw size={15}/> Load available models</button><button className="text-action" onClick={()=>setShowModelDetails(v=>!v)}>{showModelDetails?'Hide model details':'Show model details'}</button>{showModelDetails&&<div className="model-metadata"><input value={modelFilter} onChange={e=>setModelFilter(e.target.value)} placeholder="Filter model IDs"/>{provider.models.filter(m=>m.id.toLowerCase().includes(modelFilter.toLowerCase())).map(m=><div className="model-meta-row" key={m.id}><b>{m.id}</b><span>Context: {m.context_window||'Not provided'}</span><span>Input: {m.input_price??'Not provided'} · Output: {m.output_price??'Not provided'}</span><span>HTTP 200: Not tested</span></div>)}<small className="helper-text">Context, pricing and coding-test results are shown only when a provider supplies verified metadata. A successful HTTP response is not a coding benchmark.</small></div>}<small className="helper-text">API keys are kept in this app session and are not saved to project files.</small></div><div className="settings-group"><h3>Skills.md · Persistent instructions</h3><label>Project and design skills</label><textarea value={skills} onChange={e=>setSkills(e.target.value)} rows={7} placeholder="# My skills&#10;&#10;## Premium UI design&#10;- Use a consistent design system&#10;- Review spacing, contrast and responsive states&#10;&#10;## Architecture&#10;- Explain stack and file structure before coding"/><small className="helper-text">These instructions are attached to every coding request. Built-in skills are also stored in skills/skills.md.</small></div><div className="settings-group"><h3>Backend connection</h3><label>API server URL</label><input value={apiBase} onChange={e=>setApiBase(e.target.value)} placeholder="https://your-api.example.com"/><small className="helper-text">On a real phone, localhost points to the phone itself. Set this to your deployed backend URL.</small></div><div className="settings-group"><h3>GitHub</h3><label>Personal access token</label><input type="password" autoComplete="off" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="github_pat_…"/><label>Repository name</label><input value={repoName} onChange={e=>setRepoName(e.target.value)} placeholder="my-project"/><button className="secondary-btn full-btn" onClick={()=>{setSettings(false);publish()}}><Github size={15}/> Publish current project</button></div></div><button className="primary-btn save-settings" onClick={()=>{setSettings(false);flash('Settings applied for this session')}}><Check size={16}/> Done</button></section></div>}

  <input ref={importRef} type="file" accept=".zip,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.java,.kt,.c,.cpp,.go,.rs,.sql" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  {notice&&<div className="toast"><Check size={15}/>{notice}</div>}
 </div>;
}
