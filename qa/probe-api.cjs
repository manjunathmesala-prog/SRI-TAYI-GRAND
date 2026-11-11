const fs=require('fs');process.loadEnvFile('.env.local');
(async()=>{const base='https://www.sritayigrand.com', results=[];
const login=await fetch(base+'/api/admin/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_DEFAULT_EMAIL,password:process.env.ADMIN_DEFAULT_PASSWORD}),signal:AbortSignal.timeout(20000)});const data=await login.json();
if(!data.session?.token){console.log('Configured login failed: '+login.status);return;}
const inv=JSON.parse(fs.readFileSync('qa/inventory.json','utf8'));
const routes=inv.apis.filter(a=>a.methods.includes('GET') && !a.route.includes('[') && (a.route.startsWith('/api/admin/')||['/api/rooms','/api/room-categories','/api/settings'].includes(a.route)) && !/stream|auth|rfid|notifications/.test(a.route));
for(const {route} of routes){for(const authenticated of [false,true]){try{const start=Date.now();const r=await fetch(base+route,{headers:authenticated?{authorization:'Bearer '+data.session.token}:{},signal:AbortSignal.timeout(25000)});const body=await r.json();const counts=Object.fromEntries(Object.entries(body).filter(([k,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]));results.push({route,authenticated,status:r.status,ms:Date.now()-start,success:body.success,keys:Object.keys(body),counts,error:body.error});}catch(e){results.push({route,authenticated,error:e.message});}}
} fs.writeFileSync('qa/evidence/api-readonly.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));})();

