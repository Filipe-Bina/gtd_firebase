// ============================================================
// GTD-ABILITY TECNOLOGIA — Firebase Version
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvUxxXl3EDwNNXMbVzEn7IAO4MfbnnN_A",
  authDomain: "gtd-ability-tecnologia.firebaseapp.com",
  projectId: "gtd-ability-tecnologia",
  storageBucket: "gtd-ability-tecnologia.firebasestorage.app",
  messagingSenderId: "910374870725",
  appId: "1:910374870725:web:930193421bae8c096b1aac"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

// ── Request types ─────────────────────────────────────────────
const requestTypes = [
  { key:"combustivel",        title:"Solicitar Combustível",          subtitle:"Enviar RE para liberação de combustível.",                          label:"RE do técnico",                           placeholder:"Digite seu RE",                                                     button:"Enviar solicitação", success:"Solicitação de combustível enviada para o administrador." },
  { key:"interface",          title:"Solicitar Interface",            subtitle:"Informar a ordem de serviço para criação da interface.",            label:"Informações da ordem de serviço",          placeholder:"Descreva a OS e os dados necessários para criar a interface",         button:"Enviar solicitação", success:"Solicitação de interface enviada para o administrador." },
  { key:"manobra",            title:"Solicitar Manobra",              subtitle:"Informar os dados operacionais para execução da manobra.",          label:"Informações da manobra técnica",           placeholder:"Descreva detalhadamente a ordem e dados da manobra solicitada",       button:"Enviar solicitação", success:"Solicitação de manobra enviada para o administrador." },
  { key:"melhoria",           title:"Solicitar Melhoria",             subtitle:"Registrar uma sugestão ou necessidade de melhoria.",               label:"Informações da melhoria",                  placeholder:"Descreva a melhoria desejada",                                       button:"Enviar solicitação", success:"Solicitação de melhoria enviada para o administrador." },
  { key:"manutencao_veicular",title:"Solicitar Manutenção Veicular",  subtitle:"Pedir validação para manutenção do veículo.",                      label:"Manutenção a ser realizada",               placeholder:"Descreva o problema, placa e manutenção necessária",                 button:"Enviar solicitação", success:"Solicitação de manutenção veicular enviada para validação." },
  { key:"ferramental",        title:"Solicitar Ferramental",          subtitle:"Troca ou requisição de ferramenta.",                               label:"Troca ou requisição de ferramental",       placeholder:"Informe a ferramenta e o motivo",                                    button:"Enviar solicitação", success:"Solicitação de ferramental enviada para o administrador." },
  { key:"equipamento_ti",     title:"Solicitar Equipamento TI",       subtitle:"Troca ou requisição de equipamento de TI.",                        label:"Troca ou requisição de equipamento de TI", placeholder:"Informe o equipamento, patrimônio se houver, e motivo",              button:"Enviar solicitação", success:"Solicitação de equipamento de TI enviada para o administrador." },
  { key:"correcao_excecao",   title:"Solicitar Mudança de Exceção",   subtitle:"Enviar correção necessária e motivo.",                             label:"Correção e motivo",                        placeholder:"Descreva a correção de exceção e o motivo",                          button:"Enviar solicitação", success:"Solicitação de correção enviada para validação." }
];
const technicianActions = [
  ...requestTypes,
  { key:"script",       title:"Script",          subtitle:"Buscar script pelo modelo do roteador." },
  { key:"codigo_baixa", title:"Código de Baixa", subtitle:"Abrir PDF com os códigos." }
];

// ── State ─────────────────────────────────────────────────────
const appEl = document.querySelector("#app");
let session        = readSession();
let authMode       = "login";
let adminTabActive = "solicitacoes";

// listeners realtime
let unsubReqAdmin    = null;
let unsubReqTech     = null;
let unsubAnnounce    = null;
let unsubEscala      = null;
let _prevReqCount    = null;
let _prevAnnCount    = null;
let _initialized     = false;

// ── Boot ──────────────────────────────────────────────────────
render();

// ── Session ───────────────────────────────────────────────────
function readSession()     { try { return JSON.parse(localStorage.getItem("gtd_session")); } catch { return null; } }
function saveSession(d)    { session = d; localStorage.setItem("gtd_session", JSON.stringify(d)); }
function clearSession()    { session = null; localStorage.removeItem("gtd_session"); stopAllListeners(); }
function stopAllListeners(){ [unsubReqAdmin, unsubReqTech, unsubAnnounce, unsubEscala].forEach(u => u && u()); unsubReqAdmin=unsubReqTech=unsubAnnounce=unsubEscala=null; _initialized=false; _prevReqCount=_prevAnnCount=null; }

// ── Sound ─────────────────────────────────────────────────────
function playNotificationSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type==="high") { osc.type="sine"; osc.frequency.setValueAtTime(880,ctx.currentTime); gain.gain.setValueAtTime(0.3,ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.15); }
    else               { osc.type="triangle"; osc.frequency.setValueAtTime(587,ctx.currentTime); gain.gain.setValueAtTime(0.2,ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.25); }
  } catch(e) {}
}

