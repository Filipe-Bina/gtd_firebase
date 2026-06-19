import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── FIREBASE CONFIG ──
const firebaseConfig = {
  apiKey: "AIzaSyDFbEkQh9iQ0NLQB4bRUQ2jeBa36HMJ5ss",
  authDomain: "gtd-ability-tecnologia.firebaseapp.com",
  projectId: "gtd-ability-tecnologia",
  storageBucket: "gtd-ability-tecnologia.firebasestorage.app",
  messagingSenderId: "910374870725",
  appId: "1:910374870725:web:930193421bae8c096b1aac"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ── TIPOS DE SOLICITAÇÃO ──
const requestTypes = [
  { key: "combustivel", title: "Solicitar Combustível", subtitle: "Enviar RE para liberação de combustível.", label: "RE do técnico", placeholder: "Digite seu RE", button: "Enviar solicitação", success: "Solicitação de combustível enviada." },
  { key: "interface", title: "Solicitar Interface", subtitle: "Informar a ordem de serviço para criação da interface.", label: "Informações da OS", placeholder: "Descreva a OS e os dados necessários", button: "Enviar solicitação", success: "Solicitação de interface enviada." },
  { key: "manobra", title: "Solicitar Manobra", subtitle: "Informar os dados operacionais para execução da manobra.", label: "Informações da manobra técnica", placeholder: "Descreva detalhadamente a ordem e dados da manobra", button: "Enviar solicitação", success: "Solicitação de manobra enviada." },
  { key: "melhoria", title: "Solicitar Melhoria", subtitle: "Registrar uma sugestão ou necessidade de melhoria.", label: "Informações da melhoria", placeholder: "Descreva a melhoria desejada", button: "Enviar solicitação", success: "Solicitação de melhoria enviada." },
  { key: "manutencao_veicular", title: "Solicitar Manutenção Veicular", subtitle: "Pedir validação para manutenção do veículo.", label: "Manutenção a ser realizada", placeholder: "Descreva o problema, placa e manutenção necessária", button: "Enviar solicitação", success: "Solicitação de manutenção enviada." },
  { key: "ferramental", title: "Solicitar Ferramental", subtitle: "Troca ou requisição de ferramenta.", label: "Troca ou requisição de ferramental", placeholder: "Informe a ferramenta e o motivo", button: "Enviar solicitação", success: "Solicitação de ferramental enviada." },
  { key: "equipamento_ti", title: "Solicitar Equipamento TI", subtitle: "Troca ou requisição de equipamento de TI.", label: "Troca ou requisição de equipamento de TI", placeholder: "Informe o equipamento, patrimônio se houver, e motivo", button: "Enviar solicitação", success: "Solicitação de equipamento enviada." },
  { key: "correcao_excecao", title: "Solicitar Mudança de Exceção", subtitle: "Enviar correção necessária e motivo.", label: "Correção e motivo", placeholder: "Descreva a correção de exceção e o motivo", button: "Enviar solicitação", success: "Solicitação de correção enviada." }
];

const technicianActions = [
  ...requestTypes,
  { key: "script", title: "Script", subtitle: "Buscar script pelo modelo do roteador." },
  { key: "codigo_baixa", title: "Código de Baixa", subtitle: "Abrir PDF com os códigos." }
];

// ── ESTADO ──
const appEl = document.querySelector("#app");
let session = null;
let authMode = "login";
let adminTabActive = "solicitacoes";
let unsubscribeListeners = [];

// ── INICIALIZAÇÃO CORRIGIDA ──
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const emailPrefix = firebaseUser.email.split('@')[0];
    const reFromEmail = emailPrefix.replace('re', '');
    
    const q = query(collection(db, "users"), where("re", "==", reFromEmail));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const userDoc = snap.docs[0];
      session = { uid: firebaseUser.uid, id: userDoc.id, ...userDoc.data() };
      render();
    } else {
      await signOut(auth);
      session = null;
      renderAuth();
    }
  } else {
    session = null;
    render();
  }
});

// ── RENDER PRINCIPAL ──
function render() {
  cancelListeners();
  if (!session) { renderAuth(); return; }
  if (session.role === "administrador" || session.role === "administrador_master") {
    renderAdminHome();
  } else {
    renderTechnicianHome();
  }
}

function cancelListeners() {
  unsubscribeListeners.forEach(fn => fn());
  unsubscribeListeners = [];
}

