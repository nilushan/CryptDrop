// Local-only guide QA using installed gstack Playwright. No keys or network-service actions.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless:true });
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
const results = { checks:[],contrast:[],pageErrors:[] };
const check = (name,details) => results.checks.push({name,details});
for(const width of [320,375,768,1280]) {
  const page = await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',error=>results.pageErrors.push(error.message));
  await page.goto(base+'/how-it-works');
  await page.evaluate(async()=>{ document.querySelector('astro-dev-toolbar')?.remove(); await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode();})); });
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('h2').count(),5);
  assert.equal(await page.locator('ol.story-steps > li').count(),9);
  assert.equal(await page.locator('th[scope="row"]').count(),6);
  assert.equal(await page.locator('main img').count(),12);
  assert.ok(await page.locator('main img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0 && img.alt.length>30)));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  check('semantics, loaded images and document reflow '+width,'one h1, five h2, nine ordered steps, six row headers, twelve loaded meaningful images; no document overflow');
  for(const href of ['/how-it-works','/security','/app']) {
    const link=page.locator('.header-nav a[href="'+href+'"]');
    const r=await link.boundingBox(); assert.ok(r.x>=0 && r.x+r.width<=width && r.height>=44);
  }
  assert.equal(await page.locator('[aria-current="page"]').getAttribute('href'),'/how-it-works');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.marketing-skip-link').evaluate(el=>el===document.activeElement),true);
  for(const selector of ['.header-logo','.header-nav a[href="/how-it-works"]','.header-nav a[href="/security"]','.header-cta']) {
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).outlineWidth),'3px');
  }
  check('header keyboard order/focus '+width,'skip, logo, guide, security, app reached; nav links have 44px targets and 3px focus');
  await page.goto(base+'/how-it-works');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('main').evaluate(el=>el===document.activeElement),true);
  const visited=[];
  for(let i=0;i<10;i++) {
    await page.keyboard.press('Tab');
    const active=await page.evaluate(()=>{const el=document.activeElement,s=getComputedStyle(el),r=el.getBoundingClientRect();return {tag:el.tagName,text:el.textContent.trim().slice(0,80),outline:s.outlineWidth,top:r.top,header:document.querySelector('.site-header').getBoundingClientRect().bottom};});
    assert.equal(active.outline,'3px'); assert.ok(active.top>=active.header,JSON.stringify(active));
    visited.push(active.text);
    if(active.text==='Security and network-service details') break;
  }
  assert.ok(visited.includes('Read about network services and protection limits'));
  assert.ok(visited.includes('Open CryptDrop →'));
  check('bypass and guide/footer keyboard traversal '+width,visited);
  const region=page.getByRole('region',{name:'Padlock analogy and OpenPGP'});
  await region.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  if(width<768) assert.ok(await region.evaluate(el=>el.scrollLeft)>0);
  check('local table keyboard scroll '+width,{width:await region.evaluate(el=>el.clientWidth),scrollWidth:await region.evaluate(el=>el.scrollWidth)});
  // Alternation is presentation only; source order stays image then narrative on every step.
  const order=await page.locator('.story-step.reverse .story-image').first().evaluate(el=>getComputedStyle(el).order);
  assert.equal(order,width>=768?'2':'0');
  check('story responsive order '+width,'all steps retain image then narrative DOM; desktop alternating layout, mobile single column');
  if(width===768) {
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    check('200% root text at 768','no document overflow; not native browser zoom');
    await page.evaluate(()=>{document.documentElement.style.fontSize='';const s=document.createElement('style');s.textContent='main * { line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important; } main p { margin-bottom:2em!important; }';document.head.append(s);});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    check('WCAG text spacing override at 768','no document overflow');
  }
  if(width===1280) {
    results.contrast=await page.evaluate(()=>{
      const rgb=h=>h.startsWith('#')?h.slice(1).match(/../g).map(v=>parseInt(v,16)):h.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return [['.guide-hero h1','#fef2f2',3],['.guide-hero p','#fef2f2',4.5],['#problem .guide-prose p:not(.chapter-label)','#fef2f2',4.5],['.chapter-label','#fef2f2',4.5],['.threat-cards li','#ffffff',4.5],['#old-world .marketing-lead','#eef2ff',4.5],['#padlock-solution .marketing-lead','#f9fafb',4.5],['.story-text h3','#f9fafb',4.5],['.story-text > p:last-child','#f9fafb',4.5],['.step-label','#f9fafb',4.5],['.step-number','#4f46e5',4.5],['#openpgp .marketing-lead','#f0fdf4',4.5],['#openpgp .guide-prose p:not(.chapter-label)','#f0fdf4',4.5],['#openpgp a','#f0fdf4',4.5],['.marketing-table-hint','#f0fdf4',4.5],['.marketing-table th','#ffffff',4.5],['.col-tech','#ffffff',4.5],['.marketing-table td:last-child','#ffffff',4.5],['#start-encrypting .marketing-lead','#eef2ff',4.5],['.marketing-cta','#4f46e5',4.5]].map(([selector,background,min])=>{const color=getComputedStyle(document.querySelector(selector)).color,a=lum(color),b=lum(background);return {selector,color,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),min};});
    });
    for(const p of results.contrast) assert.ok(p.ratio>=p.min,JSON.stringify(p));
    check('contrast','20 rendered text pairs meet AA normal/large text thresholds; conservative gradient endpoints');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.marketing-cta').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    await page.locator('.story-image').first().hover();
    assert.equal(await page.locator('.story-image').first().evaluate(el=>getComputedStyle(el).transform),'none');
    check('reduced motion','CTA transition off; no image hover scaling or automatic story animation');
    for(const [selector,target] of [['.marketing-cta','/app'],['#openpgp a','/security'],['.header-logo','/']]) {
      await page.goto(base+'/how-it-works'); await page.locator(selector).click();
      assert.equal(new URL(page.url()).pathname.replace(/\/$/,'') || '/',target);
    }
    check('navigation clicks','guide CTA opens app; disclosure opens security; logo opens homepage');
  }
  await page.close();
}
assert.deepEqual(results.pageErrors,[]);
await browser.close();
await writeFile('/tmp/issue6-browser-results.json',JSON.stringify(results,null,2));
console.log('PASS',results.checks.length,'checks;',results.contrast.length,'contrast pairs; zero runtime errors');
