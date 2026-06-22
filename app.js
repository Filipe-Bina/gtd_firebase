// ============================================================
// GTD-ABILITY TECNOLOGIA — Firebase Version
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDFbEkQh9iQ0NlQB4bRUQ2jeBa36HMJ5ss",
  authDomain: "gtd-ability-tecnologia.firebaseapp.com",
  projectId: "gtd-ability-tecnologia",
  storageBucket: "gtd-ability-tecnologia.firebasestorage.app",
  messagingSenderId: "910374870725",
  appId: "1:910374870725:web:930193421bae8c096b1aac"
};
// ─────────────────────────────────────────────────────────────

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

// ── Request types ─────────────────────────────────────────────
const requestTypes = [
  { key:"combustivel",       title:"Solicitar Combustível",          subtitle:"Enviar RE para liberação de combustível.",                         label:"RE do técnico",                          placeholder:"Digite seu RE",                                                    button:"Enviar solicitação", success:"Solicitação de combustível enviada para o administrador." },
  { key:"interface",         title:"Solicitar Interface",            subtitle:"Informar a ordem de serviço para criação da interface.",           label:"Informações da ordem de serviço",         placeholder:"Descreva a OS e os dados necessários para criar a interface",        button:"Enviar solicitação", success:"Solicitação de interface enviada para o administrador." },
  { key:"manobra",           title:"Solicitar Manobra",              subtitle:"Informar os dados operacionais para execução da manobra.",         label:"Informações da manobra técnica",          placeholder:"Descreva detalhadamente a ordem e dados da manobra solicitada",      button:"Enviar solicitação", success:"Solicitação de manobra enviada para o administrador." },
  { key:"melhoria",          title:"Solicitar Melhoria",             subtitle:"Registrar uma sugestão ou necessidade de melhoria.",              label:"Informações da melhoria",                 placeholder:"Descreva a melhoria desejada",                                      button:"Enviar solicitação", success:"Solicitação de melhoria enviada para o administrador." },
  { key:"manutencao_veicular",title:"Solicitar Manutenção Veicular", subtitle:"Pedir validação para manutenção do veículo.",                     label:"Manutenção a ser realizada",              placeholder:"Descreva o problema, placa e manutenção necessária",                button:"Enviar solicitação", success:"Solicitação de manutenção veicular enviada para validação." },
  { key:"ferramental",       title:"Solicitar Ferramental",          subtitle:"Troca ou requisição de ferramenta.",                              label:"Troca ou requisição de ferramental",      placeholder:"Informe a ferramenta e o motivo",                                   button:"Enviar solicitação", success:"Solicitação de ferramental enviada para o administrador." },
  { key:"equipamento_ti",    title:"Solicitar Equipamento TI",       subtitle:"Troca ou requisição de equipamento de TI.",                       label:"Troca ou requisição de equipamento de TI",placeholder:"Informe o equipamento, patrimônio se houver, e motivo",             button:"Enviar solicitação", success:"Solicitação de equipamento de TI enviada para o administrador." },
  { key:"correcao_excecao",  title:"Solicitar Mudança de Exceção",   subtitle:"Enviar correção necessária e motivo.",                            label:"Correção e motivo",                       placeholder:"Descreva a correção de exceção e o motivo",                         button:"Enviar solicitação", success:"Solicitação de correção enviada para validação." }
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
let unsubRequests  = null;
let unsubAnnouncements = null;

// ── Boot ──────────────────────────────────────────────────────
render();

// ── Session helpers ───────────────────────────────────────────
function readSession()       { try { return JSON.parse(localStorage.getItem("gtd_session")); } catch { return null; } }
function saveSession(data)   { session = data; localStorage.setItem("gtd_session", JSON.stringify(data)); }
function clearSession()      { session = null; localStorage.removeItem("gtd_session"); stopListeners(); }
function stopListeners()     { if (unsubRequests) { unsubRequests(); unsubRequests = null; } if (unsubAnnouncements) { unsubAnnouncements(); unsubAnnouncements = null; } }

// ── Sound ─────────────────────────────────────────────────────
function playNotificationSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "high") { osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(0.3, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.15); }
    else                 { osc.type = "triangle"; osc.frequency.setValueAtTime(587, ctx.currentTime); gain.gain.setValueAtTime(0.2, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.25); }
  } catch(e) { console.log("Áudio indisponível."); }
}