// ── AUTH ──
function renderAuth() {
  appEl.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card">
        <header class="auth-header">
          <div class="brand-badge">GTD</div>
          <h1>GTD-Ability Tecnologia</h1>
          <p class="brand-sub">Sistema de Gestão Operacional Integrado</p>
        </header>
        <nav class="auth-tabs">
          <button class="tab-btn ${authMode === "login" ? "active" : ""}" id="tab-login">Login</button>
          <button class="tab-btn ${authMode === "register" ? "active" : ""}" id="tab-register">Primeiro Acesso</button>
          <button class="tab-btn ${authMode === "reset" ? "active" : ""}" id="tab-reset">Esqueci a Senha</button>
        </nav>
        <div class="auth-forms-container">
          <form class="form auth-form ${authMode === "login" ? "show" : ""}" id="form-login">
            <label>RE do Técnico ou CPF do Admin<input id="login-re" required inputmode="numeric" placeholder="Apenas números" /></label>
            <label>Senha de Acesso<input id="login-password" type="password" required placeholder="Sua senha" /></label>
            <div class="message" id="login-msg"></div>
            <button class="primary-btn" type="submit">Entrar no Sistema</button>
          </form>
          <form class="form auth-form ${authMode === "register" ? "show" : ""}" id="form-register">
            <p class="helper">Informe seu RE ou CPF pré-autorizado para criar seu acesso.</p>
            <label>RE ou CPF Autorizado<input id="register-re" required inputmode="numeric" placeholder="Apenas números" /></label>
            <label>Crie sua Senha (mín. 6 caracteres)<input id="register-password" type="password" required placeholder="Ex: gtd2026x" /></label>
            <div class="message" id="register-msg"></div>
            <button class="primary-btn" type="submit">Cadastrar e Ativar</button>
          </form>
          <form class="form auth-form ${authMode === "reset" ? "show" : ""}" id="form-reset">
            <p class="helper" style="color:#b45309;">Informe seu RE/CPF e nome para redefinir sua senha.</p>
            <label>RE ou CPF<input id="self-reset-re" required inputmode="numeric" placeholder="Apenas números" /></label>
            <label>Nome Completo<input id="self-reset-name" required placeholder="Como está registrado" /></label>
            <label>Nova Senha<input id="self-reset-password" type="password" required placeholder="Mín. 6 caracteres" /></label>
            <div class="message" id="self-reset-msg"></div>
            <button class="primary-btn" type="submit" style="background:#d97706;">Gravar Nova Senha</button>
          </form>
        </div>
      </div>
    </section>
  `;

  appEl.querySelector("#tab-login").addEventListener("click", () => { authMode = "login"; renderAuth(); });
  appEl.querySelector("#tab-register").addEventListener("click", () => { authMode = "register"; renderAuth(); });
  appEl.querySelector("#tab-reset").addEventListener("click", () => { authMode = "reset"; renderAuth(); });
  appEl.querySelector("#form-login").addEventListener("submit", handleLogin);
  appEl.querySelector("#form-register").addEventListener("submit", handleRegister);
  appEl.querySelector("#form-reset").addEventListener("submit", handleSelfReset);
}

async function handleLogin(e) {
  e.preventDefault();
  const re = appEl.querySelector("#login-re").value.trim().replace(/\D/g, "");
  const password = appEl.querySelector("#login-password").value;
  const msg = appEl.querySelector("#login-msg");

  try {
    const whitelistRef = await findInWhitelist(re);
    if (!whitelistRef) { showMessage(msg, "error", "RE/CPF não autorizado ou não cadastrado."); return; }
    const email = reToEmail(re);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showMessage(msg, "error", err.code === "auth/invalid-credential" ? "RE/CPF ou senha inválidos." : err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const re = appEl.querySelector("#register-re").value.trim().replace(/\D/g, "");
  const password = appEl.querySelector("#register-password").value;
  const msg = appEl.querySelector("#register-msg");

  if (password.length < 6) { showMessage(msg, "error", "A senha deve ter no mínimo 6 caracteres."); return; }

  try {
    const whitelistData = await findInWhitelist(re);
    if (!whitelistData) { showMessage(msg, "error", "RE/CPF não autorizado para cadastro."); return; }

    const existingUser = await findUserByRe(re);
    if (existingUser) { showMessage(msg, "error", "Este RE/CPF já possui cadastro. Faça login."); return; }

    const email = reToEmail(re);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      re: re,
      name: whitelistData.name,
      role: whitelistData.role || "tecnico",
      created_at: serverTimestamp()
    });

    alert("Cadastro efetuado com sucesso! Faça login.");
    authMode = "login";
    renderAuth();
  } catch (err) {
    showMessage(msg, "error", err.message);
  }
}

async function handleSelfReset(e) {
  e.preventDefault();
  const re = appEl.querySelector("#self-reset-re").value.trim().replace(/\D/g, "");
  const name = appEl.querySelector("#self-reset-name").value.trim().toUpperCase();
  const msg = appEl.querySelector("#self-reset-msg");

  try {
    const whitelistData = await findInWhitelist(re);
    if (!whitelistData) { showMessage(msg, "error", "RE/CPF não encontrado na base autorizada."); return; }
    if (whitelistData.name.toUpperCase() !== name) { showMessage(msg, "error", "Nome não confere com o cadastro."); return; }

    showMessage(msg, "ok", "Para redefinir sua senha, contate o seu supervisor administrador.");
  } catch (err) {
    showMessage(msg, "error", err.message);
  }
}

// ── HELPERS FIREBASE ──
function reToEmail(re) {
  return `re${re}@gtdability.internal`;
}

async function findInWhitelist(re) {
  const techRef = doc(db, "allowed_technicians", re);
  const techDoc = await getDoc(techRef);
  if (techDoc.exists()) return { ...techDoc.data(), role: techDoc.data().role || "tecnico" };

  const adminRef = doc(db, "allowed_admins", re);
  const adminDoc = await getDoc(adminRef);
  if (adminDoc.exists()) {
    const level = adminDoc.data().level || "admin";
    return { ...adminDoc.data(), role: level === "master" ? "administrador_master" : "administrador" };
  }

  return null;
}

async function findUserByRe(re) {
  const q = query(collection(db, "users"), where("re", "==", re));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

// ── TOPBAR ──
function topbar() {
  const displayRole = (session.role || "").toUpperCase().replace("_", " ");
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
    </header>
  `;
}

