/* ══════ 여행 플래너 ══════ */
const RATE=9.4, W=n=>'₩'+Math.round(n).toLocaleString(), Y=n=>'¥'+Math.round(n).toLocaleString();
const CAT={eat:{n:'식사',c:'var(--eat)',i:'🍜'},cafe:{n:'카페',c:'var(--cafe)',i:'☕'},see:{n:'관광',c:'var(--see)',i:'🏯'},
 shop:{n:'쇼핑',c:'var(--shop)',i:'🛍'},stay:{n:'숙소',c:'var(--stay)',i:'🏨'},move:{n:'이동',c:'var(--move)',i:'✈️'}};
const t2m=s=>{const[a,b]=s.split(':').map(Number);return a*60+b};
const m2t=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const D2=m=>m>=60?(Math.floor(m/60)+'시간'+(m%60?' '+(m%60)+'분':'')):(m+'분');
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let DB=[], P=id=>DB.find(x=>x.i===id);

/* 이동시간 추정 (좌표 기반) */
function hav(a,b){const R=6371,r=x=>x*Math.PI/180;const dl=r(b[0]-a[0]),dg=r(b[1]-a[1]);
 return 2*R*Math.asin(Math.sqrt(Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dg/2)**2))}
function moveEst(f,t){if(!f||!t||!f.ll||!t.ll)return{min:15,mode:'이동',km:null};
 const km=hav(f.ll,t.ll)*1.3;
 return km<1.2?{min:Math.max(3,Math.round(km/0.075)),mode:'도보',km}:{min:Math.round(7+km/0.45),mode:km>12?'전철':'지하철',km}}

/* ══ 저장 ══ */
const KEY='travelplanner.v1';
const DEF={
 trip:{title:'후쿠오카 3박 4일',range:'2026. 10. 8 ~ 10. 11',budget:1800000,region:'후쿠오카',
  members:[{n:'장민희',b:1000000},{n:'장민영',b:800000}],base:[33.5902,130.4017],start:'2026-10-08'},
 days:[
  {n:'1일차',d:'10/8',fixed:[{s:'08:45',dur:80,cat:'move',nm:'진에어 LJ221',why:'인천 → 후쿠오카'},
    {s:'11:00',dur:35,cat:'move',nm:'지하철 공항선',why:'공항 → 하카타'},
    {s:'15:00',dur:30,cat:'stay',nm:'호텔 체크인',why:'하카타역 인근'}],cands:[],done:{}},
  {n:'2일차',d:'10/9',fixed:[],cands:[],done:{}},
  {n:'3일차',d:'10/10',fixed:[],cands:[],done:{}},
  {n:'4일차',d:'10/11',fixed:[{s:'10:00',dur:30,cat:'stay',nm:'호텔 체크아웃',why:''},
    {s:'13:40',dur:80,cat:'move',nm:'진에어 LJ222',why:'후쿠오카 → 인천'}],cands:[],done:{}}],
 exp:[{nm:'진에어 왕복',krw:412000,who:'장민희',cat:'항공',pay:'카드'},
  {nm:'호텔 3박',krw:336000,who:'장민희',cat:'숙박',pay:'카드'}],
 prep:[{g:'예약 · 서류',items:[{t:'항공권',s:'진에어 · 발권 완료',v:1},{t:'숙소',s:'하카타 3박 · 확정',v:1},
   {t:'트래블월렛 충전',s:'',v:0},{t:'e심',s:'',v:0},{t:'식당 예약',s:'',v:0}]},
  {g:'짐싸기',items:[{t:'여권',s:'',v:0},{t:'보조 배터리',s:'절연테이프 필수',v:0},{t:'충전기 · 어댑터',s:'돼지코',v:0},
   {t:'상비약',s:'타이레놀, 소화제',v:0},{t:'옷 · 속옷',s:'',v:0},{t:'동전 지갑',s:'',v:0}]},
  {g:'현지 구매 목록',items:[{t:'멘타이코',s:'',v:0},{t:'돈키 면세',s:'',v:0}]}],
 docs:[{i:'✈️',n:'진에어 e-티켓',s:'LJ221 · 예약번호 K3M8PQ'},{i:'🏨',n:'호텔 바우처',s:'하카타 · 3박'},{i:'🪪',n:'여권 사본',s:'2인'}]
};
const PAST={title:'나고야 3박 4일',range:'2026. 4. 3 ~ 4. 6',spent:1802164,budget:2000000,places:26,days:4,
 cats:[['쇼핑',612000],['음식',419120],['항공',636000],['숙박',412000],['교통',98400],['관광',64600]],
 best:[['Unagi no Shiromura',5],['야바톤',5],['세카이노 야마짱',5],['카토 코히텐',4],['미라이타워',4],['미센',2]]};

