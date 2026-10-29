const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {createPageDocument}=require('../shared/website-contract/index.cjs');
const {buildPublicationSnapshot}=require('../src/lib/publicationSnapshot');
const fixture=require('../shared/website-contract/fixtures/canonical.json');
const clone=v=>JSON.parse(JSON.stringify(v));
function loadService(file,prisma) {
  const filename=path.resolve(__dirname,'../src/services',file),realRequire=createRequire(filename),loaded={exports:{}};
  new Function('require','module','exports',fs.readFileSync(filename,'utf8'))(name=>name==='../lib/prisma'?prisma:realRequire(name),loaded,loaded.exports);
  return loaded.exports;
}
function setup() {
  const document=clone(fixture),page={id:'p',name:'Home',slug:'home',order:0,editorData:document,responsive:null,sections:[],_count:{sections:0}};
  const website={id:'w',userId:'owner',name:'Published name',slug:'fixture-site',pages:[page],publishedData:{name:'Previous publication'},isPublished:true};
  let pageWrites=0,websiteWrites=0;
  const prisma={websitePage:{findFirst:async q=>q.where.website?.userId==='other'?null:clone(page),update:async q=>{pageWrites++;Object.assign(page,clone(q.data));return clone(page);}},website:{findFirst:async q=>q.where.userId==='other'?null:clone(website),findUnique:async()=>null,update:async q=>{websiteWrites++;Object.assign(website,clone(q.data));return clone(website);}},$transaction:async cb=>cb(prisma)};
  return {page,website,prisma,counts:()=>[pageWrites,websiteWrites],service:loadService('website.service.js',prisma)};
}
test('actual website save persists canonical metadata/JSON; publish snapshots saved data and isolates later drafts',async()=>{
  const {page,website,service}=setup();
  const updated=clone(fixture);updated.content[0].props.content[0].props.text='Latest saved';
  const saved=await service.saveWebsitePageEditorData('w','p',updated,undefined,'owner');
  assert.equal(saved.editorData.documentId,fixture.documentId);
  const published=await service.publishWebsite('w','owner');
  assert.deepEqual(published.publishedData.pages[0].editorData,saved.editorData);
  assert.equal(published.publishedData.format,'vividuss.website.snapshot');
  const before=clone(website.publishedData);const next=clone(page.editorData);next.content=[];
  await service.saveWebsitePageEditorData('w','p',next,undefined,'owner');
  assert.deepEqual(website.publishedData,before);
});
test('actual website save rejects invalid canonical props, explicit responsive overrides and downgrade before persistence',async()=>{
  const {page,website,service,counts}=setup(),before=clone(website);
  const invalid=clone(fixture);invalid.content[0].props.content[0].props.level='script';
  await assert.rejects(service.saveWebsitePageEditorData('w','p',invalid,undefined,'owner'),{statusCode:400});
  await assert.rejects(service.saveWebsitePageEditorData('w','p',clone(fixture),{phone:{maxWidth:'1px'}},'owner'),{statusCode:400});
  await assert.rejects(service.saveWebsitePageEditorData('w','p',{root:{props:{}},content:[]},undefined,'owner'),{statusCode:400});
  await assert.rejects(service.saveWebsitePageEditorData('w','p',clone(fixture),undefined,'other'),{statusCode:404});
  assert.deepEqual(counts(),[0,0]);assert.deepEqual(website,before);assert.equal(page.editorData.documentId,fixture.documentId);
});
test('draft and publication use the same canonical validation; rejected single-page draft/publish preserve previous snapshot',async()=>{
  const {page,website,service,counts}=setup(),before=clone(website.publishedData);
  const invalid=clone(fixture);invalid.content[0].props.content='not a slot';
  await assert.rejects(service.saveWebsiteDraft('w',[{id:'p',editorData:invalid}],'owner'),{statusCode:400});
  assert.deepEqual(counts(),[0,0]);assert.deepEqual(website.publishedData,before);
  page.editorData=invalid;await assert.rejects(service.publishWebsite('w','owner'),{statusCode:400});
  assert.deepEqual(website.publishedData,before);assert.deepEqual(counts(),[0,0]);
});
test('actual template save and publish validate canonical documents and preserve legacy documents',async()=>{
  let page={id:'p',editorData:clone(fixture),_count:{sections:0}},writes=0;
  const prisma={templatePage:{findFirst:async()=>clone(page),update:async q=>{writes++;page={...page,...clone(q.data)};return clone(page);}},template:{findUnique:async()=>({id:'t',pages:[page]}),update:async q=>{writes++;return q.data;}}};
  const service=loadService('template.service.js',prisma),invalid=clone(fixture);invalid.content[0].props.content=[];invalid.registryVersion=999;
  await assert.rejects(service.savePageEditorData('t','p',invalid),{statusCode:400});assert.equal(writes,0);
  await service.savePageEditorData('t','p',clone(fixture));assert.equal(writes,1);
  await service.setTemplateStatus('t','PUBLISHED');assert.equal(writes,2);
  page.editorData=invalid;await assert.rejects(service.setTemplateStatus('t','PUBLISHED'),{statusCode:400});assert.equal(writes,2);
  page={...page,editorData:null,_count:{sections:1}};await service.setTemplateStatus('t','PUBLISHED');assert.equal(writes,3);
});
test('empty and mixed multi-page snapshots retain legacy, unversioned and canonical source JSON',()=>{
  const legacy={id:'legacy',sections:[{id:'s',type:'hero',content:{unknown:'preserve'},config:{unknown:[true,null]}}]};
  const unversioned={id:'old',editorData:require('../shared/website-contract/fixtures/unversioned.json')};
  const canonical={id:'new',editorData:createPageDocument('new')};
  const original={id:'w',name:'Site',pages:[legacy,unversioned,canonical]},before=clone(original);
  const snapshot=buildPublicationSnapshot(original,'site');
  assert.deepEqual(snapshot.pages[1].editorData,unversioned.editorData);assert.deepEqual(snapshot.pages[0].sections[0].content,legacy.sections[0].content);
  original.pages[2].editorData.content.push({type:'Heading',props:{id:'h'}});assert.equal(snapshot.pages[2].editorData.content.length,0);
  assert.equal(before.pages[2].editorData.content.length,0);assert.deepEqual(buildPublicationSnapshot({pages:[]},'site').pages,[]);
});
