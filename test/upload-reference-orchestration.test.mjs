import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { canonicalizePageState, hashPageState } from '../scripts/lib/page-normalization.mjs';

const content = '<p>target</p><a href="{{SITE_URL}}/wp-content/uploads/2026/file.pdf">PDF</a>';
const oldContent = content.replace('target', 'old');
const entry = { path: '2026/file.pdf', sha256: 'a'.repeat(64), size: 3 };
const stub = String.raw`#!/usr/bin/env node
import fs from 'node:fs';
const statePath = process.env.STUB_STATE;
const state = JSON.parse(fs.readFileSync(statePath));
const command = process.argv.at(-1);
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const output = (value) => { save(); console.log(typeof value === 'string' ? value : JSON.stringify(value)); };
let input = '';
if (command.includes('eval')) input = fs.readFileSync(0, 'utf8');
if (command.includes('mysqldump')) { state.backups++; output('-- MySQL dump\nCREATE TABLE posts (id int);\n-- Dump completed on today'); }
else if (command.includes('Upload inspection failed')) {
 state.inspections++;
 const fail = state.mode === 'missing' || state.mode === 'mismatch' || (state.mode === 'backup-change' && state.backups) || (state.mode === 'media-change' && state.media) || (state.mode === 'write-change' && state.writes);
 if (state.mode === 'access') { save(); process.exit(2); }
 if (state.mode === 'protocol') output('bad json');
 else if (fail && state.mode !== 'mismatch') output({status:'missing'});
 else output({status:'present',sha256: fail ? 'b'.repeat(64) : 'a'.repeat(64),size:3});
}
else if (command.includes('Invalid inline image bytes')) {
 const data = JSON.parse(input);
 if (/\.(pdf|mp4|webm)$/.test(data.path)) throw new Error('Reference bytes sent to image processing');
 if (data.write) { state.media++; state.mutations++; }
 output({status: data.write ? 'uploaded' : 'missing'});
}
else if (command.includes('Post write failed')) { state.writes++; state.mutations++; state.done = true; output({id:1}); }
else if (command.includes("'list'")) output([{ID:1,post_status:'publish'}]);
else if (command.includes("'--format=json'")) output({post_title:'Service',post_name:'service',post_status:'publish',post_type:'page',post_content:state.done ? state.target : state.old});
else output('');
`;

function fixture(t, { inline = false, alreadyDone = false } = {}) {
 const dir = mkdtempSync(join(tmpdir(), 'reference-orchestration-'));
 t.after(() => rmSync(dir, { recursive: true, force: true }));
 cpSync(resolve('scripts'), join(dir, 'scripts'), { recursive: true });
 writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
 writeFileSync(join(dir, '.gitignore'), '.content-publish/\n.env.import-local/\nbin/\nstate.json\n');
 const site = join(dir, 'sites/example.test');
 mkdirSync(site, { recursive: true });
 const target = content + (inline ? '<img src="{{SITE_URL}}/wp-content/uploads/2026/photo.jpg">' : '');
 const old = oldContent + (inline ? '<img src="{{SITE_URL}}/wp-content/uploads/2026/photo.jpg">' : '');
 const config = { items: {} };
 for (const key of ['first', 'second']) {
  config.items[key] = { type:'page', selector:{type:'page_on_front'}, artifactDir:`content/${key}`, allowedStatuses:['publish'], metadata:[] };
  const artifact = join(site, 'content', key); mkdirSync(artifact, { recursive:true });
  const page = {contentKey:key,type:'page',title:'Service',slug:'service',status:'publish',template:'',content:old,featuredImage:null,metadata:{}};
  const manifest = {schemaVersion:1,...page,content:{file:'content.html'},baselineHash:hashPageState(canonicalizePageState(page)),uploadReferences:[entry]};
  if (inline) { manifest.inlineImages=[{path:'2026/photo.jpg',file:'image.jpg',sha256:'b'.repeat(64)}];
   // Use actual packaged bytes so artifact validation passes.
   const { stdout } = spawnSync(process.execPath, ['-e', "process.stdout.write(require('crypto').createHash('sha256').update('image').digest('hex'))"]);
   manifest.inlineImages[0].sha256=stdout.toString();writeFileSync(join(artifact,'image.jpg'),'image');
  }
  writeFileSync(join(artifact,'manifest.json'),JSON.stringify(manifest));writeFileSync(join(artifact,'content.html'),target);
 }
 writeFileSync(join(site,'content-publish.json'),JSON.stringify(config));
 writeFileSync(join(dir,'sites.json'),JSON.stringify({sites:{'example.test':{folder:'sites/example.test',port:9999,productionUrl:'https://example.test'}}}));
 mkdirSync(join(dir,'.env.import-local'));writeFileSync(join(dir,'.env.import-local/example.test'),'PRODUCTION_SSH=test-host\nPRODUCTION_WP_PATH=/srv/wp\n');
 mkdirSync(join(dir,'bin'));writeFileSync(join(dir,'bin/ssh'),stub);chmodSync(join(dir,'bin/ssh'),0o755);
 const statePath=join(dir,'state.json');
 const initial={mode:'matching',backups:0,media:0,writes:0,mutations:0,inspections:0,done:alreadyDone,target,old};
 writeFileSync(statePath,JSON.stringify(initial));
 for(const args of [['init','--quiet'],['add','scripts','sites','sites.json','package.json','.gitignore'],['-c','user.name=Test','-c','user.email=test@example.test','commit','--quiet','-m','fixture']]) {
  const result=spawnSync('git',args,{cwd:dir,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 }
 function run(operation) {
  const args=[join(dir,'scripts/content-publish.mjs'),operation,'example.test'];
  if(operation==='apply')args.push('--plan',join(dir,'.content-publish/plans/example.test/plan.json'),'--confirm-production=example.test');
  return spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH,STUB_STATE:statePath},maxBuffer:2*1024*1024});
 }
 return {run,state:()=>JSON.parse(readFileSync(statePath)),mode:(mode)=>{const s=JSON.parse(readFileSync(statePath));s.mode=mode;writeFileSync(statePath,JSON.stringify(s));}};
}

