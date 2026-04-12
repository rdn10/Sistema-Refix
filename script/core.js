// ==========================================
// core.js - CÉREBRO ONLINE (SUPABASE)
// ==========================================

const supabaseUrl = 'https://xsjbxpjnzqeeadtgkyaq.supabase.co';
const supabaseKey = 'sb_publishable_HjUtDByHTBSI92kGm5tjmg_cYWxSpeL';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

var globalFilterDataExata = '';
var acaoExclusaoPendente = null;
window.carrinhoGlobal = [];

window.dashChartInst = null;

const ITEMS_PER_PAGE = 10;
var currentPage = { estoque: 1, servicos: 1, pedidos: 1, financeiro: 1, usuarios: 1, master: 1 };

function getSession() { return JSON.parse(localStorage.getItem('erp_session')); }
function setSession(u) { localStorage.setItem('erp_session', JSON.stringify(u)); }

// === CONTROLE DE TEMA (DARK/LIGHT) ===
function initTheme() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}
initTheme();

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (typeof updateDashboard === 'function') updateDashboard(); // Atualiza o gráfico p/ nova cor
}

window.addEventListener('load', async () => {
    if(window.lucide) lucide.createIcons();
    if(getSession()) await iniciarApp();
});

async function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value; const senha = document.getElementById('login-senha').value;
    const { data: user, error } = await sb.from('users').select('*').eq('email', email).eq('password', senha).single();
    if (error || !user) return alert("Falha na autenticação!");
    setSession(user); location.reload();
}

