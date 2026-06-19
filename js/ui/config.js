        window.openDailyActionsDBModal = function () {
            const containerDate = document.getElementById('dadb-view-date');
            const containerAction = document.getElementById('dadb-view-action');
            const ctxTrend = document.getElementById('dadbTrendChart');
            if (!containerDate || !containerAction || !ctxTrend) return;

            let htmlDate = '';
            let htmlAction = '';

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const cutoffDate = new Date(PLAN_START_DATE.getTime());

            let hasData = false;

            let actionStats = {};
            window.customActions.forEach(a => actionStats[a.id] = { name: a.title, color: a.color, count: 0 });
            let validDaysCount = 0;

            let trendLabels = [];
            let trendData = [];
            let trendColors = [];

            let dateEntries = [];

            for (let i = tasks.length - 1; i >= 0; i--) {
                const t = tasks[i];
                const tDate = getTaskDate(t);
                if (tDate > today || tDate < cutoffDate) continue;

                validDaysCount++;

                let doneActions = [];
                window.customActions.forEach(a => {
                    if (t[a.id]) {
                        doneActions.push(a.title);
                        actionStats[a.id].count++;
                    }
                });

                const pct = window.customActions.length > 0 ? Math.round((doneActions.length / window.customActions.length) * 100) : 0;

                trendLabels.unshift(t.date.split(' ')[0] + ' ' + t.date.split(' ')[1]);
                trendData.unshift(pct);

                let bgClass = 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700';
                let pctColor = 'text-slate-500';
                let barColor = '#64748b';

                if (pct > 0 && pct <= 25) { pctColor = 'text-red-500'; bgClass = 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'; barColor = '#ef4444'; }
                else if (pct > 25 && pct <= 50) { pctColor = 'text-orange-500'; bgClass = 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50'; barColor = '#f97316'; }
                else if (pct > 50 && pct <= 75) { pctColor = 'text-lime-500'; bgClass = 'bg-lime-50/50 dark:bg-lime-900/10 border-lime-100 dark:border-lime-800/50'; barColor = '#84cc16'; }
                else if (pct > 75) { pctColor = 'text-emerald-500'; bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50'; barColor = '#10b981'; }

                trendColors.unshift(barColor);

                if (doneActions.length === 0 && tDate.getTime() !== today.getTime()) continue;

                if (window.dadbActionFilter !== 'ALL' && !t[window.dadbActionFilter]) continue;

                const actionsList = doneActions.length > 0 ? doneActions.join('<span class="mx-1.5 opacity-40">|</span>') : '<span class="opacity-50">No actions logged</span>';

                dateEntries.push({ date: t.date, actionsList, pct, pctColor, bgClass });
                hasData = true;
            }

            if (window.dadbSortOrder === 'asc') {
                dateEntries.reverse();
            } else if (window.dadbSortOrder === 'pct-desc') {
                dateEntries.sort((a, b) => b.pct - a.pct);
            } else if (window.dadbSortOrder === 'pct-asc') {
                dateEntries.sort((a, b) => a.pct - b.pct);
            }

            let sortLabel = 'Latest First';
            if (window.dadbSortOrder === 'asc') sortLabel = 'Oldest First';
            if (window.dadbSortOrder === 'pct-desc') sortLabel = 'Highest Completion';
            if (window.dadbSortOrder === 'pct-asc') sortLabel = 'Lowest Completion';

            let filterOptions = `<option value="ALL">Filter: All</option>`;
            window.customActions.forEach(a => {
                filterOptions += `<option value="${a.id}" ${window.dadbActionFilter === a.id ? 'selected' : ''}>Filter: ${a.title}</option>`;
            });

            htmlDate = `
                <div class="flex justify-between items-center mb-3">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 hidden sm:block">Date Log</span>
                    <div class="flex gap-2 items-center w-full sm:w-auto justify-between sm:justify-end">
                        <div class="relative flex-1 sm:flex-none">
                            <select onchange="window.setDadbFilter(this.value)" class="w-full flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[9px] font-black uppercase tracking-widest transition-colors text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 outline-none cursor-pointer sm:max-w-[150px] md:max-w-[180px] truncate appearance-none pr-6">
                                ${filterOptions}
                            </select>
                            <svg class="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        <button onclick="window.toggleDadbSort()" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[9px] font-black uppercase tracking-widest transition-colors text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 whitespace-nowrap">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                            Sort: ${sortLabel}
                        </button>
                    </div>
                </div>
            `;

            if (hasData) {
                dateEntries.forEach(entry => {
                    htmlDate += `
                        <div class="flex items-center justify-between p-3.5 rounded-xl border ${entry.bgClass} shadow-sm mb-2">
                            <div class="flex flex-col pr-3">
                                <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">${entry.date}</span>
                                <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">${entry.actionsList}</span>
                            </div>
                            <div class="flex items-center justify-center shrink-0 ml-auto bg-white dark:bg-slate-800 px-2.5 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700 min-w-[3rem]">
                                <span class="text-xs md:text-sm font-black ${entry.pctColor}">${entry.pct}%</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                htmlDate += '<div class="p-8 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mt-2">No actions matching your filter recorded yet in the last 180 days.</div>';
            }

            htmlAction = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
            const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
            sortedActions.forEach(a => {
                const stat = actionStats[a.id];
                const actPct = validDaysCount > 0 ? Math.round((stat.count / validDaysCount) * 100) : 0;
                const cMap = twColors[a.color];

                htmlAction += `
                    <div class="p-4 rounded-xl border ${cMap.borderLt} ${cMap.bgLt} shadow-sm flex flex-col gap-2">
                        <div class="flex justify-between items-center">
                            <span class="text-xs md:text-sm font-black ${cMap.text} truncate">${a.title}</span>
                            <span class="text-[10px] font-black px-2 py-0.5 rounded bg-white dark:bg-slate-800 shadow-sm ${cMap.text}">${stat.count} / ${validDaysCount} Days</span>
                        </div>
                        <div class="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden shadow-inner">
                            <div class="h-full rounded-full ${cMap.btn} transition-all duration-700" style="width: ${actPct}%"></div>
                        </div>
                    </div>
                `;
            });
            htmlAction += `</div>`;

            containerDate.innerHTML = htmlDate;
            containerAction.innerHTML = htmlAction;

            if (window.dadbTrendChartInstance) window.dadbTrendChartInstance.destroy();
            Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
            window.dadbTrendChartInstance = new Chart(ctxTrend.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Daily Completion %',
                        data: trendData,
                        backgroundColor: trendColors,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#cbd5e1',
                            cornerRadius: 8,
                            padding: 10,
                            callbacks: { label: c => ` ${c.parsed.y}% completed` }
                        }
                    },
                    scales: {
                        y: { min: 0, max: 100, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }, ticks: { font: { weight: 'bold' } } },
                        x: { grid: { display: false, drawBorder: false }, ticks: { font: { weight: 'bold', size: 9 }, maxTicksLimit: 15 } }
                    }
                }
            });

            window.switchDadbTab('date');
            openModal('daily-actions-db-modal');
        };

        window.switchDadbTab = function (tab) {
            window.currentDadbTab = tab;
            ['date', 'action', 'trend'].forEach(t => {
                const view = document.getElementById('dadb-view-' + t);
                const btn = document.getElementById('dadb-tab-btn-' + t);
                if (!view || !btn) return;

                if (t === tab) {
                    view.classList.remove('hidden');
                    btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-blue-600 text-white shadow-md whitespace-nowrap";
                } else {
                    view.classList.add('hidden');
                    btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap";
                }
            });

            if (tab === 'trend' && window.dadbTrendChartInstance) {
                setTimeout(() => window.dadbTrendChartInstance.resize(), 50);
            }
        };

        window.toggleModalDay = function (taskId, typeKey) {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                tasks[taskIndex][typeKey] = !tasks[taskIndex][typeKey]; saveToCloud();
                requestAnimationFrame(() => {
                    renderTrendCharts(); renderDailyTracker(); renderDailyLogs();
                    const modal = document.getElementById('analytics-modal');
                    if (modal && !modal.classList.contains('hidden')) populateAnalyticsModal(typeKey);
                    const dbModal = document.getElementById('daily-actions-db-modal');
                    if (dbModal && !dbModal.classList.contains('hidden')) window.openDailyActionsDBModal();
                });
            }
        };

        window.openEditModal = function (taskId, type, subTaskId = null) {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;
            const dayTask = tasks[taskIndex];
            const key = type + 'Tasks';
            let taskObj = (dayTask[key] || []).find(b => b.id === subTaskId);
            if (!taskObj) return;

            window.editingTask = { taskId, type, subTaskId, oldSubject: taskObj.subject };
            const prog = type;
            const subjSelect = document.getElementById('edit-task-subject');
            subjSelect.innerHTML = '<option value="Revision">Revision (Empty Slot)</option>';

            if (window.customPrograms[prog]) {
                window.customPrograms[prog].forEach(p => {
                    const pName = p.name || p;
                    const subs = (syllabusStructure[prog] || []).filter(s => s.program === pName);
                    if (subs.length > 0) {
                        let groupHtml = `<optgroup label="${pName}">`;
                        subs.forEach(s => { groupHtml += `<option value="${s.subject}" ${s.subject === taskObj.subject ? 'selected' : ''}>${s.subject}</option>`; });
                        groupHtml += `</optgroup>`; subjSelect.innerHTML += groupHtml;
                    }
                });
            }

            let chNum = taskObj.chapter.replace('Ch. ', ''); if (taskObj.subject === 'Revision') chNum = '';
            document.getElementById('edit-task-num').value = chNum;
            document.getElementById('edit-task-title').value = taskObj.title === 'Practice' ? '' : taskObj.title;
            openModal('edit-task-modal');
        };

        window.saveTaskEdit = function () {
            if (!window.editingTask) return;
            const { taskId, type, subTaskId, oldSubject } = window.editingTask;
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;

            const prog = type;
            const newSubject = document.getElementById('edit-task-subject').value;
            let newNum = document.getElementById('edit-task-num').value;
            let newTitle = document.getElementById('edit-task-title').value;

            if (newSubject === 'Revision') { window.requestDeleteTask(); return; }

            newNum = newNum ? `Ch. ${newNum}` : 'Ch. ?';
            newTitle = newTitle || 'Topic';

            const key = type + 'Tasks';
            if (oldSubject === newSubject) {
                const bIdx = (tasks[taskIndex][key] || []).findIndex(b => b.id === subTaskId);
                if (bIdx > -1) tasks[taskIndex][key][bIdx] = { ...tasks[taskIndex][key][bIdx], chapter: newNum, title: newTitle };
                reorderSubjectChapters(prog, newSubject);
            } else {
                if (oldSubject !== 'Revision') { const oldS = (syllabusStructure[prog] || []).find(s => s.subject === oldSubject); if (oldS && oldS.chapters > 0) oldS.chapters--; }
                const bIdx = (tasks[taskIndex][key] || []).findIndex(b => b.id === subTaskId);
                if (bIdx > -1) tasks[taskIndex][key][bIdx] = { subject: newSubject, chapter: newNum, title: newTitle, completed: false, id: subTaskId };
                const newS = (syllabusStructure[prog] || []).find(s => s.subject === newSubject); if (newS) newS.chapters++;
                reorderSubjectChapters(prog, oldSubject); reorderSubjectChapters(prog, newSubject);
            }
            recalculateTotals(); saveToCloud(); renderUI(); closeModal('edit-task-modal'); showToast("Task updated successfully!", "success");
        };

        window.requestDeleteTask = function () {
            window.openConfirmModal("Clear Task Slot", "Are you sure you want to clear this task? The subsequent schedule will automatically shift up.", window.deleteTask);
        };

        window.deleteTask = function () {
            if (!window.editingTask) return;
            const { taskId, type, subTaskId, oldSubject } = window.editingTask;
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;

            const prog = type;
            const key = type + 'Tasks';

            if (oldSubject !== 'Revision') { const oldS = (syllabusStructure[prog] || []).find(s => s.subject === oldSubject); if (oldS && oldS.chapters > 0) oldS.chapters--; }
            if (Array.isArray(tasks[taskIndex][key])) {
                tasks[taskIndex][key] = tasks[taskIndex][key].map(b => b.id === subTaskId ? { subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: b.id } : b);
            }

            if (oldSubject !== 'Revision') {
                let targetSlots = []; let gatheredTasks = [];
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i].type !== 'study') continue;
                    if (Array.isArray(tasks[i][key])) {
                        for (let j = 0; j < tasks[i][key].length; j++) {
                            const bTask = tasks[i][key][j];
                            if (!bTask.completed && (bTask.subject === oldSubject || (i === taskIndex && bTask.id === subTaskId))) {
                                targetSlots.push({ tIdx: i, bIdx: j });
                                gatheredTasks.push({ ...bTask });
                            }
                        }
                    }
                }
                const extractNum = (chStr) => { if (chStr === 'Rev') return 9999; const match = chStr.match(/(\d+)(?!.*\d)/); return match ? parseInt(match[0]) : 999; };
                gatheredTasks.sort((a, b) => { if (a.subject === 'Revision') return 1; if (b.subject === 'Revision') return -1; return extractNum(a.chapter) - extractNum(b.chapter); });
                for (let k = 0; k < targetSlots.length; k++) {
                    const slot = targetSlots[k]; const chObj = gatheredTasks[k];
                    tasks[slot.tIdx][key][slot.bIdx] = { ...chObj, id: tasks[slot.tIdx][key][slot.bIdx].id };
                }
            }
            recalculateTotals(); saveToCloud(); renderUI(); closeModal('edit-task-modal'); showToast("Task deleted and schedule shifted up.", "success");
        };

        // --- Configuration & Expansion System Logic ---

        window.switchSysTab = function (tab) {
            ['chapter', 'subject', 'program', 'manage', 'priority', 'track'].forEach(t => {
                const btn = document.getElementById(`sys-tab-${t}`);
                const content = document.getElementById(`sys-content-${t}`);
                if (!btn || !content) return;

                if (t === tab) {
                    btn.classList.add('bg-blue-600', 'text-white', 'shadow-md'); btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md'); btn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
                    content.classList.add('hidden');
                }
            });
            if (tab === 'chapter') updateChProgDropdown();
            if (tab === 'subject') updateSubProgDropdown();
            if (tab === 'manage') window.updateManageDropdown();
            if (tab === 'priority') window.renderPriorityConfig();
            if (tab === 'track') window.renderTrackList();
        };

        window.updateManageDropdown = function () {
            const type = document.getElementById('manage-type').value;
            const targetSelect = document.getElementById('manage-target');
            const trackBox = document.getElementById('manage-track-box');
            const progBox = document.getElementById('manage-program-box');
            targetSelect.innerHTML = '';

            if (type === 'action') {
                trackBox.classList.add('hidden');
                progBox.classList.add('hidden');
                const sortedActions = [...window.customActions].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                sortedActions.forEach(a => targetSelect.innerHTML += `<option value="${a.id}">${a.title}</option>`);
            } else if (type === 'program') {
                trackBox.classList.remove('hidden');
                progBox.classList.add('hidden');
                const track = document.getElementById('manage-track').value;
                if (window.customPrograms[track]) {
                    window.customPrograms[track].forEach(p => {
                        const pName = p.name || p;
                        targetSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
                    });
                }
            } else if (type === 'subject') {
                trackBox.classList.remove('hidden');
                progBox.classList.remove('hidden');
                const track = document.getElementById('manage-track').value;
                const progSelect = document.getElementById('manage-program');
                progSelect.innerHTML = '';
                if (window.customPrograms[track]) {
                    window.customPrograms[track].forEach(p => {
                        const pName = p.name || p;
                        progSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
                    });
                }
                window.updateManageSubjects();
            }
        };

        window.updateManageSubjects = function () {
            const track = document.getElementById('manage-track').value;
            const prog = document.getElementById('manage-program').value;
            const targetSelect = document.getElementById('manage-target');
            targetSelect.innerHTML = '';

            const subs = (syllabusStructure[track] || []).filter(s => s.program === prog).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
            subs.forEach(s => targetSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`);
            if (subs.length === 0) targetSelect.innerHTML = '<option value="">No subjects found</option>';
        };

        window.executeManageEdit = function () {
            const type = document.getElementById('manage-type').value;
            const track = type !== 'action' ? document.getElementById('manage-track').value : null;
            const oldName = document.getElementById('manage-target').value;
            const newName = document.getElementById('manage-new-name').value.trim();

            if (!oldName) return showToast("Please select an item to edit.", "error");
            if (!newName && type !== 'action' && type !== 'program') return showToast("New name cannot be empty.", "error");

            if (type === 'program') {
                let renamed = false;
                if (newName && oldName.toLowerCase() !== newName.toLowerCase()) {
                    if (window.customPrograms[track] && window.customPrograms[track].some(p => (p.name || p).toLowerCase() === newName.toLowerCase())) return showToast("Program already exists.", "error");
                    renamed = true;
                }

                const pIdx = window.customPrograms[track] ? window.customPrograms[track].findIndex(p => (p.name || p) === oldName) : -1;
                if (pIdx > -1) {
                    let progObj = window.customPrograms[track][pIdx];
                    if (typeof progObj !== 'object') {
                        progObj = {
                            id: oldName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'prog-' + pIdx,
                            name: oldName,
                            priority: 3,
                            order: pIdx
                        };
                        window.customPrograms[track][pIdx] = progObj;
                    }

                    if (renamed) {
                        progObj.name = newName;
                    }
                }

                if (renamed) {
                    if (syllabusStructure[track]) {
                        syllabusStructure[track].forEach(s => { if (s.program === oldName) s.program = newName; });
                    }
                    if (window.chartVisibility.prog[oldName] !== undefined) { window.chartVisibility.prog[newName] = window.chartVisibility.prog[oldName]; delete window.chartVisibility.prog[oldName]; }

                    window.paceGoals.forEach(g => {
                        if (g.type === 'program' && g.target === oldName) g.target = newName;
                        if (g.type === 'bundle' && g.programs) {
                            const idx = g.programs.indexOf(oldName);
                            if (idx > -1) g.programs[idx] = newName;
                        }
                    });
                    if (window.passedItems.programs.includes(oldName)) {
                        window.passedItems.programs = window.passedItems.programs.filter(p => p !== oldName);
                        window.passedItems.programs.push(newName);
                    }
                }

                // Update rename on existing overall and subject results
                if (window.successResults) {
                    window.successResults.forEach(r => {
                        if (r.type === 'cgpa' && r.title === (renamed ? newName : oldName)) {
                            if (renamed) {
                                r.title = newName;
                            }
                        }
                    });
                }

                if (renamed) {
                    showToast("Program renamed successfully!", "success");
                } else {
                    showToast("No changes made.", "warning");
                }

            } else if (type === 'subject') {
                if (oldName.toLowerCase() === newName.toLowerCase()) return showToast("New name must be different.", "error");
                const isGlobalDuplicate = window.getAllSubjects().some(s => s.subject.toLowerCase() === newName.toLowerCase());
                if (isGlobalDuplicate) return showToast("Subject name must be unique globally.", "error");

                const sObj = syllabusStructure[track] ? syllabusStructure[track].find(s => s.subject === oldName) : null;
                if (sObj) sObj.subject = newName;

                if (subjectColors[oldName]) subjectColors[newName] = subjectColors[oldName];
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i].type !== 'study') continue;
                    const key = track + 'Tasks';
                    if (Array.isArray(tasks[i][key])) {
                        tasks[i][key].forEach(b => { if (b.subject === oldName) b.subject = newName; });
                    }
                }

                if (currentFilter === oldName) window.currentFilter = newName;
                if (window.chartVisibility.subjects[oldName] !== undefined) { window.chartVisibility.subjects[newName] = window.chartVisibility.subjects[oldName]; delete window.chartVisibility.subjects[oldName]; }

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

                showToast("Subject renamed universally!", "success");

            } else if (type === 'action') {
                if (!newName) return showToast("New title cannot be empty.", "error");
                const act = window.customActions.find(a => a.id === oldName);
                if (act) { act.title = newName; showToast("Action title updated!", "success"); }
            }

            document.getElementById('manage-new-name').value = '';
            saveToCloud(); renderUI(); updateManageDropdown();
        };

        window.requestManageDelete = function () {
            const targetName = document.getElementById('manage-target').value;
            if (!targetName) return showToast("Please select an item to delete.", "error");
            window.openConfirmModal("Delete Item", `Are you sure you want to completely delete "${targetName}"? This action cannot be undone.`, window.executeManageDelete);
        };

        window.executeManageDelete = function () {
            const type = document.getElementById('manage-type').value;
            const targetName = document.getElementById('manage-target').value;
            if (!targetName) return showToast("Please select an item to delete.", "error");

            if (type === 'action') {
                window.customActions = window.customActions.filter(a => a.id !== targetName);
                delete window.chartVisibility.monthly[targetName]; delete window.chartVisibility.yearly[targetName];
                showToast(`Action tracker deleted.`, "success");
            } else {
                const track = document.getElementById('manage-track').value;
                if (type === 'program') {
                    const subsToDelete = (syllabusStructure[track] || []).filter(s => s.program === targetName).map(s => s.subject);
                    window.customPrograms[track] = (window.customPrograms[track] || []).filter(p => (p.name || p) !== targetName);
                    if (syllabusStructure[track]) {
                        syllabusStructure[track] = syllabusStructure[track].filter(s => s.program !== targetName);
                    }
                    delete window.chartVisibility.prog[targetName]; subsToDelete.forEach(sub => delete window.chartVisibility.subjects[sub]);
                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].type !== 'study') continue;
                        const key = track + 'Tasks';
                        if (Array.isArray(tasks[i][key])) {
                            tasks[i][key] = tasks[i][key].map(b => subsToDelete.includes(b.subject) ? { subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: b.id } : b);
                        }
                    }
                    if (currentFilter !== 'All') window.currentFilter = 'All';
                    window.paceGoals = window.paceGoals.filter(g => !(g.type === 'program' && g.target === targetName) && !(g.type === 'subject' && subsToDelete.includes(g.target)));
                    window.paceGoals.forEach(g => {
                        if (g.type === 'bundle' && g.programs) g.programs = g.programs.filter(p => p !== targetName);
                        if (g.type === 'bundle' && g.subjects) g.subjects = g.subjects.filter(s => !subsToDelete.includes(s));
                    });
                    window.passedItems.programs = window.passedItems.programs.filter(p => p !== targetName);
                    window.passedItems.subjects = window.passedItems.subjects.filter(s => !subsToDelete.includes(s));
                    if (window.revisionData.active) window.revisionData.active = window.revisionData.active.filter(s => !subsToDelete.includes(s));
                    if (window.revisionData.progress) subsToDelete.forEach(sub => delete window.revisionData.progress[sub]);
                    if (window.successResults) {
                        window.successResults = window.successResults.filter(r => !(r.type === 'cgpa' && r.title === targetName));
                    }
                    showToast(`Program "${targetName}" and its subjects deleted.`, "success");

                } else if (type === 'subject') {
                    if (syllabusStructure[track]) {
                        syllabusStructure[track] = syllabusStructure[track].filter(s => s.subject !== targetName);
                    }
                    delete window.chartVisibility.subjects[targetName];
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
                    if (window.successResults) {
                        window.successResults = window.successResults.filter(r => !(r.type === 'cgpa' && r.subject === targetName));
                    }
                    showToast(`Subject "${targetName}" deleted.`, "success");
                }
            }

            recalculateTotals(); saveToCloud(); renderUI(); updateManageDropdown();
        };

        window.resetToCleanSlate = function () {
            window.openConfirmModal(
                "Reset Dashboard",
                "Are you sure you want to completely clear all data? This will delete all tracks, programs, subjects, tasks, and history. This action cannot be undone.",
                () => {
                    window.tracks = [];
                    window.customPrograms = {};
                    window.syllabusStructure = {};
                    window.passedItems = { programs: [], subjects: [] };
                    window.revisionData = { active: [], progress: {} };
                    window.subjectTimeLinks = {};
                    window.successResults = [];
                    window.customActions = [];
                    window.paceGoals = [];

                    window.dashboardConfig = {
                        topTag: "",
                        mainTitle: "Study Dashboard",
                        subTitle: "",
                        trendStartDate: new Date().toISOString().split('T')[0]
                    };

                    window.PLAN_START_DATE = new Date();
                    PLAN_START_DATE.setHours(0, 0, 0, 0);
                    window.PLAN_END_DATE = new Date();
                    PLAN_END_DATE.setMonth(PLAN_END_DATE.getMonth() + 10);
                    PLAN_END_DATE.setHours(23, 59, 59, 999);

                    window.tasks = generateStudyPlan();
                    recalculateTotals();

                    saveToCloud(true);
                    renderUI();

                    window.populateTrackDropdowns();
                    window.updateManageDropdown();
                    if (window.renderTrackList) window.renderTrackList();

                    showToast("Dashboard reset successfully to a clean slate!", "success");
                }
            );
        };


        window.updateChProgDropdown = function () {
            const track = document.getElementById('add-ch-track').value;
            const progSelect = document.getElementById('add-ch-program');
            progSelect.innerHTML = '';
            if (window.customPrograms[track]) {
                window.customPrograms[track].forEach(p => {
                    const pName = p.name || p;
                    progSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
                });
            }
            updateChSubjDropdown();
        };

        window.updateChSubjDropdown = function () {
            const track = document.getElementById('add-ch-track').value;
            const prog = document.getElementById('add-ch-program').value;
            const subjSelect = document.getElementById('add-ch-subject');
            subjSelect.innerHTML = '';
            const subs = (syllabusStructure[track] || []).filter(s => s.program === prog).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
            subs.forEach(s => subjSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`);
            if (subs.length === 0) subjSelect.innerHTML = '<option value="">No subjects found</option>';
        };

        window.updateSubProgDropdown = function () {
            const track = document.getElementById('add-sub-track').value;
            const progSelect = document.getElementById('add-sub-program');
            progSelect.innerHTML = '';
            if (window.customPrograms[track]) {
                window.customPrograms[track].forEach(p => {
                    const pName = p.name || p;
                    progSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
                });
            }
        };

        window.appendNewProgram = function () {
            const track = document.getElementById('add-prog-track').value;
            const name = document.getElementById('add-prog-name').value.trim();
            if (!name) return showToast("Program name required.", "error");
            window.customPrograms[track] = window.customPrograms[track] || [];
            if (window.customPrograms[track].some(p => (p.name || p).toLowerCase() === name.toLowerCase())) return showToast("Program already exists.", "error");

            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const nextOrder = window.customPrograms[track].length;
            window.customPrograms[track].push({
                id: slug || 'prog-' + Date.now(),
                name: name,
                priority: 3,
                order: nextOrder,
                targetCGPA: ''
            });
            window.sortAllCustomData();

            document.getElementById('add-prog-name').value = '';
            saveToCloud(); renderUI(); showToast("Program successfully added!", "success");
        };

        window.appendNewSubject = function () {
            const track = document.getElementById('add-sub-track').value;
            const prog = document.getElementById('add-sub-program').value;
            const name = document.getElementById('add-sub-name').value.trim();
            const doBulk = document.getElementById('add-sub-bulk-cb').checked;
            const bulkNum = parseInt(document.getElementById('add-sub-bulk-num').value) || 0;

            if (!name) return showToast("Subject name required.", "error");

            const isGlobalDuplicate = window.getAllSubjects().some(s => s.subject.toLowerCase() === name.toLowerCase());
            if (isGlobalDuplicate) return showToast("Subject already exists. Names must be unique.", "error");

            if (doBulk && bulkNum <= 0) return showToast("Please enter a valid number of chapters to bulk add.", "error");

            let chaptersToAssign = doBulk ? bulkNum : 0;
            const todayStr = formatDate(new Date());
            let todayIdx = tasks.findIndex(t => t.date === todayStr);
            if (todayIdx === -1) todayIdx = 0;

            if (doBulk) {
                ensureAvailableSlots(chaptersToAssign, track, todayIdx);
            }

            syllabusStructure[track] = syllabusStructure[track] || [];
            const nextSubOrder = syllabusStructure[track].filter(s => s.program === prog).length;
            syllabusStructure[track].push({ program: prog, subject: name, chapters: chaptersToAssign, priority: 3, order: nextSubOrder });
            window.sortAllCustomData();
            getSubjectColor(name);

            if (doBulk) {
                let currentChapter = 1;
                const key = track + 'Tasks';
                for (let i = todayIdx; i < tasks.length && currentChapter <= chaptersToAssign; i++) {
                    if (tasks[i].type !== 'study') continue;
                    if (Array.isArray(tasks[i][key])) {
                        const bIdx = tasks[i][key].findIndex(b => b.subject === 'Revision');
                        if (bIdx > -1) {
                            tasks[i][key][bIdx] = { subject: name, chapter: `Ch. ${currentChapter}`, title: `Topic ${currentChapter}`, completed: false, id: tasks[i][key][bIdx].id };
                            currentChapter++;
                        }
                    }
                }
                reorderSubjectChapters(track, name);
            }

            document.getElementById('add-sub-name').value = '';
            document.getElementById('add-sub-bulk-cb').checked = false;
            document.getElementById('add-sub-bulk-num').value = '';
            document.getElementById('add-sub-bulk-num').classList.add('hidden');

            recalculateTotals();
            saveToCloud();

            // Unblock main thread to allow modal to close immediately before heavy render
            setTimeout(() => {
                renderUI();
                showToast(doBulk ? `Subject created and ${chaptersToAssign} chapters scheduled!` : "Subject successfully created!", "success");
            }, 50);
        };

        window.appendNewChapter = function () {
            const track = document.getElementById('add-ch-track').value;
            const prog = document.getElementById('add-ch-program').value;
            const subj = document.getElementById('add-ch-subject').value;
            const num = document.getElementById('add-ch-num').value;
            const title = document.getElementById('add-ch-title').value;
            const formattedCh = `Ch. ${num}`;

            if (!subj || !num || !title) return showToast("Please fill all fields.", "error");

            let isDuplicate = false;
            const key = track + 'Tasks';
            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].type !== 'study') continue;
                if (Array.isArray(tasks[i][key]) && tasks[i][key].some(b => b.subject === subj && b.chapter === formattedCh)) { isDuplicate = true; break; }
            }
            if (isDuplicate) return showToast(`Chapter ${num} already exists for ${subj}!`, "error");

            const todayStr = formatDate(new Date()); let todayIdx = tasks.findIndex(t => t.date === todayStr); if (todayIdx === -1) todayIdx = 0;

            ensureAvailableSlots(1, track, todayIdx);

            let slotted = false;

            for (let i = todayIdx; i < tasks.length; i++) {
                if (tasks[i].type !== 'study') continue;
                if (Array.isArray(tasks[i][key])) {
                    const bIdx = tasks[i][key].findIndex(b => b.subject === 'Revision');
                    if (bIdx > -1) {
                        tasks[i][key][bIdx] = { subject: subj, chapter: formattedCh, title: title, completed: false, id: tasks[i][key][bIdx].id }; slotted = true; break;
                    }
                }
            }

            if (!slotted) return showToast("No upcoming 'Revision' slots left for this track!", "error");

            reorderSubjectChapters(track, subj);
            const targetSub = (syllabusStructure[track] || []).find(s => s.subject === subj);
            if (targetSub) targetSub.chapters++;

            recalculateTotals(); saveToCloud(); renderUI();
            document.getElementById('add-ch-num').value = ''; document.getElementById('add-ch-title').value = '';
            showToast("Chapter added and sequenced!", "success");
        };

        window.appendNewAction = function () {
            const title = document.getElementById('add-act-title').value.trim();
            const desc = document.getElementById('add-act-desc').value.trim();
            const color = document.getElementById('add-act-color').value;
            const icon = document.getElementById('add-act-icon').value;

            if (!title || !desc) return showToast("Please provide a Title and Description.", "error");
            const newId = 'act_' + title.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4);

            const nextOrder = window.customActions.length;
            window.customActions.push({ id: newId, title: title, desc: desc, color: color, icon: icon, priority: 3, order: nextOrder });
            window.sortAllCustomData();

            document.getElementById('add-act-title').value = ''; document.getElementById('add-act-desc').value = '';
            saveToCloud(); renderUI(); showToast("Daily Action Tracker created!", "success");
        };

        // --- Outcomes Program Visibility Logic ---
        window.syncPassFreezeFromResults = function () {
            if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };

            const processedResults = window.getProcessedResults();
            const programGroups = {};
            processedResults.forEach(res => {
                if (res.type === 'cgpa') {
                    const progName = res.title;
                    if (!programGroups[progName]) {
                        programGroups[progName] = {
                            overall: null,
                            subjects: {}
                        };
                    }
                    if (!res.subject) {
                        programGroups[progName].overall = res;
                    } else {
                        programGroups[progName].subjects[res.subject] = res;
                    }
                }
            });

            // For each track and its custom programs
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id]) {
                    window.customPrograms[track.id].forEach(prog => {
                        const progName = prog.name || prog;
                        const group = programGroups[progName];
                        const mainTarget = window.getProgramMainTarget(progName);
                        const targetCGPA = (group && group.overall && group.overall.targetCGPA) || mainTarget.targetCGPA;
                        const targetGrade = (group && group.overall && group.overall.targetGrade) || mainTarget.targetGrade;
                        const hasTgt = targetCGPA && targetCGPA !== 'none' && targetCGPA !== '';

                        const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);

                        // Check if all subjects in this program have been attempted
                        let allSubjectsAttempted = (subs.length > 0);
                        subs.forEach(s => {
                            const subRes = group && group.subjects && group.subjects[s.subject];
                            let attempted = false;
                            if (subRes) {
                                const evalType = subRes.evaluationType || 'cgpa';
                                if (evalType === 'grade') {
                                    if (subRes.grade && subRes.grade.trim() !== '' && subRes.grade.trim().toUpperCase() !== 'F') {
                                        attempted = true;
                                    }
                                } else {
                                    const val = parseFloat(subRes.value);
                                    if (subRes.value && !isNaN(val) && val > 0) {
                                        attempted = true;
                                    }
                                }
                            }
                            if (!attempted) {
                                allSubjectsAttempted = false;
                            }
                        });

                        // 1. Program Level Goal
                        let isProgramGoalMet = false;
                        if (allSubjectsAttempted && hasTgt && group && group.overall) {
                            const evalType = group.overall.evaluationType;
                            if (evalType === 'grade') {
                                const currentGradeVal = window.mapGradeToNumeric(group.overall.grade, 'grade');
                                const targetGradeVal = window.mapGradeToNumeric(targetGrade, 'grade');
                                isProgramGoalMet = currentGradeVal >= targetGradeVal;
                            } else {
                                const currentCgpaVal = parseFloat(group.overall.value) || 0;
                                const targetCgpaVal = parseFloat(targetCGPA) || 0;
                                isProgramGoalMet = currentCgpaVal >= targetCgpaVal;
                            }
                        }

                        if (isProgramGoalMet) {
                            if (!window.passedItems.programs.includes(progName)) {
                                window.passedItems.programs.push(progName);
                            }
                        } else {
                            window.passedItems.programs = window.passedItems.programs.filter(p => p !== progName);
                        }

                        // 2. Subject Level Goal
                        subs.forEach(s => {
                            const subRes = group && group.subjects && group.subjects[s.subject];
                            const subTargetCgpa = (subRes && subRes.targetCGPA) || targetCGPA;
                            const subTargetGrade = (subRes && subRes.targetGrade) || targetGrade;
                            const hasSubTgt = subTargetCgpa && subTargetCgpa !== 'none' && subTargetCgpa !== '';

                            let isSubjectGoalMet = false;
                            if (isProgramGoalMet) {
                                // If program goal is met, all its subjects are automatically passed/frozen
                                isSubjectGoalMet = true;
                            } else if (hasSubTgt && subRes) {
                                const evalType = subRes.evaluationType || 'cgpa';
                                if (evalType === 'grade') {
                                    const currentGradeVal = window.mapGradeToNumeric(subRes.grade, 'grade');
                                    const targetGradeVal = window.mapGradeToNumeric(subTargetGrade, 'grade');
                                    isSubjectGoalMet = currentGradeVal >= targetGradeVal;
                                } else {
                                    const currentCgpaVal = parseFloat(subRes.value) || 0;
                                    const targetCgpaVal = parseFloat(subTargetCgpa) || 0;
                                    isSubjectGoalMet = currentCgpaVal >= targetCgpaVal;
                                }
                            }

                            if (isSubjectGoalMet) {
                                if (!window.passedItems.subjects.includes(s.subject)) {
                                    window.passedItems.subjects.push(s.subject);
                                }
                            } else {
                                window.passedItems.subjects = window.passedItems.subjects.filter(name => name !== s.subject);
                            }
                        });
                    });
                }
            });
        };

        window.syncPriorityInputsFromDOM = function () {
            // Tracks
            if (window.tracks) {
                window.tracks.forEach((t, idx) => {
                    const select = document.getElementById(`priority-track-${t.id}`);
                    if (select) {
                        const val = parseInt(select.value);
                        t.priority = isNaN(val) ? 3 : val;
                    }
                    t.order = idx;
                });
            }

            // Programs
            const flatProgs = window.getAllPrograms();
            flatProgs.forEach((p, idx) => {
                const select = document.getElementById(`priority-program-${p.id}`);
                const orig = (window.customPrograms[p._trackId] || []).find(x => x.id === p.id);
                if (orig) {
                    if (select) {
                        const val = parseInt(select.value);
                        orig.priority = isNaN(val) ? 3 : val;
                    }
                    orig.order = idx;
                }
            });

            // Subjects
            const flatSubs = window.getAllSubjects();
            flatSubs.forEach((s, idx) => {
                const select = document.getElementById(`priority-subject-${s.subject.replace(/[^a-zA-Z0-9]/g, '-')}`);
                if (select) {
                    const val = parseInt(select.value);
                    s.priority = isNaN(val) ? 3 : val;
                }
                s.order = idx;
            });

            // Daily Action priorities — still use select dropdown
            if (window.customActions) {
                window.customActions.forEach((a, idx) => {
                    const select = document.getElementById(`priority-action-${a.id}`);
                    if (select) {
                        const val = parseInt(select.value);
                        a.priority = isNaN(val) ? 3 : val;
                    }
                    a.order = idx;
                });
            }
        };

        window.moveTrack = function (index, direction) {
            const list = window.tracks;
            if (!list) return;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;

            window.syncPriorityInputsFromDOM();

            const itemA = list[index];
            const itemB = list[targetIndex];

            // Swap priority and order
            const tempPriority = itemA.priority;
            itemA.priority = itemB.priority;
            itemB.priority = tempPriority;

            const tempOrder = itemA.order;
            itemA.order = itemB.order;
            itemB.order = tempOrder;

            // Swap position in array
            list[index] = itemB;
            list[targetIndex] = itemA;

            // Re-assign order
            list.forEach((t, idx) => t.order = idx);

            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
            showToast("Track order updated!", "success");
        };

        window.moveProgramGlobal = function (flatIndex, direction) {
            window.syncPriorityInputsFromDOM();

            // Build a globally-sorted flat list of all programs across all tracks
            const flat = [];
            window.tracks.forEach(t => {
                (window.customPrograms[t.id] || []).forEach(p => {
                    flat.push({ trackId: t.id, prog: p });
                });
            });
            flat.sort((a, b) => {
                const pA = a.prog.priority !== undefined ? a.prog.priority : 999;
                const pB = b.prog.priority !== undefined ? b.prog.priority : 999;
                if (pA !== pB) return pA - pB;
                return (a.prog.order ?? 999) - (b.prog.order ?? 999);
            });

            const targetIndex = flatIndex + direction;
            if (targetIndex < 0 || targetIndex >= flat.length) return;

            const itemA = flat[flatIndex].prog;
            const itemB = flat[targetIndex].prog;

            // Swap priority and order
            const tempPriority = itemA.priority;
            itemA.priority = itemB.priority;
            itemB.priority = tempPriority;

            const tempOrder = itemA.order;
            itemA.order = itemB.order;
            itemB.order = tempOrder;

            // Swap the two items in the flat list
            const temp = flat[flatIndex];
            flat[flatIndex] = flat[targetIndex];
            flat[targetIndex] = temp;

            // Re-assign order
            flat.forEach((item, idx) => {
                item.prog.order = idx;
            });

            // Re-sort each track's local array by the updated priorities & orders
            window.tracks.forEach(t => {
                if (window.customPrograms[t.id]) {
                    window.customPrograms[t.id].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.order ?? 999) - (b.order ?? 999));
                }
            });
            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
            showToast("Program order updated!", "success");
        };

        window.moveSubjectGlobal = function (index, direction) {
            const list = window.getAllSubjects();
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;

            // Sync current input values from DOM to state
            window.syncPriorityInputsFromDOM();

            const itemA = list[index];
            const itemB = list[targetIndex];

            // Swap priority and order
            const tempPriority = itemA.priority;
            itemA.priority = itemB.priority;
            itemB.priority = tempPriority;

            const tempOrder = itemA.order;
            itemA.order = itemB.order;
            itemB.order = tempOrder;

            // Re-assign order globally across all subjects
            list.forEach((s, idx) => {
                s.order = idx;
            });

            window.sortAllCustomData();
            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
            showToast("Subject order updated!", "success");
        };

        window.moveAction = function (index, direction) {
            const list = window.customActions;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;

            // Sync current input values from DOM to state
            window.syncPriorityInputsFromDOM();

            const itemA = list[index];
            const itemB = list[targetIndex];

            // Swap priority and order
            const tempPriority = itemA.priority;
            itemA.priority = itemB.priority;
            itemB.priority = tempPriority;

            const tempOrder = itemA.order;
            itemA.order = itemB.order;
            itemB.order = tempOrder;

            // Swap positions in array
            list[index] = itemB;
            list[targetIndex] = itemA;

            // Re-assign order
            list.forEach((a, idx) => a.order = idx);

            window.sortAllCustomData();
            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
            showToast("Daily action order updated!", "success");
        };

        window.onPriorityDropdownChange = function (category, itemId, newValue) {
            const val = parseInt(newValue);
            if (isNaN(val)) return;

            if (category === 'track') {
                const item = window.tracks.find(t => t.id === itemId);
                if (!item) return;
                const oldPriority = item.priority;
                const other = window.tracks.find(t => t.id !== itemId && t.priority === val);
                if (other) {
                    other.priority = oldPriority;
                }
                item.priority = val;
                // Sort by priority and update order
                window.tracks.sort((a, b) => a.priority - b.priority);
                window.tracks.forEach((t, idx) => {
                    t.priority = idx + 1;
                    t.order = idx;
                });
            } else if (category === 'program') {
                const flatProgs = window.getAllPrograms();
                const item = flatProgs.find(p => p.id === itemId);
                if (!item) return;
                const oldPriority = item.priority;
                const other = flatProgs.find(p => p.id !== itemId && p.priority === val);

                // update in customPrograms
                window.tracks.forEach(trackObj => {
                    if (window.customPrograms[trackObj.id]) {
                        window.customPrograms[trackObj.id].forEach(p => {
                            if (p.id === itemId) p.priority = val;
                            else if (other && p.id === other.id) p.priority = oldPriority;
                        });
                    }
                });

                // Collect all custom program objects globally
                const actualProgs = [];
                window.tracks.forEach(trackObj => {
                    if (window.customPrograms[trackObj.id]) {
                        window.customPrograms[trackObj.id].forEach(p => {
                            actualProgs.push(p);
                        });
                    }
                });

                // Sort actual program objects globally by priority, then order
                actualProgs.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.order ?? 999) - (b.order ?? 999));

                // Re-assign global priorities and orders sequentially
                actualProgs.forEach((p, idx) => {
                    p.priority = idx + 1;
                    p.order = idx;
                });

                // Finally, sort each track's program array locally by their updated global priorities & orders
                window.tracks.forEach(trackObj => {
                    if (Array.isArray(window.customPrograms[trackObj.id])) {
                        window.customPrograms[trackObj.id].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.order ?? 999) - (b.order ?? 999));
                    }
                });
            } else if (category === 'subject') {
                const flatSubs = window.getAllSubjects();
                const item = flatSubs.find(s => s.subject === itemId);
                if (!item) return;
                const oldPriority = item.priority;
                const other = flatSubs.find(s => s.subject !== itemId && s.priority === val);
                if (other) {
                    other.priority = oldPriority;
                }
                item.priority = val;

                // Sort subjects
                flatSubs.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.order ?? 999) - (b.order ?? 999));
                flatSubs.forEach((s, idx) => {
                    s.priority = idx + 1;
                    s.order = idx;
                });
            } else if (category === 'action') {
                const item = window.customActions.find(a => a.id === itemId);
                if (!item) return;
                const oldPriority = item.priority;
                const other = window.customActions.find(a => a.id !== itemId && a.priority === val);
                if (other) {
                    other.priority = oldPriority;
                }
                item.priority = val;

                window.customActions.sort((a, b) => a.priority - b.priority);
                window.customActions.forEach((a, idx) => {
                    a.priority = idx + 1;
                    a.order = idx;
                });
            }

            window.sortAllCustomData();
            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
        };

        window.renderPriorityConfig = function () {
            const container = document.getElementById('sys-content-priority');
            if (!container) return;

            // Prevent redundant render cycles & flickering by guarding identical data updates
            const currentDataString = JSON.stringify({
                tracks: window.tracks,
                programs: window.customPrograms,
                syllabus: syllabusStructure,
                actions: window.customActions
            });
            if (currentDataString === window.lastPriorityRenderData) {
                return;
            }
            window.lastPriorityRenderData = currentDataString;

            const arrowUpBtn = (onclick, disabled) => `
                <button onclick="${onclick}" ${disabled ? 'disabled' : ''}
                    class="flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-indigo-900/50 disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                </button>`;
            const arrowDownBtn = (onclick, disabled) => `
                <button onclick="${onclick}" ${disabled ? 'disabled' : ''}
                    class="flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-indigo-900/50 disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
            const rankBadge = (n, color) => `
                <span class="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-[10px] font-black tracking-tight" style="background:${color}22;color:${color};border:1px solid ${color}55">#${n}</span>`;

            let html = `<p class="text-xs text-slate-500 dark:text-slate-400 mb-5 font-bold">Use ↑ ↓ arrows to reorder. Rank numbers update automatically. Track order affects Program Completion cards and Subject Progress.</p>`;

            // ── Section: Tracks (affects program completion rate + subject progress display order) ──
            html += `
            <div class="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-indigo-500 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"></path></svg>
                    Tracks Priority Order
                    <span class="ml-auto text-[8px] font-bold text-slate-400 normal-case tracking-normal">(Affects Completion Rate &amp; Subject Progress)</span>
                </h4>
                <div class="flex flex-col gap-2">`;
            if (!window.tracks || window.tracks.length === 0) {
                html += `<p class="text-xs font-bold text-slate-400">No tracks found.</p>`;
            } else {
                window.tracks.forEach((t, idx) => {
                    const trackColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7', '#f97316'];
                    const tc = trackColors[idx % trackColors.length];
                    html += `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-indigo-400 transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            ${rankBadge(idx + 1, tc)}
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-slate-800 dark:text-slate-200">${t.name || t.id}</span>
                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Track &middot; Controls program card &amp; subject order</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 ml-2">
                            <select id="priority-track-${t.id}" onchange="window.onPriorityDropdownChange('track', '${t.id}', this.value)"
                                class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 max-w-[72px]">
                                ${(() => {
                            let options = '';
                            for (let i = 1; i <= window.tracks.length; i++) {
                                options += `<option value="${i}" ${(t.priority ?? 3) === i ? 'selected' : ''}>${i}</option>`;
                            }
                            return options;
                        })()}
                            </select>
                            <div class="flex flex-col gap-0.5 shrink-0">
                                ${arrowUpBtn(`window.moveTrack(${idx}, -1)`, idx === 0)}
                                ${arrowDownBtn(`window.moveTrack(${idx}, 1)`, idx === window.tracks.length - 1)}
                            </div>
                        </div>
                    </div>`;
                });
            }
            html += `</div></div>`;

            // ── Section: Programs (flat global list, independent from subjects) ──
            html += `
            <div class="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-violet-500 border-b border-slate-200/60 dark:border-slate-700 pb-2 mb-3 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Programs Priority Order
                    <span class="ml-auto text-[8px] font-bold text-slate-400 normal-case tracking-normal">(Independent from Subjects)</span>
                </h4>
                <div class="flex flex-col gap-2">`;
            // Build flat sorted list of all programs across all tracks
            const flatProgList = [];
            window.tracks.forEach(trackObj => {
                (window.customPrograms[trackObj.id] || []).forEach(p => {
                    flatProgList.push({ trackId: trackObj.id, trackName: trackObj.name || trackObj.id, prog: p });
                });
            });
            flatProgList.sort((a, b) => {
                const pA = a.prog.priority !== undefined ? a.prog.priority : 999;
                const pB = b.prog.priority !== undefined ? b.prog.priority : 999;
                if (pA !== pB) return pA - pB;
                return (a.prog.order ?? 999) - (b.prog.order ?? 999);
            });
            if (flatProgList.length === 0) {
                html += `<p class="text-xs font-bold text-slate-400">No programs found.</p>`;
            } else {
                const progColors = ['#7c3aed', '#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#0284c7'];
                flatProgList.forEach((item, flatIdx) => {
                    const pc = progColors[flatIdx % progColors.length];
                    html += `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-violet-400 transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            ${rankBadge(flatIdx + 1, pc)}
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-slate-800 dark:text-slate-200 truncate" title="${item.prog.name || item.prog.id}">${item.prog.name || item.prog.id}</span>
                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${item.trackName}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 ml-2">
                            <select id="priority-program-${item.prog.id}" onchange="window.onPriorityDropdownChange('program', '${item.prog.id}', this.value)"
                                class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-violet-500 max-w-[72px]">
                                ${(() => {
                            let options = '';
                            for (let i = 1; i <= flatProgList.length; i++) {
                                options += `<option value="${i}" ${(item.prog.priority ?? 3) === i ? 'selected' : ''}>${i}</option>`;
                            }
                            return options;
                        })()}
                            </select>
                            <div class="flex flex-col gap-0.5 shrink-0">
                                ${arrowUpBtn(`window.moveProgramGlobal(${flatIdx}, -1)`, flatIdx === 0)}
                                ${arrowDownBtn(`window.moveProgramGlobal(${flatIdx}, 1)`, flatIdx === flatProgList.length - 1)}
                            </div>
                        </div>
                    </div>`;
                });
            }
            html += `</div></div>`;

            // ── Section: Syllabus Subjects + Daily Actions (2 columns) ──
            html += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">`;

            // Syllabus Subjects
            html += `
            <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-500 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    Syllabus Subjects
                </h4>
                <div class="flex flex-col gap-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">`;
            const allSubs = window.getAllSubjects();
            if (allSubs.length > 0) {
                allSubs.forEach((s, idx) => {
                    const color = getSubjectColor(s.subject);
                    let trackName = '';
                    for (const t of window.tracks) {
                        if (syllabusStructure[t.id] && syllabusStructure[t.id].some(x => x.subject === s.subject)) {
                            trackName = t.name;
                            break;
                        }
                    }
                    html += `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-emerald-400 transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            ${rankBadge(idx + 1, color)}
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-slate-800 dark:text-slate-200 truncate" title="${s.subject}">${s.subject}</span>
                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${s.program}${trackName ? ' · ' + trackName : ''}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 ml-2">
                            <select id="priority-subject-${s.subject.replace(/[^a-zA-Z0-9]/g, '-')}" onchange="window.onPriorityDropdownChange('subject', '${s.subject.replace(/'/g, "\\'")}', this.value)"
                                class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 max-w-[72px]">
                                ${(() => {
                            let options = '';
                            for (let i = 1; i <= allSubs.length; i++) {
                                options += `<option value="${i}" ${(s.priority ?? 3) === i ? 'selected' : ''}>${i}</option>`;
                            }
                            return options;
                        })()}
                            </select>
                            <div class="flex flex-col gap-0.5 shrink-0">
                                ${arrowUpBtn(`window.moveSubjectGlobal(${idx}, -1)`, idx === 0)}
                                ${arrowDownBtn(`window.moveSubjectGlobal(${idx}, 1)`, idx === allSubs.length - 1)}
                            </div>
                        </div>
                    </div>`;
                });
            } else {
                html += `<p class="text-xs font-bold text-slate-400">No syllabus subjects found.</p>`;
            }
            html += `</div></div>`;

            // Daily Action Trackers
            html += `
            <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-amber-500 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Daily Action Trackers
                </h4>
                <div class="flex flex-col gap-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">`;
            if (window.customActions.length === 0) {
                html += `<p class="text-xs font-bold text-slate-400">No custom actions created yet.</p>`;
            } else {
                window.customActions.forEach((a, idx) => {
                    const pVal = a.priority !== undefined ? a.priority : 3;
                    const cMap = twColors[a.color] || twColors.indigo;
                    html += `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-amber-400 transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            ${rankBadge(idx + 1, cMap.hex)}
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-slate-800 dark:text-slate-200 truncate">${a.title}</span>
                                <span class="text-[8px] font-bold text-slate-400 uppercase break-words whitespace-normal mt-0.5">${a.desc}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 ml-2">
                            <select id="priority-action-${a.id}" onchange="window.onPriorityDropdownChange('action', '${a.id}', this.value)"
                                class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500 max-w-[72px]">
                                ${(() => {
                            let options = '';
                            for (let i = 1; i <= window.customActions.length; i++) {
                                options += `<option value="${i}" ${pVal === i ? 'selected' : ''}>${i}</option>`;
                            }
                            return options;
                        })()}
                            </select>
                            <div class="flex flex-col gap-0.5 shrink-0">
                                ${arrowUpBtn(`window.moveAction(${idx}, -1)`, idx === 0)}
                                ${arrowDownBtn(`window.moveAction(${idx}, 1)`, idx === window.customActions.length - 1)}
                            </div>
                        </div>
                    </div>`;
                });
            }
            html += `</div></div></div>`;

            // Save Button
            html += `
            <div class="mt-6 flex justify-end">
                <button onclick="window.savePriorities()"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] md:text-[11px] uppercase tracking-widest px-8 py-3 rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                    Save &amp; Sync Priorities
                </button>
            </div>`;

            container.innerHTML = html;
        };

        window.savePriorities = function () {
            window.syncPriorityInputsFromDOM();
            window.sortAllCustomData();
            saveToCloud();
            renderUI();
            window.renderPriorityConfig();
            showToast("Priorities saved and synced successfully!", "success");
        };

        // --- Pace Management System Logic ---
        window.renderTrackList = function () {
            const container = document.getElementById('sys-content-track');
            if (!container) return;

            let html = `
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold">Add, rename, or delete academic or professional tracks. WARNING: Deleting a track deletes all its programs, subjects, and study progress data.</p>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <!-- Add Track Card -->
                <div class="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Add New Track</h4>
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Track Name</label>
                            <input type="text" id="add-track-name" placeholder="e.g. Postgraduate (MBA)"
                                class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-bold w-full">
                        </div>
                        <button onclick="window.appendNewTrack()"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] md:text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Track
                        </button>
                    </div>
                </div>

                <!-- Existing Tracks List -->
                <div class="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Existing Tracks</h4>
                    <div class="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            `;

            window.tracks.forEach(track => {
                const totalPrograms = window.customPrograms[track.id] ? window.customPrograms[track.id].length : 0;
                const totalSubjects = syllabusStructure[track.id] ? syllabusStructure[track.id].length : 0;

                html += `
                <div class="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-all hover:border-blue-400">
                    <div class="flex flex-col min-w-0 pr-2 flex-1">
                        <span class="text-xs font-black text-slate-800 dark:text-slate-200 break-words whitespace-normal leading-normal">${track.name}</span>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: ${track.id}</span>
                            <span class="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${totalPrograms} Programs</span>
                            <span class="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${totalSubjects} Subjects</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 shrink-0 ml-2">
                        <button onclick="window.editTrackName('${track.id}')"
                            class="p-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                            title="Rename Track">Rename</button>
                        <button onclick="window.requestDeleteTrack('${track.id}')"
                            class="p-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all active:scale-95"
                            title="Delete Track">Delete</button>
                    </div>
                </div>`;
            });

            html += `
                    </div>
                </div>
            </div>
            `;

            container.innerHTML = html;
        };

        window.appendNewTrack = function () {
            const nameInput = document.getElementById('add-track-name');
            const name = nameInput.value.trim();
            if (!name) return showToast("Track name required.", "error");

            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            if (!id) return showToast("Invalid track name.", "error");

            if (window.tracks.some(t => t.id === id)) {
                return showToast("A track with this ID or name already exists.", "error");
            }

            // Update State
            window.tracks.push({ id: id, name: name });
            window.customPrograms[id] = [];
            syllabusStructure[id] = [];

            // Backfill tasks: Loop through all existing tasks and add the new track properties
            if (Array.isArray(tasks)) {
                tasks.forEach(task => {
                    if (task.type === 'study') {
                        if (task[id + 'Study'] === undefined) {
                            task[id + 'Study'] = false;
                        }
                        const key = id + 'Tasks';
                        if (!task[key]) {
                            task[key] = [{ subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: `${id}-${task.id}` }];
                        }
                    } else if (task.type === 'holiday') {
                        if (task[id + 'Study'] === undefined) {
                            task[id + 'Study'] = false;
                        }
                    }
                });
            }

            nameInput.value = '';
            saveToCloud();
            window.populateTrackDropdowns();
            renderUI();
            window.renderTrackList();
            showToast(`Track "${name}" successfully created!`, "success");
        };

        window.editTrackName = function (id) {
            const track = window.tracks.find(t => t.id === id);
            if (!track) return;

            document.getElementById('etm-track-id').value = id;
            document.getElementById('etm-track-name').value = track.name;
            openModal('edit-track-modal');
        };

        window.saveTrackEditModal = function () {
            const id = document.getElementById('etm-track-id').value;
            const newName = document.getElementById('etm-track-name').value.trim();
            if (!newName) return showToast("Track name cannot be empty.", "error");

            const track = window.tracks.find(t => t.id === id);
            if (!track) return;

            track.name = newName;
            saveToCloud();
            window.populateTrackDropdowns();
            renderUI();
            window.renderTrackList();
            closeModal('edit-track-modal');
            showToast("Track renamed successfully!", "success");
        };

        window.requestDeleteTrack = function (id) {
            const track = window.tracks.find(t => t.id === id);
            if (!track) return;

            window.openConfirmModal(
                "Delete Track",
                `Are you sure you want to completely delete the track "${track.name}"? This will delete all its programs, subjects, and daily task data. This action cannot be undone.`,
                () => {
                    window.executeDeleteTrack(id);
                }
            );
        };

        window.executeDeleteTrack = function (id) {
            const track = window.tracks.find(t => t.id === id);
            if (!track) return;

            // Gather associated programs and subjects to clean them up from global configs
            const programsToCleanup = (window.customPrograms[id] || []).map(p => p.name || p);
            const subjectsToCleanup = (syllabusStructure[id] || []).map(s => s.subject);

            // Remove from tracks
            window.tracks = window.tracks.filter(t => t.id !== id);

            // Clean up customPrograms & syllabusStructure
            if (window.customPrograms[id]) delete window.customPrograms[id];
            if (syllabusStructure[id]) delete syllabusStructure[id];

            // Remove from tasks properties
            const keyTasks = id + 'Tasks';
            const keyStudy = id + 'Study';
            if (Array.isArray(tasks)) {
                tasks.forEach(task => {
                    if (task[keyTasks]) delete task[keyTasks];
                    if (task[keyStudy] !== undefined) delete task[keyStudy];
                });
            }

            // Cleanup passedItems
            if (window.passedItems) {
                if (window.passedItems.programs) {
                    window.passedItems.programs = window.passedItems.programs.filter(p => !programsToCleanup.includes(p));
                }
                if (window.passedItems.subjects) {
                    window.passedItems.subjects = window.passedItems.subjects.filter(s => !subjectsToCleanup.includes(s));
                }
            }

            // Cleanup revisionData
            if (window.revisionData) {
                if (window.revisionData.active) {
                    window.revisionData.active = window.revisionData.active.filter(s => !subjectsToCleanup.includes(s));
                }
                if (window.revisionData.progress) {
                    subjectsToCleanup.forEach(sub => {
                        if (window.revisionData.progress[sub]) delete window.revisionData.progress[sub];
                    });
                }
            }

            // Cleanup subjectTimeLinks
            if (window.subjectTimeLinks) {
                subjectsToCleanup.forEach(sub => {
                    if (window.subjectTimeLinks[sub]) delete window.subjectTimeLinks[sub];
                });
            }

            // Cleanup successResults
            if (window.successResults) {
                window.successResults = window.successResults.filter(r => {
                    if (r.type === 'cgpa') {
                        if (programsToCleanup.includes(r.title)) return false;
                        if (r.subject && subjectsToCleanup.includes(r.subject)) return false;
                    }
                    return true;
                });
            }

            // Cleanup paceGoals
            if (window.paceGoals) {
                window.paceGoals = window.paceGoals.filter(g => {
                    if (g.type === 'program' && programsToCleanup.includes(g.target)) return false;
                    if (g.type === 'subject' && subjectsToCleanup.includes(g.target)) return false;
                    return true;
                });
                window.paceGoals.forEach(g => {
                    if (g.type === 'bundle') {
                        if (g.programs) g.programs = g.programs.filter(p => !programsToCleanup.includes(p));
                        if (g.subjects) g.subjects = g.subjects.filter(s => !subjectsToCleanup.includes(s));
                    } else if (g.type === 'global') {
                        if (g.subjects) g.subjects = g.subjects.filter(s => !subjectsToCleanup.includes(s));
                    }
                });
                // Remove empty bundles
                window.paceGoals = window.paceGoals.filter(g => {
                    if (g.type === 'bundle' && (!g.programs || g.programs.length === 0) && (!g.subjects || g.subjects.length === 0)) return false;
                    return true;
                });
            }

            // Cleanup subjectDetailsState
            if (window.subjectDetailsState) {
                subjectsToCleanup.forEach(sub => {
                    const safeSubId = sub.replace(/[^a-zA-Z0-9]/g, '-');
                    if (window.subjectDetailsState[safeSubId] !== undefined) {
                        delete window.subjectDetailsState[safeSubId];
                    }
                });
            }

            // Save to cloud, repopulate, and redraw
            saveToCloud();
            window.populateTrackDropdowns();
            renderUI();
            if (currentFilter && (programsToCleanup.includes(currentFilter) || subjectsToCleanup.includes(currentFilter))) {
                window.currentFilter = 'All';
                renderUI();
            }
            window.renderTrackList();
            showToast(`Track "${track.name}" and all associated data deleted.`, "success");
        };