// ── Render router ─────────────────────────────────────────────
function render() {
  if (!session) { renderAuth(); return; }
  if (session.role === "administrador" || session.role === "administrador_master") renderAdminHome();
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
          <button class="tab-btn ${authMode==="login"?"active":""}"    id="tab-login">Login</button>
          <button class="tab-btn ${authMode==="register"?"active":""}" id="tab-register">Primeiro Acesso</button>
        </nav>
        <div class="auth-forms-container">
          <form class="form auth-form ${authMode==="login"?"show":""}" id="form-login">
            <label>Identificador (RE ou CPF)
              <input id="login-re" required inputmode="numeric" placeholder="Apenas números" />
            </label>
            <label>Senha
              <input id="login-password" type="password" required placeholder="Sua senha" />
            </label>
            <div class="message" id="login-msg"></div>
            <button class="primary-btn" type="submit">Entrar no Sistema</button>
          </form>
          <form class="form auth-form ${authMode==="register"?"show":""}" id="form-register">
            <p class="helper">Insira seu RE/CPF autorizado para validar a conta e escolha seu e-mail pessoal ou corporativo válido.</p>
            <label>RE ou CPF Autorizado
              <input id="register-re" required inputmode="numeric" placeholder="Apenas números da sua lista" />
            </label>
            <label>E-mail Pessoal ou de Trabalho
              <input id="register-email" type="email" required placeholder="seu@email.com" />
            </label>
            <label>Crie sua Senha (mín. 6 caracteres)
              <input id="register-password" type="password" required placeholder="Mínimo 6 caracteres" />
            </label>
            <div class="message" id="register-msg"></div>
            <button class="primary-btn" type="submit">Cadastrar e Ativar</button>
          </form>
        </div>
      </div>
    </section>`;
  appEl.querySelector("#tab-login").addEventListener("click",    () => { authMode="login";    renderAuth(); });
  appEl.querySelector("#tab-register").addEventListener("click", () => { authMode="register"; renderAuth(); });
  const fLogin    = appEl.querySelector("#form-login");
  const fRegister = appEl.querySelector("#form-register");
  if (fLogin)    fLogin.addEventListener("submit",    handleLoginSubmit);
  if (fRegister) fRegister.addEventListener("submit", handleRegisterSubmit);
}

// ── Login ─────────────────────────────────────────────────────
async function handleLoginSubmit(e) {
  e.preventDefault(); const form = e.currentTarget;
  const identificador = appEl.querySelector("#login-re").value.trim().replace(/[^0-9]/g,"");
  const password      = appEl.querySelector("#login-password").value;
  const msg           = appEl.querySelector("#login-msg");
  setFormBusy(form, true);
  try {
    // Busca o e-mail vinculado ao RE/CPF no Firestore
    const userDoc = await getDoc(doc(db, "users", identificador));
    if (!userDoc.exists()) { showMessage(msg,"error","Identificador não encontrado. Faça o Primeiro Acesso."); setFormBusy(form,false); return; }
    const userData = userDoc.data();
    await signInWithEmailAndPassword(auth, userData.email, password);
    saveSession({ re: identificador, name: userData.name, role: userData.role, email: userData.email });
    render();
  } catch(err) {
    showMessage(msg, "error", err.code === "auth/invalid-credential" ? "Senha incorreta." : err.message);
  }
  setFormBusy(form, false);
}

// ── Primeiro acesso / cadastro ────────────────────────────────
async function handleRegisterSubmit(e) {
  e.preventDefault(); const form = e.currentTarget;
  const identificador = appEl.querySelector("#register-re").value.trim().replace(/[^0-9]/g,"");
  const email         = appEl.querySelector("#register-email").value.trim().toLowerCase();
  const password      = appEl.querySelector("#register-password").value;
  const msg           = appEl.querySelector("#register-msg");
  setFormBusy(form, true);
  try {
    // Verifica se está na whitelist de técnicos
    const techDoc = await getDoc(doc(db,"allowed_technicians", identificador));
    const admDoc  = await getDoc(doc(db,"allowed_admins", identificador));
    if (!techDoc.exists() && !admDoc.exists()) {
      showMessage(msg,"error","RE/CPF não autorizado para cadastro na empresa."); setFormBusy(form,false); return;
    }
    // Verifica se já tem conta
    const existingUser = await getDoc(doc(db,"users", identificador));
    if (existingUser.exists()) {
      showMessage(msg,"error","Este identificador já possui cadastro. Use a aba Login."); setFormBusy(form,false); return;
    }
    const whiteData = techDoc.exists() ? techDoc.data() : admDoc.data();
    const role      = techDoc.exists() ? (whiteData.role || "tecnico") : (whiteData.role || "administrador");
    // Cria usuário no Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Salva perfil no Firestore
    await setDoc(doc(db,"users", identificador), {
      uid:   cred.user.uid,
      re:    identificador,
      name:  whiteData.name,
      role,
      email,
      createdAt: serverTimestamp()
    });
    saveSession({ re: identificador, name: whiteData.name, role, email });
    render();
  } catch(err) {
    if (err.code === "auth/email-already-in-use") showMessage(msg,"error","E-mail já em uso. Tente outro ou faça login.");
    else showMessage(msg,"error", err.message);
  }
  setFormBusy(form, false);
}

// ════════════════════════════════════════════════════════════
// TOPBAR
// ════════════════════════════════════════════════════════════
function topbar() {
  const displayRole = session.role.toUpperCase().replace("_"," ");
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="app-title"><span class="mini-mark">GTD</span> Ability Tecnologia</div>
        <div class="user-chip">
          <strong>${escapeHtml(session.name)}</strong>
          <span>ID: ${escapeHtml(session.re)} • ${escapeHtml(displayRole)}</span>
          <button class="ghost-btn" id="logout" style="width:auto;padding:4px 8px;">Sair</button>
        </div>
      </div>
    </header>`;
}

