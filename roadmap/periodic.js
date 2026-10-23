const $=id=>document.getElementById(id);

const groups=[
  {key:'MB',prefix:'MB',title:'1. Many-Body Core'},
  {key:'SOL',prefix:'S',title:'2. Solvers & Numerical Engine'},
  {key:'PHY',prefix:'P',title:'3. Hamiltonian & Physics'},
  {key:'SPEC',prefix:'X',title:'4. Spectroscopy & Response'},
  {key:'MAT',prefix:'M',title:'5. Cluster, Tight Binding & Material Models'},
  {key:'DYN',prefix:'D',title:'6. Density, Mean Field & Dynamics'},
  {key:'RUN',prefix:'R',title:'7. Runtime & Typed Model API'},
  {key:'VAL',prefix:'V',title:'8. Validation & Quanty Parity'},
  {key:'UX',prefix:'U',title:'9. User & Product Layer'}
];

const levels=[
  {n:1,title:'Primitives & Foundations',desc:'Core data structures and basic operations'},
  {n:2,title:'Core Computation & Semantics',desc:'Essential algorithms, semantics and building blocks'},
  {n:3,title:'Domain Physics & Methods',desc:'Domain-specific scientific capabilities'},
  {n:4,title:'Integrated Capabilities',desc:'Composed models, responses and coupled physics'},
  {n:5,title:'Verification & Evidence',desc:'Parity, convergence, evidence and benchmarking'},
  {n:6,title:'Operational & Scale',desc:'Production execution, HPC, GPU and automation'},
  {n:7,title:'Product & Ecosystem',desc:'User-facing APIs, workflows and applications'}
];

let frames=[],i=0,timer=null,previousNodes=null,mode='ladder';
let details={domains:{},capabilities:{}},descriptions={},pythonApi={},pythonExamples={},apiSpecs={apis:{},capabilities:{}};

function parseMmd(src){
  const nodes={};
  for(const line of src.split(/\r?\n/)){
    const m=line.match(/^\s*([A-Z]+\d+)\["(.+?)"\]\s*$/);
    if(!m) continue;
    const raw=m[2];
    const emoji=raw.match(/^(🟢|🟡|🟠|⚪)\s*/)?.[1]||'';
    const status=emoji==='🟢'?'done':emoji==='🟡'?'partial':emoji==='🟠'?'early':'todo';
    nodes[m[1]]={id:m[1],raw,label:raw.replace(/^(🟢|🟡|🟠|⚪)\s*/,''),emoji,status};
  }
  return nodes;
}

function groupNodes(nodes,g){
  const rx=new RegExp('^'+g.prefix+'\\d+$');
  return Object.values(nodes).filter(n=>rx.test(n.id)).sort((a,b)=>parseInt(a.id.match(/\d+/)[0])-parseInt(b.id.match(/\d+/)[0]));
}
function changed(n){if(!previousNodes)return false;const p=previousNodes[n.id];return !p||p.raw!==n.raw}
function cleanLabel(s){return s.replaceAll('<br/>',' ').replaceAll('<br>',' ').replace(/\s+/g,' ').trim()}
function statusText(s){return s==='done'?'implemented':s==='partial'?'partial / reviewable':s==='early'?'foundation / incomplete':'planned'}
function domainFor(id){return groups.find(g=>new RegExp('^'+g.prefix+'\\d+$').test(id))}
function levelFor(index,total){if(total<=1)return 1;return Math.min(7,1+Math.floor(index*7/total))}

function element(n,g,atomic,extra=''){
  const el=document.createElement('button');
  el.type='button';
  el.className=`el ${n.status}${changed(n)?' changed':''} ${extra}`.trim();
  el.setAttribute('aria-label',`Open details for ${cleanLabel(n.label)}`);
  el.title=pythonApi[n.id]?`${cleanLabel(n.label)} · Python API available`:cleanLabel(n.label);
  el.innerHTML=`<span class="num">${atomic}</span><span class="domain-key">${g.key}</span><div class="sym">${n.id}</div><div class="name">${cleanLabel(n.label)}</div><div class="statusline"><span class="dot">${n.emoji}</span></div>${pythonApi[n.id]?'<span class="api-badge" aria-label="Python API available">Py</span>':''}`;
  el.onclick=()=>openDetail(n);
  return el;
}

function buildPlacements(nodes){
  const placements=[];let atomic=1;
  groups.forEach((g,col)=>{
    const items=groupNodes(nodes,g);
    items.forEach((n,idx)=>placements.push({n,g,col,level:levelFor(idx,items.length),atomic:atomic++}));
  });
  return placements;
}

