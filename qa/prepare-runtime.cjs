const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.cwd(),target=path.join(root,'scratch','qa-runtime');fs.mkdirSync(target,{recursive:true});
for(const dir of ['src','public'])fs.cpSync(path.join(root,dir),path.join(target,dir),{recursive:true});
for(const file of ['package.json','tsconfig.json','next.config.ts','tailwind.config.ts','postcss.config.mjs','next-env.d.ts'])fs.copyFileSync(path.join(root,file),path.join(target,file));
if(!fs.existsSync(path.join(target,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(target,'node_modules'),'junction');
fs.mkdirSync(path.join(target,'data'),{recursive:true});
const qaSecret=crypto.randomBytes(40).toString('hex');const qaPassword=crypto.randomBytes(24).toString('base64url');
fs.writeFileSync(path.join(target,'.env.local'),[
'ADMIN_JWT_SECRET='+qaSecret,'SUPER_ADMIN_PASSWORD='+qaPassword,
'DATABASE_URL=postgresql://isolated:isolated@127.0.0.1:9/qa','SUPABASE_DATABASE_URL=postgresql://isolated:isolated@127.0.0.1:9/qa',
'SUPABASE_DB_HOST=127.0.0.1','SUPABASE_DB_PORT=9','SUPABASE_DB_USER=isolated','SUPABASE_DB_PASSWORD=isolated',
'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9','NEXT_PUBLIC_SUPABASE_ANON_KEY=isolated-qa-placeholder','SUPABASE_SERVICE_ROLE_KEY=isolated-qa-placeholder',
'NEXT_PUBLIC_APP_URL=http://localhost:3001','RAZORPAY_KEY_ID=rzp_test_placeholder_key','NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_placeholder_key',
'RAZORPAY_KEY_SECRET=isolated-qa-secret','RAZORPAY_WEBHOOK_SECRET=isolated-qa-webhook-secret'].join('\n'));
console.log('Isolated copy created without production environment or RFID storage. All configured remote services point to loopback port 9; payment provider placeholder is simulation only.');
