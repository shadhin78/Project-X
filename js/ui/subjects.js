        function getDynamicChartLabel(subjName) {
            let programName = "";
            for (const trackId in syllabusStructure) {
                if (Array.isArray(syllabusStructure[trackId])) {
                    const sObj = syllabusStructure[trackId].find(s => s.subject === subjName);
                    if (sObj) {
                        programName = sObj.program;
                        break;
                    }
                }
            }
            if (!programName) return subjName;
            if (subjName.startsWith(programName + ' - ')) {
                const shortProg = programName.replace(/\s+/g, '');
                return subjName.replace(programName + ' - ', shortProg + ': ');
            }
            if (subjName.startsWith(programName + ' ')) {
                const shortProg = programName.replace(/\s+/g, '');
                return subjName.replace(programName + ' ', shortProg + ': ');
            }
            return subjName;
        }

        function getDynamicCleanLabel(subjName, lengthLimit = 12) {
            let cleanLabel = subjName;
            let programName = "";
            for (const trackId in syllabusStructure) {
                if (Array.isArray(syllabusStructure[trackId])) {
                    const sObj = syllabusStructure[trackId].find(s => s.subject === subjName);
                    if (sObj) {
                        programName = sObj.program;
                        break;
                    }
                }
            }
            if (programName) {
                if (cleanLabel.startsWith(programName + ' - ')) {
                    cleanLabel = cleanLabel.replace(programName + ' - ', '');
                } else if (cleanLabel.startsWith(programName + ' ')) {
                    cleanLabel = cleanLabel.replace(programName + ' ', '');
                }
            }
            if (cleanLabel.length > lengthLimit) {
                return cleanLabel.substring(0, lengthLimit) + '..';
            }
            return cleanLabel;
        }


        function recalculateTotals() {
            let total = 0;
            window.tracks.forEach(trackObj => {
                const track = trackObj.id;
                if (Array.isArray(syllabusStructure[track])) {
                    total += syllabusStructure[track].reduce((acc, s) => acc + s.chapters, 0);
                }
            });
            window.totalStaticChapters = total;
        }

        window.openRevisionModal = function () {
            window.renderRevisionModalContent();
            openModal('revision-manage-modal');
        };

        window.renderRevisionModalContent = function () {
            const container = document.getElementById('rmm-subjects-container');
            if (!container) return;
            let html = '';

            window.tracks.map(t => t.id).forEach(track => {
                window.customPrograms[track].forEach(prog => {
                    const progName = prog.name || prog;
                    const subs = (syllabusStructure[track] || []).filter(s => s.program === progName);
                    if (subs.length > 0) {
                        html += `<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">${progName}</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                        subs.forEach(s => {
                            const isRevising = window.revisionData && window.revisionData.active && window.revisionData.active.includes(s.subject);
                            let displaySub = s.subject.replace(progName + ' - ', '').replace(progName + ' ', '');
                            html += `
                                <label class="flex items-center space-x-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 active:scale-95 transition-all shadow-sm">
                                    <input type="checkbox" onchange="window.toggleRevisionMode('${s.subject.replace(/'/g, "\\'")}')" class="form-checkbox h-4 w-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500 transition-all" ${isRevising ? 'checked' : ''}>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${s.subject}">${displaySub}</span>
                                </label>`;
                        });
                        html += `</div></div>`;
                    }
                });
            });
            container.innerHTML = html;
        };

        window.toggleRevisionMode = function (sub) {
            if (!window.revisionData) window.revisionData = { active: [], progress: {} };
            if (!window.revisionData.active) window.revisionData.active = [];

            if (window.revisionData.active.includes(sub)) {
                window.revisionData.active = window.revisionData.active.filter(s => s !== sub);
            } else {
                window.revisionData.active.push(sub);
                if (!window.revisionData.progress[sub]) window.revisionData.progress[sub] = {};
            }
            saveToCloud();
            renderUI();
            window.renderRevisionModalContent();

            const actionText = window.revisionData.active.includes(sub) ? "started" : "closed";
            showToast(`Revision mode ${actionText} for ${sub}!`, "success");
        };

        window.toggleRevisionChapter = function (sub, chNum, isChecked) {
            if (!window.revisionData) window.revisionData = { active: [], progress: {} };
            if (!window.revisionData.progress[sub]) window.revisionData.progress[sub] = {};
            window.revisionData.progress[sub][chNum] = isChecked ? new Date().toISOString() : false;

            // Optimistic UI for smooth clicking
            const cardEl = document.getElementById(`rev-task-${sub.replace(/[^a-zA-Z0-9]/g, '-')}-${chNum}`);
            if (cardEl) {
                const titleEl = cardEl.querySelector('.tracking-tight');
                const descEl = cardEl.querySelector('.line-clamp-2');
                const accentBar = cardEl.querySelector('.absolute.top-0.left-0');

                if (titleEl) {
                    if (isChecked) titleEl.classList.add('line-through', 'text-blue-700', 'dark:text-blue-400', 'opacity-70');
                    else titleEl.classList.remove('line-through', 'text-blue-700', 'dark:text-blue-400', 'opacity-70');
                }
                if (descEl) isChecked ? descEl.classList.add('line-through', 'opacity-60') : descEl.classList.remove('line-through', 'opacity-60');

                if (isChecked) {
                    cardEl.classList.add('ring-1', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                    cardEl.classList.remove('bg-white', 'dark:bg-slate-800');
                    if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-blue-500 transition-colors';
                } else {
                    cardEl.classList.remove('ring-1', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                    cardEl.classList.add('bg-white', 'dark:bg-slate-800');
                    if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-blue-300 dark:bg-blue-700 transition-colors';
                }
            }

            // Update local progress bar
            const safeSubId = sub.replace(/[^a-zA-Z0-9]/g, '-');
            const sObj = window.getAllSubjects().find(s => s.subject === sub);
            const totalChapters = sObj ? sObj.chapters : 1;
            const completedCount = Object.values(window.revisionData.progress[sub]).filter(Boolean).length;
            const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 100;

            const textEl = document.getElementById(`rev-group-text-${safeSubId}`);
            if (textEl) textEl.innerHTML = `${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${totalChapters} <span class="opacity-60">CH</span>`;
            const pctEl = document.getElementById(`rev-group-pct-${safeSubId}`);
            if (pctEl) pctEl.textContent = `${progressPct}%`;
            const barEl = document.getElementById(`rev-group-bar-${safeSubId}`);
            if (barEl) barEl.style.width = `${progressPct}%`;

            updateMetrics();
            saveToCloud();

            if (window.chartDebounce) clearTimeout(window.chartDebounce);
            window.chartDebounce = setTimeout(() => requestAnimationFrame(renderTrendCharts), 600);
        };

        function renderSubjectProgress(subjectStats) {
            const container = document.getElementById('subject-progress-container');
            if (!container) return;

            const colorPairs = [
                { bg: "bg-gradient-to-r from-indigo-400 to-indigo-600", text: "text-indigo-500" }, { bg: "bg-gradient-to-r from-emerald-400 to-emerald-600", text: "text-emerald-500" },
                { bg: "bg-gradient-to-r from-violet-400 to-violet-600", text: "text-violet-500" }, { bg: "bg-gradient-to-r from-rose-400 to-rose-600", text: "text-rose-500" },
                { bg: "bg-gradient-to-r from-amber-400 to-amber-600", text: "text-amber-500" }, { bg: "bg-gradient-to-r from-cyan-400 to-cyan-600", text: "text-cyan-500" }
            ];

            let pIdx = 0;
            let html = '';
            window.tracks.forEach(trackObj => {
                const track = trackObj.id;
                const trackName = trackObj.name || track;
                if (window.customPrograms[track]) {
                    const trackSubs = syllabusStructure[track] || [];
                    if (trackSubs.length === 0) return;

                    let trackTotalChapters = 0;
                    let trackEffectiveChapters = 0;
                    trackSubs.forEach(s => {
                        const stats = subjectStats[s.subject];
                        if (stats) {
                            trackTotalChapters += stats.totalChapters || 0;
                            trackEffectiveChapters += stats.effectiveChapters || 0;
                        }
                    });
                    const trackPerc = trackTotalChapters > 0 ? Math.min(100, (trackEffectiveChapters / trackTotalChapters) * 100) : 0;

                    html += `
                    <div class="mb-8 p-4 sm:p-5 md:p-6 bg-slate-50/50 dark:bg-slate-900/10 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
                        <div class="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">${trackName}</span>
                                    <span class="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">(Track Progress)</span>
                                </div>
                                <div class="flex items-center gap-1 text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400">
                                    <span>${Math.round(trackEffectiveChapters)}/${trackTotalChapters} Ch</span>
                                    <span class="ml-1">(${Math.round(trackPerc)}%)</span>
                                </div>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden shadow-inner border border-slate-200/40 dark:border-slate-600/30">
                                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-sm" style="width: ${trackPerc}%"></div>
                            </div>
                        </div>
                        <div class="space-y-5">
                    `;

                    window.customPrograms[track].forEach(prog => {
                        const progName = prog.name || prog;
                        const subs = syllabusStructure[track] ? syllabusStructure[track].filter(s => s.program === progName) : [];
                        if (subs.length === 0) return;

                        const cp = colorPairs[pIdx % colorPairs.length];

                        html += `
                        <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                            <h3 class="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3.5 tracking-widest border-b border-slate-100 dark:border-slate-800/60 pb-1.5">${progName} Program</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        `;

                        subs.forEach(sub => {
                            const stats = subjectStats[sub.subject];
                            const perc = stats.totalChapters > 0 ? Math.min(100, (stats.effectiveChapters / stats.totalChapters) * 100) : 0;

                            let cleanSubName = sub.subject;
                            if (cleanSubName.startsWith(progName + ' - ')) cleanSubName = cleanSubName.replace(progName + ' - ', '');
                            else if (cleanSubName.startsWith(progName + ' ')) cleanSubName = cleanSubName.replace(progName + ' ', '');

                            html += `
                            <div class="group flex flex-col justify-center">
                                <div class="flex justify-between items-center text-[10px] md:text-[11px] font-black mb-1.5 transition-all group-hover:translate-x-1">
                                    <div class="flex items-center truncate pr-2">
                                        <span class="truncate text-slate-700 dark:text-slate-200" title="${sub.subject}">${cleanSubName}</span>
                                        <button onclick="window.openSingleSubjectTrendModal('${sub.subject.replace(/'/g, "\\'")}')" class="ml-2 p-0.5 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 active:scale-90 transition-all shrink-0" title="View Subject Trend">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="flex items-center shrink-0">
                                        <span class="ml-1">${Math.round(stats.effectiveChapters)}/${stats.totalChapters} <span class="${cp.text} ml-0.5">(${Math.round(perc)}%)</span></span>
                                    </div>
                                </div>
                                <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden shadow-inner border border-slate-200/40 dark:border-slate-600/30">
                                    <div class="${cp.bg} h-full rounded-full transition-all duration-700 ease-out shadow-sm" style="width: ${perc}%"></div>
                                </div>
                            </div>
                            `;
                        });
                        html += `</div></div>`;
                        pIdx++;
                    });

                    html += `
                        </div>
                    </div>
                    `;
                }
            });
            container.innerHTML = html;
        }

        function renderSubjectNavigation() {
            const container = document.getElementById('subject-navigation-container');
            if (!container) return;
            let html = '';

            const btnClass = (val) => {
                const isActive = currentFilter === val;
                return `active:scale-95 whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[11px] md:text-sm font-black transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-transparent scale-105' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-md'}`;
            };

            // ALL button and Revise Setup
            html += `<div class="mb-3 flex gap-2"><button class="${btnClass('All')}" onclick="window.setFilter('All')">All Tasks</button><button class="active:scale-95 whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[11px] md:text-sm font-black transition-all duration-300 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/60 shadow-sm flex items-center gap-1.5" onclick="window.openRevisionModal()"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Revise Subject</button></div>`;

            window.tracks.forEach(trackObj => {
                const track = trackObj.id;
                if (window.customPrograms[track]) {
                    window.customPrograms[track].forEach(prog => {
                        const progName = prog.name || prog;
                        const subs = (syllabusStructure[track] || []).filter(s => s.program === progName).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                        if (subs.length > 0) {
                            html += `
                            <div class="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1 w-full">${progName} PROGRAM</span>
                                </div>
                                <div class="flex flex-wrap gap-2 md:gap-3">
                                    <button class="${btnClass(progName)}" onclick="window.setFilter('${progName.replace(/'/g, "\\'")}');">[ ENTIRE ${progName} ]</button>
                                    ${subs.map(s => {
                                let displaySub = s.subject;
                                if (displaySub.startsWith(s.program + ' - ')) displaySub = displaySub.replace(s.program + ' - ', '');
                                else if (displaySub.startsWith(s.program + ' ')) displaySub = displaySub.replace(s.program + ' ', '');
                                return `<button class="${btnClass(s.subject)}" onclick="window.setFilter('${s.subject.replace(/'/g, "\\'")}');">${displaySub}</button>`;
                            }).join('')}
                                </div>
                            </div>`;
                        }
                    });
                }
            });
            container.innerHTML = html;
        }

        function renderCategoryProgress(subjectStats) {
            const container = document.getElementById('category-progress-container');
            if (!container) return;

            const colors = ['text-indigo-500', 'text-emerald-500', 'text-violet-500', 'text-rose-500', 'text-amber-500', 'text-cyan-500'];
            const shadows = ['shadow-[0_0_15px_rgba(99,102,241,0.3)]', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]', 'shadow-[0_0_15px_rgba(139,92,246,0.3)]', 'shadow-[0_0_15px_rgba(244,63,94,0.3)]', 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', 'shadow-[0_0_15px_rgba(6,182,212,0.3)]'];

            let html = ''; let catIdx = 0;

            window.tracks.map(t => t.id).forEach(track => {
                if (window.customPrograms[track]) {
                    window.customPrograms[track].forEach(prog => {
                        const progName = prog.name || prog;
                        const subs = syllabusStructure[track] ? syllabusStructure[track].filter(s => s.program === progName) : [];
                        if (subs.length === 0) return;

                        let totalChap = 0; let doneChap = 0;
                        subs.forEach(sub => { totalChap += subjectStats[sub.subject].totalChapters; doneChap += subjectStats[sub.subject].effectiveChapters; });
                        const perc = totalChap > 0 ? Math.round((doneChap / totalChap) * 100) : 0;
                        const color = colors[catIdx % colors.length]; const shadow = shadows[catIdx % shadows.length];

                        html += `<div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between group"><div><h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:translate-x-1 transition-transform">${progName}</h3><p class="text-[10px] text-slate-400 uppercase font-black mt-1 tracking-widest">${Math.round(doneChap)} / ${totalChap} Chapters</p></div><div class="relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 ${shadow} rounded-full bg-white dark:bg-slate-800 shrink-0"><svg class="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36"><path class="text-slate-100 dark:text-slate-700/50" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="${color}" stroke-width="3.5" stroke-dasharray="${perc}, 100" stroke="currentColor" fill="none" stroke-linecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg><span class="absolute text-[9px] md:text-[10px] font-black ${color}">${perc}%</span></div></div>`;
                        catIdx++;
                    });
                }
            });
            container.innerHTML = html;
        }

        window.openGlobalHistoryModal = function () {
            window.renderGlobalHistoryContent();
            openModal('global-history-modal');
        };

        window.renderGlobalHistoryContent = function () {
            const container = document.getElementById('ghm-list');
            if (!container) return;

            const scrollViews = {
                timeline: document.getElementById('ghm-view-timeline')?.scrollTop || 0,
                subject: document.getElementById('ghm-view-subject')?.scrollTop || 0,
                trend: document.getElementById('ghm-view-trend')?.scrollTop || 0
            };

            let subjectLogs = {};
            let allEvents = [];

            window.getAllSubjects().forEach(s => {
                subjectLogs[s.subject] = {
                    program: s.program,
                    total: s.chapters,
                    passed: window.passedItems.subjects.includes(s.subject) || window.passedItems.programs.includes(s.program),
                    chapters: [],
                    revisions: []
                };
            });

            tasks.forEach(t => {
                if (t.type === 'study') {
                    const fallbackDate = getTaskDate(t);
                    window.tracks.forEach(track => {
                        const key = track.id + 'Tasks';
                        if (Array.isArray(t[key])) {
                            t[key].forEach(b => {
                                if (b.completed && subjectLogs[b.subject]) {
                                    let actualDate = b.completedAt ? new Date(b.completedAt) : fallbackDate;
                                    if (isNaN(actualDate.getTime())) actualDate = fallbackDate;
                                    let displayDate = actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    let ts = actualDate.getTime();
                                    subjectLogs[b.subject].chapters.push({ ch: b.chapter, date: displayDate, ts: ts });
                                    allEvents.push({ type: 'Chapter', subject: b.subject, item: b.chapter, date: displayDate, ts: ts });
                                }
                            });
                        }
                    });
                }
            });

            Object.values(subjectLogs).forEach(log => {
                log.chapters.sort((a, b) => a.ts - b.ts);
            });

            Object.keys(window.revisionData?.progress || {}).forEach(sub => {
                if (subjectLogs[sub]) {
                    Object.keys(window.revisionData.progress[sub]).forEach(chNum => {
                        const val = window.revisionData.progress[sub][chNum];
                        if (val) {
                            let actualDate = (typeof val === 'string' && val.includes('T')) ? new Date(val) : new Date();
                            if (isNaN(actualDate.getTime())) actualDate = new Date();
                            let ts = actualDate.getTime();
                            let dStr = actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            subjectLogs[sub].revisions.push({ ch: 'Ch. ' + chNum, date: dStr, ts: ts });
                            allEvents.push({ type: 'Revision', subject: sub, item: 'Ch. ' + chNum, date: dStr, ts: ts });
                        }
                    });
                    subjectLogs[sub].revisions.sort((a, b) => a.ts - b.ts);
                }
            });

            allEvents.sort((a, b) => b.ts - a.ts);

            let subjectHtml = '';
            Object.keys(subjectLogs).forEach(sub => {
                const log = subjectLogs[sub];
                if (log.chapters.length === 0 && log.revisions.length === 0 && !log.passed) return;

                const isSubjectComplete = log.chapters.length >= log.total && log.total > 0;
                const completionDate = isSubjectComplete ? log.chapters[log.chapters.length - 1].date : null;

                const color = getSubjectColor(sub);
                let subDisplay = sub.replace(log.program + ' - ', '').replace(log.program + ' ', '');

                let statusBadges = '';
                if (log.passed) statusBadges += `<span class="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">Frozen/Passed</span>`;
                else if (isSubjectComplete) statusBadges += `<span class="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">Completed: ${completionDate.split(',')[0]}</span>`;
                else statusBadges += `<span class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">In Progress (${log.chapters.length}/${log.total})</span>`;

                subjectHtml += `
                <details class="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group mb-3">
                    <summary class="cursor-pointer p-4 outline-none select-none list-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-[0.99] rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                        <div class="flex flex-col gap-1.5">
                            <div class="flex items-center space-x-2">
                                <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${color}"></div>
                                <span class="font-black text-xs md:text-sm text-slate-800 dark:text-slate-200">${subDisplay}</span>
                            </div>
                            <div class="flex gap-2 items-center pl-4.5">${statusBadges}</div>
                        </div>
                        <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </summary>
                    <div class="p-4 pt-0 border-t border-slate-200 dark:border-slate-700/60 pl-8">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">First Pass Database</h5>
                                <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                    ${log.chapters.length > 0 ? log.chapters.map(c => `
                                        <div class="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <span class="font-bold text-slate-700 dark:text-slate-300">${c.ch}</span>
                                            <span class="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-inner whitespace-nowrap">${c.date}</span>
                                        </div>
                                    `).join('') : '<span class="text-[10px] text-slate-500 italic">No chapters completed yet.</span>'}
                                </div>
                            </div>
                            <div>
                                <h5 class="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Revision Database</h5>
                                <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                    ${log.revisions.length > 0 ? log.revisions.map(r => `
                                        <div class="flex justify-between items-center text-xs bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                            <span class="font-bold text-blue-700 dark:text-blue-400">${r.ch}</span>
                                            <span class="text-[9px] font-black text-blue-500/70 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded shadow-inner whitespace-nowrap">${r.date}</span>
                                        </div>
                                    `).join('') : '<span class="text-[10px] text-slate-500 italic">No revisions completed yet.</span>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </details>
                `;
            });

            let timelineHtml = allEvents.map(e => `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style="background-color: ${getSubjectColor(e.subject)}"></div>
                        <div class="flex flex-col">
                            <span class="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">${e.subject}</span>
                            <span class="text-[10px] font-bold text-slate-500 mt-0.5">${e.item}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end shrink-0 ml-4">
                        <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm ${e.type === 'Revision' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}">${e.type}</span>
                        <span class="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap">${e.date}</span>
                    </div>
                </div>
            `).join('');

            // Data mapping for Trend Chart
            const sStartDate = globalStartDate || PLAN_START_DATE;
            const sEndDate = globalEndDate || PLAN_END_DATE;

            let chartStart = new Date(sStartDate.getTime());
            let chartEnd = new Date(sEndDate.getTime());
            const todayObj = new Date();
            if (todayObj > chartEnd) chartEnd = new Date(todayObj);

            // Set time boundaries to 00:00:00
            chartStart.setHours(0, 0, 0, 0);
            chartEnd.setHours(0, 0, 0, 0);
            todayObj.setHours(0, 0, 0, 0);

            // We build a list of days
            const days = [];
            let curr = new Date(chartStart.getTime());

            // Map of key -> count
            const studyCounts = {};
            const revCounts = {};

            allEvents.forEach(e => {
                let d = new Date(e.ts);
                d.setHours(0, 0, 0, 0);
                let key = d.toDateString();
                if (e.type === 'Chapter') studyCounts[key] = (studyCounts[key] || 0) + 1;
                if (e.type === 'Revision') revCounts[key] = (revCounts[key] || 0) + 1;
            });

            let studyData = [];
            let revData = [];

            while (curr <= chartEnd) {
                let key = curr.toDateString();
                days.push(curr.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));

                // If it is in the future, we set it to null so the line stops plotting
                if (curr > todayObj) {
                    studyData.push(null);
                    revData.push(null);
                } else {
                    studyData.push(studyCounts[key] || 0);
                    revData.push(revCounts[key] || 0);
                }

                curr.setDate(curr.getDate() + 1);
            }

            container.innerHTML = `
                <div class="sticky top-0 z-10 bg-white dark:bg-slate-800 flex space-x-2 md:space-x-4 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 pt-1 shrink-0 overflow-x-auto scrollbar-hide">
                    <button id="ghm-tab-btn-timeline" onclick="window.switchGhmTab('timeline')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'timeline' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Timeline Entry</button>
                    <button id="ghm-tab-btn-subject" onclick="window.switchGhmTab('subject')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'subject' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Subject Folder</button>
                    <button id="ghm-tab-btn-trend" onclick="window.switchGhmTab('trend')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'trend' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Trend Chart</button>
                </div>
                <div id="ghm-view-timeline" class="flex-1 flex flex-col gap-2 relative ${window.currentGhmTab !== 'timeline' ? 'hidden' : ''}">
                    ${timelineHtml || '<div class="p-8 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mt-2">No timeline data available. Complete tasks to build history.</div>'}
                </div>
                <div id="ghm-view-subject" class="flex-1 flex flex-col relative ${window.currentGhmTab !== 'subject' ? 'hidden' : ''}">
                    ${subjectHtml || '<div class="p-8 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mt-2">No subject data generated yet. Complete tasks to build the database.</div>'}
                </div>
                <div id="ghm-view-trend" class="flex-1 flex flex-col relative min-h-[300px] ${window.currentGhmTab !== 'trend' ? 'hidden' : ''}">
                    <div class="relative w-full h-[300px] sm:h-[400px] mt-2"><canvas id="globalDatabaseChart"></canvas></div>
                </div>
            `;

            // Render Chart only when the trend tab is active and visible
            if (window.currentGhmTab === 'trend') {
                const ctxChart = document.getElementById('globalDatabaseChart');
                if (ctxChart) {
                    if (window.globalHistoryChartInstance) window.globalHistoryChartInstance.destroy();

                    Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
                    window.globalHistoryChartInstance = new Chart(ctxChart.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: days,
                            datasets: [
                                {
                                    label: 'Study Chapters',
                                    data: studyData,
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                    tension: 0.4, borderWidth: 3, fill: true,
                                    pointBackgroundColor: '#3b82f6', pointRadius: 2, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff'
                                },
                                {
                                    label: 'Revision Chapters',
                                    data: revData,
                                    borderColor: '#8b5cf6',
                                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                    tension: 0.4, borderWidth: 3, fill: true,
                                    pointBackgroundColor: '#8b5cf6', pointRadius: 2, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff'
                                }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } },
                                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#fff', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 12, callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y}` } }
                            },
                            scales: {
                                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }, ticks: { font: { weight: 'bold' }, stepSize: 1 } },
                                x: { grid: { display: false, drawBorder: false }, ticks: { font: { weight: 'bold' }, maxTicksLimit: window.innerWidth < 640 ? 6 : 12 } }
                            }
                        }
                    });
                }
            }

            if (window.currentGhmTab === 'trend' && window.globalHistoryChartInstance) {
                setTimeout(() => window.globalHistoryChartInstance.resize(), 50);
            }

            requestAnimationFrame(() => {
                const tlView = document.getElementById('ghm-view-timeline');
                const subView = document.getElementById('ghm-view-subject');
                const trendView = document.getElementById('ghm-view-trend');
                if (tlView) tlView.scrollTop = scrollViews.timeline;
                if (subView) subView.scrollTop = scrollViews.subject;
                if (trendView) trendView.scrollTop = scrollViews.trend;
            });
        };

        window.switchGhmTab = function (tab) {
            window.currentGhmTab = tab;
            ['timeline', 'subject', 'trend'].forEach(t => {
                const view = document.getElementById('ghm-view-' + t);
                const btn = document.getElementById('ghm-tab-btn-' + t);
                if (!view || !btn) return;

                if (t === tab) {
                    view.classList.remove('hidden');
                    btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-blue-600 text-white shadow-md whitespace-nowrap";
                } else {
                    view.classList.add('hidden');
                    btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap";
                }
            });

            if (tab === 'trend') {
                window.renderGlobalHistoryContent();
            }
        };

        window.currentSubjectForTimeGoal = null;

        window.openSubjectTimeModal = function (subjectName) {
            window.currentSubjectForTimeGoal = subjectName;
            document.getElementById('stm-time-title').textContent = subjectName;

            const select = document.getElementById('stm-time-goal-select');
            select.innerHTML = '<option value="">-- None Selected --</option>';
            window.paceGoals.forEach(g => {
                select.innerHTML += `<option value="${g.id}">${g.target} (${formatDate(parseDateSafe(g.deadline))})</option>`;
            });

            document.getElementById('stm-time-start').value = '';
            document.getElementById('stm-time-date').value = '';
            select.value = '';

            if (window.subjectTimeLinks && window.subjectTimeLinks[subjectName]) {
                const link = window.subjectTimeLinks[subjectName];
                if (link.type === 'goal') select.value = link.id;
                if (link.type === 'date') {
                    document.getElementById('stm-time-start').value = link.startDate || '';
                    document.getElementById('stm-time-date').value = link.date;
                }
            }

            openModal('subject-time-modal');
        };

        window.saveSubjectTimeGoal = function () {
            if (!window.currentSubjectForTimeGoal) return;
            const sub = window.currentSubjectForTimeGoal;
            const goalId = document.getElementById('stm-time-goal-select').value;
            const startDateVal = document.getElementById('stm-time-start').value;
            const dateVal = document.getElementById('stm-time-date').value;

            if (!window.subjectTimeLinks) window.subjectTimeLinks = {};

            if (dateVal) {
                window.subjectTimeLinks[sub] = { type: 'date', startDate: startDateVal, date: dateVal };
            } else if (goalId) {
                window.subjectTimeLinks[sub] = { type: 'goal', id: goalId };
            } else {
                delete window.subjectTimeLinks[sub];
            }

            saveToCloud();
            renderUI();
            closeModal('subject-time-modal');
            showToast("Subject Time Goal updated!", "success");
        };

        window.clearSubjectTimeGoal = function () {
            if (!window.currentSubjectForTimeGoal) return;
            const sub = window.currentSubjectForTimeGoal;
            if (window.subjectTimeLinks && window.subjectTimeLinks[sub]) {
                delete window.subjectTimeLinks[sub];
            }
            saveToCloud();
            renderUI();
            closeModal('subject-time-modal');
            showToast("Time Goal reset to default timeline.", "success");
        };

        window.updateEsmProgramDropdown = function () {
            const track = document.getElementById('esm-track').value;
            const progSelect = document.getElementById('esm-program');
            progSelect.innerHTML = '';
            window.customPrograms[track].forEach(p => {
                const pName = p.name || p;
                progSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
            });
        };

        window.openSubjectEditModal = function (subName) {
            let track = null;
            let sObj = null;
            for (const t of window.tracks) {
                if (syllabusStructure[t.id]) {
                    sObj = syllabusStructure[t.id].find(s => s.subject === subName);
                    if (sObj) {
                        track = t.id;
                        break;
                    }
                }
            }
            if (!sObj) return;

            document.getElementById('esm-old-name').value = subName;
            document.getElementById('esm-old-track').value = track;
            document.getElementById('esm-track').value = track;
            document.getElementById('esm-name').value = subName;

            window.updateEsmProgramDropdown();
            document.getElementById('esm-program').value = sObj.program;

            openModal('edit-subject-modal');
        };

        window.saveSubjectEditModal = function () {
            const oldName = document.getElementById('esm-old-name').value;
            const oldTrack = document.getElementById('esm-old-track').value;
            const newTrack = document.getElementById('esm-track').value;
            const newName = document.getElementById('esm-name').value.trim();
            const newProg = document.getElementById('esm-program').value;

            if (!newName) return showToast("Subject name cannot be empty.", "error");

            const sObj = syllabusStructure[oldTrack].find(s => s.subject === oldName);
            if (!sObj) return;

            if (oldName.toLowerCase() !== newName.toLowerCase()) {
                const isGlobalDuplicate = window.getAllSubjects().some(s => s.subject.toLowerCase() === newName.toLowerCase());
                if (isGlobalDuplicate) return showToast("Subject name must be unique globally.", "error");
            }

            let changed = false;

            // Handle Track Migration Safely
            if (oldTrack !== newTrack) {
                // Update structures
                syllabusStructure[oldTrack] = syllabusStructure[oldTrack].filter(s => s.subject !== oldName);
                sObj.program = newProg;
                sObj.subject = newName;
                syllabusStructure[newTrack] = syllabusStructure[newTrack] || [];
                syllabusStructure[newTrack].push(sObj);

                // Reallocate historical/future study tasks
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i].type !== 'study') continue;

                    // Unified program-track movement (always plural-to-plural)
                    const oldKey = oldTrack + 'Tasks';
                    const newKey = newTrack + 'Tasks';
                    if (Array.isArray(tasks[i][oldKey])) {
                        const bIdx = tasks[i][oldKey].findIndex(b => b.subject === oldName);
                        if (bIdx > -1) {
                            const taskToMove = { ...tasks[i][oldKey][bIdx], subject: newName, id: `${newTrack}-${tasks[i].id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
                            tasks[i][oldKey].splice(bIdx, 1);
                            tasks[i][newKey] = tasks[i][newKey] || [];
                            tasks[i][newKey].push(taskToMove);
                        }
                    }
                }
                changed = true;
            }

            // Standard Program or Name Changes
            if (oldTrack === newTrack) {
                if (sObj.program !== newProg) {
                    sObj.program = newProg;
                    changed = true;
                }

                if (oldName !== newName) {
                    sObj.subject = newName;
                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].type !== 'study') continue;
                        const key = newTrack + 'Tasks';
                        if (Array.isArray(tasks[i][key])) {
                            tasks[i][key].forEach(b => { if (b.subject === oldName) b.subject = newName; });
                        }
                    }
                    changed = true;
                }
            }

            if (changed) {
                // Bulk rename references explicitly
                if (oldName !== newName) {
                    if (subjectColors[oldName]) subjectColors[newName] = subjectColors[oldName];
                    if (currentFilter === oldName) window.currentFilter = newName;

                    if (window.chartVisibility.subjects[oldName] !== undefined) {
                        window.chartVisibility.subjects[newName] = window.chartVisibility.subjects[oldName];
                        delete window.chartVisibility.subjects[oldName];
                    }
                    if (window.chartVisibility.revSubjects[oldName] !== undefined) {
                        window.chartVisibility.revSubjects[newName] = window.chartVisibility.revSubjects[oldName];
                        delete window.chartVisibility.revSubjects[oldName];
                    }

                    window.paceGoals.forEach(g => {
                        if (g.type === 'subject' && g.target === oldName) g.target = newName;
                        if (g.type === 'bundle' && g.subjects) {
                            const idx = g.subjects.indexOf(oldName);
                            if (idx > -1) g.subjects[idx] = newName;
                        }
                    });
                    if (window.passedItems.subjects.includes(oldName)) {
                        window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== oldName);
                        window.passedItems.subjects.push(newName);
                    }
                    if (window.revisionData.active && window.revisionData.active.includes(oldName)) {
                        window.revisionData.active = window.revisionData.active.filter(s => s !== oldName);
                        window.revisionData.active.push(newName);
                    }
                    if (window.revisionData.progress && window.revisionData.progress[oldName]) {
                        window.revisionData.progress[newName] = window.revisionData.progress[oldName];
                        delete window.revisionData.progress[oldName];
                    }
                    if (window.subjectTimeLinks && window.subjectTimeLinks[oldName]) {
                        window.subjectTimeLinks[newName] = window.subjectTimeLinks[oldName];
                        delete window.subjectTimeLinks[oldName];
                    }
                }

                saveToCloud();
                renderUI();
                if (window.chartDebounce) clearTimeout(window.chartDebounce);
                window.chartDebounce = setTimeout(() => requestAnimationFrame(renderTrendCharts), 600);
                showToast("Subject updated successfully!", "success");
            }
            closeModal('edit-subject-modal');
        };

        window.requestDeleteSubjectFromModal = function () {
            const subName = document.getElementById('esm-old-name').value;
            window.openConfirmModal("Delete Subject", `Are you sure you want to completely delete "${subName}"? This action cannot be undone.`, () => {
                window.executeDeleteSubjectFromModal(subName);
            });
        };

        window.executeDeleteSubjectFromModal = function (targetName) {
            const track = document.getElementById('esm-old-track').value;

            syllabusStructure[track] = syllabusStructure[track].filter(s => s.subject !== targetName);
            delete window.chartVisibility.subjects[targetName];
            delete window.chartVisibility.revSubjects[targetName];

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].type !== 'study') continue;
                const key = track + 'Tasks';
                if (Array.isArray(tasks[i][key])) {
                    tasks[i][key] = tasks[i][key].map(b => b.subject === targetName ? { subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: b.id } : b);
                }
            }
            if (currentFilter === targetName) window.currentFilter = 'All';
            window.paceGoals = window.paceGoals.filter(g => !(g.type === 'subject' && g.target === targetName));
            window.paceGoals.forEach(g => {
                if (g.type === 'bundle' && g.subjects) g.subjects = g.subjects.filter(s => s !== targetName);
            });
            window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== targetName);
            if (window.revisionData.active) window.revisionData.active = window.revisionData.active.filter(s => s !== targetName);
            if (window.revisionData.progress && window.revisionData.progress[targetName]) delete window.revisionData.progress[targetName];

            if (window.subjectTimeLinks && window.subjectTimeLinks[targetName]) delete window.subjectTimeLinks[targetName];

            recalculateTotals();
            saveToCloud();
            renderUI();
            closeModal('edit-subject-modal');
            showToast(`Subject "${targetName}" deleted.`, "success");
        };


// Expose functions to window namespace
window.getDynamicChartLabel = getDynamicChartLabel;
window.getDynamicCleanLabel = getDynamicCleanLabel;
window.recalculateTotals = recalculateTotals;
window.renderSubjectProgress = renderSubjectProgress;
window.renderSubjectNavigation = renderSubjectNavigation;
window.renderCategoryProgress = renderCategoryProgress;
