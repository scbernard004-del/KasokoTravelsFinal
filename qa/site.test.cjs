/* Browser DOM behavior tests. No real network, email, WhatsApp or payment is used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let checks=0, mockedRequests=0;
function ok(v,message){assert(v,message);checks++;}
function eq(a,b,message){assert.equal(a,b,message);checks++;}
function open(file,query='',lang='en',blockedStorage=false){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(ROOT,file),'utf8'),{url:'https://kasoko.test/'+file+query,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;
 w.fetch=()=>{throw Error('Unexpected external request')};
 w.URL.createObjectURL=()=> 'blob:https://kasoko.test/qa';w.URL.revokeObjectURL=()=>{};
 w.localStorage.setItem('kt-lang',lang);
 if(blockedStorage)Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage blocked')}});
 for(const s of w.document.querySelectorAll('script[src]')){
  const src=s.getAttribute('src').split('?')[0];
  if(!/^https?:/.test(src))w.eval(fs.readFileSync(path.join(ROOT,src),'utf8'));
 }
 return {dom,w,d:w.document,errors,close:()=>w.close()};
}
function input(t,id,value){const el=t.d.getElementById(id);el.value=value;el.dispatchEvent(new t.w.Event('input',{bubbles:true}));el.dispatchEvent(new t.w.Event('change',{bubbles:true}));}
const wait=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const pages=fs.readdirSync(ROOT).filter(f=>f.endsWith('.html')).sort();
 for(const file of pages){
  const t=open(file);eq(t.d.compatMode,'CSS1Compat',file+' standards mode');eq(t.d.querySelectorAll('h1').length,1,file+' one H1');
  for(const lang of ['en','sw']){
   if(t.d.documentElement.lang!==lang)t.d.querySelector('[data-lang-toggle]').click();
   eq(t.d.documentElement.lang,lang,file+' language');
   for(const el of t.d.querySelectorAll('[data-i18n]'))ok(!!t.w.KASOKO_TEXT[lang][el.dataset.i18n],file+' translation '+el.dataset.i18n);
   for(const img of t.d.querySelectorAll('img')){ok(img.hasAttribute('alt'),file+' alt');const src=img.getAttribute('src');if(!/^https?:/.test(src))ok(fs.existsSync(path.join(ROOT,src.split('?')[0])),file+' image '+src);}
   const ids=[...t.d.querySelectorAll('[id]')].map(el=>el.id);eq(new Set(ids).size,ids.length,file+' unique DOM ids');
   ok(!/\bkenya\b|maasai mara|masai mara|nairobi/i.test(t.d.body.textContent),file+' Tanzania only');
   if(t.d.body.dataset.item){const c=t.w.KASOKO_CATALOG,item=[...c.destinations,...c.hotels].find(i=>i.id===t.d.body.dataset.item);eq(t.d.querySelector('h1').textContent,typeof item.name==='string'?item.name:item.name[lang],file+' localized title');eq(t.d.querySelector('.detail-photo img').getAttribute('src'),item.images[0],file+' matching photograph');}
  }
  t.d.querySelector('[data-theme-toggle]').click();eq(t.d.documentElement.dataset.theme,'night',file+' dark mode');
  t.d.querySelector('[data-menu-toggle]').click();eq(t.d.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'),'true',file+' menu opens');
  t.d.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));eq(t.d.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'),'false',file+' menu escape');
  t.w.scrollY=80;t.w.dispatchEvent(new t.w.Event('scroll'));ok(t.d.querySelector('header').classList.contains('scrolled'),file+' compact header');t.w.scrollY=30;t.w.dispatchEvent(new t.w.Event('scroll'));ok(t.d.querySelector('header').classList.contains('scrolled'),file+' stable threshold');t.w.scrollY=0;t.w.dispatchEvent(new t.w.Event('scroll'));ok(!t.d.querySelector('header').classList.contains('scrolled'),file+' header restores');
  eq(t.errors.length,0,file+' runtime errors');t.close();
 }
 for(const [file,kind] of [['safaris.html','safari'],['tours.html','tour'],['hotels.html','hotel']]){
  const t=open(file),grid=t.d.getElementById(kind+'-grid'),search=t.d.querySelector('[data-search="'+kind+'"]');
  const all=t.w.KASOKO_CATALOG[kind==='hotel'?'hotels':'destinations'].filter(x=>kind==='hotel'||x.service===kind);
  const filters=[...t.d.querySelectorAll('[data-region]')].map(b=>b.dataset.region);
  for(const region of filters){
   [...t.d.querySelectorAll('[data-region]')].find(b=>b.dataset.region===region).click();
   eq(t.d.activeElement.dataset.region,region,'Filter focus is preserved');
   const expected=all.filter(x=>region==='all'||x.region===region);eq(grid.querySelectorAll('.card').length,Math.min(12,expected.length),'Region '+kind+' '+region);
  }
  t.d.querySelector('[data-region="all"]').click();
  search.value='no such destination xyz';search.dispatchEvent(new t.w.Event('input'));ok(grid.querySelector('.collection-empty'),'Empty search is explained');
  search.value='';search.dispatchEvent(new t.w.Event('input'));const more=t.d.querySelector('[data-more]');if(more&&!more.hidden){more.click();eq(grid.querySelectorAll('.card').length,all.length,'Show more all '+kind);}
  if(kind==='hotel'){search.value='melia';search.dispatchEvent(new t.w.Event('input'));eq(grid.querySelectorAll('.card').length,1,'Search handles accents');ok(grid.textContent.includes('Meliá'),'Correct hotel match');}
  t.close();
 }
 {
  const t=open('index.html');for(const kind of ['safari','tour','hotel'])eq(t.d.querySelectorAll('#'+kind+'-grid .card').length,3,'Curated homepage '+kind);
  const hotels=t.d.querySelector('#hotel-grid').textContent;ok(hotels.includes('Meliá')&&hotels.includes('Manyara')&&hotels.includes('Tanga'),'Home represents all three focus regions');
  const img=t.d.querySelector('#hotel-grid img'),original=img.getAttribute('src');img.dispatchEvent(new t.w.Event('error'));eq(img.getAttribute('src'),original.replace('/thumbs/','/'),'Image retry same property');img.dispatchEvent(new t.w.Event('error'));ok(img.getAttribute('src').endsWith('.webp'),'Alternate local format');img.dispatchEvent(new t.w.Event('error'));ok(img.hidden&&img.nextElementSibling.textContent.includes('Photo unavailable'),'Honest error state');t.close();
 }
 {
  const t=open('hotel-lake-manyara-serena-safari-lodge.html');const buttons=t.d.querySelectorAll('.gallery-thumbs button');eq(buttons.length,3,'Three real gallery views');buttons[2].click();ok(t.d.querySelector('#detail-image').src.endsWith('manyara-serena-pool.jpg'),'Gallery loads selected subject');t.d.querySelector('[data-lang-toggle]').click();eq(t.d.querySelector('.gallery-thumbs button[data-photo-index="2"]').getAttribute('aria-pressed'),'true','Gallery selection survives language change');ok(t.d.querySelector('.photo-caption a').href.endsWith('#manyara-serena-pool'),'Gallery credit follows image');t.close();
 }
 // Local file / blocked storage must not stop the app.
 {const t=open('index.html','','en',true);ok(t.d.querySelector('#hotel-grid .card'),'App works without storage');t.d.querySelector('[data-lang-toggle]').click();eq(t.d.documentElement.lang,'sw','Language works without storage');t.close();}
 const sample=open('index.html'),catalog=JSON.parse(JSON.stringify(sample.w.KASOKO_CATALOG));sample.close();
 for(const item of [...catalog.destinations,...catalog.hotels]){
  const kind=catalog.hotels.some(h=>h.id===item.id)?'hotel':item.service;
  const t=open('booking.html','?service='+kind+'&item='+item.id,'sw');eq(t.d.getElementById('service').value,kind,'Booking service prefill '+item.id);eq(t.d.getElementById('destination').value,typeof item.name==='string'?item.name:item.name.sw,'Swahili item prefill '+item.id);t.close();
 }
 const future=new Date();future.setUTCDate(future.getUTCDate()+60);const start=future.toISOString().slice(0,10);future.setUTCDate(future.getUTCDate()+2);const end=future.toISOString().slice(0,10);
 for(const lang of ['en','sw'])for(const service of ['safari','tour','hotel','flight','bus','ferry','train','transfer','custom']){
  const t=open('booking.html','?service='+service,lang);let bodies=[];let responseMode='success';
  t.w.fetch=async(url,opts)=>{mockedRequests++;bodies.push(JSON.parse(opts.body));await wait();return {ok:responseMode==='success',status:responseMode==='success'?200:503,json:async()=>responseMode==='success'?{ok:true,status:'request_received',reference:'KST-ABCDEF012345',bookingConfirmed:false}:{ok:false}}};
  t.d.querySelector('[data-next="2"]').click();ok(t.d.querySelector('[aria-invalid]'),'Required field errors '+service);
  input(t,'destination','QA <img src=x onerror=alert(1)> destination');input(t,'origin','Arusha');input(t,'startDate',start);input(t,'endDate',end);input(t,'adults','2');input(t,'children','1');input(t,'childAges','7');input(t,'infants','0');input(t,'tripType','return');input(t,'budget','0');
  if(service==='hotel'){input(t,'rooms','2');input(t,'roomType','Family');input(t,'mealPlan','Breakfast');input(t,'endDate',start);t.d.querySelector('[data-next="2"]').click();eq(t.d.getElementById('endDate').getAttribute('aria-invalid'),'true','Same-day checkout rejected');input(t,'endDate',end);}
  t.d.querySelector('[data-next="2"]').click();ok(!t.d.querySelector('[data-form-step="2"]').hidden,'Contact step '+service);
  input(t,'name','QA Traveller');input(t,'phone','+255 700 000 000');input(t,'email','qa@example.test');input(t,'contactMethod','email');input(t,'notes','Review only <script>alert(1)</script>');t.d.getElementById('consent').checked=true;t.d.querySelector('[data-next="3"]').click();
  ok(!t.d.querySelector('[data-form-step="3"]').hidden,'Review step '+service);eq(t.d.querySelectorAll('#summary-box img,#summary-box script').length,0,'Summary text cannot inject HTML');
  const saved=t.d.getElementById('destination').value;t.d.querySelector('[data-lang-toggle]').click();eq(t.d.getElementById('destination').value,saved,'Language preserves edited request');ok(t.d.querySelector('#summary-box').textContent.includes('0'),'Zero budget in review');
  if(service==='hotel')eq(t.d.getElementById('roomType').value,'Family','Language preserves room choice');
  const f=t.d.querySelector('form');f.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));await wait();await wait();eq(bodies.length,1,'Duplicate click blocked '+service);ok(f.hidden,'Form hidden after receipt '+service);ok(t.d.querySelector('#booking-result').textContent.includes('KST-ABCDEF012345'),'Validated receipt '+service);ok(decodeURIComponent(t.d.querySelector('#booking-result a').href).includes('QA Traveller'),'WhatsApp complete request');t.close();
 }
 {
  const t=open('booking.html','?service=flight');let sent=[],mode='failure';
  t.w.fetch=async(u,opts)=>{mockedRequests++;sent.push(JSON.parse(opts.body));return {ok:mode!=='failure',status:mode==='failure'?503:200,json:async()=>mode==='bad'?{ok:true,status:'request_received',reference:'BAD',bookingConfirmed:false}:mode==='failure'?{ok:false}:{ok:true,status:'request_received',reference:'KST-ABCDEF012345',bookingConfirmed:false}};};
  for(const [id,value] of Object.entries({destination:'Dar es Salaam',origin:'Arusha',startDate:start,endDate:end,tripType:'oneway',name:'QA Traveller',phone:'+255700000000',contactMethod:'phone'}))input(t,id,value);
  t.d.querySelector('[data-next="2"]').click();t.d.getElementById('consent').checked=true;t.d.querySelector('[data-next="3"]').click();
  const form=t.d.querySelector('form'),submit=()=>form.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));submit();await wait();await wait();ok(!form.hidden,'Failure retains form');eq(sent[0].endDate,'','One-way discards hidden return date');mode='bad';submit();await wait();await wait();ok(!form.hidden,'Malformed success reference rejected');eq(sent[0].requestId,sent[1].requestId,'Unchanged retry keeps identifier');mode='success';submit();await wait();await wait();ok(form.hidden,'Safe retry succeeds');eq(sent[1].requestId,sent[2].requestId,'Final retry retains identifier');t.close();
 }
 console.log(JSON.stringify({status:'PASS',pages:pages.length,checks,mockedRequests,externalRequestsSent:0,renderedLayoutTested:false}));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
