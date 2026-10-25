import {createHash} from 'node:crypto';
import core from '../booking-core.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request) {
    if(request.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
    if(!request.headers.get('content-type')?.startsWith('application/json')) return json({ok:false,error:'json_required'},415);
    const origin=request.headers.get('origin');
    if(origin&&origin!==new URL(request.url).origin) return json({ok:false,error:'origin_not_allowed'},403);
    let raw;
    try { const bytes=await request.text(); if(bytes.length>18000) return json({ok:false,error:'request_too_large'},413);raw=JSON.parse(bytes); } catch { return json({ok:false,error:'invalid_json'},400); }
    if(!raw||Array.isArray(raw)||typeof raw!=='object') return json({ok:false,error:'invalid_request'},400);
    if(raw.website) return json({ok:false,error:'invalid_request'},400);
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(raw.requestId||'')) return json({ok:false,error:'invalid_request_id'},400);
    const booking={};
    for(const key of ['service','destination','origin','startDate','endDate','childAges','tripType','roomType','mealPlan','travelClass','operator','time','style','currency','budget','name','phone','email','contactMethod','notes']) {
      if(raw[key]!=null&&typeof raw[key]!=='string') return json({ok:false,error:'invalid_field',field:key},400);
      booking[key]=(raw[key]||'').trim();
      if(booking[key].length>(key==='notes'?2000:250)) return json({ok:false,error:'field_too_long',field:key},400);
    }
    for(const key of ['adults','children','infants','rooms']) { if(raw[key]===''||raw[key]===null||typeof raw[key]==='boolean') return json({ok:false,error:'invalid_count',field:key},400);booking[key]=Number(raw[key]); }
    booking.consent=raw.consent===true;
    booking.addons=Array.isArray(raw.addons)?[...new Set(raw.addons.filter(v=>core.types.includes(v)))].slice(0,9):[];
    const language=raw.language==='sw'?'sw':'en';
    if(!['','oneway','return'].includes(booking.tripType)||!['','USD','TZS'].includes(booking.currency)) return json({ok:false,error:'invalid_choice'},400);
    if(!core.tickets.includes(booking.service)) {booking.tripType='';booking.travelClass='';booking.operator='';}
    if(booking.service!=='hotel'){booking.rooms=1;booking.roomType='';booking.mealPlan='';}
    if(core.tickets.includes(booking.service)&&booking.tripType!=='return') booking.endDate='';
    const errors=core.validate(booking,language);
    if(errors.length) return json({ok:false,error:'validation',errors},400);
    const endpoint=process.env.BOOKING_WEBHOOK_URL;
    const secret=process.env.BOOKING_WEBHOOK_SECRET;
    if(!endpoint||!secret) return json({ok:false,error:'booking_unavailable'},503);
    let target;
    try { target=new URL(endpoint); if(target.protocol!=='https:'||target.hostname!=='script.google.com'||!target.pathname.endsWith('/exec')) throw Error(); } catch { return json({ok:false,error:'booking_unavailable'},503); }
    const digest=createHash('sha256').update(raw.requestId+'\n'+JSON.stringify(booking)).digest('hex');
    const reference='KST-'+digest.slice(0,12).toUpperCase();
    try {
      const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,reference,language,booking,summary:core.summary(booking,'en')}),signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(!response.ok||!result.ok||result.reference!==reference||result.status!=='request_received') return json({ok:false,error:'delivery_failed',reference},502);
      return json({ok:true,status:'request_received',reference,bookingConfirmed:false});
    } catch { return json({ok:false,error:'delivery_failed',reference},502); }
  }
};
