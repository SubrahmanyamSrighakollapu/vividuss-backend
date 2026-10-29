const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tokens, expected, requestContext, requests } = require("../src/lib/publicationContext");
const { hash, buildRevisionSnapshot, validateLayout, validateSnapshot } = require("../src/lib/revisionSnapshot");
const { createPageDocument } = require("../shared/website-contract/index.cjs");
const { validateEnvironment } = require("../src/config/environment");
test("concurrency requires explicit tokens; errors carry current versions without changing expected state", () => {
  const state = { draftVersion: 3, publicationVersion: 2, activeRevisionId: "r2" }, client = { draftVersion: 2, publicationVersion: 1 };
  assert.throws(() => expected(undefined,state), { statusCode:428,code:"VERSION_REQUIRED" });
  assert.throws(() => expected(client,state,true), e=>e.statusCode===409&&e.concurrency.draftVersion===3);
  assert.deepEqual(client,{draftVersion:2,publicationVersion:1});
  assert.doesNotThrow(()=>expected({draftVersion:3,publicationVersion:2},state,true));
  assert.deepEqual(tokens(null),{enabled:true,draftVersion:0,publicationVersion:0,activeRevisionId:null});
});
test("request middleware uses quoted version tokens and reports only committed acknowledgements", () => {
  const old=process.env.VIVIDUSS_PUBLICATION_REVISIONS;process.env.VIVIDUSS_PUBLICATION_REVISIONS="enabled";
  try {
    let payload;
    const res={json:value=>{payload=value;}};
    requestContext({headers:{"if-match":'"draft-7"',"if-publication-match":'"publication-4"'}},res,()=>{
      assert.equal(requests.getStore().draftVersion,7);
      assert.equal(requests.getStore().publicationVersion,4);
      requests.getStore().result={draftVersion:8,publicationVersion:4,enabled:true};
      res.json({success:true});
    });
    assert.equal(payload.concurrency.draftVersion,8);
    requestContext({headers:{"if-match":"7"}},{json(){}},()=>assert.equal(requests.getStore().draftVersion,undefined));
  } finally {if(old===undefined)delete process.env.VIVIDUSS_PUBLICATION_REVISIONS;else process.env.VIVIDUSS_PUBLICATION_REVISIONS=old;}
});
test("rollout is disabled by default and invalid environment modes fail rather than enable", () => {
  assert.throws(()=>validateEnvironment({VIVIDUSS_PUBLICATION_REVISIONS:"true"}),/enabled or disabled/);
});
test("snapshot freezes saved pages/theme/layout and hashes deterministically without mutating drafts", () => {
  const document=createPageDocument("p");document.metadata={title:"SEO"};
  const website={id:"w",name:"Name",slug:"site",theme:{colors:{primary:"#123456"}},pages:[{id:"p",slug:"home",editorData:document}]};
  const state={globalLayout:{header:{enabled:true,logoText:"Brand",links:[]}}};
  const before=structuredClone(website),event={id:"r",sequence:1,createdAt:new Date("2026-01-01")};
  const snapshot=buildRevisionSnapshot(website,state,event);
  website.name="Draft";state.globalLayout.header.logoText="New";document.metadata.title="Draft SEO";
  assert.equal(snapshot.name,"Name");assert.equal(snapshot.globalLayout.header.logoText,"Brand");assert.equal(snapshot.pages[0].editorData.metadata.title,"SEO");
  assert.equal(hash({b:1,a:2}),hash({a:2,b:1}));assert.notEqual(hash(snapshot),hash(website));
  assert.equal(before.name,"Name");
});
test("snapshot checks routing uniqueness, versions and safe chrome fields", () => {
  assert.throws(()=>validateSnapshot({websiteId:"other",pages:[{}]},"w"),{statusCode:400});
  assert.throws(()=>validateSnapshot({pages:[{id:"p",slug:"home"},{id:"q",slug:"home"}]},"w"),{statusCode:400});
  assert.throws(()=>validateLayout({header:{enabled:true,links:[{label:"X",href:"javascript:alert(1)"}]}}),{statusCode:400});
  assert.throws(()=>validateLayout({footer:{enabled:"yes"}}),{statusCode:400});
});
test("restoration copies source content, retaining unknown legacy fields, without changing source", () => {
  const source={schemaVersion:1,name:"Legacy",slug:"site",pages:[{id:"p",slug:"home",sections:[]}],unknown:{preserve:true}};
  const original=structuredClone(source);
  const restored=buildRevisionSnapshot({id:"w"}, {},{id:"r2",sequence:2,createdAt:new Date(),restoredFromRevisionId:"r1"},source);
  assert.deepEqual(source,original);assert.deepEqual(restored.unknown,{preserve:true});
  assert.equal(restored.publication.restoredFromRevisionId,"r1");assert.equal(restored.publication.revisionId,"r2");
});