// ══════════════ ÁREA DO TÉCNICO ══════════════
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
          <h3 style="margin:0 0 6px;color:#166534;font-size:1.1rem;display:flex;align-items:center;gap:8px;">📅 Minha Escala de Plantão</h3>
          <div id="technician-escala-workarea" style="font-size:0.95rem;color:#14532d;">Buscando seus plantões...</div>
        </section>
        <div class="section-head"><div><h2>Painel do Técnico</h2><p>Envie solicitações ou consulte scripts operacionais.</p></div></div>
        <section class="grid">${technicianActions.map(actionTile).join("")}</section>
        <section class="panel" style="margin-top:24px;">
          <div class="section-head">
            <div><h2>Minhas solicitações em aberto</h2><p>Acompanhe o retorno do administrador.</p></div>
            <button class="secondary-btn" id="refresh-requests" style="width:auto;">Atualizar</button>
          </div>
          <div id="request-list" class="request-list"></div>
        </section>
      </main>
    </section>
  `;

  document.querySelector("#logout").addEventListener("click", doLogout);
  document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => openAction(b.dataset.action)));
  document.querySelector("#refresh-requests").addEventListener("click", loadRequests);

  loadRequests();
  loadRecentAnnouncements();
  loadTechnicianEscala();
  subscribeRequestUpdates();
}

async function loadTechnicianEscala() {
  const area = document.querySelector("#technician-escala-workarea");
  if (!area) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const q = query(collection(db, "escala_servico"), where("tecnico_re", "==", session.re));
  const snap = await getDocs(q);
  const activeScales = snap.docs.map(d => d.data()).filter(e => new Date(e.data_plantao + "T00:00:00") >= today).sort((a,b) => a.data_plantao.localeCompare(b.data_plantao));
  if (!activeScales.length) { area.innerHTML = "Você não possui nenhuma escala de plantão agendada por enquanto."; return; }
  area.innerHTML = `<div style="display:grid;gap:8px;margin-top:6px;">${activeScales.map(sc => `
    <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>🗓️ <strong>Dia:</strong> ${formatOnlyDate(sc.data_plantao)} | ⏰ <strong>Horário:</strong> ${sc.horario_inicio.substring(0,5)} às ${sc.horario_fim.substring(0,5)}</span>
      <span>👤 <strong>Supervisor:</strong> ${escapeHtml(sc.supervisor_plantao)}</span>
    </div>
  `).join("")}</div>`;
}

async function loadRecentAnnouncements() {
  const area = document.querySelector("#ticker-container-area");
  if (!area) return;

  const qAll = query(collection(db, "announcements"), where("target_type", "==", "todos"), orderBy("created_at", "desc"));
  const qSpec = query(collection(db, "announcements"), where("target_re", "==", session.re), orderBy("created_at", "desc"));

  const [snapAll, snapSpec] = await Promise.all([getDocs(qAll), getDocs(qSpec)]);
  const announcements = [...snapAll.docs, ...snapSpec.docs].map(d => ({ id: d.id, ...d.data() }));

  const ackSnap = await getDocs(query(collection(db, "announcement_acknowledgments"), where("technician_re", "==", session.re)));
  const readIds = ackSnap.docs.map(d => d.data().announcement_id);
  const unread = announcements.filter(a => !readIds.includes(a.id));

  if (!unread.length) { area.innerHTML = "<div>✅ Você já visualizou todos os comunicados recentes.</div>"; return; }

  area.innerHTML = unread.map(aviso => {
    const prefix = aviso.target_type === "especifico" ? "🔒 [Aviso Direcionado]" : "📢 [Aviso Geral]";
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.6);padding:8px 12px;border-radius:6px;border:1px solid rgba(133,100,4,0.15);width:100%;">
        <span><strong>${prefix}</strong> ${escapeHtml(aviso.content)} <small style="color:var(--muted);margin-left:6px;">(${formatDate(aviso.created_at?.toDate ? aviso.created_at.toDate() : new Date())})</small></span>
        <button class="primary-btn" data-ack="${aviso.id}" style="min-height:24px;padding:2px 8px;font-size:0.75rem;background:#d97706;width:auto;font-weight:700;">Ok, Lido</button>
      </div>
    `;
  }).join("");

  area.querySelectorAll("[data-ack]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await addDoc(collection(db, "announcement_acknowledgments"), { announcement_id: btn.dataset.ack, technician_re: session.re, acknowledged_at: serverTimestamp() });
      loadRecentAnnouncements();
    });
  });
}

