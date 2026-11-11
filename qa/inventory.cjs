const fs=require('fs'),path=require('path'),ts=require('typescript');
const out='qa'; fs.mkdirSync(out,{recursive:true});
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const files=[...walk('src/app'),...walk('src/components')], pages=[],apis=[],controls=[];
for(const f of files){if(!/\.(tsx?|jsx?)$/.test(f))continue;const s=fs.readFileSync(f,'utf8');const route='/'+path.dirname(f).replaceAll('\\','/').replace(/^src\/app\/?/,'');
 if(/page\.tsx$/.test(f))pages.push({route,file:f,apis:[...new Set(s.match(/\/api\/[\w/.-]+/g)||[])],status:'NOT TESTED'});
 if(/route\.ts$/.test(f))apis.push({route,file:f,methods:[...s.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)/g)].map(m=>m[1]),status:'NOT TESTED'});

 const ast=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const tag=n.tagName.getText(ast);if(['button','input','select','textarea','form','a','Link','NextLink'].includes(tag)||/onClick|onChange|onSubmit|role=/.test(n.attributes.getText(ast))||/Select|DatePicker|Dropdown|Dialog|Button|Input|Toggle|Tabs/.test(tag)){const pos=ast.getLineAndCharacterOfPosition(n.getStart());controls.push({id:'UI-'+String(controls.length+1).padStart(4,'0'),route,file:f,line:pos.line+1,tag,attributes:n.attributes.getText(ast),label:n.parent?.getText(ast).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,180),status:'NOT TESTED',evidence:''});}}ts.forEachChild(n,visit);}visit(ast);
}
fs.writeFileSync(out+'/inventory.json',JSON.stringify({pages,apis,controls},null,2));
const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(out+'/master-checklist.csv',[['ID','Page','File','Line','Element','Label','Status','Evidence'],...controls.map(c=>[c.id,c.route,c.file,c.line,c.tag,c.label,c.status,c.evidence])].map(row=>row.map(esc).join(',')).join('\n'));
fs.writeFileSync(out+'/STATUS.md','# Sri Tayi Grand execution QA — 11 November 2026\n\nIN PROGRESS. No production acceptance granted.\n\n- Production public Instant Enter reproduced Super Admin login without credential entry (P0).\n- Local port 3000 occupied by unrelated Renuka project; protected port must remain unchanged.\n- Staging configuration location requested; production mutation tests blocked until isolated database identified.\n- Physical RFID test has no operator: NOT TESTED. Status probe pending.\n- Frozen RFID files and hooks must remain unchanged.\n- Master checklist is source-discovered controls; NOT TESTED is deliberate until execution evidence is added. Dynamic row instances and modal contents require runtime inventory.\n');
console.log(JSON.stringify({pages:pages.length,apis:apis.length,sourceControlDefinitions:controls.length}));

