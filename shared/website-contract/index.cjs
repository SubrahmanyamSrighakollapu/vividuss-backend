// Vividuss owns compatibility. This module has no React, Puck, Prisma or browser dependencies.
const registry = require('./component-contracts.json');
const FORMAT = 'vividuss.puck.page';
const SCHEMA_VERSION = 1;
const MAX_DEPTH = 32;
const MAX_COMPONENTS = 2000;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function detectDocumentFormat(page) {
  const data = page?.editorData;
  if (data == null) return 'legacy-sections';
  if (!object(data)) return 'unsupported';
  if (own(data, 'format') || own(data, 'schemaVersion') || own(data, 'registryVersion')) {
    return data.format === FORMAT && data.schemaVersion === 1 && data.registryVersion === registry.registryVersion ? 'canonical-puck' : 'unsupported';
  }
  return object(data.root) && Array.isArray(data.content) ? 'unversioned-puck' : 'unsupported';
}

function createPageDocument(documentId, props = {}) {
  if (typeof documentId !== 'string' || !documentId) throw new Error('A stable documentId is required');
  return { format: FORMAT, schemaVersion: 1, registryVersion: registry.registryVersion,
    documentId, root: { props }, content: [] };
}

// Only explicit page/site duplication forks canonical identity. Historical JSON
// remains byte-for-byte equivalent; this never updates the source record.
function forkPageDocument(document, documentId) {
  return document?.format === FORMAT ? { ...document, documentId } : document;
}

// Puck may return only its own top-level keys. Retain the original document envelope
// and historical extensions, without converting unversioned documents on open/save.
function retainDocumentEnvelope(original, edited) {
  const result = { ...original, ...edited };
  for (const key of ['format', 'schemaVersion', 'registryVersion', 'documentId', 'metadata', 'themeRef', 'globalLayoutRef']) {
    if (own(original || {}, key)) result[key] = original[key];
  }
  const historical = detectDocumentFormat({editorData:original}) === 'unversioned-puck';
  if (historical && edited) {
    const unknown = (previous, current, definition, defaults = {}) => ({
      ...Object.fromEntries(Object.entries(previous || {}).filter(([key]) => key !== 'id' && !own(definition,key) && !own(defaults,key))),
      ...current,
    });
    if (edited.root) result.root = { ...original.root, ...edited.root,
      props: unknown(original.root?.props,edited.root.props,registry.root.properties,registry.root.defaults) };
    const oldNodes = new Map();
    function visit(value, transform) {
      if (Array.isArray(value)) return value.map(v=>visit(v,transform));
      if (!object(value)) return value;
      const mapped=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,transform)]));
      return typeof mapped.type==='string' && object(mapped.props) ? transform(mapped) : mapped;
    }
    visit(original, node=>{if(node.props.id)oldNodes.set(node.props.id,node);return node;});
    const restore=node=>{
      const previous=oldNodes.get(node.props.id), contract=registry.components[node.type];
      return previous?.type===node.type && contract ? { ...node, props:unknown(previous.props,node.props,contract.properties,contract.defaults) } : node;
    };
    if(edited.content)result.content=visit(edited.content,restore);
    if(edited.zones)result.zones=visit(edited.zones,restore);
  }
  return result;
}

function safeUrl(value) {
  if (!value) return true;
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\<>"'`]/.test(value)) return false;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) {
    try { const url = new URL(value); return !url.username && !url.password && (url.protocol !== 'http:' && url.protocol !== 'https:' || !!url.hostname); } catch { return false; }
  }
  return !value.startsWith('//') && !/^[^/?#]*:/.test(value);
}

