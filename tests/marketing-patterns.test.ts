import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { keySecuritySafeguards, keySecurityLimitations } from '../src/lib/key-security';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new NodeURL('../', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'cryptdrop-marketing-test-'));
const read = (route: string) => new DOMParser().parseFromString(readFileSync(join(output, route, 'index.html'), 'utf8'), 'text/html');
let home: Document;
let guide: Document;
let security: Document;

beforeAll(() => {
  // Test real Astro output, not a hand-maintained HTML fixture or regex over source.
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', output], { cwd: root, stdio: 'pipe' });
  home = read('');
  guide = read('how-it-works');
  security = read('security');
}, 30000);
afterAll(() => rmSync(output, { recursive: true, force: true }));

describe('homepage static marketing patterns', () => {
  it('renders named sections, one h1, a meaningful image and an ordered explanation without hydration', () => {
    expect(home.querySelectorAll('h1')).toHaveLength(1);
    expect(home.querySelectorAll('section[aria-labelledby]')).toHaveLength(6);
    for (const section of home.querySelectorAll('section[aria-labelledby]')) {
      expect(home.getElementById(section.getAttribute('aria-labelledby')!)?.textContent).toBeTruthy();
    }
    expect(home.querySelectorAll('ol.how-steps > li')).toHaveLength(3);
    expect(home.querySelector('img')?.getAttribute('alt')).toContain('private key');
    expect(home.querySelector('img')?.getAttribute('src')).toMatch(/^\/_astro\/hero-exposed-vs-encrypted\..+\.webp$/);
    expect(home.querySelectorAll('astro-island')).toHaveLength(0);
  });

  it('preserves CTA destinations, title and bypass navigation', () => {
    expect(home.title).toBe('CryptDrop — Encrypt Files for Anyone, Right in Your Browser');
    expect([...home.querySelectorAll('.marketing-cta-primary')].map(a => a.getAttribute('href'))).toEqual(['/app','/app']);
    expect([...home.querySelectorAll('.marketing-cta-secondary')].map(a => a.getAttribute('href'))).toEqual(['/how-it-works','/how-it-works','/how-it-works']);
    expect(home.querySelector('.marketing-skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(home.getElementById('main-content')?.getAttribute('tabindex')).toBe('-1');
  });

  it('retains table relationships and a named, described keyboard scroll region with textual answers', () => {
    const region = home.querySelector('.marketing-table-region')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('File sharing comparison');
    expect(region.getAttribute('tabindex')).toBe('0');
    for (const id of region.getAttribute('aria-describedby')!.split(' ')) expect(home.getElementById(id)?.textContent).toBeTruthy();
    expect(region.querySelector('caption')?.textContent).toBe('File sharing features by method');
    expect(region.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    expect(region.querySelectorAll('th[scope="row"]')).toHaveLength(7);
    expect(region.querySelectorAll('td')).toHaveLength(28);
    for (const cell of region.querySelectorAll('td')) expect(cell.textContent).toMatch(/^(Yes|No)/);
  });

  it('keeps approved local-processing, registration, offline and optional-signature qualifications', () => {
    const text = home.body.textContent!;
    expect(home.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('does not upload your file contents');
    expect(text).not.toMatch(/No servers|no backend|no database|we store nothing|verified automatically/);
    expect(text).toContain('required keys are available');
    expect(text).toContain('Key discovery and invitations need a network connection');
    expect(text).toContain('attempts to register your public key and identity');
    expect(text).toContain('CryptDrop registry, with keys.openpgp.org as a fallback');
    expect(text).toContain('Optionally sign with your private key');
    expect(text).toContain('add the sender’s public key to check its signature');
  });

  it('keeps shared marketing shell consumers and app mode separate', () => {
    for (const route of ['', 'how-it-works', 'security', 'invite']) {
      const doc = read(route);
      expect(doc.body.classList.contains('marketing-layout')).toBe(true);
      expect(doc.querySelectorAll('.header-nav a')).toHaveLength(3);
      expect(doc.querySelectorAll('.marketing-footer')).toHaveLength(1);
      expect(doc.querySelector('.marketing-skip-link')).not.toBeNull();
      expect(doc.querySelector('.header-logo svg')?.getAttribute('aria-hidden')).toBe('true');
      if (route === 'security' || route === 'how-it-works') expect(doc.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/'+route);
    }
    const app = read('app');
    expect(app.body.classList.contains('app-layout')).toBe(true);
    expect(app.querySelector('.skip-link')?.getAttribute('href')).toBe('#app-workspace');
    expect(app.querySelector('.marketing-footer')).toBeNull();
    expect(app.querySelector('.marketing-skip-link')).toBeNull();
    expect(read('security').getElementById('private-key-security')).not.toBeNull();
  });
});

describe('optimized marketing images', () => {
  it('ships responsive WebP assets with real dimensions, without copying original PNGs', async () => {
    expect(existsSync(join(output, 'images'))).toBe(false);
    const images = [...home.querySelectorAll('main img'), ...guide.querySelectorAll('main img')];
    expect(images).toHaveLength(13);
    for (const img of images) {
      const src = img.getAttribute('src')!;
      const name = src.split('/').at(-1)!.split('.')[0];
      const original = join(root, 'src/assets/images', name.startsWith('hero-') ? '' : 'story', `${name}.png`);
      const originalMetadata = await sharp(original).metadata();
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
      expect(img.getAttribute('sizes')).toContain('calc(100vw - 3rem)');
      expect(img.getAttribute('decoding')).toBe('async');
      const candidates = img.getAttribute('srcset')!.split(',').map(value => value.trim().split(/\s+/));
      expect(candidates).toHaveLength(4);
      for (const [url, descriptor] of [[src, `${img.getAttribute('width')}w`], ...candidates]) {
        expect(url).toMatch(/^\/_astro\/.+\.webp$/);
        const asset = join(output, url.slice(1));
        const metadata = await sharp(asset).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(Number(descriptor.slice(0, -1)));
        expect(metadata.width).toBeLessThanOrEqual(originalMetadata.width!);
        expect(metadata.width! / metadata.height!).toBeCloseTo(originalMetadata.width! / originalMetadata.height!, 2);
        expect(statSync(asset).size).toBeLessThan(statSync(original).size / 4);
      }
    }
  });

  it('prioritizes the homepage hero and lazily loads below-the-fold guide illustrations', () => {
    const hero = home.querySelector('main img')!;
    expect(hero.getAttribute('loading')).toBe('eager');
    expect(hero.getAttribute('fetchpriority')).toBe('high');
    const illustrations = [...guide.querySelectorAll('main img')];
    expect(illustrations[0].getAttribute('loading')).toBe('eager');
    for (const img of illustrations.slice(1)) expect(img.getAttribute('loading')).toBe('lazy');
    expect(illustrations[0].getAttribute('sizes')).toContain('(min-width: 48rem) calc((100vw - 5rem) / 2)');
  });
});

interface Capture {
  file: string;
  phase: string;
  route: string;
  state: string;
  viewport: { width: number; height: number };
  image: { width: number; height: number };
  sha256: string;
}
const evidence = join(root, 'docs/design-system-evidence/issue-5');
const manifest = () => JSON.parse(readFileSync(join(evidence, 'manifest.json'), 'utf8')) as { captures: Capture[] };
describe('issue-5 marketing review evidence', () => {
  it('indexes matching before/after views for the homepage and every shared-layout consumer', () => {
    const { captures } = manifest();
    for (const phase of ['before','after']) for (const route of ['/','/how-it-works','/security','/invite','/app?tab=encrypt']) for (const width of [375,768,1280]) {
      expect(captures.filter(c => c.phase===phase && c.route===route && c.viewport.width===width && !['text-200','focus','table-scrolled'].includes(c.state))).toHaveLength(1);
    }
    for (const state of ['reflow','text-200','focus','table-scrolled']) expect(captures.some(c => c.phase==='after' && c.route==='/' && c.state===state)).toBe(true);
  });
  it('keeps reviewable PNG hashes and actual dimensions intact, including locally overflowing baseline guide captures', () => {
    const { captures } = manifest();
    expect(captures).toHaveLength(34);
    expect(new Set(captures.map(c => c.file)).size).toBe(34);
    for (const capture of captures) {
      const png = readFileSync(join(evidence,capture.file));
      expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(capture.image.width);
      expect(png.readUInt32BE(20)).toBe(capture.image.height);
      expect(createHash('sha256').update(png).digest('hex')).toBe(capture.sha256);
    }
  });
});

describe('how-it-works marketing guide', () => {
  it('keeps metadata, native CTA, route state and shared reading landmarks without hydration', () => {
    expect(guide.title).toBe('Sending Secrets Safely — CryptDrop');
    expect(guide.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('A visual guide to understanding how encrypted file sharing works, from the real-world problem to the elegant solution.');
    expect(guide.querySelectorAll('h1')).toHaveLength(1);
    expect([...guide.querySelectorAll('section')].map(el => el.id)).toEqual(['problem','old-world','padlock-solution','openpgp','start-encrypting']);
    for (const section of guide.querySelectorAll('section')) expect(guide.getElementById(section.getAttribute('aria-labelledby')!)?.tagName).toBe('H2');
    expect(guide.querySelectorAll('h2')).toHaveLength(5);
    expect(guide.querySelector('.marketing-cta')?.getAttribute('href')).toBe('/app');
    expect(guide.querySelector('main a[href="/security"]')?.textContent).toContain('network services and protection limits');
    expect(guide.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/how-it-works');
    expect(guide.querySelector('.marketing-skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(guide.querySelectorAll('astro-island')).toHaveLength(0);
  });

  it('preserves all nine ordered story steps and original artwork with meaningful alternatives and dimensions', () => {
    const steps = [...guide.querySelectorAll('ol.story-steps > li')];
    expect(steps).toHaveLength(9);
    expect(steps.map(el=>el.querySelector('h3')?.textContent)).toEqual([
      'Everyone Makes a Padlock and a Key','Padlocks Go on a Public Board',"Bob Grabs Alice's Padlock",'Bob Stamps His Wax Seal',"Bob Locks the Box with Alice's Padlock",'The Locked Box Travels Across Town','A Thief Tries and Fails','Alice Opens the Box',"Alice Checks Bob's Seal",
    ]);
    const originals = ['01-public-keys','02-public-padlock-directory','03-bob-finds-alice-padlock','04-bob-signs-document','05-bob-locks-box','06-box-in-transit','07-malicious-attempt-fails','08-alice-opens-box','09-alice-verifies-seal'];
    steps.forEach((el,i) => {
      expect(el.querySelector('img')?.getAttribute('src')).toMatch(new RegExp(`^/_astro/${originals[i]}\\..+\\.webp$`));
      expect(el.querySelector('.step-label')?.textContent).toContain(`Step ${i+1}`);
      expect(el.querySelector('.step-number')?.getAttribute('aria-hidden')).toBe('true');
      expect(el.querySelector('.guide-prose > p:last-child')?.textContent?.length).toBeGreaterThan(100);
    });
    expect(guide.querySelectorAll('main img')).toHaveLength(12);
    for(const img of guide.querySelectorAll('main img')) {
      expect(img.getAttribute('alt')?.length).toBeGreaterThan(30);
      expect(img.hasAttribute('width') && img.hasAttribute('height')).toBe(true);
    }
    expect(guide.querySelectorAll('.threat-cards [aria-hidden="true"]')).toHaveLength(7);
  });

  it('provides a named keyboard-scrollable analogy table with caption and header associations', () => {
    const region = guide.querySelector('.marketing-table-region')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toBe('Padlock analogy and OpenPGP');
    expect(guide.getElementById(region.getAttribute('aria-describedby')!)?.textContent).toContain('arrow keys');
    expect(region.querySelector('caption')?.textContent).toBe('How the padlock story maps to CryptDrop');
    expect(region.querySelectorAll('th[scope="col"]')).toHaveLength(3);
    expect(region.querySelectorAll('th[scope="row"]')).toHaveLength(6);
    expect(region.querySelectorAll('td')).toHaveLength(12);
  });

  it('retains approved threat, optional signing, identity trust and network qualifications', () => {
    const text = guide.querySelector('main')!.textContent!;
    expect(text).not.toMatch(/No servers|without anything ever leaving|Normal email and file sharing offer no protection|precisely how modern encryption works|definitely came from Bob|know for certain/);
    for(const qualification of ['Transport encryption can protect files while they travel','simplified analogy','optionally signing with his private key','Unsigned files have no signature to check','a signature check can fail','independently check its fingerprint through a trusted channel','attempts to register your public key and identity','Public-key lookup and invitations also use network services','not an entirely offline workflow','CryptDrop registry, with keys.openpgp.org as a fallback','File encryption and decryption run locally']) expect(text).toContain(qualification);
  });
});

describe('issue-6 guide review evidence', () => {
  it('retains reviewable before/after viewport sets and edge captures with intact PNG hashes', () => {
    const dir = join(root,'docs/design-system-evidence/issue-6');
    const { captures } = JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')) as { captures: Capture[] };
    expect(captures).toHaveLength(10);
    for(const phase of ['before','after']) for(const width of [375,768,1280]) expect(captures.filter(c=>c.phase===phase && c.viewport.width===width && ['mobile','tablet','desktop'].includes(c.state))).toHaveLength(1);
    for(const state of ['reflow','text-200','focus','table-scrolled']) expect(captures.some(c=>c.phase==='after' && c.state===state)).toBe(true);
    for(const c of captures) {
      expect(c.route).toBe('/how-it-works');
      const png=readFileSync(join(dir,c.file));
      expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(c.image.width);
      expect(png.readUInt32BE(20)).toBe(c.image.height);
      expect(createHash('sha256').update(png).digest('hex')).toBe(c.sha256);
    }
  });
});


describe('security content marketing patterns', () => {
  it('retains metadata, the combined route, private-key anchors and named content sections', () => {
    expect(security.title).toBe('Security & Privacy — CryptDrop');
    expect(security.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('How CryptDrop protects your data. What stays local, what reaches the cloud, and the security measures built into every layer.');
    expect(security.querySelectorAll('h1')).toHaveLength(1);
    expect(security.querySelector('h1')?.textContent).toBe('Security & Privacy');
    expect([...security.querySelectorAll('main section')].map(el=>el.id)).toEqual(['local-processing','private-key-security','network-requests','never-transmitted','security-measures','review-source']);
    expect(security.getElementById('private-key-security-title')?.tagName).toBe('H2');
    for(const section of security.querySelectorAll('main section')) {
      expect(section.classList.contains('marketing-section')).toBe(true);
      expect(security.getElementById(section.getAttribute('aria-labelledby')!)?.tagName).toBe('H2');
    }
    expect(security.querySelectorAll('h2')).toHaveLength(6);
    expect(security.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/security');
    expect(security.querySelectorAll('astro-island, main [style]')).toHaveLength(0);
  });

  it('renders every shared safeguard and limitation verbatim, with separate headings and decorative noncolor cues', () => {
    for(const [selector,heading,items] of [
      ['.security-safeguards','Safeguards in place',keySecuritySafeguards],
      ['.security-limitations','Browser limitations',keySecurityLimitations],
    ] as const) {
      const card=security.querySelector(selector)!;
      expect(card.querySelector('h3')?.textContent).toBe(heading);
      expect([...card.querySelectorAll('ul > li')].map(el=>el.textContent)).toEqual(items);
      expect(card.querySelector('h3 svg')?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(security.querySelector('.security-safeguards path')?.getAttribute('d')).not.toBe(security.querySelector('.security-limitations path')?.getAttribute('d'));
    const guidance=security.querySelector('.key-security-guidance')!;
    expect(guidance.querySelectorAll('p')).toHaveLength(4);
    for(const caveat of ['not a guarantee that every memory copy has been securely erased','expiry timer does not unload your private key','not automatically deleted or made safe by an update','Do not delete your only copy','does not currently provide hardware-token integration','does not mean the entire application has been independently audited']) expect(guidance.textContent).toContain(caveat);
    expect(security.querySelector('#private-key-security .marketing-lead')?.textContent).toContain('not a security certification or a guarantee against compromise');
  });

  it('keeps all local, network and qualified never-upload categories available', () => {
    expect(security.querySelectorAll('.local-card')).toHaveLength(6);
    expect(security.querySelectorAll('.cloud-card')).toHaveLength(9);
    expect([...security.querySelectorAll('.never-list > li')].map(el=>el.textContent?.trim())).toEqual(['Your private key','Your passphrase','Unencrypted file contents','Encrypted file contents','Decrypted file contents','Your activity history as a collection','Your contact list as a collection']);
    for(const icon of security.querySelectorAll('main svg, .local-card-icon, .cloud-card-icon')) expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(security.querySelector('#never-transmitted a')?.getAttribute('href')).toBe('#private-key-security');
    expect(security.querySelector('#network-requests a')?.getAttribute('href')).toBe('https://keys.openpgp.org');
  });

  it('retains all security measures and the approved warning-only lookup limitation without identity guarantees', () => {
    const cards=[...security.querySelectorAll('.hardening-card')];
    expect(cards.map(el=>el.querySelector('h3')?.textContent)).toEqual(['Content Security Policy','Modern cryptography','Passphrase protection','Decrypted file auto-clear','Filename sanitization','Public-key lookup warnings','Security headers','No tracking or analytics']);
    const text=cards[5].textContent!;
    for(const phrase of ['first user ID','can show an email-mismatch warning','A missing user ID may not trigger a warning','does not reject a mismatched key, prove its owner’s identity, or rule out a malicious key','Verify the fingerprint through a trusted channel']) expect(text).toContain(phrase);
    expect(security.querySelector('main')?.textContent).not.toMatch(/This prevents the keyserver|verifies that the returned key actually contains a matching email/);
    for(const caveat of ['does not protect secrets from all compromised same-origin code','Imported keys retain their existing protection','dropping a reference does not guarantee secure memory erasure','this timer does not unload your private key','do not isolate one CryptDrop tab’s IndexedDB storage from another']) expect(security.querySelector('#security-measures')?.textContent).toContain(caveat);
  });

  it('uses native shared CTAs with clear purposes and preserved destinations', () => {
    const links=[...security.querySelectorAll('#review-source .marketing-cta')];
    expect(links.map(el=>el.getAttribute('href'))).toEqual(['/app','https://github.com/nilushan/CryptDrop','/how-it-works']);
    expect(links.map(el=>el.textContent)).toEqual(['Open CryptDrop →','View CryptDrop source on GitHub','See How It Works']);
    for(const link of links) expect(link.tagName).toBe('A');
    expect(links[1].hasAttribute('target')).toBe(false);
  });
});

describe('issue-7 security review evidence', () => {
  it('retains before/after responsive views and disclosure/focus/reflow evidence with intact hashes', () => {
    const dir=join(root,'docs/design-system-evidence/issue-7');
    const { captures }=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')) as { captures: Capture[] };
    expect(captures).toHaveLength(11);
    for(const phase of ['before','after']) for(const width of [375,768,1280]) expect(captures.filter(c=>c.phase===phase && c.viewport.width===width && ['mobile','tablet','desktop'].includes(c.state))).toHaveLength(1);
    for(const state of ['reflow','text-200','focus','disclosure-mobile','disclosure-desktop']) expect(captures.some(c=>c.phase==='after' && c.state===state)).toBe(true);
    for(const c of captures) {
      expect(c.route).toBe('/security');
      const png=readFileSync(join(dir,c.file));
      expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(c.image.width);
      expect(png.readUInt32BE(20)).toBe(c.image.height);
      expect(createHash('sha256').update(png).digest('hex')).toBe(c.sha256);
    }
  });
});


describe('privacy content and entry points', () => {
  it('distinguishes local processing and unencrypted local metadata from selected network payloads', () => {
    const local=security.querySelector('#local-processing')!.textContent!;
    for(const phrase of ['not all stored data is encrypted','automatically attempts to register your public key and identity','does not upload or sync the address book as a collection','localStorage is not encrypted by the app']) {
      expect(local).toContain(phrase);
    }
    expect(local).not.toMatch(/No data is sent|never synced or uploaded|No server is involved/);
    expect(security.querySelector('#never-transmitted')?.textContent).toContain('not a guarantee against malicious extensions, compromised code, or an infected device');
    expect(security.querySelector('.privacy-qualification')?.textContent).toContain('Selected details can be sent');
  });

  it('inventories automatic and selected key, invitation, email and token workflows without delivery guarantees', () => {
    const cards=[...security.querySelectorAll('.cloud-card')];
    expect(cards.map(el=>el.querySelector('h3')?.textContent)).toEqual(['Public key lookup','Public key publishing','Email verification','Key registration','Invitation emails','Opening an invitation','Invitation acceptance notifications','Decrypt instructions email','Sharing a public key by email']);
    const text=security.querySelector('#network-requests')!.textContent!;
    for(const phrase of ['backend uses Resend','not an exhaustive inventory of HTTP metadata','browser can query that keyserver directly','invitation token if present','automatically attempts registration','nonblocking and best-effort, not an opt-in','sender’s name and email','response can include the sender’s name and email, recipient email','notify the inviter via Resend','original filename','filename can reveal sensitive information','email application and provider']) expect(text).toContain(phrase);
    expect(text).not.toMatch(/Only the email address is sent|two destinations|Only their email address|encrypted filename/);
    expect(cards[3].textContent).toContain('Your private key and passphrase are not included');
  });

  it('discloses the complete sender identity sent with decrypt instructions, including email and the no-identity fallback', () => {
    // QuickEncryptPanel sends $userInfo as senderName, not just a parsed name.
    // Generated user IDs contain name <email>; imported IDs retain the full key user ID.
    const card=[...security.querySelectorAll('.cloud-card')].find(el=>el.querySelector('h3')?.textContent==='Decrypt instructions email')!;
    const text=card.textContent!;
    expect(text).toContain('Recipient email, loaded sender user ID (which can include name and email)');
    expect(text).toContain('the API receives the recipient’s email, the loaded sender user ID (which can include name and email)');
    expect(text).toContain('If no sender identity is loaded, “Someone” is sent instead');
    expect(text).toContain('Resend');
    expect(text).toContain('the sender user ID appears in the recipient’s email subject and body');
    expect(text).not.toContain('your name');
  });

  it('describes backend records without inventing retention, deletion or anonymous identifiers', () => {
    const storage=security.querySelector('.privacy-storage')!;
    expect(storage.querySelectorAll('li')).toHaveLength(3);
    for(const phrase of ['Cloudflare D1','creation/update timestamps','creation/acceptance timestamps','IP headers','not hashed','not a retention or deletion policy','does not mean its database record has been deleted']) expect(storage.textContent).toContain(phrase);
  });

  it('keeps privacy jump targets and entry points discoverable on every shell consumer', () => {
    const nav=security.querySelector('nav[aria-label="Security and privacy topics"]')!;
    expect([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href'))).toEqual(['#local-processing','#network-requests','#never-transmitted','#private-key-security']);
    for(const a of nav.querySelectorAll('a')) expect(security.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull();
    for(const route of ['', 'how-it-works','security','invite']) {
      const footer=read(route).querySelector('.marketing-footer')!;
      expect(footer.querySelector('a[href="/security"]')?.textContent).toBe('Security & privacy');
      expect(footer.querySelector('a[href="/security#network-requests"]')?.textContent).toBe('What data uses network services?');
    }
    const footer=read('app').querySelector('footer.workspace-footer')!;
    expect(footer.querySelector('a[href="/security"]')?.textContent).toContain('Security & privacy');
    expect(footer.querySelector('a[href="/security#network-requests"]')?.textContent).toContain('Network services & data');
  });
});

describe('issue-8 privacy review evidence', () => {
  it('indexes all shared-shell responsive before/after states and privacy edge views with intact image hashes', () => {
    const dir=join(root,'docs/design-system-evidence/issue-8');
    const { captures }=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')) as { captures: Capture[] };
    expect(captures).toHaveLength(39);
    expect(new Set(captures.map(c=>c.file)).size).toBe(captures.length);
    for(const phase of ['before','after']) for(const route of ['/security','/','/how-it-works','/invite','/app?tab=encrypt','/app?tab=keyring']) for(const width of [375,768,1280]) {
      expect(captures.filter(c=>c.phase===phase && c.route===route && c.viewport.width===width && !['reflow','text-200','focus'].includes(c.state))).toHaveLength(1);
    }
    for(const state of ['reflow','text-200','focus']) expect(captures.some(c=>c.phase==='after' && c.route==='/security' && c.state===state)).toBe(true);
    for(const c of captures) {
      const png=readFileSync(join(dir,c.file));
      expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(c.image.width);
      expect(png.readUInt32BE(20)).toBe(c.image.height);
      expect(createHash('sha256').update(png).digest('hex')).toBe(c.sha256);
    }
  });
});
