        function generateStudyPlan() {
            const startDate = new Date(PLAN_START_DATE);
            const endDate = new Date(PLAN_END_DATE);

            const queues = {};
            window.tracks.forEach(track => {
                queues[track.id] = [];
                window.getSortedTrackSubjects(track.id).forEach(s => {
                    for (let i = 1; i <= s.chapters; i++) {
                        queues[track.id].push({ subject: s.subject, chapter: `Ch. ${i}`, title: `Topic ${i}` });
                    }
                });
            });

            let generated = [];
            let current = new Date(startDate);
            let dayId = 1; let studyIdx = 1;

            while (current <= endDate) {
                const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = formatDate(current);

                if (dayName === 'Fri') {
                    const task = { id: dayId, date: dateStr, day: dayName, type: 'holiday' };
                    window.tracks.forEach(t => {
                        task[t.id + 'Study'] = false;
                    });
                    if (Array.isArray(window.customActions)) {
                        window.customActions.forEach(act => { task[act.id] = false; });
                    }
                    generated.push(task);
                } else {
                    const task = {
                        id: dayId, date: dateStr, day: dayName, type: 'study', studyDay: studyIdx
                    };
                    window.tracks.forEach(t => {
                        const trackId = t.id;
                        task[trackId + 'Study'] = false;
                        const queueItem = queues[trackId].shift() || { subject: "Revision", chapter: "Rev", title: "Practice" };
                        task[trackId + 'Tasks'] = [{ ...queueItem, id: `${trackId}-${dayId}`, completed: false }];
                    });
                    if (Array.isArray(window.customActions)) {
                        window.customActions.forEach(act => { task[act.id] = false; });
                    }
                    generated.push(task);
                    studyIdx++;
                }
                current.setDate(current.getDate() + 1); dayId++;
            }
            return generated;
        }

        let defaultTasks = generateStudyPlan();
        window.tasks = defaultTasks;
        recalculateTotals();

        function setupFocusTodayButton() {
            const btn = document.getElementById('focus-today-btn');
            if (!btn) return;
            btn.addEventListener('click', () => {
                if (currentFilter !== 'All') { window.currentFilter = 'All'; renderSubjectNavigation(); renderTaskList(); updateMetrics(); }
                const todayString = formatDate(new Date());
                const todayTask = tasks.find(t => t.date === todayString);
                if (todayTask && todayTask.type === 'study') {
                    setTimeout(() => {
                        const firstTaskCard = document.querySelector(`[id^="single-task-"][id$="-${todayTask.studyDay}"]`);
                        if (firstTaskCard) {
                            firstTaskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstTaskCard.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-gray-900', 'scale-[1.02]');
                            setTimeout(() => firstTaskCard.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-gray-900', 'scale-[1.02]'), 2500);
                        }
                    }, 100);
                }
            });
        }
        function renderTaskList() {
            const list = document.getElementById('task-list');
            if (!list) return;
            list.className = 'flex flex-col space-y-6 md:space-y-8 w-full pb-4';

            let subjectsToRender = [];
            if (currentFilter === 'All') {
                subjectsToRender = window.getAllSubjects().map(s => s.subject);
            } else {
                const isProgram = window.getAllPrograms().some(p => (p.name || p) === currentFilter);
                if (isProgram) {
                    subjectsToRender = window.getAllSubjects().filter(s => s.program === currentFilter).map(s => s.subject);
                } else {
                    subjectsToRender = [currentFilter];
                }
            }

            const grouped = {};
            subjectsToRender.forEach(sub => {
                let track = null;
                let sObj = null;
                for (const t of window.tracks) {
                    if (syllabusStructure[t.id]) {
                        sObj = syllabusStructure[t.id].find(s => s.subject === sub);
                        if (sObj) { track = t.id; break; }
                    }
                }
                if (sObj) {
                    grouped[sub] = {
                        type: track,
                        program: sObj.program,
                        totalChapters: sObj.chapters,
                        tasks: []
                    };
                }
            });

            tasks.forEach(t => {
                if (t.type === 'study') {
                    window.tracks.forEach(trackObj => {
                        const trackId = trackObj.id;
                        const key = trackId + 'Tasks';
                        if (t[key]) {
                            t[key].forEach(b => {
                                if (grouped[b.subject]) {
                                    grouped[b.subject].tasks.push({ dayObj: t, taskObj: b, type: trackId });
                                }
                            });
                        }
                    });
                }
            });

            let html = '';
            const shadowMap = { indigo: 'shadow-[0_0_10px_rgba(99,102,241,0.6)]', emerald: 'shadow-[0_0_10px_rgba(16,185,129,0.6)]', violet: 'shadow-[0_0_10px_rgba(139,92,246,0.6)]' };

            subjectsToRender.forEach(sub => {
                const group = grouped[sub];
                if (!group || group.tasks.length === 0) return;

                const trackIdx = window.tracks.findIndex(t => t.id === group.type);
                const colorMap = ['indigo', 'emerald', 'violet', 'rose', 'amber', 'cyan'];
                const colorClass = trackIdx !== -1 ? colorMap[trackIdx % colorMap.length] : 'blue';

                const trackObj = window.tracks.find(t => t.id === group.type);
                const trackName = trackObj ? trackObj.name : group.type.toUpperCase();

                let displaySubName = sub;
                if (displaySubName.startsWith(group.program + ' - ')) displaySubName = displaySubName.replace(group.program + ' - ', '');
                else if (displaySubName.startsWith(group.program + ' ')) displaySubName = displaySubName.replace(group.program + ' ', '');
                const finalTitle = `<span class="text-base md:text-lg lg:text-xl font-black text-slate-900 dark:text-white mr-2">${displaySubName}</span><span class="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mr-1.5">- ${group.program}</span><span class="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">- ${trackName}</span>`;

                const shadowClass = shadowMap[colorClass];
                const safeSubId = sub.replace(/[^a-zA-Z0-9]/g, '-');

                const isFrozen = (window.passedItems && window.passedItems.subjects && window.passedItems.subjects.includes(sub)) ||
                    (window.passedItems && window.passedItems.programs && window.passedItems.programs.includes(group.program));

                const isRevising = window.revisionData && window.revisionData.active && window.revisionData.active.includes(sub);
                const safeSubQuotes = sub.replace(/'/g, "\\'");

                const editBtnHtml = `
                    <button onclick="event.preventDefault(); event.stopPropagation(); window.openSubjectEditModal('${safeSubQuotes}');" class="p-1.5 shrink-0 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg shadow-sm transition-all border border-slate-200 dark:border-slate-600/50 active:scale-95" title="Edit Subject Details">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                `;

                const formatDateStr = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                let targetDate = null;
                let startDate = null;
                let linkLabel = '';
                let hasTimeGoal = false;

                if (window.subjectTimeLinks && window.subjectTimeLinks[sub]) {
                    const link = window.subjectTimeLinks[sub];
                    if (link.type === 'date') {
                        hasTimeGoal = true;
                        if (link.startDate) startDate = parseDateSafe(link.startDate);
                        targetDate = parseDateSafe(link.date);
                        targetDate.setHours(23, 59, 59, 999);
                        if (startDate) startDate.setHours(0, 0, 0, 0);
                        linkLabel = '<span class="block text-[8px] text-orange-500 dark:text-orange-400 mt-1 uppercase tracking-widest font-black bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800/50 inline-block">Custom Timeline</span>';
                    } else if (link.type === 'goal') {
                        const pg = window.paceGoals.find(g => g.id === link.id);
                        if (pg) {
                            hasTimeGoal = true;
                            if (pg.startDate) startDate = parseDateSafe(pg.startDate);
                            targetDate = parseDateSafe(pg.deadline);
                            targetDate.setHours(23, 59, 59, 999);
                            if (startDate) startDate.setHours(0, 0, 0, 0);
                            linkLabel = `<span class="block text-[8px] text-indigo-500 dark:text-indigo-400 mt-1 truncate max-w-[120px] mx-auto uppercase tracking-widest font-black bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 inline-block" title="${pg.target}">Link: ${pg.target}</span>`;
                        }
                    }
                }

                if (!hasTimeGoal) {
                    let firstCompletedTask = group.tasks.find(x => x.taskObj.completed);
                    if (firstCompletedTask) {
                        if (firstCompletedTask.taskObj.completedAt) {
                            startDate = new Date(firstCompletedTask.taskObj.completedAt);
                        } else {
                            startDate = getTaskDate(firstCompletedTask.dayObj);
                        }
                    }
                }

                const startDateStr = startDate ? formatDateStr(startDate) : '--';
                const endDateStr = targetDate ? formatDateStr(targetDate) : '--';
                const headerDatesStr = (hasTimeGoal || startDate) ? `${startDateStr} <span class="mx-1 opacity-50">&rarr;</span> ${endDateStr}` : "No Timeline Set";

                const today = new Date(); today.setHours(0, 0, 0, 0);
                const msPerDay = 1000 * 60 * 60 * 24;

                const completedCount = group.tasks.filter(x => x.taskObj.completed).length;
                const progressPct = group.totalChapters > 0 ? Math.round((completedCount / group.totalChapters) * 100) : 100;

                let remainingCh = Math.max(0, group.totalChapters - completedCount);
                let actPaceRaw = 0;
                let reqPaceRaw = 0;

                let actualStartDateForPace = null;
                let firstCompletedTaskForPace = group.tasks.find(x => x.taskObj.completed);
                if (firstCompletedTaskForPace) {
                    actualStartDateForPace = firstCompletedTaskForPace.taskObj.completedAt ? new Date(firstCompletedTaskForPace.taskObj.completedAt) : getTaskDate(firstCompletedTaskForPace.dayObj);
                    actualStartDateForPace.setHours(0, 0, 0, 0);
                }

                let daysElapsed = 0;
                if (group.totalChapters > 0) {
                    if (completedCount > 0 && actualStartDateForPace && actualStartDateForPace <= today) {
                        daysElapsed = Math.floor((today - actualStartDateForPace) / msPerDay) + 1;
                        actPaceRaw = completedCount / daysElapsed;
                    } else if (startDate && startDate <= today) {
                        daysElapsed = Math.floor((today - startDate) / msPerDay) + 1;
                        actPaceRaw = completedCount / daysElapsed;
                    }

                    if (hasTimeGoal && targetDate) {
                        if (today > targetDate) {
                            reqPaceRaw = remainingCh > 0 ? remainingCh : 0;
                        } else {
                            let baselineDateForReq = (startDate && startDate > today) ? startDate : today;
                            const daysRemaining = Math.max(1, Math.ceil((targetDate - baselineDateForReq) / msPerDay));
                            reqPaceRaw = remainingCh / daysRemaining;
                        }
                    }
                }

                const actPace = actPaceRaw.toFixed(2);
                const reqPace = hasTimeGoal ? reqPaceRaw.toFixed(2) : '--';

                let subjectDaysPassedStr = '<span class="opacity-60">0 Days Passed</span>';
                if (completedCount > 0 && daysElapsed > 0) {
                    subjectDaysPassedStr = `${window.formatDaysPassed(daysElapsed)} Passed`;
                }

                let estFinishStr = '--';
                let estDaysNeededStr = '<span class="opacity-60">Unknown</span>';
                if (isFrozen || completedCount >= group.totalChapters) {
                    estFinishStr = '<span class="text-emerald-500 font-black">Finished</span>';
                    estDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
                } else if (completedCount === 0) {
                    estFinishStr = '<span class="text-slate-400 text-[10px]">No Data</span>';
                } else if (actPaceRaw > 0) {
                    const daysLeft = remainingCh / actPaceRaw;
                    const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
                    estFinishStr = formatDateStr(estDate);
                    estDaysNeededStr = `${Math.ceil(daysLeft)} Days Needed`;
                }

                let timeGoalCountdownStr = '';
                if (isFrozen || completedCount >= group.totalChapters) {
                    timeGoalCountdownStr = '<span class="text-emerald-500 font-bold">Done</span>';
                } else if (!hasTimeGoal) {
                    timeGoalCountdownStr = '<span class="text-slate-400 font-bold">No Goal</span>';
                } else {
                    let diffDaysTG = Math.ceil((targetDate - today) / msPerDay);
                    if (diffDaysTG > 0) timeGoalCountdownStr = `${diffDaysTG} Days Left`;
                    else if (diffDaysTG === 0) timeGoalCountdownStr = `<span class="text-orange-500 font-bold">Due Today</span>`;
                    else timeGoalCountdownStr = `<span class="text-red-500 font-bold">${Math.abs(diffDaysTG)} Days Overdue</span>`;
                }

                let headerIcon = `<div class="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-${colorClass}-50 dark:bg-${colorClass}-500/10 border border-${colorClass}-100 dark:border-${colorClass}-500/20 shadow-sm shrink-0"><div class="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-${colorClass}-500 ${shadowClass}"></div></div>`;
                if (isFrozen) headerIcon = `<div class="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm shrink-0 text-base md:text-lg drop-shadow-md">🏆</div>`;

                let isDetailsOpen = window.subjectDetailsState[safeSubId] !== undefined ? window.subjectDetailsState[safeSubId] : (subjectsToRender.length === 1);
                let openAttr = isDetailsOpen ? 'open' : '';

                const isProgramVisible = !window.programVisibility || window.programVisibility[group.program] !== false;
                let blockHtml = '';

                if (!isProgramVisible) {
                    blockHtml = `
                        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 p-3 rounded-xl shadow-sm mb-3 opacity-60">
                            <div class="flex items-center space-x-2.5 min-w-0">
                                <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${window.getProgramColor(group.program)}"></div>
                                <h4 class="text-xs font-black text-slate-650 dark:text-slate-400 truncate">${displaySubName} <span class="text-[9px] font-bold text-slate-400 uppercase">- ${group.program} (Compressed)</span></h4>
                            </div>
                            <div class="flex items-center space-x-2 shrink-0">
                                <span class="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">${progressPct}%</span>
                                <button onclick="window.toggleOutcomeProgram('${group.program.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-slate-600 rounded" title="Spread Program Everywhere">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>`;
                } else if (isFrozen) {
                    blockHtml = `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 md:p-5 rounded-[1.25rem] shadow-sm mb-4">
                            <div class="flex items-center space-x-3 md:space-x-4 w-full">
                                <div class="text-3xl drop-shadow-md">🏆</div>
                                <div class="flex flex-wrap items-center flex-1">
                                    <div class="flex items-center w-full">
                                        <h2 class="tracking-tight truncate flex-1"><span class="text-base md:text-lg lg:text-xl font-black text-slate-900 dark:text-white mr-2">${displaySubName}</span><span class="text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mr-1.5">- ${group.program}</span><span class="text-[10px] md:text-xs font-medium text-emerald-500/80 dark:text-emerald-500/60 uppercase tracking-widest whitespace-nowrap">- ${trackName}</span></h2>
                                    </div>
                                    <span class="w-full text-[9px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 mt-0.5">Status: Passed & Frozen</span>
                                </div>
                                ${editBtnHtml}
                            </div>
                        </div>`;
                } else {
                    blockHtml = `
                        <details id="details-${safeSubId}" ontoggle="window.subjectDetailsState['${safeSubId}'] = this.open;" class="bg-white dark:bg-slate-800 rounded-[1.25rem] md:rounded-[2rem] shadow-sm border border-slate-200/80 dark:border-slate-700/60 mb-5 group overflow-hidden transition-all duration-300 hover:shadow-md" ${openAttr}>
                            <summary class="cursor-pointer p-4 md:p-6 outline-none select-none list-none flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/80 [&::-webkit-details-marker]:hidden relative z-10">
                                
                                <!-- Left side: Subject, Program, Time Period -->
                                <div class="flex flex-col gap-2.5 w-full lg:w-[40%] shrink-0">
                                    <div class="flex items-center gap-3">
                                        ${headerIcon}
                                        <div class="flex flex-col overflow-hidden w-full pr-2">
                                            <div class="flex items-center w-full">
                                                <h2 class="tracking-tight truncate flex-1" title="${displaySubName}">${finalTitle}</h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 lg:ml-[3.25rem] uppercase tracking-widest bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md w-fit border border-slate-200 dark:border-slate-700/50">
                                        <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <span>${headerDatesStr}</span>
                                    </div>
                                </div>

                                <!-- Middle: Progress Bar & Status -->
                                <div class="flex flex-col gap-2 w-full lg:w-[35%] lg:px-4">
                                    <div class="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                        <span id="group-text-${safeSubId}" class="text-slate-500 dark:text-slate-400">${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${group.totalChapters} <span class="opacity-60">CH</span></span>
                                        <span id="group-pct-${safeSubId}" class="text-${colorClass}-600 dark:text-${colorClass}-400 bg-${colorClass}-50 dark:bg-${colorClass}-900/30 px-1.5 py-0.5 rounded border border-${colorClass}-100 dark:border-${colorClass}-800/50 shadow-sm">${progressPct}%</span>
                                    </div>
                                    <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-600/30 relative">
                                        <div id="group-bar-${safeSubId}" class="h-full bg-gradient-to-r from-${colorClass}-400 to-${colorClass}-600 transition-all duration-700 ease-out relative" style="width: ${progressPct}%">
                                            <div class="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right: EST Finish & Dropdown Arrow -->
                                <div class="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 w-full lg:w-[25%] lg:pl-0">
                                    <div class="flex flex-col text-left lg:text-right flex-1 lg:flex-none">
                                        <span class="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-0.5">EST. Finish</span>
                                        <span id="header-est-${safeSubId}" class="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200">${estFinishStr}</span>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0">
                                        ${editBtnHtml}
                                        <div class="p-2 md:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 group-open:rotate-180 group-open:bg-${colorClass}-50 group-open:text-${colorClass}-600 dark:group-open:bg-${colorClass}-900/30 dark:group-open:text-${colorClass}-400 transition-all duration-300 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-600/30">
                                            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </summary>

                            <div class="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10">
                                
                                <!-- Inside Expanded View: 4 Action Analytics Cards -->
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                                    <div onclick="window.openSubjectTimeModal('${safeSubQuotes}')" class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center text-center hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer group/tg scale-100 active:scale-[0.98]">
                                        <div class="absolute top-2 right-2 opacity-0 group-hover/tg:opacity-100 transition-opacity"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></div>
                                        <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Goal</span>
                                        <span class="text-sm md:text-[1.05rem] font-black text-slate-800 dark:text-slate-100 leading-tight">${endDateStr}</span>
                                        <span id="tg-tg-days-${safeSubId}" class="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">${timeGoalCountdownStr}</span>
                                        ${linkLabel}
                                    </div>
                                    <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm flex flex-col justify-center text-center">
                                        <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/90 dark:text-blue-400/90 mb-1">Req Pace</span>
                                        <span class="text-sm md:text-[1.1rem] font-black text-blue-700 dark:text-blue-400"><span id="tg-req-${safeSubId}">${reqPace}</span> <span class="text-[9px] opacity-70 font-bold uppercase tracking-widest">ch/d</span></span>
                                    </div>
                                    <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-${colorClass}-50/80 to-${colorClass}-100/50 dark:from-${colorClass}-900/20 dark:to-${colorClass}-900/30 rounded-2xl border border-${colorClass}-100 dark:border-${colorClass}-800/50 shadow-sm flex flex-col justify-center text-center">
                                        <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-${colorClass}-500/90 dark:text-${colorClass}-400/90 mb-1">Actual Pace</span>
                                        <span class="text-sm md:text-[1.1rem] font-black text-${colorClass}-700 dark:text-${colorClass}-400"><span id="tg-act-${safeSubId}">${actPace}</span> <span class="text-[9px] opacity-70 font-bold uppercase tracking-widest">ch/d</span></span>
                                        <span id="tg-act-days-${safeSubId}" class="text-[9px] text-${colorClass}-500/80 font-bold mt-0.5">${subjectDaysPassedStr}</span>
                                    </div>
                                    <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/30 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm flex flex-col justify-center text-center">
                                        <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-500/90 dark:text-orange-400/90 mb-1">Est. Finish</span>
                                        <span id="tg-est-${safeSubId}" class="text-sm md:text-[1.05rem] font-black text-orange-600 dark:text-orange-400">${estFinishStr}</span>
                                        <span id="tg-est-days-${safeSubId}" class="text-[9px] text-orange-500/80 font-bold mt-0.5">${estDaysNeededStr}</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                    ${group.tasks.map(x => generateSingleTaskHtml(x.dayObj, x.taskObj, x.type)).join('')}
                                </div>
                    `;
                    if (isRevising) {
                        if (isFrozen) {
                            blockHtml += `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 p-4 md:p-5 rounded-[1.25rem] shadow-sm mb-4">
                            <div class="flex items-center space-x-3 md:space-x-4 w-full">
                                <div class="text-3xl drop-shadow-md">🏅</div>
                                <div class="flex flex-wrap items-center flex-1">
                                    <h2 class="tracking-tight flex-1"><span class="text-base md:text-lg lg:text-xl font-black text-slate-900 dark:text-white mr-2">${displaySubName}</span><span class="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mr-1.5">- ${group.program}</span><span class="text-[10px] md:text-xs font-medium text-blue-500/80 dark:text-blue-500/60 uppercase tracking-widest whitespace-nowrap">- ${trackName} - Revision</span></h2>
                                    <span class="w-full text-[9px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-500 mt-0.5">Status: Revision Passed & Frozen</span>
                                </div>
                            </div>
                        </div>`;
                        } else {
                            let revCompletedCount = window.revisionData.progress[sub] ? Object.values(window.revisionData.progress[sub]).filter(Boolean).length : 0;
                            let revPct = group.totalChapters > 0 ? Math.round((revCompletedCount / group.totalChapters) * 100) : 0;

                            let revGridHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 mt-4">`;
                            for (let i = 1; i <= group.totalChapters; i++) {
                                let isCompleted = window.revisionData.progress[sub] && window.revisionData.progress[sub][i];
                                revGridHtml += generateRevisionTaskHtml(sub, i, isCompleted);
                            }
                            revGridHtml += `</div>`;

                            let revisionHeaderHtml = `
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-blue-200 dark:border-blue-800/50 pb-3 gap-3">
                                <div class="flex flex-wrap items-center gap-y-2 space-x-3 w-full">
                                    <div class="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse"></div>
                                    <h2 class="tracking-tight"><span class="text-lg md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white mr-2">${displaySubName}</span><span class="text-sm md:text-base font-bold text-blue-500 dark:text-blue-300 uppercase tracking-wider mr-1.5">- ${group.program}</span><span class="text-xs md:text-sm font-medium text-blue-400 dark:text-blue-400 uppercase tracking-widest whitespace-nowrap">- ${trackName} - Revision</span></h2>
                                    <button onclick="window.openRevisionTrendModal()" class="ml-auto text-[9px] md:text-[10px] font-black text-white bg-blue-600 px-2.5 md:px-4 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> Analytics</button>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 w-fit mb-4">
                                <span id="rev-group-text-${safeSubId}" class="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">${revCompletedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${group.totalChapters} <span class="opacity-60">CH</span></span>
                                <span id="rev-group-pct-${safeSubId}" class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[10px] font-black border border-blue-100 dark:border-blue-800/50 shadow-sm">${revPct}%</span>
                                <div class="w-24 md:w-32 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-600/30">
                                    <div id="rev-group-bar-${safeSubId}" class="h-full bg-blue-500 transition-all duration-500 ease-out relative" style="width: ${revPct}%"><div class="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div></div>
                                </div>
                            </div>
                        `;

                            blockHtml += `<div class="mt-8 w-full bg-blue-50/40 dark:bg-blue-900/10 p-4 md:p-6 rounded-[2rem] border-2 border-blue-200 dark:border-blue-800/50 shadow-sm relative overflow-hidden"><div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>${revisionHeaderHtml}${revGridHtml}</div>`;
                        }
                    }
                }

                if (!isFrozen) {
                    blockHtml += `
                            </div>
                        </details>
                    `;
                }

                html += blockHtml;
            });

            if (html === '') html = `<div class="flex flex-col items-center py-12 text-slate-400"><span class="text-4xl mb-4">📭</span><p class="font-black uppercase tracking-widest text-sm">No tasks scheduled for this selection</p></div>`;

            list.innerHTML = html;
            document.querySelectorAll('.task-checkbox').forEach(cb => cb.onchange = handleTaskToggle);
        }

        function generateRevisionTaskHtml(sub, chNum, isCompleted) {
            const safeSub = sub.replace(/[^a-zA-Z0-9]/g, '-');
            const safeSubQuotes = sub.replace(/'/g, "\\'");
            return `
                <div id="rev-task-${safeSub}-${chNum}" class="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col justify-between min-h-[110px] overflow-hidden group select-none ${isCompleted ? 'ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 !border-blue-200 dark:!border-blue-800' : ''}">
                    <div class="absolute top-0 left-0 w-full h-1 ${isCompleted ? 'bg-blue-500' : 'bg-blue-300 dark:bg-blue-700'} transition-colors"></div>
                    
                    <div class="flex justify-start items-center mb-3 mt-1">
                        <span class="text-[9px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md font-black tracking-widest uppercase border border-blue-100 dark:border-blue-800/50">REVISION</span>
                    </div>

                    <div class="flex items-end justify-between mt-auto gap-3">
                        <div class="flex flex-col pr-1">
                            <span class="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base tracking-tight leading-tight mb-0.5 ${isCompleted ? 'line-through text-blue-700 dark:text-blue-400 opacity-70' : ''}">Ch. ${chNum}</span>
                            <span class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug ${isCompleted ? 'line-through opacity-60' : ''}">Revision Practice</span>
                        </div>
                        <div class="shrink-0 mb-0.5">
                            <div class="relative flex items-center justify-center">
                                <input type="checkbox" onchange="window.toggleRevisionChapter('${safeSubQuotes}', ${chNum}, this.checked)" class="peer relative appearance-none w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-800 checked:bg-blue-500 checked:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm hover:border-blue-400" ${isCompleted ? 'checked' : ''}>
                                <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        function generateSingleTaskHtml(dayObj, taskObj, type) {
            let colorBg = 'bg-blue-500';
            const trackIdx = window.tracks.findIndex(t => t.id === type);
            const classes = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
            if (trackIdx !== -1) {
                colorBg = classes[trackIdx % classes.length];
            }

            return `
                <div id="single-task-${taskObj.id}-${dayObj.studyDay}" class="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col justify-between min-h-[110px] overflow-hidden group ${taskObj.completed ? 'ring-1 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 !border-emerald-200 dark:!border-emerald-800' : ''}">
                    
                    <!-- Color Accent Bar -->
                    <div class="absolute top-0 left-0 w-full h-1 ${taskObj.completed ? 'bg-emerald-500' : colorBg} transition-colors"></div>
                    
                    <div class="flex justify-between items-start mb-3 mt-1">
                        <span class="text-[9px] px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 rounded-md font-black tracking-widest uppercase">DAY ${dayObj.studyDay}</span>
                        <button onclick="openEditModal(${dayObj.id}, '${type}', '${taskObj.id}')" class="text-slate-400 hover:text-blue-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700" title="Edit/Delete Task">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    </div>

                    <div class="flex items-end justify-between mt-auto gap-3">
                        <div class="flex flex-col pr-1">
                            <span class="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base tracking-tight leading-tight mb-0.5 ${taskObj.completed ? 'line-through text-emerald-700 dark:text-emerald-400 opacity-70' : ''}">${taskObj.chapter}</span>
                            <span class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 ${taskObj.completed ? 'line-through opacity-60' : ''}">${taskObj.title}</span>
                        </div>
                        <div class="shrink-0 mb-0.5">
                            <div class="relative flex items-center justify-center">
                                <input type="checkbox" data-stud-id="${dayObj.studyDay}" data-subtask-id="${taskObj.id}" data-type="${type}" class="task-checkbox peer relative appearance-none w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-800 checked:bg-emerald-500 checked:border-emerald-500 focus:outline-none cursor-pointer transition-all shadow-sm hover:border-emerald-400" ${taskObj.completed ? 'checked' : ''}>
                                <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        function handleTaskToggle(e) {
            const studyDayId = parseInt(e.target.dataset.studId);
            const type = e.target.dataset.type;
            const subTaskId = e.target.dataset.subtaskId;
            const taskIndex = tasks.findIndex(t => t.studyDay === studyDayId && t.type === 'study');
            if (taskIndex === -1) return;

            const isCompleted = e.target.checked;
            const nowIso = new Date().toISOString();
            let taskObj;

            const key = type + 'Tasks';
            if (tasks[taskIndex][key]) {
                tasks[taskIndex][key] = tasks[taskIndex][key].map(b => b.id === subTaskId ? { ...b, completed: isCompleted, completedAt: isCompleted ? nowIso : null } : b);
                taskObj = tasks[taskIndex][key].find(b => b.id === subTaskId);
            }

            if (!taskObj) return;

            // Synchronize to weeklyTargetsDatabase if this subtask is a weekly target!
            if (window.weeklyTargetsDatabase) {
                Object.keys(window.weeklyTargetsDatabase).forEach(weekKey => {
                    const targets = window.weeklyTargetsDatabase[weekKey] || [];
                    targets.forEach(t => {
                        if (t.track === type && t.subject === taskObj.subject && t.chapter === taskObj.chapter) {
                            t.completed = isCompleted;
                            t.completedAt = isCompleted ? nowIso : null;
                        }
                    });
                });
            }

            // 1. Optimistic UI update: Immediate Card State styling (zero-lag)
            const cardEl = document.getElementById(`single-task-${taskObj.id}-${studyDayId}`);
            if (cardEl) {
                const titleEl = cardEl.querySelector('.tracking-tight');
                const descEl = cardEl.querySelector('.line-clamp-2');
                const accentBar = cardEl.querySelector('.absolute.top-0.left-0');

                if (titleEl) {
                    if (isCompleted) titleEl.classList.add('line-through', 'text-emerald-700', 'dark:text-emerald-400', 'opacity-70');
                    else titleEl.classList.remove('line-through', 'text-emerald-700', 'dark:text-emerald-400', 'opacity-70');
                }
                if (descEl) isCompleted ? descEl.classList.add('line-through', 'opacity-60') : descEl.classList.remove('line-through', 'opacity-60');

                if (isCompleted) {
                    cardEl.classList.add('ring-1', 'ring-emerald-500', 'bg-emerald-50/30', 'dark:bg-emerald-900/10', '!border-emerald-200', 'dark:!border-emerald-800');
                    cardEl.classList.remove('bg-white', 'dark:bg-slate-800');
                    if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-emerald-500 transition-colors';
                } else {
                    cardEl.classList.remove('ring-1', 'ring-emerald-500', 'bg-emerald-50/30', 'dark:bg-emerald-900/10', '!border-emerald-200', 'dark:!border-emerald-800');
                    cardEl.classList.add('bg-white', 'dark:bg-slate-800');
                    if (accentBar) {
                        let colorBg = 'bg-blue-500';
                        const trackIdx = window.tracks.findIndex(t => t.id === type);
                        const classes = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
                        if (trackIdx !== -1) {
                            colorBg = classes[trackIdx % classes.length];
                        }
                        accentBar.className = `absolute top-0 left-0 w-full h-1 ${colorBg} transition-colors`;
                    }
                }
            }

            // 2. Optimistic UI update: Specific Subject Progress Bar (Prevents full DOM recreation)
            const safeSubId = taskObj.subject.replace(/[^a-zA-Z0-9]/g, '-');
            const subName = taskObj.subject;
            const groupTasks = tasks.flatMap(t => t.type === 'study' ? (t[key] || []) : []).filter(x => x.subject === subName);
            const completedCount = groupTasks.filter(x => x.completed).length;

            const sObj = syllabusStructure[type] ? syllabusStructure[type].find(s => s.subject === subName) : null;
            const totalChapters = sObj ? sObj.chapters : 1;
            const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 100;

            const textEl = document.getElementById(`group-text-${safeSubId}`);
            if (textEl) textEl.innerHTML = `${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${totalChapters} <span class="opacity-60">CH</span>`;

            const pctEl = document.getElementById(`group-pct-${safeSubId}`);
            if (pctEl) pctEl.textContent = `${progressPct}%`;

            const barEl = document.getElementById(`group-bar-${safeSubId}`);
            if (barEl) barEl.style.width = `${progressPct}%`;

            // 3. Optimistic UI update: Recalculate and update the 4 specific analytics cards inside the subject view
            const allSubTasks = tasks.filter(t => t.type === 'study' && t[key] && t[key].some(b => b.subject === subName));

            let targetDate = null;
            let startDate = null;

            let hasTimeGoal = false;
            if (window.subjectTimeLinks && window.subjectTimeLinks[subName]) {
                const link = window.subjectTimeLinks[subName];
                if (link.type === 'date') {
                    hasTimeGoal = true;
                    if (link.startDate) startDate = parseDateSafe(link.startDate);
                    targetDate = parseDateSafe(link.date);
                } else if (link.type === 'goal') {
                    const pg = window.paceGoals.find(g => g.id === link.id);
                    if (pg) {
                        hasTimeGoal = true;
                        if (pg.startDate) startDate = parseDateSafe(pg.startDate);
                        targetDate = parseDateSafe(pg.deadline);
                    }
                }
            }

            if (!hasTimeGoal) {
                let firstCompletedDay = allSubTasks.find(t => t[key] && t[key].some(b => b.subject === subName && b.completed));
                if (firstCompletedDay) {
                    let taskO = firstCompletedDay[key].find(b => b.subject === subName && b.completed);
                    if (taskO.completedAt) {
                        startDate = new Date(taskO.completedAt);
                    } else {
                        startDate = getTaskDate(firstCompletedDay);
                    }
                }
            }

            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (targetDate) targetDate.setHours(23, 59, 59, 999);

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;

            let remainingCh = Math.max(0, totalChapters - completedCount);
            let actPaceRaw = 0;
            let reqPaceRaw = 0;

            let actualStartDateForPace = null;
            let firstCompletedDayForPace = allSubTasks.find(t => t[key] && t[key].some(b => b.subject === subName && b.completed));
            if (firstCompletedDayForPace) {
                let taskO = firstCompletedDayForPace[key].find(b => b.subject === subName && b.completed);
                actualStartDateForPace = taskO.completedAt ? new Date(taskO.completedAt) : getTaskDate(firstCompletedDayForPace);
                actualStartDateForPace.setHours(0, 0, 0, 0);
            }

            let daysElapsed = 0;
            if (totalChapters > 0) {
                if (completedCount > 0 && actualStartDateForPace && actualStartDateForPace <= today) {
                    daysElapsed = Math.floor((today - actualStartDateForPace) / msPerDay) + 1;
                    actPaceRaw = completedCount / daysElapsed;
                } else if (startDate && startDate <= today) {
                    daysElapsed = Math.floor((today - startDate) / msPerDay) + 1;
                    actPaceRaw = completedCount / daysElapsed;
                }

                if (hasTimeGoal && targetDate) {
                    if (today > targetDate) {
                        reqPaceRaw = remainingCh > 0 ? remainingCh : 0;
                    } else {
                        let baselineDateForReq = (startDate && startDate > today) ? startDate : today;
                        const daysRemaining = Math.max(1, Math.ceil((targetDate - baselineDateForReq) / msPerDay));
                        reqPaceRaw = remainingCh / daysRemaining;
                    }
                }
            }

            const actPaceStr = actPaceRaw.toFixed(2);
            const reqPaceStr = hasTimeGoal ? reqPaceRaw.toFixed(2) : '--';

            let estFinishStr = '--';
            let estDaysNeededStr = '<span class="opacity-60">Unknown</span>';
            const isFrozenSub = (window.passedItems && window.passedItems.subjects && window.passedItems.subjects.includes(subName)) ||
                (window.passedItems && window.passedItems.programs && window.passedItems.programs.includes(sObj ? sObj.program : ''));
            if (isFrozenSub || completedCount >= totalChapters) {
                estFinishStr = '<span class="text-emerald-500 font-black">Finished</span>';
                estDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
            } else if (completedCount === 0) {
                estFinishStr = '<span class="text-slate-400 text-[10px]">No Data</span>';
            } else if (actPaceRaw > 0) {
                const daysLeft = remainingCh / actPaceRaw;
                const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
                estFinishStr = estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                estDaysNeededStr = `${Math.ceil(daysLeft)} Days Needed`;
            }

            let timeGoalCountdownStr = '';
            if (isFrozenSub || completedCount >= totalChapters) {
                timeGoalCountdownStr = '<span class="text-emerald-500 font-bold">Done</span>';
            } else if (!hasTimeGoal) {
                timeGoalCountdownStr = '<span class="text-slate-400 font-bold">No Goal</span>';
            } else {
                let diffDaysTG = Math.ceil((targetDate - today) / msPerDay);
                if (diffDaysTG > 0) timeGoalCountdownStr = `${diffDaysTG} Days Left`;
                else if (diffDaysTG === 0) timeGoalCountdownStr = `<span class="text-orange-500 font-bold">Due Today</span>`;
                else timeGoalCountdownStr = `<span class="text-red-500 font-bold">${Math.abs(diffDaysTG)} Days Overdue</span>`;
            }

            const reqEl = document.getElementById(`tg-req-${safeSubId}`);
            if (reqEl) reqEl.textContent = reqPaceStr;

            const actEl = document.getElementById(`tg-act-${safeSubId}`);
            if (actEl) actEl.textContent = actPaceStr;

            let subjectDaysPassedStr = '<span class="opacity-60">0 Days Passed</span>';
            if (completedCount > 0 && daysElapsed > 0) {
                subjectDaysPassedStr = `${window.formatDaysPassed(daysElapsed)} Passed`;
            }
            const actDaysEl = document.getElementById(`tg-act-days-${safeSubId}`);
            if (actDaysEl) actDaysEl.innerHTML = subjectDaysPassedStr;

            const estEl1 = document.getElementById(`tg-est-${safeSubId}`);
            if (estEl1) estEl1.innerHTML = estFinishStr;

            const estEl2 = document.getElementById(`header-est-${safeSubId}`);
            if (estEl2) estEl2.innerHTML = estFinishStr;

            const tgDaysEl = document.getElementById(`tg-tg-days-${safeSubId}`);
            if (tgDaysEl) tgDaysEl.innerHTML = timeGoalCountdownStr;

            const estDaysEl = document.getElementById(`tg-est-days-${safeSubId}`);
            if (estDaysEl) estDaysEl.innerHTML = estDaysNeededStr;

            // Core Global updates & Saves
            updateMetrics();
            saveToCloud();

            // Smart background debounce for heavy canvas operations
            if (window.chartDebounce) clearTimeout(window.chartDebounce);
            window.chartDebounce = setTimeout(() => {
                requestAnimationFrame(renderTrendCharts);
            }, 600);
        }

        function updateMetrics() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;

            const subjectStats = {};
            window.getAllSubjects().forEach(sub => { subjectStats[sub.subject] = { totalChapters: sub.chapters, tasksAssigned: 0, tasksCompleted: 0, earliestCompletedDate: null }; });

            tasks.filter(t => t.type === 'study').forEach(task => {
                window.tracks.forEach(track => {
                    const key = track.id + 'Tasks';
                    if (Array.isArray(task[key])) {
                        task[key].forEach(subTask => {
                            if (subjectStats[subTask.subject]) {
                                subjectStats[subTask.subject].tasksAssigned++;
                                if (subTask.completed) {
                                    subjectStats[subTask.subject].tasksCompleted++;
                                    let d = subTask.completedAt ? new Date(subTask.completedAt) : getTaskDate(task);
                                    if (isNaN(d.getTime())) d = getTaskDate(task);
                                    if (!subjectStats[subTask.subject].earliestCompletedDate || d < subjectStats[subTask.subject].earliestCompletedDate) {
                                        subjectStats[subTask.subject].earliestCompletedDate = d;
                                    }
                                }
                            }
                        });
                    }
                });
            });

            for (const sub in subjectStats) {
                const stats = subjectStats[sub];
                const sObj = window.getAllSubjects().find(s => s.subject === sub);
                const isFrozen = window.passedItems && ((window.passedItems.subjects && window.passedItems.subjects.includes(sub)) || (window.passedItems.programs && sObj && window.passedItems.programs.includes(sObj.program)));

                if (isFrozen) {
                    stats.effectiveChapters = stats.totalChapters;
                } else {
                    const ratio = stats.tasksAssigned > 0 ? stats.tasksCompleted / stats.tasksAssigned : 0;
                    stats.effectiveChapters = ratio * stats.totalChapters;
                }

                // Calculate subject actual pace
                let actualPace = 0;
                if (stats.earliestCompletedDate) {
                    const start = new Date(stats.earliestCompletedDate);
                    start.setHours(0, 0, 0, 0);
                    if (start <= today) {
                        const daysElapsed = Math.floor((today - start) / msPerDay) + 1;
                        actualPace = stats.effectiveChapters / daysElapsed;
                    }
                }
                stats.actualPace = actualPace;
            }

            window.lastSubjectStats = subjectStats; // Cache for the details modal

            // 1. Calculate Absolute Completion Progress (Top UI Bar - ALL SUBJECTS)
            let scopeTotalChapters = 0;
            let scopeCompleted = 0;
            const allSubs = window.getAllSubjects().map(s => s.subject);
            allSubs.forEach(sub => {
                if (subjectStats[sub]) {
                    scopeTotalChapters += subjectStats[sub].totalChapters;
                    scopeCompleted += subjectStats[sub].effectiveChapters;
                }
            });

            const percentage = scopeTotalChapters > 0 ? Math.round((scopeCompleted / scopeTotalChapters) * 100) : 0;
            const displayCompleted = Math.round(scopeCompleted);

            safeSetText('progress-title', "Global Overall Completion");
            safeSetText('progress-text', `${percentage}%`);
            safeSetText('progress-detail', `${displayCompleted} / ${scopeTotalChapters} Chapters`);

            const pBar = document.getElementById('progress-bar');
            if (pBar) pBar.style.width = `${percentage}%`;

            // 2. Accurate Aggregated Pace Engine (Top Boxes)
            if (!globalStartDate || !globalEndDate) {
                // FALLBACK: Use actual pace based on 1st completed chapter across the entire system
                let earliestDate = null;
                tasks.forEach(t => {
                    if (t.type === 'study') {
                        window.tracks.forEach(track => {
                            const key = track.id + 'Tasks';
                            if (Array.isArray(t[key])) {
                                t[key].forEach(b => {
                                    if (b.completed) {
                                        let d = b.completedAt ? new Date(b.completedAt) : getTaskDate(t);
                                        if (!earliestDate || d < earliestDate) earliestDate = d;
                                    }
                                });
                            }
                        });
                    }
                });

                let paceTotalChapters = scopeTotalChapters;
                let paceCompleted = scopeCompleted;
                let remaining = Math.max(0, paceTotalChapters - paceCompleted);

                let globalCurPace = 0;
                let start = earliestDate ? new Date(earliestDate) : new Date(today);
                start.setHours(0, 0, 0, 0);

                if (earliestDate && start <= today) {
                    const daysElapsed = Math.floor((today - start) / msPerDay) + 1;
                    globalCurPace = paceCompleted / daysElapsed;
                }

                window.latestPaceData = {
                    total: paceTotalChapters,
                    completed: paceCompleted,
                    start: new Date(start),
                    end: globalCurPace > 0 ? new Date(today.getTime() + (remaining / globalCurPace) * msPerDay) : new Date(today),
                    today: new Date(today),
                    reqPace: 0,
                    curPace: globalCurPace,
                    projectedDate: paceTotalChapters === 0 || globalCurPace <= 0 ? new Date(0) : new Date(today.getTime() + (remaining / globalCurPace) * msPerDay),
                    subjects: allSubs
                };

                const currentPaceDisplay = globalCurPace.toFixed(2);
                safeSetText('target-req-pace', `--`);
                safeSetText('current-pace-stat', `${currentPaceDisplay} Ch/Day`);

                let finishDisplay = '';
                let globalDaysLeftStr = '<span class="opacity-50">--</span>';
                let globalDaysNeededStr = '<span class="opacity-50">--</span>';
                let globalDaysPassedStr = '<span class="opacity-50">--</span>';

                if (paceTotalChapters === 0) {
                    finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Targets</span>';
                } else if (remaining <= 0) {
                    finishDisplay = '<span class="text-emerald-500">Finished!</span>';
                    globalDaysLeftStr = '<span class="text-emerald-500 font-bold">Done</span>';
                    globalDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
                    if (earliestDate) {
                        const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay) + 1);
                        globalDaysPassedStr = `${window.formatDaysPassed(daysElapsed)} Passed`;
                    }
                } else if (globalCurPace <= 0) {
                    finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Data</span>';
                    globalDaysLeftStr = '<span class="opacity-50">--</span>';
                } else {
                    let projDate = window.latestPaceData.projectedDate;
                    finishDisplay = projDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                    const globalDaysLeftNeed = remaining / globalCurPace;
                    globalDaysNeededStr = `${Math.ceil(globalDaysLeftNeed)} Days Needed`;
                    globalDaysLeftStr = '<span class="text-slate-400 font-bold">No Goal</span>';
                    if (earliestDate) {
                        const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay) + 1);
                        globalDaysPassedStr = `${window.formatDaysPassed(daysElapsed)} Passed`;
                    }
                }

                safeSetHtml('projected-finish', finishDisplay);

                const globalLeftEl = document.getElementById('global-days-left');
                if (globalLeftEl) globalLeftEl.innerHTML = globalDaysLeftStr;

                const globalNeedEl = document.getElementById('global-days-needed');
                if (globalNeedEl) globalNeedEl.innerHTML = globalDaysNeededStr;

                const globalPassedEl = document.getElementById('global-days-passed');
                if (globalPassedEl) globalPassedEl.innerHTML = globalDaysPassedStr;

                let timelineText = earliestDate ? `Started: ${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` : `Not Started`;
                safeSetHtml('pace-timeline-info', `<span class="text-slate-500 font-bold">Global Baseline</span> <span class="mx-1 opacity-50">|</span> <span class="tracking-widest text-[9px] uppercase">${timelineText}</span>`);

                const statusLabel = document.getElementById('target-status-label');
                if (statusLabel) {
                    statusLabel.className = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm";
                    statusLabel.textContent = "NO TARGETS SET";
                }

                let progComment = { text: "No global pace goal is set. Actual pace is calculating dynamically from your first completed chapter.", icon: "📊", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
                safeSetHtml('prog-comment', `<div class="flex items-start space-x-3 p-3.5 rounded-xl border ${progComment.bg} ${progComment.border} shadow-sm transition-all duration-300 hover:shadow-md"><span class="text-lg md:text-xl drop-shadow-sm">${progComment.icon}</span><p class="text-[10px] md:text-xs font-bold leading-relaxed mt-0.5 ${progComment.color}">${progComment.text}</p></div>`);
            } else {
                // Find all subjects explicitly targeted by ANY goal
                let targetedSubjects = new Set();
                const globalGoal = window.paceGoals.find(g => g.type === 'global');

                if (globalGoal) {
                    const isManualGlobal = globalGoal.subjects || globalGoal.secondaryPaces;
                    if (isManualGlobal) {
                        if (globalGoal.subjects) globalGoal.subjects.forEach(s => targetedSubjects.add(s));
                        if (globalGoal.secondaryPaces) {
                            globalGoal.secondaryPaces.forEach(pid => {
                                const g = window.paceGoals.find(x => x.id === pid);
                                if (g) {
                                    if (g.type === 'bundle') {
                                        if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                                        if (g.programs) {
                                            window.tracks.map(t => t.id).forEach(track => {
                                                if (syllabusStructure[track]) {
                                                    syllabusStructure[track].forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); });
                                                }
                                            });
                                        }
                                    } else if (g.type === 'subject') {
                                        targetedSubjects.add(g.target);
                                    } else if (g.type === 'program') {
                                        window.tracks.map(t => t.id).forEach(track => {
                                            if (syllabusStructure[track]) {
                                                syllabusStructure[track].forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); });
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    } else {
                        window.paceGoals.forEach(g => {
                            if (g.type === 'global') return;

                            // Strict Time Period Constraint: Only aggregate if this goal intersects with the global timeline
                            const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                            const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                            gStart.setHours(0, 0, 0, 0);
                            gEnd.setHours(23, 59, 59, 999);

                            if (gEnd < globalStartDate || gStart > globalEndDate) return; // Ignore if completely outside global period

                            if (g.type === 'bundle') {
                                if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                                if (g.programs) {
                                    window.tracks.map(t => t.id).forEach(track => {
                                        if (syllabusStructure[track]) {
                                            syllabusStructure[track].forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); });
                                        }
                                    });
                                }
                            } else if (g.type === 'subject') {
                                targetedSubjects.add(g.target);
                            } else if (g.type === 'program') {
                                window.tracks.map(t => t.id).forEach(track => {
                                    if (syllabusStructure[track]) {
                                        syllabusStructure[track].forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); });
                                    }
                                });
                            }
                        });
                    }
                }

                let paceTotalChapters = 0;
                let paceCompleted = 0;
                targetedSubjects.forEach(sub => {
                    if (subjectStats[sub]) {
                        paceTotalChapters += subjectStats[sub].totalChapters;
                        paceCompleted += subjectStats[sub].effectiveChapters;
                    }
                });

                const start = new Date(globalStartDate); start.setHours(0, 0, 0, 0);
                const end = new Date(globalEndDate); end.setHours(23, 59, 59, 999);

                const remaining = Math.max(0, paceTotalChapters - paceCompleted);
                const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));
                const daysElapsed = Math.floor((today - start) / msPerDay) + 1;
                const daysRemaining = Math.max(0, Math.ceil((end - today) / msPerDay));

                let globalReqPace = 0;
                let globalCurPace = 0;

                if (paceTotalChapters > 0) {
                    if (today < start) {
                        globalReqPace = paceTotalChapters / totalDays;
                        globalCurPace = 0;
                    } else if (today > end) {
                        globalReqPace = remaining > 0 ? remaining : 0;
                        globalCurPace = paceCompleted / daysElapsed;
                    } else {
                        globalReqPace = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                        globalCurPace = paceCompleted / daysElapsed;
                    }
                }

                // Save Pace Data for the Chart specifically
                window.latestPaceData = {
                    total: paceTotalChapters,
                    completed: paceCompleted,
                    start: new Date(start),
                    end: new Date(end),
                    today: new Date(today),
                    reqPace: globalReqPace,
                    curPace: globalCurPace,
                    projectedDate: paceTotalChapters === 0 || globalCurPace <= 0 ? new Date(0) : new Date(today.getTime() + (remaining / globalCurPace) * msPerDay),
                    subjects: Array.from(targetedSubjects)
                };

                // UI Formatting for Pace Section
                const currentPaceDisplay = globalCurPace.toFixed(2);
                const reqPaceDisplay = globalReqPace.toFixed(2);

                let maxProjectedDate = window.latestPaceData.projectedDate;
                let finishDisplay = '';

                let globalDaysLeftStr = '<span class="opacity-50">--</span>';
                let globalDaysNeededStr = '<span class="opacity-50">--</span>';
                let globalDaysPassedStr = '<span class="opacity-50">--</span>';
                let diffGlobalDaysTG = Math.ceil((end - today) / msPerDay);

                if (paceTotalChapters === 0) {
                    finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Targets</span>';
                } else if (remaining <= 0) {
                    finishDisplay = '<span class="text-emerald-500">Finished!</span>';
                    globalDaysLeftStr = '<span class="text-emerald-500 font-bold">Done</span>';
                    globalDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
                    globalDaysPassedStr = `${window.formatDaysPassed(Math.max(0, daysElapsed))} Passed`;
                } else if (globalCurPace <= 0) {
                    if (today < start) finishDisplay = '<span class="text-sm font-black text-blue-400 uppercase tracking-widest">Future Timeline</span>';
                    else if (today > end) finishDisplay = '<span class="text-sm font-black text-red-500 uppercase tracking-widest">Overdue</span>';
                    else finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Data</span>';

                    if (diffGlobalDaysTG > 0) globalDaysLeftStr = `${diffGlobalDaysTG} Days Left`;
                    else if (diffGlobalDaysTG === 0) globalDaysLeftStr = `<span class="text-orange-400">Due Today</span>`;
                    else globalDaysLeftStr = `<span class="text-red-400">${Math.abs(diffGlobalDaysTG)} Days Overdue</span>`;
                    globalDaysPassedStr = `${window.formatDaysPassed(Math.max(0, daysElapsed))} Passed`;
                } else {
                    finishDisplay = maxProjectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

                    if (diffGlobalDaysTG > 0) globalDaysLeftStr = `${diffGlobalDaysTG} Days Left`;
                    else if (diffGlobalDaysTG === 0) globalDaysLeftStr = `<span class="text-orange-400">Due Today</span>`;
                    else globalDaysLeftStr = `<span class="text-red-400">${Math.abs(diffGlobalDaysTG)} Days Overdue</span>`;

                    const globalDaysLeftNeed = remaining / globalCurPace;
                    globalDaysNeededStr = `${Math.ceil(globalDaysLeftNeed)} Days Needed`;
                    globalDaysPassedStr = `${window.formatDaysPassed(Math.max(0, daysElapsed))} Passed`;
                }

                safeSetText('target-req-pace', `${reqPaceDisplay} Ch/Day`);
                safeSetText('current-pace-stat', `${currentPaceDisplay} Ch/Day`);
                safeSetHtml('projected-finish', finishDisplay);

                const globalLeftEl = document.getElementById('global-days-left');
                if (globalLeftEl) globalLeftEl.innerHTML = globalDaysLeftStr;

                const globalNeedEl = document.getElementById('global-days-needed');
                if (globalNeedEl) globalNeedEl.innerHTML = globalDaysNeededStr;

                const globalPassedEl = document.getElementById('global-days-passed');
                if (globalPassedEl) globalPassedEl.innerHTML = globalDaysPassedStr;

                let timelineText = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} &rarr; ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
                safeSetHtml('pace-timeline-info', `<span class="text-blue-500 font-bold">Global Baseline</span> <span class="mx-1 opacity-50">|</span> <span class="tracking-widest text-[9px] uppercase">${timelineText}</span>`);

                const statusLabel = document.getElementById('target-status-label');
                if (statusLabel) {
                    if (paceTotalChapters === 0) {
                        statusLabel.className = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm";
                        statusLabel.textContent = "NO TARGETS SET";
                    } else if (today < start) {
                        statusLabel.className = "text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest drop-shadow-sm";
                        statusLabel.textContent = "TIMELINES START IN FUTURE";
                    } else if (today > end && remaining > 0) {
                        statusLabel.className = "text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest drop-shadow-sm";
                        statusLabel.textContent = "TIMELINE OVERDUE";
                    } else if (globalCurPace >= globalReqPace && globalReqPace > 0) {
                        statusLabel.className = "text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest drop-shadow-sm";
                        statusLabel.textContent = `TARGET: ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
                    } else {
                        statusLabel.className = "text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest drop-shadow-sm";
                        statusLabel.textContent = `TARGET: ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
                    }
                }

                // Dynamic Contextual Comments
                let progComment = {};
                if (paceTotalChapters === 0) {
                    progComment = { text: "No pace goals are mapped. Add a goal in Master Configuration to track speed.", icon: "📭", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" };
                } else if (today < start) {
                    progComment = { text: "Your assigned timelines haven't started yet. Get ready to begin when the time comes!", icon: "⏳", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
                } else if (today > end && remaining > 0) {
                    progComment = { text: "The target timeline has expired but tasks remain. You are currently overdue!", icon: "⏰", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/50" };
                } else if (remaining <= 0 && paceTotalChapters > 0) {
                    progComment = { text: "Target timelines completely finished! Outstanding achievement.", icon: "🏆", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/50" };
                } else if (globalCurPace >= globalReqPace && globalCurPace > 0) {
                    progComment = { text: "Excellent pace! You are on track to beat your aggregated deadlines.", icon: "🚀", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/50" };
                } else if (globalCurPace >= globalReqPace * 0.75 && globalCurPace > 0) {
                    progComment = { text: "Good steady progress, but slightly behind the required timeline. Push a bit harder!", icon: "👍", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
                } else if (globalCurPace > 0) {
                    progComment = { text: "You're falling behind the required pace. Time to double down on studies!", icon: "⚠️", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800/50" };
                } else {
                    progComment = { text: "No chapters completed in this active timeline yet! Start ticking off tasks to build momentum.", icon: "🚨", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/50" };
                }

                safeSetHtml('prog-comment', `<div class="flex items-start space-x-3 p-3.5 rounded-xl border ${progComment.bg} ${progComment.border} shadow-sm transition-all duration-300 hover:shadow-md"><span class="text-lg md:text-xl drop-shadow-sm">${progComment.icon}</span><p class="text-[10px] md:text-xs font-bold leading-relaxed mt-0.5 ${progComment.color}">${progComment.text}</p></div>`);
            }

            renderSubjectProgress(subjectStats);
            renderSubjectNavigation();
            renderCategoryProgress(subjectStats);
            window.renderPaceGoals(subjectStats);

            if (progressChart) { progressChart.data.datasets[0].data = [displayCompleted, scopeTotalChapters - displayCompleted]; progressChart.update(); }

            // Live Sync for Modals
            if (document.getElementById('pace-trend-modal') && !document.getElementById('pace-trend-modal').classList.contains('hidden')) {
                window.renderPaceTrendChart(window.activeTrendGoalId);
            }
            if (document.getElementById('revision-trend-modal') && !document.getElementById('revision-trend-modal').classList.contains('hidden')) {
                window.renderRevisionTrendChart();
            }
        }

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
                        <button onclick="openModal('analytics-modal', '${cfg.id}')" class="group flex items-center justify-center p-2 md:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"><svg class="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover:${cMap.iconColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></button>
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
                            class="flex items-center justify-between p-3.5 rounded-2xl border font-black text-xs transition-all duration-300 active:scale-95 text-left w-full gap-2 ${cardClass}"
                            style="${isActive ? activeStyle : ''}">
                        <div class="flex items-center space-x-2 min-w-0">
                            <div class="p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : cMap.iconBg + ' ' + cMap.text + ' ' + cMap.borderLt + ' border'} shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">${getSVG(cfg.icon, cfg.title)}</svg>
                            </div>
                            <div class="min-w-0">
                                <span class="block text-xs font-black truncate leading-tight">${cfg.title}</span>
                                <span class="block text-[8px] uppercase tracking-wider font-bold opacity-75 truncate mt-0.5">${isActive ? 'YES' : 'NO'}</span>
                            </div>
                        </div>
                        <div class="shrink-0">
                            ${isActive 
                                ? `<span class="flex h-5 w-5 rounded-full bg-white text-emerald-500 items-center justify-center shadow-sm font-black">✓</span>`
                                : `<span class="flex h-5 w-5 rounded-full border border-slate-350 dark:border-slate-600 bg-white dark:bg-slate-850 text-slate-400 dark:text-slate-500 items-center justify-center text-[10px] font-black">✕</span>`
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


// Expose functions to window namespace
window.generateStudyPlan = generateStudyPlan;
window.setupFocusTodayButton = setupFocusTodayButton;
window.renderTaskList = renderTaskList;
window.generateRevisionTaskHtml = generateRevisionTaskHtml;
window.generateSingleTaskHtml = generateSingleTaskHtml;
window.handleTaskToggle = handleTaskToggle;
window.updateMetrics = updateMetrics;