function renderLadder(nodes){
  const host=$('ladder');host.innerHTML='';
  const placements=buildPlacements(nodes);
  const slotCount={};
  for(const l of levels){
    slotCount[l.n]=Math.max(1,...groups.map(g=>placements.filter(p=>p.g.key===g.key&&p.level===l.n).length));
  }
  const rowStart={},rowSpan={};let row=1;
  for(let l=7;l>=1;l--){rowStart[l]=row;rowSpan[l]=slotCount[l];row+=slotCount[l]}
  const footerRow=row;
  host.style.gridTemplateRows=`repeat(${footerRow-1}, var(--cell)) 76px`;

  groups.forEach((g,col)=>{
    const bg=document.createElement('div');
    bg.className=`domain-bg g${col}`;bg.style.gridColumn=String(col+2);bg.style.gridRow=`1 / ${footerRow}`;host.appendChild(bg);
  });

  for(let l=7;l>=1;l--){
    const meta=levels[l-1],start=rowStart[l],span=rowSpan[l];
    const label=document.createElement('div');label.className='level-label';label.style.gridColumn='1';label.style.gridRow=`${start} / span ${span}`;
    label.innerHTML=`<div class="level-no">${l}</div><div class="level-copy"><strong>${meta.title}</strong><small>${meta.desc}</small></div>`;host.appendChild(label);
    const band=document.createElement('div');band.className='level-band';band.style.gridRow=String(start);host.appendChild(band);
  }

  groups.forEach((g,col)=>{
    const items=placements.filter(p=>p.g.key===g.key);
    levels.forEach(meta=>{
      const same=items.filter(p=>p.level===meta.n);
      same.forEach((p,k)=>{
        const start=rowStart[meta.n],span=rowSpan[meta.n];
        const r=start+(span-same.length)+k;
        const el=element(p.n,g,p.atomic,'ladder-cell');el.style.gridColumn=String(col+2);el.style.gridRow=String(r);host.appendChild(el);
      });
    });
  });

  const axis=document.createElement('div');axis.className='axis-note';axis.style.gridRow=String(footerRow);axis.innerHTML='Foundational / dependency base<br>↑ increasing integration & system reach';host.appendChild(axis);
  groups.forEach((g,col)=>{
    const f=document.createElement('div');f.className='ladder-footer';f.style.gridColumn=String(col+2);f.style.gridRow=String(footerRow);f.innerHTML=`<strong>${g.title}</strong><small>${g.key} series</small>`;host.appendChild(f);
  });
}

function renderClassic(nodes){
  const host=$('periodic');host.innerHTML='';host.className='periodic classic';let atomic=1;
  const starts={MB:1,SOL:2,PHY:4,SPEC:1,MAT:3,DYN:7,RUN:1,VAL:4,UX:8};
  for(const g of groups){
    const lab=document.createElement('div');lab.className='domain';lab.innerHTML=`<strong>${g.title}</strong><small>${g.key} series</small>`;host.appendChild(lab);
    for(let c=1;c<starts[g.key];c++){const gap=document.createElement('div');gap.className='gap';host.appendChild(gap)}
    const items=groupNodes(nodes,g);for(const n of items)host.appendChild(element(n,g,atomic++));
    const used=starts[g.key]-1+items.length;for(let c=used+1;c<=18;c++){const gap=document.createElement('div');gap.className='gap';host.appendChild(gap)}
  }
}

function renderTable(nodes){
  const p=$('periodic'),s=$('ladder-shell');
  if(mode==='ladder'){
    p.className='periodic ladder';p.innerHTML='';s.classList.add('visible');renderLadder(nodes);
    $('layout').textContent='▦ Classic';
    $('layout-note').textContent='Grid ladder: empty cells are intentional. Vertical spacing is increased for readability; all capability tiles remain square and aligned. A blue Py badge means a concrete Python API is catalogued for that capability.';
  }else{
    s.classList.remove('visible');renderClassic(nodes);$('layout').textContent='▦ Grid ladder';
    $('layout-note').textContent='Classic view: compact periodic-table layout. Switch to Grid ladder for the aligned dependency / integration roadmap.';
  }
}

function renderApiSpecs(id){
  const host=$('api-specs');host.innerHTML='';
  const cap=apiSpecs.capabilities?.[id];
  if(!cap){const p=document.createElement('div');p.className='api-none';p.textContent='No structured public API signature is catalogued for this capability yet.';host.appendChild(p);return}
  const relevant=new Set(cap.relevant||[]);
  for(const apiName of cap.apis||[]){
    const api=apiSpecs.apis?.[apiName];if(!api)continue;
    const block=document.createElement('div');block.className='api-block';
    const sig=document.createElement('div');sig.className='api-signature';sig.textContent=api.signature;block.appendChild(sig);
    if((api.parameters||[]).length){
      const table=document.createElement('table');table.className='param-table';
      table.innerHTML='<thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Meaning</th></tr></thead>';
      const body=document.createElement('tbody');
      for(const p of api.parameters){
        const tr=document.createElement('tr');if(relevant.has(p.name))tr.className='relevant-param';
        const c1=document.createElement('td');const code=document.createElement('code');code.textContent=p.name;c1.appendChild(code);
        const c2=document.createElement('td');c2.textContent=p.type;
        const c3=document.createElement('td');c3.textContent=p.default;
        const c4=document.createElement('td');c4.textContent=p.description;
        tr.append(c1,c2,c3,c4);body.appendChild(tr);
      }
      table.appendChild(body);block.appendChild(table);
    }else{
      const none=document.createElement('div');none.className='api-none';none.style.padding='10px 12px';none.textContent='This entry point has no call parameters.';block.appendChild(none);
    }
    host.appendChild(block);
  }
}