function inspectDocument(data) {
  const errors = [], warnings = [];
  const format = detectDocumentFormat({ editorData: data });
  const strict = format === 'canonical-puck';
  const add = (path, code, reason, always = false) => {
    const target = strict || always ? errors : warnings;
    if (target.length < 100) target.push({ path, code, reason });
  };
  if (!object(data) || !object(data.root) || !Array.isArray(data.content)) {
    add('$', 'INVALID_DOCUMENT', 'Expected root object and content array', true);
    return { format, mode: 'invalid', errors, warnings };
  }
  if (format === 'unsupported') add('$.schemaVersion', 'UNSUPPORTED_VERSION', 'Unsupported format, schema or registry version; no downgrade is attempted', true);
  // Bound traversal before recursively inspecting fields, including unknown historical fields.
  const pending = [[data, '$', 0]]; let visited = 0;
  while (pending.length) {
    const [value, path, depth] = pending.pop();
    if (++visited > 50000 || depth > 64) {
      add(path, 'DOCUMENT_COMPLEXITY', 'JSON exceeds depth/node safety bounds', true);
      return { format, mode: strict ? 'strict' : 'compatibility', errors, warnings };
    }
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) add(`${path}.${key}`, 'UNSAFE_PROPERTY', 'Reserved object property');
      pending.push([child, `${path}.${key}`, depth + 1]);
    }
    else if (typeof value === 'number' && !Number.isFinite(value) || ['function','symbol','bigint','undefined'].includes(typeof value)) add(path, 'INVALID_JSON_VALUE', 'Expected a finite JSON value', true);
  }
  if (strict && (typeof data.documentId !== 'string' || !data.documentId.trim() || data.documentId.length > 200)) add('$.documentId', 'MISSING_ID', 'Expected stable document identity');
  if (strict && !object(data.root.props)) add('$.root.props','INVALID_PROPS','Canonical root requires props object');
  const ids = new Set(); let count = 0;
  function props(value, definitions, path, defaults = {}, depth = 0) {
    if (!object(value)) { add(path, 'INVALID_PROPS', 'Expected an object'); return; }
    for (const [key, val] of Object.entries(value)) {
      if (key === 'id') continue;
      const field = own(definitions, key) ? definitions[key] : null;
      if (field) check(val, field, `${path}.${key}`, depth, defaults[key]);
      else if (own(defaults,key)) check(val, inferred(defaults[key]),`${path}.${key}`,depth);
      else add(`${path}.${key}`, 'UNKNOWN_PROPERTY', 'Not registered in component contract; preserved in compatibility mode');
    }
  }
  function inferred(value) {
    if (Array.isArray(value)) return {type:'array',properties:{}};
    if (object(value)) return {type:'object',properties:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,inferred(v)]))};
    return {type:typeof value};
  }
  function check(value, f, path, depth, defaultValue) {
    // Some shipped defaults predate current panel ranges/options. Their exact
    // values remain accepted; this does not widen the permitted authored range.
    const exactDefault = defaultValue !== undefined && JSON.stringify(value) === JSON.stringify(defaultValue);
    switch (f.type) {
      case 'slot': nodes(value,path,depth+1,f.allowedChildren); break;
      case 'responsive':
        if (!object(value)) { add(path,'INVALID_RESPONSIVE','Expected breakpoint object'); break; }
        for (const [bp, values] of Object.entries(value)) {
          if (!['desktop','tablet','mobile'].includes(bp)) add(`${path}.${bp}`,'INVALID_BREAKPOINT','Supported breakpoints: desktop, tablet, mobile');
          props(values,f.properties,`${path}.${bp}`,defaultValue?.[bp] || {},depth);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) { add(path,'INVALID_TYPE','Expected array'); break; }
        value.forEach((v,i)=>props(v,f.properties,`${path}[${i}]`,f.defaultItem||{},depth)); break;
      case 'object': props(value,f.properties,path,{},depth); break;
      case 'enum': if (!exactDefault && !f.values.some(v=>v===value)) add(path,'INVALID_ENUM','Value is not a registered option'); break;
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) add(path,'INVALID_TYPE','Expected finite number');
        else if (!exactDefault && (f.min!==undefined&&value<f.min || f.max!==undefined&&value>f.max)) add(path,'OUT_OF_RANGE',`Expected ${f.min ?? '-infinity'} to ${f.max ?? 'infinity'}`); break;
      case 'boolean': if (typeof value!=='boolean') add(path,'INVALID_TYPE','Expected boolean'); break;
      case 'string':
        if (typeof value!=='string') { add(path,'INVALID_TYPE','Expected string'); break; }
        if (f.semantic==='url' && !safeUrl(value)) add(path,'UNSAFE_URL','Expected http(s), mailto, tel, fragment or relative URL');
        if (f.semantic==='link-list') for(const line of value.split('\n').filter(v=>v.trim())) {
          const href=line.split('|')[1]?.trim();
          if(href && !safeUrl(href))add(path,'UNSAFE_URL','Unsafe URL in label|href list');
        }
        if (f.semantic==='color' && /[;{}<>\\]|url\s*\(|expression\s*\(/i.test(value)) add(path,'UNSAFE_STYLE','Unsafe color value');
        // Freeform CSS lengths/font families enter generated style text in these views.
        if (/\.(?:responsive\.[^.]+\.[^.]+|fontFamily|contentWidth)$/.test(path) && /[;{}<>\\]|url\s*\(|expression\s*\(/i.test(value)) add(path,'UNSAFE_STYLE','Unsafe CSS value');
        break;
      default: add(path,'UNSUPPORTED_FIELD','Contract needs an explicit field type');
    }
  }
  function nodes(list,path,depth=0,allowed=null) {
    if (!Array.isArray(list)) { add(path,'MALFORMED_SLOT','Expected component array'); return; }
    if (depth>MAX_DEPTH) { add(path,'DOCUMENT_DEPTH',`Maximum component depth is ${MAX_DEPTH}`,true); return; }
    for(let i=0;i<list.length;i++) {
      const node=list[i], p=`${path}[${i}]`;
      if (++count>MAX_COMPONENTS) { add(p,'COMPONENT_LIMIT',`Maximum ${MAX_COMPONENTS} components`,true); return; }
      if(!object(node)||typeof node.type!=='string'||!object(node.props)) {add(p,'INVALID_COMPONENT','Expected type and props');continue;}
      const id=node.props.id;
      if(typeof id!=='string'||!id||id.length>200) add(`${p}.props.id`,'MISSING_ID','Expected stable component ID');
      else if(ids.has(id)) add(`${p}.props.id`,'DUPLICATE_ID',`Duplicate ID ${id}`); else ids.add(id);
      if(!own(registry.components,node.type)) {add(`${p}.type`,'UNKNOWN_COMPONENT','Component is not registered');continue;}
      if(allowed && !allowed.includes(node.type)) add(`${p}.type`,'DISALLOWED_CHILD','Component is not permitted in this slot');
      const c=registry.components[node.type]; props(node.props,c.properties,`${p}.props`,c.defaults,depth);
    }
  }
  props(data.root.props ?? {},registry.root.properties,'$.root.props',registry.root.defaults);
  nodes(data.content,'$.content');
  if(data.zones!==undefined) {
    if(!object(data.zones)) add('$.zones','MALFORMED_SLOT','Expected Puck zone map');
    else for(const [key,zone] of Object.entries(data.zones)) nodes(zone,`$.zones.${key}`);
  }
  if(data.metadata!==undefined) {
    props(data.metadata,{title:{type:'string'},description:{type:'string'},canonicalUrl:{type:'string',semantic:'url'},noIndex:{type:'boolean'}},'$.metadata');
  }
  for(const key of ['themeRef','globalLayoutRef']) if(data[key]!==undefined&&typeof data[key]!=='string')add(`$.${key}`,'INVALID_REFERENCE','Expected versioned reference string');
  return { format, mode: strict ? 'strict' : 'compatibility', errors, warnings, componentCount:count };
}
module.exports={FORMAT,SCHEMA_VERSION,MAX_DEPTH,MAX_COMPONENTS,registry,createPageDocument,forkPageDocument,detectDocumentFormat,retainDocumentEnvelope,inspectDocument,safeUrl};
