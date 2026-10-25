// Run from the repository root with the installed gstack Playwright runtime.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:375,height:812}});
await page.goto('http://127.0.0.1:4321/app');await page.waitForTimeout(300);
const values=await page.evaluate(()=>{
 const host=document.createElement('section');host.style.background='#fff';host.innerHTML=`<button class="btn-primary">Primary</button><button class="btn-public-action">Public</button><button class="btn-public-publish">Publish</button><button class="btn-vault-generate">Generate</button><button class="btn-ghost-sm">Ghost</button><p class="notice-box notice-info">Information</p><p class="notice-box notice-success">Success</p><p class="notice-box notice-warn">Warning</p><p class="notice-box notice-error">Error</p><div class="passphrase-strength" data-level="weak"><p>Weak</p></div><div class="passphrase-strength" data-level="fair"><p>Fair</p></div><div class="passphrase-strength" data-level="strong"><p>Strong</p></div><div class="private-key-card"><input class="input" aria-label="Fixture"/><p class="private-key-section-body">Vault help</p></div><input class="input" aria-label="Fixture 2"/><div class="drop-zone">Drop area</div>`;document.querySelector('#app-workspace').append(host);
 return [...host.querySelectorAll('button,.notice-box,.passphrase-strength p,.private-key-section-body,input,.drop-zone')].map(el=>{const s=getComputedStyle(el);let p=el,bg=s.backgroundColor;while(bg==='rgba(0, 0, 0, 0)'&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{label:el.textContent||el.className,fg:s.color,bg,border:s.borderTopColor,input:el.matches('input,.drop-zone')};});
});
const channel=v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4};
const lum=rgb=>{const [r,g,b]=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(channel);return .2126*r+.7152*g+.0722*b};
const contrast=(a,b)=>{const aa=lum(a),bb=lum(b);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05)};
for(const v of values){v.ratio=Number(contrast(v.fg,v.bg).toFixed(2));assert(v.ratio>=4.5,JSON.stringify(v));if(v.input){v.borderRatio=Number(contrast(v.border,v.bg).toFixed(2));assert(v.borderRatio>=3,JSON.stringify(v));}}
await page.getByLabel('Email address for public key lookup').first().focus();const focus=await page.getByLabel('Email address for public key lookup').first().evaluate(el=>({outline:getComputedStyle(el).outlineColor,width:getComputedStyle(el).outlineWidth,offset:getComputedStyle(el).outlineOffset}));assert.equal(focus.width,'3px');assert.equal(focus.offset,'4px');
await page.emulateMedia({reducedMotion:'reduce'});const motion=await page.locator('#tab-encrypt').evaluate(el=>getComputedStyle(el).animationName);assert.equal(motion,'none');
await page.goto('http://127.0.0.1:4321/invite');await page.waitForTimeout(300);const invitationFocus=await page.getByRole('link',{name:'Go to the app'}).evaluate(el=>{el.focus();return getComputedStyle(el).outlineWidth});assert.equal(invitationFocus,'3px');
await writeFile('/tmp/issue4-contrast-results.json',JSON.stringify({values,focus,reducedMotion:motion,invitationFocus},null,2));console.log(JSON.stringify({values,focus,reducedMotion:motion,invitationFocus},null,2));await browser.close();
