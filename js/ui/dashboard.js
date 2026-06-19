        function renderUI() {
            const loader = document.getElementById('loading-message');
            if (loader) loader.classList.add('hidden');
            const dashContent = document.getElementById('dashboard-content');
            if (dashContent) dashContent.classList.remove('hidden');

            safeSetText('dash-top-tag', window.dashboardConfig.topTag);
            safeSetText('dash-top-tag-mobile', window.dashboardConfig.topTag);
            safeSetText('dash-main-title', window.dashboardConfig.mainTitle);
            safeSetText('dash-main-title-mobile', window.dashboardConfig.mainTitle);
            safeSetText('dash-sub-title', window.dashboardConfig.subTitle);
            safeSetText('dash-sub-title-mobile', window.dashboardConfig.subTitle);

            const trendsStartDateInput = document.getElementById('trends-start-date');
            if (trendsStartDateInput && window.dashboardConfig && window.dashboardConfig.trendStartDate) {
                trendsStartDateInput.value = window.dashboardConfig.trendStartDate;
            }
            document.title = `${window.dashboardConfig.topTag} - ${window.dashboardConfig.mainTitle}`;

            const tagInput = document.getElementById('edit-header-tag');
            if (tagInput) tagInput.value = window.dashboardConfig.topTag || '';
            const titleInput = document.getElementById('edit-header-title');
            if (titleInput) titleInput.value = window.dashboardConfig.mainTitle || '';
            const subInput = document.getElementById('edit-header-sub');
            if (subInput) subInput.value = window.dashboardConfig.subTitle || '';

            // Validate currentFilter to prevent cross-device deletion crashes
            if (currentFilter !== 'All') {
                const isValidProg = window.tracks.some(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === currentFilter));
                const isValidSub = window.getAllSubjects().some(s => s.subject === currentFilter);
                if (!isValidProg && !isValidSub) window.currentFilter = 'All';
            }

            updateGlobalDates();
            setupFocusTodayButton();
            updateCountdown();
            updateSuccessScore();
            renderSubjectNavigation();
            renderTaskList();
            renderChart();
            updateMetrics();
            window.updateTrendsBar();
            renderDailyTracker();
            renderDailyLogs();
            renderTrendCharts();
            window.renderResults();
            window.renderWeeklyTargets();
            if (window.renderDashboardWeeklyChecklist) window.renderDashboardWeeklyChecklist();
            if (window.renderOutcomeProgramToggles) window.renderOutcomeProgramToggles();
            if (window.renderSchedulePage) window.renderSchedulePage();

            // Dynamic Form & Manage UI Syncs
            window.populateTrackDropdowns();
            window.updateManageDropdown();
            window.renderPassConfig();
            window.togglePaceBundleType();
            const activeSysTab = document.querySelector('[id^="sys-tab-"].bg-blue-600');
            if (activeSysTab) {
                const tabName = activeSysTab.id.replace('sys-tab-', '');
                if (tabName === 'chapter') window.updateChProgDropdown();
                if (tabName === 'subject') window.updateSubProgDropdown();
                if (tabName === 'priority') {
                    const activeEl = document.activeElement;
                    const isFocusInPriority = activeEl && document.getElementById('sys-content-priority')?.contains(activeEl);
                    if (!isFocusInPriority) {
                        window.renderPriorityConfig();
                    }
                }
            }
            if (document.getElementById('revision-manage-modal') && !document.getElementById('revision-manage-modal').classList.contains('hidden')) {
                window.renderRevisionModalContent();
            }
            if (document.getElementById('analytics-modal') && !document.getElementById('analytics-modal').classList.contains('hidden') && window.currentAnalyticsAction) {
                window.populateAnalyticsModal(window.currentAnalyticsAction);
            }
            if (document.getElementById('global-history-modal') && !document.getElementById('global-history-modal').classList.contains('hidden')) {
                window.renderGlobalHistoryContent();
            }
            if (document.getElementById('daily-actions-db-modal') && !document.getElementById('daily-actions-db-modal').classList.contains('hidden')) {
                window.openDailyActionsDBModal();
            }
            if (window.renderTimerPage) {
                window.renderTimerPage();
            }
        }


        function updateCountdown() {
            if (!globalStartDate || !globalEndDate) {
                safeSetHtml('countdown-timer', `<div class="text-center md:text-right"><span class="block text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Final Deadline</span><span class="text-slate-400 font-black text-sm sm:text-base md:text-base drop-shadow-sm">Not Set</span></div>`);
                safeSetHtml('time-gone-stats', `<div class="flex items-center space-x-2 md:space-x-3 justify-center md:justify-start"><div class="hidden md:flex p-2 md:p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-700/50"><svg class="w-4 h-4 md:w-5 md:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div class="text-center md:text-left"><span class="block text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Time Elapsed</span><span class="text-slate-400 font-black text-sm sm:text-base md:text-base">Not Set</span></div></div>`);
                return;
            }

            const today = new Date();
            const start = new Date(globalStartDate);
            const target = new Date(globalEndDate);

            const diffLeft = target - today;
            if (diffLeft > 0) {
                const daysLeft = Math.ceil(diffLeft / (1000 * 60 * 60 * 24));
                safeSetHtml('countdown-timer', `<div class="text-center md:text-right"><span class="block text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Final Deadline</span><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 font-black text-sm sm:text-base md:text-2xl drop-shadow-sm">${daysLeft} Days</span></div>`);
            } else { safeSetHtml('countdown-timer', `<div class="text-center md:text-right"><span class="text-green-500 font-black text-sm sm:text-base md:text-lg drop-shadow-sm">Goal Reached!</span></div>`); }

            const diffGone = today - start;
            const daysGone = Math.max(0, Math.floor(diffGone / (1000 * 60 * 60 * 24)));
            safeSetHtml('time-gone-stats', `<div class="flex items-center space-x-2 md:space-x-3 justify-center md:justify-start"><div class="hidden md:flex p-2 md:p-2.5 bg-red-100 dark:bg-red-500/20 rounded-lg md:rounded-xl border border-red-200 dark:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]"><svg class="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div class="text-center md:text-left"><span class="block text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Time Elapsed</span><span class="text-red-600 dark:text-red-400 font-black text-sm sm:text-base md:text-2xl drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]">${daysGone} Days</span></div></div>`);
        }

        function updateSuccessScore() {
            if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };
            let totalSubs = 0;
            let passedSubs = 0;

            window.tracks.map(t => t.id).forEach(track => {
                if (syllabusStructure[track]) {
                    syllabusStructure[track].forEach(s => {
                        totalSubs++;
                        if (window.passedItems.programs.includes(s.program) || window.passedItems.subjects.includes(s.subject)) {
                            passedSubs++;
                        }
                    });
                }
            });

            const pct = totalSubs > 0 ? Math.round((passedSubs / totalSubs) * 100) : 0;

            safeSetHtml('success-score-stats', `
                <div class="flex items-center space-x-2 md:space-x-3 justify-center md:justify-start">
                    <div class="hidden md:flex p-2 md:p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg md:rounded-xl border border-emerald-200 dark:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                        <svg class="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div class="text-center md:text-left">
                        <span class="block text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Success Score</span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-base md:text-2xl drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]">${pct}%</span>
                    </div>
                </div>
            `);

            if (pct === 100 && totalSubs > 0 && !window.hasShownCongrats) {
                window.hasShownCongrats = true;
                setTimeout(() => window.showCongratsModal(), 800);
            } else if (pct < 100) {
                window.hasShownCongrats = false;
            }
        }

        window.setFilter = function (val) { window.currentFilter = val; window.subjectDetailsState = {}; renderSubjectNavigation(); renderTaskList(); updateMetrics(); renderTrendCharts(); };

        window.setTrendFilter = function (f) {
            window.trendTimeFilter = f;
            renderTrendCharts();
            if (window.revisionTrendChartInstance) window.renderRevisionTrendChart();
            ['1Y', '2Y', '3Y', 'ALL'].forEach(id => {
                const btn = document.getElementById('tf-' + id);
                if (btn) {
                    if (id === f) {
                        btn.classList.add('bg-blue-600', 'text-white', 'shadow');
                        btn.classList.remove('text-slate-500', 'hover:bg-slate-300', 'dark:text-slate-400', 'dark:hover:bg-slate-600');
                    } else {
                        btn.classList.remove('bg-blue-600', 'text-white', 'shadow');
                        btn.classList.add('text-slate-500', 'hover:bg-slate-300', 'dark:text-slate-400', 'dark:hover:bg-slate-600');
                    }
                }
            });
        };

        function renderChart() {
            const canvas = document.getElementById('progressChart');
            if (!canvas) return;
            if (progressChart) progressChart.destroy();
            window.progressChart = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: { datasets: [{ data: [0, totalStaticChapters], backgroundColor: ['#3b82f6', 'rgba(148, 163, 184, 0.1)'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '82%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
            });
        }

        function renderTrendCharts() {
            // CLEANUP ORPHANED DATA
            let validProgs = window.getAllPrograms().map(p => p.name || p);
            Object.keys(window.latestChartStats.prog).forEach(k => { if (!validProgs.includes(k)) delete window.latestChartStats.prog[k]; });
            Object.keys(window.chartVisibility.prog).forEach(k => { if (!validProgs.includes(k)) delete window.chartVisibility.prog[k]; });

            let validSubs = window.getAllSubjects().map(s => s.subject);
            Object.keys(window.latestChartStats.subjects).forEach(k => { if (!validSubs.includes(k)) delete window.latestChartStats.subjects[k]; });
            Object.keys(window.chartVisibility.subjects).forEach(k => { if (!validSubs.includes(k)) delete window.chartVisibility.subjects[k]; });
            Object.keys(window.latestChartStats.revSubjects).forEach(k => { if (!validSubs.includes(k)) delete window.latestChartStats.revSubjects[k]; });
            Object.keys(window.chartVisibility.revSubjects).forEach(k => { if (!validSubs.includes(k)) delete window.chartVisibility.revSubjects[k]; });

            let validActs = window.customActions.map(a => a.id);
            Object.keys(window.latestChartStats.monthly).forEach(k => { if (!validActs.includes(k)) delete window.latestChartStats.monthly[k]; });
            Object.keys(window.latestChartStats.yearly).forEach(k => { if (!validActs.includes(k)) delete window.latestChartStats.yearly[k]; });
            Object.keys(window.chartVisibility.monthly).forEach(k => { if (!validActs.includes(k)) delete window.chartVisibility.monthly[k]; });
            Object.keys(window.chartVisibility.yearly).forEach(k => { if (!validActs.includes(k)) delete window.chartVisibility.yearly[k]; });

            const ctx1 = document.getElementById('mainChartPrograms');
            const ctx2 = document.getElementById('monthlyActionsChart');
            const ctxSub = document.getElementById('subjectTrendChart');

            let chartStart = new Date(PLAN_START_DATE.getTime());
            let chartEnd = new Date(PLAN_END_DATE.getTime());
            const todayObj = new Date();

            if (window.trendTimeFilter === '1Y') {
                chartEnd = new Date(chartStart);
                chartEnd.setFullYear(chartEnd.getFullYear() + 1);
                chartEnd.setMonth(chartEnd.getMonth() - 1);
            } else if (window.trendTimeFilter === '2Y') {
                chartEnd = new Date(chartStart);
                chartEnd.setFullYear(chartEnd.getFullYear() + 2);
                chartEnd.setMonth(chartEnd.getMonth() - 1);
            } else if (window.trendTimeFilter === '3Y') {
                chartEnd = new Date(chartStart);
                chartEnd.setFullYear(chartEnd.getFullYear() + 3);
                chartEnd.setMonth(chartEnd.getMonth() - 1);
            } else {
                chartStart = new Date(PLAN_START_DATE.getTime());
                chartEnd = new Date(todayObj.getTime());
                if (chartEnd < chartStart) {
                    chartEnd = new Date(chartStart.getTime());
                    chartEnd.setMonth(chartEnd.getMonth() + 1);
                }
            }

            const sYear = chartStart.getFullYear();
            const sMonth = chartStart.getMonth();
            const eYear = chartEnd.getFullYear();
            const eMonth = chartEnd.getMonth();
            const totalMonths = Math.max(1, (eYear - sYear) * 12 + (eMonth - sMonth) + 1);

            const months = [];
            for (let i = 0; i < totalMonths; i++) {
                const d = new Date(sYear, sMonth + i, 1);
                months.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            }

            let progCum = {};
            window.tracks.map(t => t.id).forEach(track => {
                if (window.customPrograms[track]) {
                    window.customPrograms[track].forEach(p => {
                        const pName = p.name || p;
                        progCum[pName] = Array(totalMonths).fill(0);
                        if (window.programVisibility && window.programVisibility[pName] !== undefined) {
                            window.chartVisibility.prog[pName] = window.programVisibility[pName];
                        } else if (window.chartVisibility.prog[pName] === undefined) {
                            window.chartVisibility.prog[pName] = true;
                        }
                    });
                }
            });

            let subData = {};
            window.getAllSubjects().forEach(s => {
                subData[s.subject] = Array(totalMonths).fill(0);
                if (window.chartVisibility.subjects[s.subject] === undefined) window.chartVisibility.subjects[s.subject] = true;
            });

            // Dynamically build arrays for Daily Actions
            let actDaily = {}; let actCum = {};
            window.customActions.forEach(a => {
                actDaily[a.id] = Array(31).fill(0);
                actCum[a.id] = Array(totalMonths).fill(0);
                if (window.chartVisibility.monthly[a.id] === undefined) window.chartVisibility.monthly[a.id] = true;
                if (window.chartVisibility.yearly[a.id] === undefined) window.chartVisibility.yearly[a.id] = true;
            });

            const currentMonth = todayObj.getMonth(); const currentDay = todayObj.getDate();
            const todayMidx = (todayObj.getFullYear() - sYear) * 12 + (todayObj.getMonth() - sMonth);
            const daysInMonth = new Date(todayObj.getFullYear(), currentMonth + 1, 0).getDate();
            let latestActiveMonth = -1;

            // 1. Scan completed chapters from tasks and weekly targets to get their actual completion date (earliest)
            const completedChaptersMap = new Map();

            // Scan all tasks (ignoring PLAN_START_DATE limit for completion trends)
            tasks.forEach(t => {
                const taskDate = getTaskDate(t);
                window.tracks.forEach(track => {
                    const key = track.id + 'Tasks';
                    if (t.type === 'study' && Array.isArray(t[key])) {
                        t[key].forEach(b => {
                            if (b.completed) {
                                const compDate = b.completedAt ? parseDateSafe(b.completedAt) : taskDate;
                                const uniqueKey = `${track.id}|${b.subject}|${b.chapter}`;
                                if (!completedChaptersMap.has(uniqueKey) || completedChaptersMap.get(uniqueKey) > compDate) {
                                    completedChaptersMap.set(uniqueKey, compDate);
                                }
                            }
                        });
                    }
                });
            });

            // Scan weekly targets database
            if (window.weeklyTargetsDatabase) {
                Object.keys(window.weeklyTargetsDatabase).forEach(weekKey => {
                    const targets = window.weeklyTargetsDatabase[weekKey] || [];
                    targets.forEach(t => {
                        if (t.completed) {
                            let compDate = t.completedAt ? parseDateSafe(t.completedAt) : null;
                            if (!compDate) {
                                const parts = weekKey.split(' - ');
                                if (parts[0]) compDate = parseDateSafe(parts[0]);
                            }
                            if (!compDate || isNaN(compDate.getTime())) {
                                compDate = new Date();
                            }
                            const uniqueKey = `${t.track}|${t.subject}|${t.chapter}`;
                            if (!completedChaptersMap.has(uniqueKey) || completedChaptersMap.get(uniqueKey) > compDate) {
                                completedChaptersMap.set(uniqueKey, compDate);
                            }
                        }
                    });
                });
            }

            // 2. Scan tasks for custom action calculations
            tasks.forEach(t => {
                const taskDate = getTaskDate(t);
                if (taskDate < PLAN_START_DATE) return; // Sync baseline start date!
                const tYear = taskDate.getFullYear();
                const tMonth = taskDate.getMonth();
                const rawMidx = (tYear - sYear) * 12 + (tMonth - sMonth);

                if (rawMidx < totalMonths) {
                    if (rawMidx >= 0) {
                        window.customActions.forEach(a => { if (t[a.id]) actCum[a.id][rawMidx]++; });
                    }
                }
                if (tYear === todayObj.getFullYear() && tMonth === currentMonth) {
                    const dIdx = taskDate.getDate() - 1;
                    window.customActions.forEach(a => { if (t[a.id]) actDaily[a.id][dIdx] = 1; });
                }
            });

            // 3. Populate subject and program completion trends
            completedChaptersMap.forEach((compDate, uniqueKey) => {
                const [trackId, subject, chapter] = uniqueKey.split('|');
                const cYear = compDate.getFullYear();
                const cMonth = compDate.getMonth();
                const cMidx = (cYear - sYear) * 12 + (cMonth - sMonth);

                if (cMidx < totalMonths) {
                    const mIdxStudy = cMidx < 0 ? 0 : cMidx;

                    if (syllabusStructure[trackId]) {
                        const sObj = syllabusStructure[trackId].find(s => s.subject === subject);
                        if (sObj && sObj.program && progCum[sObj.program]) {
                            progCum[sObj.program][mIdxStudy]++;
                        }
                    }
                    if (subData[subject]) {
                        subData[subject][mIdxStudy]++;
                    }
                    latestActiveMonth = Math.max(latestActiveMonth, mIdxStudy);
                }
            });

            let boundedToday = todayMidx >= totalMonths ? totalMonths - 1 : (todayMidx < 0 ? 0 : todayMidx);
            let boundedLatest = latestActiveMonth >= totalMonths ? totalMonths - 1 : latestActiveMonth;
            const cutoff = Math.max(boundedToday, boundedLatest, 0);

            // Program Trends
            Object.keys(progCum).forEach(p => {
                for (let i = 1; i <= cutoff; i++) progCum[p][i] += progCum[p][i - 1];
                let pTotal = 0;
                let pEffectiveTotal = 0;

                window.tracks.map(t => t.id).forEach(track => {
                    if (syllabusStructure[track]) {
                        syllabusStructure[track].forEach(s => {
                            if (s.program === p) {
                                pTotal += s.chapters;
                                if (window.lastSubjectStats && window.lastSubjectStats[s.subject]) {
                                    pEffectiveTotal += window.lastSubjectStats[s.subject].effectiveChapters;
                                }
                            }
                        });
                    }
                });

                for (let i = 0; i <= cutoff; i++) progCum[p][i] = pTotal > 0 ? Math.round((progCum[p][i] / pTotal) * 100) : 0;

                // Sync the latest month with the absolutely accurate effective completion (which includes individually passed subjects and programs)
                if (pTotal > 0) {
                    progCum[p][cutoff] = Math.max(progCum[p][cutoff], Math.round((pEffectiveTotal / pTotal) * 100));
                } else {
                    progCum[p][cutoff] = 0;
                }

                window.latestChartStats.prog[p] = progCum[p][cutoff] || 0;
                for (let i = cutoff + 1; i < totalMonths; i++) progCum[p][i] = null;
            });

            // Action Cum Trends
            window.customActions.forEach(a => {
                for (let i = 0; i <= cutoff; i++) {
                    let divisor;
                    if (i === todayMidx) { divisor = currentDay; }
                    else {
                        const mDate = new Date(sYear, sMonth + i + 1, 0);
                        divisor = mDate.getDate();
                    }
                    actCum[a.id][i] = Math.round((actCum[a.id][i] / divisor) * 100);
                }

                let runningTotal = 0;
                let validDaysCountThisMonth = 0;
                for (let i = 0; i < currentDay; i++) {
                    const dayDate = new Date(todayObj.getFullYear(), todayObj.getMonth(), i + 1);
                    dayDate.setHours(0, 0, 0, 0);
                    if (dayDate >= PLAN_START_DATE) {
                        validDaysCountThisMonth++;
                        runningTotal += actDaily[a.id][i] || 0;
                        actDaily[a.id][i] = Math.round((runningTotal / validDaysCountThisMonth) * 100);
                    } else {
                        actDaily[a.id][i] = null;
                    }
                }

                for (let i = currentDay; i < daysInMonth; i++) actDaily[a.id][i] = null;

                window.latestChartStats.monthly[a.id] = actDaily[a.id][currentDay - 1] || 0;
                window.latestChartStats.yearly[a.id] = actCum[a.id][cutoff] || 0;
            });

            Object.keys(subData).forEach(k => {
                let sTotal = 1;
                let match = null;
                for (const track of window.tracks) {
                    if (syllabusStructure[track.id]) {
                        match = syllabusStructure[track.id].find(s => s.subject === k);
                        if (match) break;
                    }
                }
                if (match) sTotal = match.chapters;
                sTotal = Math.max(1, sTotal);
                for (let i = 1; i <= cutoff; i++) subData[k][i] += subData[k][i - 1];
                for (let i = 0; i <= cutoff; i++) subData[k][i] = Math.round((subData[k][i] / sTotal) * 100);

                // FIX: Sync Subject chart with "Frozen / Passed" status and True Effective Completion
                const progMatch = match ? match.program : null;

                if (window.lastSubjectStats && window.lastSubjectStats[k]) {
                    const effPct = Math.round((window.lastSubjectStats[k].effectiveChapters / sTotal) * 100);
                    subData[k][cutoff] = Math.max(subData[k][cutoff], effPct);
                }

                const isFrozen = window.passedItems && ((window.passedItems.subjects && window.passedItems.subjects.includes(k)) || (window.passedItems.programs && progMatch && window.passedItems.programs.includes(progMatch)));
                if (isFrozen) subData[k][cutoff] = 100;

                window.latestChartStats.subjects[k] = subData[k][cutoff] || 0;
                for (let i = cutoff + 1; i < totalMonths; i++) subData[k][i] = null;
            });

            Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
            const chartOptions = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8, usePointStyle: true, boxPadding: 6, callbacks: { label: c => ' ' + c.dataset.label + ': ' + c.parsed.y + '%' } } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 9, weight: 'bold' }, callback: v => v + '%' }, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false } }, x: { ticks: { font: { size: 9, weight: 'bold' } }, grid: { display: false, drawBorder: false } } } };

            if (ctx1) {
                let pDatasets = [];
                Object.keys(progCum).forEach(p => {
                    const color = window.getProgramColor(p);
                    pDatasets.push({ label: p, data: progCum[p], borderColor: color, backgroundColor: color + '25', tension: 0.4, borderWidth: 3, pointBackgroundColor: color, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.prog[p] });
                });
                if (window.mainChartPrograms) {
                    window.mainChartPrograms.data.labels = months;
                    window.mainChartPrograms.data.datasets = pDatasets;
                    window.mainChartPrograms.update('none'); // Update to avoid canvas reconstruction lag
                } else {
                    window.mainChartPrograms = new Chart(ctx1, { type: 'line', data: { labels: months, datasets: pDatasets }, options: chartOptions });
                }
            }

            if (ctx2) {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const currentMonthName = monthNames[todayObj.getMonth()];
                safeSetText('daily-actions-month-title', `Daily Actions (${currentMonthName})`);

                const msgBar = document.getElementById('daily-actions-msg-bar');
                if (msgBar) {
                    let elapsedDays = todayObj.getDate();
                    if (PLAN_START_DATE.getFullYear() === todayObj.getFullYear() && PLAN_START_DATE.getMonth() === todayObj.getMonth()) {
                        elapsedDays = todayObj.getDate() - PLAN_START_DATE.getDate() + 1;
                    } else if (PLAN_START_DATE > todayObj) {
                        elapsedDays = 0;
                    }
                    if (elapsedDays < 0) elapsedDays = 0;

                    let totalPossible = window.customActions.length * elapsedDays;
                    let completedCount = 0;

                    tasks.forEach(t => {
                        const taskDate = getTaskDate(t);
                        if (taskDate < PLAN_START_DATE) return; // Skip if before start date
                        if (taskDate.getFullYear() === todayObj.getFullYear() && taskDate.getMonth() === todayObj.getMonth()) {
                            window.customActions.forEach(a => {
                                if (t[a.id]) completedCount++;
                            });
                        }
                    });

                    let avgPct = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

                    // Streak calculation
                    let streak = 0;
                    let checkDate = new Date();
                    checkDate.setHours(0, 0, 0, 0);

                    const tTodayStr = formatDate(checkDate);
                    const tTodayObj = tasks.find(t => t.date === tTodayStr);
                    let todayHasAction = false;
                    window.customActions.forEach(a => { if (tTodayObj && tTodayObj[a.id]) todayHasAction = true; });

                    if (!todayHasAction) {
                        let yesterday = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
                        const yestStr = formatDate(yesterday);
                        const yestTaskObj = tasks.find(t => t.date === yestStr);
                        let yestHasAction = false;
                        window.customActions.forEach(a => { if (yestTaskObj && yestTaskObj[a.id]) yestHasAction = true; });
                        if (yestHasAction) {
                            checkDate = yesterday;
                        }
                    }

                    while (true) {
                        const dStr = formatDate(checkDate);
                        const tObj = tasks.find(t => t.date === dStr);
                        if (checkDate < PLAN_START_DATE) break; // Streak cannot start before PLAN_START_DATE
                        let hasAction = false;
                        window.customActions.forEach(a => { if (tObj && tObj[a.id]) hasAction = true; });
                        if (hasAction) {
                            streak++;
                            checkDate.setDate(checkDate.getDate() - 1);
                        } else {
                            break;
                        }
                    }

                    let motMsg = "Start your streak today! Every small daily habit builds your long-term success.";
                    if (streak >= 7) {
                        motMsg = `🔥 Insane ${streak}-day streak! You are virtually unstoppable. Keep it up!`;
                    } else if (streak >= 3) {
                        motMsg = `⚡ Strong ${streak}-day streak active! Your momentum is growing. Finish strong!`;
                    } else if (avgPct >= 80) {
                        motMsg = "🚀 Outstanding consistency this month! Your dedication is building massive leverage.";
                    } else if (avgPct >= 50) {
                        motMsg = "💪 Good consistency. Keep tracking daily and watch your habits transform your score.";
                    }

                    msgBar.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 text-orange-850 dark:text-orange-350 gap-3 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div class="flex items-center space-x-2.5 min-w-0">
                            <span class="text-base shrink-0">🎯</span>
                            <p class="text-[10px] md:text-xs font-bold leading-normal truncate">${motMsg}</p>
                        </div>
                        <div class="flex items-center space-x-3 shrink-0 text-[10px] md:text-xs font-black uppercase tracking-wider">
                            <span class="bg-orange-100 dark:bg-orange-900/60 px-2 py-1 rounded border border-orange-200/55 dark:border-orange-800">Avg: ${avgPct}%</span>
                            <span class="bg-orange-100 dark:bg-orange-900/60 px-2 py-1 rounded border border-orange-200/55 dark:border-orange-800">Streak: ${streak} Days</span>
                        </div>
                    </div>`;
                }

                const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.order ?? 999) - (b.order ?? 999));
                let mDatasets = sortedActions.map(a => ({
                    label: a.title, data: actDaily[a.id], borderColor: twColors[a.color].hex, backgroundColor: twColors[a.color].hex + '25', tension: 0.4, borderWidth: 3, pointBackgroundColor: twColors[a.color].hex, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.monthly[a.id]
                }));
                if (window.monthlyChartActions) {
                    window.monthlyChartActions.data.labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    window.monthlyChartActions.data.datasets = mDatasets;
                    window.monthlyChartActions.update('none');
                } else {
                    window.monthlyChartActions = new Chart(ctx2, { type: 'line', data: { labels: Array.from({ length: daysInMonth }, (_, i) => i + 1), datasets: mDatasets }, options: chartOptions });
                }
            }

            const ctxYearly = document.getElementById('yearlyActionsChart');
            if (ctxYearly) {
                const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.order ?? 999) - (b.order ?? 999));
                let yDatasets = sortedActions.map(a => ({
                    label: a.title, data: actCum[a.id], borderColor: twColors[a.color].hex, backgroundColor: twColors[a.color].hex + '15', tension: 0.4, borderWidth: 3, pointBackgroundColor: twColors[a.color].hex, pointRadius: 3, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.yearly[a.id]
                }));
                if (window.yearlyChartActions) {
                    window.yearlyChartActions.data.labels = months;
                    window.yearlyChartActions.data.datasets = yDatasets;
                    window.yearlyChartActions.update('none');
                } else {
                    window.yearlyChartActions = new Chart(ctxYearly.getContext('2d'), { type: 'line', data: { labels: months, datasets: yDatasets }, options: chartOptions });
                }
            }

            if (ctxSub) {
                const title = window.activeSingleSubjectTrend ? `${window.activeSingleSubjectTrend} Progress Trend` : 'Subject Progress Trends';
                const desc = window.activeSingleSubjectTrend ? `Historical chapter completion trend for ${window.activeSingleSubjectTrend}.` : 'Historical chapter completion trend by subject.';
                safeSetText('stm-title', title);
                safeSetText('stm-desc', desc);

                const subDatasets = Object.keys(subData).map(k => {
                    let isHidden = !window.chartVisibility.subjects[k];
                    if (window.activeSingleSubjectTrend) {
                        isHidden = (k !== window.activeSingleSubjectTrend);
                    }
                    const parentSub = window.getAllSubjects().find(s => s.subject === k);
                    if (parentSub && window.programVisibility && window.programVisibility[parentSub.program] === false) {
                        isHidden = true;
                    }
                    return {
                        label: getDynamicChartLabel(k), data: subData[k], borderColor: getSubjectColor(k), backgroundColor: 'transparent', tension: 0.4, borderWidth: 3, pointBackgroundColor: '#0f172a', pointBorderColor: getSubjectColor(k), pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointHoverBackgroundColor: getSubjectColor(k), pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, hidden: isHidden, subjectKey: k
                    };
                });
                const sortedSubs = window.getAllSubjects();
                const getSubIndex = (subName) => sortedSubs.findIndex(s => s.subject === subName);
                subDatasets.sort((a, b) => getSubIndex(a.subjectKey) - getSubIndex(b.subjectKey));
                if (window.subjectTrendChart) {
                    window.subjectTrendChart.data.labels = months;
                    window.subjectTrendChart.data.datasets = subDatasets;
                    window.subjectTrendChart.update('none');
                } else {
                    window.subjectTrendChart = new Chart(ctxSub.getContext('2d'), { type: 'line', data: { labels: months, datasets: subDatasets }, options: { ...chartOptions, interaction: { mode: 'nearest', axis: 'x', intersect: false } } });
                }
            }

            window.updateLegends();
            renderHeatmap();
        }

        function renderHeatmap() {
            const container = document.getElementById('yearly-daily-grid');
            if (!container) return;
            let html = '';
            for (let i = tasks.length - 1; i >= 0; i--) {
                const t = tasks[i];
                if (getTaskDate(t) > new Date()) continue;
                let c = 0; window.customActions.forEach(a => { if (t[a.id]) c++; });
                const pct = window.customActions.length > 0 ? Math.round((c / window.customActions.length) * 100) : 0;
                let bg = 'bg-white dark:bg-slate-800/60 text-slate-400 border border-slate-200 dark:border-slate-700/60 opacity-70';
                if (pct > 0 && pct <= 25) bg = 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] border-transparent opacity-100';
                if (pct > 25 && pct <= 50) bg = 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)] border-transparent opacity-100';
                if (pct > 50 && pct <= 75) bg = 'bg-gradient-to-br from-lime-400 to-lime-500 text-white shadow-[0_2px_8px_rgba(132,204,22,0.3)] border-transparent opacity-100';
                if (pct > 75) bg = 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)] border-transparent opacity-100';
                html += `<div class="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${bg} w-[42px] sm:w-[50px] md:w-[55px] h-[52px] sm:h-[60px] md:h-[65px] shrink-0 font-black hover:-translate-y-1 transition-all cursor-default"><span class="text-[7px] sm:text-[8px] uppercase opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-[10px] sm:text-xs md:text-sm">${t.date.split(' ')[1]}</span></div>`;
            }
            container.innerHTML = html;
        }

        function reorderSubjectChapters(prog, subj) {
            if (subj === 'Revision') return;
            let subjectSlots = []; let chapters = [];
            const key = prog + 'Tasks';
            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].type !== 'study') continue;
                if (Array.isArray(tasks[i][key])) {
                    for (let j = 0; j < tasks[i][key].length; j++) {
                        if (tasks[i][key][j].subject === subj && !tasks[i][key][j].completed) {
                            subjectSlots.push({ tIdx: i, bIdx: j }); chapters.push({ ...tasks[i][key][j] });
                        }
                    }
                }
            }
            if (chapters.length === 0) return;
            // Target the last number in the chapter string to support prefixes correctly (e.g., "R1 Ch. 15" extracts 15)
            chapters.sort((a, b) => {
                const ma = a.chapter.match(/(\d+)(?!.*\d)/);
                const mb = b.chapter.match(/(\d+)(?!.*\d)/);
                return (ma ? parseInt(ma[0]) : 999) - (mb ? parseInt(mb[0]) : 999);
            });
            for (let k = 0; k < subjectSlots.length; k++) {
                const slot = subjectSlots[k]; const chObj = chapters[k];
                tasks[slot.tIdx][key][slot.bIdx] = { ...chObj, id: tasks[slot.tIdx][key][slot.bIdx].id };
            }
        }

        window.toggleDataset = function (chartKey, dsKey) {
            window.chartVisibility[chartKey][dsKey] = !window.chartVisibility[chartKey][dsKey];
            if (chartKey === 'prog') {
                if (!window.programVisibility) window.programVisibility = {};
                window.programVisibility[dsKey] = window.chartVisibility.prog[dsKey];
            }
            const chart = chartKey === 'prog' ? window.mainChartPrograms : (chartKey === 'monthly' ? window.monthlyChartActions : window.yearlyChartActions);
            if (chart) {
                const searchVal = chartKey === 'prog' ? dsKey : window.customActions.find(a => a.id === dsKey)?.title;
                const ds = chart.data.datasets.find(d => d.label === searchVal);
                if (ds) ds.hidden = !window.chartVisibility[chartKey][dsKey];
                chart.update();
            }
            window.updateLegends();
            if (chartKey === 'prog') {
                saveToCloud();
                renderUI();
            }
        };

        window.toggleSubDataset = function (k) {
            window.chartVisibility.subjects[k] = !window.chartVisibility.subjects[k];
            if (window.subjectTrendChart) {
                const ds = window.subjectTrendChart.data.datasets.find(d => d.subjectKey === k);
                if (ds) { ds.hidden = !window.chartVisibility.subjects[k]; window.subjectTrendChart.update(); }
            }
            window.updateLegends();
        };

        window.toggleRevSubDataset = function (k) {
            window.chartVisibility.revSubjects[k] = !window.chartVisibility.revSubjects[k];
            if (window.revisionTrendChartInstance) {
                const ds = window.revisionTrendChartInstance.data.datasets.find(d => d.subjectKey === k);
                if (ds) { ds.hidden = !window.chartVisibility.revSubjects[k]; window.revisionTrendChartInstance.update(); }
            }
            window.updateRevisionLegends();
        };

        window.updateRevisionLegends = function () {
            const sLeg = document.getElementById('revision-trend-legend');
            if (sLeg) {
                const sortedSubs = window.getAllSubjects().sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                sLeg.innerHTML = sortedSubs.map(s => {
                    const k = s.subject;
                    const val = window.latestChartStats.revSubjects ? window.latestChartStats.revSubjects[k] : 0;
                    const active = window.chartVisibility.revSubjects[k];
                    const color = getSubjectColor(k);
                    const label = getDynamicCleanLabel(k, 12);
                    const activeStyle = active ? `border-color: ${color}40; background-color: rgba(15,23,42,0.8); box-shadow: 0 0 10px ${color}20; opacity: 1;` : `border-color: rgba(255,255,255,0.1); background-color: transparent; opacity: 0.4; filter: grayscale(100%);`;
                    return `<div onclick="toggleRevSubDataset('${k}')" class="cursor-pointer flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border active:scale-95 transition-all duration-300 hover:scale-105 backdrop-blur-sm" style="${activeStyle}"><div class="w-2 h-2 rounded-full shrink-0 shadow-md" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[9px] font-black text-slate-200 uppercase whitespace-nowrap">${label}: ${val}%</span></div>`;
                }).join('');
            }
        };

        window.updateLegends = function () {
            const getLegend = (key, idxKey, color, label, valKey) => {
                const val = window.latestChartStats[key] ? window.latestChartStats[key][valKey] : 0;
                const active = window.chartVisibility[key][idxKey];
                return `<div onclick="toggleDataset('${key}', '${idxKey}')" class="cursor-pointer flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all ${active ? 'opacity-100 scale-100 shadow-md' : 'opacity-40 grayscale scale-95 line-through'}"><div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">${label}: ${val}%</span></div>`;
            };
            const pLeg = document.getElementById('prog-legend');
            if (pLeg) {
                let pIdx = 0;
                const sortedAllProgs = window.getAllPrograms();
                pLeg.innerHTML = sortedAllProgs.map(pObj => {
                    const p = pObj.name || pObj;
                    const html = getLegend('prog', p, window.getProgramColor(p), p, p);
                    return html;
                }).join('');
            }

            const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
            let actHtml = sortedActions.map(a => getLegend('monthly', a.id, twColors[a.color].hex, a.title, a.id)).join('');
            const aLeg = document.getElementById('act-legend'); if (aLeg) aLeg.innerHTML = actHtml;

            let yearHtml = sortedActions.map(a => getLegend('yearly', a.id, twColors[a.color].hex, a.title, a.id)).join('');
            const yLeg = document.getElementById('yearly-legend'); if (yLeg) yLeg.innerHTML = yearHtml;

            const sLeg = document.getElementById('subject-trend-legend');
            if (sLeg) {
                const sortedSubs = window.getAllSubjects().sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                const filteredSubs = window.activeSingleSubjectTrend
                    ? sortedSubs.filter(s => s.subject === window.activeSingleSubjectTrend)
                    : sortedSubs;
                sLeg.innerHTML = filteredSubs.map(s => {
                    const k = s.subject; const val = window.latestChartStats.subjects ? window.latestChartStats.subjects[k] : 0; const active = window.chartVisibility.subjects[k]; const color = getSubjectColor(k);
                    const label = getDynamicCleanLabel(k, 12);
                    const isProgVisible = !window.programVisibility || window.programVisibility[s.program] !== false;
                    const isSubjectActive = (window.activeSingleSubjectTrend || (active && isProgVisible));
                    const activeStyle = isSubjectActive ? `border-color: ${color}40; background-color: rgba(15,23,42,0.8); box-shadow: 0 0 10px ${color}20; opacity: 1;` : `border-color: rgba(255,255,255,0.1); background-color: transparent; opacity: 0.4; filter: grayscale(100%); line-through;`;
                    const onClickStr = (window.activeSingleSubjectTrend || !isProgVisible) ? '' : `toggleSubDataset('${k}')`;
                    const cursorClass = (window.activeSingleSubjectTrend || !isProgVisible) ? '' : 'cursor-pointer';
                    return `<div onclick="${onClickStr}" class="${cursorClass} flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border active:scale-95 transition-all duration-300 hover:scale-105 backdrop-blur-sm" style="${activeStyle}"><div class="w-2 h-2 rounded-full shrink-0 shadow-md" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[9px] font-black text-slate-200 uppercase whitespace-nowrap">${label}: ${val}%</span></div>`;
                }).join('');
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
                    window.masterLineChart = new Chart(canvas.getContext('2d'), {
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


// Expose functions to window namespace
window.renderUI = renderUI;
window.updateCountdown = updateCountdown;
window.updateSuccessScore = updateSuccessScore;
window.renderChart = renderChart;
window.renderTrendCharts = renderTrendCharts;
window.renderHeatmap = renderHeatmap;
window.reorderSubjectChapters = reorderSubjectChapters;