// ── Toast popup ───────────────────────────────────────────────
function showToast(msg, type="info") {
  const colors = { info:"#4f46e5", success:"#10b981", warning:"#f59e0b", danger:"#ef4444" };
  const icons  = { info:"🔔", success:"✅", warning:"⚠️", danger:"❌" };
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;background:${colors[type]};color:#fff;padding:14px 20px;border-radius:12px;font-size:0.92rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-width:340px;line-height:1.4;display:flex;align-items:flex-start;gap:10px;animation:slideIn 0.3s ease;`;
  t.innerHTML = `<span style="font-size:1.2rem;flex-shrink:0;">${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  if (!document.querySelector("#toast-style")) {
    const s = document.createElement("style");
    s.id = "toast-style";
    s.textContent = `@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}`;
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation="slideOut 0.3s ease forwards"; setTimeout(()=>t.remove(), 300); }, 4500);
}

// ── Render router ─────────────────────────────────────────────
function render() {
  if (!session) { renderAuth(); return; }
  if (session.role==="administrador"||session.role==="administrador_master") renderAdminHome();
  else renderTechnicianHome();
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════
function renderAuth() {
  appEl.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card">
        <header class="auth-header">
          <div class="brand-badge">GTD</div>
          <h1>GTD-Ability Tecnologia</h1>
          <p class="brand-sub">Sistema de Gestão Operacional Integrado</p>
        </header>
        <nav class="auth-tabs" role="tablist">
          <button class="tab-btn ${authMode==="login"?"active":""}" id="tab-login">Login</button>
          <button class="tab-btn ${authMode==="register"?"active":""}" id="tab-register">Primeiro Acesso</button>
        </nav>
        <div class="auth-forms-container">
          <form class="form auth-form ${authMode==="login"?"show":""}" id="form-login">
            <label>Identificador (RE ou CPF)<input id="login-re" required inputmode="numeric" placeholder="Apenas números" /></label>
            <label>Senha<input id="login-password" type="password" required placeholder="Sua senha" /></label>
            <div class="message" id="login-msg"></div>
            <button class="primary-btn" type="submit">Entrar no Sistema</button>
          </form>
          <form class="form auth-form ${authMode==="register"?"show":""}" id="form-register">
            <p class="helper">Insira seu RE/CPF autorizado para validar a conta e escolha seu e-mail pessoal ou corporativo válido.</p>
            <label>RE ou CPF Autorizado<input id="register-re" required inputmode="numeric" placeholder="Apenas números da sua lista" /></label>
            <label>E-mail Pessoal ou de Trabalho<input id="register-email" type="email" required placeholder="seu@email.com" /></label>
            <label>Crie sua Senha (mín. 6 caracteres)<input id="register-password" type="password" required placeholder="Mínimo 6 caracteres" /></label>
            <div class="message" id="register-msg"></div>
            <button class="primary-btn" type="submit">Cadastrar e Ativar</button>
          </form>
        </div>
      </div>
    </section>`;
  appEl.querySelector("#tab-login").addEventListener("click",    () => { authMode="login";    renderAuth(); });
  appEl.querySelector("#tab-register").addEventListener("click", () => { authMode="register"; renderAuth(); });
  const fLogin=appEl.querySelector("#form-login"), fReg=appEl.querySelector("#form-register");
  if(fLogin) fLogin.addEventListener("submit", handleLoginSubmit);
  if(fReg)   fReg.addEventListener("submit",   handleRegisterSubmit);
}

async function handleLoginSubmit(e) {
  e.preventDefault(); const form=e.currentTarget;
  const id=appEl.querySelector("#login-re").value.trim().replace(/[^0-9]/g,"");
  const pw=appEl.querySelector("#login-password").value;
  const msg=appEl.querySelector("#login-msg");
  setFormBusy(form,true);
  try {
    const ud=await getDoc(doc(db,"users",id));
    if(!ud.exists()){showMessage(msg,"error","Identificador não encontrado. Faça o Primeiro Acesso.");setFormBusy(form,false);return;}
    const u=ud.data();
    await signInWithEmailAndPassword(auth,u.email,pw);
    saveSession({re:id,name:u.name,role:u.role,email:u.email});
    render();
  } catch(err){ showMessage(msg,"error",err.code==="auth/invalid-credential"?"Senha incorreta.":err.message); }
  setFormBusy(form,false);
}

async function handleRegisterSubmit(e) {
  e.preventDefault(); const form=e.currentTarget;
  const id=appEl.querySelector("#register-re").value.trim().replace(/[^0-9]/g,"");
  const email=appEl.querySelector("#register-email").value.trim().toLowerCase();
  const pw=appEl.querySelector("#register-password").value;
  const msg=appEl.querySelector("#register-msg");
  setFormBusy(form,true);
  try {
    const [td,ad]=await Promise.all([getDoc(doc(db,"allowed_technicians",id)),getDoc(doc(db,"allowed_admins",id))]);
    if(!td.exists()&&!ad.exists()){showMessage(msg,"error","RE/CPF não autorizado para cadastro na empresa.");setFormBusy(form,false);return;}
    const ex=await getDoc(doc(db,"users",id));
    if(ex.exists()){showMessage(msg,"error","Este identificador já possui cadastro. Use a aba Login.");setFormBusy(form,false);return;}
    const wd=td.exists()?td.data():ad.data();
    const role=td.exists()?(wd.role||"tecnico"):(wd.role||"administrador");
    const cred=await createUserWithEmailAndPassword(auth,email,pw);
    await setDoc(doc(db,"users",id),{uid:cred.user.uid,re:id,name:wd.name,role,email,createdAt:serverTimestamp()});
    saveSession({re:id,name:wd.name,role,email});
    render();
  } catch(err){
    if(err.code==="auth/email-already-in-use") showMessage(msg,"error","E-mail já em uso. Tente outro ou faça login.");
    else showMessage(msg,"error",err.message);
  }
  setFormBusy(form,false);
}

// ════════════════════════════════════════════════════════════
// TOPBAR
// ════════════════════════════════════════════════════════════
function topbar() {
  const displayRole=session.role.toUpperCase().replace("_"," ");
  return `<header class="topbar"><div class="topbar-inner">
    <div class="app-title"><span class="mini-mark">GTD</span> Ability Tecnologia</div>
    <div class="user-chip">
      <strong>${escapeHtml(session.name)}</strong>
      <span>ID: ${escapeHtml(session.re)} • ${escapeHtml(displayRole)}</span>
      <button class="ghost-btn" id="logout" style="width:auto;padding:4px 8px;">Sair</button>
    </div>
  </div></header>`;
}
function attachLogout(){
  const btn=document.querySelector("#logout");
  if(btn) btn.addEventListener("click",async()=>{ await signOut(auth); clearSession(); render(); });
}