function attachLogout() {
  const btn = document.querySelector("#logout");
  if (btn) btn.addEventListener("click", async () => { await signOut(auth); clearSession(); render(); });
}

// ════════════════════════════════════════════════════════════
// ÁREA DO TÉCNICO
// ════════════════════════════════════════════════════════════
function renderTechnicianHome() {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <div id="mural-avisos-ticker">
        <div class="ticker-inner-wrapper">
          <div id="ticker-container-area">Carregando avisos operacionais...</div>
        </div>
      </div>
      <main class="content">
        <section class="panel" style="margin-bottom:24px;background:#f0fdf4;border-color:#bbf7d0;">
          <h3 style="margin:0 0 6px 0;color:#166534;font-size:1.1rem;display:flex;align-items:center;gap:8px;">📅 Minha Escala de Plantão</h3>
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
  document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click",()=>openAction(b.dataset.action)));
  document.querySelector("#refresh-requests").addEventListener("click", loadRequests);
  loadRequests();
  loadRecentAnnouncements();
  loadTechnicianEscala();
}

async function loadTechnicianEscala() {
  const area = document.querySelector("#technician-escala-workarea"); if (!area) return;
  try {
    const q = query(collection(db,"escala_servico"), where("tecnico_re","==",session.re), orderBy("data_plantao","asc"));
    const snap = await getDocs(q);
    const today = new Date(); today.setHours(0,0,0,0);
    const activeScales = snap.docs.map(d=>d.data()).filter(e => new Date(e.data_plantao+"T00:00:00") >= today);
    if (!activeScales.length) { area.innerHTML = "Você não possui nenhuma escala de plantão agendada por enquanto."; return; }
    area.innerHTML = `<div style="display:grid;gap:8px;margin-top:6px;">${activeScales.map(sc=>`
      <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <span>🗓️ <strong>Dia:</strong> ${formatOnlyDate(sc.data_plantao)} | ⏰ <strong>Horário:</strong> ${sc.horario_inicio.substring(0,5)} às ${sc.horario_fim.substring(0,5)}</span>
        <span>👤 <strong>Supervisor de Plantão:</strong> ${escapeHtml(sc.supervisor_plantao)}</span>
      </div>`).join("")}</div>`;
  } catch(err) { area.innerHTML = "Erro ao carregar grade de plantões."; }
}

