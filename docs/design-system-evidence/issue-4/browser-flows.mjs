// Run from the repository root with the installed gstack Playwright runtime.
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || homedir()+'/.agents/skills/gstack/node_modules/playwright/index.mjs').href);
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base='http://127.0.0.1:4321';
const dir=process.cwd()+'/docs/design-system-evidence/issue-4';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true});
const page=await context.newPage(); const notes=[],captures=[], errors=[];
page.on('pageerror',e=>errors.push(e.message));
let publicKey='';
await context.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path.startsWith('/api/lookup/')) return route.fulfill({json:path.includes('missing')?{found:false,email:'missing@example.test'}:{found:true,email:'synthetic@example.test',publicKey,source:'registry'}});
 if(path.startsWith('/api/invite/')) {
  const token=path.split('/').at(-1);
  if(token==='failure') return route.fulfill({status:503,json:{error:'Synthetic unavailable'}});
  return route.fulfill({json:{valid:token==='synthetic',senderName:'Synthetic Sender',token,status:token==='accepted'?'accepted':'expired'}});
 }
 return route.fulfill({json:{ok:true,token:'synthetic',invitationsAccepted:0}});
});
await context.route('https://keys.openpgp.org/**',route=>route.fulfill({status:404,body:'Synthetic not found'}));
const visible=selector=>page.locator('.tab-panel:not([hidden])').locator(selector);
async function tab(id){await page.locator('#nav-'+id).click(); await page.waitForTimeout(150);}
async function capture(state,name='desktop',width=1280,height=720){
 await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);await page.locator('.toast-message').waitFor({state:'hidden',timeout:6000});await page.evaluate(()=>document.querySelector('astro-dev-toolbar')?.remove());
 const file=`after-${state}-${name}.png`;await page.screenshot({path:dir+'/'+file,fullPage:true});const png=await readFile(dir+'/'+file);
 captures.push({file,phase:'after',route:new URL(page.url()).pathname+new URL(page.url()).search,state,viewport:{width,height},image:{width:png.readUInt32BE(16),height:png.readUInt32BE(20)},sha256:createHash('sha256').update(png).digest('hex')});
}
async function responsive(state){for(const [n,w,h] of [['mobile',375,812],['tablet',768,1024],['desktop',1280,720]]) await capture(state,n,w,h);}
async function noOverflow(state,width=320){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);const dims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));if(dims.document>dims.viewport) console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})).slice(0,20)));if(dims.document>dims.viewport) console.log(await page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const a=[];while(w.nextNode()){const r=document.createRange();r.selectNode(w.currentNode);if(r.getBoundingClientRect().right>innerWidth)a.push([w.currentNode.textContent,r.getBoundingClientRect().right,w.currentNode.parentElement.className]);}return a}));assert.equal(dims.document,dims.viewport,`${state} overflow ${JSON.stringify(dims)}`);notes.push(`${state}: no document overflow at ${width}px`);}
await page.goto(base+'/app');await page.waitForTimeout(700);
// Desktop arrow navigation; cross-panel focus and selection semantics.
await page.locator('#nav-encrypt').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#nav-decrypt').getAttribute('aria-selected'),'true');
await page.keyboard.press('End');assert.equal(await page.locator('#nav-wizard').getAttribute('aria-selected'),'true');await page.keyboard.press('Home');
await page.setViewportSize({width:375,height:812});await page.locator('#nav-encrypt').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#nav-decrypt').getAttribute('aria-selected'),'true');
await visible('input[type=file]').first().setInputFiles({name:'synthetic-invalid.pgp',mimeType:'application/octet-stream',buffer:Buffer.from('fixture')});
assert(await page.getByRole('button',{name:'Unlock File',exact:true}).isDisabled());await page.getByRole('button',{name:/Load matching key/}).click();assert(await page.locator('#tab-keyring').evaluate(el=>el.contains(document.activeElement)));
notes.push('Desktop Down/End/Home and mobile Right tabs select one panel; cross-panel load-key action transfers focus; key absence gates unlock, not file selection.');
await page.setViewportSize({width:1280,height:720});
await page.getByRole('button',{name:/Generate a New Key Pair/}).click();
await visible('input[type=text]').fill('Synthetic Example');await visible('input[type=email]').fill('synthetic@example.test');await visible('input[type=password]').fill('Synthetic orbit violet 738!');
await page.getByText('Passphrase',{exact:true}).first().click();assert.equal(await page.evaluate(()=>document.activeElement.type),'password');await page.keyboard.press('Tab');assert.match(await page.evaluate(()=>document.activeElement.textContent),/Generate Keys/);
await noOverflow('Generation');await capture('generation-filled','mobile',375,812);
await page.setViewportSize({width:1280,height:720});
const downloads=[];page.on('download',d=>downloads.push(d));await page.getByRole('button',{name:'Generate Keys & Download'}).click();await page.getByRole('button',{name:'Back up your secret'}).waitFor();
while(downloads.length<2)await page.waitForTimeout(100);
const privateDownload=downloads.find(d=>d.suggestedFilename().includes('PRIVATE'));const publicDownload=downloads.find(d=>d.suggestedFilename().includes('PUBLIC'));
const privatePath=await privateDownload.path();publicKey=await readFile(await publicDownload.path(),'utf8');
assert(await page.getByRole('button',{name:'Done — View My Key Ring'}).isDisabled());
await page.getByRole('button',{name:'Back up your secret'}).click();await page.getByRole('button',{name:'Verify backup',exact:true}).waitFor();
await page.getByRole('checkbox',{name:/I saved the key/}).check();await page.getByLabel('Private key file retrieved from your backup').setInputFiles({name:'synthetic-retrieved-private.asc',mimeType:'text/plain',buffer:await readFile(privatePath)});await page.getByLabel('Backup passphrase').fill('incorrect fixture');await page.getByRole('button',{name:'Verify backup',exact:true}).click();await visible('[role=alert]').waitFor();
await capture('backup-error');await page.getByLabel('Backup passphrase').fill('Synthetic orbit violet 738!');await page.getByRole('button',{name:'Verify backup',exact:true}).click();await page.getByText('Backup verified.',{exact:true}).waitFor();await responsive('backup-verified');
await page.getByRole('button',{name:'Done — View My Key Ring'}).click();await page.getByRole('button',{name:'Remember on this device'}).waitFor();await responsive('keyring-loaded');
await page.getByRole('button',{name:'Remember on this device'}).click();await page.getByRole('button',{name:'Forget saved key'}).waitFor();await page.reload();await page.getByLabel('Saved key passphrase').waitFor();
await page.getByLabel('Saved key passphrase').fill('wrong fixture');await page.getByRole('button',{name:'Unlock Saved Key'}).click();await visible('[role=alert]').waitFor();assert.match(await page.getByLabel('Saved key passphrase').getAttribute('aria-describedby'),/error/);
await page.getByLabel('Saved key passphrase').fill('Synthetic orbit violet 738!');await page.getByRole('button',{name:'Unlock Saved Key'}).click();await page.getByRole('button',{name:'Forget saved key'}).waitFor();await page.getByRole('button',{name:'Forget saved key'}).click();
notes.push('Real local Curve25519 generation, automatic private/public downloads, wrong and correct backup-passphrase checks, Done gate, Remember → reload → wrong/correct restore → Forget all exercised with synthetic identity. No network service contacted.');
// Reimport the synthetic private key through the shared labeled form.
await page.getByRole('button',{name:'Replace keys'}).click();await page.getByRole('button',{name:/Import Existing Key/}).click();await visible('input[type=file]').setInputFiles({name:'synthetic-retrieved-private.asc',mimeType:'text/plain',buffer:await readFile(privatePath)});await page.getByLabel('Key passphrase (if protected)').fill('incorrect');await page.getByRole('button',{name:'Import Keys',exact:true}).click();await visible('[role=alert]').waitFor();await responsive('import-error');await page.getByLabel('Key passphrase (if protected)').fill('Synthetic orbit violet 738!');await page.getByRole('button',{name:'Import Keys',exact:true}).click();await page.getByRole('button',{name:'Replace keys'}).waitFor();
notes.push('Shared key import: wrong passphrase produces durable associated error, successful retry returns loaded key; private key only read locally.');
await tab('addressbook');await visible('input[type=file]').setInputFiles({name:'synthetic-public.asc',mimeType:'text/plain',buffer:Buffer.from(publicKey)});await page.getByRole('button',{name:'Remove contact synthetic@example.test'}).waitFor();await responsive('contacts-populated');await noOverflow('Populated contacts');await page.getByRole('button',{name:'Refresh key for synthetic@example.test'}).click();await page.waitForTimeout(100);
// Missing lookup to invitation send with request fixture.
await page.getByLabel('Email address for public key lookup').filter({visible:true}).fill('missing@example.test');await visible('button').filter({hasText:'Find Key'}).click();await page.getByRole('button',{name:'Send Invitation'}).waitFor();await page.getByRole('button',{name:'Send Invitation'}).click();await page.getByText(/Invitation sent! They'll get/).waitFor();await capture('contact-invitation-sent');
// Direct unsigned encryption, then signed encryption in guided setup.
await tab('encrypt');await page.getByRole('button',{name:/Synthetic Example synthetic@example.test/}).click();
const filename='synthetic-long-filename-for-responsive-file-card-check.txt';const payload=Buffer.from('Synthetic CryptDrop UI round trip. No private user data.');await visible('input[type=file]').setInputFiles({name:filename,mimeType:'text/plain',buffer:payload});await page.getByRole('button',{name:'Encrypt File',exact:true}).click();await page.getByRole('heading',{level:3,name:'File Locked!',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{level:3,name:'File Locked!',exact:true}).getAttribute('aria-live'),'polite');await responsive('encrypt-result');
const unsignedD=page.waitForEvent('download');await page.getByRole('button',{name:'Download '+filename+'_for_synthetic@example.test.pgp',exact:true}).click();const unsignedPath=await (await unsignedD).path();
await tab('wizard');await page.getByRole('button',{name:/Encrypt a File/}).click();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Find a recipient.');await page.getByRole('button',{name:/Synthetic Example synthetic@example.test/}).click();await visible('input[type=file]').setInputFiles({name:filename,mimeType:'text/plain',buffer:payload});await page.getByRole('checkbox',{name:/Prove it came from me/}).check();await page.getByRole('button',{name:'Encrypt & Sign',exact:true}).click();await page.getByRole('heading',{level:3,name:'File Locked!',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{level:3,name:'File Locked!',exact:true}).getAttribute('aria-live'),'polite');await capture('wizard-encrypt-result');const signedD=page.waitForEvent('download');await page.getByRole('button',{name:'Download '+filename+'_for_synthetic@example.test.pgp',exact:true}).click();const signedPath=await (await signedD).path();
notes.push('Contacts public-file import and full fingerprint/actions, fixture refresh, missing-key invitation send; direct unsigned encryption and guided signed encryption use the same file/result controls. Wizard step focus checked.');
await tab('decrypt');if(await page.getByRole('button',{name:'Remove file',exact:true}).count()) await page.getByRole('button',{name:'Remove file',exact:true}).click();await visible('input[type=file]').setInputFiles({name:filename+'.pgp',mimeType:'application/pgp-encrypted',buffer:await readFile(signedPath)});await page.getByRole('button',{name:/Synthetic Example synthetic@example.test/}).click();await page.getByRole('button',{name:'Unlock File',exact:true}).click();await page.getByText('Signature verified',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{level:3,name:'File Unlocked!',exact:true}).getAttribute('aria-live'),'polite');await responsive('decrypt-verified');await noOverflow('Decryption result');
const decryptedD=page.waitForEvent('download');await page.getByRole('button',{name:'Download '+filename,exact:true}).click();assert.deepEqual(await readFile(await (await decryptedD).path()),payload);
await page.getByRole('button',{name:'Unlock another file'}).click();await visible('input[type=file]').setInputFiles({name:filename+'.pgp',mimeType:'application/pgp-encrypted',buffer:await readFile(unsignedPath)});await page.getByRole('button',{name:'Unlock File',exact:true}).click();await page.getByRole('heading',{level:3,name:'File Unlocked!',exact:true}).waitFor();assert.equal(await page.getByText('Signature verified',{exact:true}).count(),0);
await page.getByRole('button',{name:'Clear',exact:true}).filter({visible:true}).click();assert.equal(await visible('.history-list').count(),0);
notes.push('Signed decrypt with sender key reports verified and downloaded bytes equal source; unsigned decrypt succeeds without a verified label; history list/clear tested.');
// Wizard decrypt composition and reflow/text-resize.
await tab('wizard');await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:/Decrypt a File/}).click();await page.getByRole('button',{name:/Continue/}).click();await noOverflow('Wizard decrypt');await capture('wizard-decrypt','mobile',375,812);
await tab('keyring');await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await noOverflow('Loaded key 200% text',768);await capture('keyring-text-200','tablet',768,1024);await page.evaluate(()=>document.documentElement.style.fontSize='');
// Invitation states are isolated local fixtures, not live API calls.
for(const token of ['synthetic','expired','accepted','failure']){await page.goto(base+'/invite?token='+token);await page.waitForTimeout(300);if(token==='synthetic'){await page.getByRole('link',{name:'Set Up My Keys'}).waitFor();assert.match(await page.getByRole('link',{name:'Set Up My Keys'}).getAttribute('href'),/inviteToken=synthetic/);await responsive('invite-valid');}else {await page.getByRole('alert').waitFor();await capture('invite-'+token);}await noOverflow('Invitation '+token);}
notes.push('Invitation valid/expired/used/API failure fixtures, setup-token forwarding and 320px reflow checked. Text resizing is CSS root 200% emulation, not native zoom.');
await writeFile('/tmp/issue4-flow-manifest.json',JSON.stringify(captures,null,2));await writeFile('/tmp/issue4-flow-results.json',JSON.stringify({notes,errors},null,2));console.log(JSON.stringify({notes,errors,captures:captures.length},null,2));
await browser.close();