let S=null;
function load(){try{const r=localStorage.getItem(KEY);S=r?JSON.parse(r):JSON.parse(JSON.stringify(DEF))}
 catch(e){S=JSON.parse(JSON.stringify(DEF))}
 S.days.forEach(d=>{d.done=d.done||{};d.cands=d.cands||[];d.fixed=d.fixed||[]})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ══ 상태 ══ */
let TAB='plan', DAYI=0, FILT='all', AREA='all', REG='후쿠오카', Q='', LIM=20, PICK=0, mapObj=null, TOAST=null, TT=null;
const TABS=[['today','🧭','오늘'],['plan','📅','일정'],['place','📍','장소'],['money','💰','지갑'],['prep','🎒','가방']];
const NOW=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};

function toast(t){TOAST=t;clearTimeout(TT);paintToast();TT=setTimeout(()=>{TOAST=null;paintToast()},1900)}
function paintToast(){let el=document.getElementById('toast');
 if(!TOAST){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
 el.textContent=TOAST}

/* ══ 액션 ══ */
const A={
 go:k=>{TAB=k;PICK=0;render()},
 day:i=>{DAYI=i;PICK=0;render()},
 pick:()=>{PICK=!PICK;render()},
 filt:k=>{FILT=k;LIM=20;render()},
 area:k=>{AREA=k;LIM=20;render()},
 reg:k=>{REG=k;AREA='all';LIM=20;render()},
 more:()=>{LIM+=20;render()},
 add:(di,pid)=>{const c=S.days[di].cands;if(!c.includes(pid)){c.push(pid);save();toast(P(pid).n+' → '+S.days[di].n)}render()},
 del:(di,pid)=>{const c=S.days[di].cands,i=c.indexOf(pid);if(i>-1){c.splice(i,1);save();toast('후보에서 뺐습니다')}render()},
 toggle:(pid,di)=>{S.days[di].cands.includes(pid)?A.del(di,pid):A.add(di,pid)},
 up:(di,i)=>{const c=S.days[di].cands;if(i>0){[c[i-1],c[i]]=[c[i],c[i-1]];save()}render()},
 dn:(di,i)=>{const c=S.days[di].cands;if(i<c.length-1){[c[i+1],c[i]]=[c[i],c[i+1]];save()}render()},
 visit:(di,pid)=>{const d=S.days[di];d.done[pid]?delete d.done[pid]:d.done[pid]=m2t(NOW());save();render()},
 chk:(gi,ii)=>{const it=S.prep[gi].items[ii];it.v=it.v?0:1;save();render()},
 q:v=>{Q=v;LIM=20;render();const el=document.getElementById('q');if(el){el.focus();el.setSelectionRange(v.length,v.length)}},
 clearq:()=>{Q='';LIM=20;render()},
 reset:()=>{if(confirm('이 기기의 계획을 초기값으로 되돌립니다. 계속할까요?')){localStorage.removeItem(KEY);load();render()}}
};
window.A=A;

/* ══ 엔진 ══ */
const DAY_START='08:00', DAY_END='22:00';
function gapsOf(D){const F=D.fixed.map(a=>({st:t2m(a.s),en:t2m(a.s)+a.dur})).sort((x,y)=>x.st-y.st);
 const out=[];let cur=t2m(DAY_START);
 F.forEach(a=>{if(a.st>cur)out.push({f:cur,t:a.st});cur=Math.max(cur,a.en)});
 if(cur<t2m(DAY_END))out.push({f:cur,t:t2m(DAY_END)});return out.filter(g=>g.t-g.f>=50)}
const fitsIn=(p,g)=>(p.du+12)<=(g.t-g.f);

/* ══ 화면 ══ */
function vTrips(){
 const nC=S.days.reduce((a,d)=>a+d.cands.length,0), nF=S.days.reduce((a,d)=>a+d.fixed.length,0);
 const rc={};DB.forEach(p=>rc[p.r]=(rc[p.r]||0)+1);
 return `<div class="tripcard"><div class="bn" style="background:linear-gradient(140deg,#D9542B,#8E2F14)">
   <div class="dd">${dday()}</div><h3>${esc(S.trip.title)}</h3></div>
  <div class="bd"><div class="r"><span class="mut">${S.trip.range}</span><b>${S.trip.members.map(m=>m.n).join(' · ')}</b></div>
   <div class="r"><span class="mut">고정 일정</span><b>${nF}건</b></div>
   <div class="r"><span class="mut">후보 배정</span><b>${nC}개</b></div>
   <div class="r"><span class="mut">이 지역 장소</span><b>${rc[S.trip.region]||0}곳</b></div>
   <div class="prog"><i style="width:${Math.min(100,nC*8)}%"></i></div></div></div>
 <div class="sec">지난 여행</div>
 <div class="tripcard"><div class="bn" style="background:linear-gradient(140deg,#0E6B5E,#093B34)"><h3>${PAST.title}</h3></div>
  <div class="bd"><div class="r"><span class="mut">${PAST.range}</span><b>4일</b></div>
   <div class="r"><span class="mut">총 지출</span><b>${W(PAST.spent)}</b></div>
   <div class="r"><span class="mut">방문한 곳</span><b>${PAST.places}곳</b></div>
   <div class="r" style="margin-top:8px;align-items:center"><span class="pill">🔒 기록 잠김</span>
    <span style="font-size:12px;font-weight:800;color:var(--acc2)" onclick="A.go('report')">결산 보기 →</span></div></div></div>
 <div class="sec">장소 DB (도시별 · 영구)</div>
 <div class="lib"><div class="t">전체 ${DB.length}곳 · 좌표 ${DB.filter(p=>p.ll).length}곳</div>
  <div class="s">여행과 무관하게 쌓입니다. 새 여행을 만들면 그 도시 목록이 그대로 후보 풀이 됩니다.</div>
  <div class="row">${Object.entries(rc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span>${k} ${v}</span>`).join('')}</div></div>
 <div class="newtrip">＋ 새 여행 만들기</div>
 <div style="text-align:center;padding:0 0 24px"><span style="font-size:12px;color:var(--dim);font-weight:700" onclick="A.reset()">계획 초기화</span></div>`;
}
function dday(){const t=new Date(S.trip.start+'T00:00:00'),n=new Date();
 const d=Math.ceil((t-n)/86400000);return d>0?'D-'+d:(d===0?'D-DAY':'여행 중')}

function vPlan(){
 const D=S.days[DAYI], G=gapsOf(D), done=D.done;
 const cands=D.cands.map(P).filter(Boolean);
 const rest=cands.filter(p=>!done[p.i]);
 const FREE=G.reduce((a,g)=>a+(g.t-g.f),0);
 let prev=null;const chain=cands.map(p=>{const mv=moveEst(prev,p);prev=p;return{p,mv}});
 const NEED=chain.filter(x=>!done[x.p.i]).reduce((a,x)=>a+x.p.du+x.mv.min,0);
 const FX=D.fixed.map(a=>({...a,st:t2m(a.s),en:t2m(a.s)+a.dur})).sort((x,y)=>x.st-y.st);
 let body='';
 G.forEach((g,gi)=>{
  const ok=rest.filter(p=>fitsIn(p,g)), no=rest.filter(p=>!fitsIn(p,g));
  body+=`<div class="gap"><div class="t"><b>빈 시간 ${m2t(g.f)} ~ ${m2t(g.t)}</b><span>${D2(g.t-g.f)}</span></div>
   ${rest.length?`<div class="fit">${ok.slice(0,3).map(p=>`<span>${CAT[p.c].i} ${esc(cut(p.n,11))}</span>`).join('')}
    ${no.slice(0,1).map(p=>`<span class="no">${esc(cut(p.n,11))}</span>`).join('')}</div>
   <div class="okline">담아둔 후보 ${ok.length}곳이 이 시간에 들어갑니다</div>`
   :'<div style="font-size:12px;color:var(--sub);margin-top:8px;font-weight:600">담아둔 후보가 없습니다</div>'}</div>`;
  const a=FX[gi];if(a){const c=CAT[a.cat];
   body+=`<div class="anch"><div class="tm"><b>${a.s}</b><em>${m2t(a.en)}</em></div>
    <div style="flex:1"><div class="nm">${c.i} ${esc(a.nm)}</div>${a.why?`<div class="sb">${esc(a.why)}</div>`:''}</div>
    <span class="badge" style="background:#17130F;color:#fff">고정</span></div>`}
 });
 const pool=DB.filter(p=>p.r===S.trip.region&&!D.cands.includes(p.i)&&!D.fixed.some(f=>f.pid===p.i))
  .sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0)).slice(0,12);
 const picker=PICK?`<div class="picker"><div class="ph">${D.n} 후보로 담기 · 평점순<span onclick="A.pick()">닫기 ✕</span></div>
  ${pool.map(p=>{const c=CAT[p.c],other=S.days.map((d,i)=>d.cands.includes(p.i)?i:-1).filter(i=>i>=0);
   return `<div class="pk" onclick="A.add(${DAYI},'${p.i}')"><div style="flex:1">
    <div class="nm">${c.i} ${esc(p.n)}</div><div class="meta"><span>약 ${D2(p.du)}</span>${p.rt?`<span>★ ${p.rt}</span>`:''}${p.g?`<span>${esc(p.g)}</span>`:''}
    ${other.length?`<span style="color:var(--acc2);font-weight:800">${other.map(i=>S.days[i].n).join('·')}에 있음</span>`:''}</div></div>
    <div class="plus">＋</div></div>`}).join('')}
  <div class="pkmore" onclick="A.go('place')">장소 DB 전체에서 고르기 →</div></div>`:'';
 return `<div class="hstack">${S.days.map((d,i)=>`<div class="dc ${i===DAYI?'on':''}" onclick="A.day(${i})">
   <div class="n">${d.n}</div><div class="d">${d.d}</div></div>`).join('')}</div>
  <div class="sumbar"><div><div class="k">고정</div><div class="v">${D.fixed.length}건</div></div>
   <div><div class="k">후보</div><div class="v">${cands.length}곳</div></div>
   <div><div class="k">빈 시간</div><div class="v">${D2(FREE)}</div></div></div>
  ${(cands.length||FX.some(f=>f.pid))?'<div class="mapbox"><div id="map"></div></div>':''}
  <div class="grouphd"><span class="l">시간이 정해진 것</span><span class="r">예약 · 티켓 · 교통</span></div>
  ${body}
  <div class="grouphd"><span class="l">${D.n} 후보</span><span class="r">${rest.length?`소요 ${D2(NEED)} / 빈 ${D2(FREE)}`:'비어 있음'}</span></div>
  ${cands.length?chain.map((x,i)=>{const p=x.p,c=CAT[p.c],dn=done[p.i];
   return `${i>0?`<div class="mvline"><span>${x.mv.mode==='도보'?'🚶':'🚃'} ${x.mv.mode} 약 ${x.mv.min}분${x.mv.km?` · ${x.mv.km.toFixed(1)}km`:''} <em>추정</em></span></div>`:''}
   <div class="cand ${dn?'dn':''}">
    <div class="ord"><span onclick="A.up(${DAYI},${i})">▲</span><b>${i+1}</b><span onclick="A.dn(${DAYI},${i})">▼</span></div>
    <div style="flex:1" onclick="A.visit(${DAYI},'${p.i}')"><div class="nm">${c.i} ${esc(p.n)}</div>
     <div class="meta"><span>약 ${D2(p.du)}</span>${p.rt?`<span>★ ${p.rt}</span>`:''}${p.g?`<span>${esc(p.g)}</span>`:''}${dn?`<span style="color:var(--acc2);font-weight:800">✓ ${dn} 방문</span>`:''}</div>
     ${p.m?`<div class="memo mine">📝 ${esc(p.m)}</div>`:(p.d?`<div class="memo">${esc(cut(p.d,64))}</div>`:'')}</div>
    <div class="rm" onclick="A.del(${DAYI},'${p.i}')">✕</div></div>`}).join('')
   :'<div class="empty">아직 담은 후보가 없습니다<br><span style="font-weight:600;color:var(--dim);font-size:12px">아래 버튼이나 <b>장소</b> 탭에서 담아보세요</span></div>'}
  <div class="addbtn" onclick="A.pick()">${PICK?'✕ 닫기':'＋ 장소에서 후보 담기'}</div>${picker}`;
}
const cut=(s,n)=>String(s||'').length>n?String(s).slice(0,n)+'…':String(s||'');

function drawMap(){const el=document.getElementById('map');if(!el)return;
 if(mapObj){mapObj.remove();mapObj=null}
 const D=S.days[DAYI];
 const anch=D.fixed.filter(f=>f.pid).map(f=>P(f.pid)).filter(p=>p&&p.ll);
 const cs=D.cands.map(P).filter(p=>p&&p.ll);
 const pts=[...anch,...cs];
 if(!pts.length){el.innerHTML='<div class="nomap">담은 장소가 없거나 좌표가 없습니다</div>';return}
 el.innerHTML='';
 mapObj=L.map(el,{zoomControl:false,attributionControl:false});
 L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(mapObj);
 anch.forEach(p=>L.marker(p.ll,{icon:L.divIcon({html:'<div class="pin" style="background:#17130F">고</div>',className:'',iconSize:[24,24]})}).addTo(mapObj).bindPopup(p.n));
 cs.forEach((p,i)=>L.marker(p.ll,{icon:L.divIcon({html:'<div class="pin">'+(i+1)+'</div>',className:'',iconSize:[24,24]})}).addTo(mapObj).bindPopup(p.n));
 if(cs.length>1)L.polyline(cs.map(p=>p.ll),{color:'#D9542B',weight:2.5,opacity:.5,dashArray:'5,6'}).addTo(mapObj);
 mapObj.fitBounds(L.latLngBounds(pts.map(p=>p.ll)).pad(.3));
 setTimeout(()=>mapObj&&mapObj.invalidateSize(),150);}

function vPlace(){
 const inTrip=p=>S.days.some(d=>d.cands.includes(p.i)||d.fixed.some(f=>f.pid===p.i));
 let L2=DB.filter(p=>p.r===REG);
 const areas=[...new Set(L2.map(p=>p.a).filter(Boolean))];
 if(AREA!=='all')L2=L2.filter(p=>p.a===AREA);
 if(FILT==='un')L2=L2.filter(p=>!inTrip(p)); else if(FILT!=='all')L2=L2.filter(p=>p.c===FILT);
 if(Q){const q=Q.toLowerCase();L2=L2.filter(p=>(p.n+p.j+p.g+p.d+p.m).toLowerCase().includes(q))}
 L2=L2.slice().sort((a,b)=>(b.rt||0)-(a.rt||0)||(b.rv||0)-(a.rv||0));
 const R=DB.filter(p=>p.r===REG);
 const F=[['all','전체',R.length],['un','미배정',R.filter(p=>!inTrip(p)).length],
  ['eat','🍜 식사',R.filter(p=>p.c==='eat').length],['cafe','☕ 카페',R.filter(p=>p.c==='cafe').length],
  ['see','🏯 관광',R.filter(p=>p.c==='see').length],['shop','🛍 쇼핑',R.filter(p=>p.c==='shop').length],
  ['stay','🏨 숙소',R.filter(p=>p.c==='stay').length]].filter(x=>x[2]>0);
 const regs=[...new Set(DB.map(p=>p.r))].sort((a,b)=>DB.filter(p=>p.r===b).length-DB.filter(p=>p.r===a).length);
 return `<div class="hstack">${regs.map(r=>`<span class="rg ${REG===r?'on':''}" onclick="A.reg('${r}')">${r} ${DB.filter(p=>p.r===r).length}</span>`).join('')}</div>
 <div class="srchbox"><input id="q" value="${esc(Q)}" placeholder="이름 · 메뉴 · 설명 검색" oninput="A.q(this.value)" autocomplete="off">
  ${Q?'<span class="clr" onclick="A.clearq()">✕</span>':''}</div>
 <div class="hstack">${F.map(([k,n,c])=>`<span class="f ${FILT===k?'on':''}" onclick="A.filt('${k}')">${n} ${c}</span>`).join('')}</div>
 ${areas.length>1?`<div class="hstack">${['all',...areas].map(a=>`<span class="f sm ${AREA===a?'on':''}" onclick="A.area('${a.replace(/'/g,'')}')">${a==='all'?'전 지역':esc(a)}</span>`).join('')}</div>`:''}
 <div class="cnt">${L2.length}곳${Q?` · "${esc(Q)}"`:''}</div>
 ${L2.slice(0,LIM).map(p=>{const c=CAT[p.c];const ds=S.days.map((d,i)=>d.cands.includes(p.i)?i:-1).filter(i=>i>=0);
  const fx=S.days.some(d=>d.fixed.some(f=>f.pid===p.i));
  return `<div class="pl">
   <div class="r1"><span class="chip" style="background:${c.c}18;color:${c.c}">${c.i}</span>
    <span class="nm">${esc(p.n)}</span>${fx?'<span class="badge" style="background:#17130F;color:#fff">고정</span>':''}</div>
   <div class="info">${p.rt?`<span>★ ${p.rt} (${(p.rv||0).toLocaleString()})</span>`:'<span class="d">평점 없음</span>'}
    ${p.g?`<span>${esc(p.g)}</span>`:''}${p.pr?`<span>${esc(p.pr)}</span>`:''}<span>약 ${D2(p.du)}</span>${p.ll?'':'<span class="d">좌표 없음</span>'}</div>
   ${p.m?`<div class="memo mine">📝 ${esc(p.m)}</div>`:''}
   ${p.d?`<div class="memo">${esc(cut(p.d,100))}</div>`:''}
   <div class="daypick">${S.days.map((d,i)=>`<span class="dp ${ds.includes(i)?'on':''}" onclick="A.toggle('${p.i}',${i})">${i+1}일</span>`).join('')}
    <a class="glink" href="${esc(p.u)}" target="_blank" rel="noopener">지도 ↗</a>${p.v?`<a class="glink" href="${esc(p.v)}" target="_blank" rel="noopener">영상</a>`:''}</div>
  </div>`}).join('')}
 ${L2.length>LIM?`<div class="more" onclick="A.more()">＋ 더 보기 (${LIM}/${L2.length})</div>`:'<div style="height:14px"></div>'}`;
}

function vToday(){
 const now=NOW(), D=S.days[DAYI]||S.days[0], done=D.done;
 const nextA=D.fixed.map(a=>({...a,st:t2m(a.s)})).filter(a=>a.st>now).sort((x,y)=>x.st-y.st)[0];
 const win=nextA?nextA.st-now:Math.max(0,t2m(DAY_END)-now);
 const cur={ll:S.trip.base};
 const opts=D.cands.map(P).filter(p=>p&&!done[p.i]).map(p=>{const mv=moveEst(cur,p),need=mv.min+p.du;
   return {...p,mv,need,end:now+need,slack:win-need}}).filter(o=>o.slack>=0).sort((a,b)=>a.slack-b.slack);
 const vis=Object.entries(done).map(([id,tm])=>({tm,nm:(P(id)||{n:'-'}).n})).sort((a,b)=>a.tm.localeCompare(b.tm));
 return `<div class="tmode"><div class="lb">${D.n} / ${S.days.length}일 · ${dday()}</div>
  <h2>지금 ${m2t(now)}</h2>
  <div class="mt">${D.d} · ${S.trip.region}</div>
  <div class="kpis"><div><div class="k">오늘 다닌 곳</div><div class="v">${vis.length}곳</div></div>
   <div><div class="k">오늘 후보</div><div class="v">${D.cands.length}곳</div></div>
   <div><div class="k">남은 예산</div><div class="v">${W(remain())}</div></div></div></div>
 ${nextA?`<div class="anchornext"><div class="k">다음 고정 일정</div>
  <div class="v">${nextA.s} ${esc(nextA.nm)}</div><div class="s">${D2(win)} 남음 — 그때까지는 자유롭게</div></div>`
  :`<div class="anchornext"><div class="k">오늘 남은 고정 일정</div><div class="v">없음</div>
  <div class="s">${D2(win)} 남음 — 전부 자유 시간입니다</div></div>`}
 <div class="nowhd"><span>지금 갈 수 있는 곳</span><em>${opts.length}곳 · 이동시간 반영</em></div>
 ${opts.length?opts.slice(0,4).map((o,i)=>{const c=CAT[o.c];return `<div class="opt ${i===0?'best':''}">
   ${i===0?'<div class="tag">시간 딱 맞음</div>':''}
   <div class="nm">${c.i} ${esc(o.n)}</div>
   <div class="meta">${o.rt?`<span>★ ${o.rt}</span>`:''}<span>${o.mv.mode} ${o.mv.min}분</span><span>약 ${D2(o.du)}</span>${o.g?`<span>${esc(o.g)}</span>`:''}</div>
   <span class="calc">지금 출발하면 <b>${m2t(o.end)}</b>에 끝납니다${nextA?` · 다음 예약까지 <b>${D2(o.slack)}</b> 여유`:''}</span>
   <div class="row"><button class="p" onclick="A.visit(${DAYI},'${o.i}')">여기로 간다</button>
    <a class="glink" style="flex:1;justify-content:center" href="${esc(o.u)}" target="_blank" rel="noopener">길찾기</a></div></div>`}).join('')
  :'<div class="empty">일정 탭에서 오늘 후보를 담아주세요</div>'}
 <div class="sec">오늘 지나온 곳</div>
 <div class="card mrow" style="margin-bottom:20px">
  ${vis.length?vis.map(d=>`<div class="tr"><span class="tm">${d.tm}</span><span class="nm">${esc(d.nm)}</span><span class="ok">✓ 방문</span></div>`).join('')
   :'<div style="font-size:13px;color:var(--sub);font-weight:600;padding:6px 0">아직 없습니다. 후보를 눌러 방문 체크하세요.</div>'}</div>`;
}

const eK=e=>(e.krw||0)+(e.jpy||0)*RATE;
const spent=()=>S.exp.reduce((a,e)=>a+eK(e),0);
const remain=()=>S.trip.budget-spent();
function vMoney(){
 const SP=spent(),RM=remain(),pct=Math.min(100,SP/S.trip.budget*100);
 const t=new Date(S.trip.start+'T00:00:00'),n=new Date();
 const left=Math.max(1,Math.ceil((t-n)/86400000)>0?S.days.length:Math.max(1,S.days.length-DAYI));
 const cs={};S.exp.forEach(e=>cs[e.cat]=(cs[e.cat]||0)+eK(e));
 const rows=Object.entries(cs).sort((a,b)=>b[1]-a[1]);const mx=rows.length?rows[0][1]:1;
 const CC={항공:'#3A6EA5',숙박:'#B08834',음식:'#D9542B',교통:'#98918A',관광:'#0E6B5E',쇼핑:'#6B4FA8',기타:'#98918A'};
 const paid={};S.trip.members.forEach(m=>paid[m.n]=0);S.exp.forEach(e=>paid[e.who]=(paid[e.who]||0)+eK(e));
 const fair=SP/S.trip.members.length;
 const m0=S.trip.members[0].n,m1=(S.trip.members[1]||{n:'-'}).n;
 const from=paid[m0]>fair?m1:m0, to=from===m0?m1:m0, amt=Math.abs((paid[m0]||0)-fair);
 const cash=S.exp.filter(e=>e.pay==='현금').reduce((a,e)=>a+eK(e),0);
 return `<div class="card mh"><div class="lb">남은 예산</div><div class="big">${W(RM)}</div>
  <div class="bar"><i style="width:${pct}%;background:var(--acc)"></i></div>
  <div class="sp"><span>사용 ${W(SP)} · ${Math.round(pct)}%</span><span>총 ${W(S.trip.budget)}</span></div>
  <div class="gauge"><div class="k">남은 ${left}일 · 하루 가능 금액</div><div class="v">${W(RM/left)}</div>
   <div class="n">현금 ${W(cash)} · 카드 ${W(SP-cash)}</div></div></div>
 ${rows.length?`<div class="sec">분류별</div><div class="card mrow">${rows.map(([k,v])=>`<div class="it">
  <div class="l"><span>${k}</span><em>${W(v)}</em></div><div class="mini"><i style="width:${v/mx*100}%;background:${CC[k]||'#98918A'}"></i></div></div>`).join('')}</div>`:''}
 <div class="sec">정산</div>
 <div class="card mrow settle"><div style="font-size:12px;font-weight:700;opacity:.85">여행 종료 시 정산</div>
  <div class="res">${amt<1?'정산 없음':`${from} → ${to} ${W(amt)}`}</div>
  <div class="dt">${S.trip.members.map(m=>m.n+' 결제 '+W(paid[m.n]||0)).join(' · ')}<br>1/N 기준 1인 ${W(fair)}</div></div>
 <div class="sec">엔화 계산기</div>
 <div class="card mrow"><div class="calcrow">
  <input id="jpy" type="number" inputmode="numeric" value="5000" oninput="calc()">
  <span style="font-size:14px;font-weight:800;color:var(--sub)">엔 =</span>
  <div id="krw" style="font-size:19px;font-weight:800;letter-spacing:-.02em"></div></div>
  <div class="cmp" id="cmp"></div></div>
 <div class="sec">지출 내역</div>
 <div class="card mrow" style="margin-bottom:96px">${S.exp.length?S.exp.slice().reverse().map(e=>`<div class="exp">
  <span>${esc(e.nm)}<span class="who">${esc(e.who)}</span><span class="pay" style="background:${e.pay==='현금'?'#FBF4E6':'#EDF2F7'};color:${e.pay==='현금'?'#8A6A22':'#3A6EA5'}">${e.pay}</span></span>
  <b>${e.jpy?Y(e.jpy):W(e.krw)}</b></div>`).join(''):'<div style="font-size:13px;color:var(--sub);font-weight:600">아직 없습니다</div>'}</div>
 <button class="fab" onclick="addExp()">＋</button>`;
}
function calc(){const el=document.getElementById('jpy');if(!el)return;
 const j=+(el.value||0),base=j*RATE;
 document.getElementById('krw').textContent=W(base);
 const cards=[['트래블월렛',0],['토스 체크',.03],['일반 신용카드',.043],['공항 환전',.055]];
 const mn=Math.min(...cards.map(c=>base*(1+c[1])));
 document.getElementById('cmp').innerHTML=cards.map(([n,f])=>{const v=base*(1+f);
  return `<div class="c ${v===mn?'best':''}"><span>${n}${f?' (+'+(f*100).toFixed(1)+'%)':' (수수료 0)'}</span><b>${W(v)}</b></div>`}).join('')}
window.calc=calc;
function addExp(){
 const nm=prompt('지출 항목 (예: 점심 라멘)');if(!nm)return;
 const amt=prompt('금액 (엔이면 숫자만, 원이면 뒤에 W)');if(!amt)return;
 const isW=/w/i.test(amt), n=parseFloat(String(amt).replace(/[^\d.]/g,''));if(!n)return;
 const who=prompt('결제자',S.trip.members[0].n)||S.trip.members[0].n;
 const cat=prompt('분류 (음식/교통/쇼핑/관광/숙박/항공/기타)','음식')||'기타';
 const pay=confirm('카드로 결제했나요? (취소=현금)')?'카드':'현금';
 S.exp.push(isW?{nm,krw:n,who,cat,pay}:{nm,jpy:n,who,cat,pay});save();toast('지출 추가됨');render()}
window.addExp=addExp;

function vPrep(){
 const all=S.prep.flatMap(g=>g.items.map(i=>i.v));
 const done=all.filter(Boolean).length,tot=all.length,p=tot?done/tot:0,R=25,C=2*Math.PI*R;
 return `<div class="card ring"><svg width="62" height="62" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="${R}" fill="none" stroke="#EFEAE2" stroke-width="7"/>
  <circle cx="30" cy="30" r="${R}" fill="none" stroke="var(--acc2)" stroke-width="7" stroke-linecap="round"
   stroke-dasharray="${C}" stroke-dashoffset="${C*(1-p)}" transform="rotate(-90 30 30)"/>
  <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="#17130F">${Math.round(p*100)}%</text></svg>
  <div><div class="t">${done} / ${tot} 완료</div><div class="s">${dday()} · 체크하면 바로 저장됩니다</div></div></div>
 ${S.prep.map((g,gi)=>`<div class="sec">${g.g}</div><div class="card chk">${g.items.map((it,ii)=>`
  <div class="ci" onclick="A.chk(${gi},${ii})"><div class="box ${it.v?'on':''}">${it.v?'✓':''}</div>
  <div><div class="tx ${it.v?'done':''}">${esc(it.t)}</div>${it.s?`<div class="sb">${esc(it.s)}</div>`:''}</div></div>`).join('')}</div>`).join('')}
 <div class="sec">예약 · 서류 보관함</div>
 <div class="card doc" style="margin-bottom:20px">${S.docs.map(d=>`<div class="di"><div class="ic">${d.i}</div>
  <div style="flex:1"><div class="nm">${esc(d.n)}</div><div class="sb">${esc(d.s)}</div></div><div class="of">오프라인</div></div>`).join('')}</div>`;
}
function vReport(){
 const mx=Math.max(...PAST.cats.map(c=>c[1]));
 const CC={항공:'#3A6EA5',숙박:'#B08834',음식:'#D9542B',교통:'#98918A',관광:'#0E6B5E',쇼핑:'#6B4FA8'};
 return `<div class="rep"><div class="lb">TRIP REPORT</div><h2>${PAST.title}</h2><div class="mt">${PAST.range}</div>
  <div class="g"><div><div class="k">총 지출</div><div class="v">${W(PAST.spent)}</div></div>
   <div><div class="k">예산 대비</div><div class="v">${Math.round(PAST.spent/PAST.budget*100)}% 사용</div></div>
   <div><div class="k">방문한 곳</div><div class="v">${PAST.places}곳</div></div>
   <div><div class="k">하루 평균</div><div class="v">${W(PAST.spent/PAST.days)}</div></div></div></div>
 <div class="sec">어디에 썼나</div>
 <div class="card mrow">${PAST.cats.slice().sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="it">
  <div class="l"><span>${k}</span><em>${W(v)} · ${Math.round(v/PAST.spent*100)}%</em></div>
  <div class="mini"><i style="width:${v/mx*100}%;background:${CC[k]}"></i></div></div>`).join('')}</div>
 <div class="sec">평점 · 메모 <span style="font-weight:600;color:var(--sub)">(잠겨 있어도 수정 가능)</span></div>
 <div class="card mrow" style="margin-bottom:20px">${PAST.best.map(([n,s])=>`<div class="rate"><span class="nm">${n}</span>
  <span class="st">${'★'.repeat(s)}${'☆'.repeat(5-s)}</span></div>`).join('')}</div>`;
}

