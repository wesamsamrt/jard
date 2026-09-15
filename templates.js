'use strict';
// Templates change presentation only. Original inventory rows remain untouched.
const inventoryFields = [
  {key:'name',label:'اسم الصنف'}, {key:'model',label:'الموديل'},
  {key:'code',label:'كود الصنف'}, {key:'count1',label:'كمية الجرد الفعلي1'},
  {key:'count2',label:'كمية الجرد الفعلي2'}
];
let savedTemplates=[],chosenTemplate='',templateOwner='',templateEpoch=0,templateSaving=false;
let draftFields=inventoryFields.map(f=>f.key);
const validFields=keys=>Array.isArray(keys)&&keys.length>0&&keys.length<=5&&new Set(keys).size===keys.length&&keys.every(k=>inventoryFields.some(f=>f.key===k));
function chosenFields(){return savedTemplates.find(t=>t.id===chosenTemplate)?.columns||inventoryFields.map(f=>f.key)}
function fieldLabel(key){return inventoryFields.find(f=>f.key===key).label}
function fieldValue(row,key){const value=row[key];return value===null||value===undefined||value===''?'—':key.startsWith('count')?fmt(value):escapeHTML(value)}
function drawTemplateTable(){
  const keys=chosenFields(),list=filtered();
  $('inventoryHead').innerHTML='<th>#</th>'+keys.map(k=>`<th>${fieldLabel(k)}</th>`).join('')+'<th>الحالة</th><th></th>';
  $('rows').innerHTML=list.slice(page*size,(page+1)*size).map((i,k)=>`<tr><td>${fmt(page*size+k+1)}</td>${keys.map(key=>`<td class="field-${key}">${fieldValue(i,key)}</td>`).join('')}<td><span class="badge ${complete(i)?different(i)?'diff':'done':''}">${complete(i)?different(i)?'مكتمل · اختلاف الكميات':'مكتمل الجرد':'بانتظار الإكمال'}</span></td><td><button class="row-edit" data-edit="${i.id}">إدخال الكمية</button></td></tr>`).join('');
  if(items.length&&!list.length)$('rows').innerHTML=`<tr><td colspan="${keys.length+3}" style="text-align:center;padding:45px">لا توجد أصناف مطابقة للبحث أو التصفية.</td></tr>`;
  $('selectedTemplateNote').textContent=chosenTemplate?'عرض الجدول حسب القالب المحدد؛ التصدير يشمل جميع الأعمدة.':'اختر قالبًا لتحديد أعمدة الجدول فقط.';
}
const inventoryRender=render;
render=function(){inventoryRender();drawTemplateTable()};
function drawTemplateSelect(){
  $('templateSelect').innerHTML='<option value="">الافتراضي — جميع الأعمدة</option>'+savedTemplates.map(t=>`<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');
  if(!savedTemplates.some(t=>t.id===chosenTemplate))chosenTemplate='';
  $('templateSelect').value=chosenTemplate;
}
function templateError(error){return /schema cache|does not exist|Could not find/i.test(error.message)?'لتفعيل حفظ القوالب، شغّل ملف upgrade-templates.sql داخل SQL Editor في Supabase.':errorText(error)}
async function refreshTemplates(force=false){
  const owner=user&&db?`${db.supabaseUrl||''}:${user.id}`:'';
  if(!force&&owner===templateOwner)return;
  templateOwner=owner;const epoch=++templateEpoch;
  savedTemplates=[];chosenTemplate='';drawTemplateSelect();render();
  $('templateStatus').textContent='';
  if(!owner)return;
  $('templateStatus').textContent='جارٍ تحميل القوالب…';
  try{
    const result=[];
    for(let offset=0;;offset+=1000){const {data,error}=await db.from('inventory_templates').select('id,name,columns').order('created_at').order('id').range(offset,offset+999);if(error)throw error;result.push(...data);if(data.length<1000)break}
    if(epoch!==templateEpoch)return;
    savedTemplates=result.filter(t=>validFields(t.columns));drawTemplateSelect();render();$('templateStatus').textContent='';
  }catch(error){if(epoch===templateEpoch)$('templateStatus').textContent=templateError(error)}
}
const inventoryConnection=connection;
connection=function(){inventoryConnection();setTimeout(()=>refreshTemplates(),0)};
function drawDraft(){
  const ordered=[...draftFields,...inventoryFields.map(f=>f.key).filter(k=>!draftFields.includes(k))];
  $('templateFields').innerHTML=ordered.map(key=>{const i=draftFields.indexOf(key);return `<div class="template-field"><label><input type="checkbox" data-column="${key}" ${i>=0?'checked':''}>${fieldLabel(key)}</label><div><button type="button" data-move="${key}" data-direction="-1" ${i<=0?'disabled':''} aria-label="تقديم ${fieldLabel(key)}">↑</button><button type="button" data-move="${key}" data-direction="1" ${i<0||i===draftFields.length-1?'disabled':''} aria-label="تأخير ${fieldLabel(key)}">↓</button></div></div>`}).join('');
  $('templatePreview').textContent=draftFields.length?draftFields.map(fieldLabel).join(' ← '):'اختر عمودًا واحدًا على الأقل.';
}
$('createTemplateBtn').onclick=()=>{if(!requireUser())return;draftFields=[...chosenFields()];$('templateName').value='';$('templateError').textContent='';drawDraft();show('templateDialog');$('templateName').focus()};
$('templateFields').onchange=e=>{const key=e.target.dataset.column;if(!key||templateSaving)return;if(e.target.checked){if(!draftFields.includes(key))draftFields.push(key)}else draftFields=draftFields.filter(k=>k!==key);drawDraft()};
$('templateFields').onclick=e=>{const b=e.target.closest('[data-move]');if(!b||templateSaving)return;const i=draftFields.indexOf(b.dataset.move),j=i+Number(b.dataset.direction);if(i<0||j<0||j>=draftFields.length)return;[draftFields[i],draftFields[j]]=[draftFields[j],draftFields[i]];drawDraft()};
$('templateSelect').onchange=()=>{chosenTemplate=$('templateSelect').value;render()};
$('reloadTemplatesBtn').onclick=()=>refreshTemplates(true);
$('templateForm').onsubmit=async e=>{
  e.preventDefault();if(templateSaving)return;
  const name=$('templateName').value.trim(),columns=[...draftFields];
  if(!name||name.length>80){$('templateError').textContent='أدخل اسمًا للقالب من ١ إلى ٨٠ حرفًا.';return}
  if(!validFields(columns)){$('templateError').textContent='اختر عمودًا واحدًا على الأقل.';return}
  if(!user||!db){$('templateError').textContent='سجّل الدخول لحفظ القالب.';return}
  const owner=user.id,client=db;templateSaving=true;busy=true;$('saveTemplateBtn').disabled=true;$('templateError').textContent='';
  try{
    const {data,error}=await client.from('inventory_templates').insert({name,columns,user_id:owner}).select('id,name,columns').single();
    if(error)throw error;
    if(user?.id!==owner||db!==client)throw Error('تغير الحساب؛ افتح القوالب مجددًا.');
    ++templateEpoch;savedTemplates.push(data);chosenTemplate=data.id;drawTemplateSelect();render();$('templateDialog').close();$('templateStatus').textContent='';notice('تم حفظ القالب وتطبيقه');
  }catch(error){$('templateError').textContent=error.code==='23505'?'يوجد قالب بهذا الاسم. اختر اسمًا آخر.':templateError(error)}
  finally{templateSaving=false;busy=false;$('saveTemplateBtn').disabled=false}
};
function sumCount(values){
  const entered=values.filter(v=>v!==null&&v!==undefined&&v!=='');
  if(!entered.length)return null;
  const total=entered.reduce((sum,v)=>{const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('توجد كمية غير صالحة للتجميع.');return sum+BigInt(n.toFixed(6).replace('.',''))},0n);
  return Number(total)/1000000;
}
function aggregateByCode(rows){
  const groups=new Map();
  rows.forEach((row,index)=>{const code=String(row.code??'').trim();if(!code)throw Error(`الصنف رقم ${index+1} بدون كود؛ لا يمكن تجميعه.`);if(!groups.has(code))groups.set(code,[]);groups.get(code).push(row)});
  return [...groups].map(([code,group])=>({code,name:[...new Set(group.map(r=>r.name).filter(Boolean))].join(' / '),model:[...new Set(group.map(r=>r.model).filter(Boolean))].join(' / ')||null,count1:sumCount(group.map(r=>r.count1)),count2:sumCount(group.map(r=>r.count2))}));
}
function exportInventory(mode){
  if(!items.length)throw Error('لا توجد أصناف للتصدير.');
  if(!['all','code'].includes(mode))throw Error('نوع التصدير غير صالح.');
  const keys=inventoryFields.map(f=>f.key);
  const data=mode==='code'?aggregateByCode(items):items;
  
  const suffix=mode==='code'?'مجمّع-حسب-الكود':'كامل';
  downloadExcel(data.map(row=>keys.map(key=>row[key]??null)),`${(active?.name||'جرد').replace(/[\\/:*?"<>|]/g,'-')}-${suffix}.xlsx`,keys.map(fieldLabel));
  return data.length;
}
$('exportBtn').onclick=()=>{if(items.length)show('exportDialog')};
$('exportOptions').onclick=e=>{const b=e.target.closest('[data-export]');if(!b)return;try{const n=exportInventory(b.dataset.export);$('exportDialog').close();notice(`تم تصدير ${fmt(n)} صف`)}catch(error){$('exportError').textContent=errorText(error)}};
drawTemplateSelect();render();refreshTemplates();
