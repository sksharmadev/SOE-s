
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let state={data:null,editingId:null};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(url,options={}){
  const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'Something went wrong.');
  return d
}

function notice(msg,error=false){
  const n=$('#notice');
  n.textContent=msg;
  n.className='notice '+(error?'error':'success');
  n.style.display='block';
  window.clearTimeout(notice.timer);
  notice.timer=setTimeout(()=>{n.style.display='none'},5000)
}

function showApp(on){
  $('#loginView').hidden=on;
  $('#dashboard').hidden=!on;
  $('#logoutBtn').hidden=!on;
  $('#adminName').textContent=window.adminUser||'Administrator'
}

function goTab(tab){
  $$('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.panel-view').forEach(p=>p.classList.toggle('active',p.id===`tab-${tab}`));
  $('#pageTitle').textContent=({overview:'Dashboard overview',content:'Website content',products:'Product categories',messages:'Customer enquiries'})[tab]||'Dashboard';
  if(tab==='content')fillSettings();
  if(tab==='products')renderProducts();
  if(tab==='messages')loadMessages();
}

$$('.side-link').forEach(b=>b.addEventListener('click',()=>goTab(b.dataset.tab)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>goTab(b.dataset.go)));

async function refreshData(){
  state.data=await api('/api/admin/data');
  const d=state.data;
  $('#statProducts').textContent=d.products.length;
  $('#statServices').textContent=d.services.length;
  $('#statMessages').textContent=d.messages.length;
  $('#statUnread').textContent=d.messages.filter(m=>!m.read).length;
  $('#messageCount').textContent=d.messages.filter(m=>!m.read).length;
}

async function start(){
  try{
    const me=await api('/api/admin/me');
    window.adminUser=me.username;
    showApp(true);
    await refreshData();
    goTab('overview')
  }catch{
    showApp(false)
  }
}

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const b=e.currentTarget.querySelector('button');
  b.disabled=true;
  try{
    const result=await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});
    window.adminUser=result.username;
    showApp(true);
    await refreshData();
    goTab('overview');
    notice('Signed in successfully.')
  }catch(err){
    notice(err.message,true)
  }finally{
    b.disabled=false
  }
});

$('#logoutBtn').addEventListener('click',async()=>{
  try{
    await api('/api/admin/logout',{method:'POST',body:'{}'});
    showApp(false);
    $('#loginForm').reset();
    notice('You have signed out.')
  }catch(e){
    notice(e.message,true)
  }
});

function fillSettings(){
  if(!state.data)return;
  const f=$('#settingsForm');
  Object.entries(state.data.settings).forEach(([k,v])=>{
    if(f.elements[k])f.elements[k].value=v||''
  })
}

$('#settingsForm').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});
    await refreshData();
    notice('Website content saved. Refresh the public site to see your changes.')
  }catch(err){
    notice(err.message,true)
  }
});

function renderProducts(){
  const ps=state.data?.products||[];
  $('#productsTable').innerHTML=ps.length?`<table><thead><tr><th>Product</th><th>Category</th><th>Description</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td><td>${esc(p.description)}</td><td><div class="table-actions"><button class="small-btn" data-edit="${esc(p.id)}">Edit</button><button class="small-btn danger" data-delete="${esc(p.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No product categories yet. Use “Add product” to create one.</div>';
  $$('[data-edit]').forEach(b=>b.addEventListener('click',()=>editProduct(b.dataset.edit)));
  $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteProduct(b.dataset.delete)))
}

function openProduct(){
  state.editingId=null;
  $('#productForm').reset();
  $('#productForm').elements.id.value='';
  $('#productEditorTitle').textContent='Add a product';
  $('#productEditor').hidden=false;
  $('#productEditor').scrollIntoView({behavior:'smooth',block:'start'})
}

function editProduct(id){
  const p=state.data.products.find(x=>x.id===id);
  if(!p)return;
  state.editingId=id;
  const f=$('#productForm');
  Object.entries(p).forEach(([k,v])=>{
    if(f.elements[k])f.elements[k].value=v||''
  });
  $('#productEditorTitle').textContent='Edit product';
  $('#productEditor').hidden=false;
  $('#productEditor').scrollIntoView({behavior:'smooth',block:'start'})
}

$('#addProductBtn').addEventListener('click',openProduct);
$('#cancelProduct').addEventListener('click',()=>$('#productEditor').hidden=true);

$('#productForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.currentTarget));
  delete d.id;
  try{
    if(state.editingId)await api('/api/admin/products/'+encodeURIComponent(state.editingId),{method:'PUT',body:JSON.stringify(d)});
    else await api('/api/admin/products',{method:'POST',body:JSON.stringify(d)});
    $('#productEditor').hidden=true;
    await refreshData();
    renderProducts();
    notice('Product saved.')
  }catch(err){
    notice(err.message,true)
  }
});

async function deleteProduct(id){
  const p=state.data.products.find(x=>x.id===id);
  if(!p||!confirm(`Delete “${p.name}”? This cannot be undone.`))return;
  try{
    await api('/api/admin/products/'+encodeURIComponent(id),{method:'DELETE'});
    await refreshData();
    renderProducts();
    notice('Product deleted.')
  }catch(e){
    notice(e.message,true)
  }
}

async function loadMessages(){
  try{
    const messages=await api('/api/admin/messages');
    state.data.messages=messages;
    $('#statMessages').textContent=messages.length;
    $('#statUnread').textContent=messages.filter(m=>!m.read).length;
    $('#messageCount').textContent=messages.filter(m=>!m.read).length;
    $('#messagesList').innerHTML=messages.length?messages.map(m=>`<article class="message-card"><div class="message-top"><div><h3>${esc(m.name)} ${m.subject?'— '+esc(m.subject):''}</h3><p><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></p></div><span class="status-tag ${m.read?'read':''}">${m.read?'READ':'NEW'}</span></div><p class="message-body">${esc(m.message)}</p><div class="message-top"><span class="message-meta">${new Date(m.createdAt).toLocaleString()}</span>${m.read?'':`<button class="small-btn" data-read="${esc(m.id)}">Mark as read</button>`}</div></article>`).join(''):'<div class="empty">No enquiries received yet. Messages sent from the public contact form will appear here.</div>';
    $$('[data-read]').forEach(b=>b.addEventListener('click',async()=>{
      try{
        await api('/api/admin/messages/'+encodeURIComponent(b.dataset.read),{method:'PATCH',body:JSON.stringify({read:true})});
        await refreshData();
        await loadMessages()
      }catch(e){
        notice(e.message,true)
      }
    }))
  }catch(e){
    notice(e.message,true)
  }
}

$('#refreshMessages').addEventListener('click',loadMessages);
start();
