/* ══════ 여행 플래너 ══════ */
const RATE=9.4, W=n=>'₩'+Math.round(n).toLocaleString(), Y=n=>'¥'+Math.round(n).toLocaleString();
const CAT={eat:{n:'식사',c:'var(--eat)',i:'🍜'},cafe:{n:'카페',c:'var(--cafe)',i:'☕'},see:{n:'관광',c:'var(--see)',i:'🏯'},
 shop:{n:'쇼핑',c:'var(--shop)',i:'🛍'},stay:{n:'숙소',c:'var(--stay)',i:'🏨'},move:{n:'이동',c:'var(--move)',i:'✈️'}};
const t2m=s=>{const p=String(s).split(':').map(Number);return p[0]*60+(p[1]||0)};
const m2t=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.round(m)%60).padStart(2,'0');
const D2=m=>m>=60?(Math.floor(m/60)+'시간'+(m%60?' '+(m%60)+'분':'')):(m+'분');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut=(s,n)=>String(s||'').length>n?String(s).slice(0,n)+'…':String(s||'');
const uid=()=>Math.random().toString(36).slice(2,9);
let DB=[]; const P=id=>DB.find(x=>x.i===id);

function hav(a,b){const R=6371,r=x=>x*Math.PI/180;const dl=r(b[0]-a[0]),dg=r(b[1]-a[1]);
 return 2*R*Math.asin(Math.sqrt(Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dg/2)**2))}
function moveEst(f,t){if(!f||!t||!f.ll||!t.ll)return{min:15,mode:'이동',km:null};
 const km=hav(f.ll,t.ll)*1.3;
 return km<1.2?{min:Math.max(3,Math.round(km/0.075)),mode:'도보',km}:{min:Math.round(7+km/0.45),mode:km>12?'전철':'지하철',km}}

/* ══ 지난 여행 기록 (읽기 전용 · 앱 내장 · 초기화해도 남음) ══ */
const ARCHIVE=[{
 id:'nagoya-2026', title:'나고야 3박 4일', range:'2026. 4. 3 ~ 4. 6', days:4, places:26,
 spent:1802164, budget:2000000,
 cats:[['항공',636000],['쇼핑',612000],['음식',419120],['숙박',412000],['교통',98400],['관광',64600]],
 best:[['Unagi no Shiromura',5,'히츠마부시. 예약 필수'],['야바톤',5,'아카미소 된장돈까스. 소스는 사오자'],
  ['세카이노 야마짱',5,'테바사키. 사와서 숙소에서 먹는 게 좋다'],['토라카이소혼케',4,'오야코동 전문점'],
  ['카토 코히텐',4,'오구라토스트. 오픈런 필수'],['미라이타워',4,'야경 산책'],
  ['노리타케의 숲',4,'날 좋은 날 커피 한잔'],['미센',2,'꼭 가볼 맛은 아니다']]
}];

