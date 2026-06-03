(function(){
  window.wc=window.wc||{};
  wc.log=wc.log||function(){console.log.apply(console,arguments)};
  const topics={};
  wc.subscribe=function(topic,fn){ if(typeof fn!=="function") return false; topics[topic]=topics[topic]||[]; topics[topic].push(fn); return topic+":"+topics[topic].length; };
  wc.publish=function(topic,data){ wc.log("wc.publish",topic,data); (topics[topic]||[]).forEach(fn=>setTimeout(()=>fn(topic,data),0)); (topics["*"]||[]).forEach(fn=>setTimeout(()=>fn(topic,data),0)); return true; };
  class Include extends HTMLElement{
    async connectedCallback(){
      const href=this.getAttribute('href'); if(!href) return;
      try{ const res=await fetch(href,{cache:'no-cache'}); if(!res.ok) throw new Error(res.status); this.innerHTML=await res.text(); this.activateScripts(); this.dispatchEvent(new CustomEvent('include:loaded',{bubbles:true,detail:{href}})); }
      catch(e){ this.innerHTML='wc-include: Page not found: '+href; console.error(e); }
    }
    activateScripts(){ this.querySelectorAll('script').forEach(old=>{ const s=document.createElement('script'); [...old.attributes].forEach(a=>s.setAttribute(a.name,a.value)); s.textContent=old.textContent; old.replaceWith(s); }); }
  }
  if(!customElements.get('wc-include')) customElements.define('wc-include',Include);
})();