function openDetail(n){
  const g=domainFor(n.id),d=details.capabilities[n.id]||{},long=descriptions[n.id],py=pythonApi[n.id],example=pythonExamples[n.id];
  $('detail-title').textContent=cleanLabel(n.label);$('detail-sub').textContent=n.id+' · '+(g?.title||'Capability');
  $('detail-meta').innerHTML=`<span class="pill">${n.emoji} ${statusText(n.status)}</span><span class="pill">Frame: ${frames[i].title}</span>${py?'<span class="pill">Py API available</span>':''}`;
  $('detail-description').textContent=long||d.summary||`${cleanLabel(n.label)} is tracked inside ${g?.title||'the XMD Quantum roadmap'}. The selected frame determines the maturity shown here; implementation claims remain bounded by reviewed evidence.`;
  $('detail-domain').textContent=details.domains[g?.key]||'';
  const f=$('detail-formula');
  if(d.formula){f.hidden=false;f.textContent=d.formula;if(window.katex){try{katex.render(d.formula,f,{displayMode:true,throwOnError:false})}catch{f.textContent=d.formula}}}else{f.hidden=true;f.textContent=''}

  $('python-section').hidden=!py;
  if(py){
    $('python-note').textContent=py.note||'Current public Python entry point on XMDWorkbench main.';
    $('python-code').textContent=py.code||'# API entry exists; see signature below.';
    if(example){$('example-panel').hidden=false;$('example-title').textContent=example.title||'Useful example';$('example-summary').textContent=example.summary||'';$('example-code').textContent=example.code||''}
    else{$('example-panel').hidden=true;$('example-title').textContent='';$('example-summary').textContent='';$('example-code').textContent=''}
  }
  renderApiSpecs(n.id);
  $('detail').showModal();
}

async function jsonOr(url,fallback){try{const r=await fetch(url,{cache:'no-store'});return r.ok?await r.json():fallback}catch{return fallback}}
async function load(){
  const [idx,det,desc,py,examples,specs]=await Promise.all([
    jsonOr('history.json',{frames:[]}),jsonOr('capability-details.json',{domains:{},capabilities:{}}),jsonOr('capability-descriptions.json',{}),jsonOr('capability-python.json',{}),jsonOr('capability-python-examples.json',{}),jsonOr('capability-api-specs.json',{apis:{},capabilities:{}})
  ]);
  details=det;descriptions=desc;pythonApi=py;pythonExamples=examples;apiSpecs=specs;
  frames=await Promise.all(idx.frames.map(async f=>({...f,src:await fetch(f.file,{cache:'no-store'}).then(r=>r.text())})));
  $('timeline').max=Math.max(0,frames.length-1);i=Math.max(0,frames.length-1);render();
}
function render(){if(!frames.length)return;const f=frames[i],nodes=parseMmd(f.src);$('title').textContent=f.title;$('date').textContent=f.date;$('note').textContent=f.note;$('counter').textContent=`${i+1} / ${frames.length}`;$('timeline').value=i;renderTable(nodes);previousNodes=nodes}
function stop(){if(timer){clearInterval(timer);timer=null;$('play').textContent='▶ Play'}}
function setFrame(n){previousNodes=frames.length?parseMmd(frames[i].src):null;i=Math.max(0,Math.min(frames.length-1,n));render()}
function step(v){let n=i+v;if(n>=frames.length)n=0;if(n<0)n=frames.length-1;setFrame(n)}

$('back').onclick=()=>{if(history.length>1)history.back();else location.href='../'};
$('layout').onclick=()=>{mode=mode==='ladder'?'classic':'ladder';render()};
$('first').onclick=()=>{stop();setFrame(0)};$('last').onclick=()=>{stop();setFrame(frames.length-1)};$('prev').onclick=()=>{stop();step(-1)};$('next').onclick=()=>{stop();step(1)};
$('timeline').oninput=e=>{stop();setFrame(+e.target.value)};
$('play').onclick=()=>{if(timer){stop();return}$('play').textContent='⏸ Pause';timer=setInterval(()=>step(1),+$('speed').value)};
$('speed').onchange=()=>{if(timer){stop();$('play').click()}};
$('detail-close').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
load();