/* ══ 준비물 템플릿 ══ */
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
 S.trips.forEach(t=>{t.days=t.days||[];t.days.forEach(d=>{d.fixed=d.fixed||[];d.cands=d.cands||[];d.done=d.done||{}});
  t.exp=t.exp||[];t.prep=t.prep||[];t.docs=t.docs||[];t.members=t.members||[{n:'나'}]});
 try{localStorage.removeItem('travelplanner.v1')}catch(e){}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert('저장 공간이 부족합니다')}}
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
let TAB='__trips', DAYI=0, FILT='all', AREA='all', REG='', Q='', LIM=20, PICK=0, FIXFORM=0, mapObj=null, TOAST=null, TT=null;
const TABS=[['today','🧭','오늘'],['plan','📅','일정'],['place','📍','장소'],['money','💰','지갑'],['prep','🎒','가방']];
const NOWM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
function toast(t){TOAST=t;clearTimeout(TT);paintToast();TT=setTimeout(()=>{TOAST=null;paintToast()},1900)}
function paintToast(){let el=document.getElementById('toast');
 if(!TOAST){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
 el.textContent=TOAST}

/* ══ 액션 ══ */
const A={
 go:k=>{TAB=k;PICK=0;FIXFORM=0;render()},
 day:i=>{DAYI=i;PICK=0;FIXFORM=0;render()},
 pick:()=>{PICK=!PICK;FIXFORM=0;render()},
 fixform:()=>{FIXFORM=!FIXFORM;PICK=0;render()},
 filt:k=>{FILT=k;LIM=20;render()},
 area:k=>{AREA=k;LIM=20;render()},
 reg:k=>{REG=k;AREA='all';LIM=20;render()},
 more:()=>{LIM+=20;render()},
 q:v=>{Q=v;LIM=20;render();const el=document.getElementById('q');if(el){el.focus();el.setSelectionRange(v.length,v.length)}},
 clearq:()=>{Q='';LIM=20;render()},
 add:(di,pid)=>{const t=T();if(!t)return;const c=t.days[di].cands;
  if(!c.includes(pid)){c.push(pid);save();toast(P(pid).n+' → '+t.days[di].n)}render()},
 del:(di,pid)=>{const t=T();if(!t)return;const c=t.days[di].cands,i=c.indexOf(pid);
  if(i>-1){c.splice(i,1);save();toast('후보에서 뺐습니다')}render()},
 toggle:(pid,di)=>{const t=T();if(!t){alert('먼저 여행을 만들어주세요');return}
  t.days[di].cands.includes(pid)?A.del(di,pid):A.add(di,pid)},
 up:(di,i)=>{const c=T().days[di].cands;if(i>0){const x=c[i-1];c[i-1]=c[i];c[i]=x;save()}render()},
 dn:(di,i)=>{const c=T().days[di].cands;if(i<c.length-1){const x=c[i+1];c[i+1]=c[i];c[i]=x;save()}render()},
 visit:(di,pid)=>{const d=T().days[di];d.done[pid]?delete d.done[pid]:d.done[pid]=m2t(NOWM());save();render()},
 chk:(gi,ii)=>{const it=T().prep[gi].items[ii];it.v=it.v?0:1;save();render()},
 open:id=>{S.active=id;DAYI=0;const t=T();REG=t.region||REG;save();
  const di=t.days.findIndex(d=>d.iso===todayIso());
  if(di>=0){DAYI=di;TAB='today'}else{TAB='plan'} render()},
 newtrip:()=>{TAB='__new';render()},
 settings:()=>{TAB='__set';render()},
 archive:id=>{window.__arch=id;TAB='__arch';render()},
 back:()=>{TAB=S.active?'plan':'__trips';render()},
 trips:()=>{TAB='__trips';render()}
};
window.A=A;

/* ══ 여행 만들기 ══ */
function createTrip(){
 const g=id=>document.getElementById(id);
 const title=g('f_title').value.trim(), region=g('f_region').value,
  start=g('f_start').value, end=g('f_end').value,
  mem=g('f_mem').value.trim(), budget=parseInt(String(g('f_budget').value).replace(/[^\d]/g,''))||0;
 if(!title)return alert('여행 이름을 입력해주세요');
 if(!start||!end)return alert('출발일과 도착일을 입력해주세요');
 if(new Date(end)<new Date(start))return alert('도착일이 출발일보다 빠릅니다');
 const days=mkDays(start,end);
 if(days.length>21)return alert('최대 21일까지 지원합니다');
 const members=(mem?mem.split(/[,·\/\s]+/).filter(Boolean):['나']).map(n=>({n}));
 const t={id:uid(),title,region,start,end,members,budget,days,exp:[],docs:[],
  prep:PREP_TPL.map(x=>({g:x.g,items:x.items.map(i=>({t:i.t,s:i.s,v:0}))}))};
 S.trips.push(t);S.active=t.id;DAYI=0;REG=region||REG;TAB='plan';save();
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
 load();TAB='__trips';DAYI=0;toast('초기화했습니다');render()}
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
 d.fixed=d.fixed.filter(x=>x.id!==fid);save();render()}
Object.assign(window,{addFixed,delFixed});

/* ══ 지출 · 준비물 · 서류 ══ */
function addExp(){const t=T();if(!t)return;
 const nm=prompt('지출 항목 (예: 점심 라멘)');if(!nm)return;
 const amt=prompt('금액 — 현지 통화면 숫자만, 원화면 뒤에 W\n(예: 1800  또는  25000W)');if(!amt)return;
 const isW=/w/i.test(amt), n=parseFloat(String(amt).replace(/[^\d.]/g,''));if(!n)return;
 const who=t.members.length>1?(prompt('결제자 ('+t.members.map(m=>m.n).join(' / ')+')',t.members[0].n)||t.members[0].n):t.members[0].n;
 const cat=prompt('분류 (음식/교통/쇼핑/관광/숙박/항공/기타)','음식')||'기타';
 const pay=confirm('카드로 결제했나요?\n확인 = 카드 / 취소 = 현금')?'카드':'현금';
 t.exp.push(isW?{id:uid(),nm,krw:n,who,cat,pay}:{id:uid(),nm,jpy:n,who,cat,pay});
 save();toast('지출 추가됨');render()}
function delExp(id){const t=T();if(!confirm('이 지출을 삭제할까요?'))return;
 t.exp=t.exp.filter(e=>e.id!==id);save();render()}
