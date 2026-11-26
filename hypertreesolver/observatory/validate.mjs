import fs from "node:fs";import assert from "node:assert/strict";
const read=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url),"utf8"));
const t=read("timeline.json"),g=read("hypergraph.json"),b=read("backlog.json"),p=read("publication.json");
assert.equal(t.schema,"observatory-timeline/1");assert.equal(g.schema,"observatory-hypergraph/1");assert.equal(b.schema,"observatory-backlog/1");
assert.equal(t.events.length,p.timelineCount);assert.equal(new Set(t.events.map(x=>x.id)).size,t.events.length);
for(let i=1;i<t.events.length;i++)assert(t.events[i-1].date<=t.events[i].date);
for(const e of t.events){assert(e.id&&e.date&&e.title&&e.summary);assert(["solver","knowledge","joint"].includes(e.track));for(const m of e.metrics||[])assert(Number.isFinite(m.value)&&m.value>=0)}
const map=new Map([...g.nodes,...g.relations].map(x=>[x.id,x]));assert.equal(map.size,g.nodes.length+g.relations.length);
for(const r of g.relations){assert(r.conclusions.length);for(const id of [...r.premises,...r.conclusions])assert(map.has(id)&&map.get(id).layer<=r.layer)}
for(const v of g.versions){assert.equal(g.nodes.filter(n=>n.layer<=v.layer).length,v.nodes);assert.equal(g.relations.filter(r=>r.layer<=v.layer).length,v.relations)}
assert(g.versions.some(v=>v.id===p.graphVersion&&v.nodes===p.graphCounts.nodes&&v.relations===p.graphCounts.relations));
assert(!/github\.com\/TuinvosLabs\/HyperTreeSolver|issuecomment-|runner_name|source_condition|source_dossier|blob\.core\.windows\.net|work-budget/i.test(JSON.stringify([t,g,b,p])));
console.log("PASS",t.events.length,"events",g.nodes.length,"nodes",g.relations.length,"relations");
