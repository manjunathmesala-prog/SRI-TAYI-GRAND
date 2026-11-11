const fs=require('fs'),crypto=require('crypto');
const read=(name,fallback={})=>{try{return JSON.parse(fs.readFileSync('qa/evidence/'+name+'.json','utf8'))}catch{return fallback}};
const inventory=JSON.parse(fs.readFileSync('qa/inventory.json','utf8'));
const rows=[];
function add(id,page,action,layer,status,evidence,note='',file=''){
 const row={ID:id,Module:page.split('/').filter(Boolean).slice(0,2).join('/'),Page:page,'Button/action':action,File:file,Frontend:'NOT TESTED',Backend:'NOT TESTED',Database:'NOT TESTED',Local:'NOT TESTED',Cloud:'NOT TESTED',Realtime:'NOT TESTED','RFID hardware':'NOT TESTED','Test status':status,Layer:layer,Evidence:evidence,Notes:note};
 if(layer.startsWith('UI')||layer==='form')row.Frontend=status;
 if(layer.startsWith('HTTP'))row.Backend=status;
 if(layer==='persistence')row.Database=status;
 if(layer==='physical hardware')row['RFID hardware']=status;
 rows.push(row);return row;
}
const limitations=p=>p.includes('rfid')?'Frozen RFID pipeline; no physical operator; no mutation or card lifecycle acceptance.':p.includes('payment')||p.includes('checkout')?'Full payment capture, webhook, refund and durable ledger require a separate staging environment.':'Not individually traced through every assertion; runtime rows below document executed instances. Full write/persistence workflows require a separate staging environment.';
for(const c of inventory.controls)add(c.id,c.route,`${c.tag}: ${c.label}`,'source definition','NOT TESTED',`${c.file}:${c.line}`,limitations(c.route),`${c.file}:${c.line}`);
const b=read('browser-execution'),re=read('browser-retest'),extra=read('additional-browser'),pub=read('public-browser'),last=read('final-browser');
const navigation=new Map();
for(const [doc,name] of [[b,'browser-execution'],[re,'browser-retest']])for(const p of doc.pages||[])navigation.set('/admin/'+p.page,{status:p.status,evidence:name,note:p.error||'Rendered heading; business workflow not implied.'});
for(const [doc,name] of [[extra,'additional-browser'],[pub,'public-browser'],[last,'final-browser']])for(const p of doc.routes||[])navigation.set(p.route,{status:p.result||p.status,evidence:name,note:'Render/redirect or specified not-found state only. Public images and external embeds blocked.'});
navigation.set('/admin/login',{status:'PASS',evidence:'browser-execution',note:'Login screen and configured credentials tested.'});
for(const p of inventory.pages){let n=navigation.get(p.route);if(p.route==='/rooms/[slug]')n=navigation.get('/rooms/double-room');if(p.route==='/booking/confirmation/[reference]')n=navigation.get('/booking/confirmation/QA-NONEXISTENT');if(p.route==='/booking/pickup/[code]')n=navigation.get('/booking/pickup/QA-NONEXISTENT');add('ROUTE-'+p.route,p.route,'Direct route render / specified redirect','UI navigation',n?.status||'NOT TESTED',n?'qa/evidence/'+n.evidence+'.json':p.file,(n?.note||'Not executed')+(p.route.includes('[')?' Dynamic confirmation/pickup tested with invalid identifiers only; no valid booking lifecycle.':''),p.file);}
for(const a of inventory.apis)for(const method of a.methods)add('API-INVENTORY-'+a.route+'-'+method,a.route,method+' endpoint discovered','source definition','NOT TESTED',a.file,'Inventory entry, not a claim about unexecuted methods. Exact HTTP probes are separate rows.',a.file);
for(const [doc,name] of [[b,'browser-execution'],[re,'browser-retest']])for(const [i,a]of(doc.actions||[]).entries())add(name+'-'+i,'/admin/'+a.page,a.action,'UI action',a.status,'qa/evidence/'+name+'.json',a.scope||a.error||'Assertion is limited to this action. Download is not report-calculation verification.');
const forms=read('form-execution');
for(const [i,f]of(forms.forms||[]).entries()){
 const corrected=f.page==='accounting';
 add('FORM-'+i,'/admin/'+f.page,'Open '+f.button,'form',corrected?'PASS':f.status,'qa/evidence/'+(corrected?'additional-browser':'form-execution')+'.json',corrected?'Initial harness tried clicking a disabled submit; corrected test verifies disabled state and cancellation.':'Modal opening only.');
 if(f.emptySubmission)add('FORM-EMPTY-'+i,'/admin/'+f.page,'Submit with missing required fields','form',f.emptySubmission.status,'qa/evidence/form-execution.json','Required fields and absence of business writes observed.');
 if(f.cancelStatus)add('FORM-CANCEL-'+i,'/admin/'+f.page,'Cancel modal','form',f.cancelStatus,'qa/evidence/form-execution.json','Form count restored.');
}
for(const [doc,name]of[[extra,'additional-browser'],[pub,'public-browser'],[last,'final-browser']])for(const [i,c]of(doc.checks||[]).entries())add(name+'-check-'+i,c.route||'/admin',c.name,'UI assertion',c.status,'qa/evidence/'+name+'.json',c.scope||c.reason||'');
for(const [i,a]of read('api-readonly',[]).entries())add('HTTP-PROD-'+i,a.route,(a.authenticated?'Authenticated':'Anonymous')+' GET','HTTP read',a.authenticated?a.status===200?'PASS':'FAIL':[200,401,403].includes(a.status)?'PASS':'FAIL','qa/evidence/api-readonly.json','Production read-only status/response shape; public category and language reads intentional; no mutation/persistence proof.');
for(const [i,a]of read('rbac-http',[]).entries())add('AUTH-'+i,a.route||'/admin/dashboard',a.name,'HTTP authorization',a.status,'qa/evidence/rbac-http.json','Isolated actual HTTP request.');
for(const [i,a]of read('negative-api-after',[]).entries())if(a.route)add('VALIDATION-'+i,'/api/admin/'+a.route,'Invalid payload rejected','HTTP validation',a.result,'qa/evidence/negative-api-after.json','Before/after evidence retained.');
for(const a of read('restart-persistence',[]))add('DURABILITY-'+a.route,'/admin/'+a.route,'Create → acknowledged → real process restart → read','persistence',a.status,'qa/evidence/positive-api.json; qa/evidence/restart-persistence.json','Before 1 matching record, after 0. Database deliberately unreachable; success was false. Root cause in frozen src/lib/db/repository.ts.','src/lib/db/repository.ts');
add('BOOKING-CONCURRENCY','/api/admin/bookings','Two concurrent requests for same room/dates','HTTP concurrency','PASS','qa/evidence/booking-concurrency-after.json','200 + 409 and exactly one retained local booking. Distributed database concurrency and other endpoints NOT TESTED.');
add('DB-READONLY','Supabase','Read schema, counts, RLS, constraints, indexes and buckets','database metadata','PASS','qa/evidence/database-readonly.json; qa/evidence/schema-security.json','49 tables, 85 indexes; metadata inspection only.');
add('DB-RFID-RLS','rfid_tap_history','Anonymous role has all CRUD grants and public ALL policy','security','FAIL','qa/evidence/schema-security.json; qa/evidence/database-readonly.json','Metadata confirms unsafe grants/policy. No destructive proof attempted; frozen pipeline unchanged.');
add('DB-SEEDS','/admin','Compare production API counts to cloud table counts','data integrity','FAIL','qa/evidence/api-readonly.json; qa/evidence/database-readonly.json','Source repository initializes business fixtures and merges cloud data. Displayed data are not authoritative.');
for(const [i,a]of read('rfid-status',[]).entries())add('RFID-STATUS-'+i,a.url,'GET /api/status','provider status',a.status===200?'PASS':'EXTERNAL DEPENDENCY','qa/evidence/rfid-status.json','Bridge status only. Not a card tap, encoding, revocation or door-open observation.');
add('RFID-PHYSICAL','/admin/rfid','Issue → encode → physical tap → revoke → denied door access','physical hardware','NOT TESTED','User: no operator available','No physical events synthesized or hardware writes attempted.');
add('RAZORPAY','Razorpay test API','Create and fetch INR 1 sandbox order','provider',read('razorpay-provider').status||'NOT TESTED','qa/evidence/razorpay-provider.json','No charge/capture/refund/webhook/ledger acceptance.');
for(const [id,page,action,note]of[
 ['STAGING','All business modules','Cloud CRUD and relational durability','Supplied configuration matches production; separate staging location never established.'],
 ['REALTIME','All shared modules','Persisted cross-session updates and reconnect recovery','No genuine isolated cloud transaction to correlate; local SSE does not prove cloud persistence.'],
 ['OFFLINE','All shared modules','Offline queue, conflict resolution and recovery','Database-outage failure reproduced; no durable offline queue/recovery acceptance.'],
 ['STORAGE','/admin/content','Upload validation and settings/gallery persistence','Storage metadata read; upload/delete transactions not executed without staging.'],
 ['PAYMENT-LIFECYCLE','/admin/payments','Capture, duplicate webhook, refund, ledger reconciliation','Order-only sandbox evidence; provider callback/capture/webhook end-to-end not executed.'],
 ['LOAD','All routes','Sustained load and subscription/memory leak testing','Only sequential HTTP timings and two-request local booking concurrency measured.'],
 ['DEPLOY','Production','Deploy and live regression','Not deployed: unresolved critical defects and missing staging.'],
 ['RFID-CHANGE','src/lib/db/repository.ts','Repair durable repository without changing frozen components','AGENTS.md Section 7 prohibits editing listed shared repository; requires a scoped policy change before repair.']])add(id,page,action,'acceptance limitation','BLOCKED','qa/FINAL-REPORT.md',note);
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync('qa/master-checklist.csv',[Object.keys(rows[0]),...rows.map(Object.values)].map(r=>r.map(csv).join(',')).join('\n'));
const counts={};for(const r of rows)counts[r['Test status']]=(counts[r['Test status']]||0)+1;
const tags={};for(const c of inventory.controls)tags[c.tag]=(tags[c.tag]||0)+1;
const baseline=read('frozen-baseline',[]);const frozen=baseline.map(x=>({...x,unchanged:fs.existsSync(x.file)&&crypto.createHash('sha256').update(fs.readFileSync(x.file)).digest('hex')===x.hash}));fs.writeFileSync('qa/evidence/frozen-verification.json',JSON.stringify(frozen,null,2));
const summary={updatedAt:new Date().toISOString(),sourcePages:inventory.pages.length,apiRoutes:inventory.apis.length,controls:inventory.controls.length,tags,rows:rows.length,counts,frozenFilesUnchanged:frozen.every(x=>x.unchanged)};
fs.writeFileSync('qa/evidence/final-counts.json',JSON.stringify(summary,null,2));
fs.writeFileSync('qa/STATUS.md',`# Sri Tayi Grand execution QA\n\nNOT READY — CRITICAL ISSUES REMAIN.\n\nUpdated: ${summary.updatedAt}\n\nExecution and local correction pass completed; production acceptance remains blocked. No deployment or production business-data mutation was performed.\n\nInventory: ${inventory.pages.length} page routes, ${inventory.apis.length} API routes, ${inventory.controls.length} source interactive definitions. All 28 requested admin routes rendered. Dynamic booking routes have negative-state coverage only.\n\nMaster matrix counts: ${JSON.stringify(counts)}. These are heterogeneous assertions/inventory rows, not a feature pass rate. Source definitions are deliberately not automatically equated with runtime instances.\n\nRead [FINAL-REPORT.md](FINAL-REPORT.md), [master-checklist.csv](master-checklist.csv), and [connection-matrix.csv](connection-matrix.csv). Original failures and retests remain in evidence/.\n\nRelease blockers: acknowledged data loss on restart, production fixture contamination, unsafe RFID-history permissions, staging unavailable, and local security fixes not deployed. Physical RFID acceptance remains NOT TESTED. All ${frozen.length} baselined protected files unchanged: ${summary.frozenFilesUnchanged}.\n`);
console.log(JSON.stringify(summary));