const TITLE={trips:['내 여행',''],today:['오늘',''],plan:[()=>S.trip.title,()=>dday()],
 place:['장소',()=>REG+' '+DB.filter(p=>p.r===REG).length+'곳'],money:['지갑','환율 9.4원/엔'],
 prep:['가방',()=>dday()],report:['결산','🔒 기록 잠김']};
const V={trips:vTrips,today:vToday,plan:vPlan,place:vPlace,money:vMoney,prep:vPrep,report:vReport};

function render(){
 const app=document.getElementById('app');
 const t=TITLE[TAB]||['',''];
 const title=typeof t[0]==='function'?t[0]():t[0];
 const rt=typeof t[1]==='function'?t[1]():t[1];
 const prevMain=document.querySelector('main');
 const sc=prevMain?prevMain.scrollTop:0;
 app.innerHTML=`<header class="top"><h1>${esc(title)}</h1>
   <div class="rt" onclick="A.go('${TAB==='trips'?'plan':'trips'}')">${TAB==='trips'?'✕ 닫기':(rt?esc(rt)+' ·':'')+' 내 여행'}</div></header>
  <main id="main">${V[TAB]()}</main>
  <nav class="tabs">${TABS.map(([k,i,n])=>`<button class="${TAB===k?'on':''}" onclick="A.go('${k}')"><span class="ic">${i}</span>${n}</button>`).join('')}</nav>`;
 const m=document.getElementById('main');
 if(TAB==='plan'||TAB==='place')m.scrollTop=sc;
 if(TAB==='plan')drawMap();
 if(TAB==='money')calc();
}
window.render=render;

/* ══ 부팅 ══ */
(async function boot(){
 load();
 try{
  const r=await fetch('places.json?v=1');
  DB=await r.json();
 }catch(e){
  document.getElementById('app').innerHTML='<div class="loading">장소 데이터를 불러오지 못했습니다</div>';return;
 }
 REG=S.trip.region;
 // 오늘 날짜에 해당하는 일차 자동 선택
 const st=new Date(S.trip.start+'T00:00:00'), n=new Date();
 const di=Math.floor((n-st)/86400000);
 if(di>=0&&di<S.days.length){DAYI=di;TAB='today'}
 render();
})();
