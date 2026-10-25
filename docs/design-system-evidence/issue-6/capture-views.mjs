// BEFORE must run against base source. Requires local Astro and installed gstack Playwright.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Specify before or after');
const dir = process.cwd()+'/docs/design-system-evidence/issue-6';
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures = [];
const states = [['mobile',375,812],['tablet',768,1024],['desktop',1280,720]];
if (phase==='after') states.push(['reflow',320,900],['text-200',768,1024],['table-scrolled',375,812],['focus',1280,720]);
for (const [state,width,height] of states) {
  const page = await browser.newPage({ viewport: { width,height } });
  await page.goto(base+'/how-it-works');
  await page.evaluate(async()=>{ await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode().catch(()=>{});})); document.querySelector('astro-dev-toolbar')?.remove(); });
  if(state==='text-200') await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(state==='table-scrolled') { await page.locator('.marketing-table-region').focus(); await page.locator('.marketing-table-region').evaluate(el=>el.scrollLeft=el.scrollWidth); }
  if(state==='focus') for(let i=0;i<5;i++) await page.keyboard.press('Tab');
  const file = `${phase}-guide-${state}.png`;
  await page.screenshot({path:dir+'/'+file,fullPage:!['focus','table-scrolled'].includes(state)});
  const png=await readFile(dir+'/'+file);
  captures.push({file,phase,route:'/how-it-works',state,viewport:{width,height},image:{width:png.readUInt32BE(16),height:png.readUInt32BE(20)},sha256:createHash('sha256').update(png).digest('hex')});
  await page.close();
}
await browser.close();
await writeFile(`/tmp/issue6-${phase}-manifest.json`, JSON.stringify(captures,null,2));
console.log('Captured',captures.length,phase,'views');
