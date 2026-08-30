/* ══════ 여행 플래너 ══════ */
const W=n=>'₩'+Math.round(n).toLocaleString();
const CURS={JPY:{s:'¥',n:'엔'},USD:{s:'US$',n:'달러'},EUR:{s:'€',n:'유로'},TWD:{s:'NT$',n:'대만달러'},
 THB:{s:'฿',n:'바트'},VND:{s:'₫',n:'동'},HKD:{s:'HK$',n:'홍콩달러'},CNY:{s:'元',n:'위안'},
 SGD:{s:'S$',n:'싱가포르달러'},PHP:{s:'₱',n:'페소'},KRW:{s:'₩',n:'원'}};
const FALLBACK={JPY:8.72,USD:1390,EUR:1510,TWD:43,THB:39,VND:0.053,HKD:178,CNY:192,SGD:1030,PHP:24,KRW:1};
const CAT={eat:{n:'식사',c:'var(--eat)',i:'🍜'},cafe:{n:'카페',c:'var(--cafe)',i:'☕'},see:{n:'관광',c:'var(--see)',i:'🏯'},
 shop:{n:'쇼핑',c:'var(--shop)',i:'🛍'},stay:{n:'숙소',c:'var(--stay)',i:'🏨'},
 card:{n:'카드 쇼핑',c:'var(--cardshop)',i:'🎴'},move:{n:'이동',c:'var(--move)',i:'✈️'}};
const t2m=s=>{const p=String(s).split(':').map(Number);return p[0]*60+(p[1]||0)};
const m2t=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.round(m)%60).padStart(2,'0');
const D2=m=>m>=60?(Math.floor(m/60)+'시간'+(m%60?' '+(m%60)+'분':'')):(m+'분');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut=(s,n)=>String(s||'').length>n?String(s).slice(0,n)+'…':String(s||'');
const uid=()=>Math.random().toString(36).slice(2,9);
let DB=[]; const P=id=>DB.find(x=>x.i===id)||DB.find(x=>x.i===IDALIAS[id]);
/* ══ 영업시간 ══ */
const DKEY=['sun','mon','tue','wed','thu','fri','sat'], DNM=['일','월','화','수','목','금','토'];
function parseHr(s){
 if(!s)return null;
 if(/휴무|closed/i.test(s))return 'closed';
 if(/24\s*시간/.test(s))return 'always';
 const re=/(오전|오후)?\s*(\d{1,2}):(\d{2})/g;let m,last=null,ts=[];
 while((m=re.exec(s))){let mer=m[1]||last;last=m[1]||last;let h=+m[2],mi=+m[3];
  if(mer==='오후'&&h<12)h+=12; if(mer==='오전'&&h===12)h=0; ts.push(h*60+mi)}
 if(ts.length<2)return null;
 const out=[];for(let i=0;i+1<ts.length;i+=2){let a=ts[i],b=ts[i+1];if(b<=a)b+=1440;out.push([a,b])}
 return out.length?out:null}
function hrOn(p,wd){return p&&p.hr&&p.hr[wd]||''}
function closedOn(p,wd){return parseHr(hrOn(p,wd))==='closed'}
function hrFit(p,wd,st,en){
 const r=parseHr(hrOn(p,wd));
 if(r==='closed')return 'closed';
 if(!r||r==='always')return null;
 for(const g of r){if(st>=g[0]&&en<=g[1])return null}
 return r.some(g=>st<g[1]&&en>g[0])?'partial':'outside'}
function wdOfDay(t,i){ if(!t||!t.days||!t.days[i])return null;
 const d=t.days[i].iso; if(!d)return null;
 const dt=new Date(d+'T00:00:00'); if(isNaN(dt))return null; return DKEY[dt.getDay()]}
function wdChips(t){
 const auto = t? wdOfDay(t,DAYI) : null;
 const lbl = auto ? ((DAYI+1)+'일차('+DNM[DKEY.indexOf(auto)]+') 영업') : '요일 자동';
 var h = '<span class="f sm '+(WD==='auto'?'on':'')+'" onclick="A.wd(\'auto\')">'+lbl+'</span>';
 h += '<span class="f sm '+(WD==='off'?'on':'')+'" onclick="A.wd(\'off\')">요일 무관</span>';
 for(var i=0;i<DKEY.length;i++){ h += '<span class="f sm '+(WD===DKEY[i]?'on':'')+'" onclick="A.wd(\''+DKEY[i]+'\')">'+DNM[i]+'</span>'; }
 return h;
}
function curWd(t){ return WD==='auto' ? (t?wdOfDay(t,DAYI):null) : (WD==='off'?null:WD); }

function wdIdx(t,i){const w=wdOfDay(t,i);return w?DKEY.indexOf(w):-1}
/* 별칭: 병합 과정에서 통합된 옛 장소 id */
const IDALIAS={"my-015":"my-014","edt-012":"my-044","edt-017":"my-149","edt-061":"my-063","edt-063":"edt-041","edt-064":"my-037","edt-072":"my-124","edt-085":"edt-038","edt-107":"my-112","edt-128":"my-114","edt-267":"edt-256","edt-315":"my-181","edt-321":"my-169","edt-323":"my-175","edt-356":"edt-350","edt-411":"edt-210"};


/* ══ 환율 (실시간) ══ */
const FXKEY='travelplanner.fx';
let FX={ts:0,rates:{},utc:'',live:false};
function loadFXCache(){try{const r=localStorage.getItem(FXKEY);if(r)FX=JSON.parse(r)}catch(e){}}
function saveFX(){try{localStorage.setItem(FXKEY,JSON.stringify(FX))}catch(e){}}
function fetchFX(force){
 const age=Date.now()-(FX.ts||0);
 if(!force && age<6*3600*1000 && FX.rates && FX.rates.JPY) return Promise.resolve(FX);
 return fetch('https://open.er-api.com/v6/latest/KRW')
  .then(r=>r.json())
  .then(function(j){
    if(j && j.result==='success' && j.rates){
      FX={ts:Date.now(),rates:j.rates,utc:j.time_last_update_utc||'',live:true};saveFX()}
    return FX})
  .catch(function(){return FX})}
function rateOf(cur){
 if(!cur||cur==='KRW')return 1;
 const r=FX.rates&&FX.rates[cur];
 return r?1/r:(FALLBACK[cur]||1)}
function fxAge(){
 if(!FX.ts)return '기본값';
 const h=Math.floor((Date.now()-FX.ts)/3600000);
 return h<1?'방금 갱신':(h<24?h+'시간 전 갱신':Math.floor(h/24)+'일 전 갱신')}
const CS_=c=>CURS[c]||{s:'',n:c};
const FMT=(a,cur)=>CS_(cur).s+Math.round(a).toLocaleString();
const curOf=()=>{const t=T();return (t&&t.cur)||'JPY'};
function refreshFX(){toast('환율 갱신 중…');
 fetchFX(true).then(function(){toast(FX.live?'환율 갱신 완료':'갱신 실패 · 저장된 값 사용');render()})}
window.refreshFX=refreshFX;

/* ══ 공유 · 동기화 ══ */
let SYNC={on:false,pushT:null,last:0,status:''};
function shareOf(t){return t&&t.share||null}
function syncStatus(){const t=T();
 if(!t||!t.share)return '';
 if(!window.FB)return '연결 중';
 return SYNC.status||'동기화 중';}
function pushSoon(){const t=T();
 if(!t||!t.share||!window.FB)return;
 clearTimeout(SYNC.pushT);
 SYNC.pushT=setTimeout(function(){
  const tt=T(); if(!tt||!tt.share)return;
  const payload=JSON.parse(JSON.stringify(tt)); payload.share=tt.share;
  window.FB.push(tt.share,payload,signer()).then(function(){
   SYNC.last=Date.now();SYNC.status='저장됨';paintSync()
  }).catch(function(e){SYNC.status='저장 실패';paintSync()});
 },700)}
function paintSync(){const el=document.getElementById('syncbadge');if(el)el.textContent=syncStatus()}
function myName(){try{return localStorage.getItem('travelplanner.me')||''}catch(e){return ''}}
function devId(){try{let d=localStorage.getItem('travelplanner.dev');
 if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('travelplanner.dev',d)}
 return d}catch(e){return 'x'}}
function signer(){return devId()+'|'+(myName()||'')}
/* ── 양쪽이 동시에 넣어도 안 사라지게 합치기 ──
   삭제는 '삭제 기록(tomb)'으로 남겨서 되살아나지 않게 한다 */
function tombAdd(t,key){t.tomb=t.tomb||{};t.tomb[key]=Date.now()}
function tombDel(t,key){if(t.tomb)delete t.tomb[key]}
function unionById(a,b,tomb,pre){
 const m={}; (a||[]).forEach(x=>m[x.id]=x); (b||[]).forEach(x=>{if(!m[x.id])m[x.id]=x});
 return Object.keys(m).filter(id=>!tomb[pre+id]).map(id=>m[id])}
function mergeTrip(local,remote){
 const out=JSON.parse(JSON.stringify(remote));
 const tomb={};
 [local.tomb||{},remote.tomb||{}].forEach(function(src){
  Object.keys(src).forEach(function(k){if(!tomb[k]||src[k]>tomb[k])tomb[k]=src[k]})});
 out.tomb=tomb;
 out.exp=unionById(out.exp,local.exp,tomb,'e:');
 out.docs=unionById(out.docs,local.docs,tomb,'d:');
 (out.days||[]).forEach(function(d,i){
  const ld=(local.days||[])[i]; if(!ld)return;
  const set=(d.cands||[]).slice();
  (ld.cands||[]).forEach(function(pid){if(set.indexOf(pid)<0)set.push(pid)});
  d.cands=set.filter(function(pid){return !tomb['c'+i+':'+pid]});
  d.tag=Object.assign({},ld.tag||{},d.tag||{});
  d.done=Object.assign({},ld.done||{},d.done||{});
  d.fixed=unionById(d.fixed,ld.fixed,tomb,'f:').sort(function(a,b){return t2m(a.s)-t2m(b.s)});
 });
 return out}
function tripSig(t){
 return (t.exp||[]).length+'|'+(t.docs||[]).length+'|'+
  (t.days||[]).map(d=>(d.cands||[]).length+'.'+(d.fixed||[]).length).join(',')}
function setMe(n){try{localStorage.setItem('travelplanner.me',n)}catch(e){}}
function startWatch(){
 const t=T(); if(!t||!t.share||!window.FB)return;
 window.FB.watch(t.share,function(r){
  if(!r||!r.trip)return;
  const cur=T(); if(!cur||cur.share!==t.share)return;
  const mine=(r.updatedBy||'').split('|')[0]===devId();
  if(mine){SYNC.status='저장됨';paintSync();return}
  const i=S.trips.findIndex(x=>x.id===cur.id);
  if(i<0)return;
  const keepId=cur.id;
  const merged=mergeTrip(cur,r.trip);
  S.trips[i]=Object.assign({},merged,{id:keepId,share:t.share});
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  const who=(r.updatedBy||'').split('|')[1];
  SYNC.status=who?(who+' 수정'):'수정됨';
  if(tripSig(merged)!==tripSig(r.trip)){pushSoon()}
  render();
 });
 SYNC.on=true}
function shareTrip(){
 const t=T(); if(!t)return;
 if(!window.FB){alert('아직 연결 중입니다. 잠시 후 다시 눌러주세요.');return}
 if(!myName()){
  const n=prompt('내 이름 (동행자에게 "누가 수정했는지" 표시됩니다)', t.members[0]?t.members[0].n:'나');
  if(!n)return; setMe(n.trim());
 }
 if(!t.share) t.share=window.FB.newId();
 save();
 const payload=JSON.parse(JSON.stringify(t));
 window.FB.push(t.share,payload,signer()).then(function(){
  SYNC.last=Date.now();SYNC.status='저장됨';startWatch();
  const url=location.origin+location.pathname+'?t='+t.share;
  copyLink(url);
  render();
 }).catch(function(e){alert('공유에 실패했습니다: '+e.message)});
}
function copyLink(url){
 if(navigator.share){navigator.share({title:'여행 계획',url:url}).catch(function(){fallbackCopy(url)});return}
 fallbackCopy(url)}
function fallbackCopy(url){
 try{navigator.clipboard.writeText(url).then(function(){toast('링크를 복사했습니다')},function(){prompt('이 링크를 동행자에게 보내세요',url)})}
 catch(e){prompt('이 링크를 동행자에게 보내세요',url)}}
function shareLink(){const t=T();if(!t||!t.share)return shareTrip();
 copyLink(location.origin+location.pathname+'?t='+t.share)}
function unshare(){const t=T();if(!t||!t.share)return;
 if(!confirm('공유를 해제합니다.\n이 기기에만 남고, 동행자 화면과 더 이상 연결되지 않습니다.'))return;
 if(window.FB)window.FB.stop();
 delete t.share; SYNC.on=false; SYNC.status=''; save(); toast('공유를 해제했습니다'); render()}
Object.assign(window,{shareTrip,shareLink,unshare,setMe,myName});

function hav(a,b){const R=6371,r=x=>x*Math.PI/180;const dl=r(b[0]-a[0]),dg=r(b[1]-a[1]);
 return 2*R*Math.asin(Math.sqrt(Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dg/2)**2))}
function moveEst(f,t){if(!f||!t||!f.ll||!t.ll)return{min:15,mode:'이동',km:null};
 const km=hav(f.ll,t.ll)*1.3;
 return km<1.2?{min:Math.max(3,Math.round(km/0.075)),mode:'도보',km}:{min:Math.round(7+km/0.45),mode:km>12?'전철':'지하철',km}}



/* ══ 그날 휴무 경고 ══ */
function dayWarn(t,i){
 if(!t||!t.days[i])return '';
 const wd=wdOfDay(t,i); if(!wd)return '';
 const bad=(t.days[i].cands||[]).map(P).filter(function(p){return p&&closedOn(p,wd)});
 const dn=DNM[DKEY.indexOf(wd)];
 var h='';
 if(bad.length){
  h+='<div class="warnbox">⚠ '+dn+'요일 휴무: '+bad.map(function(p){return esc(p.n)}).join(' · ')+
     '<div class="ws">다른 날로 옮기거나 빼는 게 좋습니다</div></div>';
 }
 const n=(t.days[i].cands||[]).length;
 if(n>=3) h+='<div class="optbar" onclick="A.opt()">⤢ 동선 순서 정렬 · 현재 '+totalKmOf(t.days[i].cands).toFixed(1)+'km</div>';
 return h;
}

