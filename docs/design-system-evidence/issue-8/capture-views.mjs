// Run BEFORE only against the clean base. Local synthetic/empty states; no service calls.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
const phase=process.argv[2];
if(!['before','after'].includes(phase)) throw new Error('Specify before or after');
const dir=process.cwd()+'/docs/design-system-evidence/issue-8';
const base=process.env.BASE_URL || 'http://127.0.0.1:4321';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
const states=[['mobile',375,812],['tablet',768,1024],['desktop',1280,720]];
for(const [surface,route] of [['security','/security'],['home','/'],['guide','/how-it-works'],['invite','/invite'],['app','/app?tab=encrypt'],['generate','/app?tab=keyring']]) {
  const views=surface==='security' && phase==='after' ? [...states,['reflow',320,900],['text-200',768,1024],['focus',1280,720]] : states;
  for(const [state,width,height] of views) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto(base+route); await page.waitForTimeout(800);
    await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode().catch(()=>{});}));document.querySelector('astro-dev-toolbar')?.remove();});
    if(surface==='generate') await page.getByRole('button',{name:/Generate a new key pair/i}).click();
    await page.evaluate(()=>window.scrollTo(0,0));
    if(state==='text-200') await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    if(state==='focus') { await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); }
    const file=`${phase}-${surface}-${state}.png`;
    await page.screenshot({path:dir+'/'+file,fullPage:state!=='focus'});
    const png=await readFile(dir+'/'+file);
    captures.push({file,phase,route,state:surface==='generate'?'generation-notice-'+state:state,viewport:{width,height},image:{width:png.readUInt32BE(16),height:png.readUInt32BE(20)},sha256:createHash('sha256').update(png).digest('hex')});
    await page.close();
  }
}
await browser.close();
await writeFile(`/tmp/issue8-${phase}-manifest.json`,JSON.stringify(captures,null,2));
console.log('Captured',captures.length,phase,'views');
