// Local Chromium checks. No real keys, contact data, API fixtures or network operations needed.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
const results = { checks: [], contrast: [], pageErrors: [] };
const check = (name, details) => results.checks.push({ name, details });
for (const width of [320,375,768,1280]) {
  const page = await browser.newPage({ viewport: { width,height: 900 } });
  page.on('pageerror', error => results.pageErrors.push(error.message));
  for (const route of ['/','/how-it-works','/security','/invite','/app?tab=encrypt']) {
    await page.goto(base+route);
    await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
    const app = route.startsWith('/app');
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('app-layout')),app);
    assert.equal(await page.locator('.marketing-footer').count(),app ? 0 : 1);
    if (!app) {
      for (const href of ['/how-it-works','/security','/app']) {
        const link = page.locator('.header-nav a[href="'+href+'"]');
        assert.equal(await link.isVisible(),true,route+' '+width+' '+href);
        const box = await link.boundingBox();
        assert.ok(box.x >= 0 && box.x+box.width <= width && box.height >= 44);
      }
      if (route==='/how-it-works' || route==='/security') assert.equal(await page.locator('.header-nav [aria-current="page"]').getAttribute('href'),route);
    }
    check('shell '+route+' '+width,'mode/footer preserved; marketing information links and CTA visible with 44px targets; route state correct');
  }
  await page.goto(base+'/');
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  assert.equal(await page.getByRole('heading',{level:1}).count(),1);
  assert.equal(await page.getByRole('heading',{level:2}).count(),5);
  assert.equal(await page.locator('section[aria-labelledby]').count(),6);
  assert.equal(await page.locator('.how-steps > li').count(),3);
  assert.equal(await page.locator('th[scope="col"]').count(),5);
  assert.equal(await page.locator('th[scope="row"]').count(),7);
  assert.equal(await page.locator('caption').innerText(),'File sharing features by method');
  assert.ok((await page.locator('.marketing-table td').allTextContents()).every(text => /^(Yes(?: \*)?|No)$/.test(text)));
  const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth,viewport: innerWidth,table: document.querySelector('.marketing-table-region').scrollWidth }));
  assert.equal(overflow.doc,width,'homepage document overflow');
  check('homepage semantics/reflow '+width,overflow);
  // Native keyboard navigation includes every header link before testing the bypass.
  await page.keyboard.press('Tab');
  for (const selector of ['.header-logo','.header-nav a[href="/how-it-works"]','.header-nav a[href="/security"]','.header-cta']) {
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(selector).evaluate(el => el===document.activeElement),true);
    assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).outlineWidth),'3px');
    assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).outlineColor),'rgb(255, 255, 255)');
  }
  check('header keyboard order '+width,'logo, guide, security, app reached with white 3px focus');
  await page.goto(base+'/');
  // The bypass transfers focus into main without trapping the next Tab.
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.marketing-skip-link').evaluate(el => el===document.activeElement),true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('main').evaluate(el => el===document.activeElement),true);
  // Focus every real homepage link and the table region via the keyboard.
  const visited=[];
  for (let i=0;i<20;i++) {
    await page.keyboard.press('Tab');
    const focused=await page.evaluate(() => {
      const el=document.activeElement; const s=getComputedStyle(el); const r=el.getBoundingClientRect();
      return { tag:el.tagName,text:el.textContent.trim().slice(0,80),outline:s.outlineStyle,width:s.outlineWidth,top:r.top,bottom:r.bottom,header:document.querySelector('header.site-header').getBoundingClientRect().bottom };
    });
    if (focused.tag==='BODY') break;
    assert.equal(focused.outline,'solid'); assert.equal(focused.width,'3px');
    assert.ok(focused.top >= focused.header || focused.text==='Skip to content' || focused.top<focused.header && focused.text==='CryptDropEncrypted file sharing',JSON.stringify(focused));
    visited.push(focused.text);
    if (focused.text.includes('Security and network-service details')) break;
  }
  check('keyboard focus '+width,visited);
  const region=page.getByRole('region',{name:'File sharing comparison'});
  await region.focus();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  if(width<768) assert.ok(await region.evaluate(el=>el.scrollLeft)>0,'table arrow scrolling');
  check('local table keyboard scrolling '+width,'named region focused; ArrowRight scrolls when overflowing');
  if(width===768) {
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),768);
    check('200% root text resize at 768','no document overflow; local table scroller retained');
    await page.evaluate(() => {
      document.documentElement.style.fontSize='';
      const style=document.createElement('style');
      style.textContent='main * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } main p { margin-bottom: 2em !important; }';
      document.head.append(style);
    });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),768);
    check('text-spacing override at 768','no document overflow with 1.5 line/.12em letter/.16em word/2em paragraph spacing');
  }
  if(width===1280) {
    for (const [selector,target] of [['.marketing-cta-primary','/app'],['.marketing-cta-secondary','/how-it-works'],['.hero-note a','/security']]) {
      await page.goto(base+'/'); await page.locator(selector).first().click();
      assert.equal(new URL(page.url()).pathname.replace(/\/$/,''),target);
    }
    check('CTA navigation','primary /app, secondary /how-it-works, disclosure /security clicked successfully');
    await page.goto(base+'/');
    // Contrast against the palest hero and darkest header endpoints is conservative for these gradients.
    results.contrast=await page.evaluate(()=>{
      const rgb=h=>h.startsWith('#')?h.slice(1).match(/../g).map(v=>parseInt(v,16)):h.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return [['.hero-inner h1','#eef2ff',3],['.hero-sub','#eef2ff',4.5],['.hero-note','#eef2ff',4.5],['.hero-trust > span','#eef2ff',4.5],['.marketing-card p','#ffffff',4.5],['.marketing-lead','#f9fafb',4.5],['.how-step p','#f9fafb',4.5],['.marketing-table-note','#f9fafb',4.5],['.check','#ffffff',4.5],['.cross','#ffffff',4.5],['.marketing-footer','#f9fafb',4.5],['.header-nav-link','#3730a3',4.5],['.header-logo-tagline','#3730a3',4.5],['.header-cta','#ffffff',4.5],['.marketing-cta-primary','#4f46e5',4.5],['.marketing-cta-secondary','#ffffff',4.5]].map(([selector,background,min])=>{
        const color=getComputedStyle(document.querySelector(selector)).color; const a=lum(color),b=lum(background);return {selector,color,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),min};
      });
    });
    const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const addPair = (selector,color,background,min) => {
      const a=luminance(color),b=luminance(background);
      results.contrast.push({selector,color,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),min});
    };
    for(const selector of ['.marketing-cta-primary','.marketing-cta-secondary','.header-cta']) {
      const el=page.locator(selector).first(); await el.hover(); await page.waitForTimeout(200);
      const pair=await el.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
      addPair(selector+' hover',pair.color,pair.background,4.5);
    }
    await page.mouse.move(0,0); await page.waitForTimeout(200);
    for(const selector of ['.marketing-cta-secondary','.marketing-table-region']) {
      addPair(selector+' boundary',await page.locator(selector).first().evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(255,255,255)',3);
    }
    await page.keyboard.press('Tab');
    await page.locator('.marketing-table-region').focus();
    addPair('table focus on page',await page.locator('.marketing-table-region').evaluate(el=>getComputedStyle(el).outlineColor),'rgb(249,250,251)',3);
    addPair('header focus on lightest gradient endpoint','rgb(255,255,255)','rgb(55,48,163)',3);
    for(const pair of results.contrast) assert.ok(pair.ratio>=pair.min,JSON.stringify(pair));
    await page.emulateMedia({ reducedMotion:'reduce' });
    assert.equal(await page.locator('.marketing-cta').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    check('reduced motion','marketing CTA transition disabled');
  }
  await page.close();
}
assert.deepEqual(results.pageErrors,[]);
await browser.close();
await writeFile('/tmp/issue5-browser-results.json',JSON.stringify(results,null,2));
console.log('PASS',results.checks.length,'browser checks;',results.contrast.length,'contrast pairs; zero page errors');
