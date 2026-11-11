const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const base='http://127.0.0.1:3006';
const report={scope:'Isolated local app; external requests and images blocked; no valid business submissions',routes:[],checks:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1254/chrome-win64/chrome.exe')});
 try {
  const ctx=await browser.newContext();
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===base&&r.request().resourceType()!=='image'?r.continue():r.abort());
  const page=await ctx.newPage();page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(15000);
  for(const [route,expected] of [['/rooms/double-room',/Double/i],['/rooms/qa-does-not-exist',/404|not found/i],['/booking/confirmation/QA-NONEXISTENT',/404|not found/i],['/booking/pickup/QA-NONEXISTENT',/not found|could not|invalid|unavailable/i]]){
   const row={route,expected:String(expected)};
   try{const r=await page.goto(base+route);await page.getByRole('heading',{name:expected}).first().waitFor({timeout:45000});row.http=r.status();row.headings=await page.locator('h1,h2').allTextContents();row.status=expected.test(row.headings.join(' '))?'PASS':'FAIL';}catch(e){row.status='FAIL';row.error=e.message.slice(0,200);}
   report.routes.push(row);fs.writeFileSync('qa/evidence/final-browser.json',JSON.stringify(report,null,2));
  }
  for(const route of ['/contact','/convention-hall','/booking/checkout','/walk-in']){
   await page.goto(base+route);const forms=page.locator('form');
   for(let i=0;i<await forms.count();i++){
    const form=forms.nth(i),submit=form.locator('button[type=submit],input[type=submit]').first();
    const row={route,name:'Empty form submission '+i,scope:'Required fields block business writes; background availability POST is read-only'};let writes=[];const listener=r=>{const pathname=new URL(r.url()).pathname;if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&pathname.startsWith('/api/')&&pathname!=='/api/availability/check')writes.push(pathname)};page.on('request',listener);
    try{if(!await submit.count()){row.status='NOT TESTED';row.reason='No explicit submit control';}else if(await submit.isDisabled()){row.status='PASS';row.reason='Submission disabled';}else{await submit.click();await page.waitForTimeout(250);row.invalidFields=await form.locator(':invalid').count();row.writes=writes;row.status=row.invalidFields>0&&!writes.length?'PASS':'FAIL';}}catch(e){row.status='NOT TESTED';row.reason=e.message.slice(0,200);}finally{page.off('request',listener)}
    report.checks.push(row);
   }
  }
  await page.goto(base+'/admin/login');await page.locator('#staff-email-input').fill('admin@sritayigrand.com');await page.locator('#staff-password-input').fill('deliberately-wrong-qa-password');const resp=page.waitForResponse(r=>r.url().endsWith('/api/admin/auth')&&r.request().method()==='POST');await page.locator('form button[type=submit]').click();const rejected=await resp;report.checks.push({route:'/admin/login',name:'Invalid password rejected',http:rejected.status(),status:rejected.status()===401&&page.url().includes('/admin/login')?'PASS':'FAIL'});
 }finally{fs.writeFileSync('qa/evidence/final-browser.json',JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
