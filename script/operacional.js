// ==========================================
// operacional.js - GESTÃO OPERACIONAL E ESTOQUE
// ==========================================

const IPHONES = ["7", "7 Plus", "8", "8 Plus", "X", "XR", "XS", "XS Max", "11", "11 Pro", "11 Pro Max", "12 Mini", "12", "12 Pro", "12 Pro Max", "13 Mini", "13", "13 Pro", "13 Pro Max", "14", "14 Plus", "14 Pro", "14 Pro Max", "15", "15 Plus", "15 Pro", "15 Pro Max", "16", "16 Plus", "16 Pro", "16 Pro Max"];
const CORES = ["Preto", "Branco", "Azul", "Verde", "Vermelho", "Amarelo", "Roxo", "Dourado",, "Grafite", "Titânio Natural", "Titânio Azul", "Titânio Preto", "Rosa"];
const PECAS = ["Tampa Traseira", "Vidro Frontal", "Lente da Câmera", "Bateria", "Tela Display", "Câmera Traseira", "Conector de Carga", "Carcaça Completa", "Flex Power/Volume"];

function preencherModelosIphone() {
  const sm = document.getElementById("ped-modelo"), sc = document.getElementById("ped-cor"), sp = document.getElementById("ped-peca");
  if (!sm || sm.options.length > 0) return;
  IPHONES.forEach(m => (sm.innerHTML += `<option value="iPhone ${m}">iPhone ${m}</option>`)); CORES.forEach(c => (sc.innerHTML += `<option value="${c}">${c}</option>`)); PECAS.forEach(p => (sp.innerHTML += `<option value="${p}">${p}</option>`));
}

