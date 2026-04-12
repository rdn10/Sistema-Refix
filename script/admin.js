// ==========================================
// admin.js - GESTÃO FINANCEIRA E MASTER
// ==========================================

async function updateDashboard() {
    try {
        const s = getSession(); if (!s) return;
        
        const [resProducts, resOrders, resTrans, resSrv] = await Promise.all([
            sb.from('products').select('stock').eq('company_id', s.company_id),
            sb.from('orders').select('id', { count: 'exact' }).eq('company_id', s.company_id),
            sb.from('transactions').select('*').eq('company_id', s.company_id),
            sb.from('services').select('os, name, created_at, price').eq('company_id', s.company_id).order('created_at', {ascending: false}).limit(7)
        ]);

        const totalEstoque = resProducts.data ? resProducts.data.reduce((a, b) => a + (parseInt(b.stock) || 0), 0) : 0;
        const eK = document.getElementById('kpi-estoque'); if (eK) eK.innerText = totalEstoque;
        const pK = document.getElementById('kpi-pedidos'); if (pK) pK.innerText = resOrders.count || 0;

        const ul = document.getElementById('list-recent-services');
        if(ul) {
            ul.innerHTML = '';
            const recents = resSrv.data || [];
            if(recents.length === 0) {
                ul.innerHTML = '<li class="text-xs text-gray-400 dark:text-gray-500 font-medium py-6 text-center border border-dashed border-gray-200 dark:border-[#333] rounded-xl bg-gray-50 dark:bg-[#111]">Nenhum registro.</li>';
            } else {
                recents.forEach(srv => {
                    const priceShow = s.role === 'ADMIN' ? `<div class="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20">${formatCurrency(srv.price)}</div>` : '';
                    let servNomeLimpo = (srv.name || "").split("|||")[0];
                    ul.innerHTML += `
                    <li class="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] rounded-xl border border-gray-100 dark:border-[#222] transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded bg-white dark:bg-[#222] text-gray-500 dark:text-gray-400 flex items-center justify-center border border-gray-200 dark:border-[#333]"><i data-lucide="cpu" class="w-4 h-4"></i></div>
                            <div>
                                <p class="text-xs font-black text-gray-900 dark:text-white">${servNomeLimpo}</p>
                                <p class="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">KEY: <b class="text-gray-600 dark:text-gray-300">${srv.os}</b> • ${formatarDataBR(srv.created_at)}</p>
                            </div>
                        </div>
                        ${priceShow}
                    </li>`;
                });
                if(window.lucide) window.lucide.createIcons();
            }
        }

        let isFiltered = !!globalFilterDataExata;
        const isDark = document.documentElement.classList.contains('dark');
        
        Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
        Chart.defaults.font.family = 'Inter';
        const gridColor = isDark ? '#222' : '#e2e8f0';

        if (s.role === 'ADMIN') {
            const trans = resTrans.data || [];
            const transFiltradas = trans.filter(t => passaNoFiltro(t.date || ''));

            const rec = transFiltradas.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.value, 0);
            const desp = transFiltradas.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.value, 0);

            const rK = document.getElementById('kpi-receita'); if (rK) rK.innerText = formatCurrency(rec);
            const dK = document.getElementById('kpi-despesa'); if (dK) dK.innerText = formatCurrency(desp);

            const pChartTitle = document.getElementById('chart-period');
            if(pChartTitle) pChartTitle.innerText = isFiltered ? `Data: ${formatarDataBR(globalFilterDataExata)}` : "Mês Atual";

            const ctxDash = document.getElementById('dashboardChart');
            if (ctxDash) {
                try {
                    if (window.dashChartInst) window.dashChartInst.destroy();
                    window.dashChartInst = new Chart(ctxDash, {
                        type: 'bar',
                        data: { labels: ['Fluxo de Caixa'], datasets: [{ label: 'Entradas', data: [rec], backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.5 }, { label: 'Saídas', data: [desp], backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.5 }] },
                        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false } }, x: { grid: { display: false }, border: { display: false } } } }
                    });
                } catch(err) {}
            }
        } else {
            const { data: myServices } = await sb.from('services').select('commission, loss, created_at').eq('company_id', s.company_id).eq('responsible_id', s.id);
            let myFiltered = (myServices || []).filter(srv => passaNoFiltro(srv.created_at || ''));

            let totalCom = myFiltered.reduce((a, b) => a + (b.commission || 0), 0);
            let totalPrej = myFiltered.reduce((a, b) => a + (b.loss || 0), 0);
            let liquido = totalCom - totalPrej;

            const dTitulo = document.getElementById('tech-dash-title');
            if(dTitulo) dTitulo.innerText = isFiltered ? `Desempenho (${formatarDataBR(globalFilterDataExata)})` : "Desempenho Atual";
            
            const pChartTitle = document.getElementById('chart-period');
            if(pChartTitle) pChartTitle.innerText = isFiltered ? "Filtro Ativo" : "Mês Atual";

            if(document.getElementById('dash-tech-com')) document.getElementById('dash-tech-com').innerText = formatCurrency(totalCom);
            if(document.getElementById('dash-tech-prej')) document.getElementById('dash-tech-prej').innerText = formatCurrency(totalPrej);
            if(document.getElementById('dash-tech-liq')) document.getElementById('dash-tech-liq').innerText = formatCurrency(liquido);

            const ctxDash = document.getElementById('dashboardChart');
            if (ctxDash) {
                try {
                    if (window.dashChartInst) window.dashChartInst.destroy();
                    window.dashChartInst = new Chart(ctxDash, {
                        type: 'bar',
                        data: { labels: ['Meu Resultado'], datasets: [{ label: 'Retorno (+)', data: [totalCom], backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.5 }, { label: 'Danos (-)', data: [totalPrej], backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.5 }] },
                        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false } }, x: { grid: { display: false }, border: { display: false } } } }
                    });
                } catch(err){}
            }
        }
    } catch (e) { console.error("Erro Dashboard:", e); }
}

async function renderizarTabelaFinanceira() {
    try {
        const s = getSession(); const tb = document.getElementById('table-financeiro'); if (!tb) return;
        const [resGroups, resTrans] = await Promise.all([ sb.from('financial_groups').select('*').eq('company_id', s.company_id), sb.from('transactions').select('*').eq('company_id', s.company_id).order('date', { ascending: false }) ]);
        const grps = resGroups.data || []; const fg = document.getElementById('fin-group-filter'), mg = document.getElementById('fin-grupo-select');
        
        if (fg && mg) { const v = fg.value; fg.innerHTML = '<option value="ALL" class="dark:bg-[#111]">💰 Global</option>'; mg.innerHTML = '<option value="" class="dark:bg-[#111]">Avulso</option>'; grps.forEach(g => { fg.innerHTML += `<option value="${g.id}" class="dark:bg-[#111]">${g.name}</option>`; mg.innerHTML += `<option value="${g.id}" class="dark:bg-[#111]">${g.name}</option>`; }); fg.value = v; }
        const btnExFin = document.getElementById('btn-excluir-grupo-fin'); if (btnExFin) btnExFin.classList.toggle('hidden', fg.value === 'ALL');

        let lista = (resTrans.data || []).filter(x => passaNoFiltro(x.date || ''));
        if (fg.value !== 'ALL') lista = lista.filter(x => x.group_id === fg.value);
        const rec = lista.filter(x => x.type === 'INCOME').reduce((a, b) => a + b.value, 0); const desp = lista.filter(x => x.type === 'EXPENSE').reduce((a, b) => a + b.value, 0);

        document.getElementById('grp-rec').innerText = formatCurrency(rec); document.getElementById('grp-desp').innerText = formatCurrency(desp); document.getElementById('grp-saldo').innerText = formatCurrency(rec - desp);
        const totalItems = lista.length; const start = (currentPage.financeiro - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);

        tb.innerHTML = '';
        listaPaginada.forEach(x => {
            const isRec = x.type === 'INCOME'; const gn = x.group_id ? (grps.find(g => g.id === x.group_id)?.name || '-') : 'GERAL';
            const corBg = isRec ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-red-50 dark:bg-red-500/10'; const corTexto = isRec ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'; const borderCor = isRec ? 'border-transparent dark:border-blue-500/20' : 'border-transparent dark:border-red-500/20'; const icone = isRec ? 'corner-right-up' : 'corner-right-down'; const sinal = isRec ? '+' : '-';
            tb.innerHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors border-b border-gray-100 dark:border-[#222]"><td class="p-4"><span class="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase">${gn}</span><p class="text-[10px] font-bold text-gray-500 mt-2">${formatarDataBR(x.date)}</p></td><td class="p-4 font-bold text-gray-900 dark:text-white text-xs">${x.description}</td><td class="p-4 text-right"><div class="inline-flex items-center gap-2 ${corBg} ${corTexto} px-3 py-1.5 rounded border ${borderCor}"><i data-lucide="${icone}" class="w-3 h-3"></i><span class="font-black text-[10px] tracking-widest uppercase">${sinal} ${formatCurrency(x.value)}</span></div></td><td class="p-4 text-right"><button onclick="delFin('${x.id}')" class="text-gray-400 dark:text-gray-500 hover:text-red-500 p-2 rounded bg-white dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
        });
        renderizarPaginacao(totalItems, 'financeiro', 'pag-financeiro'); if(window.lucide) window.lucide.createIcons();
    } catch (e) { console.error("Erro Financeiro:", e); }
}

async function salvarGrupoFin(e) { e.preventDefault(); const nome = document.getElementById('grupo-fin-nome').value.toUpperCase(); await sb.from('financial_groups').insert([{ id: 'FG-' + Date.now(), company_id: getSession().company_id, name: nome }]); closeModal('modal-grupo-fin'); renderizarTabelaFinanceira(); }
async function deletarGrupoFin() { const id = document.getElementById('fin-group-filter').value; if (id === 'ALL') return; abrirModalConfirmacao("Apagar grupo e valores?", async () => { await sb.from('financial_groups').delete().eq('id', id); await sb.from('transactions').delete().eq('group_id', id); document.getElementById('fin-group-filter').value = 'ALL'; renderizarTabelaFinanceira(); updateDashboard(); }); }
function abrirModalTransacao() { const f = document.getElementById('fin-group-filter'); const sel = document.getElementById('fin-grupo-select'); if(sel && f) sel.value = f.value !== 'ALL' ? f.value : ''; openModal('modal-financeiro'); }
async function salvarTransacao(e) { e.preventDefault(); const s = getSession(); await sb.from('transactions').insert([{ id: 'TR-' + Date.now(), company_id: s.company_id, group_id: document.getElementById('fin-grupo-select').value || null, description: document.getElementById('fin-desc').value, type: document.getElementById('fin-tipo').value, value: parseFloat(document.getElementById('fin-valor').value), date: new Date().toISOString() }]); closeModal('modal-financeiro'); renderizarTabelaFinanceira(); updateDashboard(); }
async function delFin(id) { abrirModalConfirmacao("Apagar lançamento?", async () => { await sb.from('transactions').delete().eq('id', id); renderizarTabelaFinanceira(); updateDashboard(); }); }

async function renderTabelaUsuarios() {
    const s = getSession(); const { data: users } = await sb.from('users').select('*').eq('company_id', s.company_id);
    const tb = document.getElementById('table-usuarios'); if (!tb) return;
    let lista = users || []; const totalItems = lista.length; const start = (currentPage.usuarios - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);
    tb.innerHTML = '';
    listaPaginada.forEach(u => { tb.innerHTML += `<tr class="border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"><td class="p-4 font-black text-gray-900 dark:text-white text-xs">${u.name}</td><td class="p-4 font-bold text-gray-500 dark:text-gray-400 text-[10px] tracking-wide">${u.email}</td><td class="p-4"><span class="px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border border-transparent dark:border-purple-500/20' : 'bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 border border-transparent dark:border-[#333]'} text-[9px] font-black uppercase tracking-widest">${u.role}</span></td><td class="p-4 text-right">${u.role !== 'ADMIN' ? `<button onclick="delUsr('${u.id}')" class="text-gray-400 dark:text-gray-500 hover:text-red-500 p-2 rounded bg-white dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="x-octagon" class="w-4 h-4"></i></button>` : '-'}</td></tr>`; });
    renderizarPaginacao(totalItems, 'usuarios', 'pag-usuarios');
}
async function salvarUsuario(e) { e.preventDefault(); const s = getSession(); await sb.from('users').insert([{ id: 'U-' + Date.now(), company_id: s.company_id, name: document.getElementById('usr-nome').value, email: document.getElementById('usr-email').value, password: document.getElementById('usr-senha').value, role: 'USER' }]); closeModal('modal-usuario'); renderTabelaUsuarios(); }
async function delUsr(id) { abrirModalConfirmacao("Revogar credencial?", async () => { await sb.from('users').delete().eq('id', id); renderTabelaUsuarios(); }); }

async function renderizarPainelMaster() {
    const s = getSession(); if (s.email !== "ruan@gmail.com") return;
    const [resComp, resUser] = await Promise.all([ sb.from('companies').select('*').order('created_at', {ascending: false}), sb.from('users').select('email, company_id').eq('role', 'ADMIN') ]);
    const tb = document.getElementById('table-master-companies'); if (!tb) return;
    let lista = resComp.data || []; const totalItems = lista.length; const start = (currentPage.master - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);
    tb.innerHTML = '';
    listaPaginada.forEach(c => { const exp = new Date(c.expires_at); const dias = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24)); const dono = (resUser.data || []).find(u => u.company_id === c.id); const isMaster = c.id === s.company_id; tb.innerHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-[#111] border-b border-gray-200 dark:border-[#222] transition-colors"><td class="p-4 font-black text-gray-900 dark:text-white">${c.name}<br><span class="text-[9px] text-gray-500 dark:text-gray-600 tracking-widest font-bold">NODE: ${c.id}</span></td><td class="p-4 text-blue-600 dark:text-blue-500 font-bold text-[10px] tracking-wider">${dono ? dono.email : '-'}</td><td class="p-4 font-bold text-gray-600 dark:text-gray-400 text-xs">${formatarDataBR(c.expires_at)} <br> <span class="text-[9px] font-black ${dias < 0 ? 'text-red-500' : 'text-blue-500'} uppercase tracking-widest">${dias} dias rest.</span></td><td class="p-4 text-center"><span class="font-black ${c.status === 'active' ? 'text-green-600 bg-green-100 border-transparent dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-500/20' : 'text-red-600 bg-red-100 border-transparent dark:text-red-400 dark:bg-red-900/20 dark:border-red-500/20'} px-2 py-1 rounded border uppercase tracking-widest text-[9px]">${c.status}</span></td><td class="p-4 text-right flex justify-end gap-2"><button onclick="masterStatus('${c.id}','active')" class="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#222] px-3 py-1.5 rounded text-[9px] font-black uppercase transition-colors">Start</button><button onclick="masterStatus('${c.id}','blocked')" class="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#222] px-3 py-1.5 rounded text-[9px] font-black uppercase transition-colors">Stop</button><button onclick="masterTempo('${c.id}')" class="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded text-[9px] font-black uppercase transition-colors">+30D</button>${!isMaster ? `<button onclick="masterExcluir('${c.id}')" class="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded text-[9px] font-black uppercase transition-colors">Del</button>` : ''}</td></tr>`; });
    renderizarPaginacao(totalItems, 'master', 'pag-master');
}
async function masterStatus(id, st) { await sb.from('companies').update({ status: st }).eq('id', id); renderizarPainelMaster(); }
async function masterTempo(id) { const { data } = await sb.from('companies').select('expires_at').eq('id', id).single(); let d = new Date(data.expires_at); if (d < new Date()) d = new Date(); d.setDate(d.getDate() + 30); await sb.from('companies').update({ expires_at: d.toISOString(), status: 'active' }).eq('id', id); renderizarPainelMaster(); }
async function masterExcluir(id) { if(confirm("CRÍTICO: Destruir Node?")) { await sb.from('companies').delete().eq('id', id); renderizarPainelMaster(); } }