async function loadRequests() {
  const list = document.querySelector("#request-list");
  if (!list) return;
  list.innerHTML = `<div class="empty">Carregando solicitações...</div>`;
  const q = query(collection(db, "requests"), where("technician_re", "==", session.re), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status !== "arquivado");
  if (!data.length) { list.innerHTML = `<div class="empty">Nenhuma solicitação em aberto.</div>`; return; }
  list.innerHTML = data.map(item => {
    const isAnswered = item.status === "ok" || item.status === "nao_ok";
    const badgeClass = item.status === "ok" ? "done" : item.status === "nao_ok" ? "denied" : "pending";
    return `
      <article style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;">
        <div style="flex:1;">
          <strong>${escapeHtml(item.title)}</strong>
          <p style="margin:4px 0;color:var(--muted);font-size:0.9rem;">${escapeHtml(item.admin_response || "Aguardando posicionamento do administrador.")}</p>
          <small style="color:var(--muted);font-size:0.8rem;">${formatDate(item.created_at?.toDate ? item.created_at.toDate() : new Date())}</small>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <span class="badge ${badgeClass}">${labelStatus(item.status)}</span>
          ${isAnswered ? `<button class="primary-btn" data-archive="${item.id}" style="min-height:28px;padding:2px 10px;font-size:0.8rem;background:var(--muted);width:auto;">Ciente / OK</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-archive]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await updateDoc(doc(db, "requests", btn.dataset.archive), { status: "arquivado" });
      loadRequests();
    });
  });
}

function subscribeRequestUpdates() {
  const q = query(collection(db, "requests"), where("technician_re", "==", session.re));
  const unsub = onSnapshot(q, () => { if (document.querySelector("#request-list")) loadRequests(); });
  unsubscribeListeners.push(unsub);
}

function actionTile(action) {
  return `<button class="tile" data-action="${action.key}"><div>${escapeHtml(action.title)}<span>${escapeHtml(action.subtitle)}</span></div><span class="icon">${iconFor(action.key)}</span></button>`;
}

function iconFor(key) {
  const icons = { combustivel:"⛽", interface:"↔", manobra:"🔀", melhoria:"+", manutencao_veicular:"⚙", ferramental:"◧", equipamento_ti:"▣", correcao_excecao:"!", script:"{ }", codigo_baixa:"PDF" };
  return icons[key] || "•";
}

function openAction(key) {
  if (key === "script") { renderScriptView(); return; }
  if (key === "codigo_baixa") { renderPdfView(); return; }
  renderRequestForm(requestTypes.find(i => i.key === key));
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
              ${type.key === "combustivel"
                ? `<input name="details" inputmode="numeric" required value="${escapeHtml(session.re)}" />`
                : `<textarea name="details" required placeholder="${escapeHtml(type.placeholder)}"></textarea>`}
            </label>
            <div class="message" id="request-message"></div>
            <button class="primary-btn" type="submit">${escapeHtml(type.button)}</button>
          </form>
        </section>
      </main>
    </section>
  `;
  document.querySelector("#back-home").addEventListener("click", () => { cancelListeners(); renderTechnicianHome(); });
  document.querySelector("#logout").addEventListener("click", doLogout);
  document.querySelector("#request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const details = String(new FormData(form).get("details")).trim();
    const message = document.querySelector("#request-message");
    setFormBusy(form, true);
    try {
      await addDoc(collection(db, "requests"), {
        technician_re: session.re, technician_name: session.name,
        type: type.key, title: type.title, details,
        status: "pendente", admin_response: null,
        created_at: serverTimestamp(), updated_at: serverTimestamp()
      });
      form.reset(); showMessage(message, "ok", type.success);
    } catch(err) { showMessage(message, "error", err.message); }
    setFormBusy(form, false);
  });
}

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
          <div id="script-result"></div>
        </section>
      </main>
    </section>
  `;
  document.querySelector("#back-home").addEventListener("click", () => { cancelListeners(); renderTechnicianHome(); });
  document.querySelector("#logout").addEventListener("click", doLogout);
  document.querySelector("#script-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = document.querySelector("#script-result");
    const model = String(new FormData(e.currentTarget).get("model")).trim().toLowerCase();
    result.innerHTML = `<div class="empty">Buscando...</div>`;
    const snap = await getDocs(collection(db, "scripts"));
    const found = snap.docs.map(d => d.data()).find(d => d.router_model.toLowerCase().includes(model));
    if (!found) { result.innerHTML = `<div class="empty">Não encontrado.</div>`; return; }
    result.innerHTML = `<h3>${escapeHtml(found.router_model)}</h3><pre class="script-box">${escapeHtml(found.content)}</pre>`;
  });
}