// ESTOQUE
async function renderTabelaEstoque() {
    try {
        const s = getSession(); const tb = document.getElementById("table-estoque"); if (!tb) return;
        const { data: products, error } = await sb.from('products').select('*').eq('company_id', s.company_id).order('name', { ascending: true });
        if (error) throw error;
        let lista = (products || []).filter(p => passaNoFiltro(p.created_at || ''));
        const totalItems = lista.length; const start = (currentPage.estoque - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);

        tb.innerHTML = "";
        listaPaginada.forEach((p) => {
            let botoesEstoque = '';
            if (s.role === 'ADMIN') { botoesEstoque = `<div class="flex items-center justify-center gap-2"><button onclick="altQtd('${p.id}', -1)" class="w-8 h-8 bg-red-50 text-red-600 border-red-100 dark:bg-[#222] dark:text-red-500 rounded border dark:border-[#333] font-black hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">-</button><span id="qtd-val-${p.id}" class="font-black text-sm w-10 text-center text-gray-900 dark:text-white">${p.stock}</span><button onclick="altQtd('${p.id}', 1)" class="w-8 h-8 bg-green-50 text-green-600 border-green-100 dark:bg-[#222] dark:text-green-500 rounded border dark:border-[#333] font-black hover:bg-green-100 dark:hover:bg-green-500/20 transition-all">+</button></div>`; } 
            else { botoesEstoque = `<span id="qtd-val-${p.id}" class="font-black text-sm text-gray-900 dark:text-white">${p.stock} UN</span>`; }
            tb.innerHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"><td class="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">${formatarDataBR(p.created_at)}</td><td class="p-4 font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight text-xs">${p.name}</td><td class="p-4 font-black text-blue-600 dark:text-blue-400 text-xs">${formatCurrency(p.cost)}</td><td class="p-4 text-center">${botoesEstoque}</td><td class="admin-only hidden p-4 text-right"><button onclick="delPrd('${p.id}')" class="text-gray-500 hover:text-red-500 p-2 rounded bg-gray-100 dark:bg-[#111] hover:bg-gray-200 dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
        });
        if (s.role === 'ADMIN') document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        renderizarPaginacao(totalItems, 'estoque', 'pag-estoque');
    } catch (e) { console.error("Erro Estoque:", e); }
}

async function altQtd(id, v) { const span = document.getElementById(`qtd-val-${id}`); if (!span) return; let qtdAtual = parseInt(span.innerText); let novaQtd = qtdAtual + v; if (novaQtd < 0) novaQtd = 0; span.innerText = novaQtd; const { error } = await sb.from('products').update({ stock: novaQtd }).eq('id', id); if (error) span.innerText = qtdAtual; if(typeof updateDashboard === 'function') setTimeout(() => updateDashboard(), 500); }
async function salvarProduto(e) { e.preventDefault(); const s = getSession(); const nome = document.getElementById("prod-nome").value.toUpperCase(); const custo = parseFloat(document.getElementById("prod-custo").value) || 0; const estoqueInicial = parseInt(document.getElementById("prod-estoque").value) || 0; await sb.from("products").insert([{ id: "P-" + Date.now(), company_id: s.company_id, name: nome, cost: custo, stock: estoqueInicial, created_at: new Date().toISOString() }]); e.target.reset(); closeModal("modal-produto"); if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu(); await renderTabelaEstoque(); if (typeof updateDashboard === "function") updateDashboard(); }
async function delPrd(id) { abrirModalConfirmacao("Deseja remover este item?", async () => { await sb.from("products").delete().eq("id", id); if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu(); await renderTabelaEstoque(); if (typeof updateDashboard === "function") updateDashboard(); }); }

async function carregarEstoqueNoModal() {
  const s = getSession(); const selectPeca = document.getElementById("serv-peca-estoque"); if (!selectPeca) return;
  const { data: products } = await sb.from("products").select("*").eq("company_id", s.company_id).gt("stock", 0);
  selectPeca.innerHTML = '<option value="">Nenhuma peça (Apenas Mão de Obra)</option>'; (products || []).forEach((p) => { selectPeca.innerHTML += `<option value="${p.id}" data-custo="${p.cost}" data-nome="${p.name}">${p.name} (Estoque: ${p.stock})</option>`; });
}

async function abrirModalNovoServico() {
    const s = getSession();
    document.getElementById("serv-id-edit").value = ""; document.getElementById("titulo-modal-servico").innerText = "Gerar Ordem";
    document.getElementById("serv-os").value = ""; document.getElementById("serv-os").disabled = false;
    document.getElementById("serv-cliente").value = ""; document.getElementById("serv-prejuizo-desc").value = "";
    document.getElementById("serv-nome").value = ""; document.getElementById("serv-custo").value = "0";
    document.getElementById("serv-comissao").value = "0"; document.getElementById("serv-preco").value = ""; document.getElementById("serv-prejuizo").value = "0";
    document.getElementById("serv-responsavel-display").innerText = s.name;
    const inputPreco = document.getElementById("serv-preco"); if (s.role !== 'ADMIN') { if (inputPreco) inputPreco.parentElement.classList.add('hidden'); } else { if (inputPreco) inputPreco.parentElement.classList.remove('hidden'); }
    await carregarEstoqueNoModal(); openModal("modal-servico");
}

async function editarServico(id) {
  const { data: x } = await sb.from("services").select("*").eq("id", id).single(); if (!x) return;
  await carregarEstoqueNoModal();
  document.getElementById("serv-id-edit").value = x.id; document.getElementById("titulo-modal-servico").innerText = "Editar O.S.";
  document.getElementById("serv-os").value = x.os; document.getElementById("serv-os").disabled = true;
  let rawParts = (x.name || "").split("|||"); document.getElementById("serv-nome").value = rawParts[0]; document.getElementById("serv-cliente").value = rawParts.length > 1 ? rawParts[1] : ""; document.getElementById("serv-prejuizo-desc").value = rawParts.length > 2 ? rawParts[2] : "";
  document.getElementById("serv-custo").value = x.cost || 0; document.getElementById("serv-comissao").value = x.commission || 0; document.getElementById("serv-preco").value = x.price || ""; document.getElementById("serv-prejuizo").value = x.loss || 0;
  document.getElementById("serv-responsavel-display").innerText = x.responsible_name;
  const pSelect = document.getElementById("serv-peca-estoque"); if (pSelect) pSelect.disabled = true;
  const sg = document.getElementById("serv-grupo-select"); if (sg) sg.value = x.group_id || "";
  openModal("modal-servico");
}

async function salvarServico(e) {
    e.preventDefault(); const s = getSession(); const idE = document.getElementById("serv-id-edit").value; const osD = document.getElementById("serv-os").value.toUpperCase();
    if (!idE) { const { data: osExistente } = await sb.from('services').select('id').eq('company_id', s.company_id).eq('os', osD).limit(1); if (osExistente && osExistente.length > 0) { alert("⚠️ A O.S. " + osD + " já existe no sistema."); return; } }

    let custoPecaExtra = parseFloat(document.getElementById("serv-custo").value) || 0; let valorComissao = parseFloat(document.getElementById("serv-comissao").value) || 0; let valorPrejuizo = parseFloat(document.getElementById("serv-prejuizo").value) || 0; let valorCobrado = parseFloat(document.getElementById("serv-preco").value) || 0;
    let rawServico = document.getElementById("serv-nome").value; let rawCliente = document.getElementById("serv-cliente").value; let rawPrejuizoDesc = document.getElementById("serv-prejuizo-desc").value;
    let nomeSuperCompleto = `${rawServico}|||${rawCliente}|||${rawPrejuizoDesc}`;

    const srvGroupSelect = document.getElementById("serv-grupo-select"); const srvGroupId = srvGroupSelect.value || null; const srvGroupName = srvGroupId ? srvGroupSelect.options[srvGroupSelect.selectedIndex].text : null;
    const dadosSrv = { group_id: srvGroupId, loss: valorPrejuizo, commission: valorComissao, price: valorCobrado };
    let idFinalServico = idE;

    if (!idE) {
        idFinalServico = "S-" + Date.now();
        const pecaSelect = document.getElementById("serv-peca-estoque"); const pecaId = pecaSelect ? pecaSelect.value : null;
        if (pecaId) {
            const opcao = pecaSelect.options[pecaSelect.selectedIndex];
            custoPecaExtra += (parseFloat(opcao.getAttribute('data-custo')) || 0); nomeSuperCompleto += ` + [${opcao.getAttribute('data-nome')}]`;
            const { data: pDb } = await sb.from('products').select('stock').eq('id', pecaId).single();
            await sb.from('products').update({ stock: pDb.stock - 1 }).eq('id', pecaId);
        }
        await sb.from('services').insert([{ ...dadosSrv, id: idFinalServico, os: osD, name: nomeSuperCompleto, cost: custoPecaExtra, company_id: s.company_id, responsible_id: s.id, responsible_name: s.name }]);
        if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu();
    } else {
        dadosSrv.name = nomeSuperCompleto; dadosSrv.cost = custoPecaExtra;
        await sb.from('services').update(dadosSrv).eq('id', idE);
    }

    let financialGroupId = null;
    if (srvGroupName) {
        const { data: finGroup } = await sb.from('financial_groups').select('id').eq('company_id', s.company_id).eq('name', srvGroupName.toUpperCase()).single();
        if (finGroup) { financialGroupId = finGroup.id; } else { const newFinId = 'FG-' + Date.now(); await sb.from('financial_groups').insert([{ id: newFinId, company_id: s.company_id, name: srvGroupName.toUpperCase() }]); financialGroupId = newFinId; }
    }
    await sb.from('transactions').delete().eq('service_id', idFinalServico);

    const transacoes = [];
    if (valorCobrado > 0) transacoes.push({ id: 'TR-REC-' + Date.now(), company_id: s.company_id, service_id: idFinalServico, group_id: financialGroupId, description: `OS: ${osD} | ${rawServico}`, type: 'INCOME', value: valorCobrado, date: new Date().toISOString() });
    if (custoPecaExtra > 0) transacoes.push({ id: 'TR-CUST-' + Date.now(), company_id: s.company_id, service_id: idFinalServico, group_id: financialGroupId, description: `Insumo OS: ${osD}`, type: 'EXPENSE', value: custoPecaExtra, date: new Date().toISOString() });
    if (valorComissao > 0) transacoes.push({ id: 'TR-COM-' + Date.now(), company_id: s.company_id, service_id: idFinalServico, group_id: financialGroupId, description: `Op: ${s.name} | OS: ${osD}`, type: 'EXPENSE', value: valorComissao, date: new Date().toISOString() });
    if (transacoes.length > 0) await sb.from('transactions').insert(transacoes);

    closeModal("modal-servico"); await renderizarTabelaServicos(); if(typeof renderTabelaEstoque === 'function') renderTabelaEstoque(); if(typeof updateDashboard === 'function') updateDashboard(); if(typeof renderizarTabelaFinanceira === 'function') renderizarTabelaFinanceira();
}

async function renderizarTabelaServicos() {
    try { 
        const s = getSession(); const tb = document.getElementById("table-servicos"); if (!tb) return;
        const [resGroups, resUsers, resServices] = await Promise.all([ sb.from('service_groups').select('*').eq('company_id', s.company_id), sb.from('users').select('*').eq('company_id', s.company_id), sb.from('services').select('*').eq('company_id', s.company_id).order('created_at', { ascending: false }) ]);
        const grps = resGroups.data || []; const técnicos = resUsers.data || []; const servicos = resServices.data || [];

        const fg = document.getElementById("srv-group-filter"); const mg = document.getElementById("serv-grupo-select"); 
        if (fg && mg) { const valFiltroAtual = fg.value; fg.innerHTML = '<option value="ALL" class="dark:bg-[#111]">📂 Todos</option>'; mg.innerHTML = '<option value="" class="dark:bg-[#111]">Nenhum (Avulso)</option>'; grps.forEach(g => { const opt = `<option value="${g.id}" class="dark:bg-[#111]">${g.name}</option>`; fg.innerHTML += opt; mg.innerHTML += opt; }); fg.value = valFiltroAtual || "ALL"; const btnExcluirGrupo = document.getElementById('btn-excluir-grupo-srv'); if (btnExcluirGrupo) { if (fg.value !== 'ALL' && s.role === 'ADMIN') btnExcluirGrupo.classList.remove('hidden'); else btnExcluirGrupo.classList.add('hidden'); } }
        const fu = document.getElementById("srv-user-filter"); if (fu && s.role === "ADMIN") { const valTecnicoAtual = fu.value; fu.innerHTML = '<option value="ALL" class="dark:bg-[#111]">👤 Todos</option>'; técnicos.forEach(u => fu.innerHTML += `<option value="${u.id}" class="dark:bg-[#111]">${u.name}</option>`); fu.value = valTecnicoAtual || "ALL"; }

        let lista = servicos.filter(x => passaNoFiltro(x.created_at || ''));
        if (s.role !== "ADMIN") lista = lista.filter(x => x.responsible_id === s.id); else if (fu && fu.value !== "ALL") lista = lista.filter(x => String(x.responsible_id) === String(fu.value));
        if (fg && fg.value !== "ALL") lista = lista.filter(x => x.group_id === fg.value);
        
            if (s.role === "ADMIN") {
        const cobrado = lista.reduce((a, b) => a + (b.price || 0), 0);
        // ... (isso vai atualizar o lucro do mês selecionado)
    } else {
        // AQUI zera a comissão do técnico
        const cListCom = lista.reduce((a, b) => a + (b.commission || 0), 0);
        const cListPrej = lista.reduce((a, b) => a + (b.loss || 0), 0);
        
        document.getElementById("tech-kpi-comissao").innerText = formatCurrency(cListCom);
        document.getElementById("tech-kpi-prejuizo").innerText = formatCurrency(cListPrej);
        document.getElementById("tech-kpi-liq").innerText = formatCurrency(cListCom - cListPrej);
    }
        const bos = document.getElementById("srv-os-filter")?.value.toUpperCase(); 
        if (bos) lista = lista.filter(x => (x.os || "").toUpperCase().includes(bos) || (x.name || "").toUpperCase().includes(bos));

        if (s.role === "ADMIN") {
            const cobrado = lista.reduce((a, b) => a + (b.price || 0), 0); const custosGerais = lista.reduce((a, b) => a + (b.cost || 0) + (b.loss || 0) + (b.commission || 0), 0); const lucroReal = cobrado - custosGerais;
            if(document.getElementById("srv-kpi-cobrado")) document.getElementById("srv-kpi-cobrado").innerText = formatCurrency(cobrado); if(document.getElementById("srv-kpi-custo")) document.getElementById("srv-kpi-custo").innerText = formatCurrency(custosGerais); if(document.getElementById("srv-kpi-lucro")) { document.getElementById("srv-kpi-lucro").innerText = formatCurrency(lucroReal); }
        } else {
            const cListCom = lista.reduce((a, b) => a + (b.commission || 0), 0); const cListPrej = lista.reduce((a, b) => a + (b.loss || 0), 0); const cListLiq = cListCom - cListPrej;
            if(document.getElementById("tech-kpi-comissao")) document.getElementById("tech-kpi-comissao").innerText = formatCurrency(cListCom); if(document.getElementById("tech-kpi-prejuizo")) document.getElementById("tech-kpi-prejuizo").innerText = formatCurrency(cListPrej); if(document.getElementById("tech-kpi-liq")) document.getElementById("tech-kpi-liq").innerText = formatCurrency(cListLiq);
        }

        const totalItems = lista.length; const start = (currentPage.servicos - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);
        tb.innerHTML = ""; const trHead = tb.previousElementSibling.querySelector('tr');
        if(trHead) {
            if (s.role === 'ADMIN') trHead.innerHTML = `<th class="p-4">O.S</th><th class="p-4">OS / Target</th><th class="p-4 text-center">Custos</th><th class="p-4 text-center text-blue-600 dark:text-blue-400">Comissão</th><th class="p-4 text-center text-red-500">Danos</th><th class="p-4 text-center">Fatura</th><th class="p-4 text-center text-blue-600 dark:text-blue-500">Líquido</th><th class="p-4 text-right">Exec</th>`;
            else trHead.innerHTML = `<th class="p-4">O.S</th><th class="p-4">OS / Target</th><th class="p-4 text-center text-blue-600 dark:text-blue-400">Retorno (+)</th><th class="p-4 text-center text-red-500">Danos (-)</th><th class="p-4 text-right">Exec</th>`;
        }

        listaPaginada.forEach((x) => {
            const gNome = x.group_id ? (grps.find(g => g.id === x.group_id)?.name || '-') : "GERAL"; const custoTotal = (x.cost || 0) + (x.loss || 0) + (x.commission || 0); const lucro = (x.price || 0) - custoTotal; const isP = lucro < 0;
            let rawParts = (x.name || "").split("|||"); let servNome = rawParts[0]; let servCliente = rawParts.length > 1 && rawParts[1] !== "" ? rawParts[1] : "Desconhecido"; let servPrejuDesc = rawParts.length > 2 && rawParts[2] !== "" ? rawParts[2] : "";

            let blocoPrejuizoAdmin = x.loss > 0 ? `<div class="font-bold text-red-500 text-xs">${formatCurrency(x.loss)}</div>${servPrejuDesc ? `<div class="text-[9px] text-red-400 mt-1 leading-tight italic truncate max-w-[120px] mx-auto border-t border-red-500/20 pt-0.5" title="${servPrejuDesc}">${servPrejuDesc}</div>` : ''}` : '-';
            let blocoPrejuizoTech = x.loss > 0 ? `<div class="font-bold text-red-500 text-sm">${formatCurrency(x.loss)}</div>${servPrejuDesc ? `<div class="text-[9px] text-red-400 mt-1 leading-tight italic truncate max-w-[150px] mx-auto border-t border-red-500/20 pt-0.5" title="${servPrejuDesc}">${servPrejuDesc}</div>` : ''}` : '-';

            let htmlLinha = `<tr class="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"><td class="p-4"><span class="bg-gray-900 dark:bg-[#111] border border-transparent dark:border-[#333] text-white px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase shadow-sm">O.S: ${x.os}</span><p class="text-[10px] text-gray-500 mt-2 font-bold">${formatarDataBR(x.created_at)}</p></td><td class="p-4"><p class="font-black text-gray-900 dark:text-gray-200 text-xs">${servNome}</p><p class="text-[9px] font-bold text-blue-600 dark:text-blue-500 mt-1 uppercase tracking-widest"><i data-lucide="user" class="w-3 h-3 inline"></i> ${servCliente}</p><p class="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">🗂️ ${gNome}</p>${s.role === 'ADMIN' ? `<p class="text-indigo-500 dark:text-gray-400 text-[9px] font-bold uppercase mt-1">👤 ${x.responsible_name}</p>` : ''}</td>`;
            if (s.role === 'ADMIN') { htmlLinha += `<td class="p-4 text-center font-bold text-gray-600 dark:text-gray-400 text-xs">${formatCurrency(x.cost)}</td><td class="p-4 text-center font-bold text-blue-600 dark:text-blue-400 text-xs">${formatCurrency(x.commission)}</td><td class="p-4 text-center">${blocoPrejuizoAdmin}</td><td class="p-4 text-center font-black text-gray-800 dark:text-gray-200 text-xs">${formatCurrency(x.price || 0)}</td><td class="p-4 text-center"><span class="inline-flex px-2 py-1 rounded ${isP ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:border dark:border-red-500/20' : 'bg-green-50 text-green-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border dark:border-blue-500/20'} font-black text-xs">${formatCurrency(lucro)}</span></td>`; } 
            else { htmlLinha += `<td class="p-4 text-center font-black text-blue-600 dark:text-blue-400 text-sm">${formatCurrency(x.commission)}</td><td class="p-4 text-center">${blocoPrejuizoTech}</td>`; }
            htmlLinha += `<td class="p-4 text-right"><button onclick="editarServico('${x.id}')" class="text-blue-600 dark:text-blue-500 mr-2 p-2 rounded bg-gray-100 hover:bg-gray-200 dark:bg-[#111] dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="edit" class="w-4 h-4"></i></button>${s.role === 'ADMIN' ? `<button onclick="delSrv('${x.id}')" class="text-red-500 p-2 rounded bg-gray-100 hover:bg-gray-200 dark:bg-[#111] dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}</td></tr>`;
            tb.innerHTML += htmlLinha;
        });
        renderizarPaginacao(totalItems, 'servicos', 'pag-servicos');
    } catch (e) { console.error("Erro na Tabela de Serviços:", e); }
}

async function delSrv(id) { abrirModalConfirmacao("Apagar registro do Node?", async () => { await sb.from("services").delete().eq("id", id); if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu(); await renderizarTabelaServicos(); if (typeof updateDashboard === "function") updateDashboard(); }); }

async function salvarGrupoSrv(e) { e.preventDefault(); const s = getSession(); await sb.from("service_groups").insert([{ id: "SG-" + Date.now(), company_id: s.company_id, name: document.getElementById("grupo-srv-nome").value.toUpperCase() }]); closeModal("modal-grupo-srv"); document.getElementById("grupo-srv-nome").value = ""; await renderizarTabelaServicos(); }
async function deletarGrupoSrv() { const s = getSession(); if (s.role !== "ADMIN") return alert("Permissão negada."); const id = document.getElementById("srv-group-filter").value; if (id === "ALL") return; abrirModalConfirmacao("⚠️ Destruir projeto e vínculos?", async () => { await sb.from("service_groups").delete().eq("id", id); document.getElementById("srv-group-filter").value = "ALL"; await renderizarTabelaServicos(); }); }

function abrirModalPedido() { window.carrinhoGlobal = []; atualizarVisualCarrinho(); if (typeof preencherModelosIphone === "function") preencherModelosIphone(); openModal("modal-pedido"); }
function adicionarItemAoCarrinho() { const peca = document.getElementById("ped-peca").value; const modelo = document.getElementById("ped-modelo").value; const cor = document.getElementById("ped-cor").value; const qtd = parseInt(document.getElementById("ped-qtd").value) || 1; window.carrinhoGlobal.push({ id: Date.now(), descricao: `${peca} ${modelo} (${cor})`, quantidade: qtd }); document.getElementById("ped-qtd").value = 1; atualizarVisualCarrinho(); }
function atualizarVisualCarrinho() { const ul = document.getElementById("lista-carrinho"); const msgVazio = document.getElementById("carrinho-vazio"); if (!ul) return; ul.innerHTML = ""; if (!window.carrinhoGlobal || window.carrinhoGlobal.length === 0) { if (msgVazio) msgVazio.classList.remove("hidden"); } else { if (msgVazio) msgVazio.classList.add("hidden"); window.carrinhoGlobal.forEach((item) => { ul.innerHTML += `<li class="flex justify-between items-center bg-white dark:bg-[#1A1A1A] p-3 border border-gray-200 dark:border-[#333] rounded-xl mb-2"><span class="text-sm font-bold text-gray-700 dark:text-gray-300"><b class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-transparent dark:border-blue-500/20 mr-2">${item.quantidade}x</b> ${item.descricao}</span><button onclick="removerItemDoCarrinho(${item.id})" class="text-gray-400 dark:text-gray-500 hover:text-red-500 p-1"><i data-lucide="x-circle" class="w-4 h-4"></i></button></li>`; }); } if (window.lucide) window.lucide.createIcons(); }
function removerItemDoCarrinho(id) { window.carrinhoGlobal = window.carrinhoGlobal.filter((x) => x.id !== id); atualizarVisualCarrinho(); }
async function finalizarPedidoWhatsApp() { if (!window.carrinhoGlobal || window.carrinhoGlobal.length === 0) return alert("Matriz vazia."); const inputWhats = document.getElementById("ped-whatsapp"); const numeroWhats = inputWhats ? inputWhats.value.replace(/\D/g, "") : ""; if (!numeroWhats) return alert("Forneça o terminal (WhatsApp)."); const s = getSession(); const resumoTexto = window.carrinhoGlobal.map((i) => `${i.quantidade}x ${i.descricao}`).join(" | "); await sb.from("orders").insert([{ id: "O-" + Date.now(), company_id: s.company_id, summary: resumoTexto, total_items: window.carrinhoGlobal.reduce((acc, cur) => acc + cur.quantidade, 0), supplier_phone: numeroWhats }]); let msg = `*NOVO PEDIDO (SISTEMA REFIX)*\n\n`; window.carrinhoGlobal.forEach((i) => { msg += `▪️ ${i.quantidade}x ${i.descricao}\n`; }); msg += `\n_Aguardando validação._`; window.open(`https://api.whatsapp.com/send?phone=55${numeroWhats}&text=${encodeURIComponent(msg)}`, "_blank"); window.carrinhoGlobal = []; closeModal("modal-pedido"); if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu(); await renderTabelaPedidos(); }

async function renderTabelaPedidos() {
  try {
    const s = getSession(); const tb = document.getElementById("table-pedidos"); if (!tb) return;
    const { data: orders } = await sb.from("orders").select("*").eq("company_id", s.company_id).order('date', { ascending: false });
    let lista = (orders || []).filter((o) => passaNoFiltro(o.date || '')); const totalItems = lista.length; const start = (currentPage.pedidos - 1) * ITEMS_PER_PAGE; const listaPaginada = lista.slice(start, start + ITEMS_PER_PAGE);
    tb.innerHTML = "";
    listaPaginada.forEach((o) => { const btnExcluir = s.role === "ADMIN" ? `<button onclick="delOrd('${o.id}')" class="text-gray-500 hover:text-red-500 p-2 rounded bg-gray-100 dark:bg-[#111] hover:bg-gray-200 dark:hover:bg-[#222] border border-gray-200 dark:border-[#333] transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : "-"; tb.innerHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"><td class="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">${formatarDataBR(o.date)}</td><td class="p-4 font-bold text-gray-900 dark:text-gray-200 text-xs">${o.summary}</td><td class="p-4 text-center font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-[#111]/50 border-x border-gray-100 dark:border-[#222]">${o.total_items}</td><td class="p-4 text-center font-bold text-blue-600 dark:text-blue-500 italic tracking-wider">${o.supplier_phone}</td><td class="p-4 text-right">${btnExcluir}</td></tr>`; });
    renderizarPaginacao(totalItems, 'pedidos', 'pag-pedidos');
  } catch (e) { console.error("Erro pedidos:", e); }
}
async function delOrd(id) { abrirModalConfirmacao("Remover esta requisição?", async () => { await sb.from("orders").delete().eq("id", id); if(typeof atualizarContadoresMenu === 'function') atualizarContadoresMenu(); await renderTabelaPedidos(); }); }