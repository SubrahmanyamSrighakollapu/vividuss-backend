const {test,before,after}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {createRequire}=require("node:module");
const express=require("express");
const {connectDisposable}=require("../../scripts/disposable-target");
const {createPageDocument}=require("../../shared/website-contract/index.cjs");
const {requestContext}=require("../../src/lib/publicationContext");
let prisma,server,base,id;
function controller(file) {
  const filename=path.resolve(__dirname,"../../src/controllers",file),realRequire=createRequire(filename),loaded={exports:{}};
  new Function("require","module","exports",fs.readFileSync(filename,"utf8"))(name=>name==="@clerk/express"?{getAuth:req=>({userId:req.testIdentity})}:realRequire(name),loaded,loaded.exports);
  return loaded.exports;
}
before(async()=>{
  if(process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL)throw new Error("Target mismatch");
  ({prisma}=await connectDisposable());process.env.VIVIDUSS_PUBLICATION_REVISIONS="enabled";
  id="m3-http-"+crypto.randomBytes(6).toString("hex");
  await prisma.website.create({data:{id,slug:id,name:"HTTP fixture",userId:"http-owner",pages:{create:{id:id+"-p",name:"Home",slug:"home",order:0,editorData:createPageDocument(id+"-d")}}}});
  const app=express();app.use(express.json());app.use((req,res,next)=>{req.testIdentity=req.headers["x-test-identity"];next();});app.use(requestContext);
  const website=controller("website.controller.js"),publication=controller("publication.controller.js");
  app.get("/:id/publication-state",publication.state);app.post("/:id/publish",website.publishWebsite);
  app.put("/:id/pages/:pageId/editor-data",website.savePageEditorData);app.get("/:id/revisions",publication.list);
  app.post("/:id/revisions/:revisionId/restore",publication.restore);
  server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));base="http://127.0.0.1:"+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await prisma?.$disconnect();await require("../../src/lib/prisma").$disconnect();});
test("actual HTTP controllers enforce identity, preconditions, structured 409 and publication/history response contracts",async()=>{
  let response=await fetch(base+"/"+id+"/publication-state");assert.equal(response.status,401);
  response=await fetch(base+"/"+id+"/publication-state",{headers:{"x-test-identity":"other"}});assert.equal(response.status,404);
  response=await fetch(base+"/"+id+"/publication-state",{headers:{"x-test-identity":"http-owner"}});assert.equal((await response.json()).data.draftVersion,0);
  const post=(route,headers={})=>fetch(base+"/"+id+route,{method:"POST",headers:{"x-test-identity":"http-owner","Content-Type":"application/json",...headers},body:"{}"});
  response=await post("/publish");assert.equal(response.status,428);assert.equal((await response.json()).code,"VERSION_REQUIRED");
  response=await post("/publish",{"If-Match":'"draft-0"',"If-Publication-Match":'"publication-0"'});assert.equal(response.status,200);
  const published=await response.json();assert.equal(published.revision.sequence,1);assert.equal(published.concurrency.publicationVersion,1);
  response=await post("/publish",{"If-Match":'"draft-0"',"If-Publication-Match":'"publication-0"'});assert.equal(response.status,409);
  const stale=await response.json();assert.equal(stale.code,"VERSION_CONFLICT");assert.equal(stale.concurrency.publicationVersion,1);
  response=await fetch(base+"/"+id+"/revisions",{headers:{"x-test-identity":"http-owner"}});assert.equal((await response.json()).data.revisions.length,1);
  response=await post("/revisions/"+published.revision.id+"/restore",{"If-Match":'"draft-0"',"If-Publication-Match":'"publication-1"'});assert.equal(response.status,200);
  assert.equal((await response.json()).data.revision.sequence,2);
});
