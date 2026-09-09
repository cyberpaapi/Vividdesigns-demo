import {initHero} from './hero-player.js?v=native-reverse-4';

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
      const stage=document.createElement('div');stage.className='film-stage';
      stage.append(main.querySelector('canvas'),main.querySelector('.film-poster'),main.querySelector('.film-loading'));
      const controls=document.createElement('div');controls.className='film-controls';
      controls.append(main.querySelector('.film-hint'),main.querySelector('.film-tools'));
      main.prepend(stage,controls);
      css=css.replace('html,body',':host').replace("url('./media/poster.webp')",`url('${new URL('media/poster.webp',assets)}')`);
      const style=document.createElement('style');
      style.textContent=css+`
        :host{display:block;width:100%;height:auto;min-width:0;background:transparent;color:#171717}
        .film-hero{width:min(100%,calc((100svh - 86px)*1.77777778));margin:0 auto;height:auto;min-height:0;overflow:visible}
        .film-stage{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#10130f;color:#fff}
        .film-controls{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;background:#fff;color:#171717}
        .film-tools{position:static;flex-shrink:0;gap:10px}
        .film-tools button{background:#fff;color:#171717;border-color:#17171755}
        .film-tools button:not(:disabled):hover{background:#f0f0ed}
        .film-tools button:focus-visible{outline-color:#171717}
        .film-hint{position:static;text-align:left;color:#555;text-shadow:none;font-size:12px;line-height:1.4}
        @media(max-width:480px){.film-controls{gap:12px;padding:10px 12px}.film-hint{font-size:11px}}
      `;
      root.replaceChildren(style,main);
      this.player=initHero({standalone:true,native:true,reverseScroll:true,root,mediaBase:new URL('media',assets).href});
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
