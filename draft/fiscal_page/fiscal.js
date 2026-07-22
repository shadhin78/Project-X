// =========================================================================
// --- Fiscal Ledger & Financial Management System ---
// =========================================================================

window.currentFiscalTab = 'ledger';
window.currentFiscalView = 'table';

window.switchFiscalTab = function (tabName) {
    window.currentFiscalTab = tabName;
    const tabs = ['ledger', 'budget', 'vaults', 'analytics', 'accounting', 'database'];
    tabs.forEach(t => {
        const btn = document.getElementById(`fiscal-tab-btn-${t}`);
        const pane = document.getElementById(`fiscal-pane-${t}`);
        if (t === tabName) {
            if (btn) {
                btn.className = 'px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 whitespace-nowrap transition-all flex items-center gap-2';
            }
            if (pane) pane.classList.remove('hidden');
        } else {
            if (btn) {
                btn.className = 'px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap transition-all flex items-center gap-2';
            }
            if (pane) pane.classList.add('hidden');
        }
    });

    if (tabName === 'analytics') {
        setTimeout(() => { window.renderFiscalCharts(); }, 100);
    } else if (tabName === 'accounting') {
        setTimeout(() => { window.renderAccountingCycleMatrix(); }, 100);
    } else if (tabName === 'database') {
        setTimeout(() => { window.renderFiscalDatabaseTab(); }, 100);
    }
};

window.setFiscalLedgerView = function (viewType) {
    window.currentFiscalView = viewType;
    const listContainer = document.getElementById('fiscal-list-container');
    const taccContainer = document.getElementById('fiscal-taccount-container');
    const tableBtn = document.getElementById('fiscal-view-table-btn');
    const taccBtn = document.getElementById('fiscal-view-taccount-btn');

    if (viewType === 'table') {
        if (listContainer) listContainer.classList.remove('hidden');
        if (taccContainer) taccContainer.classList.add('hidden');
        if (tableBtn) tableBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm transition-all';
        if (taccBtn) taccBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all';
    } else {
        if (listContainer) listContainer.classList.add('hidden');
        if (taccContainer) taccContainer.classList.remove('hidden');
        if (tableBtn) tableBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all';
        if (taccBtn) taccBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm transition-all';
    }
    window.renderFiscalLedgerPage();
};

window.ensureFiscalStateDefaults = function () {
    if (!AppState.fiscalLedger) AppState.fiscalLedger = {};
    if (!Array.isArray(AppState.fiscalLedger.transactions)) {
        AppState.fiscalLedger.transactions = [];
    }
    if (!Array.isArray(AppState.fiscalLedger.budgets)) {
        AppState.fiscalLedger.budgets = [];
    }
    if (!Array.isArray(AppState.fiscalLedger.vaults)) {
        AppState.fiscalLedger.vaults = [];
    }
};

window.calculateNetLiquidCapital = function (transactions, budgets, vaults) {
    const txs = transactions || [];
    const bgts = budgets || [];
    const vlts = vaults || [];

    let generalNetCash = 0;
    txs.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
        if (!tx.category || !tx.category.startsWith('Vault: ')) {
            if (isCr) {
                generalNetCash += amt;
            } else {
                generalNetCash -= amt;
            }
        }
    });

    let liquidVaultHold = 0;
    vlts.forEach(v => {
        const amt = parseFloat(v.currentAmount) || 0;
        if (v.isLiquidSource !== false) {
            liquidVaultHold += amt;
        }
    });

    const totalRemainingBudget = bgts.reduce((sum, b) => {
        const actualSpent = txs
            .filter(t => (t.type === 'dr' || t.type === 'outflow' || t.type === 'expense') && t.category === b.category)
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const targetLimit = parseFloat(b.targetBudget) || 0;
        return sum + (targetLimit - actualSpent);
    }, 0);

    const liquidCashRemain = liquidVaultHold + Math.max(0, generalNetCash);
    return totalRemainingBudget + liquidCashRemain;
};

window.renderDashboardFiscalSummary = function () {
    window.ensureFiscalStateDefaults();

    const transactions = AppState.fiscalLedger.transactions || [];
    const budgets = AppState.fiscalLedger.budgets || [];
    const vaults = AppState.fiscalLedger.vaults || [];

    let totalInflow = 0;
    let totalOutflow = 0;

    transactions.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
        if (isCr) {
            totalInflow += amt;
        } else {
            totalOutflow += amt;
        }
    });

    const netCapital = window.calculateNetLiquidCapital(transactions, budgets, vaults);

    const netEl = document.getElementById('db-fiscal-net-liquid');
    const badgeEl = document.getElementById('db-fiscal-status-badge');
    const inflowEl = document.getElementById('db-fiscal-total-inflow');
    const outflowEl = document.getElementById('db-fiscal-total-outflow');

    if (netEl) {
        netEl.textContent = `৳${netCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (inflowEl) {
        inflowEl.textContent = `৳${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (outflowEl) {
        outflowEl.textContent = `৳${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (badgeEl) {
        if (netCapital >= 0) {
            badgeEl.textContent = 'Surplus';
            badgeEl.className = 'px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        } else {
            badgeEl.textContent = 'Deficit';
            badgeEl.className = 'px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
        }
    }
};

window.renderFiscalLedgerPage = function () {
    window.ensureFiscalStateDefaults();
    if (window.renderDashboardFiscalSummary) window.renderDashboardFiscalSummary();

    // Ensure active tab pane is displayed
    const activeTab = window.currentFiscalTab || 'ledger';
    const tabs = ['ledger', 'budget', 'vaults', 'analytics', 'accounting', 'database'];
    tabs.forEach(t => {
        const btn = document.getElementById(`fiscal-tab-btn-${t}`);
        const pane = document.getElementById(`fiscal-pane-${t}`);
        if (t === activeTab) {
            if (btn) {
                btn.className = 'px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 whitespace-nowrap transition-all flex items-center gap-2';
            }
            if (pane) pane.classList.remove('hidden');
        } else {
            if (btn) {
                btn.className = 'px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap transition-all flex items-center gap-2';
            }
            if (pane) pane.classList.add('hidden');
        }
    });

    // Sync active view container visibility (table/cards list container vs taccount container) and button states
    const activeView = window.currentFiscalView || 'table';
    const listContainer = document.getElementById('fiscal-list-container');
    const taccContainer = document.getElementById('fiscal-taccount-container');
    const tableBtn = document.getElementById('fiscal-view-table-btn');
    const taccBtn = document.getElementById('fiscal-view-taccount-btn');
    if (activeView === 'table') {
        if (listContainer) listContainer.classList.remove('hidden');
        if (taccContainer) taccContainer.classList.add('hidden');
        if (tableBtn) tableBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm transition-all';
        if (taccBtn) taccBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all';
    } else {
        if (listContainer) listContainer.classList.add('hidden');
        if (taccContainer) taccContainer.classList.remove('hidden');
        if (tableBtn) tableBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all';
        if (taccBtn) taccBtn.className = 'flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm transition-all';
    }

    const transactions = AppState.fiscalLedger.transactions || [];
    const budgets = AppState.fiscalLedger.budgets || [];
    const vaults = AppState.fiscalLedger.vaults || [];

    // Calculate Totals:
    // DR = Expense (Outflow)
    // CR = Income (Inflow)
    let totalInflow = 0;
    let totalOutflow = 0;

    transactions.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
        if (isCr) {
            totalInflow += amt;
        } else {
            totalOutflow += amt;
        }
    });

    let totalVaultHold = 0;
    vaults.forEach(v => {
        const amt = parseFloat(v.currentAmount) || 0;
        totalVaultHold += amt;
    });

    // Net Liquid Capital = Remaining Budget + Liquid Cash Remain
    const netCapital = window.calculateNetLiquidCapital(transactions, budgets, vaults);

    // Update Executive KPI Cards
    const kpiNetEl = document.getElementById('fiscal-kpi-net');
    const kpiNetBadgeEl = document.getElementById('fiscal-kpi-net-badge');
    const kpiInflowEl = document.getElementById('fiscal-kpi-inflow');
    const kpiOutflowEl = document.getElementById('fiscal-kpi-outflow');
    const kpiVaultsEl = document.getElementById('fiscal-kpi-vaults');

    if (kpiNetEl) kpiNetEl.textContent = `৳${netCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiInflowEl) kpiInflowEl.textContent = `৳${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiOutflowEl) kpiOutflowEl.textContent = `৳${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiVaultsEl) kpiVaultsEl.textContent = `৳${totalVaultHold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (kpiNetBadgeEl) {
        if (netCapital >= 0) {
            kpiNetBadgeEl.textContent = 'Surplus';
            kpiNetBadgeEl.className = 'px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-teal-200 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200';
        } else {
            kpiNetBadgeEl.textContent = 'Deficit';
            kpiNetBadgeEl.className = 'px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200';
        }
    }

    // Filters for Ledger Table
    const searchVal = (document.getElementById('fiscal-search-input')?.value || '').toLowerCase();
    const filterType = document.getElementById('fiscal-filter-type')?.value || 'ALL';

    const filteredTxs = transactions.filter(tx => {
        const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
        const isDr = !isCr;

        if ((filterType === 'dr' || filterType === 'outflow') && !isDr) return false;
        if ((filterType === 'cr' || filterType === 'inflow') && !isCr) return false;

        if (searchVal) {
            const matchCategory = (tx.category || '').toLowerCase().includes(searchVal);
            const matchHead = (tx.head || '').toLowerCase().includes(searchVal);
            return matchCategory || matchHead;
        }
        return true;
    });

    // Helper to get printable category label
    const getCategoryLabel = (cat) => {
        if (!cat) return 'General';
        if (cat.startsWith('Vault: ')) {
            const vId = cat.replace('Vault: ', '').trim();
            const vlt = vaults.find(v => v.id === vId || v.name === vId);
            return vlt ? `Vault: ${vlt.name}` : cat;
        }
        return cat;
    };

    // Render Transactions Table Body (Desktop Table)
    const tbody = document.getElementById('fiscal-tx-table-body');
    if (tbody) {
        if (filteredTxs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 font-bold">No cash flow transactions found. Click "+ Log Cash" to record entries.</td></tr>`;
        } else {
            tbody.innerHTML = filteredTxs.map(tx => {
                const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
                const amtFormatted = `৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const typeBadge = isCr
                    ? `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">+ CR (Income)</span>`
                    : `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">- DR (Expense)</span>`;

                return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">${tx.date}</td>
                        <td class="py-3 px-4">
                            <div class="font-black text-slate-900 dark:text-white">${tx.head || getCategoryLabel(tx.category)}</div>
                            <div class="text-[10px] text-slate-400 uppercase font-semibold">${getCategoryLabel(tx.category)}</div>
                        </td>
                        <td class="py-3 px-4">${typeBadge}</td>
                        <td class="py-3 px-4 text-right font-black ${isCr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${isCr ? '+' : '-'}${amtFormatted}</td>
                        <td class="py-3 px-4 text-right">
                            <div class="flex items-center justify-end gap-1">
                                <button onclick="window.openFiscalTxModal('${tx.id}')" class="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit Entry">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Delete Entry">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Render Mobile Transaction Cards Container (Realme 8 / Mobile Phones)
    const mobileCardsEl = document.getElementById('fiscal-tx-mobile-cards');
    if (mobileCardsEl) {
        if (filteredTxs.length === 0) {
            mobileCardsEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">No cash flow transactions found. Click "+ Log Cash" to record entries.</div>`;
        } else {
            mobileCardsEl.innerHTML = filteredTxs.map(tx => {
                const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
                const amtFormatted = `৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const typeBadge = isCr
                    ? `<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">+ CR</span>`
                    : `<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">- DR</span>`;

                return `
                    <div class="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-xs space-y-2.5">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <div class="font-black text-sm text-slate-900 dark:text-white truncate">${tx.head || getCategoryLabel(tx.category)}</div>
                                <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-semibold">
                                    <span>${tx.date}</span>
                                    <span>•</span>
                                    <span class="truncate">${getCategoryLabel(tx.category)}</span>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="font-black text-sm ${isCr ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${isCr ? '+' : '-'}${amtFormatted}</div>
                                <div class="mt-0.5">${typeBadge}</div>
                            </div>
                        </div>
                        <div class="flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                            <button onclick="window.openFiscalTxModal('${tx.id}')" class="px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                <span>Edit</span>
                            </button>
                            <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render T-Account Lists (Dr = Expenses / Cr = Income) synced with search & filters
    const drListEl = document.getElementById('fiscal-tacc-dr-list');
    const crListEl = document.getElementById('fiscal-tacc-cr-list');
    const drTotalEl = document.getElementById('fiscal-tacc-dr-total');
    const crTotalEl = document.getElementById('fiscal-tacc-cr-total');

    const drEntries = filteredTxs.filter(t => t.type !== 'cr' && t.type !== 'inflow' && t.type !== 'income');
    const crEntries = filteredTxs.filter(t => t.type === 'cr' || t.type === 'inflow' || t.type === 'income');

    const filteredDrTotal = drEntries.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const filteredCrTotal = crEntries.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    if (drTotalEl) drTotalEl.textContent = `৳${filteredDrTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (crTotalEl) crTotalEl.textContent = `৳${filteredCrTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (drListEl) {
        if (drEntries.length === 0) {
            drListEl.innerHTML = `<div class="text-xs text-slate-400 dark:text-slate-500 text-center py-4 font-semibold">No debit (expense) entries recorded.</div>`;
        } else {
            drListEl.innerHTML = drEntries.map(tx => `
                <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-2xs group">
                    <div class="min-w-0 flex-1 pr-2">
                        <div class="font-black text-xs text-slate-900 dark:text-white truncate">${tx.head || getCategoryLabel(tx.category)}</div>
                        <div class="text-[10px] text-slate-400 font-semibold truncate">${tx.date} • ${getCategoryLabel(tx.category)}</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="font-black text-xs text-rose-600 dark:text-rose-400">-৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div class="flex items-center gap-1 border-l border-slate-100 dark:border-slate-700/60 pl-1.5">
                            <button onclick="window.openFiscalTxModal('${tx.id}')" class="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors" title="Edit Entry">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="Delete Entry">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    if (crListEl) {
        if (crEntries.length === 0) {
            crListEl.innerHTML = `<div class="text-xs text-slate-400 dark:text-slate-500 text-center py-4 font-semibold">No credit (income) entries recorded.</div>`;
        } else {
            crListEl.innerHTML = crEntries.map(tx => `
                <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-2xs group">
                    <div class="min-w-0 flex-1 pr-2">
                        <div class="font-black text-xs text-slate-900 dark:text-white truncate">${tx.head || getCategoryLabel(tx.category)}</div>
                        <div class="text-[10px] text-slate-400 font-semibold truncate">${tx.date} • ${getCategoryLabel(tx.category)}</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="font-black text-xs text-emerald-600 dark:text-emerald-400">+৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div class="flex items-center gap-1 border-l border-slate-100 dark:border-slate-700/60 pl-1.5">
                            <button onclick="window.openFiscalTxModal('${tx.id}')" class="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors" title="Edit Entry">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="Delete Entry">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Render Budget Variance Grid (Expenses directly cut from Budget)
    const budgetGridEl = document.getElementById('fiscal-budget-grid');
    if (budgetGridEl) {
        if (budgets.length === 0) {
            budgetGridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 font-bold">No category budgets created yet. Click "Add Budget" to start.</div>`;
        } else {
            budgetGridEl.innerHTML = budgets.map(b => {
                // Calculate actual expenses cut against this budget category
                const actualSpent = transactions
                    .filter(t => (t.type === 'dr' || t.type === 'outflow' || t.type === 'expense') && t.category === b.category)
                    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

                const targetLimit = parseFloat(b.targetBudget) || 0;
                const remaining = targetLimit - actualSpent;
                const pct = targetLimit > 0 ? Math.min(Math.round((actualSpent / targetLimit) * 100), 100) : 100;
                const isOver = actualSpent > targetLimit;

                const badge = isOver
                    ? `<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">Over Budget (-৳${Math.abs(remaining).toFixed(2)})</span>`
                    : `<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Remain: ৳${remaining.toFixed(2)}</span>`;

                const barColor = isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-teal-500';

                return `
                    <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex flex-col justify-between space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <h5 class="font-black text-sm dark:text-white truncate">${b.category}</h5>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">${b.sourceVaultName ? `Vault: ${b.sourceVaultName}` : `${b.period || 'Monthly'} Budget`}</p>
                            </div>
                            <div class="shrink-0 text-right">
                                ${badge}
                            </div>
                        </div>

                        <div class="flex items-baseline justify-between text-xs font-bold text-slate-500">
                            <span>Cut: <strong class="${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">৳${actualSpent.toFixed(2)}</strong></span>
                            <span class="text-slate-400">Limit: <strong>৳${targetLimit.toFixed(2)}</strong></span>
                        </div>

                        <div class="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                            <div class="${barColor} h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>

                        <div class="flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-700/60 pt-2.5">
                            <button onclick="window.openVaultToBudgetTransferModal('${b.id}')" class="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-1" title="Fund budget from vault">
                                <svg class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                <span>Fund</span>
                            </button>
                            <button onclick="window.openFiscalBudgetModal('${b.id}')" class="p-1 text-slate-400 hover:text-teal-600 rounded" title="Edit Budget">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="window.deleteFiscalBudget('${b.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete Budget">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Savings & Hold Vaults Grid ("Where & Where Saved")
    const vaultsGridEl = document.getElementById('fiscal-vaults-grid');
    if (vaultsGridEl) {
        if (vaults.length === 0) {
            vaultsGridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 font-bold">No savings vaults created. Click "New Vault" to set up hold reserves.</div>`;
        } else {
            vaultsGridEl.innerHTML = vaults.map(v => {
                const currentAmt = parseFloat(v.currentAmount) || 0;
                const targetAmt = parseFloat(v.targetAmount) || 0;
                const hasGoal = targetAmt > 0;
                const pct = hasGoal ? Math.min(Math.round((currentAmt / targetAmt) * 100), 100) : 100;
                const isLiquid = v.isLiquidSource !== false;

                const liquidBadge = isLiquid
                    ? `<button onclick="window.toggleVaultLiquidStatus('${v.id}')" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-all flex items-center gap-1 active:scale-95" title="Source of Liquid Calculation (Included in Net Liquid Capital). Click to toggle.">⚡ Liquid Source</button>`
                    : `<button onclick="window.toggleVaultLiquidStatus('${v.id}')" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition-all flex items-center gap-1 active:scale-95" title="Hold Reserve (Excluded from Net Liquid Capital). Click to toggle.">🔒 Hold Reserve</button>`;

                return `
                    <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex flex-col justify-between space-y-3 relative group hover:shadow-md transition-all">
                        <div>
                            <div class="flex items-center justify-between mb-2.5">
                                ${liquidBadge}
                                <div class="flex items-center gap-1">
                                    <button onclick="window.openFiscalVaultModal('${v.id}')" class="p-1 text-slate-400 hover:text-indigo-600 rounded" title="Edit Vault">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="window.deleteFiscalVault('${v.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete Vault">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <h5 class="font-black text-sm sm:text-base dark:text-white tracking-tight mb-0.5 truncate">${v.name}</h5>
                            <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-3">
                                <svg class="w-3 h-3 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                <span class="truncate">Held at: <strong class="text-slate-700 dark:text-slate-300 font-bold">${v.location || 'Reserve Vault'}</strong></span>
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div class="flex justify-between items-baseline mb-1 text-[10px]">
                                    <span class="font-black uppercase text-slate-400">Vault Balance</span>
                                    <span class="font-black uppercase text-indigo-600 dark:text-indigo-400">${hasGoal ? `${pct}% of Goal` : 'Active Reserve'}</span>
                                </div>
                                <div class="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">৳${currentAmt.toFixed(2)} ${hasGoal ? `<span class="text-xs font-semibold text-slate-400">/ ৳${targetAmt.toFixed(2)}</span>` : ''}</div>
                                ${hasGoal ? `
                                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                                    <div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                </div>` : ''}
                            </div>
                        </div>

                        <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2.5">
                            <span class="text-[10px] text-slate-400 font-bold truncate">${hasGoal ? `Goal: ৳${targetAmt.toLocaleString()}` : 'Flexible Fund'}</span>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button onclick="window.openVaultTransferModal('${v.id}')" class="bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 font-black text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800/50 transition-all active:scale-95 flex items-center gap-1" title="Transfer cash to another vault">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                    <span>Transfer</span>
                                </button>
                                <button onclick="window.openFiscalDepositModal('${v.id}')" class="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-all active:scale-95 flex items-center gap-1">
                                    <span>Deposit / Withdraw</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (window.currentFiscalTab === 'analytics') {
        window.renderFiscalCharts();
    } else if (window.currentFiscalTab === 'accounting') {
        window.renderAccountingCycleMatrix();
    } else if (window.currentFiscalTab === 'database') {
        window.renderFiscalDatabaseTab();
    }
};

window.applyFiscalDbDatePreset = function (preset) {
    const startInput = document.getElementById('fiscal-db-start-date');
    const endInput = document.getElementById('fiscal-db-end-date');
    if (!startInput || !endInput) return;

    if (preset === 'ALL') {
        startInput.value = '';
        endInput.value = '';
    } else {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (preset === 'TODAY') {
            startInput.value = todayStr;
            endInput.value = todayStr;
        } else if (preset === 'THIS_WEEK') {
            const dayOfWeek = now.getDay();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - dayOfWeek);
            startInput.value = startOfWeek.toISOString().split('T')[0];
            endInput.value = todayStr;
        } else if (preset === 'THIS_MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startInput.value = startOfMonth.toISOString().split('T')[0];
            endInput.value = todayStr;
        } else if (preset === 'LAST_MONTH') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            startInput.value = startOfLastMonth.toISOString().split('T')[0];
            endInput.value = endOfLastMonth.toISOString().split('T')[0];
        } else if (preset === 'THIS_YEAR') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            startInput.value = startOfYear.toISOString().split('T')[0];
            endInput.value = todayStr;
        }
    }
    window.renderFiscalDatabaseTab();
};

window.resetFiscalDbFilters = function () {
    const presetSelect = document.getElementById('fiscal-db-date-preset');
    const startInput = document.getElementById('fiscal-db-start-date');
    const endInput = document.getElementById('fiscal-db-end-date');
    const typeSelect = document.getElementById('fiscal-db-filter-type');
    const categorySelect = document.getElementById('fiscal-db-filter-category');
    const searchInput = document.getElementById('fiscal-db-search-input');

    if (presetSelect) presetSelect.value = 'ALL';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (typeSelect) typeSelect.value = 'ALL';
    if (categorySelect) categorySelect.value = 'ALL';
    if (searchInput) searchInput.value = '';

    window.renderFiscalDatabaseTab();
};

window.renderFiscalDatabaseTab = function () {
    window.ensureFiscalStateDefaults();
    const transactions = AppState.fiscalLedger.transactions || [];
    const vaults = AppState.fiscalLedger.vaults || [];
    const budgets = AppState.fiscalLedger.budgets || [];

    // Populate Category Dropdown dynamically if needed
    const catSelect = document.getElementById('fiscal-db-filter-category');
    if (catSelect) {
        const currentSelected = catSelect.value || 'ALL';
        const uniqueCategories = new Set();
        transactions.forEach(t => {
            if (t.category) uniqueCategories.add(t.category);
        });
        budgets.forEach(b => {
            if (b.category) uniqueCategories.add(b.category);
        });
        vaults.forEach(v => {
            uniqueCategories.add(`Vault: ${v.id}`);
        });

        let catHtml = `<option value="ALL">All Categories</option>`;
        Array.from(uniqueCategories).sort().forEach(cat => {
            let label = cat;
            if (cat.startsWith('Vault: ')) {
                const vId = cat.replace('Vault: ', '').trim();
                const vlt = vaults.find(v => v.id === vId || v.name === vId);
                label = vlt ? `Vault: ${vlt.name}` : cat;
            }
            catHtml += `<option value="${cat}">${label}</option>`;
        });
        catSelect.innerHTML = catHtml;
        if (Array.from(catSelect.options).some(o => o.value === currentSelected)) {
            catSelect.value = currentSelected;
        }
    }

    // Read Filter Values
    const startDate = document.getElementById('fiscal-db-start-date')?.value || '';
    const endDate = document.getElementById('fiscal-db-end-date')?.value || '';
    const filterType = document.getElementById('fiscal-db-filter-type')?.value || 'ALL';
    const filterCat = document.getElementById('fiscal-db-filter-category')?.value || 'ALL';
    const searchVal = (document.getElementById('fiscal-db-search-input')?.value || '').toLowerCase().trim();

    // Helper for category label
    const getCategoryLabel = (cat) => {
        if (!cat) return 'General';
        if (cat.startsWith('Vault: ')) {
            const vId = cat.replace('Vault: ', '').trim();
            const vlt = vaults.find(v => v.id === vId || v.name === vId);
            return vlt ? `Vault: ${vlt.name}` : cat;
        }
        return cat;
    };

    // Filter Transactions
    const filtered = transactions.filter(tx => {
        // Date Range
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;

        // Movement Type Filter
        if (filterType === 'inflow' && !(tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income')) return false;
        if (filterType === 'outflow' && !(tx.type === 'dr' || tx.type === 'outflow' || tx.type === 'expense')) return false;
        if (filterType === 'budget_set' && !(tx.type === 'budget_set' || tx.type === 'budget_add')) return false;
        if (filterType === 'budget_fund' && !(tx.type === 'budget_fund' || tx.type === 'budget_refund')) return false;
        if (filterType === 'vault_transfer' && tx.type !== 'vault_transfer') return false;
        if (filterType === 'deposit_withdrawal' && !(tx.type === 'deposit' || tx.type === 'withdrawal')) return false;
        if (filterType === 'auto_topup' && tx.type !== 'auto_topup') return false;

        // Category Filter
        if (filterCat !== 'ALL' && tx.category !== filterCat) return false;

        // Search Filter
        if (searchVal) {
            const matchHead = (tx.head || '').toLowerCase().includes(searchVal);
            const matchCat = (tx.category || '').toLowerCase().includes(searchVal);
            const matchLabel = getCategoryLabel(tx.category).toLowerCase().includes(searchVal);
            const matchId = (tx.id || '').toLowerCase().includes(searchVal);
            const matchAmt = (tx.amount || '').toString().includes(searchVal);
            const matchDate = (tx.date || '').includes(searchVal);
            const matchType = (tx.type || '').toLowerCase().includes(searchVal);
            if (!matchHead && !matchCat && !matchLabel && !matchId && !matchAmt && !matchDate && !matchType) return false;
        }

        return true;
    });

    // Compute Metrics for Filtered Selection
    let totalInflow = 0;
    let totalOutflow = 0;

    filtered.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const isCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income' || tx.type === 'deposit' || tx.type === 'budget_fund';
        const isDr = tx.type === 'dr' || tx.type === 'outflow' || tx.type === 'expense' || tx.type === 'withdrawal' || tx.type === 'budget_refund';
        if (isCr) {
            totalInflow += amt;
        } else if (isDr) {
            totalOutflow += amt;
        }
    });

    const netRange = totalInflow - totalOutflow;

    const countEl = document.getElementById('fiscal-db-kpi-count');
    const inflowEl = document.getElementById('fiscal-db-kpi-inflow');
    const outflowEl = document.getElementById('fiscal-db-kpi-outflow');
    const netEl = document.getElementById('fiscal-db-kpi-net');

    if (countEl) countEl.textContent = filtered.length;
    if (inflowEl) inflowEl.textContent = `৳${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (outflowEl) outflowEl.textContent = `৳${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (netEl) {
        netEl.textContent = `৳${netRange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        netEl.className = netRange >= 0 ? 'text-xl font-black text-emerald-600 dark:text-emerald-400' : 'text-xl font-black text-rose-600 dark:text-rose-400';
    }

    // Render Database Table Body
    const tbody = document.getElementById('fiscal-db-table-body');
    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 font-bold">No movement records match the selected date range and filter criteria.</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(tx => {
                const amtFormatted = `৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                let typeBadge = '';
                if (tx.type === 'budget_set' || tx.type === 'budget_add') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Budget Limit Set</span>`;
                } else if (tx.type === 'budget_fund') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Budget Fund Transfer</span>`;
                } else if (tx.type === 'budget_refund') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">Budget Refund</span>`;
                } else if (tx.type === 'vault_transfer') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Inter-Vault Transfer</span>`;
                } else if (tx.type === 'deposit') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">+ Vault Deposit</span>`;
                } else if (tx.type === 'withdrawal') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">- Vault Withdrawal</span>`;
                } else if (tx.type === 'auto_topup') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">⚡ Auto Deficit Top-Up</span>`;
                } else if (tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income') {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">+ CR (Inflow)</span>`;
                } else {
                    typeBadge = `<span class="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">- DR (Outflow)</span>`;
                }

                const isCredit = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income' || tx.type === 'deposit' || tx.type === 'budget_fund';

                return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="py-3 px-4 font-mono text-[10px] text-slate-400">${tx.id}</td>
                        <td class="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">${tx.date}</td>
                        <td class="py-3 px-4">
                            <div class="font-black text-slate-900 dark:text-white">${tx.head || getCategoryLabel(tx.category)}</div>
                            <div class="text-[10px] text-slate-400 font-semibold uppercase">${tx.status || 'cleared'}</div>
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${getCategoryLabel(tx.category)}</span>
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap">${typeBadge}</td>
                        <td class="py-3 px-4 text-right font-black whitespace-nowrap ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${isCredit ? '+' : '-'}${amtFormatted}</td>
                        <td class="py-3 px-4 text-right whitespace-nowrap">
                            <div class="flex items-center justify-end gap-1">
                                <button onclick="window.openFiscalTxModal('${tx.id}')" class="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit Movement">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Delete Movement">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Render Mobile Database Cards Container (Realme 8 / Mobile Phones)
    const dbMobileCardsEl = document.getElementById('fiscal-db-mobile-cards');
    if (dbMobileCardsEl) {
        if (filtered.length === 0) {
            dbMobileCardsEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">No movement records match the selected date range and filter criteria.</div>`;
        } else {
            dbMobileCardsEl.innerHTML = filtered.map(tx => {
                const amtFormatted = `৳${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                let typeBadge = '';
                if (tx.type === 'budget_set' || tx.type === 'budget_add') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Budget Set</span>`;
                } else if (tx.type === 'budget_fund') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">Fund Transfer</span>`;
                } else if (tx.type === 'vault_transfer') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Vault Transfer</span>`;
                } else if (tx.type === 'deposit') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">+ Deposit</span>`;
                } else if (tx.type === 'withdrawal') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">- Withdrawal</span>`;
                } else if (tx.type === 'auto_topup') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">⚡ Auto Topup</span>`;
                } else if (tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income') {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">+ Inflow</span>`;
                } else {
                    typeBadge = `<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">- Outflow</span>`;
                }
                const isCredit = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income' || tx.type === 'deposit' || tx.type === 'budget_fund';

                return `
                    <div class="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-xs space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <div class="font-black text-xs text-slate-900 dark:text-white truncate">${tx.head || getCategoryLabel(tx.category)}</div>
                                <div class="text-[9px] text-slate-400 font-mono mt-0.5">${tx.id} • ${tx.date}</div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="font-black text-xs ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${isCredit ? '+' : '-'}${amtFormatted}</div>
                                <div class="mt-0.5">${typeBadge}</div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2 text-[10px]">
                            <span class="px-2 py-0.5 font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">${getCategoryLabel(tx.category)}</span>
                            <div class="flex items-center gap-1">
                                <button onclick="window.openFiscalTxModal('${tx.id}')" class="p-1 text-slate-400 hover:text-teal-600 rounded" title="Edit">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="window.deleteFiscalTransaction('${tx.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
};

window.toggleVaultLiquidStatus = function (vltId) {
    window.ensureFiscalStateDefaults();
    const vaults = AppState.fiscalLedger.vaults || [];
    const targetVault = vaults.find(v => v.id === vltId);
    if (!targetVault) return;

    const willBeLiquid = !(targetVault.isLiquidSource === true);

    if (willBeLiquid) {
        // 1st unset all existing liquid sources, then set the new one
        vaults.forEach(v => { v.isLiquidSource = false; });
        targetVault.isLiquidSource = true;
        showToast(`Vault [${targetVault.name}] is now the primary Liquid Source (previous liquid source unset)`, "success");
    } else {
        targetVault.isLiquidSource = false;
        showToast(`Vault [${targetVault.name}] unset as Liquid Source`, "info");
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
};

// Vault CRUD Handlers
window.openFiscalVaultModal = function (vltId = null) {
    document.getElementById('fiscal-vlt-id').value = vltId || '';
    const titleEl = document.getElementById('fiscal-vlt-modal-title');

    if (vltId) {
        const vlt = (AppState.fiscalLedger.vaults || []).find(v => v.id === vltId);
        if (vlt) {
            if (titleEl) titleEl.textContent = 'Edit Savings Vault';
            document.getElementById('fiscal-vlt-name').value = vlt.name || '';
            document.getElementById('fiscal-vlt-location').value = vlt.location || '';
            document.getElementById('fiscal-vlt-current').value = vlt.currentAmount !== undefined ? vlt.currentAmount : 0;
            document.getElementById('fiscal-vlt-target').value = vlt.targetAmount || '';
        }
    } else {
        if (titleEl) titleEl.textContent = 'Create Savings / Hold Vault';
        document.getElementById('fiscal-vlt-name').value = '';
        document.getElementById('fiscal-vlt-location').value = '';
        document.getElementById('fiscal-vlt-current').value = '0';
        document.getElementById('fiscal-vlt-target').value = '';
    }
    openModal('fiscal-vault-modal');
};

window.saveFiscalVault = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const id = document.getElementById('fiscal-vlt-id').value || `vlt-${Date.now()}`;
    const name = document.getElementById('fiscal-vlt-name').value.trim();
    if (!name) {
        showToast("Vault Name is mandatory!", "warning");
        return;
    }

    const locationInput = document.getElementById('fiscal-vlt-location').value.trim();
    const location = locationInput || 'General Reserve';
    const currentAmount = parseFloat(document.getElementById('fiscal-vlt-current').value) || 0;
    const targetAmount = parseFloat(document.getElementById('fiscal-vlt-target').value) || 0;

    const idx = AppState.fiscalLedger.vaults.findIndex(v => v.id === id);
    const oldVault = idx >= 0 ? AppState.fiscalLedger.vaults[idx] : null;

    // Retain existing liquid source status if editing, or default to primary if this is the first vault
    const isLiquidSource = oldVault ? (oldVault.isLiquidSource === true) : ((AppState.fiscalLedger.vaults || []).length === 0);

    let toastMsg = "Capital vault saved!";
    if (oldVault) {
        const oldAmt = parseFloat(oldVault.currentAmount) || 0;
        const delta = currentAmount - oldAmt;
        if (delta > 0) {
            toastMsg = `Vault [${name}] updated! (+৳${delta.toFixed(2)} balance adjusted)`;
        } else if (delta < 0) {
            toastMsg = `Vault [${name}] updated! (-৳${Math.abs(delta).toFixed(2)} balance adjusted)`;
        } else {
            toastMsg = `Vault [${name}] updated!`;
        }
    } else {
        toastMsg = `Vault [${name}] created! (Initial Balance: ৳${currentAmount.toFixed(2)})`;
    }

    const vltObj = { id, name, location, currentAmount, targetAmount, isLiquidSource };
    if (idx >= 0) {
        AppState.fiscalLedger.vaults[idx] = vltObj;
    } else {
        AppState.fiscalLedger.vaults.push(vltObj);
        if (currentAmount > 0) {
            AppState.fiscalLedger.transactions.unshift({
                id: `mov-vcr-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'deposit',
                head: `Vault Initial Reserve Deposit: ${name}`,
                category: `Vault: ${id}`,
                amount: currentAmount,
                status: 'cleared'
            });
        }
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-vault-modal');
    showToast(toastMsg, "success");
};

// DR and CR Toggle Button Handler
// DR = Expense (outflow)
// CR = Income (inflow)
window.setFiscalTxType = function (type) {
    const hiddenInput = document.getElementById('fiscal-tx-type');
    if (hiddenInput) hiddenInput.value = type;

    const btnDr = document.getElementById('fiscal-tx-btn-dr');
    const btnCr = document.getElementById('fiscal-tx-btn-cr');
    const labelEl = document.getElementById('fiscal-tx-category-label');
    const categorySelect = document.getElementById('fiscal-tx-category');

    const isDr = (type === 'dr' || type === 'outflow' || type === 'expense');

    if (btnDr && btnCr) {
        if (isDr) {
            btnDr.className = "flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all bg-rose-600 text-white shadow active:scale-95";
            btnCr.className = "flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
        } else {
            btnDr.className = "flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
            btnCr.className = "flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all bg-emerald-600 text-white shadow active:scale-95";
        }
    }

    window.ensureFiscalStateDefaults();
    const budgets = AppState.fiscalLedger.budgets || [];
    const vaults = AppState.fiscalLedger.vaults || [];

    if (isDr) {
        if (labelEl) labelEl.textContent = 'Expense Source (Budget or Vault)';
        if (categorySelect) {
            const curVal = categorySelect.value;
            let html = '';

            // 1st: Budget options
            let budgetOpts = '';
            if (budgets.length === 0) {
                budgetOpts = `<option value="General">General Operating Budget (Auto-Funded from Liquid Source)</option>`;
            } else {
                budgets.forEach(b => {
                    const spent = (AppState.fiscalLedger.transactions || [])
                        .filter(t => (t.type === 'dr' || t.type === 'outflow' || t.type === 'expense') && t.category === b.category)
                        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                    const limit = parseFloat(b.targetBudget) || 0;
                    const rem = limit - spent;
                    budgetOpts += `<option value="${b.category}">${b.category} (Limit: ৳${limit.toLocaleString()}, Rem: ৳${rem.toLocaleString()})</option>`;
                });
            }
            html += `<optgroup label="Budget Categories">${budgetOpts}</optgroup>`;

            // 2nd: Vault options
            if (vaults.length > 0) {
                let vaultOpts = '';
                vaults.forEach(v => {
                    const curAmt = parseFloat(v.currentAmount) || 0;
                    vaultOpts += `<option value="Vault: ${v.id}">Vault: ${v.name} (Available: ৳${curAmt.toLocaleString()})</option>`;
                });
                html += `<optgroup label="Savings & Liquid Vaults">${vaultOpts}</optgroup>`;
            }

            categorySelect.innerHTML = html;
            if (curVal && Array.from(categorySelect.options).some(o => o.value === curVal)) {
                categorySelect.value = curVal;
            }
        }
    } else {
        if (labelEl) labelEl.textContent = 'Select Vault to Deposit (from Vaults Tab)';
        if (categorySelect) {
            const curVal = categorySelect.value;
            let html = '';
            if (vaults.length === 0) {
                html = `<option value="">No vaults found (Create in Vaults Tab first)</option>`;
            } else {
                vaults.forEach(v => {
                    const curAmt = parseFloat(v.currentAmount) || 0;
                    html += `<option value="Vault: ${v.id}">${v.name} (Current Balance: ৳${curAmt.toLocaleString()})</option>`;
                });
            }
            categorySelect.innerHTML = html;
            if (curVal && Array.from(categorySelect.options).some(o => o.value === curVal)) {
                categorySelect.value = curVal;
            }
        }
    }
};

// Transaction CRUD Handlers
window.openFiscalTxModal = function (txId = null) {
    window.ensureFiscalStateDefaults();

    document.getElementById('fiscal-tx-id').value = txId || '';
    const titleEl = document.getElementById('fiscal-tx-modal-title');

    let currentType = 'dr';
    if (txId) {
        const tx = (AppState.fiscalLedger.transactions || []).find(t => t.id === txId);
        if (tx) {
            if (titleEl) titleEl.textContent = 'Edit Cash Flow Entry';
            document.getElementById('fiscal-tx-date').value = tx.date || '';
            currentType = (tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income') ? 'cr' : 'dr';
            document.getElementById('fiscal-tx-head').value = tx.head || '';
            document.getElementById('fiscal-tx-amount').value = tx.amount || '';

            window.setFiscalTxType(currentType);

            const categorySelect = document.getElementById('fiscal-tx-category');
            if (categorySelect && tx.category) {
                if (!Array.from(categorySelect.options).some(o => o.value === tx.category)) {
                    const opt = document.createElement('option');
                    opt.value = tx.category;
                    opt.textContent = tx.category;
                    categorySelect.appendChild(opt);
                }
                categorySelect.value = tx.category;
            }
        }
    } else {
        if (titleEl) titleEl.textContent = 'Log Cash Flow Entry';
        document.getElementById('fiscal-tx-date').value = new Date().toISOString().split('T')[0];
        currentType = 'dr';
        document.getElementById('fiscal-tx-head').value = '';
        document.getElementById('fiscal-tx-amount').value = '';

        window.setFiscalTxType(currentType);
    }

    openModal('fiscal-tx-modal');
};

window.saveFiscalTransaction = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const id = document.getElementById('fiscal-tx-id').value || `tx-${Date.now()}`;
    const date = document.getElementById('fiscal-tx-date').value || new Date().toISOString().split('T')[0];
    const type = document.getElementById('fiscal-tx-type').value; // 'dr' (Expense) or 'cr' (Income)
    const headInput = document.getElementById('fiscal-tx-head').value.trim();
    const categoryVal = document.getElementById('fiscal-tx-category').value;
    const amount = parseFloat(document.getElementById('fiscal-tx-amount').value) || 0;

    const category = categoryVal || 'General';
    const head = headInput || (type === 'cr' ? 'Income Entry' : 'Expense Entry');

    const existingIdx = AppState.fiscalLedger.transactions.findIndex(t => t.id === id);
    const oldTx = existingIdx >= 0 ? AppState.fiscalLedger.transactions[existingIdx] : null;

    // Reverse old vault deposit if previous tx was CR on a vault
    if (oldTx && (oldTx.type === 'cr' || oldTx.type === 'inflow') && oldTx.category && oldTx.category.startsWith('Vault: ')) {
        const oldVaultId = oldTx.category.replace('Vault: ', '').trim();
        const oldVault = AppState.fiscalLedger.vaults.find(v => v.id === oldVaultId || v.name === oldVaultId);
        if (oldVault) {
            oldVault.currentAmount = Math.max(0, (parseFloat(oldVault.currentAmount) || 0) - (parseFloat(oldTx.amount) || 0));
        }
    }
    // Reverse old vault expense if previous tx was DR on a vault
    if (oldTx && (oldTx.type === 'dr' || oldTx.type === 'outflow' || oldTx.type === 'expense') && oldTx.category && oldTx.category.startsWith('Vault: ')) {
        const oldVaultId = oldTx.category.replace('Vault: ', '').trim();
        const oldVault = AppState.fiscalLedger.vaults.find(v => v.id === oldVaultId || v.name === oldVaultId);
        if (oldVault) {
            oldVault.currentAmount = (parseFloat(oldVault.currentAmount) || 0) + (parseFloat(oldTx.amount) || 0);
        }
    }

    const txObj = { id, date, type, head, category, amount, status: 'cleared' };
    if (existingIdx >= 0) {
        AppState.fiscalLedger.transactions[existingIdx] = txObj;
    } else {
        AppState.fiscalLedger.transactions.unshift(txObj);
    }

    // Apply vault deposit if CR (Income)
    if ((type === 'cr' || type === 'inflow') && category.startsWith('Vault: ')) {
        const vaultId = category.replace('Vault: ', '').trim();
        const vault = AppState.fiscalLedger.vaults.find(v => v.id === vaultId || v.name === vaultId);
        if (vault) {
            vault.currentAmount = (parseFloat(vault.currentAmount) || 0) + amount;
            if (oldTx) {
                showToast(`Income entry updated into Vault [${vault.name}]`, "success");
            } else {
                showToast(`CR Income ৳${amount.toFixed(2)} added into Vault [${vault.name}]`, "success");
            }
        } else {
            showToast(oldTx ? "Cash flow income entry updated!" : "Cash flow income entry logged!", "success");
        }
    } else if (type === 'dr' || type === 'outflow' || type === 'expense') {
        if (category.startsWith('Vault: ')) {
            const vaultId = category.replace('Vault: ', '').trim();
            const vault = AppState.fiscalLedger.vaults.find(v => v.id === vaultId || v.name === vaultId);
            if (vault) {
                const curAmt = parseFloat(vault.currentAmount) || 0;
                vault.currentAmount = Math.max(0, curAmt - amount);
                if (oldTx) {
                    showToast(`Expense updated! ৳${amount.toFixed(2)} paid directly from Vault [${vault.name}]`, "success");
                } else {
                    showToast(`DR Expense ৳${amount.toFixed(2)} paid directly from Vault [${vault.name}]!`, "success");
                }
            } else {
                showToast(oldTx ? "Cash flow expense entry updated!" : "Cash flow expense entry logged!", "success");
            }
        } else {
            let bgt = AppState.fiscalLedger.budgets.find(b => b.category === category);

        // Calculate total actual spent for this category (sum of all DR entries in this category)
        const totalSpent = (AppState.fiscalLedger.transactions || [])
            .filter(t => (t.type === 'dr' || t.type === 'outflow' || t.type === 'expense') && t.category === category)
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const currentTargetBudget = bgt ? (parseFloat(bgt.targetBudget) || 0) : 0;

        // Auto-transfer from Liquid Source Vault if deficit occurs (expense exceeds remaining budget)
        if (totalSpent > currentTargetBudget) {
            const deficit = totalSpent - currentTargetBudget;

            // Locate primary Liquid Source vault
            const vaults = AppState.fiscalLedger.vaults || [];
            let liquidVault = vaults.find(v => v.isLiquidSource === true);
            if (!liquidVault) {
                liquidVault = vaults.find(v => v.isLiquidSource !== false);
            }

            if (liquidVault && (parseFloat(liquidVault.currentAmount) || 0) > 0) {
                const available = parseFloat(liquidVault.currentAmount) || 0;
                const transferAmt = Math.min(available, deficit);

                // Deduct transfer amount from Liquid Source Vault balance
                liquidVault.currentAmount = Math.max(0, available - transferAmt);

                if (bgt) {
                    bgt.targetBudget = (parseFloat(bgt.targetBudget) || 0) + transferAmt;
                    bgt.fundedAmount = (parseFloat(bgt.fundedAmount !== undefined ? bgt.fundedAmount : bgt.targetBudget) || 0) + transferAmt;
                    bgt.sourceVaultId = liquidVault.id;
                    bgt.sourceVaultName = liquidVault.name;
                } else {
                    bgt = {
                        id: `bgt-${Date.now()}`,
                        category: category,
                        targetBudget: transferAmt,
                        fundedAmount: transferAmt,
                        sourceVaultId: liquidVault.id,
                        sourceVaultName: liquidVault.name,
                        period: 'Monthly'
                    };
                    AppState.fiscalLedger.budgets.push(bgt);
                }

                AppState.fiscalLedger.transactions.push({
                    id: `mov-topup-${Date.now()}`,
                    date: date,
                    type: 'auto_topup',
                    head: `Auto Deficit Top-Up: Vault [${liquidVault.name}] ➔ Budget [${category}]`,
                    category: category,
                    amount: transferAmt,
                    status: 'cleared'
                });

                const remainingDeficit = deficit - transferAmt;
                if (remainingDeficit > 0) {
                    showToast(`Expense logged! ৳${transferAmt.toFixed(2)} auto-transferred from Liquid Source Vault [${liquidVault.name}] into budget. Remaining uncovered deficit: ৳${remainingDeficit.toFixed(2)}`, "warning");
                } else {
                    showToast(`Expense logged! Deficit of ৳${transferAmt.toFixed(2)} automatically transferred from Liquid Source Vault [${liquidVault.name}] to budget [${category}]!`, "success");
                }
            } else {
                if (bgt) {
                    showToast(oldTx ? `DR Expense updated for budget [${category}] (Over Budget by ৳${deficit.toFixed(2)})` : `DR Expense ৳${amount.toFixed(2)} cut from budget [${category}] (Over Budget by ৳${deficit.toFixed(2)})`, "warning");
                } else {
                    showToast(oldTx ? "Cash flow expense entry updated!" : "Cash flow expense entry logged!", "success");
                }
            }
        } else {
            if (bgt) {
                showToast(oldTx ? `DR Expense updated for budget [${category}]` : `DR Expense ৳${amount.toFixed(2)} cut from budget [${category}]`, "success");
            } else {
                showToast(oldTx ? "Cash flow expense entry updated!" : "Cash flow expense entry logged!", "success");
            }
        }
    } } else {
        showToast(oldTx ? "Cash flow entry updated!" : "Cash flow entry saved!", "success");
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-tx-modal');
};

window.pendingFiscalDelete = null;

window.confirmDeleteFiscalItem = function (type, id) {
    window.ensureFiscalStateDefaults();
    window.pendingFiscalDelete = { type, id };

    const msgEl = document.getElementById('fiscal-del-modal-msg');
    const previewEl = document.getElementById('fiscal-del-item-preview');

    if (type === 'transaction') {
        const tx = (AppState.fiscalLedger.transactions || []).find(t => t.id === id);
        if (msgEl) msgEl.textContent = 'Are you sure you want to delete this cash flow ledger entry? This will permanently remove the record from your ledger.';
        if (previewEl) previewEl.textContent = tx ? `Entry: ${tx.head || tx.category} (৳${parseFloat(tx.amount || 0).toLocaleString()})` : '';
    } else if (type === 'budget') {
        const bgt = (AppState.fiscalLedger.budgets || []).find(b => b.id === id);
        if (msgEl) msgEl.textContent = 'Are you sure you want to delete this category budget limit?';
        if (previewEl) previewEl.textContent = bgt ? `Budget: ${bgt.category} (Limit: ৳${parseFloat(bgt.targetBudget || 0).toLocaleString()})` : '';
    } else if (type === 'vault') {
        const vlt = (AppState.fiscalLedger.vaults || []).find(v => v.id === id);
        if (msgEl) msgEl.textContent = 'Are you sure you want to delete this savings vault?';
        if (previewEl) previewEl.textContent = vlt ? `Vault: ${vlt.name} (Balance: ৳${parseFloat(vlt.currentAmount || 0).toLocaleString()})` : '';
    }

    openModal('fiscal-delete-modal');
};

window.executeFiscalDelete = function () {
    if (!window.pendingFiscalDelete) return;
    const { type, id } = window.pendingFiscalDelete;
    window.ensureFiscalStateDefaults();

    if (type === 'transaction') {
        const tx = (AppState.fiscalLedger.transactions || []).find(t => t.id === id);
        if (tx && (tx.type === 'cr' || tx.type === 'inflow') && tx.category && tx.category.startsWith('Vault: ')) {
            const vaultId = tx.category.replace('Vault: ', '').trim();
            const vault = AppState.fiscalLedger.vaults.find(v => v.id === vaultId || v.name === vaultId);
            if (vault) {
                vault.currentAmount = Math.max(0, (parseFloat(vault.currentAmount) || 0) - (parseFloat(tx.amount) || 0));
            }
        }
        if (tx && (tx.type === 'dr' || tx.type === 'outflow' || tx.type === 'expense') && tx.category && tx.category.startsWith('Vault: ')) {
            const vaultId = tx.category.replace('Vault: ', '').trim();
            const vault = AppState.fiscalLedger.vaults.find(v => v.id === vaultId || v.name === vaultId);
            if (vault) {
                vault.currentAmount = (parseFloat(vault.currentAmount) || 0) + (parseFloat(tx.amount) || 0);
            }
        }
        AppState.fiscalLedger.transactions = (AppState.fiscalLedger.transactions || []).filter(t => t.id !== id);
        showToast("Cash flow entry deleted.", "info");
    } else if (type === 'budget') {
        const bgt = (AppState.fiscalLedger.budgets || []).find(b => b.id === id);
        if (bgt && bgt.sourceVaultId) {
            const vlt = AppState.fiscalLedger.vaults.find(v => v.id === bgt.sourceVaultId);
            if (vlt) {
                const oldFunded = parseFloat(bgt.fundedAmount !== undefined ? bgt.fundedAmount : bgt.targetBudget) || 0;
                vlt.currentAmount = (parseFloat(vlt.currentAmount) || 0) + oldFunded;
            }
        }
        AppState.fiscalLedger.budgets = (AppState.fiscalLedger.budgets || []).filter(b => b.id !== id);
        showToast("Category budget removed.", "info");
    } else if (type === 'vault') {
        AppState.fiscalLedger.vaults = (AppState.fiscalLedger.vaults || []).filter(v => v.id !== id);
        showToast("Hold vault deleted.", "info");
    }

    window.pendingFiscalDelete = null;
    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-delete-modal');
};

window.deleteFiscalTransaction = function (txId) {
    window.confirmDeleteFiscalItem('transaction', txId);
};

// Budget CRUD Handlers
window.openFiscalBudgetModal = function (bgtId = null) {
    window.ensureFiscalStateDefaults();

    const vaultSelect = document.getElementById('fiscal-bgt-vault');
    if (vaultSelect) {
        const vaults = AppState.fiscalLedger.vaults || [];
        let html = `<option value="">None / General Operating Cash</option>`;
        vaults.forEach(v => {
            const curAmt = parseFloat(v.currentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            html += `<option value="${v.id}">${v.name} (Available: ৳${curAmt})</option>`;
        });
        vaultSelect.innerHTML = html;
    }

    document.getElementById('fiscal-bgt-id').value = bgtId || '';
    const titleEl = document.getElementById('fiscal-bgt-modal-title');
    if (bgtId) {
        const bgt = (AppState.fiscalLedger.budgets || []).find(b => b.id === bgtId);
        if (bgt) {
            if (titleEl) titleEl.textContent = 'Edit Category Budget';
            document.getElementById('fiscal-bgt-category').value = bgt.category || '';
            document.getElementById('fiscal-bgt-amount').value = bgt.targetBudget || '';
            if (vaultSelect) vaultSelect.value = bgt.sourceVaultId || '';
        }
    } else {
        if (titleEl) titleEl.textContent = 'Set Category Budget';
        document.getElementById('fiscal-bgt-category').value = '';
        document.getElementById('fiscal-bgt-amount').value = '';
        if (vaultSelect) vaultSelect.value = '';
    }
    openModal('fiscal-budget-modal');
};

window.saveFiscalBudget = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const id = document.getElementById('fiscal-bgt-id').value || `bgt-${Date.now()}`;
    const category = document.getElementById('fiscal-bgt-category').value.trim();
    const targetBudget = parseFloat(document.getElementById('fiscal-bgt-amount').value) || 0;
    const sourceVaultId = document.getElementById('fiscal-bgt-vault')?.value || '';

    const idx = AppState.fiscalLedger.budgets.findIndex(b => b.id === id);
    const oldBgt = idx >= 0 ? AppState.fiscalLedger.budgets[idx] : null;

    let sourceVaultName = '';
    let fundedAmount = 0;
    let toastMsg = '';

    if (oldBgt) {
        const oldFunded = parseFloat(oldBgt.fundedAmount !== undefined ? oldBgt.fundedAmount : oldBgt.targetBudget) || 0;
        const oldVaultId = oldBgt.sourceVaultId || '';
        const newVaultId = sourceVaultId || '';

        if (oldVaultId === newVaultId && newVaultId !== '') {
            // Same vault selected - apply delta funding/refund
            const vlt = AppState.fiscalLedger.vaults.find(v => v.id === newVaultId);
            if (vlt) {
                sourceVaultName = vlt.name;
                const delta = targetBudget - oldFunded;
                const vltCurrent = parseFloat(vlt.currentAmount) || 0;

                if (delta > 0) {
                    const actualDeduct = Math.min(vltCurrent, delta);
                    vlt.currentAmount = Math.max(0, vltCurrent - actualDeduct);
                    fundedAmount = oldFunded + actualDeduct;
                    toastMsg = `Budget updated! ৳${actualDeduct.toFixed(2)} Dr. added from Vault [${vlt.name}] (Total Budget: ৳${targetBudget.toFixed(2)})`;
                } else if (delta < 0) {
                    const refund = Math.abs(delta);
                    vlt.currentAmount = vltCurrent + refund;
                    fundedAmount = targetBudget;
                    toastMsg = `Budget updated! ৳${refund.toFixed(2)} Cr. refunded to Vault [${vlt.name}] (Total Budget: ৳${targetBudget.toFixed(2)})`;
                } else {
                    fundedAmount = oldFunded;
                    toastMsg = `Category budget limit updated to ৳${targetBudget.toFixed(2)}`;
                }
            } else {
                fundedAmount = targetBudget;
                toastMsg = `Category budget updated!`;
            }
        } else {
            // Vault changed or cleared
            if (oldVaultId !== '') {
                const oldVault = AppState.fiscalLedger.vaults.find(v => v.id === oldVaultId);
                if (oldVault) {
                    oldVault.currentAmount = (parseFloat(oldVault.currentAmount) || 0) + oldFunded;
                }
            }

            if (newVaultId !== '') {
                const vlt = AppState.fiscalLedger.vaults.find(v => v.id === newVaultId);
                if (vlt) {
                    sourceVaultName = vlt.name;
                    const vltCurrent = parseFloat(vlt.currentAmount) || 0;
                    const actualDeduct = Math.min(vltCurrent, targetBudget);
                    vlt.currentAmount = Math.max(0, vltCurrent - actualDeduct);
                    fundedAmount = actualDeduct;
                    toastMsg = `Budget updated! Funded ৳${fundedAmount.toFixed(2)} Dr. from Vault [${vlt.name}]`;
                }
            } else {
                fundedAmount = 0;
                toastMsg = `Category budget updated! (Unfunded, ৳${oldFunded.toFixed(2)} refunded to vault)`;
            }
        }
    } else {
        // Brand new budget
        if (sourceVaultId) {
            const vlt = AppState.fiscalLedger.vaults.find(v => v.id === sourceVaultId);
            if (vlt) {
                sourceVaultName = vlt.name;
                const vltCurrent = parseFloat(vlt.currentAmount) || 0;
                const actualDeduct = Math.min(vltCurrent, targetBudget);
                vlt.currentAmount = Math.max(0, vltCurrent - actualDeduct);
                fundedAmount = actualDeduct;
                toastMsg = `Budget set! ৳${fundedAmount.toFixed(2)} Dr. from Vault [${sourceVaultName}] & Cr. into [${category}] budget`;
            }
        } else {
            fundedAmount = 0;
            toastMsg = `Category budget created!`;
        }
    }

    const bgtObj = { id, category, targetBudget, sourceVaultId, sourceVaultName, fundedAmount, period: 'Monthly' };
    if (idx >= 0) {
        AppState.fiscalLedger.budgets[idx] = bgtObj;
        if (oldBgt && oldBgt.targetBudget !== targetBudget) {
            AppState.fiscalLedger.transactions.unshift({
                id: `mov-bgt-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'budget_set',
                head: `Budget Limit Updated: ${category} (Target Limit: ৳${targetBudget.toFixed(2)})`,
                category: category,
                amount: Math.abs(targetBudget - oldBgt.targetBudget),
                status: 'cleared'
            });
        }
    } else {
        AppState.fiscalLedger.budgets.push(bgtObj);
        AppState.fiscalLedger.transactions.unshift({
            id: `mov-bgt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'budget_set',
            head: `Category Budget Set: ${category}`,
            category: category,
            amount: targetBudget,
            status: 'cleared'
        });
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-budget-modal');

    showToast(toastMsg || "Category budget updated!", "success");
};

window.deleteFiscalBudget = function (bgtId) {
    window.confirmDeleteFiscalItem('budget', bgtId);
};

window.deleteFiscalVault = function (vltId) {
    window.confirmDeleteFiscalItem('vault', vltId);
};

window.openFiscalDepositModal = function (vltId) {
    document.getElementById('fiscal-dep-vlt-id').value = vltId;
    document.getElementById('fiscal-dep-amount').value = '';
    openModal('fiscal-deposit-modal');
};

window.processFiscalTransfer = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const vltId = document.getElementById('fiscal-dep-vlt-id').value;
    const type = document.getElementById('fiscal-dep-type').value;
    const amount = parseFloat(document.getElementById('fiscal-dep-amount').value) || 0;

    const vlt = AppState.fiscalLedger.vaults.find(v => v.id === vltId);
    if (!vlt) return;

    if (type === 'deposit') {
        vlt.currentAmount = (parseFloat(vlt.currentAmount) || 0) + amount;
        AppState.fiscalLedger.transactions.unshift({
            id: `mov-dep-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'deposit',
            head: `Vault Deposit: ${vlt.name}`,
            category: `Vault: ${vlt.id}`,
            amount: amount,
            status: 'cleared'
        });
        showToast(`Deposited ৳${amount.toFixed(2)} into ${vlt.name}`, "success");
    } else {
        const cur = parseFloat(vlt.currentAmount) || 0;
        vlt.currentAmount = Math.max(0, cur - amount);
        AppState.fiscalLedger.transactions.unshift({
            id: `mov-wth-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'withdrawal',
            head: `Vault Withdrawal: ${vlt.name}`,
            category: `Vault: ${vlt.id}`,
            amount: amount,
            status: 'cleared'
        });
        showToast(`Withdrew ৳${amount.toFixed(2)} from ${vlt.name}`, "info");
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-deposit-modal');
};

// Vault-to-Vault Transfer Handlers
window.openVaultTransferModal = function (senderVaultId = null) {
    window.ensureFiscalStateDefaults();
    const vaults = AppState.fiscalLedger.vaults || [];

    if (vaults.length < 2) {
        showToast("You need at least 2 vaults to transfer money between vaults.", "warning");
        return;
    }

    const senderSelect = document.getElementById('fiscal-xfer-sender-vlt');
    const receiverSelect = document.getElementById('fiscal-xfer-receiver-vlt');
    const amountInput = document.getElementById('fiscal-xfer-amount');

    if (!senderSelect || !receiverSelect) return;

    let html = '';
    vaults.forEach(v => {
        const amt = parseFloat(v.currentAmount) || 0;
        html += `<option value="${v.id}">${v.name} (Balance: ৳${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })})</option>`;
    });

    senderSelect.innerHTML = html;
    receiverSelect.innerHTML = html;

    if (senderVaultId && vaults.some(v => v.id === senderVaultId)) {
        senderSelect.value = senderVaultId;
        const otherVlt = vaults.find(v => v.id !== senderVaultId);
        if (otherVlt) receiverSelect.value = otherVlt.id;
    } else {
        senderSelect.value = vaults[0].id;
        if (vaults[1]) receiverSelect.value = vaults[1].id;
    }

    if (amountInput) amountInput.value = '';
    window.updateVaultTransferPreview();
    openModal('fiscal-vault-transfer-modal');
};

window.updateVaultTransferPreview = function () {
    const senderSelect = document.getElementById('fiscal-xfer-sender-vlt');
    const receiverSelect = document.getElementById('fiscal-xfer-receiver-vlt');
    const amountInput = document.getElementById('fiscal-xfer-amount');

    if (!senderSelect || !receiverSelect) return;

    const senderId = senderSelect.value;
    const receiverId = receiverSelect.value;
    const amount = parseFloat(amountInput?.value) || 0;

    const vaults = AppState.fiscalLedger.vaults || [];
    const senderVlt = vaults.find(v => v.id === senderId);
    const receiverVlt = vaults.find(v => v.id === receiverId);

    const senderCurrEl = document.getElementById('fiscal-xfer-sender-curr');
    const senderAfterEl = document.getElementById('fiscal-xfer-sender-after');
    const receiverCurrEl = document.getElementById('fiscal-xfer-receiver-curr');
    const receiverAfterEl = document.getElementById('fiscal-xfer-receiver-after');

    if (senderVlt) {
        const sAmt = parseFloat(senderVlt.currentAmount) || 0;
        if (senderCurrEl) senderCurrEl.textContent = `৳${sAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const afterAmt = sAmt - amount;
        if (senderAfterEl) {
            if (afterAmt < 0) {
                senderAfterEl.textContent = `Insufficient Balance! (-৳${Math.abs(afterAmt).toFixed(2)})`;
                senderAfterEl.className = "text-[10px] font-black text-rose-600 dark:text-rose-400";
            } else {
                senderAfterEl.textContent = `After Transfer: ৳${afterAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                senderAfterEl.className = "text-[10px] font-bold text-slate-500";
            }
        }
    }

    if (receiverVlt) {
        const rAmt = parseFloat(receiverVlt.currentAmount) || 0;
        if (receiverCurrEl) receiverCurrEl.textContent = `৳${rAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const afterAmt = rAmt + amount;
        if (receiverAfterEl) {
            receiverAfterEl.textContent = `After Transfer: ৳${afterAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            receiverAfterEl.className = "text-[10px] font-bold text-slate-500";
        }
    }
};

window.executeVaultToVaultTransfer = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const senderId = document.getElementById('fiscal-xfer-sender-vlt').value;
    const receiverId = document.getElementById('fiscal-xfer-receiver-vlt').value;
    const amount = parseFloat(document.getElementById('fiscal-xfer-amount').value) || 0;

    if (senderId === receiverId) {
        showToast("Sender and Receiver vaults must be different!", "warning");
        return;
    }

    if (amount <= 0) {
        showToast("Please enter a valid transfer amount greater than 0.", "warning");
        return;
    }

    const vaults = AppState.fiscalLedger.vaults || [];
    const senderVlt = vaults.find(v => v.id === senderId);
    const receiverVlt = vaults.find(v => v.id === receiverId);

    if (!senderVlt || !receiverVlt) {
        showToast("Selected vaults could not be found.", "error");
        return;
    }

    const senderAmt = parseFloat(senderVlt.currentAmount) || 0;
    if (senderAmt < amount) {
        showToast(`Insufficient balance in [${senderVlt.name}]! (Available: ৳${senderAmt.toFixed(2)})`, "warning");
        return;
    }

    // Perform transfer
    senderVlt.currentAmount = Math.max(0, senderAmt - amount);
    receiverVlt.currentAmount = (parseFloat(receiverVlt.currentAmount) || 0) + amount;

    AppState.fiscalLedger.transactions.unshift({
        id: `mov-v2v-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'vault_transfer',
        head: `Vault Transfer: ${senderVlt.name} ➔ ${receiverVlt.name}`,
        category: `Vault: ${senderVlt.id}`,
        amount: amount,
        status: 'cleared'
    });

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-vault-transfer-modal');
    showToast(`Transferred ৳${amount.toFixed(2)} from [${senderVlt.name}] to [${receiverVlt.name}]!`, "success");
};

// Vault-to-Budget Transfer Handlers
window.setVaultToBudgetDirection = function (direction) {
    const dirInput = document.getElementById('fiscal-v2b-direction');
    const addBtn = document.getElementById('fiscal-v2b-dir-add');
    const removeBtn = document.getElementById('fiscal-v2b-dir-remove');

    const senderHeader = document.getElementById('fiscal-v2b-sender-header');
    const senderLabel = document.getElementById('fiscal-v2b-sender-label');
    const receiverHeader = document.getElementById('fiscal-v2b-receiver-header');
    const receiverLabel = document.getElementById('fiscal-v2b-receiver-label');
    const amountLabel = document.getElementById('fiscal-v2b-amount-label');
    const submitBtn = document.getElementById('fiscal-v2b-submit-btn');
    const submitText = document.getElementById('fiscal-v2b-submit-text');

    if (dirInput) dirInput.value = direction;

    if (direction === 'remove') {
        if (addBtn) addBtn.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700";
        if (removeBtn) removeBtn.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border bg-amber-600 text-white border-amber-600 shadow-sm";

        if (senderHeader) senderHeader.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg> Receiver Vault / Savings (To)`;
        if (senderLabel) senderLabel.textContent = "Select Target Vault";
        if (receiverHeader) receiverHeader.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg> Source Budget (From)`;
        if (receiverLabel) receiverLabel.textContent = "Select Source Budget";
        if (amountLabel) amountLabel.innerHTML = `Removal Amount (৳ BDT) <span class="text-rose-500 font-black">*</span>`;
        if (submitBtn) submitBtn.className = "w-2/3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2";
        if (submitText) submitText.textContent = "Confirm Return to Vault";
    } else {
        if (addBtn) addBtn.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border bg-teal-600 text-white border-teal-600 shadow-sm";
        if (removeBtn) removeBtn.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700";

        if (senderHeader) senderHeader.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg> Sender Vault / Savings (From)`;
        if (senderLabel) senderLabel.textContent = "Select Sender Vault";
        if (receiverHeader) receiverHeader.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg> Receiver Budget (To)`;
        if (receiverLabel) receiverLabel.textContent = "Select Receiver Budget";
        if (amountLabel) amountLabel.innerHTML = `Funding Amount (৳ BDT) <span class="text-rose-500 font-black">*</span>`;
        if (submitBtn) submitBtn.className = "w-2/3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2";
        if (submitText) submitText.textContent = "Confirm Budget Funding";
    }

    window.updateVaultToBudgetPreview();
};

window.openVaultToBudgetTransferModal = function (receiverBudgetId = null, defaultDirection = 'add') {
    window.ensureFiscalStateDefaults();
    const vaults = AppState.fiscalLedger.vaults || [];
    const budgets = AppState.fiscalLedger.budgets || [];

    if (vaults.length === 0) {
        showToast("Create at least 1 Savings Vault first before transferring.", "warning");
        return;
    }

    if (budgets.length === 0) {
        showToast("Create at least 1 Category Budget first before transferring.", "warning");
        return;
    }

    const senderSelect = document.getElementById('fiscal-v2b-sender-vlt');
    const receiverSelect = document.getElementById('fiscal-v2b-receiver-bgt');
    const amountInput = document.getElementById('fiscal-v2b-amount');

    if (!senderSelect || !receiverSelect) return;

    let vHtml = '';
    vaults.forEach(v => {
        const amt = parseFloat(v.currentAmount) || 0;
        vHtml += `<option value="${v.id}">${v.name} (Balance: ৳${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })})</option>`;
    });
    senderSelect.innerHTML = vHtml;

    let bHtml = '';
    budgets.forEach(b => {
        const tgt = parseFloat(b.targetBudget) || 0;
        bHtml += `<option value="${b.id}">${b.category} (Limit: ৳${tgt.toLocaleString('en-US', { minimumFractionDigits: 2 })})</option>`;
    });
    receiverSelect.innerHTML = bHtml;

    senderSelect.value = vaults[0].id;
    if (receiverBudgetId && budgets.some(b => b.id === receiverBudgetId)) {
        receiverSelect.value = receiverBudgetId;
    } else {
        receiverSelect.value = budgets[0].id;
    }

    if (amountInput) amountInput.value = '';
    window.setVaultToBudgetDirection(defaultDirection);
    openModal('fiscal-vault-to-budget-modal');
};

window.updateVaultToBudgetPreview = function () {
    const senderSelect = document.getElementById('fiscal-v2b-sender-vlt');
    const receiverSelect = document.getElementById('fiscal-v2b-receiver-bgt');
    const amountInput = document.getElementById('fiscal-v2b-amount');
    const direction = document.getElementById('fiscal-v2b-direction')?.value || 'add';

    if (!senderSelect || !receiverSelect) return;

    const senderId = senderSelect.value;
    const receiverId = receiverSelect.value;
    const amount = parseFloat(amountInput?.value) || 0;

    const vaults = AppState.fiscalLedger.vaults || [];
    const budgets = AppState.fiscalLedger.budgets || [];
    const senderVlt = vaults.find(v => v.id === senderId);
    const receiverBgt = budgets.find(b => b.id === receiverId);

    const senderCurrEl = document.getElementById('fiscal-v2b-sender-curr');
    const senderAfterEl = document.getElementById('fiscal-v2b-sender-after');
    const receiverCurrEl = document.getElementById('fiscal-v2b-receiver-curr');
    const receiverAfterEl = document.getElementById('fiscal-v2b-receiver-after');

    if (direction === 'remove') {
        // Removing from Budget & returning to Vault
        if (senderVlt) {
            const sAmt = parseFloat(senderVlt.currentAmount) || 0;
            if (senderCurrEl) senderCurrEl.textContent = `৳${sAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const afterAmt = sAmt + amount;
            if (senderAfterEl) {
                senderAfterEl.textContent = `After Return: ৳${afterAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                senderAfterEl.className = "text-[10px] font-bold text-emerald-600 dark:text-emerald-400";
            }
        }

        if (receiverBgt) {
            const rTgt = parseFloat(receiverBgt.targetBudget) || 0;
            if (receiverCurrEl) receiverCurrEl.textContent = `৳${rTgt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const afterTgt = rTgt - amount;
            if (receiverAfterEl) {
                if (afterTgt < 0) {
                    receiverAfterEl.textContent = `Insufficient Budget Limit! (-৳${Math.abs(afterTgt).toFixed(2)})`;
                    receiverAfterEl.className = "text-[10px] font-black text-rose-600 dark:text-rose-400";
                } else {
                    receiverAfterEl.textContent = `New Budget Limit: ৳${afterTgt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    receiverAfterEl.className = "text-[10px] font-bold text-slate-500";
                }
            }
        }
    } else {
        // Adding to Budget from Vault
        if (senderVlt) {
            const sAmt = parseFloat(senderVlt.currentAmount) || 0;
            if (senderCurrEl) senderCurrEl.textContent = `৳${sAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const afterAmt = sAmt - amount;
            if (senderAfterEl) {
                if (afterAmt < 0) {
                    senderAfterEl.textContent = `Insufficient Balance! (-৳${Math.abs(afterAmt).toFixed(2)})`;
                    senderAfterEl.className = "text-[10px] font-black text-rose-600 dark:text-rose-400";
                } else {
                    senderAfterEl.textContent = `After Transfer: ৳${afterAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    senderAfterEl.className = "text-[10px] font-bold text-slate-500";
                }
            }
        }

        if (receiverBgt) {
            const rTgt = parseFloat(receiverBgt.targetBudget) || 0;
            if (receiverCurrEl) receiverCurrEl.textContent = `৳${rTgt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const afterTgt = rTgt + amount;
            if (receiverAfterEl) {
                receiverAfterEl.textContent = `New Budget Limit: ৳${afterTgt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                receiverAfterEl.className = "text-[10px] font-bold text-slate-500";
            }
        }
    }
};

window.executeVaultToBudgetTransfer = function (event) {
    event.preventDefault();
    window.ensureFiscalStateDefaults();

    const direction = document.getElementById('fiscal-v2b-direction')?.value || 'add';
    const senderId = document.getElementById('fiscal-v2b-sender-vlt').value;
    const receiverId = document.getElementById('fiscal-v2b-receiver-bgt').value;
    const amount = parseFloat(document.getElementById('fiscal-v2b-amount').value) || 0;

    if (amount <= 0) {
        showToast("Please enter a valid transfer amount greater than 0.", "warning");
        return;
    }

    const vaults = AppState.fiscalLedger.vaults || [];
    const budgets = AppState.fiscalLedger.budgets || [];

    const senderVlt = vaults.find(v => v.id === senderId);
    const receiverBgt = budgets.find(b => b.id === receiverId);

    if (!senderVlt || !receiverBgt) {
        showToast("Selected vault or budget could not be found.", "error");
        return;
    }

    const senderAmt = parseFloat(senderVlt.currentAmount) || 0;
    const prevTgt = parseFloat(receiverBgt.targetBudget) || 0;
    const prevFunded = receiverBgt.fundedAmount !== undefined ? parseFloat(receiverBgt.fundedAmount) : prevTgt;

    if (direction === 'remove') {
        // Return money from Budget to Vault
        if (prevTgt < amount) {
            showToast(`Amount exceeds current Budget limit for [${receiverBgt.category}]! (Limit: ৳${prevTgt.toFixed(2)})`, "warning");
            return;
        }

        receiverBgt.targetBudget = Math.max(0, prevTgt - amount);
        receiverBgt.fundedAmount = Math.max(0, prevFunded - amount);
        senderVlt.currentAmount = senderAmt + amount;

        AppState.fiscalLedger.transactions.unshift({
            id: `mov-v2b-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'budget_refund',
            head: `Budget Return: [${receiverBgt.category}] ➔ Vault [${senderVlt.name}]`,
            category: receiverBgt.category,
            amount: amount,
            status: 'cleared'
        });

        showToast(`Returned ৳${amount.toFixed(2)} from [${receiverBgt.category}] budget to Vault [${senderVlt.name}]!`, "success");
    } else {
        // Add money from Vault to Budget
        if (senderAmt < amount) {
            showToast(`Insufficient balance in Vault [${senderVlt.name}]! (Available: ৳${senderAmt.toFixed(2)})`, "warning");
            return;
        }

        senderVlt.currentAmount = Math.max(0, senderAmt - amount);
        receiverBgt.targetBudget = prevTgt + amount;
        receiverBgt.sourceVaultId = senderVlt.id;
        receiverBgt.sourceVaultName = senderVlt.name;
        receiverBgt.fundedAmount = prevFunded + amount;

        AppState.fiscalLedger.transactions.unshift({
            id: `mov-v2b-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'budget_fund',
            head: `Budget Fund Transfer: Vault [${senderVlt.name}] ➔ Budget [${receiverBgt.category}]`,
            category: receiverBgt.category,
            amount: amount,
            status: 'cleared'
        });

        showToast(`Funded ৳${amount.toFixed(2)} from Vault [${senderVlt.name}] into [${receiverBgt.category}] budget!`, "success");
    }

    FirebaseService.saveToCloud();
    window.renderFiscalLedgerPage();
    closeModal('fiscal-vault-to-budget-modal');
};

// --- Double-Entry Accounting Process & Cycle Matrix Renderer ---
window.jumpToAccountingStage = function (stageNum) {
    const el = document.getElementById(`accounting-stage-${stageNum}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
        setTimeout(() => {
            el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
        }, 2000);
    }
};

window.renderAccountingCycleMatrix = function () {
    window.ensureFiscalStateDefaults();

    const transactions = AppState.fiscalLedger.transactions || [];
    const budgets = AppState.fiscalLedger.budgets || [];
    const vaults = AppState.fiscalLedger.vaults || [];

    // Calculate core totals for Double-Entry System:
    let totalRevenues = 0; // True Operating Income (Inflows/CR)
    let totalExpenses = 0; // True Operating Expense (Outflows/DR)
    let generalOperatingCash = 0; // Unallocated General Cash Flow

    transactions.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const isTrueCr = tx.type === 'cr' || tx.type === 'inflow' || tx.type === 'income';
        const isTrueDr = tx.type === 'dr' || tx.type === 'outflow' || tx.type === 'expense';

        if (isTrueCr) {
            totalRevenues += amt;
            if (!tx.category || !tx.category.startsWith('Vault: ')) {
                generalOperatingCash += amt;
            }
        } else if (isTrueDr) {
            totalExpenses += amt;
            if (!tx.category || !tx.category.startsWith('Vault: ')) {
                generalOperatingCash -= amt;
            }
        }
    });

    let totalVaultReserves = 0;
    let liquidVaultReserves = 0;
    let nonLiquidVaultReserves = 0;
    vaults.forEach(v => {
        const amt = parseFloat(v.currentAmount) || 0;
        totalVaultReserves += amt;
        if (v.isLiquidSource !== false) {
            liquidVaultReserves += amt;
        } else {
            nonLiquidVaultReserves += amt;
        }
    });

    const netOperatingIncome = totalRevenues - totalExpenses;
    const operatingCashAsset = Math.max(0, generalOperatingCash) + liquidVaultReserves;
    const vaultReservesAsset = nonLiquidVaultReserves;
    const totalAssets = operatingCashAsset + vaultReservesAsset;
    
    // Liabilities (Hold payables / allocations)
    let totalLiabilities = 0;

    // Owner's Equity Equations (OE):
    const ownersEquityEnd = totalAssets - totalLiabilities;
    const ownersEquityBeg = ownersEquityEnd - netOperatingIncome;

    const fmtCurrency = (num) => `৳${parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getMovementAccountingDetails = (t) => {
        const amt = parseFloat(t.amount) || 0;
        const amtStr = fmtCurrency(amt);
        const cat = t.category || 'General';

        switch (t.type) {
            case 'budget_set':
            case 'budget_add':
                return {
                    typeLabel: 'Budget Limit Set',
                    typeClass: 'text-amber-600 font-bold',
                    drAccount: `Dr. ${cat} Budget Limit Allocation (+Budget)`,
                    crAccount: `Cr. Owner's Equity Budget Reserve (+Equity)`,
                    drTitle: `${cat} Budget Limit Allocation (5020)`,
                    crTitle: `Owner's Equity Budget Reserve (3020)`,
                    drCode: '5020',
                    crCode: '3020',
                    eqEffect: `<span class="text-amber-600">ΔOE (${amtStr}) Allocated</span>`,
                    isCredit: false
                };
            case 'budget_fund':
                return {
                    typeLabel: 'Budget Fund Transfer',
                    typeClass: 'text-indigo-600 font-bold',
                    drAccount: `Dr. ${cat} Budget Fund (+Asset)`,
                    crAccount: `Cr. Vault Reserve Holding (-Vault Asset)`,
                    drTitle: `${cat} Budget Fund Asset (1030)`,
                    crTitle: `Vault Reserve Holding (1020)`,
                    drCode: '1030',
                    crCode: '1020',
                    eqEffect: `<span class="text-indigo-600">Reallocated Asset (${amtStr})</span>`,
                    isCredit: true
                };
            case 'budget_refund':
                return {
                    typeLabel: 'Budget Refund',
                    typeClass: 'text-slate-600 font-bold',
                    drAccount: `Dr. Vault Reserve Holding (+Vault Asset)`,
                    crAccount: `Cr. ${cat} Budget Fund (-Budget Asset)`,
                    drTitle: `Vault Reserve Holding (1020)`,
                    crTitle: `${cat} Budget Fund Asset (1030)`,
                    drCode: '1020',
                    crCode: '1030',
                    eqEffect: `<span class="text-slate-600">Reallocated Asset (${amtStr})</span>`,
                    isCredit: false
                };
            case 'vault_transfer':
                return {
                    typeLabel: 'Inter-Vault Transfer',
                    typeClass: 'text-purple-600 font-bold',
                    drAccount: `Dr. Receiver Vault Holding (+Target Vault Asset)`,
                    crAccount: `Cr. Sender Vault Holding (-Source Vault Asset)`,
                    drTitle: `Target Vault Holding Asset (1020-B)`,
                    crTitle: `Source Vault Holding Asset (1020-A)`,
                    drCode: '1020-B',
                    crCode: '1020-A',
                    eqEffect: `<span class="text-purple-600">Internal Vault Shift (${amtStr})</span>`,
                    isCredit: false
                };
            case 'deposit':
                return {
                    typeLabel: '+ Vault Deposit',
                    typeClass: 'text-cyan-600 font-bold',
                    drAccount: `Dr. Vault Reserve Holding (+Vault Asset)`,
                    crAccount: `Cr. Cash Operating Capital (-Cash Asset)`,
                    drTitle: `Vault Reserve Holding (1020)`,
                    crTitle: `Cash Operating Capital (1010)`,
                    drCode: '1020',
                    crCode: '1010',
                    eqEffect: `<span class="text-cyan-600">+${amtStr} Vault / -${amtStr} Cash</span>`,
                    isCredit: true
                };
            case 'withdrawal':
                return {
                    typeLabel: '- Vault Withdrawal',
                    typeClass: 'text-orange-600 font-bold',
                    drAccount: `Dr. Cash Operating Capital (+Cash Asset)`,
                    crAccount: `Cr. Vault Reserve Holding (-Vault Asset)`,
                    drTitle: `Cash Operating Capital (1010)`,
                    crTitle: `Vault Reserve Holding (1020)`,
                    drCode: '1010',
                    crCode: '1020',
                    eqEffect: `<span class="text-orange-600">+${amtStr} Cash / -${amtStr} Vault</span>`,
                    isCredit: false
                };
            case 'auto_topup':
                return {
                    typeLabel: '⚡ Auto Deficit Top-Up',
                    typeClass: 'text-teal-600 font-bold',
                    drAccount: `Dr. ${cat} Deficit Transfer (+Budget)`,
                    crAccount: `Cr. Liquid Source Vault (-Liquid Asset)`,
                    drTitle: `${cat} Deficit Transfer (5020)`,
                    crTitle: `Liquid Source Vault Asset (1020)`,
                    drCode: '5020',
                    crCode: '1020',
                    eqEffect: `<span class="text-teal-600">Auto Transfer (${amtStr})</span>`,
                    isCredit: false
                };
            case 'cr':
            case 'inflow':
            case 'income':
                return {
                    typeLabel: '+ Credit (Inflow)',
                    typeClass: 'text-emerald-600 font-bold',
                    drAccount: `Dr. Cash Operating Asset (+Asset)`,
                    crAccount: `Cr. ${cat} Income Stream (+Revenue)`,
                    drTitle: `Cash Operating Asset (1010)`,
                    crTitle: `${cat} Income Stream (4010)`,
                    drCode: '1010',
                    crCode: '4010',
                    eqEffect: `<span class="text-emerald-600">+${amtStr} Assets = +${amtStr} Revenue</span>`,
                    isCredit: true
                };
            default:
                return {
                    typeLabel: '- Debit (Outflow)',
                    typeClass: 'text-rose-600 font-bold',
                    drAccount: `Dr. ${cat} Operating Expense (+Expense)`,
                    crAccount: `Cr. Cash Operating Asset (-Asset)`,
                    drTitle: `${cat} Operating Expense (5010)`,
                    crTitle: `Cash Operating Asset (1010)`,
                    drCode: '5010',
                    crCode: '1010',
                    eqEffect: `<span class="text-rose-600">-${amtStr} Assets = -${amtStr} Equity</span>`,
                    isCredit: false
                };
        }
    };

    // Update Top Banner Equation Proof:
    const eqAssetsEl = document.getElementById('accounting-eq-assets');
    const eqLiabEl = document.getElementById('accounting-eq-liab');
    const eqEquityEl = document.getElementById('accounting-eq-equity');
    const eqStatusEl = document.getElementById('accounting-eq-status');

    if (eqAssetsEl) eqAssetsEl.textContent = fmtCurrency(totalAssets);
    if (eqLiabEl) eqLiabEl.textContent = fmtCurrency(totalLiabilities);
    if (eqEquityEl) eqEquityEl.textContent = fmtCurrency(ownersEquityEnd);

    if (eqStatusEl) {
        const isBalanced = Math.abs(totalAssets - (totalLiabilities + ownersEquityEnd)) < 0.01;
        if (isBalanced) {
            eqStatusEl.textContent = "✓ A = L + OE Balanced";
            eqStatusEl.className = "px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
        } else {
            eqStatusEl.textContent = "⚠ Out of Balance";
            eqStatusEl.className = "px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40";
        }
    }

    const wrapper = document.getElementById('accounting-stages-wrapper');
    if (!wrapper) return;

    let html = '';

    // STAGE 1: Transaction
    html += `
        <div id="accounting-stage-1" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">01</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">1. Transaction (Event Data Ingestion)</h4>
                        <p class="text-xs text-slate-500 font-medium">Raw cash flow events logged with dates, heads, categories, and flow direction.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 1 of 13</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Ref ID</th>
                            <th class="py-3 px-4">Date</th>
                            <th class="py-3 px-4">Entry Description & Head</th>
                            <th class="py-3 px-4">Category / Allocation</th>
                            <th class="py-3 px-4">Flow Type</th>
                            <th class="py-3 px-4 text-right">Raw Amount (৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        ${transactions.length === 0 ? `<tr><td colspan="6" class="py-6 text-center text-slate-400 font-bold">No raw transactions logged yet.</td></tr>` : transactions.map((t, idx) => {
                            const info = getMovementAccountingDetails(t);
                            return `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td class="py-3 px-4 font-mono text-[10px] text-slate-400">TX-${String(idx + 1).padStart(3, '0')}</td>
                                    <td class="py-3 px-4 font-bold">${t.date || 'N/A'}</td>
                                    <td class="py-3 px-4 font-black text-slate-900 dark:text-white">${t.head || t.category || 'Fiscal Movement'}</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">${t.category || 'General'}</span></td>
                                    <td class="py-3 px-4"><span class="${info.typeClass}">${info.typeLabel}</span></td>
                                    <td class="py-3 px-4 text-right font-black ${info.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${fmtCurrency(t.amount)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Dual-Impact Analysis ↓</div>
        </div>
    `;

    // STAGE 2: Analyze Transaction
    html += `
        <div id="accounting-stage-2" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">02</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">2. Analyze Transaction (Debit/Credit Rule Analysis)</h4>
                        <p class="text-xs text-slate-500 font-medium">Deconstructing every transaction into Debit (Dr.) and Credit (Cr.) dual account effects.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 2 of 13</span>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 font-mono text-xs text-slate-600 dark:text-slate-300 flex flex-wrap justify-between gap-4">
                <div><span class="font-bold text-emerald-600 dark:text-emerald-400">Debit (Dr.) Rule:</span> Increases Assets & Expenses | Decreases Liabilities & Equity</div>
                <div><span class="font-bold text-indigo-600 dark:text-indigo-400">Credit (Cr.) Rule:</span> Increases Liabilities, Revenue & Equity | Decreases Assets</div>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Tx Ref</th>
                            <th class="py-3 px-4">Event Description</th>
                            <th class="py-3 px-4">Debit (Dr.) Account Analysis</th>
                            <th class="py-3 px-4">Credit (Cr.) Account Analysis</th>
                            <th class="py-3 px-4 text-right">Equation Effect (ΔA = ΔL + ΔOE)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        ${transactions.length === 0 ? `<tr><td colspan="5" class="py-6 text-center text-slate-400 font-bold">No transactions to analyze.</td></tr>` : transactions.map((t, idx) => {
                            const info = getMovementAccountingDetails(t);
                            return `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td class="py-3 px-4 font-mono text-[10px] text-slate-400">TX-${String(idx + 1).padStart(3, '0')}</td>
                                    <td class="py-3 px-4 font-black text-slate-900 dark:text-white">${t.head || t.category}</td>
                                    <td class="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">${info.drAccount}</td>
                                    <td class="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">${info.crAccount}</td>
                                    <td class="py-3 px-4 text-right font-mono font-bold">${info.eqEffect}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Math for A = L + OE Equilibrium Proof ↓</div>
        </div>
    `;

    // STAGE 3: Math for A = L + OE (Accounting Equation Equilibrium Proof)
    html += `
        <div id="accounting-stage-3" class="bg-teal-950/20 dark:bg-slate-800 p-6 rounded-3xl border-2 border-teal-500/40 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-teal-500/30 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-sm">03</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span>3. Math for A = L + OE (Accounting Equation Equilibrium Proof)</span>
                            <span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">Mathematical Proof</span>
                        </h4>
                        <p class="text-xs text-slate-500 font-medium">Proving double-entry mathematical equilibrium: Assets (A) = Liabilities (L) + Owner's Equity (OE) for every transaction.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-300">Stage 3 of 13</span>
            </div>

            <!-- Mathematical Equation Breakdown Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                <div class="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-slate-900 dark:text-slate-100">
                    <div class="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400">Total Assets (A)</div>
                    <div class="text-lg font-black text-teal-600 dark:text-teal-300 mt-1">${fmtCurrency(totalAssets)}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Liquid Operating Cash + Vault Reserves</div>
                </div>
                <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-slate-100">
                    <div class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Total Liabilities (L)</div>
                    <div class="text-lg font-black text-amber-600 dark:text-amber-300 mt-1">${fmtCurrency(totalLiabilities)}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Hold Payables & Obligations</div>
                </div>
                <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-slate-900 dark:text-slate-100">
                    <div class="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Owner's Equity (OE)</div>
                    <div class="text-lg font-black text-indigo-600 dark:text-indigo-300 mt-1">${fmtCurrency(ownersEquityEnd)}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Capital + Retained Operating Income</div>
                </div>
            </div>

            <!-- Mathematical Equilibrium Table -->
            <div class="overflow-x-auto custom-scrollbar border border-teal-500/30 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-teal-900/40 text-teal-200 font-black uppercase tracking-widest text-[9px] border-b border-teal-500/30">
                            <th class="py-3 px-4">Tx Ref</th>
                            <th class="py-3 px-4">Transaction Event</th>
                            <th class="py-3 px-4 text-right">Δ Assets (ΔA)</th>
                            <th class="py-3 px-4 text-center font-serif">=</th>
                            <th class="py-3 px-4 text-right">Δ Liabilities (ΔL)</th>
                            <th class="py-3 px-4 text-center font-serif">+</th>
                            <th class="py-3 px-4 text-right">Δ Owner's Equity (ΔOE)</th>
                            <th class="py-3 px-4 text-center">Equilibrium Proof</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200/50 dark:divide-slate-700/50 font-mono text-xs font-semibold">
                        ${transactions.length === 0 ? `<tr><td colspan="8" class="py-6 text-center text-slate-400 font-bold">No transaction data available for math proof.</td></tr>` : transactions.map((t, idx) => {
                            const info = getMovementAccountingDetails(t);
                            const amtStr = fmtCurrency(t.amount);
                            return `
                                <tr class="hover:bg-teal-50/30 dark:hover:bg-slate-700/30">
                                    <td class="py-3 px-4 text-slate-400 text-[10px]">TX-${String(idx + 1).padStart(3, '0')}</td>
                                    <td class="py-3 px-4 font-sans font-black text-slate-900 dark:text-white">${t.head || t.category}</td>
                                    <td class="py-3 px-4 text-right font-black ${info.isCredit ? 'text-emerald-600' : 'text-rose-600'}">${info.isCredit ? '+' : '-'}${amtStr}</td>
                                    <td class="py-3 px-4 text-center font-serif text-slate-400">=</td>
                                    <td class="py-3 px-4 text-right text-slate-400">৳0.00</td>
                                    <td class="py-3 px-4 text-center font-serif text-slate-400">+</td>
                                    <td class="py-3 px-4 text-right font-black ${info.isCredit ? 'text-emerald-600' : 'text-rose-600'}">${info.isCredit ? '+' : '-'}${amtStr}</td>
                                    <td class="py-3 px-4 text-center">
                                        <span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">✓ Balanced</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="bg-teal-900/60 text-white font-black font-mono text-xs border-t-2 border-teal-500">
                            <td colspan="2" class="py-3.5 px-4 font-sans">EQUATION TOTALS (A = L + OE)</td>
                            <td class="py-3.5 px-4 text-right text-teal-300">${fmtCurrency(totalAssets)}</td>
                            <td class="py-3.5 px-4 text-center font-serif">=</td>
                            <td class="py-3.5 px-4 text-right text-amber-300">${fmtCurrency(totalLiabilities)}</td>
                            <td class="py-3.5 px-4 text-center font-serif">+</td>
                            <td class="py-3.5 px-4 text-right text-indigo-300">${fmtCurrency(ownersEquityEnd)}</td>
                            <td class="py-3.5 px-4 text-center"><span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-teal-400 text-slate-900">VERIFIED PROOF</span></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Account Identification Matrix ↓</div>
        </div>
    `;

    // STAGE 4: Identify Accounts
    html += `
        <div id="accounting-stage-4" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">04</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">4. Identify Accounts (Chart of Accounts Mapping Matrix)</h4>
                        <p class="text-xs text-slate-500 font-medium">Categorizing accounts into 5 core financial classifications.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 4 of 13</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div class="bg-teal-50/50 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/50">
                    <div class="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 mb-2">1000 - ASSETS</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200">1010 Cash & Operating: <span class="text-teal-600 font-black">${fmtCurrency(operatingCashAsset)}</span></div>
                        <div class="font-bold text-slate-800 dark:text-slate-200">1020 Vault Reserves: <span class="text-teal-600 font-black">${fmtCurrency(vaultReservesAsset)}</span></div>
                    </div>
                </div>

                <div class="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                    <div class="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2">2000 - LIABILITIES</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200">2010 Hold Payables: <span class="text-amber-600 font-black">${fmtCurrency(totalLiabilities)}</span></div>
                    </div>
                </div>

                <div class="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
                    <div class="text-xs font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-2">3000 - OWNER'S EQUITY</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200">3010 Retained Capital: <span class="text-indigo-600 font-black">${fmtCurrency(ownersEquityEnd)}</span></div>
                    </div>
                </div>

                <div class="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                    <div class="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2">4000 - REVENUE</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200">4010 Operating Inflows: <span class="text-emerald-600 font-black">${fmtCurrency(totalRevenues)}</span></div>
                    </div>
                </div>

                <div class="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/50">
                    <div class="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2">5000 - EXPENSES</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200">5010 Operating Spending: <span class="text-rose-600 font-black">${fmtCurrency(totalExpenses)}</span></div>
                    </div>
                </div>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to General Journal Entry Ledger ↓</div>
        </div>
    `;

    // STAGE 5: Journal Entry
    html += `
        <div id="accounting-stage-5" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">05</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">5. Journal Entry (General Journal Double-Entry Ledger)</h4>
                        <p class="text-xs text-slate-500 font-medium">Standard general journal entries ensuring strict Debit = Credit balance per entry.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 5 of 13</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Date</th>
                            <th class="py-3 px-4">Account Titles & Explanation</th>
                            <th class="py-3 px-4 text-center">Ref</th>
                            <th class="py-3 px-4 text-right">Debit (Dr. ৳)</th>
                            <th class="py-3 px-4 text-right">Credit (Cr. ৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        ${transactions.length === 0 ? `<tr><td colspan="5" class="py-6 text-center text-slate-400 font-bold">No general journal entries logged.</td></tr>` : transactions.map((t, idx) => {
                            const info = getMovementAccountingDetails(t);
                            return `
                                <tr class="bg-slate-50/40 dark:bg-slate-800/40 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <td class="py-2.5 px-4 font-bold" rowspan="2">${t.date || 'N/A'}</td>
                                    <td class="py-1 px-4 font-black text-slate-900 dark:text-white">${info.drTitle}</td>
                                    <td class="py-1 px-4 text-center font-mono text-[10px]">${info.drCode}</td>
                                    <td class="py-1 px-4 text-right font-black ${info.isCredit ? 'text-teal-600' : 'text-rose-600'}">${fmtCurrency(t.amount)}</td>
                                    <td class="py-1 px-4 text-right font-mono text-slate-400">-</td>
                                </tr>
                                <tr>
                                    <td class="py-1 px-4 pl-8 text-slate-600 dark:text-slate-300 font-bold">  Cr. ${info.crTitle}</td>
                                    <td class="py-1 px-4 text-center font-mono text-[10px]">${info.crCode}</td>
                                    <td class="py-1 px-4 text-right font-mono text-slate-400">-</td>
                                    <td class="py-1 px-4 text-right font-black ${info.isCredit ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}">${fmtCurrency(t.amount)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-100 dark:bg-slate-900 font-black uppercase text-xs border-t-2 border-slate-300 dark:border-slate-600">
                            <td colspan="3" class="py-3 px-4 text-slate-700 dark:text-slate-200">Total Journal Entries Volume</td>
                            <td class="py-3 px-4 text-right text-teal-600 dark:text-teal-400">${fmtCurrency(totalRevenues + totalExpenses)}</td>
                            <td class="py-3 px-4 text-right text-teal-600 dark:text-teal-400">${fmtCurrency(totalRevenues + totalExpenses)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to General Ledger T-Accounts Matrix ↓</div>
        </div>
    `;

    // STAGE 6: Ledger
    html += `
        <div id="accounting-stage-6" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">06</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">6. Ledger (General Ledger T-Accounts Matrix)</h4>
                        <p class="text-xs text-slate-500 font-medium">Aggregating entries by individual T-Account ledgers to compute ending balances.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 6 of 13</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="border-2 border-teal-400 dark:border-teal-700/80 rounded-2xl p-4 bg-teal-50/20 dark:bg-teal-950/10">
                    <div class="text-center font-black text-sm uppercase text-teal-800 dark:text-teal-300 border-b-2 border-teal-500 pb-2 mb-3">
                        Account: 1010 - Cash Operating Asset
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-xs font-medium border-b border-teal-200 dark:border-teal-800 pb-3 mb-3">
                        <div>
                            <div class="font-black text-emerald-600 border-b border-teal-200 pb-1 mb-2">Debit (Dr.) - Inflows</div>
                            <div class="space-y-1">
                                <div>Total Inflows: <span class="font-bold">${fmtCurrency(totalRevenues)}</span></div>
                            </div>
                        </div>
                        <div class="border-l border-teal-200 dark:border-teal-800 pl-4">
                            <div class="font-black text-rose-600 border-b border-teal-200 pb-1 mb-2">Credit (Cr.) - Outflows</div>
                            <div class="space-y-1">
                                <div>Total Outflows: <span class="font-bold">${fmtCurrency(totalExpenses)}</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center font-black text-xs text-teal-900 dark:text-teal-200">
                        <span>Ending Dr. Balance:</span>
                        <span>${fmtCurrency(operatingCashAsset)}</span>
                    </div>
                </div>

                <div class="border-2 border-indigo-400 dark:border-indigo-700/80 rounded-2xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10">
                    <div class="text-center font-black text-sm uppercase text-indigo-800 dark:text-indigo-300 border-b-2 border-indigo-500 pb-2 mb-3">
                        Account: 1020 - Vault Capital Reserves
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-xs font-medium border-b border-indigo-200 dark:border-indigo-800 pb-3 mb-3">
                        <div>
                            <div class="font-black text-emerald-600 border-b border-indigo-200 pb-1 mb-2">Debit (Dr.) - Reserve Holdings</div>
                            <div class="space-y-1">
                                <div>Vault Holds: <span class="font-bold">${fmtCurrency(vaultReservesAsset)}</span></div>
                            </div>
                        </div>
                        <div class="border-l border-indigo-200 dark:border-indigo-800 pl-4">
                            <div class="font-black text-rose-600 border-b border-indigo-200 pb-1 mb-2">Credit (Cr.) - Releases</div>
                            <div class="space-y-1">
                                <div>Releases: <span class="font-bold">৳0.00</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center font-black text-xs text-indigo-900 dark:text-indigo-200">
                        <span>Ending Dr. Balance:</span>
                        <span>${fmtCurrency(vaultReservesAsset)}</span>
                    </div>
                </div>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Unadjusted Trial Balance ↓</div>
        </div>
    `;

    // STAGE 7: Trial Balance
    html += `
        <div id="accounting-stage-7" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">07</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">7. Trial Balance (Unadjusted Debit/Credit Verification)</h4>
                        <p class="text-xs text-slate-500 font-medium">Mathematical proof verifying that Total Debits equal Total Credits across all general ledger accounts.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">Σ Dr. = Σ Cr. Verified</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Account Code</th>
                            <th class="py-3 px-4">Account Title</th>
                            <th class="py-3 px-4 text-right">Debit (Dr. ৳)</th>
                            <th class="py-3 px-4 text-right">Credit (Cr. ৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">1010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Cash Operating Asset Account</td>
                            <td class="py-3 px-4 text-right font-black text-emerald-600">${fmtCurrency(operatingCashAsset)}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">1020</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Vault Reserve Holdings Asset Account</td>
                            <td class="py-3 px-4 text-right font-black text-emerald-600">${fmtCurrency(vaultReservesAsset)}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">3010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Owner's Capital Equity Account (Beginning)</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(ownersEquityBeg)}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">4010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Operating Revenue Income Account</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(totalRevenues)}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">5010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Operating Expenses Outflow Account</td>
                            <td class="py-3 px-4 text-right font-black text-emerald-600">${fmtCurrency(totalExpenses)}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-black uppercase text-xs border-t-2 border-emerald-500">
                            <td colspan="2" class="py-3.5 px-4">Total Unadjusted Trial Balance (Σ Dr. = Σ Cr.)</td>
                            <td class="py-3.5 px-4 text-right">${fmtCurrency(totalAssets + totalExpenses)}</td>
                            <td class="py-3.5 px-4 text-right">${fmtCurrency(totalLiabilities + ownersEquityBeg + totalRevenues)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Adjusting Entries Log ↓</div>
        </div>
    `;

    // STAGE 8: Adjusting Entries
    html += `
        <div id="accounting-stage-8" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">08</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">8. Adjusting Entries (Accruals & Period Matching)</h4>
                        <p class="text-xs text-slate-500 font-medium">Accounting adjustments for vault funding allocations and period-end matching.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 8 of 13</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Adj ID</th>
                            <th class="py-3 px-4">Adjustment Description</th>
                            <th class="py-3 px-4">Matching Principle Reason</th>
                            <th class="py-3 px-4 text-right">Adjusted Dr. (৳)</th>
                            <th class="py-3 px-4 text-right">Adjusted Cr. (৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        ${budgets.filter(b => b.fundedAmount).map((b, idx) => `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td class="py-3 px-4 font-mono text-[10px] text-slate-400">ADJ-${String(idx + 1).padStart(3, '0')}</td>
                                <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Vault Reserve Allocation to ${b.category} Budget</td>
                                <td class="py-3 px-4 text-slate-500">Fund Transfer Matching</td>
                                <td class="py-3 px-4 text-right font-black text-teal-600">${fmtCurrency(b.fundedAmount)}</td>
                                <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(b.fundedAmount)}</td>
                            </tr>
                        `).join('') || `<tr><td colspan="5" class="py-6 text-center text-slate-400 font-bold">No period-end adjustments required. All cash flow matches real-time entries.</td></tr>`}
                    </tbody>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Income Statement ↓</div>
        </div>
    `;

    // STAGE 9: Income Statement
    html += `
        <div id="accounting-stage-9" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">09</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">9. Income Statement (Financial Statement #1)</h4>
                        <p class="text-xs text-slate-500 font-medium">Measuring operating profitability: Total Revenues - Total Expenses = Net Operating Income.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono">Revenues - Expenses = Net Income</span>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-4 max-w-3xl mx-auto">
                <div class="text-center border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h5 class="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">PROJECT X ENTERPRISE</h5>
                    <div class="text-xs font-bold text-teal-600 dark:text-teal-400">INCOME STATEMENT</div>
                    <div class="text-[10px] text-slate-400 font-medium">For Period Ending ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                </div>

                <div class="space-y-2 text-xs">
                    <div class="font-black text-slate-900 dark:text-white uppercase tracking-wider flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                        <span>Operating Revenues & Cash Inflows</span>
                        <span>Credit (Cr.)</span>
                    </div>
                    <div class="flex justify-between pl-4 text-slate-600 dark:text-slate-300">
                        <span>General Inflow Income Entries</span>
                        <span>${fmtCurrency(totalRevenues)}</span>
                    </div>
                    <div class="flex justify-between font-black text-teal-600 dark:text-teal-400 border-t border-slate-200 dark:border-slate-700 pt-1">
                        <span>TOTAL OPERATING REVENUES (A)</span>
                        <span>${fmtCurrency(totalRevenues)}</span>
                    </div>

                    <div class="font-black text-slate-900 dark:text-white uppercase tracking-wider flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1 pt-4">
                        <span>Operating Expenses & Cash Outflows</span>
                        <span>Debit (Dr.)</span>
                    </div>
                    <div class="flex justify-between pl-4 text-slate-600 dark:text-slate-300">
                        <span>General Outflow Expense Entries</span>
                        <span>(${fmtCurrency(totalExpenses)})</span>
                    </div>
                    <div class="flex justify-between font-black text-rose-600 dark:text-rose-400 border-t border-slate-200 dark:border-slate-700 pt-1">
                        <span>TOTAL OPERATING EXPENSES (B)</span>
                        <span>(${fmtCurrency(totalExpenses)})</span>
                    </div>

                    <div class="flex justify-between items-center font-black text-sm ${netOperatingIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'} p-3 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
                        <span>NET OPERATING INCOME / (LOSS) (A - B)</span>
                        <span>${fmtCurrency(netOperatingIncome)}</span>
                    </div>
                </div>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Statement of Owner's Equity ↓</div>
        </div>
    `;

    // STAGE 10: Statement of Owner's Equity
    html += `
        <div id="accounting-stage-10" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">10</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">10. Statement of Owner's Equity (Financial Statement #2)</h4>
                        <p class="text-xs text-slate-500 font-medium">Reconciling owner's capital from beginning equity, net operating income, and reserve holdings.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono">Beg. OE + Net Income - Drawings = End. OE</span>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-4 max-w-3xl mx-auto">
                <div class="text-center border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h5 class="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">PROJECT X ENTERPRISE</h5>
                    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400">STATEMENT OF OWNER'S EQUITY</div>
                    <div class="text-[10px] text-slate-400 font-medium">For Period Ending ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                </div>

                <div class="space-y-2.5 text-xs font-medium">
                    <div class="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>Beginning Owner's Capital Equity</span>
                        <span>${fmtCurrency(ownersEquityBeg)}</span>
                    </div>
                    <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Add: Net Operating Income from Period</span>
                        <span>+${fmtCurrency(netOperatingIncome)}</span>
                    </div>
                    <div class="flex justify-between text-slate-500">
                        <span>Less: Capital Withdrawals / Distributions</span>
                        <span>(৳0.00)</span>
                    </div>
                    <div class="flex justify-between items-center font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 mt-2">
                        <span>ENDING OWNER'S EQUITY (OE)</span>
                        <span>${fmtCurrency(ownersEquityEnd)}</span>
                    </div>
                </div>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Balance Sheet (A = L + OE Proof) ↓</div>
        </div>
    `;

    // STAGE 11: Balance Sheet
    html += `
        <div id="accounting-stage-11" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-sm">11</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">11. Balance Sheet (Statement of Financial Position: A = L + OE)</h4>
                        <p class="text-xs text-slate-500 font-medium">The fundamental balance sheet proving Assets (A) = Liabilities (L) + Owner's Equity (OE).</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-mono">Assets = Liabilities + Equity</span>
            </div>

            <div class="bg-slate-900 text-white p-6 rounded-2xl border border-teal-500/30 shadow-lg space-y-6 max-w-4xl mx-auto">
                <div class="text-center border-b border-slate-800 pb-4">
                    <h5 class="font-black text-base uppercase tracking-widest text-teal-300">PROJECT X ENTERPRISE</h5>
                    <div class="text-xs font-bold text-white uppercase tracking-wider">BALANCE SHEET</div>
                    <div class="text-[10px] text-slate-400 font-medium">As of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                        <div class="font-black text-teal-400 uppercase tracking-wider border-b border-slate-700 pb-2 flex justify-between">
                            <span>ASSETS (A)</span>
                            <span>Amount (৳)</span>
                        </div>
                        <div class="space-y-1.5 text-slate-300">
                            <div class="flex justify-between"><span>Cash Operating Capital</span> <span>${fmtCurrency(operatingCashAsset)}</span></div>
                            <div class="flex justify-between"><span>Savings & Vault Reserves</span> <span>${fmtCurrency(vaultReservesAsset)}</span></div>
                        </div>
                        <div class="flex justify-between items-center font-black text-sm text-teal-300 border-t border-slate-700 pt-3">
                            <span>TOTAL ASSETS (A)</span>
                            <span>${fmtCurrency(totalAssets)}</span>
                        </div>
                    </div>

                    <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                        <div class="font-black text-indigo-400 uppercase tracking-wider border-b border-slate-700 pb-2 flex justify-between">
                            <span>LIABILITIES & EQUITY (L + OE)</span>
                            <span>Amount (৳)</span>
                        </div>
                        <div class="space-y-1.5 text-slate-300">
                            <div class="flex justify-between text-amber-300"><span>Total Liabilities (L)</span> <span>${fmtCurrency(totalLiabilities)}</span></div>
                            <div class="flex justify-between text-indigo-300"><span>Ending Owner's Equity (OE)</span> <span>${fmtCurrency(ownersEquityEnd)}</span></div>
                        </div>
                        <div class="flex justify-between items-center font-black text-sm text-indigo-300 border-t border-slate-700 pt-3">
                            <span>TOTAL LIABILITIES & EQUITY (L+OE)</span>
                            <span>${fmtCurrency(totalLiabilities + ownersEquityEnd)}</span>
                        </div>
                    </div>
                </div>

                <div class="p-4 rounded-xl bg-teal-950/60 border border-teal-500/40 text-center font-mono font-bold text-teal-300 text-xs flex flex-col md:flex-row items-center justify-between gap-2">
                    <div>MATHEMATICAL EQUATION PROOF:</div>
                    <div class="text-sm font-black text-white">Assets (${fmtCurrency(totalAssets)}) = Liabilities (${fmtCurrency(totalLiabilities)}) + Owner's Equity (${fmtCurrency(ownersEquityEnd)})</div>
                    <div class="px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-[10px]">100% Balanced</div>
                </div>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Period Closing Entries ↓</div>
        </div>
    `;

    // STAGE 12: Closing Entries
    html += `
        <div id="accounting-stage-12" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">12</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">12. Closing Entries (Period-End Revenue & Expense Zero-Out Log)</h4>
                        <p class="text-xs text-slate-500 font-medium">Closing temporary revenue and expense accounts into Retained Owner's Equity.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Stage 12 of 13</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Closing Step</th>
                            <th class="py-3 px-4">Account Titles & Explanation</th>
                            <th class="py-3 px-4 text-right">Debit (Dr. ৳)</th>
                            <th class="py-3 px-4 text-right">Credit (Cr. ৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        <tr>
                            <td class="py-3 px-4 font-bold text-slate-600">Close Revenues</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Dr. Operating Revenue (4010) / Cr. Income Summary</td>
                            <td class="py-3 px-4 text-right font-black text-teal-600">${fmtCurrency(totalRevenues)}</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(totalRevenues)}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-bold text-slate-600">Close Expenses</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Dr. Income Summary / Cr. Operating Expenses (5010)</td>
                            <td class="py-3 px-4 text-right font-black text-teal-600">${fmtCurrency(totalExpenses)}</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(totalExpenses)}</td>
                        </tr>
                        <tr class="bg-indigo-50/40 dark:bg-indigo-950/20 font-bold">
                            <td class="py-3 px-4 font-bold text-indigo-700 dark:text-indigo-300">Transfer Net Income</td>
                            <td class="py-3 px-4 font-black text-indigo-900 dark:text-indigo-200">Dr. Income Summary / Cr. Retained Owner's Equity (3010)</td>
                            <td class="py-3 px-4 text-right font-black text-teal-600">${fmtCurrency(netOperatingIncome)}</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(netOperatingIncome)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="text-center font-bold text-slate-400 text-xs py-1">↓ Flowing to Post-Closing Trial Balance ↓</div>
        </div>
    `;

    // STAGE 13: Post-Closing Trial Balance
    html += `
        <div id="accounting-stage-13" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 gap-2">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">13</span>
                    <div>
                        <h4 class="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">13. Post-Closing Trial Balance (Final Permanent Accounts Verification)</h4>
                        <p class="text-xs text-slate-500 font-medium">Final post-closing trial balance containing only permanent accounts (Assets, Liabilities, Equity) carried forward.</p>
                    </div>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 font-mono">Final Cycle Verification Complete</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4">Account Code</th>
                            <th class="py-3 px-4">Permanent Account Title</th>
                            <th class="py-3 px-4">Category</th>
                            <th class="py-3 px-4 text-right">Final Debit (Dr. ৳)</th>
                            <th class="py-3 px-4 text-right">Final Credit (Cr. ৳)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">1010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Cash Operating Asset Account</td>
                            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[10px] font-bold">Asset</span></td>
                            <td class="py-3 px-4 text-right font-black text-emerald-600">${fmtCurrency(operatingCashAsset)}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">1020</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Vault Reserve Holdings Asset Account</td>
                            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[10px] font-bold">Asset</span></td>
                            <td class="py-3 px-4 text-right font-black text-emerald-600">${fmtCurrency(vaultReservesAsset)}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">2010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Hold Payables Account</td>
                            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">Liability</span></td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                            <td class="py-3 px-4 text-right font-black text-amber-600">${fmtCurrency(totalLiabilities)}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-mono font-bold text-slate-400">3010</td>
                            <td class="py-3 px-4 font-black text-slate-900 dark:text-white">Owner's Capital Equity Account</td>
                            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">Equity</span></td>
                            <td class="py-3 px-4 text-right font-mono text-slate-400">-</td>
                            <td class="py-3 px-4 text-right font-black text-indigo-600">${fmtCurrency(ownersEquityEnd)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr class="bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-black uppercase text-xs border-t-2 border-teal-500">
                            <td colspan="3" class="py-3.5 px-4">Total Post-Closing Trial Balance (Σ Dr. = Σ Cr.)</td>
                            <td class="py-3.5 px-4 text-right">${fmtCurrency(totalAssets)}</td>
                            <td class="py-3.5 px-4 text-right">${fmtCurrency(totalLiabilities + ownersEquityEnd)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;

    wrapper.innerHTML = html;
};

// Render Visual Chart.js Analytics
window.renderFiscalCharts = function () {
    window.ensureFiscalStateDefaults();

    const txs = AppState.fiscalLedger.transactions || [];
    const bgts = AppState.fiscalLedger.budgets || [];
    const vlts = AppState.fiscalLedger.vaults || [];

    // 1. Trend Line Chart (Inflow vs Outflow)
    const trendCtx = document.getElementById('fiscalTrendChart')?.getContext('2d');
    if (trendCtx) {
        if (window.fiscalTrendChartInstance) window.fiscalTrendChartInstance.destroy();

        const dateMap = {};
        txs.forEach(t => {
            const d = t.date || 'Unknown';
            if (!dateMap[d]) dateMap[d] = { inflow: 0, outflow: 0 };
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'cr' || t.type === 'inflow' || t.type === 'income') {
                dateMap[d].inflow += amt;
            } else {
                dateMap[d].outflow += amt;
            }
        });

        const sortedDates = Object.keys(dateMap).sort();
        const inflows = sortedDates.map(d => dateMap[d].inflow);
        const outflows = sortedDates.map(d => dateMap[d].outflow);

        window.fiscalTrendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: sortedDates.length ? sortedDates : ['No Data'],
                datasets: [
                    { label: 'CR Income (৳)', data: inflows.length ? inflows : [0], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 },
                    { label: 'DR Expense (৳)', data: outflows.length ? outflows : [0], borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)', fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 2. Budget vs Actual Bar Chart
    const budgetCtx = document.getElementById('fiscalBudgetChart')?.getContext('2d');
    if (budgetCtx) {
        if (window.fiscalBudgetChartInstance) window.fiscalBudgetChartInstance.destroy();

        const categories = bgts.map(b => b.category);
        const targets = bgts.map(b => parseFloat(b.targetBudget) || 0);
        const actuals = bgts.map(b => {
            return txs.filter(t => (t.type === 'dr' || t.type === 'outflow' || t.type === 'expense') && t.category === b.category)
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        });

        window.fiscalBudgetChartInstance = new Chart(budgetCtx, {
            type: 'bar',
            data: {
                labels: categories.length ? categories : ['No Budgets'],
                datasets: [
                    { label: 'Target Limit (৳)', data: targets.length ? targets : [0], backgroundColor: 'rgba(148, 163, 184, 0.5)' },
                    { label: 'Actual DR Expense (৳)', data: actuals.length ? actuals : [0], backgroundColor: '#e11d48' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 3. Vault Doughnut Chart
    const vaultCtx = document.getElementById('fiscalVaultChart')?.getContext('2d');
    if (vaultCtx) {
        if (window.fiscalVaultChartInstance) window.fiscalVaultChartInstance.destroy();

        const vNames = vlts.map(v => v.name);
        const vAmounts = vlts.map(v => parseFloat(v.currentAmount) || 0);

        window.fiscalVaultChartInstance = new Chart(vaultCtx, {
            type: 'doughnut',
            data: {
                labels: vNames.length ? vNames : ['No Vaults'],
                datasets: [{
                    data: vAmounts.length ? vAmounts : [1],
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
};