/* ══ 동선 최적화 (후보 순서) ══ */
function totalKmOf(ids){var s=0,prev=null;
 for(var i=0;i<ids.length;i++){var p=P(ids[i]); if(!p||!p.ll){prev=p;continue}
  if(prev&&prev.ll)s+=hav(prev.ll,p.ll); prev=p}
 return s}
function optimizeDay(){
 const t=T(); if(!t)return;
 const D=t.days[DAYI]; const ids=D.cands.slice();
 if(ids.length<3){toast('후보가 3곳 이상일 때 정렬됩니다');return}
 const pts=ids.map(P).filter(Boolean);
 if(pts.some(p=>!p.ll)){toast('좌표 없는 장소가 있어 정렬할 수 없습니다');return}
 const before=totalKmOf(ids);
 const rest=ids.slice(1), out=[ids[0]]; var cur=P(ids[0]);
 while(rest.length){var bi=0,bd=1e9;
  for(var i=0;i<rest.length;i++){var d=hav(cur.ll,P(rest[i]).ll); if(d<bd){bd=d;bi=i}}
  cur=P(rest[bi]); out.push(rest.splice(bi,1)[0])}
 const after=totalKmOf(out);
 if(after>=before-0.05){toast('이미 최적 순서입니다 ('+before.toFixed(1)+'km)');return}
 D.cands=out; save(); render();
 toast('동선 정렬 완료 · '+before.toFixed(1)+'km → '+after.toFixed(1)+'km');
}

/* ══ 지난 여행 기록 (읽기 전용) ══ */
const ARCHIVE=[{
 id:'nagoya-2026', title:'나고야 3박 4일', range:'2026. 4. 3 ~ 4. 6', days:4, places:26,
 spent:1802164, budget:2000000,
 cats:[['항공',636000],['쇼핑',612000],['음식',419120],['숙박',412000],['교통',98400],['관광',64600]],
 best:[['Unagi no Shiromura',5,'히츠마부시. 예약 필수'],['야바톤',5,'아카미소 된장돈까스. 소스는 사오자'],
  ['세카이노 야마짱',5,'테바사키. 사와서 숙소에서 먹는 게 좋다'],['토라카이소혼케',4,'오야코동 전문점'],
  ['카토 코히텐',4,'오구라토스트. 오픈런 필수'],['미라이타워',4,'야경 산책'],
  ['노리타케의 숲',4,'날 좋은 날 커피 한잔'],['미센',2,'꼭 가볼 맛은 아니다']]
}];

const PREP_TPL=[
 {g:'예약 · 서류',items:[{t:'항공권 발권',s:''},{t:'숙소 예약',s:''},{t:'여행자 보험',s:''},
   {t:'트래블월렛 · 환전',s:''},{t:'e심 · 유심',s:''},{t:'식당 예약',s:''},{t:'티켓 · 바우처 저장',s:''}]},
 {g:'짐싸기',items:[{t:'여권',s:''},{t:'보조 배터리',s:'절연테이프 필수'},{t:'충전기 · 어댑터',s:'돼지코'},
   {t:'상비약',s:'두통약 · 소화제'},{t:'옷 · 속옷 · 양말',s:''},{t:'세면도구 · 화장품',s:''},
   {t:'동전 지갑',s:''},{t:'휴대용 티슈',s:''}]},
 {g:'현지 구매 목록',items:[]}
];

/* ══ 상태 ══ */
const KEY='travelplanner.v2';
let S=null;
const blank=()=>({v:2,trips:[],active:null});
function load(){
 try{const r=localStorage.getItem(KEY);S=r?JSON.parse(r):blank()}catch(e){S=blank()}
 if(!S||S.v!==2)S=blank();
 S.trips=S.trips||[];
 S.trips.forEach(t=>{t.days=t.days||[];t.days.forEach(d=>{d.fixed=d.fixed||[];d.cands=d.cands||[];d.done=d.done||{};d.tag=d.tag||{}});
  t.exp=t.exp||[];t.prep=t.prep||[];t.docs=t.docs||[];t.members=t.members||[{n:'나'}];t.cur=t.cur||'JPY'});
 try{localStorage.removeItem('travelplanner.v1')}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert('저장 공간이 부족합니다')}
 try{pushSoon()}catch(e){}}
const T=()=>S.trips.find(t=>t.id===S.active)||null;

function mkDays(start,end){
 const a=new Date(start+'T00:00:00'), b=new Date(end+'T00:00:00');
 const n=Math.max(1,Math.round((b-a)/86400000)+1), out=[];
 for(let i=0;i<n;i++){const d=new Date(a.getTime()+i*86400000);
  out.push({n:(i+1)+'일차',d:(d.getMonth()+1)+'/'+d.getDate(),
   iso:new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10),
   wd:'일월화수목금토'[d.getDay()],fixed:[],cands:[],done:{}})}
 return out}
const todayIso=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};

