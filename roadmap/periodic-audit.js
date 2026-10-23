(async function(){
  let extensions={apis:{},capabilities:{}};
  try{
    const response=await fetch('capability-api-extensions.json',{cache:'no-store'});
    if(response.ok) extensions=await response.json();
  }catch(error){
    console.warn('Could not load extended API metadata',error);
  }

  let merged=false;
  function mergeExtensions(){
    if(merged||typeof apiSpecs==='undefined'||!apiSpecs?.apis||!apiSpecs?.capabilities) return false;
    Object.assign(apiSpecs.apis,extensions.apis||{});
    for(const [id,extra] of Object.entries(extensions.capabilities||{})){
      const base=apiSpecs.capabilities[id]||{apis:[],relevant:[]};
      apiSpecs.capabilities[id]={
        apis:[...new Set([...(base.apis||[]),...(extra.apis||[])])],
        relevant:[...new Set([...(base.relevant||[]),...(extra.relevant||[])])]
      };
    }
    merged=true;
    return true;
  }

  function audit(){
    if(typeof pythonApi==='undefined'||typeof pythonExamples==='undefined'||typeof apiSpecs==='undefined') return false;
    const apiKeys=Object.keys(pythonApi||{});
    if(!apiKeys.length) return false;
    mergeExtensions();
    const exampleKeys=new Set(Object.keys(pythonExamples||{}));
    const specKeys=new Set(Object.keys(apiSpecs.capabilities||{}));
    const examples=apiKeys.filter(k=>exampleKeys.has(k)).length;
    const signatures=apiKeys.filter(k=>specKeys.has(k)).length;
    const missingExamples=apiKeys.filter(k=>!exampleKeys.has(k));
    const missingSpecs=apiKeys.filter(k=>!specKeys.has(k));
    const signatureCount=Object.keys(apiSpecs.apis||{}).length;
    const el=document.getElementById('api-audit');
    if(el){
      const complete=examples===apiKeys.length&&signatures===apiKeys.length;
      el.textContent=`Py capabilities ${apiKeys.length} · examples ${examples}/${apiKeys.length} · documented entrypoints ${signatureCount}`;
      el.title=complete?'Python capability documentation is complete for every catalogued capability.':`Missing examples: ${missingExamples.join(', ')||'none'}; missing signatures: ${missingSpecs.join(', ')||'none'}`;
      el.classList.toggle('audit-ok',complete);
      el.classList.toggle('audit-warn',!complete);
    }
    if(missingExamples.length||missingSpecs.length){
      console.warn('Periodic API catalogue gaps',{missingExamples,missingSpecs});
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(audit()||tries>100)clearInterval(timer)},50);
})();