function renderPdfView() {
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <main class="content">
        <div class="view-actions"><button class="secondary-btn" id="back-home" style="width:auto;">Voltar</button></div>
        <section class="panel"><h2>Código de Baixa</h2><iframe class="pdf-frame" src="assets/codigos-baixa.pdf"></iframe></section>
      </main>
    </section>
  `;
  document.querySelector("#back-home").addEventListener("click", () => { cancelListeners(); renderTechnicianHome(); });
  document.querySelector("#logout").addEventListener("click", doLogout);
}

// ── ÁREA DO ADMINISTRADOR ──
function renderAdminHome() {
  const isMaster = session.role === "administrador_master";
  appEl.innerHTML = `
    <section class="app-shell">
      ${topbar()}
      <main class="content">
        <div class="section-head"><div><h2>Painel Administrativo</h2><p>Gestão de solicitações operacionais.</p></div></div>
        <div class="tabs">
          <button class="tab ${adminTabActive === "solicitacoes" ? "active" : ""}" id="tab-sol">Solicitações</button>
          <button class="tab ${adminTabActive === "scripts" ? "active" : ""}" id="tab-scr">Scripts</button>
          <button class="tab ${adminTabActive === "escala" ? "active" : ""}" id="tab-esc">Escala</button>
          <button class="tab ${adminTabActive === "comunicados" ? "active" : ""}" id="tab-com">Mural de Avisos</button>
          ${isMaster ? `<button class="tab ${adminTabActive === "usuarios" ? "active" : ""}" id="tab-usr">Usuários</button>` : ""}
        </div>
        <div id="admin-panel-content" style="margin-top:20px;"></div>
      </main>
    </section>
  `;
  document.querySelector("#logout").addEventListener("click", doLogout);
  document.querySelector("#tab-sol").addEventListener("click", () => { adminTabActive = "solicitacoes"; renderAdminHome(); });
  document.querySelector("#tab-scr").addEventListener("click", () => { adminTabActive = "scripts"; renderAdminHome(); });
  document.querySelector("#tab-esc").addEventListener("click", () => { adminTabActive = "escala"; renderAdminHome(); });
  document.querySelector("#tab-com").addEventListener("click", () => { adminTabActive = "comunicados"; renderAdminHome(); });
  if (isMaster) document.querySelector("#tab-usr").addEventListener("click", () => { adminTabActive = "usuarios"; renderAdminHome(); });

  if (adminTabActive === "solicitacoes") renderAdminRequests();
  if (adminTabActive === "scripts") renderAdminScripts();
  if (adminTabActive === "escala") renderAdminEscala();
  if (adminTabActive === "comunicados") renderAdminAnnouncements();
  if (adminTabActive === "usuarios") renderAdminUsers();
}

async function renderAdminRequests() {
  const container = document.querySelector("#admin-panel-content");
  container.innerHTML = `<div class="empty">Buscando solicitações...</div>`;
  const q = query(collection(db, "requests"), orderBy("created_at", "desc"));

  const unsub = onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!data.length) { container.innerHTML = `<div class="empty">Nenhuma solicitação na fila.</div>`; return; }

    const categoryMeta = {
      combustivel: { title: "⛽ Combustível", color: "#f59e0b" },
      interface: { title: "↔ Interface", color: "#4f46e5" },
      manobra: { title: "🔀 Manobra Operacional", color: "#1e1b4b" },
      melhoria: { title: "+ Melhoria", color: "#10b981" },
      manutencao_veicular: { title: "⚙ Manutenção Veicular", color: "#64748b" },
      ferramental: { title: "◧ Ferramental", color: "#3b82f6" },
      equipamento_ti: { title: "▣ Equipamento de TI", color: "#ec4899" },
      correcao_excecao: { title: "! Mudança de Exceção", color: "#ef4444" }
    };

    const grouped = data.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = []; acc[item.type].push(item); return acc;
    }, {});

    container.innerHTML = `<div style="display:grid;gap:32px;">${Object.keys(grouped).map(catKey => {
      const items = grouped[catKey];
      const meta = categoryMeta[catKey] || { title: catKey, color: "#64748b" };
      const pendentes = items.filter(r => r.status === "pendente");
      const respondidos = items.filter(r => r.status === "ok" || r.status === "nao_ok");
      const arquivados = items.filter(r => r.status === "arquivado");

      return `
        <div style="border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);overflow:hidden;">
          <div style="background:var(--surface-2);padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:1rem;font-weight:700;color:${meta.color};">${meta.title}</h3>
            <span style="font-size:0.8rem;color:var(--muted);">${items.length} total · ${pendentes.length} pendente(s)</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;">
            ${renderKanbanCol("🕐 Pendente", pendentes, "#fef3c7", "pendente")}
            ${renderKanbanCol("✅ Respondido", respondidos, "#d1fae5", "respondido")}
            ${renderKanbanCol("📁 Arquivado", arquivados, "#f1f5f9", "arquivado")}
          </div>
        </div>
      `;
    }).join("")}</div>`;

    container.querySelectorAll("[data-respond]").forEach(btn => {
      btn.addEventListener("click", () => openRespondModal(btn.dataset.respond, btn.dataset.title));
    });
  });
  unsubscribeListeners.push(unsub);
}

function renderKanbanCol(title, items, bg, colType) {
  return `
    <div style="padding:16px;border-right:1px solid var(--line);background:${bg}20;min-height:120px;">
      <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;color:var(--muted);">${title}</div>
      ${items.length === 0 ? `<div style="font-size:0.85rem;color:var(--muted);font-style:italic;">Vazio</div>` : items.map(item => `
        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;font-size:0.88rem;">
          <strong>${escapeHtml(item.technician_name)}</strong>
          <p style="margin:4px 0;color:var(--muted);font-size:0.82rem;">${escapeHtml(item.details?.substring(0, 80))}${item.details?.length > 80 ? "..." : ""}</p>
          <small style="color:var(--muted);">${formatDate(item.created_at?.toDate ? item.created_at.toDate() : new Date())}</small>
          ${item.admin_response ? `<p style="margin:4px 0;font-size:0.82rem;color:#065f46;background:#d1fae5;padding:4px 8px;border-radius:4px;">↩ ${escapeHtml(item.admin_response)}</p>` : ""}
          ${colType === "pendente" ? `<button class="primary-btn" data-respond="${item.id}" data-title="${escapeHtml(item.title)}" style="margin-top:8px;padding:4px 10px;font-size:0.8rem;min-height:0;width:auto;">Responder</button>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function openRespondModal(requestId, title) {
  const existing = document.querySelector("#respond-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "respond-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px;";
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px;width:100%;max-width:440px;">
      <h3 style="margin:0 0 16px;">${escapeHtml(title)}</h3>
      <form id="respond-form" class="form">
        <label>Resposta / Posicionamento
          <textarea name="response" required placeholder="Descreva o retorno para o técnico..." rows="4"></textarea>
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
          <button class="primary-btn" type="submit" data-status="ok" style="flex:1;background:#10b981;">✅ Aprovar</button>
          <button class="primary-btn" type="submit" data-status="nao_ok" style="flex:1;background:#ef4444;">❌ Recusar</button>
        </div>
        <button type="button" id="close-modal" class="secondary-btn" style="margin-top:8px;">Cancelar</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document.querySelector("#close-modal").addEventListener("click", () => modal.remove());

  let chosenStatus = "ok";
  modal.querySelectorAll("[data-status]").forEach(btn => {
    btn.addEventListener("click", () => { chosenStatus = btn.dataset.status; });
  });

  document.querySelector("#respond-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const response = String(new FormData(e.currentTarget).get("response")).trim();
    await updateDoc(doc(db, "requests", requestId), {
      status: chosenStatus, admin_response: response, updated_at: serverTimestamp()
    });
    modal.remove();
  });
}

async function renderAdminScripts() {
  const container = document.querySelector("#admin-panel-content");
  container.innerHTML = `
    <section class="panel">
      <h2>Gerenciar Scripts</h2>
      <form class="form" id="script-add-form" style="margin-bottom:24px;">
        <label>Modelo do Roteador<input id="script-model" required placeholder="Ex.: Huawei HG8245H" /></label>
        <label>Conteúdo do Script<textarea id="script-content" required rows="6" placeholder="Cole o script aqui..."></textarea></label>
        <div class="message" id="script-msg"></div>
        <button class="primary-btn" type="submit" style="width:auto;">Adicionar Script</button>
      </form>
      <div id="scripts-list"><div class="empty">Carregando scripts...</div></div>
    </section>
  `;

  document.querySelector("#script-add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const model = document.querySelector("#script-model").value.trim();
    const content = document.querySelector("#script-content").value.trim();
    const msg = document.querySelector("#script-msg");
    try {
      await addDoc(collection(db, "scripts"), { router_model: model, content, created_at: serverTimestamp() });
      showMessage(msg, "ok", "Script adicionado!");
      e.currentTarget.reset();
      loadScriptsList();
    } catch(err) { showMessage(msg, "error", err.message); }
  });

  loadScriptsList();
}

async function loadScriptsList() {
  const list = document.querySelector("#scripts-list");
  if (!list) return;
  const snap = await getDocs(query(collection(db, "scripts"), orderBy("router_model")));
  if (snap.empty) { list.innerHTML = `<div class="empty">Nenhum script cadastrado.</div>`; return; }
  list.innerHTML = snap.docs.map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;">
      <strong>${escapeHtml(d.data().router_model)}</strong>
      <button class="ghost-btn" data-delete-script="${d.id}">Excluir</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-delete-script]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este script?")) return;
      await deleteDoc(doc(db, "scripts", btn.dataset.deleteScript));
      loadScriptsList();
    });
  });
}

