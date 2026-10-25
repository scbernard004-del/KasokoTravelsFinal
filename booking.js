(() => {
  'use strict';
  const core = window.KasokoBooking, C = window.KASOKO_CATALOG || {}, qs = new URLSearchParams(location.search);
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const form = $('#booking-form'); if (!form || !core) return;
  let lang = document.documentElement.lang === 'sw' ? 'sw' : 'en', step = 1, sending = false, outcome = null, retry = null;
  const fields = ['service','destination','origin','startDate','endDate','tripType','adults','children','childAges','infants','rooms','roomType','mealPlan','travelClass','operator','time','style','currency','budget','notes','name','phone','email','contactMethod'];
  const text = (en,sw) => lang === 'sw' ? sw : en;
  const element = (tag, content, cls) => {const e = document.createElement(tag); if(content != null)e.textContent = content; if(cls)e.className = cls; return e;};
  function data() {
    const d = {}; fields.forEach(k => {d[k] = form.elements[k]?.value.trim() || '';});
    ['adults','children','infants','rooms'].forEach(k => {d[k] = Number(d[k]);});
    if(!core.tickets.includes(d.service)){d.tripType='';d.travelClass='';d.operator='';}
    if(!core.tickets.includes(d.service) && d.service!=='transfer')d.origin='';
    if(d.service!=='hotel'){d.rooms=1;d.roomType='';d.mealPlan='';}
    if(core.tickets.includes(d.service) && d.tripType!=='return' || d.service==='transfer')d.endDate='';
    if(!['safari','transfer','custom'].includes(d.service))d.style='';
    if(!d.children)d.childAges='';
    d.addons = $$('input[name="addons"]:checked').map(e=>e.value).filter(v=>v!==d.service);
    d.consent = $('#consent').checked; d.language=lang; return d;
  }
  function options(select, values) {
    const previous=select.value;
    select.replaceChildren(...values.map(([value,en,sw]) => {const o=element('option',text(en,sw));o.value=value;return o;}));
    if([...select.options].some(o=>o.value===previous))select.value=previous;
  }
  function localize() {
    options($('#service'),core.types.map(v=>[v,core.labels.en[v],core.labels.sw[v]]));
    for(const [id,choices] of Object.entries(core.choices))if($('#'+id))options($('#'+id),choices);
    const selected=new Set($$('input[name="addons"]:checked').map(e=>e.value));
    $('#addon-list').replaceChildren(...core.types.filter(v=>v!=='custom').map(v=>{
      const label=element('label',null,'check'),input=element('input');input.type='checkbox';input.name='addons';input.value=v;input.checked=selected.has(v);
      label.append(input,element('span',core.labels[lang][v]));return label;
    }));
    updateVisibility(); if(step===3)renderSummary(); if(outcome)renderOutcome(false); if(sending)$('#send-request').textContent=text('Sending…','Inatuma…');
    $$('[data-details-error],[data-form-error],[data-review-error]').forEach(e=>e.textContent='');
  }
  function updateVisibility() {
    const service=$('#service').value,ticket=core.tickets.includes(service),hotel=service==='hotel';
    $$('.hotel-only').forEach(e=>e.hidden=!hotel);$$('.ticket-only').forEach(e=>e.hidden=!ticket);
    $('#origin-wrap').hidden=!(ticket||service==='transfer');$('#trip-type-wrap').hidden=!ticket;
    $('#end-wrap').hidden=service==='transfer'||(ticket&&$('#tripType').value!=='return');
    $('#style').closest('.field-wrap').hidden=!['safari','transfer','custom'].includes(service);
    $('#childAges').closest('.field-wrap').hidden=Number($('#children').value)<=0;
    document.querySelector('label[for="startDate"]').textContent=hotel?text('Check-in date','Tarehe ya kuingia'):text('Start / departure date','Tarehe ya kuanza / kuondoka');
    document.querySelector('label[for="endDate"]').textContent=hotel?text('Check-out date','Tarehe ya kutoka'):ticket?text('Return date','Tarehe ya kurudi'):text('End date (optional)','Tarehe ya mwisho (hiari)');
    $('#startDate').min=core.today();
    let min=$('#startDate').value||core.today();
    if(hotel && /^\d{4}-\d{2}-\d{2}$/.test(min)){const dt=new Date(min+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+1);min=dt.toISOString().slice(0,10);}
    $('#endDate').min=min;
    $$('input[name="addons"]').forEach(e=>{e.disabled= e.value===service || sending;e.closest('label').hidden=e.value===service;});
  }
  function showStep(n, focus=true) {
    step=n;$$('[data-form-step]').forEach(e=>{const active=Number(e.dataset.formStep)===n;e.classList.toggle('active',active);e.hidden=!active;});
    $$('[data-step]').forEach(e=>{const current=Number(e.dataset.step)===n;e.classList.toggle('active',Number(e.dataset.step)<=n);if(current)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
    if(n===3)renderSummary();if(focus){const h=$('[data-form-step="'+n+'"] h2');h.tabIndex=-1;h.focus();}
  }
  function displayErrors(errors,phase) {
    $$('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
    const box=phase==='contact'?$('[data-form-error]'):$('[data-details-error]');
    box.textContent=errors.map(e=>e.message).join(' ');
    errors.forEach(e=>{const f=form.elements[e.field];if(f){f.setAttribute('aria-invalid','true');f.setAttribute('aria-describedby',box.id);}});
    if(errors.length)form.elements[errors[0].field]?.focus();return !errors.length;
  }
  function validate(phase){return displayErrors(core.validate(data(),lang,phase),phase);}
  function renderSummary() {
    $('#summary-box').replaceChildren(...core.summary(data(),lang).map(([label,value])=>{const row=element('div');row.append(element('span',label),element('b',value));return row;}));
  }
  function summaryText(d,ref){return text('Kasoko booking request','Ombi la safari la Kasoko')+(ref?' '+ref:'')+'\n\n'+core.summary(d,lang).map(r=>r.join(': ')).join('\n')+'\n\n'+text('Availability and price require confirmation.','Nafasi na bei zinahitaji kuthibitishwa.');}
  function download(d,ref) {
    const blob=new Blob([summaryText(d,ref)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=element('a');
    a.href=url;a.download=(ref||'kasoko-booking-draft')+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function renderOutcome(focus=true) {
    const {ok,d,reference,unavailable}=outcome,box=$('#booking-result');box.hidden=false;box.replaceChildren();box.setAttribute('role','status');box.tabIndex=-1;
    box.append(element('div',ok?'✓':'!',ok?'success-icon':'warning-icon'),element('h2',ok?text('Request received','Ombi limepokelewa'):text('We couldn’t confirm receipt','Hatukuweza kuthibitisha kupokea ombi')));
    const p=element('p');
    if(ok){p.append(document.createTextNode(text('Your reference is ','Namba ya ombi lako ni ')),element('strong',reference),document.createTextNode(text('. Kasoko will check availability and contact you with a quote. Your booking is not yet confirmed.','. Kasoko itaangalia nafasi na kukutumia bei. Nafasi yako bado haijathibitishwa.')));}
    else p.textContent=unavailable?text('Online delivery is currently unavailable. Your details are still here. Download your request or send it to Kasoko on WhatsApp.','Kutuma mtandaoni hakupatikani kwa sasa. Maelezo yako bado yapo. Pakua ombi au litume kwa Kasoko kupitia WhatsApp.'):text('Your details are still here. You can retry safely, download a copy or send the request on WhatsApp.','Maelezo yako bado yapo. Unaweza kujaribu tena, kupakua nakala au kutuma ombi kwa WhatsApp.');
    box.append(p);const actions=element('div',null,'result-actions'),wa=element('a',text('Open WhatsApp','Fungua WhatsApp'),'btn primary');
    const phone=window.KASOKO_CONFIG?.contacts?.[0]?.international||'255789515769';
    wa.href='https://wa.me/'+phone+'?text='+encodeURIComponent(summaryText(d,reference));wa.target='_blank';wa.rel='noopener noreferrer';
    const dl=element('button',ok?text('Download summary','Pakua muhtasari'):text('Download request','Pakua ombi'),'btn ghost');dl.type='button';dl.addEventListener('click',()=>download(d,reference));
    actions.append(wa,dl);box.append(actions);if(focus)box.focus();
  }
  function requestId(){if(window.crypto?.randomUUID)return 'KST-'+window.crypto.randomUUID();return 'KST-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14);}
  async function submit(event) {
    event.preventDefault();if(sending)return;
    if(step!==3){const phase=step===1?'details':'contact';if(validate(phase))showStep(step+1);return;}
    const d=data(),errors=core.validate(d,lang);
    if(errors.length){const phase=['name','phone','email','contactMethod','consent'].includes(errors[0].field)?'contact':'details';showStep(phase==='contact'?2:1,false);displayErrors(errors,phase);return;}
    const {language,...identity}=d,fingerprint=JSON.stringify(identity);
    if(!retry||retry.fingerprint!==fingerprint)retry={fingerprint,id:requestId()};
    sending=true;const controls=[...form.elements].filter(e=>!e.disabled);controls.forEach(e=>e.disabled=true);form.setAttribute('aria-busy','true');$('#send-request').textContent=text('Sending…','Inatuma…');$('#booking-result').hidden=true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch(window.KASOKO_CONFIG?.bookingEndpoint||'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,requestId:retry.id,website:''}),signal:controller.signal});
      const result=await response.json();
      if(!response.ok||result.ok!==true||result.status!=='request_received'||result.bookingConfirmed!==false||!/^KST-[A-F0-9]{12}$/.test(result.reference||'')){const err=new Error('delivery_failed');err.unavailable=response.status===503;throw err;}
      outcome={ok:true,d,reference:result.reference};form.hidden=true;
    } catch(error){outcome={ok:false,d,reference:'',unavailable:!!error.unavailable};}
    finally{clearTimeout(timer);sending=false;controls.forEach(e=>e.disabled=false);form.removeAttribute('aria-busy');$('#send-request').textContent=text('Send request','Tuma ombi');updateVisibility();renderOutcome();}
  }
  localize();
  const selected=qs.get('service'),item=[...(C.destinations||[]),...(C.hotels||[])].find(i=>i.id===qs.get('item'));
  $('#service').value=core.types.includes(selected)?selected:item?(C.hotels.includes(item)?'hotel':item.service):'safari';
  if(item)$('#destination').value=(typeof item.name==='string'?item.name:(item.name[lang] || item.name.en));
  else if(qs.get('region'))$('#destination').value=qs.get('region').slice(0,250);
  updateVisibility();showStep(1,false);
  $('[data-details-error]').id='trip-errors';$('[data-form-error]').id='contact-errors';
  $$('[data-next]').forEach(e=>e.addEventListener('click',()=>{if(validate(step===1?'details':'contact'))showStep(Number(e.dataset.next));}));
  $$('[data-prev]').forEach(e=>e.addEventListener('click',()=>showStep(Number(e.dataset.prev))));
  ['service','tripType','startDate','children'].forEach(id=>$('#'+id).addEventListener('change',updateVisibility));
  form.addEventListener('submit',submit);
  form.addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');if(outcome&&!outcome.ok){outcome=null;$('#booking-result').hidden=true;}});
  document.addEventListener('kasoko:language',e=>{const prior = lang; lang=e.detail==='sw'?'sw':'en'; if(item && typeof item.name === 'object' && $('#destination').value === (item.name[prior] || item.name.en)) $('#destination').value=item.name[lang] || item.name.en; localize();});
})();
