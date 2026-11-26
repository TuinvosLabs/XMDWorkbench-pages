
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!=null)x.textContent=txt;if(cls)x.className=cls;return x};
const put=(parent,...xs)=>parent.append(...xs);
const fmt=x=>Number(x).toLocaleString("nl-NL",{maximumFractionDigits:2});
const datefmt=x=>x.length===10?x:new Intl.DateTimeFormat("nl-NL",{timeZone:"Europe/Amsterdam",dateStyle:"short",timeStyle:"short"}).format(new Date(x))+" CET/CEST";
const statusName={planned:"Gepland",plan:"Werkvoorraad",active:"Geclaimd",result:"Resultaat",checkpoint:"Checkpoint",partial:"Deels afgerond",deferred:"Uitgesteld",blocked:"Geblokkeerd",accepted:"Geaccepteerd",joint:"Kruisbestuiving"};
const trackName={solver:"Solver Research",knowledge:"Knowledge Research",joint:"Kruisbestuiving"};
const kindName={historical:"Historisch onderzoek",statement:"Uitspraak",result:"Resultaat",opportunity:"Onderzoekskans",evidence:"Bewijsbron",lemma:"Lemma",algorithm:"Algoritme",theorem:"Stelling",decision:"Besluit",counterexample:"Tegenvoorbeeld",experiment:"Experiment",formal:"Formele relatie",hypothesis:"Hypothese",test:"Test",falsifier:"Weerlegging",association:"Associatie",provenance:"Herkomstrelatie",dependency:"Afhankelijkheid",unresolved:"Onopgelost"};
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
function graphExplorer(g,topicData){
 if(!$("snapshot"))return;
 const topic=topicData&&topicData.schema==="observatory-topic-labels/1"?topicData.labels:{};
 const publicSummaries={"N0171":"Onderzoek naar afstandsondergrenzen op basis van de maximale capaciteit van toegelaten zetten. Een geldige projectie moet alle werkelijke acties kunnen representeren.","N0224":"Gehele aantallen operatoren en hun gezamenlijke capaciteitsbeperkingen. De gebruikte kosten en catalogus bepalen voor welke zoekruimte een ondergrens geldt.","N0317":"Vergelijk twee prefixes onder dezelfde toegelaten vervolgen. De maximale extra vervolgprijs vormt een voldoende dominantietoets; de context en kosten moeten overeenkomen.","N0381":"Ondergrenzen uit gewogen, lokale correctiekosten. Het optellen van bijdragen is alleen veilig onder een bewezen kostenverdeling.","N0407":"De gewogen singletonvoltooiing maakt de resterende lokale correctiekosten expliciet. Deze fallbackprijs is niet automatisch een ondergrens voor samengestelde macro's.","N0410":"Een ontworpen vijfcyclusfamilie toont de beperkingen van een beleid dat alleen onmiddellijk positieve correcties kiest.","N0519":"Een exacte kandidaatselectie op basis van postings en lokale scoregrenzen. Formele toelating en empirische snelheid zijn afzonderlijke vragen.","N0523":"Open of voldane reviewverplichtingen moeten uit de gezaghebbende, versiegebonden kennisregistry worden vastgesteld. Een verbinding in deze publieke graaf is daarvoor niet genoeg.","N0524":"Fysieke evaluatie vereist volledige replay, een vastgelegde doeltoestand en passende vergelijkingsvoorwaarden.","N0525":"Dit is een evaluatiebesluit, niet uitsluitend een mathematisch resultaat. Bekijk de afzonderlijke bewijs- en evaluatieverplichtingen.","N0566":"Dominantie van bewijsroutes binnen een gemeenschappelijk, positief verplichtingenmodel. De noodzakelijke en voldoende toets geldt voor het volledige gedeclareerde uniemodel.","N0567":"Gezamenlijke bewijsplanning kan gedeelde verplichtingen slechts eenmaal hoeven te betalen. Een ondergrens en een uitvoerbare gezamenlijke route moeten onder hetzelfde contract worden vergeleken.","N0568":"Vervolgkosten moeten over hetzelfde toegelaten vervolgdomein worden vergeleken. Een voldoende bovengrens op het prijsverschil kan veilige eliminatie ondersteunen.","N0571":"320 QTM is het bewezen ruwe optimum binnen de oorspronkelijke macrocatalogus en gewogen singletonvoltooiing voor de ontworpen gelijk-gelabelde paarfamilie. Het is geen primitieve afstandsondergrens.","N0572":"400 QTM is de gerapporteerde exacte ruwe catalogusprijs voor de specifieke viercycluscontrole.","N0573":"800 QTM werd binnen de oorspronkelijke catalogus bereikt met vier acties. De scope van dit oorspronkelijke raw-model verschilt van de latere gereduceerde composieten.","N0574":"Lagrangiaanse prijzen relaxeren de globale macro-koppeling naar lokale acties. De ondergrens is geldig wanneer elke werkelijke projectie is opgenomen en dezelfde ruwe kosten worden gebruikt.","N0575":"Koppel lokale actietypen en pariteitsquota; een gezamenlijke relaxatie kan scherper zijn dan afzonderlijke grenzen.","N0576":"Voor veilige dominantie moeten de beide prefixes onder dezelfde legale vervolgwoorden, prijs en grensvoorwaarden worden vergeleken.","N0579":"Het oorspronkelijke viermacrowoord van 320 raw QTM is fysiek gereproduceerd. Bescherming van alle interne grenzen geeft 240 QTM; met alleen de buitenste fasegrenzen is een woord van 198 QTM gevonden.","N0580":"De publicatie beschrijft 960 fysiek gecontroleerde uitvouwbare composieten met getransporteerde lokale effecten. De exacte expansie en grensvoorwaarden horen bij het bewijs.","N0581":"Een constructieve route van 594 QTM voor de uniforme zesplaatsstand is fysiek gereproduceerd. Dit is een uitvoerbare bovengrens, geen bewezen primitief optimum.","N0582":"Het exacte minimum tot en met vier oorspronkelijke macroacties bedraagt 800 raw QTM. De 594-route gebruikt een ander expansie- en reductiecontract.","N0583":"De minimale noodzakelijke maximale singleton-correctieschuld binnen het 320-raw-QTM-optimum is 1.916 QTM. Dit toont de noodzaak van niet-monotone tussenstanden in die catalogus.","N0584":"Gebruik gemeenschappelijke vervolgwoorden voor meerdere sites en selecteer disjuncte koppelingen. De verbeterde grens is niet automatisch sneller dan directe enumeratie.","N0585":"Verwijder incompatibele bewijsroutes en herbereken verplichte atomen. Een lokaal consistent resultaat is in het algemene geval nog geen bewijs van globale haalbaarheid.","N0586":"Groepen tot vier sites maakten de bovengrens exact op 30 van 32 ontworpen domeinen. De resterende afwijking en betaalde zoekkosten blijven afzonderlijke onderzoeksvragen.","N0587":"Chronologische quota voor macrotypen en pariteitsklassen moeten alle werkelijk toegelaten actieprojecties bevatten.","N0588":"In de kleine gematchte timingproef was de sterkere paargrens duurder dan directe enumeratie. Wiskundige scherpte en end-to-end prestaties zijn verschillende metrics."};
 const proofStore="observatory.privateProofBase.v1";
 const normalizeProofBase=value=>{try{const u=new URL(value.trim());if(u.origin!=="https://github.com"||u.username||u.password||u.search||u.hash)return "";let p=u.pathname.replace(/\/+$/,"").replace(/\/README\.md$/i,"");if(!/^\/[^/]+\/[^/]+\/(?:blob|tree)\/.+\/proof-index$/.test(p))return "";return u.origin+p.replace(/^(\/[^/]+\/[^/]+\/)tree\//,"$1blob/")}catch{return ""}};
 let proofBase="";try{proofBase=normalizeProofBase(localStorage.getItem(proofStore)||"")}catch{}
 const privateLink=id=>{if(!proofBase||!/^[NH]\d{4,}$/.test(id))return "";const number=Number(id.slice(1)),part=String(Math.floor((number-1)/100)+1).padStart(2,"0");return proofBase+"/"+(id.startsWith("N")?"nodes-":"relations-")+part+".md#"+id.toLowerCase()};
 const proofStatus=$("proofStatus"),proofInput=$("proofBase");
 const showProofSetting=()=>{if(proofStatus)proofStatus.textContent=proofBase?"Privébewijs gekoppeld. Authenticatie gebeurt bij GitHub.":"Nog geen privébewijs gekoppeld. Plak het adres van de private bewijsindex.";if(proofInput)proofInput.value=proofBase};
 const setProofBase=(value)=>{const v=normalizeProofBase(value);if(!v){if(proofStatus)proofStatus.textContent="Gebruik een HTTPS GitHub-adres van de private proof-index-map, zonder token of query.";return false}proofBase=v;try{localStorage.setItem(proofStore,v)}catch{}showProofSetting();return true};
 try{if(location.hash.startsWith("#private-proof=")){const b=decodeURIComponent(location.hash.slice(15));if(setProofBase(b))history.replaceState(null,"",location.pathname+location.search)}}catch{}
 showProofSetting();
 const labels=new Map(g.nodes.map(n=>[n.id,topic[n.id]||n.label]));
 const named=n=>Boolean(topic[n.id]||n.named);
 const nodeLabel=id=>labels.get(id)||"Hyperrelatie "+id;
 for(const r of g.relations){
  const targets=r.conclusions.map(nodeLabel);
  const title=(kindName[r.kind]||r.kind)+" → "+(targets[0]||"onbekend doel")+(targets.length>1?" (+"+(targets.length-1)+")":"");
  labels.set(r.id,title);
 }
 const nodeBy=new Map(g.nodes.map(x=>[x.id,x])),relBy=new Map(g.relations.map(x=>[x.id,x]));
 const fullBy=new Map([...g.nodes,...g.relations].map(x=>[x.id,x]));
 const select=$("snapshot"),kind=$("gkind"),list=$("entities"),detail=$("detail"),box=$("graphbox");
 for(const v of g.versions){const o=el("option",v.label+" · "+v.nodes+"/"+v.relations);o.value=v.id;put(select,o)}select.value=g.versions[g.versions.length-1].id;
 for(const k of [...new Set([...g.nodes,...g.relations].map(x=>x.kind))].sort()){const o=el("option",kindName[k]||k);o.value=k;put(kind,o)}
 let activeVersion=()=>g.versions.find(x=>x.id===select.value),mode="neighborhood",sel=g.nodes.slice().reverse().find(n=>named(n)&&g.relations.some(r=>r.premises.includes(n.id)||r.conclusions.includes(n.id)))?.id||g.nodes[0].id;
 let active=x=>x.layer<=activeVersion().layer,relActive=()=>g.relations.filter(active);
 let incident=id=>relActive().filter(e=>e.id===id||e.premises.includes(id)||e.conclusions.includes(id));
 const wrapLabel=(s,max=25,limit=3)=>{const rows=[];for(const word of s.split(/\s+/)){if(rows.length&&rows[rows.length-1].length+word.length+1<=max){rows[rows.length-1]+=" "+word}else{rows.push(word)}}if(rows.length>limit){rows.length=limit;rows[limit-1]=rows[limit-1].slice(0,max-1)+"…"}return rows.map(r=>r.length>max?r.slice(0,max-1)+"…":r)};
 const searchText=x=>[x.id,labels.get(x.id),kindName[x.kind]||x.kind,...(relBy.has(x.id)?[...x.premises,...x.conclusions].map(nodeLabel):[])].join(" ").toLocaleLowerCase("nl-NL");
 function choose(id){if(!fullBy.has(id)||!active(fullBy.get(id)))return;sel=id;mode="neighborhood";draw();renderList()}
 function linkButton(id){const b=el("button",(labels.get(id)||id)+" · "+id);b.type="button";b.addEventListener("click",()=>choose(id));return b}
 function group(title,arr){put(detail,el("h3",title));const p=el("div",null,"related");if(!arr.length)put(p,el("p","Geen.","muted"));for(const id of arr)put(p,linkButton(id));put(detail,p)}
 function showDetail(){
 const obj=fullBy.get(sel);detail.replaceChildren();put(detail,el("span",sel+" · "+(obj.layer===0?"Canonieke basis":"Onderzoeks-overlay"),"pill"),el("h2",labels.get(sel)||sel),el("p","Type: "+(kindName[obj.kind]||obj.kind),"muted"));
 const evidence=el("section",null,"evidencepanel");put(evidence,el("h3","Bewijs & onderbouwing"));
 if(publicSummaries[sel])put(evidence,el("p",publicSummaries[sel]));
 else if(relBy.has(sel))put(evidence,el("p","Deze hyperrelatie verbindt de onderstaande premissen en conclusies. Het relatietype alleen bewijst geen geldige formele afleiding."));
 else put(evidence,el("p","De exacte uitspraak, bronankers en bijbehorende bewijsdocumenten staan in het private onderzoeksregister."));
 const url=privateLink(sel);
 if(url){const a=el("a","Open originele uitspraak, bronnen en bewijs ↗","prooflink");a.href=url;a.target="_blank";a.rel="noopener noreferrer";put(evidence,a,el("p","Opent het gekoppelde private bewijsrecord in GitHub. Geen private data wordt door deze pagina opgehaald.","muted"))}
 else{const configure=el("button","Koppel privébewijsindex");configure.type="button";configure.addEventListener("click",()=>{const d=$("proofSettings");if(d){d.open=true;d.scrollIntoView({block:"nearest"});proofInput?.focus()}});put(evidence,configure,el("p","Privétoegang is nodig voor oorspronkelijke bewijsinhoud.","muted"))}
 put(detail,evidence);
 if(relBy.has(sel)){put(detail,el("p","Geordende incidenties. Alle premissen horen bij dezelfde hyperrelatie; type en richting zijn zichtbaar, maar geen formeel toelatingsbesluit."));group("Premissen ("+obj.premises.length+")",obj.premises);group("Conclusies ("+obj.conclusions.length+")",obj.conclusions)}
 const rs=incident(sel).filter(e=>e.id!==sel);
 if(!relBy.has(sel)){const incoming=rs.filter(r=>r.conclusions.includes(sel)),outgoing=rs.filter(r=>r.premises.includes(sel));
 group("Onderbouwing / inkomende relaties ("+incoming.length+")",incoming.map(r=>r.id));group("Gebruik / uitgaande relaties ("+outgoing.length+")",outgoing.map(r=>r.id))}
 else group("Verbonden hyperrelaties ("+rs.length+")",rs.map(e=>e.id));
 if(!relBy.has(sel))put(detail,el("p",named(obj)?"Publieke onderzoekstitel. De exacte stelling, voorwaarden en herkomst blijven in de private bronlaag.":"Voor dit onderwerp is nog geen publieke titel vastgesteld.","muted"));
 }
 function attach(gp,id){gp.setAttribute("tabindex","0");gp.setAttribute("role","button");gp.setAttribute("aria-label",labels.get(id)||id);gp.addEventListener("click",()=>choose(id));gp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(id)}})}
 function drawNeighborhood(){
 const obj=fullBy.get(sel),relations=relBy.has(sel)?[obj]:incident(sel).slice(0,12);
 const universe=new Set([sel]);for(const r of relations){universe.add(r.id);r.premises.forEach(x=>universe.add(x));r.conclusions.forEach(x=>universe.add(x))}
 const keys=[...universe],center={x:440,y:0},radius=Math.max(210,Math.min(430,keys.length*23)),height=Math.max(600,radius*2+180);center.y=height/2;
 const root=svg("svg",{viewBox:"0 0 880 "+height,role:"img","aria-label":"Buurtgraaf van "+(labels.get(sel)||sel)});
 const defs=svg("defs"),marker=svg("marker",{id:"arr",markerWidth:8,markerHeight:8,refX:7,refY:3,orient:"auto"});put(marker,svg("path",{d:"M0 0 L7 3 L0 6",fill:"#8295a7"}));put(defs,marker);put(root,defs);
 const pos=new Map([[sel,center]]),others=keys.filter(x=>x!==sel);
 others.forEach((id,i)=>{const a=2*Math.PI*i/Math.max(1,others.length)-Math.PI/2;pos.set(id,{x:center.x+Math.cos(a)*Math.min(radius,320),y:center.y+Math.sin(a)*radius})});
 function line(a,b){const p=pos.get(a),q=pos.get(b);if(!p||!q)return;let dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;let gap=relBy.has(b)?21:67;put(root,svg("path",{d:"M"+p.x+" "+p.y+" L"+(q.x-dx/d*gap)+" "+(q.y-dy/d*gap),stroke:"#8295a7","stroke-width":1.2,fill:"none","marker-end":"url(#arr)",opacity:.68}))}
 for(const r of relations){for(const a of r.premises)line(a,r.id);for(const b of r.conclusions)line(r.id,b)}
 for(const id of keys){const p=pos.get(id),r=relBy.has(id),n=fullBy.get(id),gp=svg("g",{transform:"translate("+p.x+" "+p.y+")"}),color=r?"#a36b20":n.layer===0?"#255c99":"#087d78",chosen=id===sel;put(gp,svg("title",{},labels.get(id)||id));
 if(r){put(gp,svg("path",{d:"M0 -20 L20 0 L0 20 L-20 0 Z",fill:chosen?"#f4d99e":"#fff8e6",stroke:color,"stroke-width":chosen?3:1.5}),svg("text",{y:3,"font-size":9,"text-anchor":"middle",fill:color},n.kind==="formal"?"AND":"H"));const rr=wrapLabel(labels.get(id)||id,27,2);for(let i=0;i<rr.length;i++)put(gp,svg("text",{y:33+i*13,"font-size":10,"text-anchor":"middle",fill:"#506476","paint-order":"stroke",stroke:"#f8fbfd","stroke-width":3},rr[i]));}
 else{const rows=wrapLabel(labels.get(id)||id,25,3),hh=rows.length*13+31;put(gp,svg("rect",{x:-89,y:-hh/2,width:178,height:hh,rx:7,fill:chosen?"#d9edea":"white",stroke:color,"stroke-width":chosen?3:1.5}));for(let i=0;i<rows.length;i++)put(gp,svg("text",{y:-hh/2+15+i*13,"font-size":11,"text-anchor":"middle",fill:"#18334a","font-weight":chosen?700:600},rows[i]));put(gp,svg("text",{y:hh/2-9,"font-size":9,"text-anchor":"middle",fill:"#63778a"},id+" · "+(kindName[n.kind]||n.kind)))}
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
 for(const n of nodes){const [x,y]=positions.get(n.id);ctx.beginPath();ctx.arc(x,y,named(n)?3.6:2.2,0,Math.PI*2);ctx.fillStyle=n.layer===0?"#255c99":"#087d78";ctx.fill()}
 const current=positions.get(sel);if(current){ctx.strokeStyle="#0a7d78";ctx.lineWidth=3;ctx.beginPath();ctx.arc(current[0],current[1],9,0,Math.PI*2);ctx.stroke()}
 canvas.addEventListener("click",ev=>{const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*canvas.width/r.width,y=(ev.clientY-r.top)*canvas.height/r.height;let best=null,dist=Infinity;for(const [id,p] of positions){const d=Math.hypot(x-p[0],y-p[1]);if(d<dist){best=id;dist=d}}if(best&&dist<18)choose(best)});
 box.replaceChildren(canvas);const desc=el("p","Alle "+nodes.length+" knopen en "+rels.length+" hyperrelaties. De overzichtslay-out is illustratief; selecteer een entiteit voor exacte premissen, conclusies en richting.","muted");desc.style.padding="10px";put(box,desc)
 }
 function draw(){const v=activeVersion();if(!active(fullBy.get(sel)))sel=g.nodes.filter(active).slice().reverse().find(n=>named(n))?.id||g.nodes.filter(active)[0].id;$("graphCounts").textContent=fmt(v.nodes)+" knopen · "+fmt(v.relations)+" relaties";$("neighborhood").setAttribute("aria-pressed",String(mode==="neighborhood"));$("full").setAttribute("aria-pressed",String(mode==="full"));if(mode==="full")drawFull();else drawNeighborhood();showDetail()}
 function renderList(){const q=$("gquery").value.trim().toLocaleLowerCase("nl-NL"),k=kind.value,onlyNodes=$("named").checked;let arr=[...g.nodes,...g.relations].filter(x=>active(x)&&(k==="all"||x.kind===k)&&(!onlyNodes||nodeBy.has(x.id))&&(!q||q.split(/\s+/).every(w=>searchText(x).includes(w))));arr.sort((a,b)=>b.layer-a.layer||(labels.get(a.id)||a.id).localeCompare(labels.get(b.id)||b.id,"nl")||a.id.localeCompare(b.id));$("listCount").textContent=fmt(arr.length)+" entiteiten · "+fmt(g.nodes.filter(x=>active(x)&&named(x)).length)+" knopen met onderzoekstitel";list.replaceChildren();const frag=document.createDocumentFragment();for(const x of arr){const b=el("button",null,x.id===sel?"selected":"");b.type="button";b.title=labels.get(x.id)||x.id;put(b,el("strong",labels.get(x.id)||x.id),el("span",(kindName[x.kind]||x.kind)+" · "+x.id,"muted"));const n=relBy.has(x.id)?x.premises.length+" premissen · "+x.conclusions.length+" conclusies":incident(x.id).length+" verbonden relaties";put(b,el("span",n,"entitymeta"));b.addEventListener("click",()=>choose(x.id));put(frag,b)}put(list,frag);if(!arr.length)put(list,el("p","Geen resultaten.","muted"))}
 $("saveProof")?.addEventListener("click",()=>{if(setProofBase(proofInput.value))showDetail()});$("clearProof")?.addEventListener("click",()=>{proofBase="";try{localStorage.removeItem(proofStore)}catch{}showProofSetting();showDetail()});
 select.addEventListener("change",()=>{draw();renderList()});kind.addEventListener("change",renderList);$("gquery").addEventListener("input",renderList);$("named").addEventListener("change",renderList);$("neighborhood").addEventListener("click",()=>{mode="neighborhood";draw()});$("full").addEventListener("click",()=>{mode="full";draw()});draw();renderList()
}
(async()=>{try{const [t,g,b,p]=await Promise.all(["timeline.json","hypergraph.json","backlog.json","publication.json"].map(fetchJson));validate(t,g,b,p);$("publication").textContent="Versie "+p.version+" · Laatste onderzoeksevent "+datefmt(p.lastEvent)+" · Graaf "+p.graphVersion;showOverview(t,g,b,p);showVersions(g);const topicData=$("snapshot")?await fetchJson("topic-labels.json").catch(()=>null):null;graphExplorer(g,topicData)}catch(e){const x=$("error");x.hidden=false;x.className="err";x.textContent="Onderzoeksgegevens konden niet betrouwbaar worden geladen: "+e.message}})();