async function renderAdminEscala() {
  const container = document.querySelector("#admin-panel-content");
  container.innerHTML = `
    <section class="panel">
      <h2>Escala de Serviço</h2>
      <form class="form" id="escala-form" style="margin-bottom:24px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <label>RE do Técnico<input id="esc-re" required inputmode="numeric" placeholder="RE" /></label>
          <label>Nome do Técnico<input id="esc-name" required placeholder="Nome completo" /></label>
          <label>Data do Plantão<input id="esc-date" type="date" required /></label>
          <label>Supervisor de Plantão<input id="esc-sup" required placeholder="Nome do supervisor" /></label>
          <label>Horário Início<input id="esc-start" type="time" required /></label>
          <label>Horário Fim<input id="esc-end" type="time" required /></label>
        </div>
        <div class="message" id="esc-msg"></div>
        <button class="primary-btn" type="submit" style="width:auto;">Adicionar Escala</button>
      </form>
      <div id="escala-list"><div class="empty">Carregando escalas...</div></div>
    </section>
  `;

  document.querySelector("#escala-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.querySelector("#esc-msg");
    try {
      await addDoc(collection(db, "escala_servico"), {
        tecnico_re: document.querySelector("#esc-re").value.trim(),
        tecnico_name: document.querySelector("#esc-name").value.trim(),
        data_plantao: document.querySelector("#esc-date").value,
        supervisor_plantao: document.querySelector("#esc-sup").value.trim(),
        horario_inicio: document.querySelector("#esc-start").value,
        horario_fim: document.querySelector("#esc-end").value,
        created_at: serverTimestamp()
      });
      showMessage(msg, "ok", "Escala adicionada!");
      e.currentTarget.reset();
      loadEscalaList();
    } catch(err) { showMessage(msg, "error", err.message); }
  });

  loadEscalaList();
}

