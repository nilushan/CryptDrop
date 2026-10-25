// Run against base source for BEFORE; current source for AFTER. Requires local Astro.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Specify before or after');
const dir = process.cwd()+'/docs/design-system-evidence/issue-5';
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures = [];
async function load(page, route) {
  await page.goto(base+route);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
}
async function save(page,file,route,state,viewport,fullPage=true) {
  await page.screenshot({ path: dir+'/'+file, fullPage });
  const png = await readFile(dir+'/'+file);
  captures.push({ file,phase,route,state,viewport,image: { width: png.readUInt32BE(16),height: png.readUInt32BE(20) },sha256: createHash('sha256').update(png).digest('hex') });
}
for (const [name,width,height] of [['mobile',375,812],['tablet',768,1024],['desktop',1280,720]]) {
  const page = await browser.newPage({ viewport: { width,height } });
  for (const [state,route] of [['home','/'],['guide','/how-it-works'],['security','/security'],['invite','/invite'],['app','/app?tab=encrypt']]) {
    await load(page,route);
    await save(page,`${phase}-${state}-${name}.png`,route,state,{ width,height });
  }
  await page.close();
}
if(phase==='after') {
  for(const [state,width,height] of [['reflow',320,900],['table-scrolled',375,812],['text-200',768,1024],['focus',1280,720]]) {
    const page = await browser.newPage({viewport:{width,height}});
    await load(page,'/');
    if(state==='table-scrolled') {
      await page.locator('.marketing-table-region').focus();
      await page.locator('.marketing-table-region').evaluate(el=>el.scrollLeft=el.scrollWidth);
    }
    if(state==='text-200') await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    if(state==='focus') for(let i=0;i<5;i++) await page.keyboard.press('Tab');
    await save(page,`after-home-${state}.png`,'/',state,{width,height},!['table-scrolled','focus'].includes(state));
    await page.close();
  }
}
await browser.close();
await writeFile(`/tmp/issue5-${phase}-manifest.json`, JSON.stringify(captures,null,2));
console.log('Captured',captures.length,phase,'views');
