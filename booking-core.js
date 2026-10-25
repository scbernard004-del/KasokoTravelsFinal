(function(root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.KasokoBooking = core;
})(typeof window === 'object' ? window : this, function() {
  'use strict';
  const types = ['safari','tour','hotel','flight','bus','ferry','train','transfer','custom'];
  const tickets = ['flight','bus','ferry','train'];
  const labels = {
    en: {safari:'Safari',tour:'Tour / excursion',hotel:'Hotel / lodge',flight:'Flight ticket',bus:'Bus ticket',ferry:'Ferry ticket',train:'Train ticket',transfer:'Transfer / private ride',custom:'Combined trip'},
    sw: {safari:'Safari ya hifadhi',tour:'Ziara / matembezi',hotel:'Hoteli / loji',flight:'Tiketi ya ndege',bus:'Tiketi ya basi',ferry:'Tiketi ya feri',train:'Tiketi ya treni',transfer:'Usafiri binafsi',custom:'Safari yenye huduma nyingi'}
  };
  const choices = {
  "tripType": [
    [
      "oneway",
      "One way",
      "Kwenda tu"
    ],
    [
      "return",
      "Return",
      "Kwenda na kurudi"
    ]
  ],
  "roomType": [
    [
      "",
      "No preference",
      "Sina upendeleo"
    ],
    [
      "Single",
      "Single",
      "Mtu mmoja"
    ],
    [
      "Double / twin",
      "Double / twin",
      "Watu wawili"
    ],
    [
      "Family",
      "Family",
      "Familia"
    ],
    [
      "Suite / villa",
      "Suite / villa",
      "Suite / villa"
    ]
  ],
  "mealPlan": [
    [
      "",
      "No preference",
      "Sina upendeleo"
    ],
    [
      "Breakfast",
      "Breakfast",
      "Kifungua kinywa"
    ],
    [
      "Half board",
      "Half board",
      "Milo miwili"
    ],
    [
      "Full board",
      "Full board",
      "Milo mitatu"
    ],
    [
      "All inclusive",
      "All inclusive",
      "Huduma zote zilizojumuishwa"
    ]
  ],
  "travelClass": [
    [
      "Economy",
      "Economy",
      "Daraja la kawaida"
    ],
    [
      "Business",
      "Business",
      "Daraja la biashara"
    ],
    [
      "First / premium",
      "First / premium",
      "Daraja la kwanza"
    ]
  ],
  "style": [
    [
      "",
      "No preference",
      "Sina upendeleo"
    ],
    [
      "Private 4x4",
      "Private 4x4",
      "Gari binafsi la 4x4"
    ],
    [
      "Shared safari",
      "Shared safari",
      "Safari ya pamoja"
    ],
    [
      "Private car",
      "Private car",
      "Gari binafsi"
    ],
    [
      "Airport shuttle",
      "Airport shuttle",
      "Usafiri wa uwanja wa ndege"
    ]
  ],
  "contactMethod": [
    [
      "whatsapp",
      "WhatsApp",
      "WhatsApp"
    ],
    [
      "phone",
      "Phone call",
      "Simu"
    ],
    [
      "email",
      "Email",
      "Barua pepe"
    ]
  ]
};
  const choiceLabel=(key,value,lang)=>choices[key]?.find(row=>row[0]===value)?.[lang==='sw'?2:1] || value;
  function today(){ return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Dar_es_Salaam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
  function dateValid(v){ return /^\d{4}-\d{2}-\d{2}$/.test(v||'') && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v; }
  function validate(d, lang='en', phase='all', now=today()) {
    const errors=[];
    const add=(field,en,sw)=>errors.push({field,message:lang==='sw'?sw:en});
    const text=v=>typeof v==='string' ? v.trim() : '';
    if(phase!=='contact') {
      if(!types.includes(d.service)) add('service','Choose a booking service.','Chagua huduma.');
      if(!text(d.destination)) add('destination','Enter a destination, hotel or arrival point.','Weka kivutio, hoteli au sehemu ya kufika.');
      if((tickets.includes(d.service)||d.service==='transfer')&&!text(d.origin)) add('origin','Enter your departure or pickup point.','Weka sehemu ya kuondoka au kuchukuliwa.');
      if(text(d.origin)&&text(d.origin).toLowerCase()===text(d.destination).toLowerCase()&&(tickets.includes(d.service)||d.service==='transfer')) add('destination','Departure and arrival must be different.','Sehemu ya kuondoka na kufika lazima zitofautiane.');
      if(!dateValid(d.startDate)||d.startDate<now) add('startDate','Choose today or a future travel date.','Chagua leo au tarehe ya baadaye.');
      if(tickets.includes(d.service)&&!['oneway','return'].includes(d.tripType)) add('tripType','Choose one way or return.','Chagua kwenda tu au kwenda na kurudi.');
      if(!['USD','TZS'].includes(d.currency)) add('currency','Choose a valid currency.','Chagua sarafu sahihi.');
      for(const key of ['destination','origin','childAges','operator','name','phone','email'])if(text(d[key]).length>250)add(key,'Keep this field under 250 characters.','Tumia herufi zisizozidi 250.');
      if(text(d.notes).length>2000)add('notes','Keep your notes under 2,000 characters.','Tumia herufi zisizozidi 2,000.');
      const needsEnd=d.service==='hotel'||(tickets.includes(d.service)&&d.tripType==='return');
      if(needsEnd&&!dateValid(d.endDate)) add('endDate','Choose a return or checkout date.','Chagua tarehe ya kurudi au kutoka hotelini.');
      if(d.endDate&&(!dateValid(d.endDate)||d.endDate<d.startDate||(d.service==='hotel'&&d.endDate===d.startDate))) add('endDate',d.service==='hotel'?'Checkout must be after check-in.':'End date cannot be before your start date.',d.service==='hotel'?'Tarehe ya kutoka iwe baada ya kuingia.':'Tarehe ya mwisho isiwe kabla ya kuanza.');
      for(const [key,min,max] of [['adults',1,50],['children',0,50],['infants',0,10]]) if(!Number.isInteger(Number(d[key]))||Number(d[key])<min||Number(d[key])>max) add(key,`Enter ${min}–${max} for ${key}.`,`Weka idadi kati ya ${min} na ${max}.`);
      if(Number(d.infants)>Number(d.adults)) add('infants','Infants cannot outnumber adults.','Watoto wachanga wasizidi watu wazima.');
      if(Number(d.children)>0){ const ages=text(d.childAges).split(',').map(v=>v.trim()); if(ages.length!==Number(d.children)||ages.some(v=>!/^\d+$/.test(v)||Number(v)<2||Number(v)>17)) add('childAges','Enter one age (2–17) per child, separated by commas.','Weka umri (2–17) wa kila mtoto, ukitenganisha kwa koma.'); }
      if(d.service==='hotel'&&(!Number.isInteger(Number(d.rooms))||Number(d.rooms)<1||Number(d.rooms)>25)) add('rooms','Choose between 1 and 25 rooms.','Chagua vyumba 1 hadi 25.');
      if(d.budget!==''&&d.budget!=null&&(!Number.isFinite(Number(d.budget))||Number(d.budget)<0)) add('budget','Enter a valid budget or leave it blank.','Weka bajeti sahihi au acha wazi.');
    }
    if(phase!=='details') {
      if(text(d.name).length<2) add('name','Enter your full name.','Weka jina lako kamili.');
      if(!/^[+\d\s()\-]{7,24}$/.test(text(d.phone))||text(d.phone).replace(/\D/g,'').length<7) add('phone','Enter a valid phone number with country code.','Weka namba sahihi ya simu na msimbo wa nchi.');
      if((text(d.email)||d.contactMethod==='email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(d.email))) add('email','Enter a valid email address.','Weka barua pepe sahihi.');
      if(!['whatsapp','phone','email'].includes(d.contactMethod)) add('contactMethod','Choose how we should contact you.','Chagua jinsi ya kuwasiliana nawe.');
      if(d.consent!==true) add('consent','Agree that Kasoko may contact you about this request.','Kubali Kasoko iwasiliane nawe kuhusu ombi hili.');
    }
    return errors;
  }
  function summary(d,lang='en') {
    const sw=lang==='sw';
    const rows=[[sw?'Huduma':'Service',labels[lang]?.[d.service]||labels.en[d.service]],
      [sw?'Kivutio / hoteli / kufika':'Destination / hotel / arrival',d.destination],
      [sw?'Kuondoka / kuchukuliwa':'Departure / pickup',d.origin],
      [sw?'Tarehe ya kuanza':'Start date',d.startDate],[sw?'Tarehe ya mwisho':'End date',d.endDate],
      [sw?'Watu wazima':'Adults',d.adults],[sw?'Watoto (2–17)':'Children (2–17)',d.children],[sw?'Umri wa watoto':'Children’s ages',d.childAges],[sw?'Watoto wachanga (<2)':'Infants (<2)',d.infants],
      [sw?'Aina ya safari':'Journey',tickets.includes(d.service)?choiceLabel('tripType',d.tripType,lang):''],[sw?'Vyumba':'Rooms',d.service==='hotel'?d.rooms:''],
      [sw?'Aina ya chumba':'Room preference',d.service==='hotel'?choiceLabel('roomType',d.roomType,lang):''],[sw?'Mpango wa chakula':'Meal preference',d.service==='hotel'?choiceLabel('mealPlan',d.mealPlan,lang):''],
      [sw?'Daraja':'Travel class',tickets.includes(d.service)?choiceLabel('travelClass',d.travelClass,lang):''],[sw?'Mtoa huduma unayependelea':'Preferred operator',tickets.includes(d.service)?d.operator:''],
      [sw?'Saa unayopendelea':'Preferred time',d.time],[sw?'Aina ya safari / gari':'Safari style / vehicle',choiceLabel('style',d.style,lang)],
      [sw?'Huduma za ziada':'Additional services',(d.addons||[]).map(x=>labels[lang]?.[x]||x).join(', ')],
      [sw?'Bajeti ya jumla':'Total budget',d.budget!==''&&d.budget!=null?`${d.currency||'USD'} ${d.budget}`:''],[sw?'Maelezo':'Notes',d.notes],
      [sw?'Jina':'Name',d.name],[sw?'Simu':'Phone',d.phone],['Email',d.email],[sw?'Mawasiliano':'Contact preference',choiceLabel('contactMethod',d.contactMethod,lang)]];
    return rows.filter(([,v])=>v!==''&&v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]);
  }
  return {types,tickets,labels,choices,today,validate,summary};
});