async function loadEscalaList() {
  const list = document.querySelector("#escala-list");
  if (!list) return;
  const snap = await getDocs(query(collection(db, "escala_servico"), orderBy("data_plantao", "desc")));
  if (snap.empty) { list.innerHTML = `<div class="empty">Nenhuma escala cadastrada.</div>`; return; }
  list.innerHTML = snap.docs.map(d => {
    const sc = d.data();
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;flex-wrap:wrap;gap:8px;">
        <div>
          <strong>${escapeHtml(sc.tecnico_name)}</strong> (RE: ${sc.tecnico_re})
          <p style="margin:2px 0;font-size:0.85rem;color:var(--muted);">📅 ${formatOnlyDate(sc.data_plantao)} | ⏰ ${sc.horario_inicio?.substring(0,5)} às ${sc.horario_fim?.substring(0,5)} | 👤 ${escapeHtml(sc.supervisor_plantao)}</p>
        </div>
        <button class="ghost-btn" data-delete-escala="${d.id}">Excluir</button>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-delete-escala]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir esta escala?")) return;
      await deleteDoc(doc(db, "escala_servico", btn.dataset.deleteEscala));
      loadEscalaList();
    });
  });
}

async function renderAdminAnnouncements() {
  const container = document.querySelector("#admin-panel-content");
  container.innerHTML = `
    <section class="panel">
      <h2>Mural de Avisos</h2>
      <form class="form" id="announcement-form" style="margin-bottom:24px;">
        <label>Tipo de Aviso
          <select id="ann-type">
            <option value="todos">Para todos os técnicos</option>
            <option value="especifico">Para um técnico específico (RE)</option>
          </select>
        </label>
        <div id="ann-re-wrapper" style="display:none;">
          <label>RE do Técnico<input id="ann-re" inputmode="numeric" placeholder="RE do técnico" /></label>
        </div>
        <label>Conteúdo do Aviso<textarea id="ann-content" required rows="3" placeholder="Digite o aviso..."></textarea></label>
        <div class="message" id="ann-msg"></div>
        <button class="primary-btn" type="submit" style="width:auto;">Publicar Aviso</button>
      </form>
      <div id="ann-list"><div class="empty">Carregando avisos...</div></div>
    </section>
  `;

  document.querySelector("#ann-type").addEventListener("change", (e) => {
    document.querySelector("#ann-re-wrapper").style.display = e.target.value === "especifico" ? "block" : "none";
  });

  document.querySelector("#announcement-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.querySelector("#ann-type").value;
    const re = document.querySelector("#ann-re").value.trim();
    const content = document.querySelector("#ann-content").value.trim();
    const msg = document.querySelector("#ann-msg");
    if (type === "especifico" && !re) { showMessage(msg, "error", "Informe o RE do técnico."); return; }
    try {
      await addDoc(collection(db, "announcements"), {
        target_type: type, target_re: type === "especifico" ? re : null,
        content, created_by: session.name, created_at: serverTimestamp()
      });
      showMessage(msg, "ok", "Aviso publicado!");
      e.currentTarget.reset();
      document.querySelector("#ann-re-wrapper").style.display = "none";
      loadAnnList();
    } catch(err) { showMessage(msg, "error", err.message); }
  });

  loadAnnList();
}

async function loadAnnList() {
  const list = document.querySelector("#ann-list");
  if (!list) return;
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("created_at", "desc")));
  if (snap.empty) { list.innerHTML = `<div class="empty">Nenhum aviso publicado.</div>`; return; }
  list.innerHTML = snap.docs.map(d => {
    const a = d.data();
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:#fff;gap:12px;">
        <div style="flex:1;">
          <span style="font-size:0.75rem;font-weight:700;background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:4px;">${a.target_type === "todos" ? "TODOS" : `RE: ${a.target_re}`}</span>
          <p style="margin:6px 0 2px;">${escapeHtml(a.content)}</p>
          <small style="color:var(--muted);">Por ${escapeHtml(a.created_by)} · ${formatDate(a.created_at?.toDate ? a.created_at.toDate() : new Date())}</small>
        </div>
        <button class="ghost-btn" data-delete-ann="${d.id}">Excluir</button>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-delete-ann]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este aviso?")) return;
      await deleteDoc(doc(db, "announcements", btn.dataset.deleteAnn));
      loadAnnList();
    });
  });
}