/* ══ 화면 상태 ══ */
let WD='auto';
let QT=null, QCOMP=false, TAGOPEN=null;
let TAB='__trips', DAYI=0, TDI=0, FILT='all', AREA='all', REG='', Q='', LIM=20, PICK=0, FIXFORM=0, mapObj=null, TOAST=null, TT=null;
const TABS=[['day','📋','하루'],['place','📍','장소'],['money','💰','지갑'],['prep','🎒','가방']];
const NOWM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
function toast(t){TOAST=t;clearTimeout(TT);paintToast();TT=setTimeout(()=>{TOAST=null;paintToast()},1900)}
function paintToast(){let el=document.getElementById('toast');
 if(!TOAST){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
 el.textContent=TOAST}

/* ══ 액션 ══ */
const A={
 go:k=>{TAB=k;PICK=0;FIXFORM=0;render()},
 edit:()=>{EDIT=EDIT?0:1;PICK=0;FIXFORM=0;render()},
 adv:()=>{ADV=ADV?0:1;render()},
 day:i=>{DAYI=i;PICK=0;FIXFORM=0;render()},
 tday:i=>{TDI=i;render()},
 pick:()=>{PICK=!PICK;FIXFORM=0;render()},
 fixform:()=>{FIXFORM=!FIXFORM;PICK=0;render()},
 filt:k=>{FILT=k;LIM=20;paintPlaces()},
 wd:k=>{WD=k;LIM=20;render()},
 opt:()=>optimizeDay(),
 area:k=>{AREA=k;LIM=20;render()},
 reg:k=>{REG=k;AREA='all';LIM=20;render()},
 more:()=>{LIM+=20;paintPlaces()},
 qType:v=>{Q=v;LIM=20;if(QCOMP)return;clearTimeout(QT);QT=setTimeout(paintPlaces,170)},
 qComp:(on,v)=>{QCOMP=!!on;if(!on){if(v!=null)Q=v;clearTimeout(QT);QT=setTimeout(paintPlaces,60)}},
 clearq:()=>{Q='';LIM=20;render()},
 add:(di,pid)=>{const t=T();if(!t)return;const c=t.days[di].cands;
  if(c.indexOf(pid)<0){c.push(pid);tombDel(t,'c'+di+':'+pid);save();toast(P(pid).n+' → '+t.days[di].n)}
  TAB==='place'?paintPlaces():render()},
 del:(di,pid)=>{const t=T();if(!t)return;const c=t.days[di].cands,i=c.indexOf(pid);
  if(i>-1){c.splice(i,1);tombAdd(t,'c'+di+':'+pid);save();toast('후보에서 뺐습니다')}TAB==='place'?paintPlaces():render()},
 toggle:(pid,di)=>{const t=T();if(!t){alert('먼저 여행을 만들어주세요');return}
  t.days[di].cands.indexOf(pid)>=0?A.del(di,pid):A.add(di,pid)},
 up:(di,i)=>{const c=T().days[di].cands;if(i>0){const x=c[i-1];c[i-1]=c[i];c[i]=x;save()}render()},
 dn:(di,i)=>{const c=T().days[di].cands;if(i<c.length-1){const x=c[i+1];c[i+1]=c[i];c[i]=x;save()}render()},
 visit:(di,pid)=>{const d=T().days[di];d.done[pid]?delete d.done[pid]:d.done[pid]=m2t(NOWM());save();render()},
 chk:(gi,ii)=>{const it=T().prep[gi].items[ii];it.v=it.v?0:1;save();render()},
 open:id=>{S.active=id;DAYI=0;const t=T();REG=t.region||REG;save();
  const di=t.days.findIndex(d=>d.iso===todayIso());
  if(di>=0){DAYI=di;TDI=di}else{TDI=0} TAB='day'; render()},
 newtrip:()=>{TAB='__new';render()},
 settings:()=>{TAB='__set';render()},
 archive:id=>{window.__arch=id;TAB='__arch';render()},
 back:()=>{TAB=S.active?'day':'__trips';render()},
 trips:()=>{TAB='__trips';render()}
};
window.A=A;

/* ══ 여행 만들기 ══ */
function createTrip(){
 const g=id=>document.getElementById(id);
 const title=g('f_title').value.trim(), region=g('f_region').value, cur=g('f_cur').value,
  start=g('f_start').value, end=g('f_end').value,
  mem=g('f_mem').value.trim();
 const rows=document.getElementById('f_budrows');
 const mb={}; let budget=0;
 if(rows)rows.querySelectorAll('input').forEach(i=>{const v=parseInt(String(i.value).replace(/[^0-9]/g,''))||0;mb[i.dataset.n]=v;budget+=v});
 if(!title)return alert('여행 이름을 입력해주세요');
 if(!start||!end)return alert('출발일과 도착일을 입력해주세요');
 if(new Date(end)<new Date(start))return alert('도착일이 출발일보다 빠릅니다');
 const days=mkDays(start,end);
 if(days.length>21)return alert('최대 21일까지 지원합니다');
 const members=(mem?mem.split(/[,\u00b7\/\s]+/).filter(Boolean):['나']).map(n=>({n:n,b:mb[n]||0}));
 const t={id:uid(),title,region,cur,start,end,members,budget,split:'even',days,exp:[],docs:[],
  prep:PREP_TPL.map(x=>({g:x.g,items:x.items.map(i=>({t:i.t,s:i.s,v:0}))}))};
 S.trips.push(t);S.active=t.id;DAYI=0;TDI=0;REG=region||REG;TAB='day';EDIT=1;save();
 toast(days.length+'일 여행을 만들었습니다');render()}
function delTrip(id){const t=S.trips.find(x=>x.id===id);if(!t)return;
 if(!confirm('"'+t.title+'" 여행을 삭제합니다.\n일정·후보·지출·준비물이 모두 지워집니다. 계속할까요?'))return;
 S.trips=S.trips.filter(x=>x.id!==id);S.active=S.trips.length?S.trips[0].id:null;
 save();TAB='__trips';toast('삭제했습니다');render()}
function resetTrip(id){const t=S.trips.find(x=>x.id===id);if(!t)return;
 if(!confirm('"'+t.title+'"의 내용만 비웁니다.\n날짜·인원·예산은 그대로 두고 고정 일정·후보·지출·체크만 초기화합니다.'))return;
 t.days.forEach(d=>{d.fixed=[];d.cands=[];d.done={}});t.exp=[];t.docs=[];
 t.prep=PREP_TPL.map(x=>({g:x.g,items:x.items.map(i=>({t:i.t,s:i.s,v:0}))}));
 save();toast('내용을 비웠습니다');render()}
function resetAll(){
 if(!confirm('이 기기에 저장된 모든 여행을 지우고 처음 상태로 되돌립니다.\n계속할까요?'))return;
 if(!confirm('정말 전부 지울까요? 되돌릴 수 없습니다.'))return;
 try{localStorage.removeItem(KEY)}catch(e){}
 load();TAB='__trips';DAYI=0;TDI=0;toast('초기화했습니다');render()}
Object.assign(window,{createTrip,delTrip,resetTrip,resetAll});

/* ══ 고정 일정 ══ */
function addFixed(){
 const g=id=>document.getElementById(id);
 const nm=g('x_nm').value.trim(), s=g('x_s').value,
  dur=parseInt(g('x_dur').value)||60, cat=g('x_cat').value, why=g('x_why').value.trim();
 if(!nm)return alert('이름을 입력해주세요');
 if(!s)return alert('시각을 입력해주세요');
 const d=T().days[DAYI];
 d.fixed.push({id:uid(),s,dur,cat,nm,why});
 d.fixed.sort((a,b)=>t2m(a.s)-t2m(b.s));
 save();FIXFORM=0;toast('고정 일정 추가됨');render()}
function delFixed(fid){const d=T().days[DAYI];const f=d.fixed.find(x=>x.id===fid);if(!f)return;
 if(!confirm('"'+f.nm+'"을(를) 삭제할까요?'))return;
 tombAdd(T(),'f:'+fid);d.fixed=d.fixed.filter(x=>x.id!==fid);save();render()}
Object.assign(window,{addFixed,delFixed});

/* ══ 지출 · 준비물 · 서류 ══ */
let EF=null;
function openExp(id){const t=T();if(!t)return;
 if(id){const e=t.exp.find(x=>x.id===id);
  if(e){EF={id:id,nm:e.nm,amt:String(e.amt||e.krw||e.jpy||''),cur:e.cur||(e.krw?'KRW':'JPY'),
   who:e.who,cat:e.cat,pay:e.pay,personal:e.personal?1:0}}}
 else EF={id:null,nm:'',amt:'',cur:t.cur||'JPY',who:t.members[0].n,cat:'음식',pay:'카드',personal:0};
 render();
 setTimeout(function(){const e=document.getElementById('e_nm');if(e)e.focus()},120)}
function closeExp(){EF=null;render()}
function efSet(k,v){if(!EF)return;EF[k]=v;render()}
function efSync(){if(!EF)return;
 const a=document.getElementById('e_nm'),b=document.getElementById('e_amt');
 if(a)EF.nm=a.value; if(b)EF.amt=b.value}
function saveExp(){const t=T();if(!t||!EF)return; efSync();
 const n=parseFloat(String(EF.amt).replace(/[^0-9.]/g,''));
 if(!EF.nm.trim())return alert('항목을 입력해주세요');
 if(!n)return alert('금액을 입력해주세요');
 if(EF.id){const e=t.exp.find(x=>x.id===EF.id);
  if(e){e.nm=EF.nm.trim();e.amt=n;e.cur=EF.cur;e.who=EF.who;e.cat=EF.cat;e.pay=EF.pay;e.personal=EF.personal?1:0;
   delete e.krw;delete e.jpy}
  EF=null;save();toast('지출 수정됨');render();return}
 t.exp.push({id:uid(),nm:EF.nm.trim(),amt:n,cur:EF.cur,who:EF.who,cat:EF.cat,pay:EF.pay,personal:EF.personal?1:0});
 EF=null;save();toast('지출 추가됨');render()}
Object.assign(window,{openExp,closeExp,efSet,efSync,saveExp});
function vExpForm(){const t=T();
 const CATS=['음식','교통','쇼핑','관광','숙박','항공','기타'];
 const C=t.cur||'JPY';
 return '<div class="sheetbg" onclick="closeExp()"></div><div class="sheet">'+
  '<div class="shd">'+(EF.id?'지출 수정':'지출 추가')+'<span onclick="closeExp()">닫기 ✕</span></div>'+
  '<div class="sbody">'+
   '<div class="fld"><label>항목</label><input id="e_nm" value="'+esc(EF.nm)+'" placeholder="예: 점심 라멘" autocomplete="off" oninput="efSync()"></div>'+
   '<div class="fld"><label>금액</label><div class="amtrow">'+
    '<input id="e_amt" type="number" inputmode="decimal" value="'+esc(EF.amt)+'" placeholder="0" oninput="efSync()">'+
    '<span class="seg"><b class="'+(EF.cur===C?'on':'')+'" onclick="efSync();efSet(\'cur\',\''+C+'\')">'+CS_(C).s+' '+CS_(C).n+'</b>'+
    '<b class="'+(EF.cur==='KRW'?'on':'')+'" onclick="efSync();efSet(\'cur\',\'KRW\')">₩ 원</b></span></div>'+
    '<div class="hint">'+(EF.cur!=='KRW'&&EF.amt?'≈ '+W((parseFloat(String(EF.amt).replace(/[^0-9.]/g,''))||0)*rateOf(EF.cur)):'1'+CS_(C).n+' = '+rateOf(C).toFixed(2)+'원')+'</div></div>'+
   '<div class="fld"><label>이 돈은</label><div class="seg big">'+
    '<b class="'+(!EF.personal?'on':'')+'" onclick="efSync();efSet(\'personal\',0)">공동 경비</b>'+
    '<b class="'+(EF.personal?'on':'')+'" onclick="efSync();efSet(\'personal\',1)">개인 경비</b></span></div>'+
    '<div class="hint">'+(EF.personal?'개인 경비는 <b>공동 예산에서 빠지고 정산에도 안 들어갑니다</b>':'공동 예산에서 차감되고 정산 대상이 됩니다')+'</div></div>'+
   (t.members.length>1?'<div class="fld"><label>'+(EF.personal?'누구 돈':'누가 결제')+'</label><div class="chips">'+
    t.members.map(m=>'<span class="ch '+(EF.who===m.n?'on':'')+'" onclick="efSync();efSet(\'who\',\''+esc(m.n)+'\')">'+esc(m.n)+'</span>').join('')+'</div></div>':'')+
   '<div class="fld"><label>분류</label><div class="chips">'+
    CATS.map(c=>'<span class="ch '+(EF.cat===c?'on':'')+'" onclick="efSync();efSet(\'cat\',\''+c+'\')">'+c+'</span>').join('')+'</div></div>'+
   '<div class="fld"><label>결제 수단</label><div class="seg">'+
    '<b class="'+(EF.pay==='카드'?'on':'')+'" onclick="efSync();efSet(\'pay\',\'카드\')">카드</b>'+
    '<b class="'+(EF.pay==='현금'?'on':'')+'" onclick="efSync();efSet(\'pay\',\'현금\')">현금</b></div></div>'+
   '<div class="fbtn" onclick="saveExp()">저장</div>'+
   (EF.id?'<div class="fcancel" style="color:var(--warn)" onclick="delExpFromForm()">삭제</div>':'')+
  '</div></div>'}
function delExpFromForm(){const t=T();if(!t||!EF||!EF.id)return;
 if(!confirm('이 지출을 삭제할까요?'))return;
 tombAdd(t,'e:'+EF.id);t.exp=t.exp.filter(e=>e.id!==EF.id);EF=null;save();toast('삭제했습니다');render()}
window.delExpFromForm=delExpFromForm;
function delExp(id){const t=T();if(!confirm('이 지출을 삭제할까요?'))return;
 tombAdd(t,'e:'+id);t.exp=t.exp.filter(e=>e.id!==id);save();render()}
/* ── 준비물 항목 추가·수정·삭제 ── */
let PF=null;
function addPrep(gi){PF={mode:'prep',gi:gi,ii:-1,t:'',s:''};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
function editPrep(gi,ii){const it=T().prep[gi].items[ii];
 PF={mode:'prep',gi:gi,ii:ii,t:it.t||'',s:it.s||''};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
function addDoc(){PF={mode:'doc',id:null,t:'',s:''};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
function editDoc(id){const d=T().docs.find(x=>x.id===id);if(!d)return;
 PF={mode:'doc',id:id,t:d.n||'',s:d.s||''};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
function closePF(){PF=null;render()}
function pfSync(){if(!PF)return;
 const a=document.getElementById('p_t'),b=document.getElementById('p_s');
 if(a)PF.t=a.value; if(b)PF.s=b.value}
function savePF(){const t=T();if(!t||!PF)return;pfSync();
 if(!PF.t.trim())return alert('내용을 입력해주세요');
 if(PF.mode==='mem'){
  const nm=PF.t.trim(), bd=parseInt(String(PF.s).replace(/[^0-9]/g,''))||0;
  if(PF.orig==null){
   if(t.members.some(m=>m.n===nm))return alert('같은 이름이 이미 있습니다');
   t.members.push({n:nm,b:bd});
  }else{
   const m=t.members.find(x=>x.n===PF.orig); if(!m)return;
   if(nm!==PF.orig){
    if(t.members.some(x=>x.n===nm))return alert('같은 이름이 이미 있습니다');
    t.exp.forEach(function(e){if(e.who===PF.orig)e.who=nm});
    if(myName()===PF.orig)setMe(nm);
   }
   m.n=nm; m.b=bd;
  }
  t.budget=t.members.reduce((a,x)=>a+(x.b||0),0);
  PF=null;save();toast('저장했습니다');render();return;
 }
 if(PF.mode==='prep'){
  if(PF.ii<0)t.prep[PF.gi].items.push({t:PF.t.trim(),s:PF.s.trim(),v:0});
  else{const it=t.prep[PF.gi].items[PF.ii];it.t=PF.t.trim();it.s=PF.s.trim()}
 }else{
  if(PF.id==null)t.docs.push({id:uid(),i:'📄',n:PF.t.trim(),s:PF.s.trim()});
  else{const d=t.docs.find(x=>x.id===PF.id);if(d){d.n=PF.t.trim();d.s=PF.s.trim()}}
 }
 PF=null;save();toast('저장했습니다');render()}
function delPF(){const t=T();if(!t||!PF)return;
 if(!confirm('삭제할까요?'))return;
 if(PF.mode==='mem'){
  if(t.members.length<=1)return alert('마지막 한 명은 지울 수 없습니다');
  const cnt=t.exp.filter(e=>e.who===PF.orig).length;
  if(cnt&&!confirm(PF.orig+' 님으로 기록된 지출이 '+cnt+'건 있습니다.\n인원을 지우면 그 지출은 '+t.members.filter(m=>m.n!==PF.orig)[0].n+' 님으로 옮겨집니다. 계속할까요?'))return;
  const to=t.members.filter(m=>m.n!==PF.orig)[0].n;
  t.exp.forEach(function(e){if(e.who===PF.orig)e.who=to});
  t.members=t.members.filter(m=>m.n!==PF.orig);
  t.budget=t.members.reduce((a,x)=>a+(x.b||0),0);
  PF=null;save();toast('삭제했습니다');render();return;
 }
 if(PF.mode==='prep'){if(PF.ii>=0)t.prep[PF.gi].items.splice(PF.ii,1)}
 else{if(PF.id!=null){tombAdd(t,'d:'+PF.id);t.docs=t.docs.filter(x=>x.id!==PF.id)}}
 PF=null;save();toast('삭제했습니다');render()}
Object.assign(window,{editPrep,editDoc,closePF,pfSync,savePF,delPF});
function vPFForm(){
 const isNew=(PF.mode==='prep'?PF.ii<0:(PF.mode==='mem'?PF.orig==null:PF.id==null));
 const title=(PF.mode==='prep'?'준비물':(PF.mode==='mem'?'인원':'서류'))+(isNew?' 추가':' 수정');
 return '<div class="sheetbg" onclick="closePF()"></div><div class="sheet">'+
  '<div class="shd">'+title+'<span onclick="closePF()">닫기 ✕</span></div>'+
  '<div class="sbody">'+
   '<div class="fld"><label>'+(PF.mode==='prep'?'항목':(PF.mode==='mem'?'이름':'서류 이름'))+'</label>'+
    '<input id="p_t" value="'+esc(PF.t)+'" placeholder="'+(PF.mode==='prep'?'예: 보조 배터리':(PF.mode==='mem'?'예: 민희':'예: 진에어 e-티켓'))+'" autocomplete="off" oninput="pfSync()"></div>'+
   '<div class="fld"><label>'+(PF.mode==='mem'?'공동 예산 (원)':'메모')+'</label>'+
    '<input id="p_s" '+(PF.mode==='mem'?'type="number" inputmode="numeric" ':'')+'value="'+esc(PF.s)+'" placeholder="'+(PF.mode==='prep'?'예: 절연테이프 필수':(PF.mode==='mem'?'비우면 0':'예약번호 등'))+'" autocomplete="off" oninput="pfSync()"></div>'+
   (PF.mode==='mem'?'<div class="hint" style="margin:-8px 0 14px">같이 쓸 돈만 넣으세요. 개인 쇼핑은 지출에서 <b>개인</b>으로 찍으면 됩니다.</div>':'')+
   '<div class="fbtn" onclick="savePF()">저장</div>'+
   (isNew?'':'<div class="fcancel" style="color:var(--warn)" onclick="delPF()">삭제</div>')+
  '</div></div>'}
Object.assign(window,{delExp,addPrep,addDoc});

/* ══ 시간 구획 (2축) ══ */
const SLOTS=[['am','오전','08:00','12:00'],['pm','오후','12:00','18:00'],['nt','밤','18:00','22:00']];
const MEALS=[['bf','아침'],['ln','점심'],['dn','저녁'],['sn','간식']];
const SLOTNM=k=>{const s=SLOTS.find(x=>x[0]===k);return s?s[1]:''};
const MEALNM=k=>{const m=MEALS.find(x=>x[0]===k);return m?m[1]:''};
function tagOf(D,pid){return (D.tag&&D.tag[pid])||{}}
function slotOfGap(g){
 const hit=SLOTS.filter(s=>Math.min(g.t,t2m(s[3]))-Math.max(g.f,t2m(s[2]))>=40);
 return hit.length?hit.map(s=>s[1]).join('·'):''}
function setSlot(di,pid,k){const D=T().days[di];D.tag=D.tag||{};
 const cur=D.tag[pid]||{}; cur.s=(cur.s===k?'':k); D.tag[pid]=cur; save();render()}
function setMeal(di,pid,k){const D=T().days[di];D.tag=D.tag||{};
 const cur=D.tag[pid]||{}; cur.m=(cur.m===k?'':k); D.tag[pid]=cur; save();render()}
function togTag(pid){TAGOPEN=(TAGOPEN===pid?null:pid);render()}
function swapCand(di,a,b){const c=T().days[di].cands;
 if(a<0||b<0||a>=c.length||b>=c.length)return;
 const x=c[a];c[a]=c[b];c[b]=x;save();render()}
Object.assign(window,{setSlot,setMeal,togTag,swapCand});

/* ══ 엔진 ══ */
const DAY_START='08:00', DAY_END='22:00';
function gapsOf(D){const F=D.fixed.map(a=>({st:t2m(a.s),en:t2m(a.s)+a.dur})).sort((x,y)=>x.st-y.st);
 const out=[];let cur=t2m(DAY_START);
 F.forEach(a=>{if(a.st>cur)out.push({f:cur,t:a.st});cur=Math.max(cur,a.en)});
 if(cur<t2m(DAY_END))out.push({f:cur,t:t2m(DAY_END)});
 return out.filter(g=>g.t-g.f>=50)}
const fitsIn=(p,g)=>(p.du+12)<=(g.t-g.f);
function dday(t){if(!t)return'';
 const s=new Date(t.start+'T00:00:00'),e=new Date(t.end+'T23:59:59'),n=new Date();
 if(n>e)return'다녀옴';
 const d=Math.ceil((s-n)/86400000);
 return n>=s?'여행 중':(d>0?'D-'+d:'D-DAY')}
const eK=e=>{if(e.cur)return e.cur==='KRW'?(e.amt||0):(e.amt||0)*rateOf(e.cur);
 return (e.krw||0)+(e.jpy||0)*rateOf('JPY')};

/* ══ 여행 목록 · 온보딩 ══ */
function vTripList(){
 const rc={};DB.forEach(p=>rc[p.r]=(rc[p.r]||0)+1);
 const first=!S.trips.length;
 return `${first?`<div class="hero">
   <div class="hi">🧭</div>
   <div class="ht">여행 계획을 시작해보세요</div>
   <div class="hs">예약된 것만 시간을 정하고,<br>나머지는 후보로 담아둡니다.<br>앱이 빈 시간을 계산해 갈 수 있는 곳을 골라줍니다.</div>
   <div class="hb" onclick="A.newtrip()">＋ 첫 여행 만들기</div>
  </div>`:''}
 ${S.trips.map(t=>{const nC=t.days.reduce((a,d)=>a+d.cands.length,0),nF=t.days.reduce((a,d)=>a+d.fixed.length,0);
  return `<div class="tripcard" onclick="A.open('${t.id}')">
   <div class="bn" style="background:linear-gradient(140deg,#D9542B,#8E2F14)">
    <div class="dd">${dday(t)}</div><h3>${esc(t.title)}</h3></div>
   <div class="bd"><div class="r"><span class="mut">${t.start} ~ ${t.end}</span><b>${t.days.length}일</b></div>
    <div class="r"><span class="mut">지역 · 인원</span><b>${esc(t.region||'미지정')} · ${t.members.map(m=>esc(m.n)).join(', ')}</b></div>
    <div class="r"><span class="mut">고정 ${nF}건 · 후보 ${nC}곳</span><b>${t.members.reduce((a,m)=>a+(m.b||0),0)?W(t.members.reduce((a,m)=>a+(m.b||0),0)):'예산 미설정'}</b></div>
    ${t.share?'<div class="r"><span class="mut">공유</span><b style="color:var(--acc2)">동행자와 공유 중</b></div>':''}
   </div></div>`}).join('')}
 ${first?'':'<div class="newtrip" onclick="A.newtrip()">＋ 새 여행 만들기</div>'}
 <div class="sec">지난 여행 기록<span class="secr">읽기 전용</span></div>
 ${ARCHIVE.map(a=>`<div class="tripcard" onclick="A.archive('${a.id}')">
   <div class="bn" style="background:linear-gradient(140deg,#0E6B5E,#093B34)">
    <div class="dd">🔒 기록</div><h3>${esc(a.title)}</h3></div>
   <div class="bd"><div class="r"><span class="mut">${a.range}</span><b>${a.days}일</b></div>
    <div class="r"><span class="mut">총 지출</span><b>${W(a.spent)}</b></div>
    <div class="r"><span class="mut">방문한 곳</span><b>${a.places}곳</b></div></div></div>`).join('')}
 <div class="sec">장소 DB<span class="secr">여행과 무관하게 저장</span></div>
 <div class="lib"><div class="t">전체 ${DB.length}곳 · 좌표 ${DB.filter(p=>p.ll).length}곳</div>
  <div class="s">새 여행을 만들 때 도시를 고르면 그 목록이 후보 풀이 됩니다. 초기화해도 사라지지 않습니다.</div>
  <div class="row">${Object.keys(rc).sort((a,b)=>rc[b]-rc[a]).map(k=>`<span>${esc(k)} ${rc[k]}</span>`).join('')}</div></div>
 <div class="setlink" onclick="A.settings()">⚙︎ 설정 · 초기화</div>
 <div style="height:20px"></div>`;
}

function vNew(){
 const regs=[...new Set(DB.map(p=>p.r))].sort((a,b)=>DB.filter(p=>p.r===b).length-DB.filter(p=>p.r===a).length);
 const d=new Date(); const t0=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
 const curKeys=['JPY','USD','EUR','TWD','THB','VND','HKD','CNY','SGD','PHP','KRW'];
 return `<div class="form">
  <div class="fld"><label>여행 이름</label><input id="f_title" placeholder="예: 후쿠오카 3박 4일" autocomplete="off"></div>
  <div class="fld"><label>어디로 가나요</label>
   <select id="f_region">${regs.map(r=>`<option value="${esc(r)}">${esc(r)} · 장소 ${DB.filter(p=>p.r===r).length}곳</option>`).join('')}
    <option value="">그 외 (장소 DB 없이 직접)</option></select>
   <div class="hint">고른 도시의 장소 목록이 후보 풀이 됩니다</div></div>
  <div class="fld"><label>현지 통화</label>
   <select id="f_cur">${curKeys.map(c=>`<option value="${c}"${c==='JPY'?' selected':''}>${c} · ${CS_(c).n} (${CS_(c).s})</option>`).join('')}</select>
   <div class="hint">현재 1${CS_('JPY').n} = ${(rateOf('JPY')).toFixed(2)}원 · ${fxAge()}</div></div>
  <div class="frow">
   <div class="fld"><label>출발</label><input id="f_start" type="date" value="${t0}"></div>
   <div class="fld"><label>도착</label><input id="f_end" type="date" value="${t0}"></div></div>
  <div class="fld"><label>함께 가는 사람</label><input id="f_mem" placeholder="이름을 쉼표로 구분 · 비우면 혼자" autocomplete="off" oninput="mkBudRows()">
   <div class="hint">이름을 넣으면 아래에 1인당 예산칸이 생깁니다</div></div>
  <div class="fld"><label>공동 예산 · 각자 얼마씩</label>
   <div id="f_budrows"></div>
   <div class="budsum" id="f_budsum">합계 ₩0</div>
   <div class="hint">여기 넣는 건 <b>같이 쓸 돈</b>입니다. 개인 쇼핑처럼 각자 쓰는 돈은 넣지 마세요 — 지출을 <b>개인</b>으로 찍으면 공동 예산에서 빠집니다.</div></div>
  <div class="fbtn" onclick="createTrip()">여행 만들기</div>
  <div class="fcancel" onclick="A.trips()">취소</div>
  <div class="fnote"><b>만든 다음 순서</b><br>
   ① <b>일정</b> 탭에서 항공·숙소·예약처럼 시간이 정해진 것을 넣습니다<br>
   ② <b>장소</b> 탭에서 가고 싶은 곳을 날짜에 담습니다<br>
   ③ <b>오늘</b> 탭이 남은 시간에 갈 수 있는 곳을 골라줍니다</div>
 </div>`;
}

function mkBudRows(){
 const el=document.getElementById('f_budrows'); if(!el)return;
 const raw=(document.getElementById('f_mem')||{value:''}).value.trim();
 const names=raw?raw.split(/[,\u00b7\/\s]+/).filter(Boolean):['나'];
 const old={}; el.querySelectorAll('input').forEach(i=>old[i.dataset.n]=i.value);
 el.innerHTML=names.map(n=>'<div class="budrow"><span>'+esc(n)+'</span>'+
  '<input type="number" inputmode="numeric" data-n="'+esc(n)+'" value="'+(old[n]||'')+'" placeholder="0" oninput="sumBud()"></div>').join('');
 sumBud()}
function sumBud(){
 const el=document.getElementById('f_budrows'); if(!el)return 0;
 let s=0; const ins=el.querySelectorAll('input');
 ins.forEach(i=>s+=parseInt(String(i.value).replace(/[^0-9]/g,''))||0);
 const o=document.getElementById('f_budsum');
 if(o)o.textContent='합계 '+W(s)+(ins.length>1?' · '+ins.length+'명':'');
 return s}
Object.assign(window,{mkBudRows,sumBud});

function vSettings(){
 const t=T();
 return ` <div class="sec">동행자와 공유</div>
 ${t?(t.share?`<div class="card mrow">
   <div class="srow"><span>상태</span><b style="color:var(--acc2)">공유 중 · ${esc(syncStatus())}</b></div>
   <div class="srow"><span>내 이름</span><b>${myName()?esc(myName()):'<span style="color:var(--warn)">미설정</span>'} <span class="edit" onclick="askNameNow()">${myName()?'수정':'설정'}</span></b></div>
   <div class="linkbox">${esc(location.origin+location.pathname)}?t=${esc(t.share)}</div>
  <div class="srow"><span>초대 코드</span><b style="font-family:ui-monospace,monospace;font-size:12px">${esc(t.share)}</b></div>
  <div class="dbtn" onclick="copyCode()">초대 코드 복사<em>홈 화면 앱에서는 링크 대신 코드로 연결하세요</em></div>
  </div>
  <div class="dbtn" onclick="shareLink()" style="color:var(--acc2);border-color:#CBE0DB;background:#F2F8F6">초대 링크 다시 보내기
   <em>이 링크를 받은 사람은 같은 계획을 보고 수정할 수 있습니다</em></div>
  <div class="dbtn warn" onclick="unshare()">공유 해제
   <em>이 기기에만 남기고 동행자 화면과 연결을 끊습니다</em></div>`
  :`<div class="card mrow"><div class="note2">
   지금은 <b>이 기기에만</b> 저장됩니다. 공유하면 동행자가 같은 계획을 보고 같이 수정할 수 있고, 내 폰과 PC도 자동으로 맞춰집니다.
  </div></div>
  <div class="dbtn" onclick="shareTrip()" style="color:#fff;border-color:var(--acc2);background:var(--acc2)">동행자와 공유하기
   <em style="color:rgba(255,255,255,.75)">초대 링크가 만들어집니다</em></div>`):''}
 <div class="sec">다른 기기에서 만든 여행 불러오기</div>
 <div class="card">
  <div class="hint" style="margin-bottom:8px">PC나 다른 폰에서 이미 공유를 켰다면, 그 화면의 <b>초대 코드</b>를 여기에 붙여넣으세요. 링크를 통째로 붙여넣어도 됩니다.</div>
  <input id="joincode" placeholder="초대 코드 또는 링크 붙여넣기" autocomplete="off" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;font-size:15px;font-family:ui-monospace,monospace;background:#FAF8F5">
  <div class="dbtn" onclick="joinByCode()" style="color:#fff;border-color:#3A6EA5;background:#3A6EA5;margin-top:8px">불러오기<em style="color:rgba(255,255,255,.75)">이 기기가 같은 계획에 연결됩니다</em></div>
 </div>
${t?`<div class="sec">이 여행</div>
  <div class="card mrow">
   <div class="srow"><span>이름</span><b>${esc(t.title)}</b></div>
   <div class="srow"><span>기간</span><b>${t.start} ~ ${t.end} (${t.days.length}일)</b></div>
   <div class="srow"><span>지역</span><b>${esc(t.region||'미지정')}</b></div>
   <div class="srow"><span>통화</span><b>${t.cur} · 1${CS_(t.cur).n} = ${rateOf(t.cur).toFixed(2)}원</b></div>
   <div class="srow"><span>여행 이름</span><b>${esc(t.title)} <span class="edit" onclick="editTitle()">수정</span></b></div>
  </div>
  <div class="sec">인원 · 공동 예산<span class="secr" onclick="addMember()">＋ 인원 추가</span></div>
  <div class="card mrow">
   ${t.members.map(m=>`<div class="srow"><span>${esc(m.n)}${m.n===myName()?'<em class="me">나</em>':''}</span><b>${W(m.b||0)} <span class="edit" onclick="editMember('${esc(m.n)}')">수정</span></b></div>`).join('')}
   <div class="srow"><span>합계 (${t.members.length}명)</span><b>${W(t.members.reduce((a,m)=>a+(m.b||0),0))}</b></div>
   ${t.members.length<2?'<div class="note2" style="margin-top:8px">인원이 1명이라 정산이 표시되지 않습니다. 함께 가는 사람을 추가하세요.</div>':''}
  </div>
  <div class="sec">정산 방식</div>
  <div class="card mrow"><div class="seg big">
   <b class="${t.split!=='ratio'?'on':''}" onclick="setSplit('even')">1/N — 똑같이</b>
   <b class="${t.split==='ratio'?'on':''}" onclick="setSplit('ratio')">예산 비율대로</b></div>
   <div class="note2" style="margin-top:9px">공동 경비만 정산합니다. 개인 경비는 항상 제외됩니다.</div></div>
  <div class="dbtn warn" onclick="resetTrip('${t.id}')">이 여행 내용만 비우기
   <em>날짜·인원·예산은 두고 고정 일정·후보·지출·체크만 초기화</em></div>
  <div class="dbtn danger" onclick="delTrip('${t.id}')">이 여행 삭제
   <em>이 여행에 넣은 모든 내용이 사라집니다</em></div>`:'<div class="sec">여행</div><div class="card mrow"><div class="gnone" style="margin:0">선택된 여행이 없습니다</div></div>'}
 <div class="sec">환율</div>
 <div class="card mrow">
  <div class="srow"><span>기준</span><b>1${CS_(curOf()).n} = ${rateOf(curOf()).toFixed(2)}원</b></div>
  <div class="srow"><span>상태</span><b>${FX.live?'실시간':'기본값'} · ${fxAge()}</b></div>
  <div class="srow"><span>출처</span><b>exchangerate-api.com</b></div>
 </div>
 <div class="dbtn" onclick="refreshFX()" style="color:var(--acc2);border-color:#CBE0DB;background:#F2F8F6">지금 환율 새로고침
  <em>평소에는 6시간마다 자동으로 갱신되고, 오프라인이면 마지막 값을 씁니다</em></div>
 <div class="sec">전체</div>
 <div class="dbtn danger" onclick="resetAll()">앱 전체 초기화
  <em>이 기기에 저장된 모든 여행을 지우고 처음 상태로</em></div>
 <div class="sec">알아두기</div>
 <div class="card mrow"><div class="note2">
  · 계획은 <b>이 브라우저에만</b> 저장됩니다. 다른 기기·동행자와는 아직 공유되지 않습니다.<br>
  · 장소 DB ${DB.length}곳은 앱에 내장돼 있어 초기화해도 남습니다.<br>
  · 지난 여행 기록도 읽기 전용이라 지워지지 않습니다.<br>
  · 인터넷이 끊겨도 열립니다.
 </div></div><div style="height:20px"></div>`;
}

function editTitle(){const t=T();const v=prompt('여행 이름',t.title);if(v===null)return;
 if(!v.trim())return alert('이름을 입력해주세요');
 t.title=v.trim();save();toast('바꿨습니다');render()}
function addMember(){const t=T();
 PF={mode:'mem',orig:null,t:'',s:''};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
function editMember(name){const t=T();const m=t.members.find(x=>x.n===name);if(!m)return;
 PF={mode:'mem',orig:name,t:m.n,s:String(m.b||'')};render();
 setTimeout(function(){const e=document.getElementById('p_t');if(e)e.focus()},120)}
Object.assign(window,{editTitle,addMember,editMember});
function editBud(name){const t=T();const m=t.members.find(x=>x.n===name);if(!m)return;
 const v=prompt(name+' 님의 공동 예산 (원)', String(m.b||0)); if(v===null)return;
 m.b=parseInt(String(v).replace(/[^0-9]/g,''))||0;
 t.budget=t.members.reduce((a,x)=>a+(x.b||0),0); save();toast('예산을 바꿨습니다');render()}
function setSplit(v){const t=T();t.split=v;save();render()}
Object.assign(window,{editBud,setSplit});

function vArchive(){
 const a=ARCHIVE.find(x=>x.id===window.__arch)||ARCHIVE[0];
 const mx=Math.max.apply(null,a.cats.map(c=>c[1]));
 const CC={항공:'#3A6EA5',숙박:'#B08834',음식:'#D9542B',교통:'#98918A',관광:'#0E6B5E',쇼핑:'#6B4FA8'};
 return `<div class="rep"><div class="lb">TRIP RECORD</div><h2>${esc(a.title)}</h2><div class="mt">${a.range}</div>
  <div class="g"><div><div class="k">총 지출</div><div class="v">${W(a.spent)}</div></div>
   <div><div class="k">예산 대비</div><div class="v">${Math.round(a.spent/a.budget*100)}% 사용</div></div>
   <div><div class="k">방문한 곳</div><div class="v">${a.places}곳</div></div>
   <div><div class="k">하루 평균</div><div class="v">${W(a.spent/a.days)}</div></div></div></div>
 <div class="sec">어디에 썼나</div>
 <div class="card mrow">${a.cats.slice().sort((x,y)=>y[1]-x[1]).map(c=>`<div class="it">
  <div class="l"><span>${c[0]}</span><em>${W(c[1])} · ${Math.round(c[1]/a.spent*100)}%</em></div>
  <div class="mini"><i style="width:${c[1]/mx*100}%;background:${CC[c[0]]||'#98918A'}"></i></div></div>`).join('')}</div>
 <div class="sec">다시 갈 만한 곳</div>
 <div class="card mrow">${a.best.map(b=>`<div class="rate">
  <div style="flex:1"><div class="nm">${esc(b[0])}</div><div class="rm2">${esc(b[2])}</div></div>
  <span class="st">${'★'.repeat(b[1])}${'☆'.repeat(5-b[1])}</span></div>`).join('')}</div>
 <div class="card mrow" style="margin-top:14px;margin-bottom:20px"><div class="note2">
  이 여행은 <b>기록</b>입니다. 열람만 되고 수정되지 않습니다.<br>
  다음 여행 예산의 기준선 — 하루 평균 <b>${W(a.spent/a.days)}</b>
 </div></div>`;
}

/* ══ 일정 ══ */
function vPlan(){
 const t=T(); if(!t)return vTripList();
 const D=t.days[DAYI]||t.days[0], G=gapsOf(D), done=D.done;
 const cands=D.cands.map(P).filter(Boolean);
 const rest=cands.filter(p=>!done[p.i]);
 const FREE=G.reduce((a,g)=>a+(g.t-g.f),0);
 let prev=null;const chain=cands.map(p=>{const mv=moveEst(prev,p);prev=p;return{p:p,mv:mv}});
 const NEED=chain.filter(x=>!done[x.p.i]).reduce((a,x)=>a+x.p.du+x.mv.min,0);
 const FX2=D.fixed.slice().sort((x,y)=>t2m(x.s)-t2m(y.s));
 let body='';
 if(!FX2.length&&!cands.length){
  body='<div class="empty">아직 아무것도 없습니다<br><span class="es">항공·숙소·예약처럼 <b>시간이 정해진 것</b>부터 넣어보세요</span></div>';
 }else{
  G.forEach((g,gi)=>{
   const ok=rest.filter(p=>fitsIn(p,g)), no=rest.filter(p=>!fitsIn(p,g));
   const _sl=slotOfGap(g);
   const _same=ok.filter(p=>{const tg=tagOf(D,p.i);return tg.s&&_sl.indexOf(SLOTNM(tg.s))>=0});
   const _show=(_same.length?_same:ok);
   body+=`<div class="gap"><div class="t"><b>빈 시간 ${m2t(g.f)} ~ ${m2t(g.t)}</b><span>${_sl?_sl+' · ':''}${D2(g.t-g.f)}</span></div>
    ${rest.length?`<div class="fit">${_show.slice(0,3).map(p=>`<span>${(CAT[p.c]||CAT.see).i} ${esc(cut(p.n,11))}</span>`).join('')}
     ${no.slice(0,1).map(p=>`<span class="no">${esc(cut(p.n,11))}</span>`).join('')}</div>
    <div class="okline">${_same.length?_sl+' 후보 '+_same.length+'곳':'담아둔 후보 '+ok.length+'곳'}이 이 시간에 들어갑니다</div>`
    :'<div class="gnone">담아둔 후보가 없습니다</div>'}</div>`;
   const a=FX2[gi];
   if(a){const c=CAT[a.cat]||CAT.see;
    body+=`<div class="anch"><div class="tm"><b>${a.s}</b><em>${m2t(t2m(a.s)+a.dur)}</em></div>
     <div style="flex:1"><div class="nm">${c.i} ${esc(a.nm)}</div>${a.why?`<div class="sb">${esc(a.why)}</div>`:''}</div>
     <div class="rm" onclick="delFixed('${a.id}')">✕</div></div>`}
  });
  FX2.slice(G.length).forEach(a=>{const c=CAT[a.cat]||CAT.see;
   body+=`<div class="anch"><div class="tm"><b>${a.s}</b><em>${m2t(t2m(a.s)+a.dur)}</em></div>
    <div style="flex:1"><div class="nm">${c.i} ${esc(a.nm)}</div>${a.why?`<div class="sb">${esc(a.why)}</div>`:''}</div>
    <div class="rm" onclick="delFixed('${a.id}')">✕</div></div>`});
 }
 const pool=DB.filter(p=>p.r===t.region&&D.cands.indexOf(p.i)<0)
  .sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0)).slice(0,12);
 const picker=PICK?`<div class="picker"><div class="ph">${D.n} 후보로 담기 · 평점순<span onclick="A.pick()">닫기 ✕</span></div>
  ${pool.length?pool.map(p=>{const c=CAT[p.c]||CAT.see;const other=t.days.map((d,i)=>d.cands.indexOf(p.i)>=0?i:-1).filter(i=>i>=0);
   return `<div class="pk" onclick="A.add(${DAYI},'${p.i}')"><div style="flex:1">
    <div class="nm">${c.i} ${esc(p.n)}</div><div class="meta"><span>약 ${D2(p.du)}</span>${p.rt?`<span>★ ${p.rt}</span>`:''}${p.g?`<span>${esc(p.g)}</span>`:''}
    ${other.length?`<span style="color:var(--acc2);font-weight:800">${other.map(i=>t.days[i].n).join('·')}에 있음</span>`:''}</div></div>
    <div class="plus">＋</div></div>`}).join(''):'<div class="pk"><div style="flex:1;font-size:13px;color:var(--sub)">이 지역 장소 DB가 없습니다. 장소 탭에서 다른 지역을 골라보세요.</div></div>'}
  <div class="pkmore" onclick="A.go('place')">장소 탭에서 검색해서 고르기 →</div></div>`:'';
 const fixform=FIXFORM?`<div class="picker"><div class="ph">${D.n} · 고정 일정 추가<span onclick="A.fixform()">닫기 ✕</span></div>
  <div class="form inner">
   <div class="fld"><label>무엇</label><input id="x_nm" placeholder="예: 진에어 LJ221 / 호텔 체크인 / 식당 예약" autocomplete="off"></div>
   <div class="frow"><div class="fld"><label>시작</label><input id="x_s" type="time" value="12:00"></div>
    <div class="fld"><label>소요 (분)</label><input id="x_dur" type="number" inputmode="numeric" value="60"></div></div>
   <div class="frow"><div class="fld"><label>분류</label><select id="x_cat">
     <option value="move">✈️ 이동</option><option value="stay">🏨 숙소</option><option value="eat">🍜 식사</option>
     <option value="see">🏯 관광</option><option value="shop">🛍 쇼핑</option><option value="cafe">☕ 카페</option></select></div>
    <div class="fld"><label>메모</label><input id="x_why" placeholder="예약번호 등" autocomplete="off"></div></div>
   <div class="fbtn sm" onclick="addFixed()">추가</div></div></div>`:'';
 return `<div class="hstack">${t.days.map((d,i)=>`<div class="dc ${i===DAYI?'on':''}" onclick="A.day(${i})">
   <div class="n">${d.n}</div><div class="d">${d.d}</div></div>`).join('')}</div>
  ${dayWarn(t,DAYI)}
  <div class="sumbar"><div><div class="k">고정</div><div class="v">${D.fixed.length}건</div></div>
   <div><div class="k">후보</div><div class="v">${cands.length}곳</div></div>
   <div><div class="k">빈 시간</div><div class="v">${D2(FREE)}</div></div></div>
  ${cands.filter(p=>p.ll).length?'<div class="mapbox"><div id="map"></div></div>':''}
  <div class="grouphd"><span class="l">시간이 정해진 것</span><span class="r">예약 · 티켓 · 교통</span></div>
  ${body}
  <div class="addbtn dark" onclick="A.fixform()">${FIXFORM?'✕ 닫기':'＋ 고정 일정 추가'}</div>${fixform}
  <div class="grouphd"><span class="l">${D.n} 후보</span><span class="r">${rest.length?'소요 '+D2(NEED)+' / 빈 '+D2(FREE):'비어 있음'}</span></div>
  ${(function(){
    if(!cands.length)return '';
    const groups=[['am','오전'],['pm','오후'],['nt','밤'],['','구획 미지정']];
    const idxOf={}; D.cands.forEach((id,k)=>idxOf[id]=k);
    let out='', prevP=null, seq=0;
    groups.forEach(function(gr){
      const items=cands.filter(p=>((D.tag&&D.tag[p.i]&&D.tag[p.i].s)||'')===gr[0]);
      if(!items.length)return;
      const need=items.filter(p=>!done[p.i]).reduce((a,p)=>a+p.du,0);
      out+='<div class="slothd"><span class="sl">'+gr[1]+'</span><span class="sr">'+items.length+'곳 · 소요 '+D2(need)+'</span></div>';
      items.forEach(function(p,gi){
        const mv=moveEst(prevP,p); prevP=p; seq++;
        const dn=done[p.i], c=CAT[p.c]||CAT.see, tg=tagOf(D,p.i);
        const myIdx=idxOf[p.i];
        const upIdx=gi>0?idxOf[items[gi-1].i]:-1;
        const dnIdx=gi<items.length-1?idxOf[items[gi+1].i]:-1;
        if(seq>1)out+='<div class="mvline"><span>'+(mv.mode==='도보'?'🚶':'🚃')+' '+mv.mode+' 약 '+mv.min+'분'+(mv.km!=null?' · '+mv.km.toFixed(1)+'km':'')+' <em>추정</em></span></div>';
        out+='<div class="cand '+(dn?'dn':'')+'">'+
         '<div class="ord">'+(upIdx>=0?'<span onclick="swapCand('+DAYI+','+myIdx+','+upIdx+')">▲</span>':'<span class="off">▲</span>')+
          '<b>'+(gi+1)+'</b>'+(dnIdx>=0?'<span onclick="swapCand('+DAYI+','+myIdx+','+dnIdx+')">▼</span>':'<span class="off">▼</span>')+'</div>'+
         '<div style="flex:1">'+
          '<div class="nm" onclick="A.visit('+DAYI+',\''+p.i+'\')">'+c.i+' '+esc(p.n)+
            (tg.m?'<span class="mealb">'+MEALNM(tg.m)+'</span>':'')+'</div>'+
          '<div class="meta"><span>약 '+D2(p.du)+'</span>'+(p.rt?'<span>★ '+p.rt+'</span>':'')+(p.g?'<span>'+esc(p.g)+'</span>':'')+
            (dn?'<span style="color:var(--acc2);font-weight:800">✓ '+dn+' 방문</span>':'')+'</div>'+
          (p.m?'<div class="memo mine">📝 '+esc(p.m)+'</div>':(p.d?'<div class="memo">'+esc(cut(p.d,64))+'</div>':''))+
          '<div class="tagbtn" onclick="togTag(\''+p.i+'\')">'+(TAGOPEN===p.i?'✕ 닫기':'🕘 구획 '+(tg.s?SLOTNM(tg.s):'미지정')+(tg.m?' · '+MEALNM(tg.m):''))+'</div>'+
          (TAGOPEN===p.i?('<div class="tagpick">'+
            '<div class="tl">시간대</div><div class="tr">'+SLOTS.map(s=>'<span class="tc '+(tg.s===s[0]?'on':'')+'" onclick="setSlot('+DAYI+',\''+p.i+'\',\''+s[0]+'\')">'+s[1]+'</span>').join('')+'</div>'+
            '<div class="tl">식사</div><div class="tr">'+MEALS.map(m=>'<span class="tc m '+(tg.m===m[0]?'on':'')+'" onclick="setMeal('+DAYI+',\''+p.i+'\',\''+m[0]+'\')">'+m[1]+'</span>').join('')+'</div>'+
            '<div class="th">한 번 더 누르면 해제됩니다</div></div>'):'')+
         '</div>'+
         '<div class="rm" onclick="A.del('+DAYI+',\''+p.i+'\')">✕</div></div>';
      });
    });
    return out;
  })()||'<div class="empty">아직 담은 후보가 없습니다<br><span class="es">아래 버튼이나 <b>장소</b> 탭에서 담아보세요</span></div>'}
  <div class="addbtn" onclick="A.pick()">${PICK?'✕ 닫기':'＋ 장소에서 후보 담기'}</div>${picker}<div style="height:16px"></div>`;
}
function drawMap(){const el=document.getElementById('map');if(!el)return;
 if(mapObj){mapObj.remove();mapObj=null}
 const t=T();if(!t)return;
 const D=t.days[DAYI]||t.days[0];
 const cs=D.cands.map(P).filter(p=>p&&p.ll);
 if(!cs.length){el.innerHTML='<div class="nomap">담은 장소에 좌표가 없습니다</div>';return}
 el.innerHTML='';
 mapObj=L.map(el,{zoomControl:false,attributionControl:false});
 L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(mapObj);
 cs.forEach((p,i)=>L.marker(p.ll,{icon:L.divIcon({html:'<div class="pin">'+(i+1)+'</div>',className:'',iconSize:[24,24]})}).addTo(mapObj).bindPopup(p.n));
 if(cs.length>1)L.polyline(cs.map(p=>p.ll),{color:'#D9542B',weight:2.5,opacity:.5,dashArray:'5,6'}).addTo(mapObj);
 mapObj.fitBounds(L.latLngBounds(cs.map(p=>p.ll)).pad(.3));
 setTimeout(function(){if(mapObj)mapObj.invalidateSize()},150)}

/* ══ 장소 ══ */
function placeFilter(){
 const t=T();
 const inTrip=p=>!!(t&&t.days.some(d=>d.cands.indexOf(p.i)>=0));
 let L2=DB.filter(p=>p.r===REG);
 const areas=[...new Set(L2.map(p=>p.a).filter(Boolean))];
 if(AREA!=='all')L2=L2.filter(p=>p.a===AREA);
 if(FILT==='un')L2=L2.filter(p=>!inTrip(p)); else if(FILT!=='all')L2=L2.filter(p=>p.c===FILT);
 if(Q){const q=Q.trim().toLowerCase();
  if(q)L2=L2.filter(p=>((p.n||'')+(p.j||'')+(p.g||'')+(p.d||'')+(p.m||'')).toLowerCase().indexOf(q)>=0)}
 const _wd=curWd(t); if(_wd) L2=L2.filter(p=>!closedOn(p,_wd));
 L2=L2.slice().sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0));
 return {list:L2,areas:areas,inTrip:inTrip,t:t}}

function placeChips(){
 const R=DB.filter(p=>p.r===REG), q=placeFilter();
 const F=[['all','전체',R.length],['un','미배정',R.filter(p=>!q.inTrip(p)).length],
  ['eat','🍜 식사',R.filter(p=>p.c==='eat').length],['cafe','☕ 카페',R.filter(p=>p.c==='cafe').length],
  ['see','🏯 관광',R.filter(p=>p.c==='see').length],['shop','🛍 쇼핑',R.filter(p=>p.c==='shop').length],
  ['stay','🏨 숙소',R.filter(p=>p.c==='stay').length],
  ['card','🎴 카드 쇼핑',R.filter(p=>p.c==='card').length]].filter(x=>x[2]>0);
 return F.map(f=>`<span class="f ${FILT===f[0]?'on':''}" onclick="A.filt('${f[0]}')">${f[1]} ${f[2]}</span>`).join('')}

function placeBody(){
 const q=placeFilter(), t=q.t, L2=q.list;
 return `<div class="cnt">${L2.length}곳${Q?' · "'+esc(Q)+'"':''}${!t?' · 담으려면 여행을 먼저 만드세요':''}</div>
 ${L2.slice(0,LIM).map(p=>{const c=CAT[p.c]||CAT.see;const ds=t?t.days.map((d,i)=>d.cands.indexOf(p.i)>=0?i:-1).filter(i=>i>=0):[];
  return `<div class="pl">
   <div class="r1">${p.ph?`<img class="th" src="${esc(p.ph)}=w96-h96-k-no" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:''}<span class="chip" style="background:${c.c}18;color:${c.c}">${c.i}</span><span class="nm">${esc(p.n)}</span></div>
   <div class="info">${p.rt?`<span>★ ${p.rt} (${(p.rv||0).toLocaleString()})</span>`:'<span class="d">평점 없음</span>'}
    ${p.g?`<span>${esc(p.g)}</span>`:''}${p.pr?`<span>${esc(p.pr)}</span>`:''}<span>약 ${D2(p.du)}</span>${p.ll?'':'<span class="d">좌표 없음</span>'}${(function(){var w=curWd(t);if(!w||!p.hr||!p.hr[w])return '';return '<span class="hrb">'+DNM[DKEY.indexOf(w)]+' '+esc(p.hr[w])+'</span>'})()}</div>
   ${p.m?`<div class="memo mine">📝 ${esc(p.m)}</div>`:''}
   ${p.d?`<div class="memo">${esc(cut(p.d,100))}</div>`:''}
   <div class="daypick">${t?t.days.map((d,i)=>`<span class="dp ${ds.indexOf(i)>=0?'on':''}" onclick="A.toggle('${p.i}',${i})">${i+1}일</span>`).join(''):'<span class="dphint">여행을 만들면 날짜에 담을 수 있습니다</span>'}
    <a class="glink" href="${esc(p.u)}" target="_blank" rel="noopener">지도 ↗</a>${p.v?`<a class="glink" href="${esc(p.v)}" target="_blank" rel="noopener">영상</a>`:''}</div>
  </div>`}).join('')}
 ${L2.length>LIM?`<div class="more" onclick="A.more()">＋ 더 보기 (${LIM}/${L2.length})</div>`:'<div style="height:14px"></div>'}`}

/* 목록만 부분 갱신 — 입력창을 다시 만들지 않아 한글 조합이 끊기지 않는다 */
function paintPlaces(){
 if(TAB!=='place')return;
 const b=document.getElementById('pbody'); if(!b)return;
 b.innerHTML=placeBody();
 const c=document.getElementById('pchips'); if(c)c.innerHTML=placeChips();}
window.paintPlaces=paintPlaces;

function vPlace(){
 const q=placeFilter(), t=q.t;
 const regs=[...new Set(DB.map(p=>p.r))].sort((a,b)=>DB.filter(p=>p.r===b).length-DB.filter(p=>p.r===a).length);
 return `<div class="hstack">${regs.map(r=>`<span class="rg ${REG===r?'on':''}" onclick="A.reg('${r}')">${esc(r)} ${DB.filter(p=>p.r===r).length}</span>`).join('')}</div>
 <div class="hstack">${wdChips(t)}</div>
 <div class="srchbox"><input id="q" value="${esc(Q)}" placeholder="이름 · 메뉴 · 설명 검색" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
   oninput="A.qType(this.value)" oncompositionstart="A.qComp(1)" oncompositionend="A.qComp(0,this.value)">
  ${Q?'<span class="clr" onclick="A.clearq()">✕</span>':''}</div>
 <div class="hstack" id="pchips">${placeChips()}</div>
 ${q.areas.length>1?`<div class="hstack">${['all'].concat(q.areas).map(a=>`<span class="f sm ${AREA===a?'on':''}" onclick="A.area('${String(a).replace(/'/g,'')}')">${a==='all'?'전 지역':esc(a)}</span>`).join('')}</div>`:''}
 <div id="pbody">${placeBody()}</div>`}

/* ══ 오늘 ══ */
function vToday(){
 const t=T(); if(!t)return vTripList();
 const now=NOWM();
 const realIdx=t.days.findIndex(d=>d.iso===todayIso());
 const isToday=realIdx>=0;
 if(isToday && TDI!==realIdx && !window.__tdTouched)TDI=realIdx;
 const di=Math.min(Math.max(0,TDI),t.days.length-1);
 const D=t.days[di], done=D.done;
 const live=isToday&&di===realIdx;
 const base=live?now:t2m(DAY_START);
 const nextA=D.fixed.map(a=>({s:a.s,nm:a.nm,st:t2m(a.s),dur:a.dur})).filter(a=>a.st>base).sort((x,y)=>x.st-y.st)[0];
 const win=nextA?nextA.st-base:Math.max(0,t2m(DAY_END)-base);
 const firstLL=D.cands.map(P).find(p=>p&&p.ll);
 const cur={ll:firstLL?firstLL.ll:null};
 const opts=D.cands.map(P).filter(p=>p&&!done[p.i]).map(p=>{const mv=moveEst(cur,p),need=mv.min+p.du;
   return Object.assign({},p,{mv:mv,need:need,end:base+need,slack:win-need})}).filter(o=>o.slack>=0).sort((a,b)=>a.slack-b.slack);
 const tooBig=D.cands.map(P).filter(p=>p&&!done[p.i]).length-opts.length;
 const vis=Object.keys(done).map(id=>({tm:done[id],nm:(P(id)||{n:'-'}).n})).sort((a,b)=>a.tm.localeCompare(b.tm));
 const SP=t.exp.filter(e=>!e.personal).reduce((a,e)=>a+eK(e),0);
 const BG=t.members.reduce((a,m)=>a+(m.b||0),0)||t.budget||0;
 const left=Math.max(1,t.days.length-di);
 return `<div class="tmode">
  <div class="lb">${live?'여행 중 · 실시간 계산':'미리보기 · '+dday(t)}</div>
  <h2>${live?'지금 '+m2t(now):D.n+' 하루 보기'}</h2>
  <div class="mt">${D.d} (${D.wd}) · ${esc(t.region||t.title)}</div>
  <div class="kpis"><div><div class="k">다녀온 곳</div><div class="v">${vis.length}곳</div></div>
   <div><div class="k">담은 후보</div><div class="v">${D.cands.length}곳</div></div>
   <div><div class="k">하루 예산</div><div class="v">${BG?W((BG-SP)/left):'—'}</div></div></div></div>
 <div class="todaynote">${live
   ?'지금 시각 기준으로 <b>다음 고정 일정까지 남은 시간</b>을 재고, 그 안에 갔다 올 수 있는 후보만 골라 보여줍니다.'
   :'오늘이 여행 기간이 아니라 <b>미리보기</b>입니다. 여행이 시작되면 현재 시각 기준으로 자동 전환됩니다.'}</div>
 <div class="hstack" style="padding-top:10px">${t.days.map((d,i)=>`<div class="dc sm ${i===di?'on':''}" onclick="window.__tdTouched=1;A.tday(${i})">
   <div class="n">${d.n}${i===realIdx?' ·오늘':''}</div><div class="d">${d.d}</div></div>`).join('')}</div>
 ${nextA?`<div class="anchornext"><div class="k">다음 고정 일정</div>
  <div class="v">${nextA.s} ${esc(nextA.nm)}</div><div class="s">${live?'지금부터':m2t(base)+'부터'} ${D2(win)} 비어 있음</div></div>`
  :`<div class="anchornext"><div class="k">남은 고정 일정</div><div class="v">없음</div>
  <div class="s">${D2(win)} 전부 자유 시간입니다</div></div>`}
 <div class="nowhd"><span>${live?'지금 갈 수 있는 곳':'이 시간에 갈 수 있는 곳'}</span><em>${opts.length}곳${tooBig>0?' · '+tooBig+'곳은 시간 부족':''}</em></div>
 ${opts.length?opts.slice(0,4).map((o,i)=>{const c=CAT[o.c]||CAT.see;return `<div class="opt ${i===0?'best':''}">
   ${i===0?'<div class="tag">시간 딱 맞음</div>':''}
   <div class="nm">${c.i} ${esc(o.n)}</div>
   <div class="meta">${o.rt?`<span>★ ${o.rt}</span>`:''}${o.mv.km!=null?`<span>${o.mv.mode} ${o.mv.min}분</span>`:''}<span>약 ${D2(o.du)}</span>${o.g?`<span>${esc(o.g)}</span>`:''}</div>
   <span class="calc">${live?'지금':m2t(base)+'에'} 출발하면 <b>${m2t(o.end)}</b>에 끝납니다${nextA?' · 다음 일정까지 <b>'+D2(o.slack)+'</b> 여유':''}</span>
   <div class="row"><button class="p" onclick="A.visit(${di},'${o.i}')">여기로 간다</button>
    <a class="glink" style="flex:1;justify-content:center" href="${esc(o.u)}" target="_blank" rel="noopener">길찾기</a></div></div>`}).join('')
  :`<div class="empty">${D.cands.length?'남은 시간에 갈 수 있는 곳이 없습니다':'담은 후보가 없습니다'}<br><span class="es">일정 탭에서 후보를 담아주세요</span></div>`}
 <div class="sec">다녀온 곳</div>
 <div class="card mrow" style="margin-bottom:20px">
  ${vis.length?vis.map(d=>`<div class="tr"><span class="tm">${d.tm}</span><span class="nm">${esc(d.nm)}</span><span class="ok">✓ 방문</span></div>`).join('')
   :'<div class="gnone" style="margin:0">"여기로 간다"를 누르면 방문 시각이 기록됩니다.</div>'}</div>`;
}

/* ══ 지갑 ══ */
function vMoney(){
 const t=T(); if(!t)return vTripList();
 const C=t.cur||'JPY', rate=rateOf(C);
 const shared=t.exp.filter(e=>!e.personal), mine=t.exp.filter(e=>e.personal);
 const SP=shared.reduce((a,e)=>a+eK(e),0), PS=mine.reduce((a,e)=>a+eK(e),0);
 const BG=t.members.reduce((a,m)=>a+(m.b||0),0)||t.budget||0;
 const RM=BG-SP, pct=BG?Math.min(100,SP/BG*100):0;
 let di=t.days.findIndex(d=>d.iso===todayIso()); if(di<0)di=0;
 const left=Math.max(1,t.days.length-di);
 const cs={};shared.forEach(e=>cs[e.cat]=(cs[e.cat]||0)+eK(e));
 const rows=Object.keys(cs).map(k=>[k,cs[k]]).sort((a,b)=>b[1]-a[1]);
 const mx=rows.length?rows[0][1]:1;
 const CC={항공:'#3A6EA5',숙박:'#B08834',음식:'#D9542B',교통:'#98918A',관광:'#0E6B5E',쇼핑:'#6B4FA8',기타:'#98918A'};
 const paid={},pers={};
 t.members.forEach(m=>{paid[m.n]=0;pers[m.n]=0});
 shared.forEach(e=>paid[e.who]=(paid[e.who]||0)+eK(e));
 mine.forEach(e=>pers[e.who]=(pers[e.who]||0)+eK(e));
 const ratio=t.split==='ratio'&&BG>0;
 const share={};t.members.forEach(m=>share[m.n]=ratio?SP*((m.b||0)/BG):SP/t.members.length);
 const ord=t.members.map(m=>({n:m.n,d:(paid[m.n]||0)-share[m.n]})).sort((a,b)=>a.d-b.d);
 const cash=shared.reduce((a,e)=>a+(e.pay==='현금'?eK(e):0),0);
 return `<div class="card mh">${BG?`<div class="lb">공동 예산 남은 돈</div><div class="big">${W(RM)}</div>
   <div class="bar"><i style="width:${pct}%;background:${RM<0?'var(--warn)':'var(--acc)'}"></i></div>
   <div class="sp"><span>사용 ${W(SP)} · ${Math.round(pct)}%</span><span>총 ${W(BG)}</span></div>
   <div class="budlist">${t.members.map(m=>`<div class="bl"><span>${esc(m.n)}</span><b>${W(m.b||0)}</b></div>`).join('')}</div>
   <div class="gauge"><div class="k">남은 ${left}일 · 하루 가능 금액</div><div class="v">${W(RM/left)}</div>
    <div class="n">현금 ${W(cash)} · 카드 ${W(SP-cash)}</div></div>`
  :`<div class="lb">공동 경비로 쓴 돈</div><div class="big">${W(SP)}</div>
   <div class="gauge"><div class="k">공동 예산이 설정되지 않았습니다</div>
    <div class="n">설정에서 인원별 예산을 넣으면 잔액과 하루 가능 금액이 계산됩니다</div></div>`}</div>
 ${PS>0?`<div class="sec">개인 경비<span class="secr">공동 예산·정산 제외</span></div>
 <div class="card mrow">${t.members.filter(m=>pers[m.n]>0).map(m=>`<div class="srow"><span>${esc(m.n)}</span><b>${W(pers[m.n])}</b></div>`).join('')}
  <div class="srow" style="border-top:1px solid var(--line);margin-top:4px;padding-top:10px"><span>개인 경비 합계</span><b>${W(PS)}</b></div>
  <div class="note2" style="margin-top:8px">각자 쇼핑처럼 혼자 쓴 돈입니다. 공동 예산에서 차감되지 않고 정산에도 들어가지 않습니다.</div></div>`:''}
 ${rows.length?`<div class="sec">분류별<span class="secr">공동 경비만</span></div><div class="card mrow">${rows.map(r=>`<div class="it">
  <div class="l"><span>${esc(r[0])}</span><em>${W(r[1])}</em></div>
  <div class="mini"><i style="width:${r[1]/mx*100}%;background:${CC[r[0]]||'#98918A'}"></i></div></div>`).join('')}</div>`:''}
 ${t.members.length>1&&SP>0?`<div class="sec">정산<span class="secr">${ratio?'예산 비율':'1/N'} 기준</span></div>
 <div class="card mrow settle"><div style="font-size:12px;font-weight:700;opacity:.85">공동 경비만 정산</div>
  <div class="res">${Math.abs(ord[0].d)<1?'정산 없음':esc(ord[0].n)+' → '+esc(ord[ord.length-1].n)+' '+W(Math.abs(ord[0].d))}</div>
  <div class="dt">${t.members.map(m=>esc(m.n)+' 결제 '+W(paid[m.n]||0)+' / 부담 '+W(share[m.n])).join('<br>')}</div></div>`:''}
 <div class="sec">환율 계산기<span class="secr" onclick="refreshFX()">↻ 새로고침</span></div>
 <div class="card mrow">
  <div class="fxhd"><b>1${CS_(C).n} = ${rate.toFixed(2)}원</b><span>${FX.live?'실시간':'기본값'} · ${fxAge()}</span></div>
  <div class="calcrow">
   <input id="fxin" type="number" inputmode="decimal" value="5000" oninput="calc()">
   <span style="font-size:14px;font-weight:800;color:var(--sub)">${CS_(C).n} =</span>
   <div id="krw" style="font-size:19px;font-weight:800;letter-spacing:-.02em"></div></div>
  <div class="cmp" id="cmp"></div></div>
 <div class="sec">지출 내역<span class="secr">공동 ${shared.length} · 개인 ${mine.length}</span></div>
 <div class="card mrow" style="margin-bottom:96px">${t.exp.length?t.exp.slice().reverse().map(e=>`<div class="exp">
  <span style="flex:1">${esc(e.nm)}<span class="who">${esc(e.who)}</span>${e.personal?'<span class="pay" style="background:#F1ECF7;color:#6B4FA8">개인</span>':''}<span class="pay" style="background:${e.pay==='현금'?'#FBF4E6':'#EDF2F7'};color:${e.pay==='현금'?'#8A6A22':'#3A6EA5'}">${e.pay}</span></span>
  <b>${e.cur&&e.cur!=='KRW'?FMT(e.amt,e.cur):W(e.amt||e.krw||0)}</b><span class="iedit sm" onclick="openExp('${e.id}')">✎</span></div>`).join('')
  :'<div class="gnone" style="margin:0">아직 없습니다. 우하단 ＋ 로 추가하세요.</div>'}</div>
 <button class="fab" onclick="openExp()">＋</button>
 ${EF?vExpForm():''}`}
function calc(){const el=document.getElementById('fxin');if(!el)return;
 const C=curOf(), rate=rateOf(C), v=+(el.value||0), base=v*rate;
 document.getElementById('krw').textContent=W(base);
 const cards=[['트래블월렛 · 트래블로그',0],['토스 체크',0.03],['일반 신용카드',0.043],['공항 환전',0.055]];
 const mn=Math.min.apply(null,cards.map(c=>base*(1+c[1])));
 document.getElementById('cmp').innerHTML=cards.map(c=>{const val=base*(1+c[1]);
  return `<div class="c ${val===mn?'best':''}"><span>${c[0]}${c[1]?' (+'+(c[1]*100).toFixed(1)+'%)':' (수수료 0)'}</span><b>${W(val)}</b></div>`}).join('')}
window.calc=calc;

/* ══ 가방 ══ */
function vPrep(){
 const t=T(); if(!t)return vTripList();
 const all=t.prep.reduce((a,g)=>a.concat(g.items.map(i=>i.v)),[]);
 const done=all.filter(Boolean).length,tot=all.length,p=tot?done/tot:0,R=25,C=2*Math.PI*R;
 return `<div class="card ring"><svg width="62" height="62" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="${R}" fill="none" stroke="#EFEAE2" stroke-width="7"/>
  <circle cx="30" cy="30" r="${R}" fill="none" stroke="var(--acc2)" stroke-width="7" stroke-linecap="round"
   stroke-dasharray="${C}" stroke-dashoffset="${C*(1-p)}" transform="rotate(-90 30 30)"/>
  <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="#17130F">${Math.round(p*100)}%</text></svg>
  <div><div class="t">${done} / ${tot} 완료</div><div class="s">${dday(t)} · 체크하면 바로 저장됩니다</div></div></div>
 ${t.prep.map((g,gi)=>`<div class="sec">${esc(g.g)}<span class="secr" onclick="addPrep(${gi})">＋ 추가</span></div>
  <div class="card chk">${g.items.length?g.items.map((it,ii)=>`
   <div class="ci"><div class="box ${it.v?'on':''}" onclick="A.chk(${gi},${ii})">${it.v?'✓':''}</div>
   <div style="flex:1" onclick="A.chk(${gi},${ii})"><div class="tx ${it.v?'done':''}">${esc(it.t)}</div>${it.s?`<div class="sb">${esc(it.s)}</div>`:''}</div>
   <div class="iedit" onclick="editPrep(${gi},${ii})">✎</div></div>`).join('')
   :'<div class="gnone" style="margin:0">비어 있습니다. 우측 ＋ 로 추가하세요.</div>'}</div>`).join('')}
 <div class="sec">예약 · 서류 보관함<span class="secr" onclick="addDoc()">＋ 추가</span></div>
 <div class="card doc" style="margin-bottom:20px">${t.docs.length?t.docs.map(d=>`<div class="di"><div class="ic">${d.i}</div>
  <div style="flex:1"><div class="nm">${esc(d.n)}</div><div class="sb">${esc(d.s)}</div></div>
  <div class="iedit" onclick="editDoc('${d.id}')">✎</div></div>`).join('')
  :'<div class="gnone" style="margin:0">예약번호·바우처를 적어두면 비행기 모드에서도 열립니다.</div>'}</div>`;
}

/* ══ 하루 시간표 ══ */
const SECT=[['am','오전','🌤',8*60,12*60],['pm','오후','☀️',12*60,18*60],['nt','밤','🌙',18*60,22*60]];
const MEALI={bf:'🍳',ln:'🍚',dn:'🍺',sn:'🍡'};
const MEALN={bf:'아침',ln:'점심',dn:'저녁',sn:'간식'};
const DEFMEAL={am:['bf'],pm:['ln','sn'],nt:['dn']};
let EDIT=0, ADV=0;

function secOfTime(m){for(const s of SECT){if(m>=s[3]&&m<s[4])return s[0]}return m<8*60?'am':'nt'}
function tagS(D,pid){return ((D.tag&&D.tag[pid])||{}).s||''}
function tagM(D,pid){return ((D.tag&&D.tag[pid])||{}).m||''}

function dayCard(D,p,edit){
 const dn=D.done[p.i], c=CAT[p.c]||CAT.see;
 return '<div class="dcard'+(dn?' dn':'')+'" data-pid="'+p.i+'">'+
  (edit?'<span class="dh">⠿</span>':'')+
  '<div class="dbody" onclick="A.visit('+DAYI+',\''+p.i+'\')">'+
   '<div class="dnm">'+c.i+' '+esc(p.n)+(dn?'<span class="dvis">✓ '+dn+'</span>':'')+'</div>'+
   '<div class="dmeta">'+(p.rt?'<span>★ '+p.rt+'</span>':'')+'<span>약 '+D2(p.du)+'</span>'+(p.g?'<span>'+esc(p.g)+'</span>':'')+'</div>'+
   (p.m?'<div class="dmemo">📝 '+esc(p.m)+'</div>':'')+
  '</div>'+
  (edit?'<span class="dx" onclick="event.stopPropagation();A.del('+DAYI+',\''+p.i+'\')">✕</span>':'')+
 '</div>'}

function dayZone(D,s,m,items,edit){
 const lab=m?(MEALI[m]+' '+MEALN[m]):'그 외';
 const cls=m?'dzone meal':'dzone etc';
 if(!items.length && !edit && m) return '';
 return '<div class="'+cls+'" data-s="'+s+'" data-m="'+m+'">'+
  '<div class="zl">'+lab+(items.length?'<em>'+items.length+'</em>':'')+'</div>'+
  items.map(p=>dayCard(D,p,edit)).join('')+
  (items.length?'':'<div class="zempty">'+(edit?'여기로 끌어다 놓기':'비어 있음')+'</div>')+
 '</div>'}

function vDay(){
 const t=T(); if(!t)return vTripList();
 const D=t.days[DAYI]||t.days[0];
 D.tag=D.tag||{};
 const edit=!!EDIT;
 const cands=D.cands.map(P).filter(Boolean);
 const G=gapsOf(D), FREE=G.reduce((a,g)=>a+(g.t-g.f),0);
 const fixed=D.fixed.slice().sort((a,b)=>t2m(a.s)-t2m(b.s));

 let body='';
 SECT.forEach(function(sc){
  const key=sc[0];
  const inSec=cands.filter(p=>tagS(D,p.i)===key);
  const fx=fixed.filter(f=>secOfTime(t2m(f.s))===key);
  let meals=DEFMEAL[key].slice();
  ['bf','ln','dn','sn'].forEach(function(mm){
   if(meals.indexOf(mm)<0 && inSec.some(p=>tagM(D,p.i)===mm))meals.push(mm)});
  if(edit && meals.indexOf('sn')<0)meals.push('sn');
  const used={}; meals.forEach(m=>used[m]=1);
  const etc=inSec.filter(p=>!used[tagM(D,p.i)]||!tagM(D,p.i));
  const secTot=inSec.reduce((a,p)=>a+p.du,0);
  body+='<div class="dsec s-'+key+'">'+
   '<div class="dsh"><span class="ic">'+sc[2]+'</span><span class="nm">'+sc[1]+'</span>'+
    '<span class="rt">'+(inSec.length?inSec.length+'곳 · '+D2(secTot):'비어 있음')+'</span></div>'+
   fx.map(f=>{const cc=CAT[f.cat]||CAT.see;
     return '<div class="dfix"><span class="tm">'+f.s+'</span><span class="fn">'+cc.i+' '+esc(f.nm)+'</span>'+
      (f.why?'<span class="fw">'+esc(f.why)+'</span>':'')+
      (edit?'<span class="dx" onclick="delFixed(\''+f.id+'\')">✕</span>':'<span class="lk">🔒</span>')+'</div>'}).join('')+
   meals.map(m=>dayZone(D,key,m,inSec.filter(p=>tagM(D,p.i)===m),edit)).join('')+
   dayZone(D,key,'',etc,edit)+
  '</div>';
 });
 const un=cands.filter(p=>!tagS(D,p.i));
 if(un.length||edit){
  body+='<div class="dsec s-un"><div class="dsh"><span class="ic">📥</span><span class="nm">미배치</span>'+
   '<span class="rt">'+(un.length?un.length+'곳':'없음')+'</span></div>'+
   dayZone(D,'','',un,edit)+'</div>';
 }

 const fixform=FIXFORM?'<div class="picker"><div class="ph">'+D.n+' · 고정 일정 추가<span onclick="A.fixform()">닫기 ✕</span></div>'+
  '<div class="form inner">'+
   '<div class="fld"><label>무엇</label><input id="x_nm" placeholder="예: 진에어 LJ221 / 호텔 체크인 / 식당 예약" autocomplete="off"></div>'+
   '<div class="frow"><div class="fld"><label>시작</label><input id="x_s" type="time" value="12:00"></div>'+
    '<div class="fld"><label>소요 (분)</label><input id="x_dur" type="number" inputmode="numeric" value="60"></div></div>'+
   '<div class="frow"><div class="fld"><label>분류</label><select id="x_cat">'+
     '<option value="move">✈️ 이동</option><option value="stay">🏨 숙소</option><option value="eat">🍜 식사</option>'+
     '<option value="see">🏯 관광</option><option value="shop">🛍 쇼핑</option><option value="cafe">☕ 카페</option></select></div>'+
    '<div class="fld"><label>메모</label><input id="x_why" placeholder="예약번호 등" autocomplete="off"></div></div>'+
   '<div class="fbtn sm" onclick="addFixed()">추가</div></div></div>':'';

 const pool=DB.filter(p=>p.r===t.region&&D.cands.indexOf(p.i)<0)
  .sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0)).slice(0,12);
 const picker=PICK?'<div class="picker"><div class="ph">'+D.n+'에 담기 · 평점순<span onclick="A.pick()">닫기 ✕</span></div>'+
  (pool.length?pool.map(function(p){const c=CAT[p.c]||CAT.see;
   const other=t.days.map((d,i)=>d.cands.indexOf(p.i)>=0?i:-1).filter(i=>i>=0);
   return '<div class="pk" onclick="A.add('+DAYI+',\''+p.i+'\')"><div style="flex:1">'+
    '<div class="nm">'+c.i+' '+esc(p.n)+'</div><div class="meta"><span>약 '+D2(p.du)+'</span>'+(p.rt?'<span>★ '+p.rt+'</span>':'')+(p.g?'<span>'+esc(p.g)+'</span>':'')+
    (other.length?'<span style="color:var(--acc2);font-weight:800">'+other.map(i=>t.days[i].n).join('·')+'에 있음</span>':'')+'</div></div>'+
    '<div class="plus">＋</div></div>'}).join('')
   :'<div class="pk"><div style="flex:1;font-size:13px;color:var(--sub)">이 지역 장소 DB가 없습니다</div></div>')+
  '<div class="pkmore" onclick="A.go(\'place\')">장소 탭에서 검색해서 고르기 →</div></div>':'';

 const adv=ADV?'<div class="advbox">'+
   '<div class="advhd">빈 시간</div>'+
   (G.length?G.map(function(g){
     const rest=cands.filter(p=>!D.done[p.i]);
     const ok=rest.filter(p=>fitsIn(p,g));
     return '<div class="gap"><div class="t"><b>'+m2t(g.f)+' ~ '+m2t(g.t)+'</b><span>'+(slotOfGap(g)?slotOfGap(g)+' · ':'')+D2(g.t-g.f)+'</span></div>'+
      '<div class="okline">후보 '+ok.length+'곳이 이 시간에 들어갑니다</div></div>'}).join('')
    :'<div class="gnone" style="margin:0 16px">고정 일정이 하루를 꽉 채우고 있습니다</div>')+
   '<div class="advhd">동선 지도</div>'+
   (cands.filter(p=>p.ll).length?'<div class="mapbox"><div id="map"></div></div>':'<div class="gnone" style="margin:0 16px 14px">담은 장소에 좌표가 없습니다</div>')+
  '</div>':'';

 return '<div class="hstack">'+t.days.map(function(d,i){
    return '<div class="dc '+(i===DAYI?'on':'')+'" onclick="A.day('+i+')"><div class="n">'+d.n+'</div><div class="d">'+d.d+'</div></div>'}).join('')+'</div>'+
  '<div class="daybar"><div class="dsum">고정 <b>'+D.fixed.length+'</b> · 담은 곳 <b>'+cands.length+'</b> · 빈 시간 <b>'+D2(FREE)+'</b></div>'+
   '<div class="ebtn '+(edit?'on':'')+'" onclick="A.edit()">'+(edit?'✓ 완료':'✎ 편집')+'</div></div>'+
  (edit?'<div class="ehint">카드를 <b>길게 누르면</b> 들어 올려집니다. 원하는 칸으로 끌어다 놓으세요.</div>':'')+
  dayWarn(t,DAYI)+
  body+
  (edit?'<div class="addbtn" onclick="A.pick()">'+(PICK?'✕ 닫기':'＋ 장소에서 담기')+'</div>'+picker+
        '<div class="addbtn dark" onclick="A.fixform()">'+(FIXFORM?'✕ 닫기':'＋ 고정 일정 추가')+'</div>'+fixform:'')+
  '<div class="advtog" onclick="A.adv()">'+(ADV?'▴ 빈 시간 · 동선 지도 닫기':'▾ 빈 시간 · 동선 지도')+'</div>'+adv+
  '<div style="height:20px"></div>'}

/* ── 길게 눌러 드래그 ── */
let DRAG=null;
function dayDragBind(){
 const root=document.getElementById('main'); if(!root)return;
 root.querySelectorAll('.dcard').forEach(function(el){
  el.addEventListener('pointerdown',function(e){pressStart(e,el)});
 });
}
function pressStart(e,el){
 if(!EDIT)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 try{const _s=window.getSelection(); _s&&_s.removeAllRanges()}catch(_){}
 function noSel(ev){ev.preventDefault()}
 document.addEventListener('selectstart',noSel);
 const pid=el.getAttribute('data-pid');
 const sx=e.clientX, sy=e.clientY;
 let dragging=false, ghost=null, gx=0, gy=0, timer=null;
 function stopScroll(ev){if(dragging)ev.preventDefault()}
 function clearHi(){document.querySelectorAll('.dzone.hi').forEach(z=>z.classList.remove('hi'));
  const ln=document.getElementById('dropline'); if(ln)ln.remove()}
 function hi(x,y){
  clearHi();
  const under=document.elementFromPoint(x,y); if(!under)return null;
  const z=under.closest('.dzone'); if(!z)return null;
  z.classList.add('hi');
  const cards=[...z.querySelectorAll('.dcard')].filter(c=>c!==el);
  let before=null;
  for(const c of cards){const r=c.getBoundingClientRect(); if(y<r.top+r.height/2){before=c;break}}
  const ln=document.createElement('div'); ln.id='dropline'; ln.className='dropline';
  if(before)z.insertBefore(ln,before); else z.appendChild(ln);
  return {z:z,before:before?before.getAttribute('data-pid'):null};
 }
 let target=null;
 function onMove(ev){
  if(!dragging){
   if(Math.abs(ev.clientX-sx)>10||Math.abs(ev.clientY-sy)>10){clearTimeout(timer);done(false)}
   return;
  }
  ev.preventDefault();
  ghost.style.left=(ev.clientX-gx)+'px';
  ghost.style.top=(ev.clientY-gy)+'px';
  target=hi(ev.clientX,ev.clientY);
 }
 function onUp(ev){
  if(dragging&&target){
   const s=target.z.getAttribute('data-s'), m=target.z.getAttribute('data-m');
   applyDrop(pid,s,m,target.before);
  }
  done(dragging);
 }
 function done(re){
  clearTimeout(timer);
  document.removeEventListener('selectstart',noSel);
  document.removeEventListener('pointermove',onMove);
  document.removeEventListener('pointerup',onUp);
  document.removeEventListener('pointercancel',onUp);
  document.removeEventListener('touchmove',stopScroll);
  if(ghost)ghost.remove();
  el.classList.remove('lifted');
  document.body.classList.remove('dragging');
  clearHi(); DRAG=null;
  if(re)render();
 }
 timer=setTimeout(function(){
  dragging=true; DRAG=pid;
  try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
  const r=el.getBoundingClientRect(); gx=sx-r.left; gy=sy-r.top;
  ghost=el.cloneNode(true); ghost.className='dcard ghost';
  ghost.style.width=r.width+'px'; ghost.style.left=r.left+'px'; ghost.style.top=r.top+'px';
  document.body.appendChild(ghost);
  el.classList.add('lifted');
  document.body.classList.add('dragging');
 },380);
 document.addEventListener('pointermove',onMove,{passive:false});
 document.addEventListener('pointerup',onUp);
 document.addEventListener('pointercancel',onUp);
 document.addEventListener('touchmove',stopScroll,{passive:false});
}
function applyDrop(pid,s,m,beforePid){
 const D=T().days[DAYI]; D.tag=D.tag||{};
 D.tag[pid]={s:s||'',m:m||''};
 const c=D.cands, i=c.indexOf(pid); if(i>=0)c.splice(i,1);
 let idx=c.length;
 if(beforePid){const bi=c.indexOf(beforePid); if(bi>=0)idx=bi}
 else{let last=-1;
  c.forEach(function(id,k){const tg=D.tag[id]||{}; if((tg.s||'')===(s||'')&&(tg.m||'')===(m||''))last=k});
  idx=last>=0?last+1:c.length}
 c.splice(idx,0,pid); save(); toast('옮겼습니다')}
Object.assign(window,{vDay,dayDragBind,applyDrop});

/* ══ 렌더 ══ */
const V={day:vDay,plan:vDay,today:vDay,place:vPlace,money:vMoney,prep:vPrep,
 __trips:vTripList,__new:vNew,__set:vSettings,__arch:vArchive};
function header(){
 const t=T();
 if(TAB==='__new')return{title:'새 여행',rt:'✕ 취소',act:'A.trips()'};
 if(TAB==='__set')return{title:'설정',rt:'✕ 닫기',act:'A.back()'};
 if(TAB==='__arch')return{title:'지난 여행 기록',rt:'✕ 닫기',act:'A.trips()'};
 if(TAB==='__trips')return{title:'내 여행',rt:t?'✕ 닫기':'⚙︎ 설정',act:t?'A.back()':'A.settings()'};
 const m={day:t?t.title:'하루',place:'장소',money:'지갑',prep:'가방'};
 const r={day:dday(t),place:REG?REG+' '+DB.filter(p=>p.r===REG).length+'곳':'',
  money:t?'1'+CS_(t.cur).n+'='+rateOf(t.cur).toFixed(2)+'원':'',prep:dday(t)};
 return{title:m[TAB]||'',rt:(r[TAB]?r[TAB]+' · ':'')+'내 여행',act:'A.trips()'}}
function render(){
 const app=document.getElementById('app'), t=T();
 if(!t&&['day','plan','today','money','prep'].indexOf(TAB)>=0)TAB='__trips';
 const H=header();
 const showTabs=['__new','__arch'].indexOf(TAB)<0;
 const prevMain=document.getElementById('main');
 const sc=prevMain?prevMain.scrollTop:0;
 const sb=(t&&t.share)?`<span class="syncdot" id="syncbadge">${esc(syncStatus())}</span>`:'';
 const showGear=['__set','__new','__arch'].indexOf(TAB)<0;
 app.innerHTML=`<header class="top"><h1>${esc(H.title)}${sb}</h1>
   <div class="hact">${showGear?'<div class="gear" onclick="A.settings()">⚙︎</div>':''}<div class="rt" onclick="${H.act}">${esc(H.rt)}</div></div></header>
  <main id="main" class="${showTabs?'':'notab'}">${(V[TAB]||vTripList)()}</main>
  ${showTabs?`<nav class="tabs">${TABS.map(x=>`<button class="${TAB===x[0]?'on':''}" onclick="A.go('${x[0]}')"><span class="ic">${x[1]}</span>${x[2]}</button>`).join('')}</nav>`:''}
  ${PF?vPFForm():''}${NAMEASK?vNameAsk():''}`;
 const m=document.getElementById('main');
 if(['day','place'].indexOf(TAB)>=0)m.scrollTop=sc;
 document.body.classList.toggle('editing',TAB==='day'&&!!EDIT);
 if(TAB==='day'){dayDragBind(); if(ADV)drawMap()}
 if(TAB==='money')calc();
}
window.render=render;

/* ══ 부팅 ══ */
let NAMEASK=0;
function pickName(n){setMe(n);NAMEASK=0;save();toast(n+' 님으로 설정했습니다');render()}
function askNameNow(){NAMEASK=1;render()}
function closeName(){NAMEASK=0;render()}
function pickNameOther(){const n=prompt('이름을 입력해주세요');if(n&&n.trim())pickName(n.trim())}
Object.assign(window,{pickName,askNameNow,closeName,pickNameOther});
function vNameAsk(){
 const t=T(); if(!t)return '';
 return '<div class="sheetbg"></div><div class="sheet">'+
  '<div class="shd">이 여행에서 나는 누구인가요?<span onclick="closeName()">나중에</span></div>'+
  '<div class="sbody">'+
   '<div class="hint" style="margin-bottom:12px">지출을 넣을 때 결제자로 쓰이고, 동행자 화면에 "누가 고쳤는지"로 표시됩니다.</div>'+
   t.members.map(m=>'<div class="namebtn" onclick="pickName(\''+esc(m.n)+'\')">'+esc(m.n)+'</div>').join('')+
   '<div class="fcancel" onclick="pickNameOther()">목록에 없어요 · 직접 입력</div>'+
  '</div></div>'}

function joinShared(sid){
 if(!window.FB){window.addEventListener('fb-ready',function(){joinShared(sid)},{once:true});return}
 const exist=S.trips.find(x=>x.share===sid);
 if(exist){S.active=exist.id;DAYI=0;TAB='day';startWatch();render();return}
 document.getElementById('app').innerHTML='<div class="loading">공유된 여행을 불러오는 중…</div>';
 window.FB.pull(sid).then(function(r){
  if(!r||!r.trip){document.getElementById('app').innerHTML='<div class="loading">링크가 잘못되었거나 삭제된 여행입니다</div>';return}
  const t=Object.assign({},r.trip,{id:uid(),share:sid});
  t.days=t.days||[];t.exp=t.exp||[];t.prep=t.prep||[];t.docs=t.docs||[];t.members=t.members||[{n:'나'}];
  S.trips.push(t);S.active=t.id;save();
  REG=t.region||REG;DAYI=0;TAB='day';
  if(!myName())NAMEASK=1;
  startWatch();toast('공유된 여행을 불러왔습니다');render();
 }).catch(function(e){document.getElementById('app').innerHTML='<div class="loading">불러오지 못했습니다 · '+e.message+'</div>'})}
window.joinShared=joinShared;

/* ══ 초대 코드로 불러오기 (홈 화면 앱에서 링크를 못 열 때) ══ */
function joinByCode(){
 const el=document.getElementById('joincode');
 var v=(el&&el.value||'').trim();
 if(!v){toast('초대 코드를 붙여넣어 주세요');return}
 var m=v.match(/[?&]t=([a-z0-9]+)/i); if(m)v=m[1];
 v=v.replace(/[^a-z0-9]/gi,'');
 if(v.length<16){toast('코드가 올바르지 않습니다');return}
 const exist=S.trips.find(function(x){return x.share===v});
 if(exist){S.active=exist.id;DAYI=0;TAB='day';save();startWatch();toast('이미 연결된 여행입니다');render();return}
 toast('불러오는 중…');
 joinShared(v);
}
function copyCode(){
 const t=T(); if(!t||!t.share)return;
 try{navigator.clipboard.writeText(t.share).then(function(){toast('초대 코드를 복사했습니다')},function(){prompt('초대 코드',t.share)})}
 catch(e){prompt('초대 코드',t.share)}}
Object.assign(window,{joinByCode,copyCode});


(function boot(){
 load(); loadFXCache();
 fetch('places.json?v=4').then(r=>r.json()).then(function(d){
  DB=d;
  const t=T();
  const regs=[...new Set(DB.map(p=>p.r))];
  if(t){
   REG=t.region||regs[0];
   const di=t.days.findIndex(x=>x.iso===todayIso());
   if(di>=0){DAYI=di;TDI=di}else{DAYI=0;TDI=0} TAB='day';
  }else{REG=regs[0];TAB='__trips'}
  const sid=new URLSearchParams(location.search).get('t');
  if(sid){joinShared(sid)}else{render(); if(t&&t.share){
   if(window.FB)startWatch(); else window.addEventListener('fb-ready',startWatch,{once:true})}}
  fetchFX(false).then(function(){if(!sid)render()});
 }).catch(function(){
  document.getElementById('app').innerHTML='<div class="loading">장소 데이터를 불러오지 못했습니다</div>';
 });
})();