// ════════════════════════════════════════════════════════════
// REALTIME LISTENERS
// ════════════════════════════════════════════════════════════
function startRealtimeListeners() {
  if(unsubReqAdmin||unsubReqTech||unsubAnnounce) return;

  // Admin: ouve novas solicitações
  if(session.role==="administrador"||session.role==="administrador_master") {
    const qReq=query(collection(db,"requests"),where("status","==","pendente"));
    unsubReqAdmin=onSnapshot(qReq, snap => {
      if(!_initialized){ _prevReqCount=snap.size; return; }
      if(snap.size>(_prevReqCount??0)) {
        const novo=snap.docs[snap.docs.length-1]?.data();
        playNotificationSound("high");
        showToast(`🔔 NOVA SOLICITAÇÃO de ${novo?.technician_name||"técnico"}: ${novo?.title||""}`, "warning");
        const container=document.querySelector("#admin-panel-content");
        if(container&&adminTabActive==="solicitacoes") renderAdminRequests();
      }
      _prevReqCount=snap.size;
    });
  }

  // Técnico: ouve respostas às suas solicitações
  if(session.role==="tecnico") {
    const qTech=query(collection(db,"requests"),where("technician_re","==",session.re),where("status","!=","arquivado"),orderBy("status"),orderBy("createdAt","desc"));
    unsubReqTech=onSnapshot(qTech, snap => {
      if(!_initialized) return;
      snap.docChanges().forEach(change => {
        if(change.type==="modified") {
          const d=change.doc.data();
          if(d.status==="ok"||d.status==="nao_ok") {
            playNotificationSound("low");
            showToast(`✉️ Solicitação "${d.title}" foi ${d.status==="ok"?"APROVADA":"RECUSADA"}.`, d.status==="ok"?"success":"danger");
            loadRequests();
          }
        }
      });
    });

    // Técnico: ouve novos avisos
    const qAnn=query(collection(db,"announcements"),orderBy("createdAt","desc"));
    unsubAnnounce=onSnapshot(qAnn, snap => {
      if(!_initialized){ _prevAnnCount=snap.size; return; }
      const news=snap.docs.filter((_,i)=>i<(snap.size-(_prevAnnCount??snap.size))).map(d=>({id:d.id,...d.data()}));
      news.filter(a=>a.target_type==="todos"||a.target_re===session.re).forEach(a=>{
        playNotificationSound("low");
        showToast(`📢 Novo aviso: ${a.content?.substring(0,80)}...`,"info");
        loadRecentAnnouncements();
      });
      _prevAnnCount=snap.size;
    });

    // Técnico: ouve novas escalas
    const qEsc=query(collection(db,"escala_servico"),where("tecnico_re","==",session.re));
    unsubEscala=onSnapshot(qEsc, snap => {
      if(!_initialized) return;
      snap.docChanges().forEach(change=>{
        if(change.type==="added"){
          const d=change.doc.data();
          playNotificationSound("high");
          showToast(`📅 Nova escala de plantão: ${formatOnlyDate(d.data_plantao)} das ${d.horario_inicio?.substring(0,5)} às ${d.horario_fim?.substring(0,5)}`,"success");
          loadTechnicianEscala();
        }
      });
    });
  }

  setTimeout(()=>{ _initialized=true; }, 1500);
}

// ════════════════════════════════════════════════════════════
// ÁREA DO TÉCNICO
// ════════════════════════════════════════════════════════════
function renderTechnicianHome() {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <div id="mural-avisos-ticker"><div class="ticker-inner-wrapper"><div id="ticker-container-area">Carregando avisos operacionais...</div></div></div>
      <main class="content">
        <section class="panel" style="margin-bottom:24px;background:#f0fdf4;border-color:#bbf7d0;">
          <h3 style="margin:0 0 6px;color:#166534;font-size:1.1rem;display:flex;align-items:center;gap:8px;">📅 Minha Escala de Plantão</h3>
          <div id="technician-escala-workarea" style="font-size:0.95rem;color:#14532d;">Buscando seus plantões ativos...</div>
        </section>
        <div class="section-head"><div><h2>Painel do Técnico</h2><p>Envie solicitações ou consulte scripts operacionais.</p></div></div>
        <section class="grid">${technicianActions.map(actionTile).join("")}</section>
        <section class="panel" style="margin-top:24px;">
          <div class="section-head">
            <div><h2>Minhas solicitações em aberto</h2><p>Acompanhe e valide o retorno do administrador.</p></div>
            <button class="secondary-btn" id="refresh-requests" style="width:auto;">Atualizar</button>
          </div>
          <div id="request-list" class="request-list"></div>
        </section>
      </main>
    </section>`;
  attachLogout();
  document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>openAction(b.dataset.action)));
  document.querySelector("#refresh-requests").addEventListener("click", loadRequests);
  loadRequests(); loadRecentAnnouncements(); loadTechnicianEscala();
  startRealtimeListeners();
}

async function loadTechnicianEscala() {
  const area=document.querySelector("#technician-escala-workarea"); if(!area) return;
  try {
    const q=query(collection(db,"escala_servico"),where("tecnico_re","==",session.re),orderBy("data_plantao","asc"));
    const snap=await getDocs(q);
    const today=new Date(); today.setHours(0,0,0,0);
    const active=snap.docs.map(d=>d.data()).filter(e=>new Date(e.data_plantao+"T00:00:00")>=today);
    if(!active.length){area.innerHTML="Você não possui nenhuma escala de plantão agendada por enquanto.";return;}
    area.innerHTML=`<div style="display:grid;gap:8px;margin-top:6px;">${active.map(sc=>`
      <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <span>🗓️ <strong>Dia:</strong> ${formatOnlyDate(sc.data_plantao)} | ⏰ <strong>Horário:</strong> ${sc.horario_inicio?.substring(0,5)} às ${sc.horario_fim?.substring(0,5)}</span>
        <span>👤 <strong>Supervisor:</strong> ${escapeHtml(sc.supervisor_plantao)}</span>
      </div>`).join("")}</div>`;
  } catch(err){area.innerHTML="Erro ao carregar grade de plantões.";}
}

async function loadRecentAnnouncements() {
  const area=document.querySelector("#ticker-container-area"); if(!area) return;
  try {
    const snap=await getDocs(query(collection(db,"announcements"),orderBy("createdAt","desc")));
    const all=snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.target_type==="todos"||a.target_re===session.re);
    if(!all.length){area.innerHTML="<div>📢 Nenhum aviso importante pendente na mesa hoje.</div>";return;}
    const acks=await getDocs(query(collection(db,"announcement_acknowledgments"),where("technician_re","==",session.re)));
    const readIds=acks.docs.map(d=>d.data().announcement_id);
    const unread=all.filter(a=>!readIds.includes(a.id));
    if(!unread.length){area.innerHTML="<div>✅ Você já visualizou todos os comunicados operacionais recentes.</div>";return;}
    area.innerHTML=unread.map(a=>{
      const prefix=a.target_type==="especifico"?"🔒 [Aviso Direcionado]":"📢 [Aviso Geral]";
      return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.6);padding:8px 12px;border-radius:6px;border:1px solid rgba(133,100,4,0.15);width:100%;">
        <span style="line-height:1.4;"><strong>${prefix}</strong> ${escapeHtml(a.content)} <small style="font-weight:normal;color:var(--muted);margin-left:6px;">(${formatDate(a.createdAt?.toDate?.()??a.createdAt)})</small></span>
        <button class="primary-btn" onclick="handleAckAnnouncement('${a.id}')" style="min-height:24px;padding:2px 8px;font-size:0.75rem;background:#d97706;width:auto;font-weight:700;">Ok, Lido</button>
      </div>`;
    }).join("");
  } catch(err){area.innerHTML="<div>Erro ao carregar avisos.</div>";}
}

window.handleAckAnnouncement=async function(id){
  try{ await addDoc(collection(db,"announcement_acknowledgments"),{announcement_id:id,technician_re:session.re,createdAt:serverTimestamp()}); loadRecentAnnouncements(); showToast("Aviso marcado como lido.","success"); }
  catch(err){ alert(`Erro: ${err.message}`); }
};

function actionTile(a){ return `<button class="tile" data-action="${a.key}"><div>${escapeHtml(a.title)}<span>${escapeHtml(a.subtitle)}</span></div><span class="icon">${iconFor(a.key)}</span></button>`; }
function iconFor(key){ const m={combustivel:"⛽",interface:"↔",manobra:"🔀",melhoria:"+",manutencao_veicular:"⚙",ferramental:"◧",equipamento_ti:"▣",correcao_excecao:"!",script:"{ }",codigo_baixa:"PDF"}; return m[key]||"•"; }
function openAction(key){ if(key==="script"){renderScriptView();return;} if(key==="codigo_baixa"){renderPdfView();return;} renderRequestForm(requestTypes.find(i=>i.key===key)); }

function renderRequestForm(type){
  appEl.innerHTML=`<section class="app-shell">${topbar()}<main class="content">
    <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
    <section class="panel"><form class="form" id="request-form">
      <div><h2>${escapeHtml(type.title)}</h2><p class="helper">${escapeHtml(type.subtitle)}</p></div>
      <label>${escapeHtml(type.label)}
        ${type.key==="combustivel"?`<input name="details" inputmode="numeric" required value="${escapeHtml(session.re)}" />`:`<textarea name="details" required placeholder="${escapeHtml(type.placeholder)}"></textarea>`}
      </label>
      <div class="message" id="request-message"></div>
      <button class="primary-btn" type="submit">${escapeHtml(type.button)}</button>
    </form></section>
  </main></section>`;
  document.querySelector("#back-home").addEventListener("click",renderTechnicianHome);
  attachLogout();
  document.querySelector("#request-form").addEventListener("submit",(e)=>submitRequest(e,type));
}

async function submitRequest(event,type){
  event.preventDefault(); const form=event.currentTarget;
  const details=String(new FormData(form).get("details")).trim();
  const message=document.querySelector("#request-message");
  setFormBusy(form,true);
  try {
    await addDoc(collection(db,"requests"),{technician_re:session.re,technician_name:session.name,type:type.key,title:type.title,details,status:"pendente",admin_response:"",createdAt:serverTimestamp()});
    form.reset(); showMessage(message,"ok",type.success);
    showToast(type.success,"success");
  } catch(err){ showMessage(message,"error",err.message); }
  setFormBusy(form,false);
}

async function loadRequests(){
  const list=document.querySelector("#request-list"); if(!list) return;
  list.innerHTML=`<div class="empty">Carregando solicitações...</div>`;
  try {
    const q=query(collection(db,"requests"),where("technician_re","==",session.re),where("status","!=","arquivado"),orderBy("status"),orderBy("createdAt","desc"));
    const snap=await getDocs(q);
    if(snap.empty){list.innerHTML=`<div class="empty">Nenhuma solicitação em aberto.</div>`;return;}
    list.innerHTML=snap.docs.map(d=>{
      const item={id:d.id,...d.data()};
      const isAns=item.status==="ok"||item.status==="nao_ok";
      const bc=item.status==="ok"?"done":item.status==="nao_ok"?"denied":"pending";
      return `<article class="request-item" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;">
        <div style="flex:1;">
          <strong style="color:var(--text);font-size:1rem;">${escapeHtml(item.title)}</strong>
          <p style="margin:4px 0;color:var(--muted);font-size:0.9rem;">${escapeHtml(item.admin_response||"Aguardando posicionamento do administrador.")}</p>
          <small style="color:var(--muted);font-size:0.8rem;">${item.createdAt?formatDate(item.createdAt.toDate()):""}</small>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <span class="badge ${bc}">${escapeHtml(labelStatus(item.status))}</span>
          ${isAns?`<button class="primary-btn" onclick="handleArchiveRequest('${item.id}')" style="min-height:28px;padding:2px 10px;font-size:0.8rem;background:var(--muted);width:auto;">Ciente / OK</button>`:""}
        </div>
      </article>`;
    }).join("");
  } catch(err){list.innerHTML=`<div class="empty">${err.message}</div>`;}
}

window.handleArchiveRequest=async function(id){
  try{ await updateDoc(doc(db,"requests",id),{status:"arquivado"}); loadRequests(); showToast("Solicitação arquivada.","success"); }
  catch(err){ alert(`Erro: ${err.message}`); }
};

function renderScriptView(){
  appEl.innerHTML=`<section class="app-shell">${topbar()}<main class="content">
    <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
    <section class="panel"><form class="form" id="script-form">
      <div><h2>Buscar Script</h2><p class="helper">Digite o modelo do roteador para pesquisa.</p></div>
      <label>Modelo do Roteador<input name="model" required placeholder="Ex.: Huawei" /></label>
      <button class="primary-btn" type="submit">Buscar</button>
    </form><div id="script-result" class="script-result"></div></section>
  </main></section>`;
  document.querySelector("#back-home").addEventListener("click",renderTechnicianHome);
  attachLogout();
  document.querySelector("#script-form").addEventListener("submit",searchScript);
}

async function searchScript(event){
  event.preventDefault();
  const result=document.querySelector("#script-result");
  const model=String(new FormData(event.currentTarget).get("model")).trim().toLowerCase();
  result.innerHTML=`<div class="empty">Buscando...</div>`;
  try {
    const snap=await getDocs(collection(db,"scripts"));
    const found=snap.docs.map(d=>({id:d.id,...d.data()})).find(s=>s.router_model?.toLowerCase().includes(model));
    if(!found){result.innerHTML=`<div class="empty">Não encontrado.</div>`;return;}
    result.innerHTML=`<h3>${escapeHtml(found.router_model)}</h3><pre class="script-box">${escapeHtml(found.content)}</pre>`;
  } catch(err){result.innerHTML=`<div class="empty">${err.message}</div>`;}
}

function renderPdfView(){
  appEl.innerHTML=`<section class="app-shell">${topbar()}<main class="content">
    <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
    <section class="panel"><h2>Código de Baixa</h2><iframe class="pdf-frame" src="assets/codigos-baixa.pdf"></iframe></section>
  </main></section>`;
  document.querySelector("#back-home").addEventListener("click",renderTechnicianHome);
  attachLogout();
}

// ════════════════════════════════════════════════════════════
// ÁREA DO ADMIN
// ════════════════════════════════════════════════════════════
function renderAdminHome(){
  appEl.innerHTML=`<section class="app-shell">${topbar()}<main class="content">
    <div class="section-head"><div><h2>Painel Administrativo</h2><p>Gerencie solicitações, usuários e comunicados.</p></div></div>
    <nav class="tabs" style="margin-bottom:24px;">
      <button class="tab ${adminTabActive==="solicitacoes"?"active":""}" id="tab-req">Solicitações</button>
      <button class="tab ${adminTabActive==="escala"?"active":""}" id="tab-escala">Escala de Serviço</button>
      <button class="tab ${adminTabActive==="scripts"?"active":""}" id="tab-scripts">Scripts</button>
      <button class="tab ${adminTabActive==="avisos"?"active":""}" id="tab-avisos">Avisos</button>
      <button class="tab ${adminTabActive==="usuarios"?"active":""}" id="tab-users">Usuários</button>
    </nav>
    <div id="admin-panel-content"></div>
  </main></section>`;
  attachLogout();
  document.querySelector("#tab-req").addEventListener("click",    ()=>{adminTabActive="solicitacoes";renderAdminHome();});
  document.querySelector("#tab-escala").addEventListener("click", ()=>{adminTabActive="escala";       renderAdminHome();});
  document.querySelector("#tab-scripts").addEventListener("click",()=>{adminTabActive="scripts";      renderAdminHome();});
  document.querySelector("#tab-avisos").addEventListener("click", ()=>{adminTabActive="avisos";       renderAdminHome();});
  document.querySelector("#tab-users").addEventListener("click",  ()=>{adminTabActive="usuarios";     renderAdminHome();});
  if(adminTabActive==="solicitacoes") renderAdminRequests();
  else if(adminTabActive==="escala")  renderAdminEscala();
  else if(adminTabActive==="scripts") renderAdminScripts();
  else if(adminTabActive==="avisos")  renderAdminAnnouncementsForm();
  else if(adminTabActive==="usuarios")renderAdminUsersForm();
  startRealtimeListeners();
}

// ── Admin: Solicitações ───────────────────────────────────────
async function renderAdminRequests(){
  const container=document.querySelector("#admin-panel-content"); if(!container) return;
  container.innerHTML=`<div class="empty">Carregando solicitações...</div>`;
  try {
    const q=query(collection(db,"requests"),where("status","!=","arquivado"),orderBy("status"),orderBy("createdAt","desc"));
    const snap=await getDocs(q);
    const all=snap.docs.map(d=>({id:d.id,...d.data()}));
    const pending=all.filter(r=>r.status==="pendente");
    const answered=all.filter(r=>r.status==="ok"||r.status==="nao_ok");
    const kanbanCard=(item)=>`<div class="kanban-card">
      <div><strong>${escapeHtml(item.title)}</strong><span style="font-size:0.82rem;color:var(--muted);display:block;">RE ${escapeHtml(item.technician_re)} — ${escapeHtml(item.technician_name)}</span></div>
      <p style="font-size:0.88rem;color:var(--muted);margin:0;">${escapeHtml(item.details||"")}</p>
      <small style="color:var(--muted);">${item.createdAt?formatDate(item.createdAt.toDate()):""}</small>
      ${item.status==="pendente"?`
        <div style="display:grid;gap:8px;">
          <textarea id="resp-${item.id}" placeholder="Resposta ao técnico (obrigatório)" style="border:1px solid var(--line);border-radius:6px;padding:8px;font:inherit;resize:vertical;" rows="2"></textarea>
          <div style="display:flex;gap:8px;">
            <button class="primary-btn" style="background:var(--success);width:auto;flex:1;" onclick="handleAdminAction('${item.id}','ok')">✔ Aprovar</button>
            <button class="primary-btn" style="background:var(--danger);width:auto;flex:1;"  onclick="handleAdminAction('${item.id}','nao_ok')">✘ Recusar</button>
          </div>
        </div>`:`<span class="badge ${item.status==="ok"?"done":"denied"}">${labelStatus(item.status)}</span><p style="font-size:0.85rem;margin:0;">${escapeHtml(item.admin_response||"")}</p>`}
    </div>`;
    container.innerHTML=`<div class="kanban-board">
      <div class="kanban-column"><div class="kanban-column-header">🕐 Pendentes <span>${pending.length}</span></div>${pending.length?pending.map(kanbanCard).join(""):'<div class="empty">Nenhuma pendente.</div>'}</div>
      <div class="kanban-column"><div class="kanban-column-header">✅ Respondidas <span>${answered.length}</span></div>${answered.length?answered.map(kanbanCard).join(""):'<div class="empty">Nenhuma respondida.</div>'}</div>
      <div class="kanban-column"><div class="kanban-column-header">📊 Resumo</div><div style="font-size:0.9rem;padding:8px 0;"><p><strong>${all.length}</strong> solicitações em aberto</p><p><strong>${pending.length}</strong> aguardando resposta</p></div></div>
    </div>`;
  } catch(err){container.innerHTML=`<div class="empty">${err.message}</div>`;}
}

window.handleAdminAction=async function(id,status){
  const resp=document.querySelector(`#resp-${id}`)?.value?.trim();
  if(!resp){alert("Digite uma resposta antes de aprovar ou recusar.");return;}
  try{
    await updateDoc(doc(db,"requests",id),{status,admin_response:resp});
    showToast(`Solicitação ${status==="ok"?"aprovada":"recusada"} com sucesso!`,status==="ok"?"success":"danger");
    renderAdminRequests();
  } catch(err){alert(`Erro: ${err.message}`);}
};

// ── Admin: Escala (com edição e exclusão) ─────────────────────
async function renderAdminEscala(){
  const container=document.querySelector("#admin-panel-content"); if(!container) return;
  container.innerHTML=`<div class="empty">Carregando...</div>`;
  try {
    const snap=await getDocs(query(collection(db,"escala_servico"),orderBy("data_plantao","asc")));
    const escalas=snap.docs.map(d=>({id:d.id,...d.data()}));
    container.innerHTML=`
      <section class="panel" style="margin-bottom:20px;">
        <form class="form" id="escala-form">
          <div><h2>Lançar Escala de Serviço</h2><p class="helper">Programe o plantão de um técnico pelo RE.</p></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <label>RE do Técnico<input id="escala-re" required inputmode="numeric" placeholder="Ex: 30981" /></label>
            <label>Data do Plantão<input id="escala-data" type="date" required /></label>
            <label>Horário de Início<input id="escala-inicio" type="time" required /></label>
            <label>Horário de Fim<input id="escala-fim" type="time" required /></label>
          </div>
          <label>Supervisor de Plantão<input id="escala-supervisor" required placeholder="Nome do supervisor" /></label>
          <div class="message" id="escala-msg"></div>
          <button class="primary-btn" type="submit">Lançar Escala</button>
        </form>
      </section>
      <section class="panel">
        <h2 style="margin:0 0 16px;">Escalas Cadastradas</h2>
        ${escalas.length===0?'<div class="empty">Nenhuma escala cadastrada ainda.</div>':
          `<div style="display:grid;gap:12px;">${escalas.map(sc=>`
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:8px;background:#fff;">
              <div>
                <strong style="color:var(--text);">RE ${escapeHtml(sc.tecnico_re)}</strong>
                <span style="display:block;font-size:0.88rem;color:var(--muted);margin-top:2px;">
                  🗓️ ${formatOnlyDate(sc.data_plantao)} | ⏰ ${sc.horario_inicio?.substring(0,5)} às ${sc.horario_fim?.substring(0,5)} | 👤 ${escapeHtml(sc.supervisor_plantao)}
                </span>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="secondary-btn" style="width:auto;padding:6px 14px;font-size:0.82rem;" onclick="handleEditEscala('${sc.id}','${escapeHtml(sc.tecnico_re)}','${sc.data_plantao}','${sc.horario_inicio}','${sc.horario_fim}','${escapeHtml(sc.supervisor_plantao)}')">✏️ Editar</button>
                <button class="secondary-btn" style="width:auto;padding:6px 14px;font-size:0.82rem;color:var(--danger);border-color:var(--danger);" onclick="handleDeleteEscala('${sc.id}')">🗑️ Excluir</button>
              </div>
            </div>`).join("")}</div>`}
      </section>`;
    document.querySelector("#escala-form").addEventListener("submit",async(e)=>{
      e.preventDefault(); const form=e.currentTarget;
      const msg=document.querySelector("#escala-msg");
      setFormBusy(form,true);
      try {
        await addDoc(collection(db,"escala_servico"),{
          tecnico_re:        document.querySelector("#escala-re").value.trim(),
          data_plantao:      document.querySelector("#escala-data").value,
          horario_inicio:    document.querySelector("#escala-inicio").value,
          horario_fim:       document.querySelector("#escala-fim").value,
          supervisor_plantao:document.querySelector("#escala-supervisor").value.trim(),
          createdAt:         serverTimestamp()
        });
        form.reset();
        showMessage(msg,"ok","Escala lançada com sucesso!");
        showToast("Escala lançada! O técnico será notificado.","success");
        setTimeout(renderAdminEscala, 800);
      } catch(err){showMessage(msg,"error",err.message);}
      setFormBusy(form,false);
    });
  } catch(err){container.innerHTML=`<div class="empty">${err.message}</div>`;}
}

window.handleDeleteEscala=async function(id){
  if(!confirm("Deseja excluir esta escala definitivamente?")) return;
  try{
    await deleteDoc(doc(db,"escala_servico",id));
    showToast("Escala excluída com sucesso.","danger");
    renderAdminEscala();
  } catch(err){alert(`Erro: ${err.message}`);}
};

window.handleEditEscala=function(id,re,data,inicio,fim,supervisor){
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;";
  modal.innerHTML=`<div style="background:#fff;border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
    <h2 style="margin:0 0 20px;font-size:1.2rem;">✏️ Editar Escala</h2>
    <div style="display:grid;gap:14px;">
      <label style="display:grid;gap:6px;font-size:0.88rem;font-weight:600;">RE do Técnico<input id="edit-re" value="${escapeHtml(re)}" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font:inherit;" /></label>
      <label style="display:grid;gap:6px;font-size:0.88rem;font-weight:600;">Data do Plantão<input id="edit-data" type="date" value="${data}" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font:inherit;" /></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <label style="display:grid;gap:6px;font-size:0.88rem;font-weight:600;">Início<input id="edit-inicio" type="time" value="${inicio}" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font:inherit;" /></label>
        <label style="display:grid;gap:6px;font-size:0.88rem;font-weight:600;">Fim<input id="edit-fim" type="time" value="${fim}" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font:inherit;" /></label>
      </div>
      <label style="display:grid;gap:6px;font-size:0.88rem;font-weight:600;">Supervisor<input id="edit-supervisor" value="${escapeHtml(supervisor)}" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font:inherit;" /></label>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button id="btn-salvar-edit" style="flex:1;background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:10px;font:inherit;font-weight:600;cursor:pointer;">Salvar Alterações</button>
      <button id="btn-cancelar-edit" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font:inherit;font-weight:600;cursor:pointer;">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#btn-cancelar-edit").addEventListener("click",()=>modal.remove());
  modal.querySelector("#btn-salvar-edit").addEventListener("click",async()=>{
    try{
      await updateDoc(doc(db,"escala_servico",id),{
        tecnico_re:        modal.querySelector("#edit-re").value.trim(),
        data_plantao:      modal.querySelector("#edit-data").value,
        horario_inicio:    modal.querySelector("#edit-inicio").value,
        horario_fim:       modal.querySelector("#edit-fim").value,
        supervisor_plantao:modal.querySelector("#edit-supervisor").value.trim()
      });
      modal.remove();
      showToast("Escala atualizada com sucesso!","success");
      renderAdminEscala();
    } catch(err){alert(`Erro: ${err.message}`);}
  });
};

// ── Admin: Scripts ────────────────────────────────────────────
async function renderAdminScripts(){
  const container=document.querySelector("#admin-panel-content"); if(!container) return;
  container.innerHTML=`<section class="panel">
    <form class="form" id="script-admin-form">
      <div><h2>Gerenciar Scripts</h2><p class="helper">Cadastre scripts por modelo de roteador.</p></div>
      <label>Modelo do Roteador<input id="script-model" required placeholder="Ex: Huawei HG8145V5" /></label>
      <label>Conteúdo do Script<textarea id="script-content" required rows="8" placeholder="Cole o script aqui..."></textarea></label>
      <div class="message" id="script-msg"></div>
      <button class="primary-btn" type="submit">Salvar Script</button>
    </form>
  </section>`;
  document.querySelector("#script-admin-form").addEventListener("submit",async(e)=>{
    e.preventDefault(); const form=e.currentTarget; const msg=document.querySelector("#script-msg");
    setFormBusy(form,true);
    try{
      await addDoc(collection(db,"scripts"),{router_model:document.querySelector("#script-model").value.trim(),content:document.querySelector("#script-content").value.trim(),createdAt:serverTimestamp()});
      form.reset(); showMessage(msg,"ok","Script salvo!"); showToast("Script salvo com sucesso!","success");
    } catch(err){showMessage(msg,"error",err.message);}
    setFormBusy(form,false);
  });
}

// ── Admin: Avisos ─────────────────────────────────────────────
function renderAdminAnnouncementsForm(){
  const container=document.querySelector("#admin-panel-content"); if(!container) return;
  container.innerHTML=`<section class="panel">
    <form class="form" id="announcement-form">
      <div><h2>Emitir Alertas / Comunicados Operacionais</h2><p class="helper">Escreva a instrução abaixo e determine o público-alvo.</p></div>
      <label>Público Destino
        <select id="announcement-target-type" style="padding:11px 14px;border:1px solid var(--line);border-radius:8px;">
          <option value="todos">Disparar para TODOS os Técnicos</option>
          <option value="especifico">Destinar a um Técnico Específico (Por RE)</option>
        </select>
      </label>
      <label id="wrapper-target-re" style="display:none;">RE do Técnico Destinatário<input id="announcement-target-re" inputmode="numeric" placeholder="Ex: 35383" /></label>
      <label>Mensagem / Texto do Aviso<textarea id="announcement-content" required placeholder="Digite o comunicado operacional aqui..."></textarea></label>
      <div class="message" id="announcement-msg"></div>
      <button class="primary-btn" type="submit">Publicar Alerta</button>
    </form>
  </section>`;
  const sel=document.querySelector("#announcement-target-type");
  const wr=document.querySelector("#wrapper-target-re");
  sel.addEventListener("change",()=>{wr.style.display=sel.value==="especifico"?"grid":"none";});
  document.querySelector("#announcement-form").addEventListener("submit",async(e)=>{
    e.preventDefault(); const form=e.currentTarget;
    const type=sel.value, re=document.querySelector("#announcement-target-re").value.trim().replace(/[^0-9]/g,"");
    const content=document.querySelector("#announcement-content").value.trim();
    const msg=document.querySelector("#announcement-msg");
    if(type==="especifico"&&!re){showMessage(msg,"error","Para avisos específicos, informe o RE.");return;}
    setFormBusy(form,true);
    try{
      await addDoc(collection(db,"announcements"),{target_type:type,target_re:type==="especifico"?re:null,content,created_by:session.name,createdAt:serverTimestamp()});
      form.reset(); wr.style.display="none";
      showMessage(msg,"ok","Aviso transmitido!");
      showToast("Aviso publicado e enviado aos técnicos!","success");
    } catch(err){showMessage(msg,"error",err.message);}
    setFormBusy(form,false);
  });
}

// ── Admin: Usuários ───────────────────────────────────────────
function renderAdminUsersForm(){
  const container=document.querySelector("#admin-panel-content"); if(!container) return;
  container.innerHTML=`<section class="panel">
    <div><h2>Controle de Usuários Autorizados</h2><p class="helper">Consulte pelo RE ou CPF para verificar status, autorizar ou excluir.</p></div>
    <div style="display:flex;gap:10px;margin-bottom:22px;max-width:500px;">
      <input id="search-identificador" inputmode="numeric" placeholder="Digite RE ou CPF" style="padding:10px;" />
      <button class="primary-btn" id="btn-search-user" style="min-width:120px;min-height:44px;width:auto;">Consultar</button>
    </div>
    <div id="management-workarea"><div class="empty">Insira um identificador acima para iniciar a gestão.</div></div>
  </section>`;
  document.querySelector("#btn-search-user").addEventListener("click",async()=>{
    const id=document.querySelector("#search-identificador").value.trim().replace(/[^0-9]/g,"");
    const workarea=document.querySelector("#management-workarea");
    if(!id){alert("Informe o RE ou CPF.");return;}
    workarea.innerHTML=`<div class="empty">Consultando...</div>`;
    try{
      const [td,ad,ud]=await Promise.all([getDoc(doc(db,"allowed_technicians",id)),getDoc(doc(db,"allowed_admins",id)),getDoc(doc(db,"users",id))]);
      const inWl=td.exists()||ad.exists(), reg=ud.exists();
      const wd=td.exists()?td.data():ad.exists()?ad.data():{};
      const udata=ud.exists()?ud.data():{};
      const status=reg?"cadastrado":inWl?"na_whitelist":"nao_autorizado";
      const sLabel=status==="cadastrado"?"CONTA ATIVA E CADASTRADA":status==="na_whitelist"?"AUTORIZADO / AGUARDANDO CADASTRO":"NÃO AUTORIZADO";
      const ac=status==="cadastrado"?"done":status==="na_whitelist"?"pending":"denied";
      const cName=udata.name||wd.name||"", cRole=udata.role||wd.role||"tecnico";
      workarea.innerHTML=`
        <div class="badge ${ac}" style="margin-bottom:16px;font-size:0.85rem;padding:6px 12px;border-radius:4px;">Status: ${sLabel}</div>
        <form class="form" id="user-mutation-form" style="margin-top:10px;">
          <label>Nome Completo<input id="mutation-name" required value="${escapeHtml(cName)}" placeholder="NOME SOBRENOME" ${reg?"disabled":""} /></label>
          <label>Função / Nível de Acesso
            <select id="mutation-role" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:13px 14px;background:#fff;font:inherit;">
              <option value="tecnico" ${cRole==="tecnico"?"selected":""}>Técnico</option>
              <option value="administrador" ${cRole==="administrador"?"selected":""}>Administrador</option>
              <option value="administrador_master" ${cRole==="administrador_master"?"selected":""}>Administrador Master</option>
            </select>
          </label>
          <div class="message" id="mutation-msg"></div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
            <button class="primary-btn" type="submit" style="flex:1;min-width:160px;">${reg?"Atualizar Função":"Salvar e Autorizar"}</button>
            ${status!=="nao_autorizado"?`<button class="secondary-btn" type="button" id="btn-delete-user" style="color:var(--danger);border-color:var(--danger);min-width:160px;width:auto;">Excluir Definitivamente</button>`:""}
          </div>
        </form>`;
      document.querySelector("#user-mutation-form").addEventListener("submit",async(e)=>{
        e.preventDefault(); const form=e.currentTarget;
        const name=document.querySelector("#mutation-name").value.trim().toUpperCase();
        const role=document.querySelector("#mutation-role").value;
        const msg=document.querySelector("#mutation-msg");
        setFormBusy(form,true);
        try{
          if(reg){ await updateDoc(doc(db,"users",id),{role}); }
          else {
            await deleteDoc(doc(db,"allowed_technicians",id)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_admins",id)).catch(()=>{});
            if(role==="tecnico") await setDoc(doc(db,"allowed_technicians",id),{re:id,name,role:"tecnico"});
            else{ const level=role==="administrador_master"?"master":"admin"; await setDoc(doc(db,"allowed_admins",id),{cpf:id,name,level,role}); }
          }
          showMessage(msg,"ok","Gravado com sucesso!"); showToast("Usuário atualizado com sucesso!","success"); setTimeout(renderAdminUsersForm,1200);
        } catch(err){showMessage(msg,"error",err.message);}
        setFormBusy(form,false);
      });
      const delBtn=document.querySelector("#btn-delete-user");
      if(delBtn){
        delBtn.addEventListener("click",async()=>{
          if(!confirm(`Apagar DEFINITIVAMENTE o ID ${id}?`)) return;
          const form=document.querySelector("#user-mutation-form"); setFormBusy(form,true);
          try{
            await deleteDoc(doc(db,"users",id)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_technicians",id)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_admins",id)).catch(()=>{});
            showToast("Usuário excluído definitivamente.","danger"); alert("Excluído com sucesso!"); renderAdminUsersForm();
          } catch(err){alert(`Erro: ${err.message}`); setFormBusy(form,false);}
        });
      }
    } catch(err){workarea.innerHTML=`<div class="message show error">Falha: ${err.message}</div>`;}
  });
}

// ════════════════════════════════════════════════════════════
// AUXILIARES
// ════════════════════════════════════════════════════════════
function showMessage(el,type,text){ el.className=`message show ${type}`; el.textContent=text; }
function setFormBusy(form,busy)   { form.querySelectorAll("button,input,textarea,select").forEach(f=>f.disabled=busy); }
function labelStatus(s)           { return ({pendente:"Pendente",ok:"OK",nao_ok:"Não OK",arquivado:"Lido"})[s]||s; }
function formatDate(v)            { return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)); }
function formatOnlyDate(v)        { if(!v)return""; const p=v.split("-"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v; }
function escapeHtml(v)            { return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }