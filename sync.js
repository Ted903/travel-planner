/* ══════ Firestore 동기화 ══════ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const cfg = {
  apiKey: "AIzaSyAVfUg1blVQW59TVvWRQigiqDpEE9g2nOM",
  authDomain: "travel-planner-jmh.firebaseapp.com",
  projectId: "travel-planner-jmh",
  storageBucket: "travel-planner-jmh.firebasestorage.app",
  messagingSenderId: "965850895431",
  appId: "1:965850895431:web:ff5e03fc360a2d82c4cd62"
};

let db = null, unsub = null;
function init(){ if(!db){ db = getFirestore(initializeApp(cfg)); } return db }

/* 20자 랜덤 ID */
function newId(){
  const c='abcdefghijkmnpqrstuvwxyz23456789';
  const a=new Uint8Array(20); crypto.getRandomValues(a);
  return Array.from(a).map(x=>c[x%c.length]).join('');
}

const FB = {
  ready: true,
  newId,

  /* 여행을 서버에 올리기 (최초 공유) */
  async push(shareId, trip, by){
    init();
    await setDoc(doc(db,'trips',shareId), {
      data: JSON.stringify(trip),
      updatedAt: Date.now(),
      updatedBy: by || '',
      serverAt: serverTimestamp()
    });
    return true;
  },

  /* 한 번 읽기 */
  async pull(shareId){
    init();
    const s = await getDoc(doc(db,'trips',shareId));
    if(!s.exists()) return null;
    const d = s.data();
    try{ return { trip: JSON.parse(d.data), updatedAt: d.updatedAt||0, updatedBy: d.updatedBy||'' } }
    catch(e){ return null }
  },

  /* 실시간 구독 */
  watch(shareId, cb){
    init();
    if(unsub){ unsub(); unsub=null }
    unsub = onSnapshot(doc(db,'trips',shareId), function(s){
      if(!s.exists()) return;
      const d = s.data();
      try{ cb({ trip: JSON.parse(d.data), updatedAt: d.updatedAt||0, updatedBy: d.updatedBy||'',
                fromCache: s.metadata.hasPendingWrites }) }catch(e){}
    }, function(err){ if(window.__syncErr) window.__syncErr(err.message) });
    return unsub;
  },

  stop(){ if(unsub){ unsub(); unsub=null } }
};

window.FB = FB;
window.dispatchEvent(new Event('fb-ready'));
