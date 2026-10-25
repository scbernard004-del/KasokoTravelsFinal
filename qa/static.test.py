import sys,json,re,hashlib
from pathlib import Path
from urllib.parse import urlparse,unquote
from bs4 import BeautifulSoup,Doctype
from PIL import Image
import tinycss2
p=Path(__file__).resolve().parents[1];pages={f.name:BeautifulSoup(f.read_text(),'html.parser') for f in p.glob('*.html')};errors=[];checks=0

def check(ok,msg):
 global checks
 checks+=1
 if not ok:errors.append(msg)
T=json.loads((p/'translations.js').read_text().split('=',1)[1].strip().rstrip(';'));C=json.loads((p/'catalog.js').read_text().split('=',1)[1].strip().rstrip(';'));M=json.loads((p/'photo-sources.json').read_text())
titles=[];descs=[]
for f,s in pages.items():
 raw=(p/f).read_text();check(raw.lower().startswith('<!doctype html>'),f+' doctype');check(len(s.select('h1'))==1,f+' h1');check(len(s.select('main'))==1,f+' main');check(len(s.select('header'))==1,f+' header');check(len(s.select('footer'))==1,f+' footer');ids=[x['id'] for x in s.select('[id]')];check(len(ids)==len(set(ids)),f+' ids');titles.append(s.title.text);descs.append(s.select_one('meta[name="description"]')['content'])
 for script in s.select('script[type="application/ld+json"]'):json.loads(script.string)
 for n in s.find_all(string=True):
  if n.parent.name not in ['script','style','noscript'] and not isinstance(n,Doctype):check(n.strip().lower()!='html',f+' stray HTML text')
 check(not re.search(r'\bkenya\b|maasai mara|masai mara|nairobi',s.get_text(),re.I),f+' country scope')
 for n in s.select('[data-i18n]'):
  for lang in ['en','sw']:check(n['data-i18n'] in T[lang],f+' missing translation '+n['data-i18n'])
 for n in s.select('img'):
  check(n.has_attr('alt'),f+' image alt');check(n.get('width') and n.get('height'),f+' image dimensions');check(not n['src'].startswith('http'),f+' remote image')
 for n in s.select('[href],[src]'):
  for attr in ['href','src']:
   if not n.has_attr(attr):continue
   url=urlparse(n[attr]);
   if url.scheme or url.netloc:continue
   target=unquote(url.path).lstrip('/') or f
   check((p/target).is_file(),f+' missing '+target)
   if url.fragment and target in pages:check(pages[target].find(id=unquote(url.fragment)) is not None,f+' broken anchor '+n[attr])
 for n in s.select('label[for]'):check(s.find(id=n['for']) is not None,f+' missing labelled field')
 for n in s.select('a[target="_blank"]'):check('noopener' in n.get('rel',[]),f+' external link isolation')
check(len(titles)==len(set(titles)),'Duplicate page titles');check(len(descs)==len(set(descs)),'Duplicate descriptions')
items=C['destinations']+C['hotels'];primaries=[x['images'][0] for x in items];check(len(primaries)==len(set(primaries)),'Repeated listing photo URLs')
hashes=[];pixelhashes=[]
for key,m in M.items():
 img=Image.open(p/m['file']);img.load();check(img.width>=500 and img.height>=150,key+' resolution');h=hashlib.sha256((p/m['file']).read_bytes()).hexdigest();check(h==m['sha256'],key+' provenance checksum');hashes.append(h);pixelhashes.append(hashlib.sha256(img.resize((64,64)).convert('RGB').tobytes()).hexdigest())
 for folder in ['', 'thumbs/']:
  for ext in ['jpg','webp']:
   imgpath=p/'assets/photos'/folder/(key+'.'+ext);check(imgpath.is_file(),str(imgpath)+' missing');Image.open(imgpath).verify()
check(len(hashes)==len(set(hashes)),'Duplicate photographic bytes');check(len(pixelhashes)==len(set(pixelhashes)),'Duplicate decoded images')
for x in items:
 kind='hotel' if x in C['hotels'] else 'destination';page=pages[kind+'-'+x['id']+'.html'];check(page.select_one('.detail-photo img')['src']==x['images'][0],x['id']+' static image mismatch')
 for image in x['images']:check((p/image).is_file(),x['id']+' gallery image')
 for a in page.select('a[href^="booking.html"]'):check('item='+x['id'] in a['href'] or '?' not in a['href'],x['id']+' booking link')
check(len(items)==49,'49 listings');check(len(M)==56,'56 photographs')
for css in p.glob('*.css'):
 rules=tinycss2.parse_stylesheet(css.read_text(),skip_whitespace=True,skip_comments=True)
 def validate(rules):
  for rule in rules:
   check(rule.type!='error',css.name+' CSS parse '+str(getattr(rule,'message','')))
   if rule.type=='qualified-rule':
    for d in tinycss2.parse_declaration_list(rule.content,skip_whitespace=True,skip_comments=True):check(d.type!='error',css.name+' CSS declaration '+str(getattr(d,'message','')))
   if rule.type=='at-rule' and rule.content and rule.lower_at_keyword in ['media','supports','layer']:validate(tinycss2.parse_rule_list(rule.content,skip_whitespace=True,skip_comments=True))
 validate(rules)
report={'status':'FAIL' if errors else 'PASS','pages':len(pages),'listings':len(items),'uniquePhotos':len(M),'localImageVariants':len(list((p/'assets/photos').rglob('*.jpg')))+len(list((p/'assets/photos').rglob('*.webp'))),'checks':checks,'errors':errors}
(p/'qa/static-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));sys.exit(bool(errors))
