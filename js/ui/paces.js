        window.saveHeaderConfigFromForm = function () {
            const topTag = document.getElementById('edit-header-tag').value.trim();
            const mainTitle = document.getElementById('edit-header-title').value.trim();
            const subTitle = document.getElementById('edit-header-sub').value.trim();

            if (!topTag || !mainTitle) return showToast("Top Tag and Main Title are required.", "error");

            window.dashboardConfig.topTag = topTag;
            window.dashboardConfig.mainTitle = mainTitle;
            window.dashboardConfig.subTitle = subTitle;

            safeSetText('dash-top-tag', window.dashboardConfig.topTag);
            safeSetText('dash-top-tag-mobile', window.dashboardConfig.topTag);
            safeSetText('dash-main-title', window.dashboardConfig.mainTitle);
            safeSetText('dash-main-title-mobile', window.dashboardConfig.mainTitle);
            safeSetText('dash-sub-title', window.dashboardConfig.subTitle);
            safeSetText('dash-sub-title-mobile', window.dashboardConfig.subTitle);
            document.title = `${window.dashboardConfig.topTag} - ${window.dashboardConfig.mainTitle}`;

            saveToCloud();
            showToast("Dashboard titles updated!", "success");
        };

        function rebuildTaskDates(shouldSave = true) {
            if (!tasks || tasks.length === 0) return;
            const baseDate = new Date(PLAN_START_DATE.getTime());
            tasks.forEach(t => {
                const curDate = new Date(baseDate.getTime());
                curDate.setDate(curDate.getDate() + (t.id - 1));
                t.date = formatDate(curDate);
                t.day = curDate.toLocaleDateString('en-US', { weekday: 'short' });
            });
            const newEndDate = new Date(baseDate.getTime());
            newEndDate.setDate(newEndDate.getDate() + (tasks[tasks.length - 1].id - 1));
            window.PLAN_END_DATE = newEndDate;
            if (shouldSave) {
                saveToCloud();
            }
        }

        function updateGlobalDates() {
            const globalGoal = window.paceGoals.find(g => g.type === 'global');
            let dateChanged = false;

            if (window.dashboardConfig && window.dashboardConfig.trendStartDate) {
                const trendStart = parseDateSafe(window.dashboardConfig.trendStartDate);
                if (!isNaN(trendStart.getTime())) {
                    trendStart.setHours(0, 0, 0, 0);
                    const currentStart = new Date(PLAN_START_DATE.getTime());
                    currentStart.setHours(0, 0, 0, 0);

                    if (trendStart.getTime() !== currentStart.getTime()) {
                        window.PLAN_START_DATE = new Date(trendStart.getTime());
                        dateChanged = true;
                    }
                }
            } else if (window.dashboardConfig) {
                window.dashboardConfig.trendStartDate = PLAN_START_DATE.toISOString().split('T')[0];
            }

            if (globalGoal) {
                if (globalGoal.startDate) {
                    const newStart = parseDateSafe(globalGoal.startDate);
                    if (!isNaN(newStart.getTime())) {
                        newStart.setHours(0, 0, 0, 0);
                        window.globalStartDate = new Date(newStart.getTime());
                    }
                }
                if (globalGoal.deadline) {
                    const newEnd = parseDateSafe(globalGoal.deadline);
                    if (!isNaN(newEnd.getTime())) {
                        window.globalEndDate = new Date(newEnd.getTime());
                    }
                }
            } else {
                window.globalStartDate = null;
                window.globalEndDate = null;
            }

            if (globalStartDate) globalStartDate.setHours(0, 0, 0, 0);
            if (globalEndDate) globalEndDate.setHours(23, 59, 59, 999);

            if (dateChanged) {
                rebuildTaskDates(false); // Update memory but do not write back to cloud automatically on render
            }
        }

        window.updateTrendsStartDate = function (newDateStr) {
            if (!newDateStr) return;
            const parsed = new Date(newDateStr);
            if (isNaN(parsed.getTime())) return showToast("Invalid Date selected.", "error");

            parsed.setHours(0, 0, 0, 0);
            window.PLAN_START_DATE = new Date(parsed.getTime());
            if (window.dashboardConfig) {
                window.dashboardConfig.trendStartDate = newDateStr;
            }
            rebuildTaskDates(true);
            renderUI();
            showToast("Start date updated!", "success");
        };

        window.setPaceToggleState = function (btn, handle, isChecked) {
            btn.setAttribute('data-checked', isChecked ? 'true' : 'false');
            if (isChecked) {
                btn.classList.remove('bg-rose-500');
                btn.classList.add('bg-emerald-500');
                handle.classList.remove('translate-x-0');
                handle.classList.add('translate-x-5');
            } else {
                btn.classList.remove('bg-emerald-500');
                btn.classList.add('bg-rose-500');
                handle.classList.remove('translate-x-5');
                handle.classList.add('translate-x-0');
            }
        };

        window.togglePaceSwitch = function (type, rawId) {
            const safeId = rawId.replace(/[^a-zA-Z0-9]/g, '_');
            const buttonId = `pace-toggle-${type}-${safeId}`;
            const handleId = `pace-handle-${type}-${safeId}`;
            const btn = document.getElementById(buttonId);
            const handle = document.getElementById(handleId);
            if (!btn || !handle) return;

            const wasChecked = btn.getAttribute('data-checked') === 'true';
            const isChecked = !wasChecked;

            window.setPaceToggleState(btn, handle, isChecked);

            // Cascade Logic
            if (type === 'track') {
                const trackId = rawId;
                // Cascade to programs
                const programs = window.customPrograms[trackId] || [];
                programs.forEach(prog => {
                    const progName = prog.name || prog;
                    const progSafeId = progName.replace(/[^a-zA-Z0-9]/g, '_');
                    const pBtn = document.getElementById(`pace-toggle-program-${progSafeId}`);
                    const pHandle = document.getElementById(`pace-handle-program-${progSafeId}`);
                    if (pBtn && pHandle) {
                        window.setPaceToggleState(pBtn, pHandle, isChecked);
                    }
                });
                // Cascade to subjects
                const subs = syllabusStructure[trackId] || [];
                subs.forEach(sub => {
                    const subSafeId = sub.subject.replace(/[^a-zA-Z0-9]/g, '_');
                    const sBtn = document.getElementById(`pace-toggle-subject-${subSafeId}`);
                    const sHandle = document.getElementById(`pace-handle-subject-${subSafeId}`);
                    if (sBtn && sHandle) {
                        window.setPaceToggleState(sBtn, sHandle, isChecked);
                    }
                });
            } else if (type === 'program') {
                const progName = rawId;
                // Cascade to all subjects of this program
                window.tracks.forEach(t => {
                    const subs = (syllabusStructure[t.id] || []).filter(sub => sub.program === progName);
                    subs.forEach(sub => {
                        const subSafeId = sub.subject.replace(/[^a-zA-Z0-9]/g, '_');
                        const sBtn = document.getElementById(`pace-toggle-subject-${subSafeId}`);
                        const sHandle = document.getElementById(`pace-handle-subject-${subSafeId}`);
                        if (sBtn && sHandle) {
                            window.setPaceToggleState(sBtn, sHandle, isChecked);
                        }
                    });
                });
            }
        };

        window.openTrendsSettingsModal = function () {
            window.ensureConfigDefaults();

            // Populate Active Timelines Container
            const timelineContainer = document.getElementById('settings-active-timeline-container');
            if (timelineContainer) {
                let html = '';
                if (!window.paceGoals || window.paceGoals.length === 0) {
                    html = '<span class="text-xs text-slate-400">No active pacing timelines found. Add a goal first to select it.</span>';
                } else {
                    window.paceGoals.forEach(goal => {
                        const isChecked = window.dashboardConfig.activePaceGoalId === goal.id;
                        const safeId = goal.id.replace(/[^a-zA-Z0-9]/g, '_');
                        const startDate = goal.startDate ? parseDateSafe(goal.startDate) : new Date(PLAN_START_DATE);
                        const deadline = parseDateSafe(goal.deadline);

                        html += `
                        <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${goal.target} (${goal.type.toUpperCase()})</span>
                                <span class="text-[9px] text-slate-400 font-bold mt-0.5">
                                    Timeline: ${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <button type="button" onclick="window.selectActivePaceGoal('${goal.id.replace(/'/g, "\\'")}')" 
                                    id="pace-toggle-goal-${safeId}" data-checked="${isChecked}"
                                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isChecked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}">
                                <span id="pace-handle-goal-${safeId}" aria-hidden="true" 
                                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}"></span>
                            </button>
                        </div>`;
                    });
                }
                timelineContainer.innerHTML = html;
            }

            openModal('edit-trends-pace-modal');
        };

        window.selectActivePaceGoal = function (goalId) {
            if (window.dashboardConfig.activePaceGoalId === goalId) {
                window.dashboardConfig.activePaceGoalId = null; // Uncheck
            } else {
                window.dashboardConfig.activePaceGoalId = goalId; // Select this one
            }
            window.openTrendsSettingsModal();
        };

        window.saveTrendsSettings = function () {
            saveToCloud();
            renderUI();
            closeModal('edit-trends-pace-modal');
            showToast("Active pacing timeline updated!", "success");
        };

        function calculateIndependentEstFinish() {
            const subjectStats = window.lastSubjectStats || {};
            const uniqueSubs = Array.from(new Set(window.getAllSubjects().map(s => s.subject)));

            let totalRemaining = 0;
            let totalPace = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;

            uniqueSubs.forEach(subjectName => {
                const sObj = window.getAllSubjects().find(s => s.subject === subjectName);
                if (!sObj) return;

                // Find track ID for this subject
                let trackId = null;
                for (const tid in syllabusStructure) {
                    if (syllabusStructure[tid].some(x => x.subject === subjectName)) {
                        trackId = tid;
                        break;
                    }
                }

                // Check if subject matches the current filter
                let matchesFilter = false;
                if (currentFilter === 'All') {
                    matchesFilter = true;
                } else {
                    const isTrack = window.tracks.some(t => t.name === currentFilter || t.id === currentFilter);
                    const isProgram = Array.from(new Set(window.getAllPrograms().map(p => p.name || p))).includes(currentFilter);

                    if (isTrack) {
                        matchesFilter = (trackId === currentFilter || (window.tracks.find(t => t.id === trackId)?.name === currentFilter));
                    } else if (isProgram) {
                        matchesFilter = (sObj.program === currentFilter);
                    } else {
                        matchesFilter = (subjectName === currentFilter);
                    }
                }

                if (matchesFilter) {
                    // Check if independent pace is enabled
                    const isTrackPaceEnabled = trackId && window.dashboardConfig.independentPaces?.tracks?.[trackId] === true;
                    const isProgPaceEnabled = sObj.program && window.dashboardConfig.independentPaces?.programs?.[sObj.program] === true;
                    const isSubPaceEnabled = window.dashboardConfig.independentPaces?.subjects?.[subjectName] === true;

                    if (isTrackPaceEnabled || isProgPaceEnabled || isSubPaceEnabled) {
                        const stats = subjectStats[subjectName];
                        if (stats) {
                            const rem = Math.max(0, stats.totalChapters - stats.effectiveChapters);
                            totalRemaining += rem;
                            totalPace += (stats.actualPace || 0);
                        }
                    }
                }
            });

            if (totalPace <= 0) {
                return '--';
            }

            const daysNeeded = Math.ceil(totalRemaining / totalPace);
            const projectedDate = new Date(today.getTime() + daysNeeded * msPerDay);
            const finishDateStr = projectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            return `${finishDateStr} (${daysNeeded} Days @ ${totalPace.toFixed(2)} Ch/Day)`;
        }

        window.updateTrendsBar = function () {
            const barStartVal = document.getElementById('trends-bar-start-date');
            const barPassedVal = document.getElementById('trends-bar-days-passed');
            const barRemainVal = document.getElementById('trends-bar-days-remaining');
            const barRemainContainer = document.getElementById('trends-bar-days-remain-container');
            const barEstFinishVal = document.getElementById('trends-bar-est-finish');

            if (barStartVal) {
                let activeGoalId = window.dashboardConfig.activePaceGoalId;
                if (!activeGoalId && window.paceGoals && window.paceGoals.length > 0) {
                    activeGoalId = window.paceGoals[0].id;
                    window.dashboardConfig.activePaceGoalId = activeGoalId;
                }
                const activeGoal = activeGoalId ? window.paceGoals.find(g => g.id === activeGoalId) : null;

                if (activeGoal) {
                    const startDate = activeGoal.startDate ? parseDateSafe(activeGoal.startDate) : new Date(PLAN_START_DATE);
                    const targetDate = parseDateSafe(activeGoal.deadline);
                    startDate.setHours(0, 0, 0, 0);
                    targetDate.setHours(23, 59, 59, 999);

                    const today = new Date(); today.setHours(0, 0, 0, 0);

                    // 1. Start Date
                    barStartVal.textContent = startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                    // 2. Days Passed
                    const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    barPassedVal.textContent = window.formatDaysPassed(Math.max(0, daysPassed));

                    // 3. Days Remain
                    const diff = targetDate - today;
                    const daysRemain = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                    barRemainVal.textContent = `${daysRemain} Days`;
                    barRemainContainer.classList.remove('hidden');

                    // 4. Est Finish
                    const subjectStats = window.lastSubjectStats || {};
                    let total = 0; let completed = 0;

                    if (activeGoal.type === 'global') {
                        let targetedSubjects = new Set();
                        const isManual = activeGoal.subjects || activeGoal.secondaryPaces;

                        if (isManual) {
                            if (activeGoal.subjects) activeGoal.subjects.forEach(s => targetedSubjects.add(s));
                            if (activeGoal.secondaryPaces) {
                                activeGoal.secondaryPaces.forEach(pid => {
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
                                if (g.id === activeGoal.id) return;
                                if (!globalStartDate || !globalEndDate) return;

                                const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                                const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                                gStart.setHours(0, 0, 0, 0);
                                gEnd.setHours(23, 59, 59, 999);
                                if (gEnd < globalStartDate || gStart > globalEndDate) return;

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
                        targetedSubjects.forEach(sub => {
                            if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                        });
                    } else if (activeGoal.type === 'bundle') {
                        if (activeGoal.subjects) {
                            activeGoal.subjects.forEach(sub => {
                                if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                            });
                        } else if (activeGoal.programs) {
                            let programSubs = [];
                            window.tracks.map(t => t.id).forEach(track => {
                                if (syllabusStructure[track]) {
                                    syllabusStructure[track].forEach(s => {
                                        if (activeGoal.programs.includes(s.program)) programSubs.push(s.subject);
                                    });
                                }
                            });
                            programSubs.forEach(sub => {
                                if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                            });
                        }
                    } else if (activeGoal.type === 'subject') {
                        if (subjectStats[activeGoal.target]) { total = subjectStats[activeGoal.target].totalChapters; completed = subjectStats[activeGoal.target].effectiveChapters; }
                    } else if (activeGoal.type === 'program') {
                        const programSubs = [];
                        window.tracks.map(t => t.id).forEach(track => {
                            if (syllabusStructure[track]) {
                                syllabusStructure[track].forEach(s => { if (s.program === activeGoal.target) programSubs.push(s.subject); });
                            }
                        });
                        programSubs.forEach(sub => { if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; } });
                    }

                    const remaining = Math.max(0, total - completed);
                    let finishDisplay = '--';

                    if (total === 0) {
                        finishDisplay = 'No Target';
                    } else if (remaining <= 0) {
                        finishDisplay = 'Finished';
                    } else {
                        let curPaceVal = 0;
                        if (daysPassed > 0) {
                            curPaceVal = completed / daysPassed;
                        }

                        if (curPaceVal <= 0) {
                            if (today < startDate) finishDisplay = 'Future';
                            else if (today > targetDate) finishDisplay = 'Overdue';
                            else finishDisplay = 'No Data';
                        } else {
                            const daysToFinish = remaining / curPaceVal;
                            const projectedDate = new Date(today); projectedDate.setDate(today.getDate() + daysToFinish);
                            const finishDateStr = projectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                            finishDisplay = `${finishDateStr} (${Math.ceil(daysToFinish)} Days @ ${curPaceVal.toFixed(2)} Ch/Day)`;
                        }
                    }
                    barEstFinishVal.textContent = finishDisplay;
                } else {
                    barStartVal.textContent = '--';
                    barPassedVal.textContent = '--';
                    barRemainVal.textContent = '--';
                    barRemainContainer.classList.add('hidden');
                    barEstFinishVal.textContent = '--';
                }
            }
        };

        window.renderPaceGoals = function (subjectStats) {
            const container = document.getElementById('pace-goals-container');
            if (!container) return;
            if (!window.paceGoals || window.paceGoals.length === 0) {
                container.innerHTML = '<div class="col-span-full py-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"><span class="text-2xl mb-2 grayscale opacity-50">🎯</span><p class="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">No custom pace goals set. Add one below to track specific deadlines.</p></div>';
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;

            let html = '';
            window.paceGoals.forEach(goal => {
                let total = 0; let completed = 0;

                if (goal.type === 'global') {
                    let targetedSubjects = new Set();
                    const isManual = goal.subjects || goal.secondaryPaces;

                    if (isManual) {
                        if (goal.subjects) goal.subjects.forEach(s => targetedSubjects.add(s));
                        if (goal.secondaryPaces) {
                            goal.secondaryPaces.forEach(pid => {
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
                        // Old fallback auto-aggregation
                        window.paceGoals.forEach(g => {
                            if (g.id === goal.id) return;
                            if (!globalStartDate || !globalEndDate) return;

                            const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                            const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                            gStart.setHours(0, 0, 0, 0);
                            gEnd.setHours(23, 59, 59, 999);
                            if (gEnd < globalStartDate || gStart > globalEndDate) return; // Restrict to overlapping scopes

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
                    targetedSubjects.forEach(sub => {
                        if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                    });
                } else if (goal.type === 'bundle') {
                    if (goal.subjects) {
                        goal.subjects.forEach(sub => {
                            if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                        });
                    } else if (goal.programs) {
                        let programSubs = [];
                        window.tracks.map(t => t.id).forEach(track => {
                            if (syllabusStructure[track]) {
                                syllabusStructure[track].forEach(s => {
                                    if (goal.programs.includes(s.program)) programSubs.push(s.subject);
                                });
                            }
                        });
                        programSubs.forEach(sub => {
                            if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                        });
                    }
                } else if (goal.type === 'subject') {
                    if (subjectStats[goal.target]) { total = subjectStats[goal.target].totalChapters; completed = subjectStats[goal.target].effectiveChapters; }
                } else if (goal.type === 'program') {
                    const programSubs = [];
                    window.tracks.map(t => t.id).forEach(track => {
                        if (syllabusStructure[track]) {
                            syllabusStructure[track].forEach(s => { if (s.program === goal.target) programSubs.push(s.subject); });
                        }
                    });
                    programSubs.forEach(sub => { if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; } });
                }

                const startDate = goal.startDate ? parseDateSafe(goal.startDate) : new Date(PLAN_START_DATE);
                const targetDate = parseDateSafe(goal.deadline);
                startDate.setHours(0, 0, 0, 0); targetDate.setHours(23, 59, 59, 999);

                const remaining = Math.max(0, total - completed);
                const totalDays = Math.max(1, Math.ceil((targetDate - startDate) / msPerDay));
                const daysElapsed = Math.floor((today - startDate) / msPerDay) + 1;
                const daysRemaining = Math.max(0, Math.ceil((targetDate - today) / msPerDay));

                let reqPaceVal = 0;
                let curPaceVal = 0;

                if (total > 0) {
                    if (today < startDate) {
                        reqPaceVal = total / totalDays;
                        curPaceVal = 0;
                    } else if (today > targetDate) {
                        reqPaceVal = remaining > 0 ? remaining : 0;
                        curPaceVal = completed / daysElapsed;
                    } else {
                        reqPaceVal = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                        curPaceVal = completed / daysElapsed;
                    }
                }

                const reqPace = reqPaceVal.toFixed(2);
                const curPace = curPaceVal.toFixed(2);

                let finishDisplay = '';
                let timeGoalCountdownStr = '';
                let estDaysNeededStr = '<span class="opacity-50 font-normal">Unknown</span>';
                let diffDaysTG = Math.ceil((targetDate - today) / msPerDay);

                if (total === 0) {
                    finishDisplay = '<span class="opacity-50">No Target</span>';
                } else if (remaining <= 0) {
                    finishDisplay = '<span class="text-emerald-400">Finished</span>';
                    timeGoalCountdownStr = '<span class="text-emerald-400">Done</span>';
                    estDaysNeededStr = '<span class="text-emerald-400">0 Days</span>';
                } else {
                    if (curPaceVal <= 0) {
                        if (today < startDate) finishDisplay = '<span class="text-blue-400 font-bold">Future</span>';
                        else if (today > targetDate) finishDisplay = '<span class="text-red-400 font-bold">Overdue</span>';
                        else finishDisplay = '<span class="opacity-50">No Data</span>';
                    } else {
                        const daysToFinish = remaining / curPaceVal;
                        const projectedDate = new Date(today); projectedDate.setDate(today.getDate() + daysToFinish);
                        finishDisplay = projectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                        estDaysNeededStr = `<span class="text-orange-400">${Math.ceil(daysToFinish)} Days Needed</span>`;
                    }

                    if (diffDaysTG > 0) timeGoalCountdownStr = `${diffDaysTG} Days Left`;
                    else if (diffDaysTG === 0) timeGoalCountdownStr = `<span class="text-orange-400">Due Today</span>`;
                    else timeGoalCountdownStr = `<span class="text-red-400">${Math.abs(diffDaysTG)} Days Overdue</span>`;
                }

                const isBehind = remaining > 0 && today >= startDate && curPaceVal < reqPaceVal;
                const reqColor = isBehind ? 'text-red-500' : 'text-emerald-500';
                const reqBg = isBehind ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';

                let isActiveFilter = false;
                if (currentFilter !== 'All') {
                    const sObj = window.getAllSubjects().find(s => s.subject === currentFilter);
                    const filterProg = sObj ? sObj.program : currentFilter;

                    if (goal.type === 'bundle') {
                        if (goal.subjects && (goal.subjects.includes(currentFilter) || goal.program === currentFilter)) isActiveFilter = true;
                        if (goal.programs && (goal.programs.includes(currentFilter) || goal.programs.includes(filterProg))) isActiveFilter = true;
                    } else if (goal.type === 'program' && goal.target === currentFilter) {
                        isActiveFilter = true;
                    } else if (goal.type === 'subject' && goal.target === currentFilter) {
                        isActiveFilter = true;
                    } else if (goal.type === 'global') {
                        isActiveFilter = true;
                    }
                } else if (goal.type === 'global') {
                    isActiveFilter = true;
                }

                let goalColorClass = 'bg-indigo-500';
                if (goal.type === 'program') goalColorClass = 'bg-violet-500';
                if (goal.type === 'bundle') goalColorClass = 'bg-orange-500';
                if (goal.type === 'global') goalColorClass = 'bg-blue-500';

                let subText = '';
                if (goal.type === 'bundle') {
                    if (goal.subjects) subText = `<div class="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1 line-clamp-1" title="${goal.subjects.join(', ')}">${goal.subjects.join(', ')}</div>`;
                    else if (goal.programs) subText = `<div class="text-[8px] font-bold text-violet-500 dark:text-violet-400 mt-1 line-clamp-1" title="${goal.programs.join(', ')}">${goal.programs.join(', ')}</div>`;
                } else if (goal.type === 'global') {
                    const isManual = goal.subjects || goal.secondaryPaces;
                    if (isManual) subText = `<div class="text-[8px] font-bold text-blue-500 dark:text-blue-400 mt-1 line-clamp-1">Manual Global Target</div>`;
                    else subText = `<div class="text-[8px] font-bold text-blue-500 dark:text-blue-400 mt-1 line-clamp-1">Aggregates explicitly targeted subjects</div>`;
                }

                html += `
                <div class="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-[1.25rem] border ${isActiveFilter ? 'border-orange-500 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-700 shadow-sm'} relative group hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                    ${isActiveFilter ? '<div class="absolute -top-2.5 right-4 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">Active Timeline</div>' : ''}
                    <div class="absolute top-3.5 right-3.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.openPaceTrendModal('${goal.id}')" class="text-slate-300 hover:text-indigo-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="View Pace Trend Chart"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1-1H5a1 1 0 01-1-1V4z"></path></svg></button>
                        <button onclick="window.openGoalDetailsModal('${goal.id}')" class="text-slate-300 hover:text-emerald-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="View Target Details"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                        <button onclick="window.openEditPaceModal('${goal.id}')" class="text-slate-300 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="Edit Goal Dates"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="window.requestDeletePaceGoal('${goal.id}')" class="text-slate-300 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="Remove Goal"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                    <div class="mb-3 pr-20">
                        <div class="flex items-center space-x-1.5 mb-1">
                            <div class="w-1.5 h-1.5 rounded-full ${goalColorClass}"></div>
                            <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">${goal.type} Goal</span>
                        </div>
                        <h4 class="font-black text-sm md:text-base text-slate-800 dark:text-slate-100 truncate tracking-tight">${goal.target}</h4>
                        <p class="text-[9px] font-bold text-slate-500 tracking-wider mt-0.5">Timeline: <span class="text-indigo-500 dark:text-indigo-400">${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span> - <span class="text-orange-500">${targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                        ${subText}
                    </div>
                    
                    <div>
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-[9px] font-bold text-slate-400">${Math.round(completed)} / ${total} Ch</span>
                            <span class="text-[9px] font-black text-slate-500">${total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-200/50 dark:border-slate-600/30">
                            <div class="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-700" style="width: ${total > 0 ? (completed / total) * 100 : 0}%"></div>
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div class="p-2 rounded-xl ${reqBg} border flex flex-col justify-between">
                                <div>
                                    <span class="block text-[8px] uppercase tracking-widest font-black ${reqColor} opacity-80 mb-0.5">Req Pace</span>
                                    <div class="font-black text-xs md:text-sm ${reqColor}">${reqPace} <span class="text-[8px] opacity-70">ch/d</span></div>
                                </div>
                                <div class="text-[9px] font-black ${reqColor} mt-1.5 uppercase tracking-widest">${timeGoalCountdownStr}</div>
                            </div>
                            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                <div>
                                    <span class="block text-[8px] uppercase tracking-widest font-black text-slate-500 opacity-80 mb-0.5">Cur Pace</span>
                                    <div class="font-black text-xs md:text-sm text-slate-700 dark:text-slate-300">${curPace} <span class="text-[8px] opacity-70">ch/d</span></div>
                                </div>
                                <div class="text-[9px] font-black text-emerald-500 mt-1.5 uppercase tracking-widest">${window.formatDaysPassed(Math.max(0, daysElapsed))} Passed</div>
                            </div>
                            <div class="col-span-2 p-2.5 rounded-xl bg-slate-900 dark:bg-slate-900 border border-slate-800 flex justify-between items-center shadow-inner">
                                <div class="flex flex-col">
                                    <span class="text-[8px] uppercase tracking-widest font-black text-slate-400 mb-0.5">Est. Finish</span>
                                    <span class="text-[9px] font-black mt-0.5">${estDaysNeededStr}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="font-black text-[10px] md:text-xs text-white text-right">${finishDisplay}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
        };

        window.openGoalDetailsModal = function (goalId) {
            const goal = window.paceGoals.find(g => g.id === goalId);
            if (!goal || !window.lastSubjectStats) return;

            const subjectStats = window.lastSubjectStats;
            let targetedSubjects = new Set();
            let scopeHtml = '';

            if (goal.type === 'global') {
                const isManual = goal.subjects || goal.secondaryPaces;
                if (isManual) {
                    if (goal.subjects) goal.subjects.forEach(s => targetedSubjects.add(s));
                    if (goal.secondaryPaces) {
                        goal.secondaryPaces.forEach(pid => {
                            const g = window.paceGoals.find(x => x.id === pid);
                            if (g) {
                                if (g.type === 'bundle') {
                                    if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                                    if (g.programs) {
                                        window.getAllSubjects().forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); });
                                    }
                                } else if (g.type === 'subject') {
                                    targetedSubjects.add(g.target);
                                } else if (g.type === 'program') {
                                    window.getAllSubjects().forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); });
                                }
                            }
                        });
                    }
                    let detailText = `Manually mapped ${goal.subjects ? goal.subjects.length : 0} explicit Subjects and ${goal.secondaryPaces ? goal.secondaryPaces.length : 0} Secondary Paces.`;
                    scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl shadow-sm">${detailText}</div>`;
                } else {
                    window.paceGoals.forEach(g => {
                        if (g.id === goal.id) return;
                        const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                        const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                        gStart.setHours(0, 0, 0, 0); gEnd.setHours(23, 59, 59, 999);
                        if (gEnd < globalStartDate || gStart > globalEndDate) return;

                        if (g.type === 'bundle') {
                            if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                            if (g.programs) {
                                window.getAllSubjects().forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); });
                            }
                        } else if (g.type === 'subject') targetedSubjects.add(g.target);
                        else if (g.type === 'program') {
                            window.getAllSubjects().forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); });
                        }
                    });
                    scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl shadow-sm">Aggregates mapped subjects intersecting with the Global Timeline bounds.</div>`;
                }
            } else if (goal.type === 'bundle') {
                if (goal.subjects) {
                    goal.subjects.forEach(s => targetedSubjects.add(s));
                    scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3 rounded-xl shadow-sm">Custom explicit selection of ${goal.subjects.length} subjects.</div>`;
                } else if (goal.programs) {
                    let pList = goal.programs.join(', ');
                    scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-3 rounded-xl shadow-sm">Programs Scoped: <span class="text-violet-600 dark:text-violet-400">${pList}</span></div>`;
                    window.getAllSubjects().forEach(s => {
                        if (goal.programs.includes(s.program)) targetedSubjects.add(s.subject);
                    });
                }
            } else if (goal.type === 'subject') {
                targetedSubjects.add(goal.target);
            } else if (goal.type === 'program') {
                scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-3 rounded-xl shadow-sm">Program Scoped: <span class="text-violet-600 dark:text-violet-400">${goal.target}</span></div>`;
                window.getAllSubjects().forEach(s => { if (s.program === goal.target) targetedSubjects.add(s.subject); });
            }

            let total = 0; let completed = 0;
            let subjectsListHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">';
            targetedSubjects.forEach(sub => {
                if (subjectStats[sub]) {
                    total += subjectStats[sub].totalChapters;
                    completed += subjectStats[sub].effectiveChapters;

                    let sChTotal = subjectStats[sub].totalChapters;
                    let sChDone = Math.round(subjectStats[sub].effectiveChapters);
                    let sPct = sChTotal > 0 ? Math.round((sChDone / sChTotal) * 100) : 0;
                    let color = getSubjectColor(sub);

                    let sObj = window.getAllSubjects().find(s => s.subject === sub);
                    let progName = sObj ? sObj.program : '';
                    let displaySub = sub.replace(progName + ' - ', '').replace(progName + ' ', '');

                    subjectsListHtml += `
                    <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-1.5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                        <div class="flex justify-between items-start mb-0.5">
                            <div class="flex flex-col pr-2">
                                <span class="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">${progName}</span>
                                <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight" title="${sub}"><div class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-[1px]" style="background-color: ${color}"></div>${displaySub}</span>
                            </div>
                            <span class="text-[9px] md:text-[10px] font-black text-slate-500 shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-700">${sChDone} / ${sChTotal}</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-auto">
                            <div class="h-full rounded-full transition-all duration-700 shadow-sm" style="width: ${sPct}%; background-color: ${color}"></div>
                        </div>
                    </div>`;
                }
            });
            subjectsListHtml += '</div>';

            if (targetedSubjects.size === 0) subjectsListHtml = '<div class="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"><p class="text-xs font-bold text-slate-400">No subjects currently mapped or active in this scope.</p></div>';

            const startDate = goal.startDate ? parseDateSafe(goal.startDate) : new Date(PLAN_START_DATE);
            const targetDate = parseDateSafe(goal.deadline);
            startDate.setHours(0, 0, 0, 0); targetDate.setHours(23, 59, 59, 999);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;

            const remaining = Math.max(0, total - completed);
            const totalDays = Math.max(1, Math.ceil((targetDate - startDate) / msPerDay));
            const daysElapsed = Math.floor((today - startDate) / msPerDay) + 1;
            const daysRemaining = Math.max(0, Math.ceil((targetDate - today) / msPerDay));

            let reqPaceVal = 0; let curPaceVal = 0;
            if (total > 0) {
                if (today < startDate) {
                    reqPaceVal = total / totalDays;
                    curPaceVal = 0;
                } else if (today > targetDate) {
                    reqPaceVal = remaining > 0 ? remaining : 0;
                    curPaceVal = completed / daysElapsed;
                } else {
                    reqPaceVal = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                    curPaceVal = completed / daysElapsed;
                }
            }

            safeSetText('gdm-title', goal.target);
            safeSetText('gdm-dates', `Timeline: ${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} - ${targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`);

            safeSetText('gdm-stat-req', reqPaceVal.toFixed(2));
            safeSetText('gdm-stat-cur', curPaceVal.toFixed(2));
            safeSetText('gdm-stat-rem', remaining.toFixed(1));

            document.getElementById('gdm-scope-list').innerHTML = scopeHtml + subjectsListHtml;

            openModal('goal-details-modal');
        };

        window.openSubjectTrendModal = function () {
            window.activeSingleSubjectTrend = null;
            openModal('subject-trend-modal');
            renderTrendCharts();
            setTimeout(() => {
                if (window.subjectTrendChart) {
                    window.subjectTrendChart.resize();
                }
            }, 320);
        };
        window.openSingleSubjectTrendModal = function (subjectName) {
            window.activeSingleSubjectTrend = subjectName;
            openModal('subject-trend-modal');
            renderTrendCharts();
            setTimeout(() => {
                if (window.subjectTrendChart) {
                    window.subjectTrendChart.resize();
                }
            }, 320);
        };
        window.openRevisionTrendModal = function () { openModal('revision-trend-modal'); };
        window.openYearlyActionsModal = function () { openModal('yearly-actions-modal'); };

        window.getTargetedSubjectsForGoal = function (goal) {
            let targetedSubjects = new Set();
            if (!goal) return targetedSubjects;
            if (goal.type === 'global') {
                const isManual = goal.subjects || goal.secondaryPaces;
                if (isManual) {
                    if (goal.subjects) goal.subjects.forEach(s => targetedSubjects.add(s));
                    if (goal.secondaryPaces) {
                        goal.secondaryPaces.forEach(pid => {
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
                        if (g.id === goal.id) return;
                        if (!globalStartDate || !globalEndDate) return;
                        const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                        const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                        gStart.setHours(0, 0, 0, 0); gEnd.setHours(23, 59, 59, 999);
                        if (gEnd < globalStartDate || gStart > globalEndDate) return;
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
            } else if (goal.type === 'bundle') {
                if (goal.subjects) {
                    goal.subjects.forEach(sub => targetedSubjects.add(sub));
                } else if (goal.programs) {
                    window.tracks.map(t => t.id).forEach(track => {
                        if (syllabusStructure[track]) {
                            syllabusStructure[track].forEach(s => {
                                if (goal.programs.includes(s.program)) targetedSubjects.add(s.subject);
                            });
                        }
                    });
                }
            } else if (goal.type === 'subject') {
                targetedSubjects.add(goal.target);
            } else if (goal.type === 'program') {
                window.tracks.map(t => t.id).forEach(track => {
                    if (syllabusStructure[track]) {
                        syllabusStructure[track].forEach(s => { if (s.program === goal.target) targetedSubjects.add(s.subject); });
                    }
                });
            }
            return targetedSubjects;
        };

        window.openPaceCandleChartModal = function (goalId) {
            const goal = window.paceGoals.find(g => g.id === goalId);
            if (!goal) return;

            document.getElementById('pcm-target-name').textContent = goal.target;
            openModal('pace-candle-modal');

            // 1. Calculate subject completion map for subjects targeted by this goal
            const targetedSubjects = window.getTargetedSubjectsForGoal(goal);
            const subsList = Array.from(targetedSubjects);

            let completedPerDate = {};
            tasks.forEach(t => {
                if (t.type === 'study') {
                    let count = 0;
                    window.tracks.forEach(track => {
                        const key = track.id + 'Tasks';
                        if (Array.isArray(t[key])) {
                            t[key].forEach(b => { if (b.completed && subsList.includes(b.subject)) count++; });
                        }
                    });
                    completedPerDate[t.date] = (completedPerDate[t.date] || 0) + count;
                }
            });

            // 2. Loop from startDate to today day-by-day to build daily pace stats
            const startDate = goal.startDate ? parseDateSafe(goal.startDate) : new Date(PLAN_START_DATE);
            startDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const msPerDay = 1000 * 60 * 60 * 24;
            const daysElapsed = Math.max(1, Math.floor((today - startDate) / msPerDay) + 1);

            let cumulativeAct = 0;
            let dailyPaces = [];
            let currentDt = new Date(startDate);

            for (let i = 1; i <= daysElapsed; i++) {
                let dStr = formatDate(currentDt);
                let completedToday = completedPerDate[dStr] || 0;
                cumulativeAct += completedToday;
                let pace = cumulativeAct / i;
                dailyPaces.push({
                    dayIdx: i,
                    dateStr: currentDt.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
                    pace: pace,
                    completedToday: completedToday
                });
                currentDt.setDate(currentDt.getDate() + 1);
            }

            // 3. Group daily stats into intervals (if daysElapsed > 15) to maintain readable candles
            let intervals = [];
            let daysPerInterval = 1;
            if (daysElapsed > 15) {
                daysPerInterval = Math.ceil(daysElapsed / 10);
            }

            for (let k = 0; k < daysElapsed; k += daysPerInterval) {
                let chunk = dailyPaces.slice(k, k + daysPerInterval);
                if (chunk.length === 0) continue;

                let prevIdx = k - 1;
                let openVal = prevIdx >= 0 ? dailyPaces[prevIdx].pace : 0;
                let closeVal = chunk[chunk.length - 1].pace;

                let completedInChunk = chunk.reduce((sum, d) => sum + d.completedToday, 0);

                let maxPaceInChunk = Math.max(...chunk.map(d => d.pace));
                let minPaceInChunk = Math.min(...chunk.map(d => d.pace));

                let open = openVal;
                let close = closeVal;
                // Add wick variation based on completion activity
                let high = Math.max(open, close, maxPaceInChunk) + (completedInChunk > 0 ? 0.05 * completedInChunk : 0.01);
                let low = Math.max(0, Math.min(open, close, minPaceInChunk) - (completedInChunk === 0 ? 0.02 : 0.005));

                let dateLabel = chunk[0].dateStr;
                if (chunk.length > 1) {
                    dateLabel = `${chunk[0].dateStr} - ${chunk[chunk.length - 1].dateStr}`;
                }

                intervals.push({
                    label: dateLabel,
                    open: open,
                    close: close,
                    high: high,
                    low: low,
                    completed: completedInChunk
                });
            }

            // 4. Setup Chart.js
            const ctx = document.getElementById('paceCandleCanvas');
            if (!ctx) return;

            if (window.paceCandleChartInstance) {
                window.paceCandleChartInstance.destroy();
            }

            const canvasCtx = ctx.getContext('2d');
            const isMobile = window.innerWidth < 640;

            window.paceCandleChartInstance = new Chart(canvasCtx, {
                type: 'bar',
                data: {
                    labels: intervals.map(item => item.label),
                    datasets: [
                        {
                            label: 'Wick',
                            data: intervals.map(item => [item.low, item.high]),
                            backgroundColor: 'rgba(148, 163, 184, 0.7)',
                            borderColor: 'rgba(148, 163, 184, 0.7)',
                            borderWidth: 0,
                            barThickness: isMobile ? 1.5 : 2.5,
                            maxBarThickness: isMobile ? 1.5 : 2.5,
                            grouped: false,
                            order: 2
                        },
                        {
                            label: 'Body',
                            data: intervals.map(item => [item.open, item.close]),
                            backgroundColor: intervals.map(item => item.close >= item.open ? '#10b981' : '#ef4444'),
                            borderColor: intervals.map(item => item.close >= item.open ? '#059669' : '#dc2626'),
                            borderWidth: 1.5,
                            borderRadius: isMobile ? 3 : 5,
                            barPercentage: 0.55,
                            maxBarThickness: isMobile ? 12 : 24,
                            grouped: false,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 9, weight: 'bold' } }
                        },
                        y: {
                            grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                            ticks: { font: { size: 9, weight: 'bold' } },
                            title: {
                                display: true,
                                text: 'Pace (Chapters/Day)',
                                font: { size: 10, weight: 'black', family: 'Inter' },
                                color: '#94a3b8'
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            titleFont: { size: 12, weight: 'bold' },
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            usePointStyle: true,
                            callbacks: {
                                label: (tooltipItem) => {
                                    const item = intervals[tooltipItem.dataIndex];
                                    const openStr = item.open.toFixed(3);
                                    const closeStr = item.close.toFixed(3);
                                    const highStr = item.high.toFixed(3);
                                    const lowStr = item.low.toFixed(3);
                                    const direction = item.close >= item.open ? '🟩 Pace Improved' : '🟥 Pace Decayed';
                                    return [
                                        `Trend: ${direction}`,
                                        `Open Pace: ${openStr} ch/d`,
                                        `High Pace: ${highStr} /d`,
                                        `Low Pace: ${lowStr} ch/d`,
                                        `Close Pace: ${closeStr} ch/d`,
                                        `Completions: ${item.completed} Chapters`
                                    ];
                                }
                            }
                        }
                    }
                }
            });

            // Force resize after the modal transitions open
            setTimeout(() => {
                if (window.paceCandleChartInstance) {
                    window.paceCandleChartInstance.resize();
                }
            }, 320);
        };

        window.openPaceTrendModal = function (goalId) {
            window.activeTrendGoalId = goalId || null;
            openModal('pace-trend-modal');
            window.renderPaceTrendChart(goalId); // Initial render setup
            // Critical Fix: Force the chart to recalculate its dimensions strictly AFTER the 300ms CSS transition completes.
            // This perfectly syncs the canvas to the newly visible layout dimensions, preventing squishing/blurring.
            setTimeout(() => {
                if (window.paceTrendChartInstance) {
                    window.paceTrendChartInstance.resize();
                }
            }, 320);
        };

        window.renderPaceTrendChart = function (goalId) {
            let paceData = null;
            if (goalId && window.paceGoals) {
                const goal = window.paceGoals.find(g => g.id === goalId);
                if (goal) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const subjectStats = window.lastSubjectStats || {};
                    let total = 0;
                    let completed = 0;

                    if (goal.type === 'global') {
                        let targetedSubjects = new Set();
                        const isManual = goal.subjects || goal.secondaryPaces;
                        if (isManual) {
                            if (goal.subjects) goal.subjects.forEach(s => targetedSubjects.add(s));
                            if (goal.secondaryPaces) {
                                goal.secondaryPaces.forEach(pid => {
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
                                if (g.id === goal.id) return;
                                if (!globalStartDate || !globalEndDate) return;
                                const gStart = g.startDate ? parseDateSafe(g.startDate) : new Date(globalStartDate);
                                const gEnd = g.deadline ? parseDateSafe(g.deadline) : new Date(globalEndDate);
                                gStart.setHours(0, 0, 0, 0);
                                gEnd.setHours(23, 59, 59, 999);
                                if (gEnd < globalStartDate || gStart > globalEndDate) return;
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
                        targetedSubjects.forEach(sub => {
                            if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                        });
                    } else if (goal.type === 'bundle') {
                        if (goal.subjects) {
                            goal.subjects.forEach(sub => {
                                if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                            });
                        } else if (goal.programs) {
                            let programSubs = [];
                            window.tracks.map(t => t.id).forEach(track => {
                                if (syllabusStructure[track]) {
                                    syllabusStructure[track].forEach(s => {
                                        if (goal.programs.includes(s.program)) programSubs.push(s.subject);
                                    });
                                }
                            });
                            programSubs.forEach(sub => {
                                if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; }
                            });
                        }
                    } else if (goal.type === 'subject') {
                        if (subjectStats[goal.target]) { total = subjectStats[goal.target].totalChapters; completed = subjectStats[goal.target].effectiveChapters; }
                    } else if (goal.type === 'program') {
                        const programSubs = [];
                        window.tracks.map(t => t.id).forEach(track => {
                            if (syllabusStructure[track]) {
                                syllabusStructure[track].forEach(s => { if (s.program === goal.target) programSubs.push(s.subject); });
                            }
                        });
                        programSubs.forEach(sub => { if (subjectStats[sub]) { total += subjectStats[sub].totalChapters; completed += subjectStats[sub].effectiveChapters; } });
                    }

                    const startDate = goal.startDate ? parseDateSafe(goal.startDate) : new Date(PLAN_START_DATE);
                    const targetDate = parseDateSafe(goal.deadline);
                    startDate.setHours(0, 0, 0, 0); targetDate.setHours(23, 59, 59, 999);

                    const remaining = Math.max(0, total - completed);
                    const totalDays = Math.max(1, Math.ceil((targetDate - startDate) / msPerDay));
                    const daysElapsed = Math.floor((today - startDate) / msPerDay) + 1;
                    const daysRemaining = Math.max(0, Math.ceil((targetDate - today) / msPerDay));

                    let reqPaceVal = 0;
                    let curPaceVal = 0;

                    if (total > 0) {
                        if (today < startDate) {
                            reqPaceVal = total / totalDays;
                            curPaceVal = 0;
                        } else if (today > targetDate) {
                            reqPaceVal = remaining > 0 ? remaining : 0;
                            curPaceVal = completed / daysElapsed;
                        } else {
                            reqPaceVal = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                            curPaceVal = completed / daysElapsed;
                        }
                    }

                    let projectedDate = new Date(today);
                    if (remaining <= 0) {
                        projectedDate = new Date(today);
                    } else if (curPaceVal > 0) {
                        const daysToFinish = remaining / curPaceVal;
                        projectedDate.setDate(today.getDate() + daysToFinish);
                    } else {
                        projectedDate = new Date(0);
                    }

                    const targetSubjects = window.getTargetedSubjectsForGoal(goal);

                    paceData = {
                        total: total,
                        completed: completed,
                        start: startDate,
                        end: targetDate,
                        today: today,
                        reqPace: reqPaceVal,
                        curPace: curPaceVal,
                        projectedDate: projectedDate,
                        subjects: Array.from(targetSubjects),
                        title: goal.target + " Trend",
                        description: "Burn-up comparison of Required vs Actual trajectories for " + goal.target + "."
                    };
                }
            }

            if (!paceData) {
                if (!window.latestPaceData) return;
                paceData = {
                    ...window.latestPaceData,
                    title: "Pace Trend Analysis",
                    description: "Burn-up comparison of Required vs Actual trajectories."
                };
            }

            const ctx = document.getElementById('paceTrendCanvas');
            if (!ctx) return;

            const { total, completed, start, end, today, reqPace, curPace, projectedDate, subjects, title, description } = paceData;

            safeSetText('ptm-title', title);
            safeSetText('ptm-desc', description);

            safeSetText('ptm-req-pace', reqPace.toFixed(2));
            safeSetText('ptm-act-pace', curPace.toFixed(2));

            let finishDisplay = '--';
            const finishEl = document.getElementById('ptm-est-finish');

            finishEl.classList.remove('text-red-500', 'text-orange-700', 'dark:text-orange-400', 'text-emerald-500');

            if (total > 0 && completed >= total) {
                finishEl.classList.add('text-emerald-500');
                finishDisplay = 'Finished';
            } else if (total > 0 && curPace > 0) {
                finishEl.classList.add('text-orange-700', 'dark:text-orange-400');
                // On mobile, use a shorter date format to prevent overflow
                const dateOpts = window.innerWidth < 640 ? { day: '2-digit', month: 'short', year: '2-digit' } : { day: '2-digit', month: 'long', year: 'numeric' };
                finishDisplay = projectedDate.toLocaleDateString('en-GB', dateOpts);
            } else {
                finishEl.classList.add('text-red-500');
            }
            safeSetText('ptm-est-finish', finishDisplay);

            let labels = []; let reqData = []; let actData = []; let estData = [];

            let completedPerDate = {};
            tasks.forEach(t => {
                if (t.type === 'study') {
                    let count = 0;
                    window.tracks.forEach(track => {
                        const key = track.id + 'Tasks';
                        if (Array.isArray(t[key])) {
                            t[key].forEach(b => { if (b.completed && subjects.includes(b.subject)) count++; });
                        }
                    });
                    completedPerDate[t.date] = (completedPerDate[t.date] || 0) + count;
                }
            });

            let loopStart = new Date(Math.min(start.getTime(), today.getTime()));
            loopStart.setHours(0, 0, 0, 0);

            let maxDt = new Date(end);
            if (projectedDate.getTime() > 0 && projectedDate > maxDt) maxDt = new Date(projectedDate);
            if (today > maxDt) maxDt = new Date(today);

            const capDt = new Date(end);
            capDt.setFullYear(capDt.getFullYear() + 1);
            if (maxDt > capDt) maxDt = new Date(capDt);

            let daysBuffer = Math.ceil((maxDt - loopStart) / (1000 * 60 * 60 * 24) * 0.05);
            maxDt.setDate(maxDt.getDate() + Math.max(3, daysBuffer));

            let currentDt = new Date(loopStart);
            let cumulativeAct = 0;
            const totalDaysTarget = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            const reqPacePerDay = total / totalDaysTarget;

            while (currentDt <= maxDt) {
                labels.push(currentDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                if (currentDt < start) {
                    reqData.push(0);
                } else {
                    let daysSinceStart = Math.max(0, Math.floor((currentDt - start) / (1000 * 60 * 60 * 24)));
                    let rVal = daysSinceStart * reqPacePerDay;
                    if (rVal > total) rVal = total;
                    reqData.push(rVal);
                }

                if (currentDt <= today) {
                    let dStr = formatDate(currentDt);
                    cumulativeAct += (completedPerDate[dStr] || 0);
                    actData.push(cumulativeAct);

                    if (currentDt.getTime() === today.getTime()) {
                        estData.push(cumulativeAct);
                    } else {
                        estData.push(null);
                    }
                } else {
                    actData.push(null);
                    let daysFromToday = Math.ceil((currentDt - today) / (1000 * 60 * 60 * 24));
                    let eVal = cumulativeAct + (curPace * daysFromToday);
                    if (eVal > total) eVal = total;
                    estData.push(eVal);
                }

                currentDt.setDate(currentDt.getDate() + 1);
            }

            if (window.paceTrendChartInstance) window.paceTrendChartInstance.destroy();

            let chartCtx = ctx.getContext('2d');

            let actGradient = chartCtx.createLinearGradient(0, 0, 0, 450);
            actGradient.addColorStop(0, 'rgba(99, 102, 241, 0.6)');
            actGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
            actGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

            let estGradient = chartCtx.createLinearGradient(0, 0, 0, 450);
            estGradient.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
            estGradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

            const isMobile = window.innerWidth < 640;

            window.paceTrendChartInstance = new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Required Target',
                            data: reqData,
                            borderColor: '#10b981',
                            borderWidth: isMobile ? 2 : 2.5,
                            borderDash: [8, 6],
                            pointRadius: 0,
                            pointHitRadius: 15,
                            fill: false,
                            tension: 0,
                            z: 2
                        },
                        {
                            label: 'Actual Progression',
                            data: actData,
                            borderColor: '#6366f1',
                            backgroundColor: actGradient,
                            borderWidth: isMobile ? 3 : 4,
                            pointRadius: 0,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#6366f1',
                            pointHoverBackgroundColor: '#ffffff',
                            pointHoverBorderColor: '#6366f1',
                            pointHoverBorderWidth: 3,
                            fill: true,
                            tension: 0.3,
                            z: 3
                        },
                        {
                            label: 'Estimated Trajectory',
                            data: estData,
                            borderColor: '#f59e0b',
                            backgroundColor: estGradient,
                            borderWidth: isMobile ? 2 : 2.5,
                            borderDash: [4, 4],
                            pointRadius: 0,
                            pointHitRadius: 15,
                            fill: true,
                            tension: 0.3,
                            z: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: isMobile ? 'center' : 'end',
                            labels: {
                                color: '#94a3b8',
                                font: { family: 'Inter', weight: '800', size: isMobile ? 9 : 11 },
                                usePointStyle: true,
                                boxWidth: isMobile ? 6 : 10,
                                padding: isMobile ? 10 : 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#f8fafc',
                            titleFont: { size: isMobile ? 11 : 13, weight: 'bold' },
                            bodyColor: '#cbd5e1',
                            bodyFont: { size: isMobile ? 10 : 12 },
                            borderColor: 'rgba(99, 102, 241, 0.2)',
                            borderWidth: 1,
                            padding: isMobile ? 10 : 14,
                            cornerRadius: 12,
                            usePointStyle: true,
                            boxPadding: 8,
                            callbacks: {
                                label: c => {
                                    if (c.parsed.y === null) return null;
                                    return ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)} Ch`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: total > 0 ? Math.ceil(total * 1.1) : 10,
                            ticks: {
                                font: { size: isMobile ? 8 : 10, weight: 'bold' },
                                color: '#64748b',
                                padding: isMobile ? 4 : 8
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.08)',
                                drawBorder: false,
                                borderDash: [5, 5]
                            },
                            border: { display: false }
                        },
                        x: {
                            ticks: {
                                font: { size: isMobile ? 8 : 10, weight: 'bold' },
                                color: '#64748b',
                                maxTicksLimit: isMobile ? 5 : 12,
                                maxRotation: 0,
                                padding: isMobile ? 4 : 8
                            },
                            grid: {
                                display: true,
                                color: 'rgba(148, 163, 184, 0.03)',
                                drawBorder: false
                            },
                            border: { display: false }
                        }
                    }
                }
            });
        };

        window.renderRevisionTrendChart = function () {
            const ctxSub = document.getElementById('revisionTrendChart');
            if (!ctxSub) return;

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

            let revSubData = {};
            window.getAllSubjects().forEach(s => {
                revSubData[s.subject] = Array(totalMonths).fill(0);
                if (window.chartVisibility.revSubjects[s.subject] === undefined) window.chartVisibility.revSubjects[s.subject] = true;
            });

            let latestActiveMonth = -1;
            const todayMidx = (todayObj.getFullYear() - sYear) * 12 + (todayObj.getMonth() - sMonth);

            Object.keys(window.revisionData.progress || {}).forEach(sub => {
                if (!revSubData[sub]) return;
                Object.keys(window.revisionData.progress[sub]).forEach(chNum => {
                    const val = window.revisionData.progress[sub][chNum];
                    if (val) {
                        let d;
                        if (typeof val === 'string' || typeof val === 'number') {
                            d = new Date(val);
                        } else {
                            d = todayObj;
                        }
                        let mIdx = (d.getFullYear() - sYear) * 12 + (d.getMonth() - sMonth);
                        if (mIdx < 0) mIdx = 0;
                        if (mIdx < totalMonths) {
                            revSubData[sub][mIdx]++;
                            latestActiveMonth = Math.max(latestActiveMonth, mIdx);
                        }
                    }
                });
            });

            let boundedToday = todayMidx >= totalMonths ? totalMonths - 1 : (todayMidx < 0 ? 0 : todayMidx);
            let boundedLatest = latestActiveMonth >= totalMonths ? totalMonths - 1 : latestActiveMonth;
            const cutoff = Math.max(boundedToday, boundedLatest, 0);

            Object.keys(revSubData).forEach(k => {
                let sTotal = 1;
                const sObj = window.getAllSubjects().find(s => s.subject === k);
                if (sObj) sTotal = sObj.chapters;
                sTotal = Math.max(1, sTotal);

                for (let i = 1; i <= cutoff; i++) revSubData[k][i] += revSubData[k][i - 1];
                for (let i = 0; i <= cutoff; i++) revSubData[k][i] = Math.round((revSubData[k][i] / sTotal) * 100);

                window.latestChartStats.revSubjects[k] = revSubData[k][cutoff] || 0;
                for (let i = cutoff + 1; i < totalMonths; i++) revSubData[k][i] = null;
            });

            Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
            const chartOptions = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8, usePointStyle: true, boxPadding: 6, callbacks: { label: c => ' ' + c.dataset.label + ': ' + c.parsed.y + '%' } } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 9, weight: 'bold' }, callback: v => v + '%' }, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false } }, x: { ticks: { font: { size: 9, weight: 'bold' } }, grid: { display: false, drawBorder: false } } } };

            const subDatasets = Object.keys(revSubData).map(k => ({
                label: getDynamicChartLabel(k), data: revSubData[k], borderColor: getSubjectColor(k), backgroundColor: 'transparent', tension: 0.4, borderWidth: 3, pointBackgroundColor: '#0f172a', pointBorderColor: getSubjectColor(k), pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointHoverBackgroundColor: getSubjectColor(k), pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, hidden: !window.chartVisibility.revSubjects[k], subjectKey: k
            }));

            if (window.revisionTrendChartInstance) {
                window.revisionTrendChartInstance.data.labels = months;
                window.revisionTrendChartInstance.data.datasets = subDatasets;
                window.revisionTrendChartInstance.update('none');
            } else {
                window.revisionTrendChartInstance = new Chart(ctxSub.getContext('2d'), { type: 'line', data: { labels: months, datasets: subDatasets }, options: { ...chartOptions, interaction: { mode: 'nearest', axis: 'x', intersect: false } } });
            }

            window.updateRevisionLegends();
        };

        window.openEditPaceModal = function (goalId) {
            const goal = window.paceGoals.find(g => g.id === goalId);
            if (!goal) return;
            window.editingPaceId = goalId;

            const nameContainer = document.getElementById('epm-name-container');
            const checklistSection = document.getElementById('epm-checklist-section');
            const nameInput = document.getElementById('edit-pace-name');
            const subjectsContainer = document.getElementById('edit-pace-subjects-container');

            if (goal.type === 'global') {
                nameContainer.classList.add('hidden');
                checklistSection.classList.remove('hidden');
                nameInput.value = goal.target;

                let html = '';
                html += `<div class="mb-4"><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Subjects</h5>`;
                window.tracks.forEach(track => {
                    if (window.customPrograms[track.id]) {
                        window.customPrograms[track.id].forEach(prog => {
                            const progName = prog.name || prog;
                            const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);
                            if (subs.length > 0) {
                                html += `<div class="mb-2"><div class="text-[10px] font-black uppercase text-slate-400 mb-1.5 pl-1">${progName}</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                                subs.forEach(s => {
                                    const isChecked = (goal.subjects && goal.subjects.includes(s.subject)) ? 'checked' : '';
                                    let displaySub = s.subject.replace(progName + ' - ', '').replace(progName + ' ', '');
                                    html += `
                                    <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm">
                                        <input type="checkbox" value="${s.subject}" class="edit-pace-subject-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all" ${isChecked}>
                                        <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${s.subject}">${displaySub}</span>
                                    </label>`;
                                });
                                html += `</div></div>`;
                            }
                        });
                    }
                });
                html += `</div>`;

                html += `<div><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Secondary Paces</h5>`;
                const otherGoals = window.paceGoals.filter(g => g.type !== 'global');
                if (otherGoals.length > 0) {
                    html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                    otherGoals.forEach(g => {
                        const isChecked = (goal.secondaryPaces && goal.secondaryPaces.includes(g.id)) ? 'checked' : '';
                        html += `
                        <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm">
                            <input type="checkbox" value="${g.id}" class="edit-pace-sec-cb form-checkbox h-4 w-4 text-indigo-500 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-500 transition-all" ${isChecked}>
                            <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${g.target}">${g.target}</span>
                        </label>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<span class="text-[10px] text-slate-500">No other pace goals available.</span>`;
                }
                html += `</div>`;

                subjectsContainer.innerHTML = html;
            } else {
                nameContainer.classList.remove('hidden');
                checklistSection.classList.remove('hidden');
                nameInput.value = goal.target;

                let html = '';
                const isProgramTarget = goal.type === 'program' || (goal.type === 'bundle' && goal.programs);

                if (isProgramTarget) {
                    html += `<div class="grid grid-cols-2 gap-2 w-full">`;
                    const selectedProgs = goal.programs || (goal.type === 'program' ? [goal.target] : []);
                    window.tracks.forEach(track => {
                        if (window.customPrograms[track.id]) {
                            window.customPrograms[track.id].forEach(p => {
                                const pName = p.name || p;
                                const isChecked = selectedProgs.some(sp => (sp.name || sp) === pName) ? 'checked' : '';
                                html += `
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm">
                                    <input type="checkbox" value="${pName}" class="edit-pace-cb form-checkbox h-4 w-4 text-violet-500 rounded border-slate-300 focus:ring-violet-500 accent-violet-500 transition-all" ${isChecked}>
                                    <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate">${pName}</span>
                                </label>`;
                            });
                        }
                    });
                    html += `</div>`;
                } else {
                    const selectedSubs = goal.subjects || (goal.type === 'subject' ? [goal.target] : []);
                    window.tracks.forEach(track => {
                        if (window.customPrograms[track.id]) {
                            window.customPrograms[track.id].forEach(prog => {
                                const progName = prog.name || prog;
                                const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);
                                if (subs.length > 0) {
                                    html += `<div class="mb-2"><div class="text-[10px] font-black uppercase text-slate-400 mb-1.5 pl-1">${progName}</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                                    subs.forEach(s => {
                                        const isChecked = selectedSubs.includes(s.subject) ? 'checked' : '';
                                        let displaySub = s.subject.replace(progName + ' - ', '').replace(progName + ' ', '');
                                        html += `
                                        <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm">
                                            <input type="checkbox" value="${s.subject}" class="edit-pace-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all" ${isChecked}>
                                            <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${s.subject}">${displaySub}</span>
                                        </label>`;
                                    });
                                    html += `</div></div>`;
                                }
                            });
                        }
                    });
                }
                subjectsContainer.innerHTML = html || '<span class="text-[10px] text-slate-500">No items available.</span>';
            }

            document.getElementById('edit-pace-start').value = goal.startDate || '';
            document.getElementById('edit-pace-date').value = goal.deadline || '';
            openModal('edit-pace-modal');
        };

        window.savePaceEdit = function () {
            if (!window.editingPaceId) return;
            const goal = window.paceGoals.find(g => g.id === window.editingPaceId);
            if (!goal) return;

            const startStr = document.getElementById('edit-pace-start').value;
            const deadStr = document.getElementById('edit-pace-date').value;
            if (!startStr || !deadStr) return showToast("Both dates are required", "error");
            if (new Date(deadStr) <= new Date(startStr)) return showToast("Deadline must be after start date", "error");

            if (goal.type === 'global') {
                const subjCheckboxes = document.querySelectorAll('.edit-pace-subject-cb:checked');
                const secCheckboxes = document.querySelectorAll('.edit-pace-sec-cb:checked');

                const selectedSubjects = Array.from(subjCheckboxes).map(cb => cb.value);
                const selectedSec = Array.from(secCheckboxes).map(cb => cb.value);

                goal.subjects = selectedSubjects;
                goal.secondaryPaces = selectedSec;
            } else if (goal.type !== 'global') {
                const name = document.getElementById('edit-pace-name').value.trim();
                if (!name) return showToast("Goal name is required.", "error");

                const checkboxes = document.querySelectorAll('.edit-pace-cb:checked');
                const selectedItems = Array.from(checkboxes).map(cb => cb.value);

                if (selectedItems.length === 0) return showToast("Please select at least one item.", "error");

                goal.target = name;
                goal.type = 'bundle';
                delete goal.subjects;
                delete goal.programs;

                const firstItem = selectedItems[0];
                let isProg = false;
                window.tracks.forEach(track => {
                    if (window.customPrograms[track.id] && window.customPrograms[track.id].some(p => (p.name || p) === firstItem)) {
                        isProg = true;
                    }
                });

                if (isProg) goal.programs = selectedItems;
                else goal.subjects = selectedItems;
            }

            goal.startDate = startStr;
            goal.deadline = deadStr;
            saveToCloud(); renderUI(); closeModal('edit-pace-modal'); showToast("Pace Goal timeline updated!", "success");
        };

        window.togglePaceBundleType = function () {
            const bType = document.getElementById('add-pace-bundle-type').value;
            const nameContainer = document.getElementById('add-pace-name-container');
            const checklistSection = document.getElementById('add-pace-checklist-section');
            const checklistLabel = document.getElementById('add-pace-checklist-label');

            if (bType === 'global') {
                nameContainer.classList.add('hidden');
                checklistSection.classList.remove('hidden');
                checklistLabel.textContent = "Select Subjects & Secondary Paces";
                window.updatePaceSubjects();
            } else {
                nameContainer.classList.remove('hidden');
                checklistSection.classList.remove('hidden');

                if (bType === 'subjects') {
                    checklistLabel.textContent = "Select Subjects to Include (Organized by Program)";
                } else {
                    checklistLabel.textContent = "Select Entire Programs to Include";
                }
                window.updatePaceSubjects();
            }
        };

        window.updatePaceSubjects = function () {
            const bType = document.getElementById('add-pace-bundle-type').value;
            const container = document.getElementById('add-pace-subjects-container');
            if (!container) return;

            let html = '';

            if (bType === 'subjects') {
                window.tracks.forEach(track => {
                    if (window.customPrograms[track.id]) {
                        window.customPrograms[track.id].forEach(prog => {
                            const progName = prog.name || prog;
                            const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);
                            if (subs.length > 0) {
                                html += `
                                <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group">
                                    <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                                        <div class="flex items-center space-x-2">
                                            <span>${progName}</span>
                                            <span class="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subjects</span>
                                        </div>
                                        <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </summary>
                                    <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                                `;
                                subs.forEach(s => {
                                    let displaySub = s.subject.replace(progName + ' - ', '').replace(progName + ' ', '');
                                    html += `
                                            <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-400 active:scale-95 transition-all shadow-sm group/label">
                                                <input type="checkbox" value="${s.subject}" class="pace-subject-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all">
                                                <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover/label:text-orange-600 dark:group-hover/label:text-orange-400 transition-colors" title="${s.subject}">${displaySub}</span>
                                            </label>`;
                                });
                                html += `
                                        </div>
                                    </div>
                                </details>`;
                            }
                        });
                    }
                });
            } else if (bType === 'programs') {
                html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">`;
                window.tracks.forEach(track => {
                    if (window.customPrograms[track.id] && window.customPrograms[track.id].length > 0) {
                        window.customPrograms[track.id].forEach(p => {
                            const pName = p.name || p;
                            html += `
                            <label class="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 active:scale-95 transition-all shadow-sm">
                                <input type="checkbox" value="${pName}" class="pace-subject-cb form-checkbox h-4 w-4 text-violet-500 rounded border-slate-300 focus:ring-violet-500 accent-violet-500 transition-all">
                                <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate">${pName}</span>
                            </label>`;
                        });
                    }
                });
                html += `</div>`;
            } else if (bType === 'global') {
                html += `<div class="mb-4"><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Subjects</h5>`;
                window.tracks.forEach(track => {
                    if (window.customPrograms[track.id]) {
                        window.customPrograms[track.id].forEach(prog => {
                            const progName = prog.name || prog;
                            const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);
                            if (subs.length > 0) {
                                html += `
                                <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group mb-2">
                                    <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                                        <div class="flex items-center space-x-2">
                                            <span>${progName}</span>
                                            <span class="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subjects</span>
                                        </div>
                                        <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </summary>
                                    <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                                `;
                                subs.forEach(s => {
                                    let displaySub = s.subject.replace(progName + ' - ', '').replace(progName + ' ', '');
                                    html += `
                                            <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-400 active:scale-95 transition-all shadow-sm group/label">
                                                <input type="checkbox" value="${s.subject}" class="global-subject-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all">
                                                <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover/label:text-orange-600 dark:group-hover/label:text-orange-400 transition-colors" title="${s.subject}">${displaySub}</span>
                                            </label>`;
                                });
                                html += `
                                        </div>
                                    </div>
                                </details>`;
                            }
                        });
                    }
                });
                html += `</div>`;

                html += `<div><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Secondary Paces</h5>`;
                const otherGoals = window.paceGoals.filter(g => g.type !== 'global');
                if (otherGoals.length > 0) {
                    html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                    otherGoals.forEach(g => {
                        html += `
                        <label class="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 active:scale-95 transition-all shadow-sm">
                            <input type="checkbox" value="${g.id}" class="global-pace-cb form-checkbox h-4 w-4 text-indigo-500 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-500 transition-all">
                            <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${g.target}">${g.target}</span>
                        </label>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<span class="text-[10px] text-slate-500">No other pace goals available to link.</span>`;
                }
                html += `</div>`;
            }

            container.innerHTML = html || '<span class="text-[10px] text-slate-500 col-span-full">No items found.</span>';
        };

        window.addPaceGoal = function () {
            const bType = document.getElementById('add-pace-bundle-type').value;
            const name = bType === 'global' ? 'Global Overall' : document.getElementById('add-pace-name').value.trim();
            const startStr = document.getElementById('add-pace-start').value;
            const dateStr = document.getElementById('add-pace-date').value;

            if (bType !== 'global' && !name) return showToast("Please provide a Goal Name.", "error");
            if (!startStr) return showToast("Please select a target start date.", "error");
            if (!dateStr) return showToast("Please select a target deadline date.", "error");

            const startDate = parseDateSafe(startStr);
            const targetDate = parseDateSafe(dateStr);
            if (targetDate <= startDate) return showToast("Target deadline must be after the start date.", "error");

            if (bType === 'global') {
                if (window.paceGoals.some(g => g.type === 'global')) return showToast("A Global Pace Goal already exists.", "error");

                const subjCheckboxes = document.querySelectorAll('.global-subject-cb:checked');
                const secCheckboxes = document.querySelectorAll('.global-pace-cb:checked');

                const selectedSubjects = Array.from(subjCheckboxes).map(cb => cb.value);
                const selectedSec = Array.from(secCheckboxes).map(cb => cb.value);

                window.paceGoals.push({
                    id: 'pg_' + Date.now(),
                    type: 'global',
                    target: name,
                    startDate: startStr,
                    deadline: dateStr,
                    subjects: selectedSubjects,
                    secondaryPaces: selectedSec
                });
            } else {
                const checkboxes = document.querySelectorAll('.pace-subject-cb:checked');
                const selectedItems = Array.from(checkboxes).map(cb => cb.value);

                if (selectedItems.length === 0) return showToast("Please select at least one item.", "error");
                if (window.paceGoals.some(g => g.target === name)) return showToast("A custom goal with this name already exists.", "error");

                let newGoal = {
                    id: 'pg_' + Date.now(),
                    type: 'bundle',
                    target: name,
                    startDate: startStr,
                    deadline: dateStr
                };

                if (bType === 'subjects') {
                    newGoal.subjects = selectedItems;
                } else {
                    newGoal.programs = selectedItems;
                }

                window.paceGoals.push(newGoal);
            }

            document.getElementById('add-pace-name').value = '';
            document.getElementById('add-pace-start').value = '';
            document.getElementById('add-pace-date').value = '';
            saveToCloud(); renderUI(); showToast("Custom Pace Goal added!", "success");
        };

        window.requestDeletePaceGoal = function (id) {
            window.openConfirmModal("Delete Pace Goal", "Are you sure you want to remove this target timeline?", () => window.deletePaceGoal(id));
        };

        window.deletePaceGoal = function (id) {
            window.paceGoals = window.paceGoals.filter(g => g.id !== id);
            if (window.dashboardConfig && window.dashboardConfig.activePaceGoalId === id) {
                const defaultGoal = window.paceGoals.find(g => g.id === 'global-timeline') || window.paceGoals[0];
                window.dashboardConfig.activePaceGoalId = defaultGoal ? defaultGoal.id : null;
            }
            saveToCloud(); renderUI(); showToast("Pace Goal deleted.", "success");
        };


// Expose functions to window namespace
window.rebuildTaskDates = rebuildTaskDates;
window.updateGlobalDates = updateGlobalDates;
window.calculateIndependentEstFinish = calculateIndependentEstFinish;