for(const mode of ['missing','mismatch'])test(`plan reports every selected item with ${mode} references, including unchanged pages`,t=>{
 const f=fixture(t,{alreadyDone:true});f.mode(mode);const result=f.run('plan');
 assert.equal(result.status,1,result.stderr);assert.match(result.stdout,/first: conflict/);assert.match(result.stdout,/second: conflict/);assert.match(result.stdout,/example.test\/first: 2026\/file.pdf/);assert.equal(f.state().mutations,0);
});
for(const mode of ['missing','mismatch','access','protocol'])test(`apply stops before any mutation on initial ${mode} reference`,t=>{
 const f=fixture(t);const plan=f.run('plan');assert.equal(plan.status,0,plan.stderr);f.mode(mode);const result=f.run('apply');assert.equal(result.status,1);assert.equal(f.state().mutations,0);assert.equal(f.state().backups,0);
});
test('reference change during backup stops before item mutation',t=>{
 const f=fixture(t);assert.equal(f.run('plan').status,0);f.mode('backup-change');const result=f.run('apply');assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/during backup/);assert.equal(f.state().backups,1);assert.equal(f.state().mutations,0);
});
test('reference change during image processing stops before page write; retry rechecks references',t=>{
 const f=fixture(t,{inline:true});assert.equal(f.run('plan').status,0);f.mode('media-change');const result=f.run('apply');assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/before page write/);assert.equal(f.state().media,1);assert.equal(f.state().writes,0);
 const inspections=f.state().inspections;assert.equal(f.run('apply').status,1);assert.ok(f.state().inspections>inspections);assert.equal(f.state().writes,0);
});
test('completed retry still validates references before skipping',t=>{
 const f=fixture(t,{alreadyDone:true});assert.equal(f.run('plan').status,0);assert.equal(f.run('apply').status,0);assert.equal(f.state().mutations,0);f.mode('missing');assert.equal(f.run('apply').status,1);assert.equal(f.state().mutations,0);
});

test('successful apply writes only the page and revalidates references in final verification', t => {
 const f = fixture(t);
 assert.equal(f.run('plan').status, 0);
 const result = f.run('apply');
 assert.equal(result.status, 0, result.stderr);
 assert.equal(f.state().backups, 1);
 assert.equal(f.state().writes, 1);
 assert.equal(f.state().media, 0);
 assert.ok(f.state().inspections >= 8);
});
test('reference change after page write fails final verification', t => {
 const f = fixture(t);
 assert.equal(f.run('plan').status, 0);
 f.mode('write-change');
 const result = f.run('apply');
 assert.equal(result.status, 1);
 assert.match(result.stderr, /Post-write readback.*2026\/file.pdf/);
});
