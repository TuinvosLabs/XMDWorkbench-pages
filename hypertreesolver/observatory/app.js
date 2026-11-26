
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!=null)x.textContent=txt;if(cls)x.className=cls;return x};
const put=(parent,...xs)=>parent.append(...xs);
const fmt=x=>Number(x).toLocaleString("nl-NL",{maximumFractionDigits:2});
const datefmt=x=>x.length===10?x:new Intl.DateTimeFormat("nl-NL",{timeZone:"Europe/Amsterdam",dateStyle:"short",timeStyle:"short"}).format(new Date(x))+" CET/CEST";
const statusName={planned:"Gepland",plan:"Werkvoorraad",active:"Geclaimd",result:"Resultaat",checkpoint:"Checkpoint",partial:"Deels afgerond",deferred:"Uitgesteld",blocked:"Geblokkeerd",accepted:"Geaccepteerd",joint:"Kruisbestuiving"};
const trackName={solver:"Solver Research",knowledge:"Knowledge Research",joint:"Kruisbestuiving"};
const kindName={formal:"Formele relatie",hypothesis:"Hypothese",test:"Test",falsifier:"Weerlegging",association:"Associatie",provenance:"Herkomstrelatie",dependency:"Afhankelijkheid",unresolved:"Onopgelost"};
const fetchJson=async n=>{const r=await fetch(n,{cache:"no-cache"});if(!r.ok)throw Error(n+" HTTP "+r.status);return r.json()};
const allMetrics=t=>t.events.flatMap(e=>(e.metrics||[]).map(m=>({...m,event:e.id,date:e.date})));
function validate(t,g,b,p){
 if(t.schema!=="observatory-timeline/1"||g.schema!=="observatory-hypergraph/1"||b.schema!=="observatory-backlog/1"||p.schema!=="observatory-publication/1")throw Error("Onbekend dataschema");
 if(t.events.length!==p.timelineCount)throw Error("Publicatieversie komt niet overeen met tijdlijn");
 const es=new Set();for(const e of t.events){if(es.has(e.id))throw Error("Dubbele gebeurtenis");es.add(e.id)}
 const all=[...g.nodes,...g.relations],m=new Map(all.map(x=>[x.id,x]));if(m.size!==all.length)throw Error("Dubbele entiteit");
 for(const r of g.relations){if(!r.conclusions.length||[...r.premises,...r.conclusions].some(x=>!m.has(x)||m.get(x).layer>r.layer))throw Error("Ongeldige hyperincidentie")}
 for(const v of g.versions){if(g.nodes.filter(x=>x.layer<=v.layer).length!==v.nodes||g.relations.filter(x=>x.layer<=v.layer).length!==v.relations)throw Error("Snapshot-aantallen onjuist")}
 if(!g.versions.some(v=>v.id===p.graphVersion&&v.nodes===p.graphCounts.nodes&&v.relations===p.graphCounts.relations))throw Error("Publicatieversie komt niet overeen met graaf");
}
function metric(parent,name,value,unit,caption){const c=el("div",null,"card");put(c,el("div",name,"muted"));const v=el("div",fmt(value),"metric");if(unit)put(v,el("span"," "+unit));put(c,v,el("div",caption,"muted"));put(parent,c)}
function chart(parent,title,description,values,color){
 const c=el("div",null,"chartcard");put(c,el("h3",title),el("p",description));const mx=Math.max(1,...values.map(x=>x.value));
 if(!values.length)put(c,el("p","Nog geen gegevens."));
 for(const x of values){const row=el("div",null,"barrow"),track=el("div",null,"bartrack"),bar=el("div",null,"barfill"+(color?" reduced":""));bar.style.width=(100*x.value/mx)+"%";track.setAttribute("aria-hidden","true");put(track,bar);put(row,el("span",x.label),track,el("strong",fmt(x.value)));put(c,row)}
 put(parent,c)
}
function showOverview(t,g,b,p){
 const ms=allMetrics(t),best=s=>Math.min(...ms.filter(x=>x.series===s).map(x=>x.value));
 const m=$("metrics");if(m){
 const v=g.versions[g.versions.length-1];metric(m,"Gelijk paar",best("pair-reduced"),"QTM","Fysiek gecontroleerde buiten-cut-getuige");metric(m,"Uniform zes",best("six-reduced"),"QTM","Fysiek gecontroleerde constructieve route");metric(m,"Kennisgraaf",v.nodes,"knopen",fmt(v.relations)+" hyperrelaties · onderzoekslaag");metric(m,"Tijdlijn",t.events.length,"gebeurtenissen","Solver, knowledge en gezamenlijke resultaten");
 const c=$("charts");
 const specs=[
 ["pair-raw","Gelijk paar · raw QTM","Oorspronkelijke 7.680-actiescatalogus; gewogen singletonvoltooiing.",false],
 ["pair-protected","Gelijk paar · beschermde interne cuts","Reductie per oorspronkelijk macroblok.",true],
 ["pair-reduced","Gelijk paar · buitenste cuts","Fysiek uitvoerbare gereduceerde woorden; niet bewezen primitief optimaal.",true],
 ["six-raw","Uniform zes · raw QTM","Oorspronkelijke macrocatalogus met beperkte horizon.",false],
 ["four-reduced","Uniform vier · gereduceerd QTM","Constructieve getuigen op dezelfde ontwerpstand.",true],
 ["six-reduced","Uniform zes · gereduceerd QTM","Constructieve getuigen; expansie buiten de oorspronkelijke horizon vier.",true],
 ["gap","Dominantie · relaxatiekloof","Gemiddelde afwijking binnen de ontworpen CHAIN-04-deelcatalogi; geen tijdwinstclaim.",true]];
 for(const [s,title,desc,col] of specs)chart(c,title,desc,ms.filter(x=>x.series===s),col);
 const debt=t.events.filter(x=>Array.isArray(x.debt)).slice(-1)[0];
 if(debt)chart(c,"Correction Debt · optimale raw-paarroute","Tussenstandschuld; geen betaalde routeprijs.",debt.debt.map((v,i)=>({label:i===0?"Start":"Macro "+i,value:v})),false);
 const cover=t.events.filter(x=>Array.isArray(x.coverage)).slice(-1)[0];
 if(cover)chart(c,"KI Stage 1 · bronovereenkomst","Kandidaat-occurrences, geen meting van semantische recall.",cover.coverage.map((v,i)=>({label:["Exact anker","ID-only","Geen match"][i],value:v})),true)
 }
 function events(){const par=$("events");if(!par)return;const track=$("track").value,q=$("q").value.toLocaleLowerCase("nl");const xs=t.events.slice().reverse().filter(x=>(track==="all"||x.track===track)&&(!q||[x.wave,x.title,x.summary].join(" ").toLocaleLowerCase("nl").includes(q)));par.replaceChildren();$("eventCount").textContent=xs.length+" / "+t.events.length+" gebeurtenissen";
 for(const e of xs){const row=el("article",null,"event "+e.track);row.id="event-"+e.id;const meta=el("div",null,"eventmeta");put(meta,el("span",datefmt(e.date)),el("b",e.wave,"track-"+e.track),el("span",trackName[e.track]),el("span",statusName[e.status]||e.status,"pill"));put(row,meta,el("h3",e.title),el("p",e.summary));put(par,row)}
 if(!xs.length)put(par,el("p","Geen gebeurtenissen voor dit filter.","muted"))}
 if($("events")){$("track").addEventListener("change",events);$("q").addEventListener("input",events);events()}
 if($("worklist")){const st=new Map();for(const e of t.events)for(const u of e.updates||[])st.set(u.id,u.status);const par=$("worklist");
 for(const track of ["solver","knowledge"]){const c=el("div");put(c,el("h3",trackName[track],"track-"+track));for(const item of b.items.filter(x=>x.track===track)){const row=el("div",null,"statusrow"),s=st.get(item.id)||"planned";put(row,el("strong",item.id),el("span",item.title),el("span",statusName[s]||s,"pill status-"+s));put(c,row)}put(par,c)}
 }
}
function showVersions(g){const p=$("versions");if(!p)return;for(const v of g.versions){const c=el("div",null,"card");put(c,el("div",v.label,"muted"),el("div",fmt(v.nodes)+" / "+fmt(v.relations),"metric"),el("p","Knopen / hyperrelaties", "muted"),el("div",fmt(v.sources)+" bronpinnen in private bronlaag","muted"));put(p,c)}}
const NS="http://www.w3.org/2000/svg";
function svg(tag,attrs={},label){const x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(label!=null)x.textContent=label;return x}
function graphExplorer(g){
 if(!$("snapshot"))return;
 const labels=new Map(g.nodes.map(n=>[n.id,n.label]));for(const r of g.relations)labels.set(r.id,(kindName[r.kind]||r.kind)+" "+r.id);
 const nodeBy=new Map(g.nodes.map(x=>[x.id,x])),relBy=new Map(g.relations.map(x=>[x.id,x]));
 const fullBy=new Map([...g.nodes,...g.relations].map(x=>[x.id,x]));
 const select=$("snapshot"),kind=$("gkind"),list=$("entities"),detail=$("detail"),box=$("graphbox");
 for(const v of g.versions){const o=el("option",v.label+" · "+v.nodes+"/"+v.relations);o.value=v.id;put(select,o)}select.value=g.versions[g.versions.length-1].id;
 for(const k of [...new Set([...g.nodes,...g.relations].map(x=>x.kind))].sort()){const o=el("option",kindName[k]||k);o.value=k;put(kind,o)}
 let activeVersion=()=>g.versions.find(x=>x.id===select.value),mode="neighborhood",sel=g.nodes.slice().reverse().find(n=>n.named)?.id||g.nodes[0].id;
 let active=x=>x.layer<=activeVersion().layer,relActive=()=>g.relations.filter(active);
 let incident=id=>relActive().filter(e=>e.id===id||e.premises.includes(id)||e.conclusions.includes(id));
 const shorten=(s,n)=>s.length>n?s.slice(0,n-1)+"…":s;
 function choose(id){if(!fullBy.has(id)||!active(fullBy.get(id)))return;sel=id;mode="neighborhood";draw();renderList()}
 function linkButton(id){const b=el("button",(labels.get(id)||id)+" · "+id);b.type="button";b.addEventListener("click",()=>choose(id));return b}
 function group(title,arr){put(detail,el("h3",title));const p=el("div",null,"related");if(!arr.length)put(p,el("p","Geen.","muted"));for(const id of arr)put(p,linkButton(id));put(detail,p)}
 function showDetail(){
 const obj=fullBy.get(sel);detail.replaceChildren();put(detail,el("span",sel+" · "+(obj.layer===0?"Canonieke basis":"Onderzoeks-overlay"),"pill"),el("h2",labels.get(sel)||sel),el("p","Type: "+(kindName[obj.kind]||obj.kind),"muted"));
 if(relBy.has(sel)){put(detail,el("p","Geordende incidenties. Alle premissen horen bij dezelfde hyperrelatie; type en richting zijn zichtbaar, maar geen formeel toelatingsbesluit."));group("Premissen ("+obj.premises.length+")",obj.premises);group("Conclusies ("+obj.conclusions.length+")",obj.conclusions)}
 const rs=incident(sel).filter(e=>e.id!==sel);group("Verbonden hyperrelaties ("+rs.length+")",rs.map(e=>e.id));
 if(!relBy.has(sel)&&!obj.named)put(detail,el("p","Oorspronkelijke claimtekst blijft in de private bronlaag.","muted"));
 }
 function attach(gp,id){gp.setAttribute("tabindex","0");gp.setAttribute("role","button");gp.setAttribute("aria-label",labels.get(id)||id);gp.addEventListener("click",()=>choose(id));gp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(id)}})}
 function drawNeighborhood(){
 const obj=fullBy.get(sel),relations=relBy.has(sel)?[obj]:incident(sel).slice(0,12);
 const universe=new Set([sel]);for(const r of relations){universe.add(r.id);r.premises.forEach(x=>universe.add(x));r.conclusions.forEach(x=>universe.add(x))}
 const keys=[...universe],center={x:440,y:0},radius=Math.max(180,Math.min(390,keys.length*14)),height=Math.max(530,radius*2+120);center.y=height/2;
 const root=svg("svg",{viewBox:"0 0 880 "+height,role:"img","aria-label":"Buurtgraaf van "+(labels.get(sel)||sel)});
 const defs=svg("defs"),marker=svg("marker",{id:"arr",markerWidth:8,markerHeight:8,refX:7,refY:3,orient:"auto"});put(marker,svg("path",{d:"M0 0 L7 3 L0 6",fill:"#8295a7"}));put(defs,marker);put(root,defs);
 const pos=new Map([[sel,center]]),others=keys.filter(x=>x!==sel);
 others.forEach((id,i)=>{const a=2*Math.PI*i/Math.max(1,others.length)-Math.PI/2;pos.set(id,{x:center.x+Math.cos(a)*Math.min(radius,315),y:center.y+Math.sin(a)*radius})});
 function line(a,b){const p=pos.get(a),q=pos.get(b);if(!p||!q)return;let dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;let gap=relBy.has(b)?19:35;put(root,svg("path",{d:"M"+p.x+" "+p.y+" L"+(q.x-dx/d*gap)+" "+(q.y-dy/d*gap),stroke:"#8295a7","stroke-width":1.2,fill:"none","marker-end":"url(#arr)",opacity:.68}))}
 for(const r of relations){for(const a of r.premises)line(a,r.id);for(const b of r.conclusions)line(r.id,b)}
 for(const id of keys){const p=pos.get(id),r=relBy.has(id),n=fullBy.get(id),gp=svg("g",{transform:"translate("+p.x+" "+p.y+")"}),color=r?"#a36b20":n.layer===0?"#255c99":"#087d78",chosen=id===sel;put(gp,svg("title",{},labels.get(id)||id));
 if(r){put(gp,svg("path",{d:"M0 -16 L16 0 L0 16 L-16 0 Z",fill:chosen?"#f4d99e":"#fff8e6",stroke:color,"stroke-width":chosen?3:1.5}),svg("text",{y:3,"font-size":9,"text-anchor":"middle",fill:color},n.kind==="formal"?"AND":"H"));put(gp,svg("text",{y:29,"font-size":10,"text-anchor":"middle",fill:"#506476"},id))}
 else{const l=shorten(labels.get(id)||id,24);put(gp,svg("rect",{x:-63,y:-19,width:126,height:38,rx:6,fill:chosen?"#d9edea":"white",stroke:color,"stroke-width":chosen?3:1.5}),svg("text",{y:-2,"font-size":10,"text-anchor":"middle",fill:"#18334a","font-weight":chosen?700:500},l),svg("text",{y:12,"font-size":9,"text-anchor":"middle",fill:"#63778a"},id))}
 attach(gp,id);put(root,gp)}
 box.replaceChildren(root);
 if(!relBy.has(sel)&&incident(sel).length>relations.length){const note=el("p","Beeld beperkt tot de eerste "+relations.length+" verbonden relaties. Alle relaties blijven selecteerbaar in het detailpaneel.","muted");note.style.padding="10px";put(box,note)}
 }
 function drawFull(){
 const canvas=el("canvas");canvas.width=1200;canvas.height=850;canvas.setAttribute("aria-label","Volledige actieve graaf; klik op een punt of gebruik de entiteitenlijst.");const ctx=canvas.getContext("2d"),nodes=g.nodes.filter(active),rels=relActive(),positions=new Map(),cx=600,cy=425;
 nodes.forEach((n,i)=>{let ring=i%4,idx=Math.floor(i/4),count=Math.ceil(nodes.length/4),a=2*Math.PI*idx/count+ring*.08,rx=555-ring*35,ry=385-ring*30;positions.set(n.id,[cx+rx*Math.cos(a),cy+ry*Math.sin(a)])});
 // Keep hyperrelations explicit, even when they themselves occur in incidence lists.
 rels.forEach((r,i)=>{const known=[...r.premises,...r.conclusions].map(x=>positions.get(x)).filter(Boolean),angle=2*Math.PI*i/Math.max(1,rels.length);let x=known.length?known.reduce((s,p)=>s+p[0],0)/known.length:cx+160*Math.cos(angle),y=known.length?known.reduce((s,p)=>s+p[1],0)/known.length:cy+160*Math.sin(angle);positions.set(r.id,[x,y])});
 ctx.fillStyle="#f8fbfd";ctx.fillRect(0,0,1200,850);ctx.lineWidth=.6;ctx.strokeStyle="rgba(70,100,130,.19)";for(const r of rels){const p=positions.get(r.id);for(const id of [...r.premises,...r.conclusions]){const q=positions.get(id);if(!q)continue;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}}
 for(const r of rels){const [x,y]=positions.get(r.id);ctx.fillStyle="#b58a4b";ctx.fillRect(x-1.7,y-1.7,3.4,3.4)}
 for(const n of nodes){const [x,y]=positions.get(n.id);ctx.beginPath();ctx.arc(x,y,n.named?3.6:2.2,0,Math.PI*2);ctx.fillStyle=n.layer===0?"#255c99":"#087d78";ctx.fill()}
 const current=positions.get(sel);if(current){ctx.strokeStyle="#0a7d78";ctx.lineWidth=3;ctx.beginPath();ctx.arc(current[0],current[1],9,0,Math.PI*2);ctx.stroke()}
 canvas.addEventListener("click",ev=>{const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*canvas.width/r.width,y=(ev.clientY-r.top)*canvas.height/r.height;let best=null,dist=Infinity;for(const [id,p] of positions){const d=Math.hypot(x-p[0],y-p[1]);if(d<dist){best=id;dist=d}}if(best&&dist<18)choose(best)});
 box.replaceChildren(canvas);const desc=el("p","Alle "+nodes.length+" knopen en "+rels.length+" hyperrelaties. De overzichtslay-out is illustratief; selecteer een entiteit voor exacte premissen, conclusies en richting.","muted");desc.style.padding="10px";put(box,desc)
 }
 function draw(){const v=activeVersion();if(!active(fullBy.get(sel)))sel=g.nodes.filter(active).slice().reverse().find(n=>n.named)?.id||g.nodes.filter(active)[0].id;$("graphCounts").textContent=fmt(v.nodes)+" knopen · "+fmt(v.relations)+" relaties";$("neighborhood").setAttribute("aria-pressed",String(mode==="neighborhood"));$("full").setAttribute("aria-pressed",String(mode==="full"));if(mode==="full")drawFull();else drawNeighborhood();showDetail()}
 function renderList(){const q=$("gquery").value.toLowerCase(),k=kind.value,named=$("named").checked;let arr=[...g.nodes,...g.relations].filter(x=>active(x)&&(k==="all"||x.kind===k)&&(!named||q||nodeBy.has(x.id)&&x.named)&&(!q||[x.id,labels.get(x.id),x.kind].join(" ").toLowerCase().includes(q)));arr.sort((a,b)=>(b.named?1:0)-(a.named?1:0)||b.layer-a.layer||a.id.localeCompare(b.id));$("listCount").textContent=fmt(arr.length)+" entiteiten; alle resultaten selecteerbaar";list.replaceChildren();const frag=document.createDocumentFragment();for(const x of arr){const b=el("button",null,x.id===sel?"selected":"");b.type="button";put(b,el("strong",labels.get(x.id)||x.id),el("span",x.id+" · "+x.kind,"muted"));b.addEventListener("click",()=>choose(x.id));put(frag,b)}put(list,frag);if(!arr.length)put(list,el("p","Geen resultaten.","muted"))}
 select.addEventListener("change",()=>{draw();renderList()});kind.addEventListener("change",renderList);$("gquery").addEventListener("input",renderList);$("named").addEventListener("change",renderList);$("neighborhood").addEventListener("click",()=>{mode="neighborhood";draw()});$("full").addEventListener("click",()=>{mode="full";draw()});draw();renderList()
}
(async()=>{try{const [t,g,b,p]=await Promise.all(["timeline.json","hypergraph.json","backlog.json","publication.json"].map(fetchJson));validate(t,g,b,p);$("publication").textContent="Versie "+p.version+" · Laatste onderzoeksevent "+datefmt(p.lastEvent)+" · Graaf "+p.graphVersion;showOverview(t,g,b,p);showVersions(g);graphExplorer(g)}catch(e){const x=$("error");x.hidden=false;x.className="err";x.textContent="Onderzoeksgegevens konden niet betrouwbaar worden geladen: "+e.message}})();
