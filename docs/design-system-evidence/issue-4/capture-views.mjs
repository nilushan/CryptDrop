// Run from the repository root with the installed gstack Playwright runtime.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Specify before (base source only) or after');
const dir = process.cwd()+'/docs/design-system-evidence/issue-4';
await mkdir(dir,{recursive:true});
const browser = await chromium.launch({headless:true});
const captures=[];
for (const [name,width,height] of [['mobile',375,812],['tablet',768,1024],['desktop',1280,720]]) {
 const page=await browser.newPage({viewport:{width,height}});
 for(const state of ['encrypt','decrypt','keyring','contacts','wizard','invite']) {
  const route=state==='invite'?'/invite':'/app?tab='+ (state==='contacts'?'addressbook':state);
  await page.goto('http://127.0.0.1:4321'+route); await page.waitForTimeout(700);
  await page.evaluate(()=>document.querySelector('astro-dev-toolbar')?.remove());
  const file=`${phase}-${state}-${name}.png`;
  await page.screenshot({path:dir+'/'+file,fullPage:true});
  const png=await readFile(dir+'/'+file);
  captures.push({file,phase,route,state,viewport:{width,height},image:{width:png.readUInt32BE(16),height:png.readUInt32BE(20)},sha256:createHash('sha256').update(png).digest('hex')});
 }
 await page.close();
}
await browser.close();
await writeFile(`/tmp/issue4-${phase}-manifest.json`,JSON.stringify(captures,null,2));
console.log('Captured',captures.length,phase,'views');
