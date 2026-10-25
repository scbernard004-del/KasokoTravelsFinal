import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import api from '../api/bookings.mjs';
import core from '../booking-core.js';
let checks=0;const ok=(value,message)=>{assert(value,message);checks++;};
const base={service:'hotel',destination:'Tanga Beach Resort',origin:'Arusha',startDate:'2027-12-10',endDate:'2027-12-12',adults:2,children:1,childAges:'7',infants:0,rooms:1,tripType:'return',roomType:'Family',mealPlan:'Breakfast',travelClass:'Economy',operator:'',time:'',style:'',currency:'TZS',budget:'0',name:'Test Traveller',phone:'+255 700 000 000',email:'test@example.test',contactMethod:'email',notes:'A quiet room',addons:['transfer'],consent:true,language:'en',requestId:'KST-qa-request-1234567890',website:''};
const request=(body=base,method='POST',headers={})=>new Request('https://kasoko.test/api/bookings',{method,headers:{'Content-Type':'application/json',origin:'https://kasoko.test',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const originalFetch=globalThis.fetch,originalUrl=process.env.BOOKING_WEBHOOK_URL,originalSecret=process.env.BOOKING_WEBHOOK_SECRET;
try{
 delete process.env.BOOKING_WEBHOOK_URL;delete process.env.BOOKING_WEBHOOK_SECRET;
 ok((await api.fetch(request(base,'GET'))).status===405,'Reject GET');
 ok((await api.fetch(request(base,'POST',{'Content-Type':'text/plain'}))).status===415,'Reject non-JSON');
 ok((await api.fetch(request(base,'POST',{origin:'https://unrelated.test'}))).status===403,'Reject unrelated origin');
 ok((await api.fetch(request('{bad json'))).status===400,'Reject malformed JSON');
 ok((await api.fetch(request('x'.repeat(18001)))).status===413,'Limit payload');
 ok((await api.fetch(request({...base,website:'spam'}))).status===400,'Honeypot validation');
 ok((await api.fetch(request({...base,requestId:'short'}))).status===400,'Request ID validation');
 ok((await api.fetch(request({...base,consent:false}))).status===400,'Consent validation');
 ok((await api.fetch(request({...base,startDate:'2027-02-30'}))).status===400,'Calendar validation');
 ok((await api.fetch(request({...base,endDate:base.startDate}))).status===400,'Hotel minimum night');
 ok((await api.fetch(request({...base,children:2,childAges:'7'}))).status===400,'Child ages count');
 ok((await api.fetch(request({...base,adults:1,infants:2}))).status===400,'Infant supervision');
 ok((await api.fetch(request({...base,email:'broken'}))).status===400,'Email validation');
 ok((await api.fetch(request({...base,adults:true}))).status===400,'Reject boolean counts');
 ok((await api.fetch(request({...base,notes:'x'.repeat(2001)}))).status===400,'Notes size validation');
 ok((await api.fetch(request(base))).status===503,'Unconfigured endpoint is never success');
 process.env.BOOKING_WEBHOOK_URL='https://script.google.com/macros/s/qa-test/exec';process.env.BOOKING_WEBHOOK_SECRET='qa-only-secret';
 let payloads=[];
 globalThis.fetch=async(url,options)=>{payloads.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true,status:'request_received',reference:payloads.at(-1).reference}),{status:200});};
 for(const service of core.types){const r=await api.fetch(request({...base,service}));const b=await r.json();ok(r.ok&&b.ok&&b.bookingConfirmed===false,'Request receipt for '+service);ok(/^KST-[A-F0-9]{12}$/.test(b.reference),'Reference for '+service);}
 await api.fetch(request(base));const a=payloads.at(-1).reference;await api.fetch(request(base));ok(a===payloads.at(-1).reference,'Stable retry reference');
 await api.fetch(request({...base,service:'flight',tripType:'oneway'}));ok(payloads.at(-1).booking.endDate==='','One-way clears stale return');
 ok(core.summary(base).some(([k,v])=>k==='Total budget'&&v==='TZS 0'),'Zero budget included');
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'receiver_error'}));ok((await api.fetch(request())).status===502,'Reject receiver error');
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,status:'request_received',reference:'KST-WRONG'}));ok((await api.fetch(request())).status===502,'Reject mismatched reference');
 globalThis.fetch=async()=>{throw new Error('Network timeout')};ok((await api.fetch(request())).status===502,'Network errors never success');
 // Exercise the Apps Script receiver entirely in memory; no spreadsheet or email is contacted.
 const rows=[[]];let emails=0;
 const sheet={getLastRow:()=>rows.length,getRange:(r,c,n)=>({getValues:()=>rows.slice(r-1,r-1+(n||1)).map(row=>[row[c-1]]),setValue:v=>{rows[r-1][c-1]=v}}),appendRow:r=>rows.push(r)};
 const context={JSON,Date,Error,Array,String,PropertiesService:{getScriptProperties:()=>({getProperty:k=>({WEBHOOK_SECRET:'secret',ALERT_EMAIL:'qa@example.test',SHEET_ID:'test-sheet'}[k])})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},MailApp:{sendEmail(){emails++}}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../google-apps-script-alerts-template.txt',import.meta.url),'utf8'),context);
 const receipt={secret:'secret',reference:'KST-QATEST000001',booking:{...base,name:'=1+1',notes:'@SUM(1,2)'},summary:core.summary(base)};
 const result=context.doPost({postData:{contents:JSON.stringify(receipt)}});ok(result.ok,'Receiver saves before success');ok(rows[1][23]==="'=1+1",'Spreadsheet formula injection escaped');ok(rows[1][27]==="'@SUM(1,2)",'Notes stored literally');
 context.doPost({postData:{contents:JSON.stringify(receipt)}});ok(rows.length===2&&emails===1,'Receiver deduplicates rows and alerts');
 console.log(JSON.stringify({status:'PASS',checks,externalRequestsSent:0}));
}finally{globalThis.fetch=originalFetch;if(originalUrl===undefined)delete process.env.BOOKING_WEBHOOK_URL;else process.env.BOOKING_WEBHOOK_URL=originalUrl;if(originalSecret===undefined)delete process.env.BOOKING_WEBHOOK_SECRET;else process.env.BOOKING_WEBHOOK_SECRET=originalSecret;}
