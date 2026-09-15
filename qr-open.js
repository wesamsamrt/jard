'use strict';
let qrTarget=null,qrOpened='',qrLoading=false;
function readQRTarget(hash){const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('code'))return null;const code=(p.get('code')||'').trim(),model=(p.get('model')||'').trim();if(!code||code.length>200||model.length>200)throw Error('رابط QR غير صالح.');return{code,model}}
function qrMatches(rows,target){return rows.filter(r=>String(r.code??'').trim()===target.code&&String(r.model??'').trim()===target.model)}
function qrSessionKey(){return user&&db?'jard-last-session:'+db.supabaseUrl+':'+user.id:null}
function qrMessage(message){$('qrNotice').hidden=false;$('qrMessage').textContent=message}
function openQRItem(){
  if(!qrTarget||!active||demo||!user)return;
  const signature=JSON.stringify([active.id,qrTarget]);if(qrOpened===signature)return;
  const found=qrMatches(items,qrTarget);
  qrMessage(`الكود: ${qrTarget.code} · الموديل: ${qrTarget.model||'بدون موديل'} · الجرد: ${active.name}`);
  if(!found.length){qrMessage('الصنف بهذا الكود والموديل غير موجود في جلسة الجرد المحددة. اختر جلسة أخرى.');return}
  qrOpened=signature;
  if(found.length===1){edit(found[0].id);return}
  $('qrDuplicates').innerHTML=found.map((r,index)=>`<button class="history-item" data-qr-row="${r.id}">${escapeHTML(r.name)}<small>السجل ${fmt(index+1)} · الجرد الأول: ${r.count1===null?'—':fmt(r.count1)} · الثاني: ${r.count2===null?'—':fmt(r.count2)}</small></button>`).join('');
  show('qrDuplicateDialog');
}
async function resumeQR(){
  if(!qrTarget)return;
  qrMessage(`تم مسح ${qrTarget.code} · ${qrTarget.model||'بدون موديل'}. ${user?'اختر جلسة الجرد لفتح الصنف.':'سجّل الدخول ثم اختر جلسة الجرد.'}`);
  if(!user||!db||qrLoading)return;
  if(active&&!demo){openQRItem();return}
  let previous=null;try{previous=localStorage.getItem(qrSessionKey())}catch{}
  if(previous){qrLoading=true;try{await loadSession(previous)}catch{qrMessage('تعذر فتح جلسة الجرد السابقة. اختر جلسة الجرد المطلوبة.')}finally{qrLoading=false}}
}
const loadBeforeQR=loadSession;
loadSession=async function(id){await loadBeforeQR(id);try{const key=qrSessionKey();if(key)localStorage.setItem(key,id)}catch{}openQRItem()};
const connectionBeforeQR=connection;
connection=function(){connectionBeforeQR();if(!user)qrOpened='';setTimeout(resumeQR,0)};
$('qrChooseSession').onclick=()=>{if(requireUser())$('historyBtn').onclick()};
$('qrDuplicates').onclick=e=>{const b=e.target.closest('[data-qr-row]');if(b){$('qrDuplicateDialog').close();edit(b.dataset.qrRow)}};
function acceptQR(){try{qrTarget=readQRTarget(window.location.hash);qrOpened='';$('qrNotice').hidden=!qrTarget;resumeQR()}catch(e){qrTarget=null;qrMessage(e.message)}}
window.addEventListener('hashchange',acceptQR);acceptQR();
