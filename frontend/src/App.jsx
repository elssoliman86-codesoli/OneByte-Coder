import React,{useEffect,useMemo,useRef,useState} from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
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
 const importRef=useRef(null);
 const folderRef=useRef(null);
 const editorRef=useRef(null);
 const flash=s=>{setNotice(s);window.clearTimeout(flash.timer);flash.timer=window.setTimeout(()=>setNotice(''),2800)};
 useEffect(()=>{localStorage.setItem('onebyte.files',JSON.stringify(files))},[files]);
 useEffect(()=>{localStorage.setItem('onebyte.project',project)},[project]);
 useEffect(()=>{const {apiKey,...safe}=provider;sessionStorage.setItem('onebyte.provider',JSON.stringify(safe))},[provider]);
 const fileList=useMemo(()=>Object.keys(files).sort((a,b)=>a.localeCompare(b)),[files]);
 const activeContent=files[selected]||'';
 function newProject(){const name=window.prompt('Project name');if(!name?.trim())return;setProject(name.trim());setFiles(starterFiles);setSelected('src/App.jsx');setPlan(null);setReview(null);setScreen('editor');setDrawer(false)}
 function addFile(){const path=window.prompt('New file path (example: src/main.py)');if(!path?.trim())return;const clean=path.trim().replace(/^\/+/, '');if(clean.split('/').includes('..'))return flash('Invalid file path');setFiles(f=>({...f,[clean]:f[clean]||''}));setSelected(clean);setScreen('editor');setDrawer(false)}
 async function importFiles(list){const next={...files};try{for(const file of Array.from(list||[])){if(file.name.toLowerCase().endsWith('.zip')){const zip=await JSZip.loadAsync(file);for(const [path,item] of Object.entries(zip.files)){if(!item.dir&&!path.split('/').includes('..')){const value=await item.async('string');if(value.length<500000)next[path]=value}}}else if(file.size<500000){next[file.webkitRelativePath||file.name]=await file.text()}}setFiles(next);const first=Object.keys(next).find(p=>p!==selected);if(first)setSelected(first);setScreen('editor');setDrawer(false);flash('Project files imported')}catch(e){flash('Import failed: '+e.message)}}
 async function loadModels(){if(!provider.apiKey)return flash('Enter your provider API key');try{const r=await fetch(apiBase+'/api/providers/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Could not load models');setProvider(p=>({...p,models:d.models||[]}));if(d.models?.[0])setModel(d.models[0].id);flash('Model list refreshed')}catch(e){flash(e.message)}}
 async function runTask(){if(!task.trim()||busy)return;if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}setBusy(true);const prompt=task.trim();setLogs(l=>[...l,{role:'user',text:prompt}]);setTask('');setScreen('assistant');try{const r=await fetch(apiBase+'/api/agent/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model,task:prompt,project:{name:project,description:projectKind,files},skills:''})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Agent request failed');if(d.files&&Object.keys(d.files).length){setFiles(f=>({...f,...d.files}));setSelected(Object.keys(d.files)[0])}setPlan(d.plan);setLogs(l=>[...l,{role:'assistant',text:d.summary||'Changes generated.'}]);flash('AI response received')}catch(e){setLogs(l=>[...l,{role:'error',text:e.message}]);flash(e.message)}finally{setBusy(false)}}
 async function doReview(){if(!provider.apiKey){setSettings(true);return flash('Connect an AI provider first')}setReview({loading:true});try{const r=await fetch(apiBase+'/api/agent/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:provider.baseUrl,api_key:provider.apiKey,model:reviewModel,project:{name:project,description:projectKind,files}})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Review failed');setReview(d)}catch(e){setReview({error:e.message})}}
 async function publish(){if(!githubToken){setSettings(true);return flash('Add a GitHub token in Settings')}try{const r=await fetch(apiBase+'/api/github/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:githubToken,repo_name:repoName,description:project,files})});const d=await r.json();if(!r.ok)throw Error(d.detail||'GitHub publish failed');flash('Published successfully');setLogs(l=>[...l,{role:'assistant',text:'GitHub repository: '+d.repository}])}catch(e){flash(e.message)}}
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
    <div className="project-card current-project" onClick={()=>go('editor')}><div className="project-card-icon"><Code2/></div><div className="project-card-info"><span className="card-kicker">CURRENT PROJECT</span><h2>{project}</h2><p>{projectKind} · {fileList.length} files</p></div><ChevronRight className="card-arrow"/></div>
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
    {tab==='agent'?<><div className="chat-feed">{logs.map((entry,i)=>typeof entry==='string'?<div className="chat-message system" key={i}>{entry}</div>:<div className={'chat-message '+entry.role} key={i}><span className="message-role">{entry.role==='user'?'YOU':entry.role==='error'?'ERROR':'ONEBYTE AI'}</span><p>{entry.text}</p></div>)}{busy&&<div className="chat-message assistant"><span className="typing"><i/><i/><i/></span> Working on your request…</div>}</div><div className="chat-composer"><textarea value={task} onChange={e=>setTask(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();runTask()}}} placeholder="Ask OneByte to build or change something…" rows={2}/><div className="composer-bottom"><span>Enter to send · Shift + Enter for new line</span><button className="send-btn" disabled={busy||!task.trim()} onClick={runTask}>{busy?'…':<Send size={17}/>}</button></div></div></>:tab==='plan'?<div className="assistant-panel"><h3>Implementation plan</h3>{plan?<><p>{plan.summary}</p>{(plan.steps||[]).map((step,i)=><div className="plan-step" key={i}><span>{i+1}</span>{step}</div>)}</>:<div className="empty-state"><Command/><b>No plan yet</b><p>Describe what you want to build in Chat and the agent will prepare an implementation plan.</p><button className="secondary-btn" onClick={()=>setTab('agent')}>Open chat</button></div>}</div>:<div className="assistant-panel"><h3>Code review</h3><p className="muted-text">Run an independent review of the files currently in your project.</p><label>Review model</label><select className="full-select" value={reviewModel} onChange={e=>setReviewModel(e.target.value)}><option value={reviewModel}>{reviewModel}</option>{provider.models.filter(m=>m.id!==reviewModel).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="primary-btn wide-btn" onClick={doReview}><ShieldCheck size={16}/> Run code review</button>{review?.loading?<p>Review in progress…</p>:review?.error?<p className="error-text">{review.error}</p>:review&&<div className="review-result"><div className="review-score">{review.score}<small>/10</small></div><b>{review.summary}</b>{(review.findings||[]).map((f,i)=><div className="finding" key={i}><span className={'severity '+f.severity}>{f.severity}</span><b>{f.title}</b><p>{f.description}</p><small>{f.file||'Project-wide'}</small></div>)}</div>}</div>}
   </section>}

   {screen==='preview'&&<section className="page preview-page"><div className="page-heading compact"><div><div className="eyebrow">PROJECT OUTPUT</div><h1>Preview</h1><p>See your project as it comes together.</p></div><button className="icon-btn" onClick={()=>flash('Runtime is not configured yet')}><RefreshCw/></button></div><div className="preview-device"><div className="device-top"><span/><span/><span/></div><div className="preview-empty"><div className="preview-symbol"><Play/></div><h2>Preview is not connected</h2><p>A live preview needs a project runtime. The editor and AI tools are available now; runtime execution is a separate integration.</p><button className="secondary-btn" onClick={()=>go('editor')}><Code2 size={15}/> Back to editor</button></div></div><div className="preview-note"><Activity size={16}/><span>Preview status: <b>Not running</b></span></div></section>}
  </main>

  <nav className="bottom-nav">
   <button className={screen==='projects'?'active':''} onClick={()=>go('projects')}><Home/><span>Projects</span></button>
   <button className={screen==='editor'?'active':''} onClick={()=>go('editor')}><Code2/><span>Editor</span></button>
   <button className={screen==='assistant'?'active':''} onClick={()=>go('assistant')}><Bot/><span>AI</span></button>
   <button className={screen==='preview'?'active':''} onClick={()=>go('preview')}><Eye/><span>Preview</span></button>
  </nav>

  {settings&&<div className="modal-scrim" onClick={()=>setSettings(false)}><section className="settings-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title"><div><div className="eyebrow">CONFIGURATION</div><h2>Settings & connections</h2></div><button className="icon-btn" onClick={()=>setSettings(false)}><X/></button></div><div className="settings-scroll"><div className="settings-group"><h3>AI provider</h3><label>Provider name</label><input value={provider.name} onChange={e=>setProvider(p=>({...p,name:e.target.value}))} placeholder="Provider name"/><label>API base URL</label><input value={provider.baseUrl} onChange={e=>setProvider(p=>({...p,baseUrl:e.target.value}))} placeholder="https://api.example.com/v1"/><label>API key</label><input type="password" autoComplete="off" value={provider.apiKey} onChange={e=>setProvider(p=>({...p,apiKey:e.target.value}))} placeholder="Paste your API key"/><label>Model</label><select value={model} onChange={e=>setModel(e.target.value)}><option value={model}>{model}</option>{provider.models.filter(m=>m.id!==model).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><button className="secondary-btn full-btn" onClick={loadModels}><RefreshCw size={15}/> Load available models</button><small className="helper-text">API keys are kept in this app session and are not saved to project files.</small></div><div className="settings-group"><h3>Backend connection</h3><label>API server URL</label><input value={apiBase} onChange={e=>setApiBase(e.target.value)} placeholder="https://your-api.example.com"/><small className="helper-text">On a real phone, localhost points to the phone itself. Set this to your deployed backend URL.</small></div><div className="settings-group"><h3>GitHub</h3><label>Personal access token</label><input type="password" autoComplete="off" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="github_pat_…"/><label>Repository name</label><input value={repoName} onChange={e=>setRepoName(e.target.value)} placeholder="my-project"/><button className="secondary-btn full-btn" onClick={()=>{setSettings(false);publish()}}><Github size={15}/> Publish current project</button></div></div><button className="primary-btn save-settings" onClick={()=>{setSettings(false);flash('Settings applied for this session')}}><Check size={16}/> Done</button></section></div>}

  <input ref={importRef} type="file" accept=".zip,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.java,.kt,.c,.cpp,.go,.rs,.sql" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value=''}}/>
  {notice&&<div className="toast"><Check size={15}/>{notice}</div>}
 </div>;
}
