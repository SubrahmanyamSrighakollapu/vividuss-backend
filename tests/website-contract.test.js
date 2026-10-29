const {test}=require('node:test');
const assert=require('node:assert/strict');
const {registry,createPageDocument,inspectDocument,detectDocumentFormat,retainDocumentEnvelope,MAX_COMPONENTS,safeUrl}=require('../shared/website-contract/index.cjs');
const {validateEditorDocument,assertDocumentReplacement}=require('../src/lib/documentValidation');
const canonical=require('../shared/website-contract/fixtures/canonical.json');
const historical=require('../shared/website-contract/fixtures/unversioned.json');
const clone=v=>JSON.parse(JSON.stringify(v));
const doc=(type='Heading',props={})=>({...createPageDocument('p'),content:[{type,props:{id:'h',...props}}]});
const rejects=(d,code)=>assert.throws(()=>validateEditorDocument(d),e=>e.statusCode===400&&e.details.some(x=>x.code===code));

test('canonical and historical fixtures validate without mutation; unknown historical fields are reported',()=>{
  for(const fixture of [canonical,historical]) {const before=JSON.stringify(fixture);assert.equal(validateEditorDocument(fixture),fixture);assert.equal(JSON.stringify(fixture),before);}
  assert.equal(inspectDocument(historical).mode,'compatibility');
  assert.ok(inspectDocument(historical).warnings.some(e=>e.code==='UNKNOWN_PROPERTY'));
  assert.equal(detectDocumentFormat({editorData:null,sections:[{}]}),'legacy-sections');
  assert.equal(detectDocumentFormat({editorData:{root:{},content:[]}}),'unversioned-puck');
});
test('all shipped registry defaults remain valid under canonical contracts',()=>{
  for(const [type,c] of Object.entries(registry.components))assert.deepEqual(inspectDocument(doc(type,c.defaults)).errors,[],type);
});
test('recursive components, slots, IDs, types, enum and numeric bounds are enforced',()=>{
  rejects(doc('ArbitraryJavaScript'),'UNKNOWN_COMPONENT');
  rejects(doc('Section',{content:{}}),'MALFORMED_SLOT');
  rejects(doc('Heading',{id:''}),'MISSING_ID');
  rejects(doc('Heading',{text:3}),'INVALID_TYPE');
  rejects(doc('Heading',{level:'script'}),'INVALID_ENUM');
  rejects(doc('Heading',{fontSize:10000}),'OUT_OF_RANGE');
  rejects(doc('Heading',{newExecutableProp:'x'}),'UNKNOWN_PROPERTY');
  rejects(doc('Section',{content:[{type:'Heading',props:{id:'h',text:'Duplicate'}}]}),'DUPLICATE_ID');
  const d=doc(); d.zones={'h:content':[{type:'Text',props:{id:'h'}}]}; rejects(d,'DUPLICATE_ID');
});
test('responsive types, breakpoints, CSS injection and URL safety apply recursively',()=>{
  rejects(doc('Heading',{responsive:{phone:{fontSize:20}}}),'INVALID_BREAKPOINT');
  rejects(doc('Heading',{responsive:{mobile:{fontSize:'large'}}}),'INVALID_TYPE');
  rejects(doc('Heading',{responsive:{mobile:{maxWidth:'100%;} </style><script>x</script>'}}}),'UNSAFE_STYLE');
  for(const href of ['javascript:alert(1)','data:text/html,test','//evil.test','java\nscript:alert(1)','https://user:pass@example.com'])rejects(doc('Button',{href}),'UNSAFE_URL');
  rejects(doc('Navbar',{quickLinksText:'Bad | javascript:alert(1)'}),'UNSAFE_URL');
  rejects(doc('Footer',{navColumns:[{linksList:'Bad | javascript:alert(1)'}]}),'UNSAFE_URL');
  rejects(doc('Heading',{color:'red;}</style>'}),'UNSAFE_STYLE');
  for(const url of ['/about','#x','https://example.com/x','mailto:a@example.com','tel:+123']) assert.ok(safeUrl(url),url);
  assert.equal(validateEditorDocument(doc('CodeSnippet',{code:'<script>example()</script>'})).content.length,1); // React renders this as text.
});
test('future versions fail explicitly; canonical identity cannot be downgraded',()=>{
  rejects({...canonical,schemaVersion:2},'UNSUPPORTED_VERSION');
  rejects({...canonical,registryVersion:2},'UNSUPPORTED_VERSION');
  rejects({...canonical,format:'other'},'UNSUPPORTED_VERSION');
  assert.throws(()=>assertDocumentReplacement(canonical,historical),{statusCode:400});
  assert.throws(()=>assertDocumentReplacement(canonical,{...canonical,documentId:'other'}),{statusCode:400});
  assert.doesNotThrow(()=>assertDocumentReplacement(historical,historical));
});
test('component/depth bounds, non-JSON values, cycles and byte limits fail safely',()=>{
  const d=createPageDocument('p');d.content=Array.from({length:MAX_COMPONENTS+1},(_,i)=>({type:'Heading',props:{id:`h${i}`}}));rejects(d,'COMPONENT_LIMIT');
  const deep=doc('Section',{content:[]});let node=deep.content[0];for(let i=0;i<35;i++){const next={type:'Section',props:{id:`s${i}`,content:[]}};node.props.content.push(next);node=next;} assert.throws(()=>validateEditorDocument(deep),{statusCode:400});
  rejects(doc('Heading',{fontSize:Infinity}),'INVALID_JSON_VALUE');
  const cycle=doc();cycle.self=cycle;assert.throws(()=>validateEditorDocument(cycle),{statusCode:400});
  assert.throws(()=>validateEditorDocument(doc('Text',{text:'a'.repeat(1000001)})),{statusCode:413});
});
test('Puck changes retain envelope metadata and historical extensions without implicit version upgrade',()=>{
  const original=clone(canonical), edited={root:canonical.root,content:[]};
  assert.equal(retainDocumentEnvelope(original,edited).documentId,canonical.documentId);
  const merged=retainDocumentEnvelope(historical,edited);assert.equal(merged.format,undefined);assert.deepEqual(merged.historicalExtension,{keep:true});
  const stripped=retainDocumentEnvelope(historical,{root:{props:{title:'Edited'}},content:[{type:'Heading',props:{id:'historical-heading',text:'Edited'}}]});
  assert.equal(stripped.root.props.unknownRoot,'preserve');
  assert.deepEqual(stripped.content[0].props.unknownHistorical,{nested:[1,true,null]});
  assert.deepEqual(historical,require('../shared/website-contract/fixtures/unversioned.json'));
});