function addPrep(gi){const t=T();const v=prompt('추가할 항목');if(!v)return;
 t.prep[gi].items.push({t:v,s:'',v:0});save();render()}
function addDoc(){const t=T();const n=prompt('서류 이름 (예: 진에어 e-티켓)');if(!n)return;
 const s=prompt('메모 — 예약번호 등')||'';t.docs.push({id:uid(),i:'📄',n,s});save();render()}
Object.assign(window,{addExp,delExp,addPrep,addDoc});

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
    <div class="r"><span class="mut">고정 ${nF}건 · 후보 ${nC}곳</span><b>${t.budget?W(t.budget):'예산 미설정'}</b></div>
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
  <div class="row">${Object.entries(rc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span>${esc(k)} ${v}</span>`).join('')}</div></div>
 <div class="setlink" onclick="A.settings()">⚙︎ 설정 · 초기화</div>
 <div style="height:20px"></div>`;
}

function vNew(){
 const regs=[...new Set(DB.map(p=>p.r))].sort((a,b)=>DB.filter(p=>p.r===b).length-DB.filter(p=>p.r===a).length);
 const d=new Date(); const t0=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
 return `<div class="form">
  <div class="fld"><label>여행 이름</label><input id="f_title" placeholder="예: 후쿠오카 3박 4일" autocomplete="off"></div>
  <div class="fld"><label>어디로 가나요</label>
   <select id="f_region">${regs.map(r=>`<option value="${esc(r)}">${esc(r)} · 장소 ${DB.filter(p=>p.r===r).length}곳</option>`).join('')}
    <option value="">그 외 (장소 DB 없이 직접)</option></select>
   <div class="hint">고른 도시의 장소 목록이 후보 풀이 됩니다</div></div>
  <div class="frow">
   <div class="fld"><label>출발</label><input id="f_start" type="date" value="${t0}"></div>
   <div class="fld"><label>도착</label><input id="f_end" type="date" value="${t0}"></div></div>
  <div class="fld"><label>함께 가는 사람</label><input id="f_mem" placeholder="이름을 쉼표로 구분 · 비우면 혼자" autocomplete="off">
   <div class="hint">지출 정산에 쓰입니다</div></div>
  <div class="fld"><label>총 예산 (원)</label><input id="f_budget" type="number" inputmode="numeric" placeholder="비워도 됩니다">
   <div class="hint">넣으면 하루 쓸 수 있는 금액이 자동 계산됩니다</div></div>
  <div class="fbtn" onclick="createTrip()">여행 만들기</div>
  <div class="fcancel" onclick="A.trips()">취소</div>
  <div class="fnote"><b>만든 다음 순서</b><br>
   ① <b>일정</b> 탭에서 항공·숙소·예약처럼 시간이 정해진 것을 넣습니다<br>
   ② <b>장소</b> 탭에서 가고 싶은 곳을 날짜에 담습니다<br>
   ③ 앱이 빈 시간을 계산해 그 안에 갈 수 있는 곳을 알려줍니다</div>
 </div>`;
}

function vSettings(){
 const t=T();
 return `${t?`<div class="sec">이 여행</div>
  <div class="card mrow">
   <div class="srow"><span>이름</span><b>${esc(t.title)}</b></div>
   <div class="srow"><span>기간</span><b>${t.start} ~ ${t.end} (${t.days.length}일)</b></div>
   <div class="srow"><span>지역</span><b>${esc(t.region||'미지정')}</b></div>
   <div class="srow"><span>인원</span><b>${t.members.map(m=>esc(m.n)).join(', ')}</b></div>
   <div class="srow"><span>예산</span><b>${t.budget?W(t.budget):'미설정'}</b></div>
  </div>
  <div class="dbtn warn" onclick="resetTrip('${t.id}')">이 여행 내용만 비우기
   <em>날짜·인원·예산은 두고 고정 일정·후보·지출·체크만 초기화</em></div>
  <div class="dbtn danger" onclick="delTrip('${t.id}')">이 여행 삭제
   <em>이 여행에 넣은 모든 내용이 사라집니다</em></div>`:'<div class="sec">여행</div><div class="card mrow"><div class="gnone" style="margin:0">선택된 여행이 없습니다</div></div>'}
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
 const FX=D.fixed.slice().sort((x,y)=>t2m(x.s)-t2m(y.s));
 let body='';
 if(!FX.length&&!cands.length){
  body='<div class="empty">아직 아무것도 없습니다<br><span class="es">항공·숙소·예약처럼 <b>시간이 정해진 것</b>부터 넣어보세요</span></div>';
 }else{
  G.forEach((g,gi)=>{
   const ok=rest.filter(p=>fitsIn(p,g)), no=rest.filter(p=>!fitsIn(p,g));
   body+=`<div class="gap"><div class="t"><b>빈 시간 ${m2t(g.f)} ~ ${m2t(g.t)}</b><span>${D2(g.t-g.f)}</span></div>
    ${rest.length?`<div class="fit">${ok.slice(0,3).map(p=>`<span>${CAT[p.c].i} ${esc(cut(p.n,11))}</span>`).join('')}
     ${no.slice(0,1).map(p=>`<span class="no">${esc(cut(p.n,11))}</span>`).join('')}</div>
    <div class="okline">담아둔 후보 ${ok.length}곳이 이 시간에 들어갑니다</div>`
    :'<div class="gnone">담아둔 후보가 없습니다</div>'}</div>`;
   const a=FX[gi];
   if(a){const c=CAT[a.cat]||CAT.see;
    body+=`<div class="anch"><div class="tm"><b>${a.s}</b><em>${m2t(t2m(a.s)+a.dur)}</em></div>
     <div style="flex:1"><div class="nm">${c.i} ${esc(a.nm)}</div>${a.why?`<div class="sb">${esc(a.why)}</div>`:''}</div>
     <div class="rm" onclick="delFixed('${a.id}')">✕</div></div>`}
  });
  FX.slice(G.length).forEach(a=>{const c=CAT[a.cat]||CAT.see;
   body+=`<div class="anch"><div class="tm"><b>${a.s}</b><em>${m2t(t2m(a.s)+a.dur)}</em></div>
    <div style="flex:1"><div class="nm">${c.i} ${esc(a.nm)}</div>${a.why?`<div class="sb">${esc(a.why)}</div>`:''}</div>
    <div class="rm" onclick="delFixed('${a.id}')">✕</div></div>`});
 }
 const pool=DB.filter(p=>p.r===t.region&&D.cands.indexOf(p.i)<0)
  .sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0)).slice(0,12);
 const picker=PICK?`<div class="picker"><div class="ph">${D.n} 후보로 담기 · 평점순<span onclick="A.pick()">닫기 ✕</span></div>
  ${pool.length?pool.map(p=>{const c=CAT[p.c];const other=t.days.map((d,i)=>d.cands.indexOf(p.i)>=0?i:-1).filter(i=>i>=0);
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
  <div class="sumbar"><div><div class="k">고정</div><div class="v">${D.fixed.length}건</div></div>
   <div><div class="k">후보</div><div class="v">${cands.length}곳</div></div>
   <div><div class="k">빈 시간</div><div class="v">${D2(FREE)}</div></div></div>
  ${cands.filter(p=>p.ll).length?'<div class="mapbox"><div id="map"></div></div>':''}
  <div class="grouphd"><span class="l">시간이 정해진 것</span><span class="r">예약 · 티켓 · 교통</span></div>
  ${body}
  <div class="addbtn dark" onclick="A.fixform()">${FIXFORM?'✕ 닫기':'＋ 고정 일정 추가'}</div>${fixform}
  <div class="grouphd"><span class="l">${D.n} 후보</span><span class="r">${rest.length?'소요 '+D2(NEED)+' / 빈 '+D2(FREE):'비어 있음'}</span></div>
  ${cands.length?chain.map((x,i)=>{const p=x.p,c=CAT[p.c],dn=done[p.i];
   return `${i>0?`<div class="mvline"><span>${x.mv.mode==='도보'?'🚶':'🚃'} ${x.mv.mode} 약 ${x.mv.min}분${x.mv.km!=null?' · '+x.mv.km.toFixed(1)+'km':''} <em>추정</em></span></div>`:''}
   <div class="cand ${dn?'dn':''}">
    <div class="ord"><span onclick="A.up(${DAYI},${i})">▲</span><b>${i+1}</b><span onclick="A.dn(${DAYI},${i})">▼</span></div>
    <div style="flex:1" onclick="A.visit(${DAYI},'${p.i}')"><div class="nm">${c.i} ${esc(p.n)}</div>
     <div class="meta"><span>약 ${D2(p.du)}</span>${p.rt?`<span>★ ${p.rt}</span>`:''}${p.g?`<span>${esc(p.g)}</span>`:''}${dn?`<span style="color:var(--acc2);font-weight:800">✓ ${dn} 방문</span>`:''}</div>
     ${p.m?`<div class="memo mine">📝 ${esc(p.m)}</div>`:(p.d?`<div class="memo">${esc(cut(p.d,64))}</div>`:'')}</div>
    <div class="rm" onclick="A.del(${DAYI},'${p.i}')">✕</div></div>`}).join('')
   :'<div class="empty">아직 담은 후보가 없습니다<br><span class="es">아래 버튼이나 <b>장소</b> 탭에서 담아보세요</span></div>'}
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
function vPlace(){
 const t=T();
 const inTrip=p=>!!(t&&t.days.some(d=>d.cands.indexOf(p.i)>=0));
 let L2=DB.filter(p=>p.r===REG);
 const areas=[...new Set(L2.map(p=>p.a).filter(Boolean))];
 if(AREA!=='all')L2=L2.filter(p=>p.a===AREA);
 if(FILT==='un')L2=L2.filter(p=>!inTrip(p)); else if(FILT!=='all')L2=L2.filter(p=>p.c===FILT);
 if(Q){const q=Q.toLowerCase();L2=L2.filter(p=>(p.n+p.j+p.g+p.d+p.m).toLowerCase().indexOf(q)>=0)}
 L2=L2.slice().sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0));
 const R=DB.filter(p=>p.r===REG);
 const F=[['all','전체',R.length],['un','미배정',R.filter(p=>!inTrip(p)).length],
  ['eat','🍜 식사',R.filter(p=>p.c==='eat').length],['cafe','☕ 카페',R.filter(p=>p.c==='cafe').length],
  ['see','🏯 관광',R.filter(p=>p.c==='see').length],['shop','🛍 쇼핑',R.filter(p=>p.c==='shop').length],
  ['stay','🏨 숙소',R.filter(p=>p.c==='stay').length]].filter(x=>x[2]>0);
 const regs=[...new Set(DB.map(p=>p.r))].sort((a,b)=>DB.filter(p=>p.r===b).length-DB.filter(p=>p.r===a).length);
 return `<div class="hstack">${regs.map(r=>`<span class="rg ${REG===r?'on':''}" onclick="A.reg('${r}')">${esc(r)} ${DB.filter(p=>p.r===r).length}</span>`).join('')}</div>
 <div class="srchbox"><input id="q" value="${esc(Q)}" placeholder="이름 · 메뉴 · 설명 검색" oninput="A.q(this.value)" autocomplete="off">
  ${Q?'<span class="clr" onclick="A.clearq()">✕</span>':''}</div>
 <div class="hstack">${F.map(f=>`<span class="f ${FILT===f[0]?'on':''}" onclick="A.filt('${f[0]}')">${f[1]} ${f[2]}</span>`).join('')}</div>
 ${areas.length>1?`<div class="hstack">${['all'].concat(areas).map(a=>`<span class="f sm ${AREA===a?'on':''}" onclick="A.area('${String(a).replace(/'/g,'')}')">${a==='all'?'전 지역':esc(a)}</span>`).join('')}</div>`:''}
 <div class="cnt">${L2.length}곳${Q?' · "'+esc(Q)+'"':''}${!t?' · 담으려면 여행을 먼저 만드세요':''}</div>
 ${L2.slice(0,LIM).map(p=>{const c=CAT[p.c];const ds=t?t.days.map((d,i)=>d.cands.indexOf(p.i)>=0?i:-1).filter(i=>i>=0):[];
  return `<div class="pl">
   <div class="r1"><span class="chip" style="background:${c.c}18;color:${c.c}">${c.i}</span><span class="nm">${esc(p.n)}</span></div>
   <div class="info">${p.rt?`<span>★ ${p.rt} (${(p.rv||0).toLocaleString()})</span>`:'<span class="d">평점 없음</span>'}
    ${p.g?`<span>${esc(p.g)}</span>`:''}${p.pr?`<span>${esc(p.pr)}</span>`:''}<span>약 ${D2(p.du)}</span>${p.ll?'':'<span class="d">좌표 없음</span>'}</div>
   ${p.m?`<div class="memo mine">📝 ${esc(p.m)}</div>`:''}
   ${p.d?`<div class="memo">${esc(cut(p.d,100))}</div>`:''}
   <div class="daypick">${t?t.days.map((d,i)=>`<span class="dp ${ds.indexOf(i)>=0?'on':''}" onclick="A.toggle('${p.i}',${i})">${i+1}일</span>`).join(''):'<span class="dphint">여행을 만들면 날짜에 담을 수 있습니다</span>'}
    <a class="glink" href="${esc(p.u)}" target="_blank" rel="noopener">지도 ↗</a>${p.v?`<a class="glink" href="${esc(p.v)}" target="_blank" rel="noopener">영상</a>`:''}</div>
  </div>`}).join('')}
 ${L2.length>LIM?`<div class="more" onclick="A.more()">＋ 더 보기 (${LIM}/${L2.length})</div>`:'<div style="height:14px"></div>'}`;
}

/* ══ 오늘 ══ */
function vToday(){
 const t=T(); if(!t)return vTripList();
 const now=NOWM();
 let di=t.days.findIndex(d=>d.iso===todayIso()); if(di<0)di=DAYI;
 const D=t.days[di]||t.days[0], done=D.done;
 const nextA=D.fixed.map(a=>({s:a.s,nm:a.nm,st:t2m(a.s)})).filter(a=>a.st>now).sort((x,y)=>x.st-y.st)[0];
 const win=nextA?nextA.st-now:Math.max(0,t2m(DAY_END)-now);
 const firstLL=D.cands.map(P).find(p=>p&&p.ll);
 const cur={ll:firstLL?firstLL.ll:null};
 const opts=D.cands.map(P).filter(p=>p&&!done[p.i]).map(p=>{const mv=moveEst(cur,p),need=mv.min+p.du;
   return Object.assign({},p,{mv:mv,need:need,end:now+need,slack:win-need})}).filter(o=>o.slack>=0).sort((a,b)=>a.slack-b.slack);
 const vis=Object.keys(done).map(id=>({tm:done[id],nm:(P(id)||{n:'-'}).n})).sort((a,b)=>a.tm.localeCompare(b.tm));
 const SP=t.exp.reduce((a,e)=>a+((e.krw||0)+(e.jpy||0)*RATE),0);
 const left=Math.max(1,t.days.length-di);
 return `<div class="tmode"><div class="lb">${D.n} / ${t.days.length}일 · ${dday(t)}</div>
  <h2>지금 ${m2t(now)}</h2>
  <div class="mt">${D.d} (${D.wd}) · ${esc(t.region||t.title)}</div>
  <div class="kpis"><div><div class="k">오늘 다닌 곳</div><div class="v">${vis.length}곳</div></div>
   <div><div class="k">오늘 후보</div><div class="v">${D.cands.length}곳</div></div>
   <div><div class="k">하루 예산</div><div class="v">${t.budget?W((t.budget-SP)/left):'—'}</div></div></div></div>
 ${nextA?`<div class="anchornext"><div class="k">다음 고정 일정</div>
  <div class="v">${nextA.s} ${esc(nextA.nm)}</div><div class="s">${D2(win)} 남음 — 그때까지는 자유롭게</div></div>`
  :`<div class="anchornext"><div class="k">남은 고정 일정</div><div class="v">없음</div>
  <div class="s">${D2(win)} 남음 — 전부 자유 시간입니다</div></div>`}
 <div class="nowhd"><span>지금 갈 수 있는 곳</span><em>${opts.length}곳</em></div>
 ${opts.length?opts.slice(0,4).map((o,i)=>{const c=CAT[o.c];return `<div class="opt ${i===0?'best':''}">
   ${i===0?'<div class="tag">시간 딱 맞음</div>':''}
   <div class="nm">${c.i} ${esc(o.n)}</div>
   <div class="meta">${o.rt?`<span>★ ${o.rt}</span>`:''}${o.mv.km!=null?`<span>${o.mv.mode} ${o.mv.min}분</span>`:''}<span>약 ${D2(o.du)}</span>${o.g?`<span>${esc(o.g)}</span>`:''}</div>
   <span class="calc">지금 출발하면 <b>${m2t(o.end)}</b>에 끝납니다${nextA?' · 다음 일정까지 <b>'+D2(o.slack)+'</b> 여유':''}</span>
   <div class="row"><button class="p" onclick="A.visit(${di},'${o.i}')">여기로 간다</button>
    <a class="glink" style="flex:1;justify-content:center" href="${esc(o.u)}" target="_blank" rel="noopener">길찾기</a></div></div>`}).join('')
  :'<div class="empty">일정 탭에서 오늘 후보를 담아주세요</div>'}
 <div class="sec">오늘 지나온 곳</div>
 <div class="card mrow" style="margin-bottom:20px">
  ${vis.length?vis.map(d=>`<div class="tr"><span class="tm">${d.tm}</span><span class="nm">${esc(d.nm)}</span><span class="ok">✓ 방문</span></div>`).join('')
   :'<div class="gnone" style="margin:0">아직 없습니다. 일정 탭에서 후보를 눌러 방문 체크하세요.</div>'}</div>`;
}

/* ══ 지갑 ══ */
const eK=e=>(e.krw||0)+(e.jpy||0)*RATE;
function vMoney(){
 const t=T(); if(!t)return vTripList();
 const SP=t.exp.reduce((a,e)=>a+eK(e),0), BG=t.budget||0, RM=BG-SP;
 const pct=BG?Math.min(100,SP/BG*100):0;
 let di=t.days.findIndex(d=>d.iso===todayIso()); if(di<0)di=0;
 const left=Math.max(1,t.days.length-di);
 const cs={};t.exp.forEach(e=>cs[e.cat]=(cs[e.cat]||0)+eK(e));
 const rows=Object.keys(cs).map(k=>[k,cs[k]]).sort((a,b)=>b[1]-a[1]);
 const mx=rows.length?rows[0][1]:1;
 const CC={항공:'#3A6EA5',숙박:'#B08834',음식:'#D9542B',교통:'#98918A',관광:'#0E6B5E',쇼핑:'#6B4FA8',기타:'#98918A'};
 const paid={};t.members.forEach(m=>paid[m.n]=0);t.exp.forEach(e=>paid[e.who]=(paid[e.who]||0)+eK(e));
 const fair=SP/t.members.length;
 const ord=t.members.map(m=>({n:m.n,d:(paid[m.n]||0)-fair})).sort((a,b)=>a.d-b.d);
 const cash=t.exp.filter(e=>e.pay==='현금').reduce((a,e)=>a+eK(e),0);
 return `<div class="card mh">${BG?`<div class="lb">남은 예산</div><div class="big">${W(RM)}</div>
   <div class="bar"><i style="width:${pct}%;background:${RM<0?'var(--warn)':'var(--acc)'}"></i></div>
   <div class="sp"><span>사용 ${W(SP)} · ${Math.round(pct)}%</span><span>총 ${W(BG)}</span></div>
   <div class="gauge"><div class="k">남은 ${left}일 · 하루 가능 금액</div><div class="v">${W(RM/left)}</div>
    <div class="n">현금 ${W(cash)} · 카드 ${W(SP-cash)}</div></div>`
  :`<div class="lb">쓴 돈</div><div class="big">${W(SP)}</div>
   <div class="gauge"><div class="k">예산이 설정되지 않았습니다</div>
    <div class="n">설정에서 예산을 넣으면 잔액과 하루 가능 금액이 계산됩니다</div></div>`}</div>
 ${rows.length?`<div class="sec">분류별</div><div class="card mrow">${rows.map(r=>`<div class="it">
  <div class="l"><span>${esc(r[0])}</span><em>${W(r[1])}</em></div>
  <div class="mini"><i style="width:${r[1]/mx*100}%;background:${CC[r[0]]||'#98918A'}"></i></div></div>`).join('')}</div>`:''}
 ${t.members.length>1&&SP>0?`<div class="sec">정산</div>
 <div class="card mrow settle"><div style="font-size:12px;font-weight:700;opacity:.85">지금까지 기준</div>
  <div class="res">${Math.abs(ord[0].d)<1?'정산 없음':esc(ord[0].n)+' → '+esc(ord[ord.length-1].n)+' '+W(Math.abs(ord[0].d))}</div>
  <div class="dt">${t.members.map(m=>esc(m.n)+' 결제 '+W(paid[m.n]||0)).join(' · ')}<br>1/N 기준 1인 ${W(fair)}</div></div>`:''}
 <div class="sec">환율 계산기</div>
 <div class="card mrow"><div class="calcrow">
  <input id="jpy" type="number" inputmode="numeric" value="5000" oninput="calc()">
  <span style="font-size:14px;font-weight:800;color:var(--sub)">엔 =</span>
  <div id="krw" style="font-size:19px;font-weight:800;letter-spacing:-.02em"></div></div>
  <div class="cmp" id="cmp"></div></div>
 <div class="sec">지출 내역<span class="secr">${t.exp.length}건</span></div>
 <div class="card mrow" style="margin-bottom:96px">${t.exp.length?t.exp.slice().reverse().map(e=>`<div class="exp">
  <span style="flex:1">${esc(e.nm)}<span class="who">${esc(e.who)}</span><span class="pay" style="background:${e.pay==='현금'?'#FBF4E6':'#EDF2F7'};color:${e.pay==='현금'?'#8A6A22':'#3A6EA5'}">${e.pay}</span></span>
  <b>${e.jpy?Y(e.jpy):W(e.krw)}</b><span class="rm sm" onclick="delExp('${e.id}')">✕</span></div>`).join('')
  :'<div class="gnone" style="margin:0">아직 없습니다. 우하단 ＋ 로 추가하세요.</div>'}</div>
 <button class="fab" onclick="addExp()">＋</button>`;
}
function calc(){const el=document.getElementById('jpy');if(!el)return;
 const j=+(el.value||0),base=j*RATE;
 document.getElementById('krw').textContent=W(base);
 const cards=[['트래블월렛',0],['토스 체크',.03],['일반 신용카드',.043],['공항 환전',.055]];
 const mn=Math.min.apply(null,cards.map(c=>base*(1+c[1])));
 document.getElementById('cmp').innerHTML=cards.map(c=>{const v=base*(1+c[1]);
  return `<div class="c ${v===mn?'best':''}"><span>${c[0]}${c[1]?' (+'+(c[1]*100).toFixed(1)+'%)':' (수수료 0)'}</span><b>${W(v)}</b></div>`}).join('')}
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
   <div class="ci" onclick="A.chk(${gi},${ii})"><div class="box ${it.v?'on':''}">${it.v?'✓':''}</div>
   <div><div class="tx ${it.v?'done':''}">${esc(it.t)}</div>${it.s?`<div class="sb">${esc(it.s)}</div>`:''}</div></div>`).join('')
   :'<div class="gnone" style="margin:0">비어 있습니다. 우측 ＋ 로 추가하세요.</div>'}</div>`).join('')}
 <div class="sec">예약 · 서류 보관함<span class="secr" onclick="addDoc()">＋ 추가</span></div>
 <div class="card doc" style="margin-bottom:20px">${t.docs.length?t.docs.map(d=>`<div class="di"><div class="ic">${d.i}</div>
  <div style="flex:1"><div class="nm">${esc(d.n)}</div><div class="sb">${esc(d.s)}</div></div><div class="of">오프라인</div></div>`).join('')
  :'<div class="gnone" style="margin:0">예약번호·바우처를 적어두면 비행기 모드에서도 열립니다.</div>'}</div>`;
}

/* ══ 렌더 ══ */
const V={plan:vPlan,place:vPlace,today:vToday,money:vMoney,prep:vPrep,
 __trips:vTripList,__new:vNew,__set:vSettings,__arch:vArchive};
function header(){
 const t=T();
 if(TAB==='__new')return{title:'새 여행',rt:'✕ 취소',act:'A.trips()'};
 if(TAB==='__set')return{title:'설정',rt:'✕ 닫기',act:'A.back()'};
 if(TAB==='__arch')return{title:'지난 여행 기록',rt:'✕ 닫기',act:'A.trips()'};
 if(TAB==='__trips')return{title:'내 여행',rt:t?'✕ 닫기':'⚙︎ 설정',act:t?'A.back()':'A.settings()'};
 const m={plan:t?t.title:'일정',place:'장소',today:'오늘',money:'지갑',prep:'가방'};
 const r={plan:dday(t),place:REG?REG+' '+DB.filter(p=>p.r===REG).length+'곳':'',today:'',money:'환율 9.4원/엔',prep:dday(t)};
 return{title:m[TAB]||'',rt:(r[TAB]?r[TAB]+' · ':'')+'내 여행',act:'A.trips()'}}
function render(){
 const app=document.getElementById('app'), t=T();
 if(!t&&['plan','today','money','prep'].indexOf(TAB)>=0)TAB='__trips';
 const H=header();
 const showTabs=['__new','__arch'].indexOf(TAB)<0;
 const prevMain=document.getElementById('main');
 const sc=prevMain?prevMain.scrollTop:0;
 app.innerHTML=`<header class="top"><h1>${esc(H.title)}</h1>
   <div class="rt" onclick="${H.act}">${esc(H.rt)}</div></header>
  <main id="main" class="${showTabs?'':'notab'}">${(V[TAB]||vTripList)()}</main>
  ${showTabs?`<nav class="tabs">${TABS.map(x=>`<button class="${TAB===x[0]?'on':''}" onclick="A.go('${x[0]}')"><span class="ic">${x[1]}</span>${x[2]}</button>`).join('')}</nav>`:''}`;
 const m=document.getElementById('main');
 if(['plan','place'].indexOf(TAB)>=0)m.scrollTop=sc;
 if(TAB==='plan')drawMap();
 if(TAB==='money')calc();
}
window.render=render;

/* ══ 부팅 ══ */
(function boot(){
 load();
 fetch('places.json?v=2').then(r=>r.json()).then(function(d){
  DB=d;
  const t=T();
  const regs=[...new Set(DB.map(p=>p.r))];
  if(t){
   REG=t.region||regs[0];
   const di=t.days.findIndex(x=>x.iso===todayIso());
   if(di>=0){DAYI=di;TAB='today'}else{DAYI=0;TAB='plan'}
  }else{REG=regs[0];TAB='__trips'}
  render();
 }).catch(function(){
  document.getElementById('app').innerHTML='<div class="loading">장소 데이터를 불러오지 못했습니다</div>';
 });
})();