async function renderAdminUsers() {
  const container = document.querySelector("#admin-panel-content");
  container.innerHTML = `
    <section class="panel">
      <h2>Controle de Usuários</h2>
      <p class="helper" style="margin-bottom:16px;">Consulte pelo RE ou CPF para verificar status, autorizar, alterar funções ou excluir usuários.</p>
      <div style="display:flex;gap:10px;margin-bottom:22px;max-width:500px;">
        <input id="search-re" inputmode="numeric" placeholder="Digite RE ou CPF" style="padding:10px;" />
        <button class="primary-btn" id="btn-search" style="min-width:120px;width:auto;">Consultar</button>
      </div>
      <div id="user-workarea"><div class="empty">Insira um identificador acima.</div></div>
    </section>
  `;

  document.querySelector("#btn-search").addEventListener("click", async () => {
    const re = document.querySelector("#search-re").value.trim().replace(/\D/g, "");
    const workarea = document.querySelector("#user-workarea");
    if (!re) { alert("Informe o RE ou CPF."); return; }
    workarea.innerHTML = `<div class="empty">Consultando...</div>`;

    const whitelistData = await findInWhitelist(re);
    const userDoc = await findUserByRe(re);

    const status = userDoc ? "cadastrado" : whitelistData ? "na_whitelist" : "nao_autorizado";
    const statusLabel = status === "cadastrado" ? "CONTA ATIVA" : status === "na_whitelist" ? "AUTORIZADO / SEM CADASTRO" : "NÃO AUTORIZADO";
    const alertClass = status === "cadastrado" ? "done" : status === "na_whitelist" ? "pending" : "denied";

    workarea.innerHTML = `
      <div class="badge ${alertClass}" style="margin-bottom:16px;font-size:0.85rem;padding:6px 12px;">Status: ${statusLabel}</div>
      <form class="form" id="user-form">
        <label>Nome Completo<input id="mut-name" required value="${escapeHtml(whitelistData?.name || userDoc?.name || "")}" placeholder="Nome completo em maiúsculas" ${status === "cadastrado" ? "disabled" : ""} /></label>
        <label>Função / Nível de Acesso
          <select id="mut-role" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:13px 14px;background:#fff;font:inherit;">
            <option value="tecnico" ${(whitelistData?.role || userDoc?.role) === "tecnico" ? "selected" : ""}>Técnico</option>
            <option value="administrador" ${(whitelistData?.role || userDoc?.role) === "administrador" ? "selected" : ""}>Administrador</option>
            <option value="administrador_master" ${(whitelistData?.role || userDoc?.role) === "administrador_master" ? "selected" : ""}>Administrador Master</option>
          </select>
        </label>
        <div class="message" id="mut-msg"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
          <button class="primary-btn" type="submit" style="flex:1;min-width:160px;">${status === "cadastrado" ? "Atualizar Função" : "Salvar e Autorizar"}</button>
          ${status !== "nao_autorizado" ? `<button class="secondary-btn" type="button" id="btn-delete-user" style="color:var(--danger);border-color:var(--danger);min-width:160px;width:auto;">Excluir Definitivamente</button>` : ""}
        </div>
      </form>
    `;

    document.querySelector("#user-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.querySelector("#mut-name").value.trim().toUpperCase();
      const role = document.querySelector("#mut-role").value;
      const msg = document.querySelector("#mut-msg");

      try {
        if (status === "cadastrado") {
          const userSnap = await getDocs(query(collection(db, "users"), where("re", "==", re)));
          if (!userSnap.empty) {
            await updateDoc(doc(db, "users", userSnap.docs[0].id), { role });
          }
        } else {
          if (role === "tecnico") {
            await setDoc(doc(db, "allowed_technicians", re), { re, name, role: "tecnico" });
          } else {
            await setDoc(doc(db, "allowed_admins", re), { cpf: re, name, level: role === "administrador_master" ? "master" : "admin", role });
          }
        }
        showMessage(msg, "ok", "Gravado com sucesso!");
      } catch(err) { showMessage(msg, "error", err.message); }
    });

    const deleteBtn = document.querySelector("#btn-delete-user");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Excluir DEFINITIVAMENTE o ID ${re}?`)) return;
        try {
          await deleteDoc(doc(db, "allowed_technicians", re));
          await deleteDoc(doc(db, "allowed_admins", re));
          const userSnap = await getDocs(query(collection(db, "users"), where("re", "==", re)));
          for (const d of userSnap.docs) await deleteDoc(doc(db, "users", d.id));
          alert("Usuário excluído com sucesso!");
          renderAdminUsers();
        } catch(err) { alert("Erro: " + err.message); }
      });
    }
  });
}

// ── LOGOUT ──
async function doLogout() {
  cancelListeners();
  await signOut(auth);
  session = null;
  render();
}

// ── AUXILIARES ──
function showMessage(el, type, text) { el.className = `message show ${type}`; el.textContent = text; }
function setFormBusy(form, busy) { form.querySelectorAll("button,input,textarea,select").forEach(f => f.disabled = busy); }
function labelStatus(s) { return { pendente:"Pendente", ok:"OK", nao_ok:"Não OK", arquivado:"Lido" }[s] || s; }
function formatDate(v) { if (!v) return ""; return new Intl.DateTimeFormat("pt-BR", { dateStyle:"short", timeStyle:"short" }).format(new Date(v)); }
function formatOnlyDate(v) { if (!v) return ""; const p = v.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v; }
function escapeHtml(v) { return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }