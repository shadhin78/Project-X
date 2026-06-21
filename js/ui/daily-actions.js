// js/ui/daily-actions.js
// Verbatim extraction of Daily Actions and Tracker UI Logic from index.html

window.renderDailyTracker = function () {
    const todayStr = formatDate(new Date());
    const todayTask = tasks.find(t => t.date === todayStr);
    let c = 0; window.customActions.forEach(a => { if (todayTask && todayTask[a.id]) c++; });
    const dailyPct = window.customActions.length > 0 ? Math.round((c / window.customActions.length) * 100) : 0;

    const bar = document.getElementById('daily-actions-progress');
    if (bar) {
        bar.style.width = dailyPct + '%'; safeSetText('daily-actions-percent', dailyPct + '%');
        let clr = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]';
        if (dailyPct >= 25) clr = 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]';
        if (dailyPct >= 50) clr = 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]';
        if (dailyPct >= 75) clr = 'bg-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.8)]';
        if (dailyPct === 100) clr = 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]';
        bar.className = `h-full rounded-full transition-all duration-500 ease-out ${clr}`;
    }

    const gridContainer = document.getElementById('daily-actions-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const getSVG = (idOrIcon, title = "") => {
        const term = (idOrIcon || title || "").toLowerCase();
        if (term.includes('professional') || term.includes('briefcase') || term.includes('job')) {
            return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>`;
        }
        if (term.includes('academic') || term.includes('study') || term.includes('book') || term.includes('education') || term.includes('grad') || term.includes('school') || term.includes('class')) {
            return `<path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6M12 20a11.95 11.95 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479M12 20a11.95 11.95 0 006.824-2.998 12.083 12.083 0 00-.665-6.479"></path>`;
        }
        if (term.includes('gym') || term.includes('health') || term.includes('workout') || term.includes('fitness') || term.includes('sport') || term.includes('run')) {
            return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"></path>`;
        }
        if (term.includes('freelance') || term.includes('work') || term.includes('code') || term.includes('dev') || term.includes('write')) {
            return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;
        }
        return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>`;
    };

    const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.order ?? 999) - (b.order ?? 999));
    sortedActions.forEach(cfg => {
        const state = todayTask ? todayTask[cfg.id] : false;
        const cMap = twColors[cfg.color];

        const cardHtml = `
        <div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm flex flex-col transition-all duration-300 min-h-[300px] border-2 ${state === true ? cMap.border + ' shadow-lg' : (state === false ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-200 dark:border-slate-700')}">
            <div class="flex justify-between items-start mb-3 sm:mb-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="p-2 md:p-3 rounded-lg sm:rounded-xl md:rounded-2xl border ${cMap.iconBg} ${cMap.text} ${cMap.borderLt}">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${getSVG(cfg.icon, cfg.title)}</svg>
                    </div>
                    <div>
                        <h3 class="font-black text-xs sm:text-sm md:text-base tracking-tight">${cfg.title}</h3>
                        <p class="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">${cfg.desc}</p>
                    </div>
                </div>
                <button onclick="openModal('analytics-modal', '${cfg.id}')" class="group flex items-center justify-center p-2 md:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"><svg class="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover:${cMap.iconColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></button>
            </div>
            <div class="flex gap-2 mb-3 sm:mb-4 p-1 md:p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <button class="flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-90 ${state === true ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.5)] scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}" onclick="setDailyState('${cfg.id}', true)">YES</button>
                <button class="flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-90 ${state === false ? 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)] scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}" onclick="setDailyState('${cfg.id}', false)">NO</button>
            </div>
            <div id="dt-log-${cfg.id}"></div>
        </div>`;
        gridContainer.innerHTML += cardHtml;
    });

    // Render compact version for Dashboard
    const dashCompactContainer = document.getElementById('dashboard-daily-actions-compact');
    if (dashCompactContainer) {
        dashCompactContainer.innerHTML = '';
        
        if (sortedActions.length <= 4) {
            const rows = Math.ceil(sortedActions.length / 2) || 1;
            dashCompactContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            dashCompactContainer.style.gridAutoRows = 'unset';
            dashCompactContainer.style.height = '100%';
        } else {
            dashCompactContainer.style.gridTemplateRows = 'unset';
            dashCompactContainer.style.gridAutoRows = 'minmax(38px, auto)';
            dashCompactContainer.style.height = 'auto';
        }
        
        sortedActions.forEach(cfg => {
            const state = todayTask ? todayTask[cfg.id] : false;
            const cMap = twColors[cfg.color];
            const isActive = state === true;
            
            const activeStyle = `background-color: ${cMap.hex}; border-color: ${cMap.hex}; color: white; box-shadow: 0 4px 12px ${cMap.hex}33;`;
            const cardClass = isActive
                ? `text-white border-transparent`
                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-650 dark:text-slate-450 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-900/60';
            
            const compactHtml = `
            <button onclick="window.setDailyState('${cfg.id}', ${!isActive})"
                    class="flex items-center justify-between p-2 md:p-2.5 rounded-xl border font-black transition-all duration-300 active:scale-95 text-left w-full gap-1.5 h-full ${cardClass}"
                    style="${isActive ? activeStyle : ''}">
                <div class="flex items-center space-x-1.5 min-w-0">
                    <div class="p-1 rounded-lg ${isActive ? 'bg-white/20 text-white' : cMap.iconBg + ' ' + cMap.text + ' ' + cMap.borderLt + ' border'} shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">${getSVG(cfg.icon, cfg.title)}</svg>
                    </div>
                    <div class="min-w-0 leading-tight">
                        <span class="block text-[10px] md:text-xs font-black truncate">${cfg.title}</span>
                        <span class="block text-[7px] uppercase tracking-wider font-bold opacity-75 truncate">${isActive ? 'YES' : 'NO'}</span>
                    </div>
                </div>
                <div class="shrink-0">
                    ${isActive 
                        ? `<span class="flex h-4 w-4 rounded-full bg-white text-emerald-500 items-center justify-center shadow-sm text-[8px] font-black">✓</span>`
                        : `<span class="flex h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 items-center justify-center text-[7px] font-black">✕</span>`
                    }
                </div>
            </button>`;
            dashCompactContainer.innerHTML += compactHtml;
        });
    }

    const dashPercent = document.getElementById('dashboard-daily-actions-percent');
    const dashBar = document.getElementById('dashboard-daily-actions-progress');
    if (dashPercent && dashBar) {
        dashPercent.textContent = dailyPct + '%';
        dashBar.style.width = dailyPct + '%';
        let clr = 'bg-red-500';
        if (dailyPct >= 25) clr = 'bg-orange-500';
        if (dailyPct >= 50) clr = 'bg-yellow-400';
        if (dailyPct >= 75) clr = 'bg-lime-500';
        if (dailyPct === 100) clr = 'bg-green-500';
        dashBar.className = `h-full rounded-full transition-all duration-500 ease-out ${clr}`;
    }
};

window.renderDailyLogs = function () {
    const todayStr = formatDate(new Date());
    let idx = tasks.findIndex(t => t.date === todayStr);
    if (idx === -1) idx = tasks.length - 1;

    const cutoffDate = new Date(PLAN_START_DATE);
    cutoffDate.setHours(0, 0, 0, 0);

    const fill = (elId, key) => {
        const el = document.getElementById(elId); if (!el) return;
        let html = '<div class="grid grid-cols-4 gap-1.5 md:gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-1 content-start mt-2" style="max-height: 180px; min-height: 150px;">';
        for (let i = idx; i >= 0; i--) {
            const t = tasks[i];
            const tDate = getTaskDate(t);
            if (tDate < cutoffDate) break; // Stop rendering if before PLAN_START_DATE

            const val = t[key];
            const bgClass = val ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] border-transparent' : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-transparent';
            html += `<button onclick="toggleModalDay(${t.id}, '${key}')" class="flex flex-col items-center justify-center p-1.5 md:p-2 rounded-xl border active:scale-90 transition-all duration-300 hover:scale-105 ${bgClass} w-full aspect-square focus:outline-none"><span class="text-[7px] md:text-[8px] uppercase font-black opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-xs md:text-sm font-black leading-none">${t.date.split(' ')[1]}</span></button>`;
        }
        html += '</div>'; el.innerHTML = html; el.className = "flex flex-col flex-1 min-h-0 pt-2 border-t border-slate-100 dark:border-slate-700/60 mt-2";
    };
    const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    sortedActions.forEach(a => fill(`dt-log-${a.id}`, a.id));
};

window.setDailyState = function (type, state) {
    const todayStr = formatDate(new Date());
    const idx = tasks.findIndex(t => t.date === todayStr);

    if (idx > -1) {
        tasks[idx][type] = state;
        saveToCloud();
        renderDailyTracker();
        renderDailyLogs();

        const dbModal = document.getElementById('daily-actions-db-modal');
        if (dbModal && !dbModal.classList.contains('hidden')) window.openDailyActionsDBModal();

        if (window.chartDebounce) clearTimeout(window.chartDebounce);
        window.chartDebounce = setTimeout(() => {
            requestAnimationFrame(renderTrendCharts);
        }, 500);
    }
};

window.populateAnalyticsModal = function (typeKey) {
    window.currentAnalyticsAction = typeKey;
    const cfgAct = window.customActions.find(a => a.id === typeKey);
    if (!cfgAct) return;
    const cMap = twColors[cfgAct.color];

    safeSetText('am-title', cfgAct.title + " Analytics");
    safeSetClass('am-icon-box', `p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-inner shrink-0 ${cMap.bgLt} ${cMap.text}`);

    const statBoxes = ['am-stat-box-1', 'am-stat-box-2', 'am-stat-box-3'];
    statBoxes.forEach(id => safeSetClass(id, `p-2.5 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-3xl border shadow-sm flex flex-col justify-center ${cMap.bgLt} ${cMap.borderLt}`));

    const statLabels = ['am-stat-label-1', 'am-stat-label-2', 'am-stat-label-3'];
    statLabels.forEach(id => safeSetClass(id, `block text-[7px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 md:mb-1.5 leading-tight ${cMap.text}`));

    const todayStr = formatDate(new Date());
    let idx = tasks.findIndex(t => t.date === todayStr); if (idx === -1) idx = tasks.length - 1;

    let total = 0;
    let possibleDays = 0;
    tasks.forEach((t, i) => {
        if (i <= idx && getTaskDate(t) >= PLAN_START_DATE) {
            possibleDays++;
            if (t[typeKey]) total++;
        }
    });

    let streak = 0;
    for (let i = idx; i >= 0; i--) {
        if (getTaskDate(tasks[i]) < PLAN_START_DATE) break;
        if (tasks[i][typeKey]) streak++;
        else break;
    }

    safeSetText('am-total', total); safeSetText('am-streak', streak + ' Days');
    const pct = possibleDays > 0 ? Math.round((total / possibleDays) * 100) : 0;
    safeSetText('am-percent', pct + '%');
    const valClass = `text-base sm:text-2xl md:text-5xl font-black drop-shadow-sm mt-0.5 sm:mt-1 ${cMap.text}`;
    safeSetClass('am-total', valClass);
    safeSetClass('am-streak', valClass);
    safeSetClass('am-percent', valClass);

    const sYear = globalStartDate ? globalStartDate.getFullYear() : PLAN_START_DATE.getFullYear();
    const sMonth = globalStartDate ? globalStartDate.getMonth() : PLAN_START_DATE.getMonth();
    const eYear = globalEndDate ? globalEndDate.getFullYear() : PLAN_END_DATE.getFullYear();
    const eMonth = globalEndDate ? globalEndDate.getMonth() : PLAN_END_DATE.getMonth();
    const totalMonths = Math.max(1, (eYear - sYear) * 12 + (eMonth - sMonth) + 1);

    const months = [];
    for (let i = 0; i < totalMonths; i++) {
        const d = new Date(sYear, sMonth + i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    let data = Array(totalMonths).fill(0);
    tasks.forEach(t => {
        const taskDate = getTaskDate(t);
        const tYear = taskDate.getFullYear();
        const tMonth = taskDate.getMonth();
        const mIdx = (tYear - sYear) * 12 + (tMonth - sMonth);
        if (mIdx >= 0 && mIdx < totalMonths && t[typeKey]) data[mIdx]++;
    });

    const canvas = document.getElementById('masterLineChart');
    if (canvas) {
        if (masterLineChart) {
            masterLineChart.data.datasets[0].data = data;
            masterLineChart.data.datasets[0].borderColor = cMap.hex;
            masterLineChart.data.datasets[0].backgroundColor = cMap.hex + '25';
            masterLineChart.data.datasets[0].pointBackgroundColor = cMap.hex;
            masterLineChart.update('none');
        } else {
            masterLineChart = new Chart(canvas.getContext('2d'), {
                type: 'line', data: { labels: months, datasets: [{ data, borderColor: cMap.hex, tension: 0.4, fill: true, backgroundColor: cMap.hex + '25', borderWidth: window.innerWidth < 640 ? 2 : 3, pointBackgroundColor: cMap.hex, pointRadius: window.innerWidth < 640 ? 0 : 3, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 10 } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.08)', drawBorder: false, borderDash: [5, 5] }, ticks: { font: { size: window.innerWidth < 640 ? 8 : 10 }, color: '#64748b' } }, x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: window.innerWidth < 640 ? 8 : 10 }, color: '#64748b', maxTicksLimit: window.innerWidth < 640 ? 6 : 12 } } } }
            });
        }
    }

    const grid = document.getElementById('am-grid');
    if (grid) {
        let gHtml = '';
        for (let i = idx; i >= Math.max(0, idx - 179); i--) {
            const t = tasks[i];
            if (getTaskDate(t) < PLAN_START_DATE) break;
            const done = t[typeKey];
            const btnClass = done ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)] border-transparent' : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-transparent';
            gHtml += `<button onclick="toggleModalDay(${t.id}, '${typeKey}')" class="flex flex-col items-center justify-center p-1 sm:p-1.5 md:p-2 rounded-lg sm:rounded-xl ${btnClass} transition-all duration-300 w-full aspect-square shrink-0 hover:scale-105 active:scale-90 focus:outline-none snap-start"><span class="text-[6px] sm:text-[7px] md:text-[9px] uppercase font-black opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-[9px] sm:text-[11px] md:text-sm font-black leading-none">${t.date.split(' ')[1]}</span></button>`;
        }
        grid.innerHTML = gHtml;
    }
};
