// Local-only Security QA using installed gstack Playwright. No keys or network-service actions.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({headless:true});
const base = process.env.BASE_URL || 'http://127.0.0.1:4329';
const results = {checks:[],contrast:[],pageErrors:[]};
const check = (name,details) => results.checks.push({name,details});
for(const width of [320,375,768,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',error=>results.pageErrors.push(error.message));
  await page.goto(base+'/security');
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('h2').count(),6);
  assert.equal(await page.getByRole('region').count(),6);
  assert.equal(await page.locator('.security-safeguards li').count(),4);
  assert.equal(await page.locator('.security-limitations li').count(),6);
  assert.equal(await page.locator('.never-list li').count(),7);
  assert.equal(await page.locator('.local-card').count(),6);
  assert.equal(await page.locator('.cloud-card').count(),6);
  assert.equal(await page.locator('.hardening-card').count(),8);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  check('complete sections and reflow '+width,'one h1, six named h2 sections, 4 safeguards/6 limits, 6 local/6 network/7 never-upload/8 measure items; no document overflow');
  assert.equal(await page.locator('[aria-current="page"]').getAttribute('href'),'/security');
  for(const href of ['/how-it-works','/security','/app']) {
    const r=await page.locator('.header-nav a[href="'+href+'"]').boundingBox();
    assert.ok(r.x>=0 && r.x+r.width<=width && r.height>=44);
  }
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.marketing-skip-link').evaluate(el=>el===document.activeElement),true);
  for(const selector of ['.header-logo','.header-nav a[href="/how-it-works"]','.header-nav a[href="/security"]','.header-cta']) {
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).outlineWidth),'3px');
  }
  check('header keyboard navigation '+width,'skip, logo, guide, security, app reached in order; 44px header targets and 3px focus');
  await page.goto(base+'/security');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('main').evaluate(el=>el===document.activeElement),true);
  const visited=[];
  for(let i=0;i<5;i++) {
    await page.keyboard.press('Tab');
    const active=await page.evaluate(()=>{const el=document.activeElement,s=getComputedStyle(el),r=el.getBoundingClientRect();return {text:el.textContent.trim(),outline:s.outlineWidth,top:r.top,header:document.querySelector('.site-header').getBoundingClientRect().bottom};});
    assert.equal(active.outline,'3px'); assert.ok(active.top>=active.header,JSON.stringify(active));
    visited.push(active.text);
  }
  assert.deepEqual(visited,['keys.openpgp.org','private-key protections and limits','Open CryptDrop →','View CryptDrop source on GitHub','See How It Works']);
  check('bypass and security keyboard traversal '+width,visited);
  await page.locator('#never-transmitted a').click();
  assert.equal(new URL(page.url()).hash,'#private-key-security');
  const anchor=await page.locator('#private-key-security').boundingBox();
  const header=await page.locator('.site-header').boundingBox();
  assert.ok(anchor.y>=header.y+header.height);
  check('private-key anchor '+width,'click scrolls to preserved private-key section, clear of sticky header');
  const styles=await page.evaluate(()=>({safeguard:getComputedStyle(document.querySelector('.security-safeguards')).borderTopStyle,limit:getComputedStyle(document.querySelector('.security-limitations')).borderTopStyle,columns:getComputedStyle(document.querySelector('#private-key-security .security-grid')).gridTemplateColumns.split(' ').length}));
  assert.equal(styles.safeguard,'solid'); assert.equal(styles.limit,'dashed');
  assert.equal(styles.columns,width<640?1:2);
  check('noncolor disclosures and responsive layout '+width,styles);
  if(width===768) {
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    const overflow=await page.locator('main p, main li, main h3').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.slice(0,60)));
    assert.deepEqual(overflow,[]);
    check('200% root text at 768','no document or paragraph/list/heading overflow; not native browser zoom');
    await page.evaluate(()=>{document.documentElement.style.fontSize='';const style=document.createElement('style');style.textContent='main * {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;} main p {margin-bottom:2em!important;}';document.head.append(style);});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    check('text spacing at 768','line/letter/word/paragraph overrides retain document reflow');
  }
  if(width===1280) {
    await page.locator('.marketing-cta-primary').focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    results.contrast=await page.evaluate(()=>{
      const rgb=h=>h.startsWith('#')?h.slice(1).match(/../g).map(v=>parseInt(v,16)):h.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return [
        ['.security-hero h1','#312e81',3],['.security-hero p','#312e81',4.5],
        ['#local-processing h2','#f0fdf4',3],['#local-processing .marketing-lead','#f0fdf4',4.5],
        ['.local-card h3','#ffffff',4.5],['.local-card p','#ffffff',4.5],
        ['#private-key-security .marketing-lead','#ffffff',4.5],['.security-safeguards h3','#ffffff',4.5],['.security-safeguards li','#ffffff',4.5],
        ['.security-limitations h3','#fffbeb',4.5],['.security-limitations li','#fffbeb',4.5],['.key-security-guidance','#ffffff',4.5],
        ['#network-requests .marketing-lead','#fffbeb',4.5],['#network-requests a','#fffbeb',4.5],['.cloud-meta','#ffffff',4.5],
        ['#never-transmitted .marketing-lead','#fff1f2',4.5],['.never-item','#ffffff',4.5],
        ['#security-measures .marketing-lead','#eef2ff',4.5],['.hardening-card h3','#ffffff',4.5],['.hardening-card p','#ffffff',4.5],
        ['#review-source .marketing-lead','#ffffff',4.5],['.marketing-cta-primary','#4f46e5',4.5],['.marketing-cta-secondary','#ffffff',4.5],
        ['.security-limitations','#fffbeb',3,'borderTopColor'],['.marketing-cta-secondary','#ffffff',3,'borderTopColor'],
        ['.marketing-cta-primary','#ffffff',3,'outlineColor'],
      ].map(([selector,background,min,property='color'])=>{const color=getComputedStyle(document.querySelector(selector))[property],a=lum(color),b=lum(background);return {selector,property,color,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),min};});
    });
    for(const pair of results.contrast) assert.ok(pair.ratio>=pair.min,JSON.stringify(pair));
    check('contrast','26 representative rendered text/boundary/focus pairs meet thresholds, conservative hero/gradient endpoint');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.marketing-cta-primary').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    check('reduced motion','CTA transition disabled; no automatic page animation');
    for(const [selector,target] of [['.marketing-cta-primary','/app'],['#review-source a[href="/how-it-works"]','/how-it-works'],['.header-logo','/']]) {
      await page.goto(base+'/security'); await page.locator(selector).click();
      assert.equal(new URL(page.url()).pathname.replace(/\/$/,'') || '/',target);
    }
    check('actual local navigation clicks','app CTA, guide CTA and logo navigate to /app, /how-it-works and /');
  }
  await page.close();
}
assert.deepEqual(results.pageErrors,[]);
await browser.close();
await writeFile('/tmp/issue7-browser-results.json',JSON.stringify(results,null,2));
console.log('PASS',results.checks.length,'checks;',results.contrast.length,'contrast pairs; zero runtime errors');
