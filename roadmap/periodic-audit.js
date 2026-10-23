(function(){
  function audit(){
    if(typeof pythonApi==='undefined'||typeof pythonExamples==='undefined'||typeof apiSpecs==='undefined') return false;
    const apiKeys=Object.keys(pythonApi||{});
    if(!apiKeys.length) return false;
    const exampleKeys=new Set(Object.keys(pythonExamples||{}));
    const specKeys=new Set(Object.keys(apiSpecs.capabilities||{}));
    const examples=apiKeys.filter(k=>exampleKeys.has(k)).length;
    const signatures=apiKeys.filter(k=>specKeys.has(k)).length;
    const missingExamples=apiKeys.filter(k=>!exampleKeys.has(k));
    const missingSpecs=apiKeys.filter(k=>!specKeys.has(k));
    const el=document.getElementById('api-audit');
    if(el){
      const complete=examples===apiKeys.length&&signatures===apiKeys.length;
      el.textContent=`Py APIs ${apiKeys.length} · examples ${examples}/${apiKeys.length} · signatures ${signatures}/${apiKeys.length}`;
      el.title=complete?'Python capability documentation is complete for every catalogued API.':`Missing examples: ${missingExamples.join(', ')||'none'}; missing signatures: ${missingSpecs.join(', ')||'none'}`;
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