async function fazerCadastro(e) {
    e.preventDefault();
    const cId = 'C-' + Date.now(); const exp = new Date(); exp.setDate(exp.getDate() + 7);
    const { error: err1 } = await sb.from('companies').insert([{ id: cId, name: document.getElementById('reg-empresa').value, status: 'active', expires_at: exp.toISOString() }]);
    const { error: err2 } = await sb.from('users').insert([{ id: 'U-' + Date.now(), company_id: cId, name: document.getElementById('reg-nome').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-senha').value, role: 'ADMIN' }]);
    if (err1 || err2) return alert("Erro crítico na criação do root."); alert("Instância ativada! License: 7 Days."); location.reload();
}

async function iniciarApp() {
      if(!globalFilterValue) {
        const mesAtual = new Date().toISOString().substring(0, 7);
        document.getElementById('filter-month').value = mesAtual;
        globalFilterValue = mesAtual;
    }
    const s = getSession(); if (!s) return;
    const { data: comp, error } = await sb.from('companies').select('*').eq('id', s.company_id).single();
    if (error || !comp) return fazerLogout();

    const EMAIL_MASTER = "ruan@gmail.com"; 
    const btnMaster = document.getElementById('menu-master');

    const companyNameEl = document.getElementById('company-name'); if (companyNameEl) companyNameEl.innerText = (s.email === EMAIL_MASTER) ? "ROOT SYSTEM" : comp.name;
    const emailDisplayEl = document.getElementById('user-email-display'); if (emailDisplayEl) emailDisplayEl.innerText = s.email;
    const avatarEl = document.getElementById('user-avatar'); if (avatarEl) avatarEl.innerText = s.name.substring(0, 2).toUpperCase();

    if (s.email === EMAIL_MASTER) {
        if (btnMaster) btnMaster.classList.remove('hidden');
        document.getElementById('user-badge').innerText = "ROOT"; document.getElementById('user-badge').className = "px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-black rounded text-[10px] uppercase font-black border border-transparent dark:border-gray-200";
        document.querySelectorAll('.menu-btn').forEach(btn => { if (btn.id !== 'menu-master') btn.classList.add('hidden'); });
        document.getElementById('auth-view').classList.add('hidden'); document.getElementById('app-view').classList.remove('hidden');
        navigate('master'); return; 
    } else {
        if (btnMaster) btnMaster.classList.add('hidden');
        const hoje = new Date(); const expira = new Date(comp.expires_at);
        if (hoje > expira || comp.status === 'blocked') { document.getElementById('blocked-view').classList.remove('hidden'); return; }

        if (s.role === 'ADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden')); document.querySelectorAll('.tech-only').forEach(el => el.classList.add('hidden')); 
            document.getElementById('user-badge').innerText = "Dono"; document.getElementById('user-badge').className = "px-2 py-0.5 border border-purple-500 text-purple-600 dark:border-white dark:text-white rounded text-[10px] uppercase font-black tracking-widest";
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden')); document.querySelectorAll('.tech-only').forEach(el => el.classList.remove('hidden'));
            document.getElementById('user-badge').innerText = "Tecnico"; document.getElementById('user-badge').className = "px-2 py-0.5 border border-blue-500 text-blue-500 dark:text-blue-400 rounded text-[10px] uppercase font-black tracking-widest";
        }
    }
    document.getElementById('auth-view').classList.add('hidden'); document.getElementById('app-view').classList.remove('hidden');
    
    await atualizarContadoresMenu();
    await renderizarTudo();
}

async function atualizarContadoresMenu() {
    try {
        const s = getSession(); if(!s) return;
        const [resSrv, resPrd, resOrd] = await Promise.all([ sb.from('services').select('created_at').eq('company_id', s.company_id), sb.from('products').select('created_at').eq('company_id', s.company_id), sb.from('orders').select('date').eq('company_id', s.company_id) ]);
        const cSrv = (resSrv.data || []).filter(x => passaNoFiltro(x.created_at)).length; const cPrd = (resPrd.data || []).filter(x => passaNoFiltro(x.created_at)).length; const cOrd = (resOrd.data || []).filter(x => passaNoFiltro(x.date)).length;

        if(document.getElementById('global-cnt-srv')) document.getElementById('global-cnt-srv').innerText = cSrv;
        if(document.getElementById('global-cnt-prod')) document.getElementById('global-cnt-prod').innerText = cPrd;
        if(document.getElementById('global-cnt-ped')) document.getElementById('global-cnt-ped').innerText = cOrd;

        const indFiltro = document.getElementById('ind-filtro-lateral');
        if (indFiltro) { if (globalFilterDataExata) indFiltro.classList.remove('hidden'); else indFiltro.classList.add('hidden'); }
    } catch(e) {}
}

async function renderizarTudo() {
    try {
        const s = getSession(); if(!s) return;
        if (s.email === "ruan@gmail.com") { if(typeof renderizarPainelMaster === 'function') await renderizarPainelMaster(); } 
        else {
            if(typeof updateDashboard === 'function') await updateDashboard();
            if(typeof renderTabelaEstoque === 'function') await renderTabelaEstoque();
            if(typeof renderizarTabelaServicos === 'function') await renderizarTabelaServicos();
            if(typeof renderTabelaPedidos === 'function') await renderTabelaPedidos();
            if(typeof preencherModelosIphone === 'function') preencherModelosIphone();
            if(s.role === 'ADMIN') { if(typeof renderizarTabelaFinanceira === 'function') await renderizarTabelaFinanceira(); if(typeof renderTabelaUsuarios === 'function') await renderTabelaUsuarios(); }
        }
        if(window.lucide) lucide.createIcons();
    } catch(e) { console.log(e); }
}

function navigate(v) {
    document.querySelectorAll('.view-section').forEach(el => { el.classList.remove('active', 'block'); el.classList.add('hidden'); });
    const target = document.getElementById('view-' + v); if (target) { target.classList.add('active', 'block'); target.classList.remove('hidden'); }
    
    document.querySelectorAll('.menu-btn').forEach(b => {
        if(b.getAttribute('data-target') === v) { b.classList.add('bg-gray-100', 'dark:bg-[#1A1A1A]', 'text-gray-900', 'dark:text-white'); b.classList.remove('text-gray-600', 'dark:text-gray-400'); } 
        else { b.classList.remove('bg-gray-100', 'dark:bg-[#1A1A1A]', 'text-gray-900', 'dark:text-white'); b.classList.add('text-gray-600', 'dark:text-gray-400'); }
    });

    document.getElementById('page-title').innerText = v.toUpperCase();
    renderizarTudo();
}

function renderizarPaginacao(totalItems, viewName, containerId) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1; const pageNum = currentPage[viewName]; const start = (pageNum - 1) * ITEMS_PER_PAGE + 1; const end = Math.min(pageNum * ITEMS_PER_PAGE, totalItems);
    let html = `<div class="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase tracking-widest w-full text-center md:text-left md:w-auto mb-2 md:mb-0">Registros: <b class="text-gray-800 dark:text-white">${totalItems === 0 ? 0 : start}</b> - <b class="text-gray-800 dark:text-white">${end}</b> de <b class="text-gray-800 dark:text-white">${totalItems}</b></div>
    <div class="flex items-center justify-center w-full md:w-auto gap-2"><button onclick="mudarPagina('${viewName}', -1)" ${pageNum === 1 ? 'disabled class="p-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded text-gray-400 dark:text-gray-600"' : 'class="p-2 bg-white dark:bg-[#222] border border-gray-300 dark:border-[#333] rounded text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#333] transition"'}><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="px-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pg ${pageNum} / ${totalPages}</span><button onclick="mudarPagina('${viewName}', 1)" ${pageNum === totalPages ? 'disabled class="p-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded text-gray-400 dark:text-gray-600"' : 'class="p-2 bg-white dark:bg-[#222] border border-gray-300 dark:border-[#333] rounded text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#333] transition"'}><i data-lucide="chevron-right" class="w-4 h-4"></i></button></div>`;
    document.getElementById(containerId).innerHTML = html; if(window.lucide) lucide.createIcons();
}

window.mudarPagina = async function(viewName, dir) { currentPage[viewName] += dir; if (viewName === 'estoque') await renderTabelaEstoque(); if (viewName === 'servicos') await renderizarTabelaServicos(); if (viewName === 'pedidos') await renderTabelaPedidos(); if (viewName === 'financeiro') await renderizarTabelaFinanceira(); if (viewName === 'usuarios') await renderTabelaUsuarios(); if (viewName === 'master') await renderizarPainelMaster(); }
window.resetPageAndRender = function(viewName) { currentPage[viewName] = 1; if(viewName === 'servicos') renderizarTabelaServicos(); }

function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function formatarDataBR(iso) { if(!iso) return '-'; const d = new Date(iso); d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); return d.toLocaleDateString('pt-BR'); }

var globalFilterValue = ''; 
var globalFilterType = 'month'; 

// Adicione estas 4 funções em qualquer lugar do core.js (pode ser no final)
function toggleFilterInput() {
    const type = document.getElementById('filter-type').value;
    globalFilterType = type;
    document.getElementById('filter-month').classList.toggle('hidden', type !== 'month');
    document.getElementById('filter-date').classList.toggle('hidden', type !== 'day');
}

function aplicarFiltro() {
    globalFilterValue = (globalFilterType === 'month') ? document.getElementById('filter-month').value : document.getElementById('filter-date').value;
    Object.keys(currentPage).forEach(k => currentPage[k] = 1);
    atualizarContadoresMenu();
    renderizarTudo();
}

function limparFiltros() {
    const mesAtual = new Date().toISOString().substring(0, 7);
    document.getElementById('filter-month').value = mesAtual;
    document.getElementById('filter-type').value = 'month';
    globalFilterType = 'month';
    globalFilterValue = mesAtual;
    toggleFilterInput();
    renderizarTudo();
}

// SUBSTITUA a função passaNoFiltro antiga por esta:
function passaNoFiltro(iso) {
    if (!iso) return false;
    const dataItem = String(iso).split('T')[0];
    if (!globalFilterValue) return true;
    return dataItem.startsWith(globalFilterValue);
}

function openModal(id) { document.getElementById(id).classList.replace('hidden', 'flex'); }
function closeModal(id) { document.getElementById(id).classList.replace('flex', 'hidden'); }
function toggleAuthMode() { document.getElementById('form-login').classList.toggle('hidden'); document.getElementById('form-register').classList.toggle('hidden'); }
function fazerLogout() { localStorage.removeItem('erp_session'); location.reload(); }
function abrirModalConfirmacao(m, cb) { document.getElementById('texto-confirmacao').innerText = m; acaoExclusaoPendente = cb; openModal('modal-confirmacao'); }
function fecharModalConfirmacao() { closeModal('modal-confirmacao'); acaoExclusaoPendente = null; }
function executarExclusao() { if(acaoExclusaoPendente) acaoExclusaoPendente(); fecharModalConfirmacao(); }