async function loadRecentAnnouncements() {
  const containerArea = document.querySelector("#ticker-container-area"); if (!containerArea) return;
  try {
    const q = query(collection(db,"announcements"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    const allAnn = snap.docs.map(d=>({id:d.id,...d.data()})).filter(a => a.target_type==="todos" || a.target_re===session.re);
    if (!allAnn.length) { containerArea.innerHTML = "<div>📢 Nenhum aviso importante pendente na mesa hoje.</div>"; return; }
    const ackSnap = await getDocs(query(collection(db,"announcement_acknowledgments"), where("technician_re","==",session.re)));
    const readIds = ackSnap.docs.map(d=>d.data().announcement_id);
    const unread  = allAnn.filter(a => !readIds.includes(a.id));
    if (!unread.length) { containerArea.innerHTML = "<div>✅ Você já visualizou todos os comunicados operacionais recentes.</div>"; return; }
    containerArea.innerHTML = unread.map(aviso => {
      const prefix = aviso.target_type==="especifico" ? "🔒 [Aviso Direcionado]" : "📢 [Aviso Geral]";
      return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.6);padding:8px 12px;border-radius:6px;border:1px solid rgba(133,100,4,0.15);width:100%;">
        <span style="line-height:1.4;"><strong>${prefix}</strong> ${escapeHtml(aviso.content)} <small style="font-weight:normal;color:var(--muted);margin-left:6px;">(${formatDate(aviso.createdAt?.toDate?.() || aviso.createdAt)})</small></span>
        <button class="primary-btn" onclick="handleAckAnnouncement('${aviso.id}')" style="min-height:24px;padding:2px 8px;font-size:0.75rem;background:#d97706;width:auto;font-weight:700;">Ok, Lido</button>
      </div>`;
    }).join("");
  } catch(err) { containerArea.innerHTML = "<div>Erro ao carregar avisos.</div>"; }
}

window.handleAckAnnouncement = async function(id) {
  try {
    await addDoc(collection(db,"announcement_acknowledgments"), { announcement_id: id, technician_re: session.re, createdAt: serverTimestamp() });
    loadRecentAnnouncements();
  } catch(err) { alert(`Erro: ${err.message}`); }
};

function actionTile(action) {
  return `<button class="tile" data-action="${action.key}"><div>${escapeHtml(action.title)}<span>${escapeHtml(action.subtitle)}</span></div><span class="icon">${iconFor(action.key)}</span></button>`;
}
function iconFor(key) {
  const icons = { combustivel:"⛽", interface:"↔", manobra:"🔀", melhoria:"+", manutencao_veicular:"⚙", ferramental:"◧", equipamento_ti:"▣", correcao_excecao:"!", script:"{ }", codigo_baixa:"PDF" };
  return icons[key] || "•";
}
function openAction(key) {
  if (key==="script")       { renderScriptView(); return; }
  if (key==="codigo_baixa") { renderPdfView();    return; }
  renderRequestForm(requestTypes.find(i=>i.key===key));
}

function renderRequestForm(type) {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <main class="content">
        <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
        <section class="panel">
          <form class="form" id="request-form">
            <div><h2>${escapeHtml(type.title)}</h2><p class="helper">${escapeHtml(type.subtitle)}</p></div>
            <label>${escapeHtml(type.label)}
              ${type.key==="combustivel"
                ? `<input name="details" inputmode="numeric" required value="${escapeHtml(session.re)}" />`
                : `<textarea name="details" required placeholder="${escapeHtml(type.placeholder)}"></textarea>`}
            </label>
            <div class="message" id="request-message"></div>
            <button class="primary-btn" type="submit">${escapeHtml(type.button)}</button>
          </form>
        </section>
      </main>
    </section>`;
  document.querySelector("#back-home").addEventListener("click", renderTechnicianHome);
  attachLogout();
  document.querySelector("#request-form").addEventListener("submit", (e) => submitRequest(e, type));
}

async function submitRequest(event, type) {
  event.preventDefault(); const form = event.currentTarget;
  const details = String(new FormData(form).get("details")).trim();
  const message = document.querySelector("#request-message");
  setFormBusy(form, true);
  try {
    await addDoc(collection(db,"requests"), {
      technician_re:   session.re,
      technician_name: session.name,
      type:            type.key,
      title:           type.title,
      details,
      status:          "pendente",
      admin_response:  "",
      createdAt:       serverTimestamp()
    });
    form.reset(); showMessage(message,"ok", type.success);
  } catch(err) { showMessage(message,"error", err.message); }
  setFormBusy(form, false);
}

async function loadRequests() {
  const list = document.querySelector("#request-list"); if (!list) return;
  list.innerHTML = `<div class="empty">Carregando solicitações...</div>`;
  try {
    const q = query(collection(db,"requests"), where("technician_re","==",session.re), where("status","!=","arquivado"), orderBy("status"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if (snap.empty) { list.innerHTML = `<div class="empty">Nenhuma solicitação em aberto.</div>`; return; }
    list.innerHTML = snap.docs.map(d => {
      const item = {id: d.id, ...d.data()};
      const isAnswered = item.status==="ok" || item.status==="nao_ok";
      const badgeClass = item.status==="ok" ? "done" : item.status==="nao_ok" ? "denied" : "pending";
      return `
        <article class="request-item" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;">
          <div style="flex:1;">
            <strong style="color:var(--text);font-size:1rem;">${escapeHtml(item.title)}</strong>
            <p style="margin:4px 0;color:var(--muted);font-size:0.9rem;">${escapeHtml(item.admin_response || "Aguardando posicionamento do administrador.")}</p>
            <small style="color:var(--muted);font-size:0.8rem;">${item.createdAt ? formatDate(item.createdAt.toDate()) : ""}</small>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span class="badge ${badgeClass}">${escapeHtml(labelStatus(item.status))}</span>
            ${isAnswered ? `<button class="primary-btn" onclick="handleArchiveRequest('${item.id}')" style="min-height:28px;padding:2px 10px;font-size:0.8rem;background:var(--muted);width:auto;">Ciente / OK</button>` : ""}
          </div>
        </article>`;
    }).join("");
  } catch(err) { list.innerHTML = `<div class="empty">${err.message}</div>`; }
}

window.handleArchiveRequest = async function(id) {
  try { await updateDoc(doc(db,"requests",id),{status:"arquivado"}); loadRequests(); }
  catch(err) { alert(`Erro: ${err.message}`); }
};

function renderScriptView() {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <main class="content">
        <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
        <section class="panel">
          <form class="form" id="script-form">
            <div><h2>Buscar Script</h2><p class="helper">Digite o modelo do roteador para pesquisa.</p></div>
            <label>Modelo do Roteador<input name="model" required placeholder="Ex.: Huawei" /></label>
            <button class="primary-btn" type="submit">Buscar</button>
          </form>
          <div id="script-result" class="script-result"></div>
        </section>
      </main>
    </section>`;
  document.querySelector("#back-home").addEventListener("click", renderTechnicianHome);
  attachLogout();
  document.querySelector("#script-form").addEventListener("submit", searchScript);
}

async function searchScript(event) {
  event.preventDefault();
  const result = document.querySelector("#script-result");
  const model  = String(new FormData(event.currentTarget).get("model")).trim().toLowerCase();
  result.innerHTML = `<div class="empty">Buscando...</div>`;
  try {
    const snap = await getDocs(collection(db,"scripts"));
    const found = snap.docs.map(d=>({id:d.id,...d.data()})).find(s => s.router_model?.toLowerCase().includes(model));
    if (!found) { result.innerHTML = `<div class="empty">Não encontrado.</div>`; return; }
    result.innerHTML = `<h3>${escapeHtml(found.router_model)}</h3><pre class="script-box">${escapeHtml(found.content)}</pre>`;
  } catch(err) { result.innerHTML = `<div class="empty">${err.message}</div>`; }
}

function renderPdfView() {
  appEl.innerHTML = `
    <section class="app-shell">${topbar()}
      <main class="content">
        <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
        <section class="panel"><h2>Código de Baixa</h2><iframe class="pdf-frame" src="assets/codigos-baixa.pdf"></iframe></section>
      </main>
    </section>`;
  document.querySelector("#back-home").addEventListener("click", renderTechnicianHome);
  attachLogout();
}

// ════════════════════════════════════════════════════════════
// ÁREA DO ADMIN
// ════════════════════════════════════════════════════════════
function renderAdminHome() {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <main class="content">
        <div class="section-head"><div><h2>Painel Administrativo</h2><p>Gerencie solicitações, usuários e comunicados.</p></div></div>
        <nav class="tabs" style="margin-bottom:24px;">
          <button class="tab ${adminTabActive==="solicitacoes"?"active":""}" id="tab-req">Solicitações</button>
          <button class="tab ${adminTabActive==="escala"?"active":""}"        id="tab-escala">Escala de Serviço</button>
          <button class="tab ${adminTabActive==="scripts"?"active":""}"       id="tab-scripts">Scripts</button>
          <button class="tab ${adminTabActive==="avisos"?"active":""}"        id="tab-avisos">Avisos</button>
          <button class="tab ${adminTabActive==="usuarios"?"active":""}"      id="tab-users">Usuários</button>
        </nav>
        <div id="admin-panel-content"></div>
      </main>
    </section>`;
  attachLogout();
  document.querySelector("#tab-req").addEventListener("click",    () => { adminTabActive="solicitacoes"; renderAdminHome(); });
  document.querySelector("#tab-escala").addEventListener("click", () => { adminTabActive="escala";       renderAdminHome(); });
  document.querySelector("#tab-scripts").addEventListener("click",() => { adminTabActive="scripts";      renderAdminHome(); });
  document.querySelector("#tab-avisos").addEventListener("click", () => { adminTabActive="avisos";       renderAdminHome(); });
  document.querySelector("#tab-users").addEventListener("click",  () => { adminTabActive="usuarios";     renderAdminHome(); });
  if (adminTabActive==="solicitacoes") renderAdminRequests();
  else if (adminTabActive==="escala")  renderAdminEscala();
  else if (adminTabActive==="scripts") renderAdminScripts();
  else if (adminTabActive==="avisos")  renderAdminAnnouncementsForm();
  else if (adminTabActive==="usuarios")renderAdminUsersForm();
}

// ── Admin: Solicitações ───────────────────────────────────────
async function renderAdminRequests() {
  const container = document.querySelector("#admin-panel-content"); if (!container) return;
  container.innerHTML = `<div class="empty">Carregando solicitações...</div>`;
  try {
    const q = query(collection(db,"requests"), where("status","!=","arquivado"), orderBy("status"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    const all  = snap.docs.map(d=>({id:d.id,...d.data()}));
    const pending  = all.filter(r=>r.status==="pendente");
    const answered = all.filter(r=>r.status==="ok"||r.status==="nao_ok");
    const kanbanCard = (item) => `
      <div class="kanban-card">
        <div><strong>${escapeHtml(item.title)}</strong><span style="font-size:0.82rem;color:var(--muted);display:block;">RE ${escapeHtml(item.technician_re)} — ${escapeHtml(item.technician_name)}</span></div>
        <p style="font-size:0.88rem;color:var(--muted);margin:0;">${escapeHtml(item.details||"")}</p>
        <small style="color:var(--muted);">${item.createdAt ? formatDate(item.createdAt.toDate()) : ""}</small>
        ${item.status==="pendente" ? `
          <div style="display:grid;gap:8px;">
            <textarea id="resp-${item.id}" placeholder="Resposta ao técnico (obrigatório)" style="border:1px solid var(--line);border-radius:6px;padding:8px;font:inherit;resize:vertical;" rows="2"></textarea>
            <div style="display:flex;gap:8px;">
              <button class="primary-btn" style="background:var(--success);width:auto;flex:1;" onclick="handleAdminAction('${item.id}','ok')">✔ Aprovar</button>
              <button class="primary-btn" style="background:var(--danger);width:auto;flex:1;"  onclick="handleAdminAction('${item.id}','nao_ok')">✘ Recusar</button>
            </div>
          </div>` : `<span class="badge ${item.status==="ok"?"done":"denied"}">${labelStatus(item.status)}</span><p style="font-size:0.85rem;margin:0;">${escapeHtml(item.admin_response||"")}</p>`}
      </div>`;
    container.innerHTML = `
      <div class="kanban-board">
        <div class="kanban-column"><div class="kanban-column-header">🕐 Pendentes <span>${pending.length}</span></div>${pending.length ? pending.map(kanbanCard).join("") : '<div class="empty">Nenhuma pendente.</div>'}</div>
        <div class="kanban-column"><div class="kanban-column-header">✅ Respondidas <span>${answered.length}</span></div>${answered.length ? answered.map(kanbanCard).join("") : '<div class="empty">Nenhuma respondida.</div>'}</div>
        <div class="kanban-column"><div class="kanban-column-header">📊 Resumo</div><div style="font-size:0.9rem;padding:8px 0;"><p><strong>${all.length}</strong> solicitações em aberto</p><p><strong>${pending.length}</strong> aguardando resposta</p></div></div>
      </div>`;
  } catch(err) { container.innerHTML = `<div class="empty">${err.message}</div>`; }
}

window.handleAdminAction = async function(id, status) {
  const resp = document.querySelector(`#resp-${id}`)?.value?.trim();
  if (!resp) { alert("Digite uma resposta antes de aprovar ou recusar."); return; }
  try { await updateDoc(doc(db,"requests",id),{status, admin_response: resp}); renderAdminRequests(); }
  catch(err) { alert(`Erro: ${err.message}`); }
};

// ── Admin: Escala ─────────────────────────────────────────────
async function renderAdminEscala() {
  const container = document.querySelector("#admin-panel-content"); if (!container) return;
  container.innerHTML = `
    <section class="panel">
      <form class="form" id="escala-form">
        <div><h2>Lançar Escala de Serviço</h2><p class="helper">Programe o plantão de um técnico pelo RE.</p></div>
        <label>RE do Técnico<input id="escala-re" required inputmode="numeric" placeholder="Ex: 30981" /></label>
        <label>Data do Plantão<input id="escala-data" type="date" required /></label>
        <label>Horário de Início<input id="escala-inicio" type="time" required /></label>
        <label>Horário de Fim<input id="escala-fim" type="time" required /></label>
        <label>Supervisor de Plantão<input id="escala-supervisor" required placeholder="Nome do supervisor" /></label>
        <div class="message" id="escala-msg"></div>
        <button class="primary-btn" type="submit">Lançar Escala</button>
      </form>
    </section>`;
  document.querySelector("#escala-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget;
    const msg = document.querySelector("#escala-msg");
    setFormBusy(form, true);
    try {
      await addDoc(collection(db,"escala_servico"), {
        tecnico_re:        document.querySelector("#escala-re").value.trim(),
        data_plantao:      document.querySelector("#escala-data").value,
        horario_inicio:    document.querySelector("#escala-inicio").value,
        horario_fim:       document.querySelector("#escala-fim").value,
        supervisor_plantao:document.querySelector("#escala-supervisor").value.trim(),
        createdAt:         serverTimestamp()
      });
      form.reset(); showMessage(msg,"ok","Escala lançada com sucesso!");
    } catch(err) { showMessage(msg,"error",err.message); }
    setFormBusy(form, false);
  });
}

// ── Admin: Scripts ────────────────────────────────────────────
async function renderAdminScripts() {
  const container = document.querySelector("#admin-panel-content"); if (!container) return;
  container.innerHTML = `
    <section class="panel">
      <form class="form" id="script-admin-form">
        <div><h2>Gerenciar Scripts</h2><p class="helper">Cadastre scripts por modelo de roteador.</p></div>
        <label>Modelo do Roteador<input id="script-model" required placeholder="Ex: Huawei HG8145V5" /></label>
        <label>Conteúdo do Script<textarea id="script-content" required rows="8" placeholder="Cole o script aqui..."></textarea></label>
        <div class="message" id="script-msg"></div>
        <button class="primary-btn" type="submit">Salvar Script</button>
      </form>
    </section>`;
  document.querySelector("#script-admin-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget;
    const msg = document.querySelector("#script-msg");
    setFormBusy(form, true);
    try {
      await addDoc(collection(db,"scripts"),{
        router_model: document.querySelector("#script-model").value.trim(),
        content:      document.querySelector("#script-content").value.trim(),
        createdAt:    serverTimestamp()
      });
      form.reset(); showMessage(msg,"ok","Script salvo!");
    } catch(err) { showMessage(msg,"error",err.message); }
    setFormBusy(form, false);
  });
}

// ── Admin: Avisos ─────────────────────────────────────────────
function renderAdminAnnouncementsForm() {
  const container = document.querySelector("#admin-panel-content"); if (!container) return;
  container.innerHTML = `
    <section class="panel">
      <form class="form" id="announcement-form">
        <div><h2>Emitir Alertas / Comunicados Operacionais</h2><p class="helper">Escreva a instrução abaixo e determine o público-alvo.</p></div>
        <label>Público Destino
          <select id="announcement-target-type" style="padding:11px 14px;border:1px solid var(--line);border-radius:8px;">
            <option value="todos">Disparar para TODOS os Técnicos</option>
            <option value="especifico">Destinar a um Técnico Específico (Por RE)</option>
          </select>
        </label>
        <label id="wrapper-target-re" style="display:none;">RE do Técnico Destinatário
          <input id="announcement-target-re" inputmode="numeric" placeholder="Ex: 35383" />
        </label>
        <label>Mensagem / Texto do Aviso<textarea id="announcement-content" required placeholder="Digite o comunicado operacional aqui..."></textarea></label>
        <div class="message" id="announcement-msg"></div>
        <button class="primary-btn" type="submit">Publicar Alerta</button>
      </form>
    </section>`;
  const selectTarget = document.querySelector("#announcement-target-type");
  const wrapperRe    = document.querySelector("#wrapper-target-re");
  selectTarget.addEventListener("change", ()=>{ wrapperRe.style.display = selectTarget.value==="especifico"?"grid":"none"; });
  document.querySelector("#announcement-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget;
    const type    = selectTarget.value;
    const re      = document.querySelector("#announcement-target-re").value.trim().replace(/[^0-9]/g,"");
    const content = document.querySelector("#announcement-content").value.trim();
    const msg     = document.querySelector("#announcement-msg");
    if (type==="especifico"&&!re) { showMessage(msg,"error","Para avisos específicos, informe o RE."); return; }
    setFormBusy(form, true);
    try {
      await addDoc(collection(db,"announcements"),{ target_type:type, target_re:type==="especifico"?re:null, content, created_by:session.name, createdAt:serverTimestamp() });
      form.reset(); wrapperRe.style.display="none"; showMessage(msg,"ok","Aviso transmitido!");
    } catch(err) { showMessage(msg,"error",err.message); }
    setFormBusy(form, false);
  });
}

// ── Admin: Usuários ───────────────────────────────────────────
function renderAdminUsersForm() {
  const container = document.querySelector("#admin-panel-content"); if (!container) return;
  container.innerHTML = `
    <section class="panel">
      <div><h2>Controle de Usuários Autorizados</h2><p class="helper">Consulte pelo RE ou CPF para verificar status, autorizar ou excluir.</p></div>
      <div style="display:flex;gap:10px;margin-bottom:22px;max-width:500px;">
        <input id="search-identificador" inputmode="numeric" placeholder="Digite RE ou CPF" style="padding:10px;" />
        <button class="primary-btn" id="btn-search-user" style="min-width:120px;min-height:44px;width:auto;">Consultar</button>
      </div>
      <div id="management-workarea"><div class="empty">Insira um identificador acima para iniciar a gestão.</div></div>
    </section>`;
  document.querySelector("#btn-search-user").addEventListener("click", async () => {
    const identificador = document.querySelector("#search-identificador").value.trim().replace(/[^0-9]/g,"");
    const workarea = document.querySelector("#management-workarea");
    if (!identificador) { alert("Informe o RE ou CPF."); return; }
    workarea.innerHTML = `<div class="empty">Consultando...</div>`;
    try {
      const [techDoc, admDoc, userDoc] = await Promise.all([
        getDoc(doc(db,"allowed_technicians",identificador)),
        getDoc(doc(db,"allowed_admins",identificador)),
        getDoc(doc(db,"users",identificador))
      ]);
      const inWhitelist = techDoc.exists() || admDoc.exists();
      const registered  = userDoc.exists();
      const whiteData   = techDoc.exists() ? techDoc.data() : admDoc.exists() ? admDoc.data() : {};
      const userData    = userDoc.exists() ? userDoc.data() : {};
      const status      = registered ? "cadastrado" : inWhitelist ? "na_whitelist" : "nao_autorizado";
      const statusLabel = status==="cadastrado" ? "CONTA ATIVA E CADASTRADA" : status==="na_whitelist" ? "AUTORIZADO / AGUARDANDO CADASTRO" : "NÃO AUTORIZADO";
      const alertClass  = status==="cadastrado" ? "done" : status==="na_whitelist" ? "pending" : "denied";
      const currentName = userData.name || whiteData.name || "";
      const currentRole = userData.role || whiteData.role || "tecnico";
      workarea.innerHTML = `
        <div class="badge ${alertClass}" style="margin-bottom:16px;font-size:0.85rem;padding:6px 12px;border-radius:4px;">Status: ${statusLabel}</div>
        <form class="form" id="user-mutation-form" style="margin-top:10px;">
          <label>Nome Completo<input id="mutation-name" required value="${escapeHtml(currentName)}" placeholder="NOME SOBRENOME" ${registered?"disabled":""} /></label>
          <label>Função / Nível de Acesso
            <select id="mutation-role" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:13px 14px;background:#fff;font:inherit;">
              <option value="tecnico"             ${currentRole==="tecnico"?"selected":""}>Técnico</option>
              <option value="administrador"       ${currentRole==="administrador"?"selected":""}>Administrador</option>
              <option value="administrador_master"${currentRole==="administrador_master"?"selected":""}>Administrador Master</option>
            </select>
          </label>
          <div class="message" id="mutation-msg"></div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
            <button class="primary-btn" type="submit" style="flex:1;min-width:160px;">${registered?"Atualizar Função":"Salvar e Autorizar"}</button>
            ${status!=="nao_autorizado"?`<button class="secondary-btn" type="button" id="btn-delete-user" style="color:var(--danger);border-color:var(--danger);min-width:160px;width:auto;">Excluir Definitivamente</button>`:""}
          </div>
        </form>`;
      document.querySelector("#user-mutation-form").addEventListener("submit", async (e) => {
        e.preventDefault(); const form = e.currentTarget;
        const inputName    = document.querySelector("#mutation-name").value.trim().toUpperCase();
        const selectedRole = document.querySelector("#mutation-role").value;
        const msg          = document.querySelector("#mutation-msg");
        setFormBusy(form, true);
        try {
          if (registered) {
            await updateDoc(doc(db,"users",identificador),{role:selectedRole});
          } else {
            await deleteDoc(doc(db,"allowed_technicians",identificador)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_admins",identificador)).catch(()=>{});
            if (selectedRole==="tecnico") await setDoc(doc(db,"allowed_technicians",identificador),{re:identificador,name:inputName,role:"tecnico"});
            else { const level=selectedRole==="administrador_master"?"master":"admin"; await setDoc(doc(db,"allowed_admins",identificador),{cpf:identificador,name:inputName,level,role:selectedRole}); }
          }
          showMessage(msg,"ok","Gravado com sucesso!"); setTimeout(renderAdminUsersForm,1200);
        } catch(err) { showMessage(msg,"error",err.message); }
        setFormBusy(form, false);
      });
      const deleteBtn = document.querySelector("#btn-delete-user");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm(`Apagar DEFINITIVAMENTE o ID ${identificador}?`)) return;
          const form = document.querySelector("#user-mutation-form"); setFormBusy(form,true);
          try {
            await deleteDoc(doc(db,"users",identificador)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_technicians",identificador)).catch(()=>{});
            await deleteDoc(doc(db,"allowed_admins",identificador)).catch(()=>{});
            if (userData.uid) await fetch(`https://us-central1-gtd-ability-tecnologia.cloudfunctions.net/deleteUser?uid=${userData.uid}`).catch(()=>{});
            alert("Excluído com sucesso!"); renderAdminUsersForm();
          } catch(err) { alert(`Erro: ${err.message}`); setFormBusy(form,false); }
        });
      }
    } catch(err) { workarea.innerHTML = `<div class="message show error">Falha: ${err.message}</div>`; }
  });
}

// ════════════════════════════════════════════════════════════
// AUXILIARES
// ════════════════════════════════════════════════════════════
function showMessage(el,type,text) { el.className=`message show ${type}`; el.textContent=text; }
function setFormBusy(form,busy)    { form.querySelectorAll("button,input,textarea,select").forEach(f=>f.disabled=busy); }
function labelStatus(s)            { return ({pendente:"Pendente",ok:"OK",nao_ok:"Não OK",arquivado:"Lido"})[s]||s; }
function formatDate(v)             { return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)); }
function formatOnlyDate(v)         { if(!v)return""; const p=v.split("-"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v; }
function escapeHtml(v)             { return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }