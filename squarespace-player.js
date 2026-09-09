import {initHero} from './hero-player.js?v=native-1';

// A native page element. Shadow DOM isolates player styles from Squarespace.
const assets=new URL('./',import.meta.url);
let template;
function loadTemplate(){
  if(!template)template=Promise.all(['walkthrough.html','walkthrough.css'].map(async file=>{
    const response=await fetch(new URL(`${file}?v=native-1`,assets));
    if(!response.ok)throw Error('Unable to load the walkthrough.');
    return response.text();
  })).catch(error=>{template=null;throw error;});
  return template;
}
class VividWalkthrough extends HTMLElement {
  connectedCallback(){
    if(this.mounting||this.player)return;
    this.mounting=true;
    const token=this.token=Symbol();
    const root=this.shadowRoot||this.attachShadow({mode:'open'});
    root.innerHTML='<p role="status">Preparing your walkthrough…</p>';
    loadTemplate().then(([html,css])=>{
      if(!this.isConnected||this.token!==token)return;
      const main=new DOMParser().parseFromString(html,'text/html').querySelector('main');
      css=css.replace('html,body',':host').replace("url('./media/poster.webp')",`url('${new URL('media/poster.webp',assets)}')`);
      const style=document.createElement('style');
      style.textContent=css+':host{display:block;width:100%;height:auto;min-width:0}.film-hero{height:var(--walkthrough-height,100svh);min-height:280px}';
      root.replaceChildren(style,main);
      this.player=initHero({standalone:true,native:true,root,mediaBase:new URL('media',assets).href});
    }).catch(()=>{
      if(!this.isConnected||this.token!==token)return;
      root.innerHTML='<p role="status">The walkthrough could not load.</p><button type="button">Retry</button>';
      root.querySelector('button').onclick=()=>this.connectedCallback();
    }).finally(()=>{if(this.token===token)this.mounting=false;});
  }
  disconnectedCallback(){
    this.token=null;this.mounting=false;this.player?.destroy();this.player=null;
  }
}
if(!customElements.get('vivid-walkthrough'))customElements.define('vivid-walkthrough',VividWalkthrough);
