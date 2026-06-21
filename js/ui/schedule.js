// js/ui/schedule.js
// Verbatim extraction of Schedule & Routine UI Logic from index.html


        window.switchRoutineSet = function (direction) {
            window.activeRoutineSet = window.activeRoutineSet === 1 ? 2 : 1;
            const badge = document.getElementById('active-routine-badge');
            if (badge) {
                badge.textContent = `Routine ${window.activeRoutineSet}`;
            }
            if (window.renderSchedulePage) {
                window.renderSchedulePage();
            }
        };







        // Helper to retrieve program's target CGPA and Grade from configuration or history
        window.getProgramMainTarget = function (progName) {
            let targetCGPA = '';
            for (const trackId in window.customPrograms) {
                const progList = window.customPrograms[trackId];
                if (Array.isArray(progList)) {
                    const prog = progList.find(p => (p.name || p) === progName);
                    if (prog && typeof prog === 'object' && prog.targetCGPA !== undefined && prog.targetCGPA !== null) {
                        targetCGPA = prog.targetCGPA.toString().trim();
                        if (targetCGPA) break;
                    }
                }
            }
            if (!targetCGPA) {
                const overallRecords = window.successResults
                    .filter(r => r.type === 'cgpa' && !r.subject && r.title === progName)
                    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
                if (overallRecords.length > 0 && overallRecords[0].targetCGPA) {
                    targetCGPA = overallRecords[0].targetCGPA.toString().trim();
                }
            }
            if (!targetCGPA) {
                const anyRecords = window.successResults
                    .filter(r => r.type === 'cgpa' && r.title === progName && r.targetCGPA)
                    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
                if (anyRecords.length > 0) {
                    targetCGPA = anyRecords[0].targetCGPA.toString().trim();
                }
            }
            let targetGrade = '';
            if (targetCGPA) {
                if (targetCGPA.toLowerCase() === 'none' || targetCGPA === '0') {
                    targetCGPA = 'none';
                    targetGrade = 'none';
                } else {
                    targetGrade = window.mapCgpaToGrade(targetCGPA);
                }
            }
            return { targetCGPA, targetGrade };
        };

        // Update all subject target badges from the overall program target
        window.updateSubjectTargets = function () {
            const evalType = document.getElementById('res-evaluation-type').value;
            const isGrade = evalType === 'grade';
            let targetCgpa = '';
            let targetGrade = '';
            if (isGrade) {
                targetGrade = (document.getElementById('res-overall-target-grade')?.value || '').trim();
                if (targetGrade.toLowerCase() === 'none' || targetGrade === '0') {
                    targetGrade = 'none';
                    targetCgpa = 'none';
                } else {
                    targetCgpa = targetGrade ? window.formatCgpaMin2Dec(window.mapGradeToNumeric(targetGrade, evalType)) : '';
                }
            } else {
                targetCgpa = (document.getElementById('res-overall-target-cgpa')?.value || '').trim();
                if (targetCgpa.toLowerCase() === 'none' || targetCgpa === '0') {
                    targetCgpa = 'none';
                    targetGrade = 'none';
                } else {
                    targetGrade = targetCgpa ? window.mapCgpaToGrade(targetCgpa) : '';
                }
            }

            // Prefill is handled on program select change, not continuously on edit.

            document.querySelectorAll('.res-sub-target-badge').forEach(badge => {
                if (targetCgpa && targetCgpa !== 'none' && targetGrade && targetGrade !== 'none') {
                    badge.textContent = isGrade ? `Target: ${targetGrade} (${targetCgpa})` : `Target: ${targetCgpa} (${targetGrade})`;
                    badge.classList.remove('opacity-30');
                } else if (targetCgpa === 'none') {
                    badge.textContent = 'Target: None';
                    badge.classList.add('opacity-30');
                } else {
                    badge.textContent = 'Target: —';
                    badge.classList.add('opacity-30');
                }
            });
        };

        // Real-time overall score estimation from subject inputs in modal
        window.updateModalEstScore = function () {
            const evalTypeEl = document.getElementById('res-evaluation-type');
            if (!evalTypeEl) return;
            const evalType = evalTypeEl.value;
            const isGrade = evalType === 'grade';

            const estCgpaEl = document.getElementById('res-overall-est-cgpa');
            const estGradeEl = document.getElementById('res-overall-est-grade');

            if (isGrade) {
                const gradeInputs = document.querySelectorAll('.res-sub-grade-input');
                const grades = [];
                gradeInputs.forEach(input => {
                    const val = input.value.trim();
                    if (val) grades.push(val);
                });

                if (grades.length > 0) {
                    const sumCgpa = grades.reduce((sum, g) => sum + window.mapGradeToNumeric(g, 'grade'), 0);
                    const avgCgpa = sumCgpa / grades.length;
                    const estGrade = window.mapCgpaToGrade(avgCgpa, 'grade');

                    if (estGradeEl) estGradeEl.value = estGrade;
                    const badge = estGradeEl ? estGradeEl.parentElement.querySelector('.auto-cgpa-badge') : null;
                    if (badge) {
                        badge.textContent = window.formatCgpaMin2Dec(avgCgpa);
                        badge.classList.remove('opacity-40');
                    }
                } else {
                    if (estGradeEl) estGradeEl.value = '';
                    const badge = estGradeEl ? estGradeEl.parentElement.querySelector('.auto-cgpa-badge') : null;
                    if (badge) {
                        badge.textContent = '—';
                        badge.classList.add('opacity-40');
                    }
                }
            } else {
                const cgpaInputs = document.querySelectorAll('.res-sub-cgpa-input');
                const cgpas = [];
                cgpaInputs.forEach(input => {
                    const val = parseFloat(input.value.trim());
                    if (!isNaN(val)) cgpas.push(val);
                });

                if (cgpas.length > 0) {
                    const avgCgpa = cgpas.reduce((sum, c) => sum + c, 0) / cgpas.length;
                    const estGrade = window.mapCgpaToGrade(avgCgpa, 'cgpa');

                    if (estCgpaEl) estCgpaEl.value = window.formatCgpaMin2Dec(avgCgpa);
                    const badge = estCgpaEl ? estCgpaEl.parentElement.querySelector('.auto-grade-badge') : null;
                    if (badge) {
                        badge.textContent = estGrade || '—';
                        badge.classList.remove('opacity-40');
                    }
                } else {
                    if (estCgpaEl) estCgpaEl.value = '';
                    const badge = estCgpaEl ? estCgpaEl.parentElement.querySelector('.auto-grade-badge') : null;
                    if (badge) {
                        badge.textContent = '—';
                        badge.classList.add('opacity-40');
                    }
                }
            }
        };

        function ensureAvailableSlots(slotsNeeded, track, startIndex) {
            let availableSlots = 0;
            const key = track + 'Tasks';
            for (let i = startIndex; i < tasks.length; i++) {
                if (tasks[i].type !== 'study') continue;
                if (tasks[i][key] && tasks[i][key].some(b => b.subject === 'Revision')) availableSlots++;
            }

            let slotsToCreate = slotsNeeded - availableSlots;
            if (slotsToCreate <= 0) return;

            let lastTaskId = tasks.length > 0 ? tasks[tasks.length - 1].id : 0;
            let lastStudyDay = 0;
            for (let i = tasks.length - 1; i >= 0; i--) {
                if (tasks[i].type === 'study') { lastStudyDay = tasks[i].studyDay; break; }
            }

            let createdSlots = 0;
            while (createdSlots < slotsToCreate) {
                lastTaskId++;
                const baseDate = new Date(PLAN_START_DATE.getTime());
                baseDate.setDate(baseDate.getDate() + (lastTaskId - 1));

                const dayName = baseDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = formatDate(baseDate);

                if (dayName === 'Fri') {
                    const task = { id: lastTaskId, date: dateStr, day: dayName, type: 'holiday' };
                    window.tracks.forEach(t => {
                        task[t.id + 'Study'] = false;
                    });
                    if (Array.isArray(window.customActions)) {
                        window.customActions.forEach(act => { task[act.id] = false; });
                    }
                    tasks.push(task);
                } else {
                    lastStudyDay++;
                    const task = {
                        id: lastTaskId, date: dateStr, day: dayName, type: 'study', studyDay: lastStudyDay
                    };
                    window.tracks.forEach(t => {
                        task[t.id + 'Study'] = false;
                        task[t.id + 'Tasks'] = [{ subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: `${t.id}-${lastTaskId}` }];
                    });
                    if (Array.isArray(window.customActions)) {
                        window.customActions.forEach(act => { task[act.id] = false; });
                    }
                    tasks.push(task);
                    createdSlots++;
                }
            }

            const newEndDate = new Date(PLAN_START_DATE.getTime());
            newEndDate.setDate(newEndDate.getDate() + (lastTaskId - 1));
            PLAN_END_DATE = newEndDate;
        }

        window.customPrograms = {};

        let syllabusStructure = {};

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


        let totalStaticChapters = 0;

        function recalculateTotals() {
            let total = 0;
            window.tracks.forEach(trackObj => {
                const track = trackObj.id;
                if (Array.isArray(syllabusStructure[track])) {
                    total += syllabusStructure[track].reduce((acc, s) => acc + s.chapters, 0);
                }
            });
            totalStaticChapters = total;
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
        tasks = defaultTasks;
        recalculateTotals();
        




        window.openAccountSettingsModal = function () {
            const user = window.currentUser || { displayName: 'ris2k29', email: 'ris2k29@gmail.com' };
            const nameInput = document.getElementById('account-input-name');
            const emailInput = document.getElementById('account-input-email');

            const localName = localStorage.getItem('studyPlan_profileName');
            const localEmail = localStorage.getItem('studyPlan_profileEmail');

            if (nameInput) nameInput.value = localName || user.displayName || '';
            if (emailInput) emailInput.value = localEmail || user.email || '';

            openModal('account-settings-modal');
        };

        window.submitAccountUpdate = function () {
            const nameInput = document.getElementById('account-input-name');
            const emailInput = document.getElementById('account-input-email');
            if (!nameInput || !emailInput) return;

            const newName = nameInput.value.trim();
            const newEmail = emailInput.value.trim();

            if (!newName) {
                showToast("Display Name cannot be empty.", "error");
                return;
            }
            if (!newEmail || !newEmail.includes('@')) {
                showToast("Please enter a valid email address.", "error");
                return;
            }

            localStorage.setItem('studyPlan_profileName', newName);
            localStorage.setItem('studyPlan_profileEmail', newEmail);

            if (window.currentUser) {
                window.currentUser.displayName = newName;
                window.currentUser.email = newEmail;
            } else {
                window.currentUser = { displayName: newName, email: newEmail };
            }

            const profileNameEl = document.getElementById('profile-name');
            const profileEmailEl = document.getElementById('profile-email');
            const profileAvatarEl = document.getElementById('profile-avatar');
            if (profileNameEl) profileNameEl.textContent = newName;
            if (profileEmailEl) profileEmailEl.textContent = newEmail;
            if (profileAvatarEl) {
                profileAvatarEl.textContent = newName.charAt(0).toUpperCase();
            }

            if (typeof firebase !== 'undefined' && firebase.auth) {
                const fbUser = firebase.auth().currentUser;
                if (fbUser) {
                    fbUser.updateProfile({
                        displayName: newName
                    }).catch(err => console.warn("Firebase updateProfile failed:", err));
                }
            }

            closeModal('account-settings-modal');
            showToast("Account settings updated successfully.", "success");
        };

        window.selectedScheduleColor = '#6366f1';
        window.selectedScheduleColor = '#6366f1';
        window.editingScheduleBlockId = null;
        if (!window.scheduleGroups) window.scheduleGroups = [];

        window.editingScheduleGroupId = null;

        window.openCreateScheduleGroup = function (groupId) {
            window.editingScheduleGroupId = groupId || null;

            const titleEl = document.getElementById('csgm-title');
            const submitBtn = document.getElementById('csgm-submit-btn');
            const nameInput = document.getElementById('group-input-name');

            let currentGroup = null;
            if (groupId && window.scheduleGroups) {
                currentGroup = window.scheduleGroups.find(g => g.id === groupId);
            }

            if (titleEl) {
                titleEl.textContent = currentGroup ? 'Edit Work Group' : 'Create Work Group';
            }
            if (submitBtn) {
                submitBtn.textContent = currentGroup ? 'Save Changes' : 'Create Group';
            }
            if (nameInput) {
                nameInput.value = currentGroup ? currentGroup.name : '';
            }

            const listEl = document.getElementById('group-modal-ungrouped-list');
            if (listEl) {
                const workTotals = {};
                const blocks = window.scheduleBlocks || [];

                const timeToMinutes = (t) => {
                    if (!t) return 0;
                    const parts = t.split(':').map(Number);
                    return (parts[0] || 0) * 60 + (parts[1] || 0);
                };

                blocks.forEach(b => {
                    const name = b.task || 'Untitled Work';
                    const startMin = timeToMinutes(b.startTime);
                    const endMin = timeToMinutes(b.endTime);
                    const hours = (endMin - startMin) / 60;
                    if (hours > 0) {
                        workTotals[name] = (workTotals[name] || 0) + hours;
                    }
                });

                const uniqueNames = Object.keys(workTotals);

                // Show items that are not in any group OR are already in the group we are editing
                const availableNames = uniqueNames.filter(name => {
                    const g = window.getGroupForWork(name);
                    return g === null || (currentGroup && g.id === currentGroup.id);
                });

                if (availableNames.length === 0) {
                    listEl.innerHTML = `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider py-2">No work items available to group.</p>`;
                } else {
                    listEl.innerHTML = availableNames.map(name => {
                        const isChecked = currentGroup && (currentGroup.items || []).includes(name);
                        return `
                            <label class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all select-none w-full">
                                <input type="checkbox" name="group-work-item" value="${name.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 cursor-pointer">
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${name}</span>
                            </label>
                        `;
                    }).join('');
                }
            }
            openModal('create-schedule-group-modal');
        };

        window.submitCreateScheduleGroup = function () {
            const nameInput = document.getElementById('group-input-name');
            if (!nameInput) return;
            const name = nameInput.value.trim();
            if (!name) {
                showToast('Please enter a group name.', 'error');
                return;
            }
            if (!window.scheduleGroups) window.scheduleGroups = [];

            const checkboxes = document.querySelectorAll('input[name="group-work-item"]:checked');
            const items = Array.from(checkboxes).map(cb => cb.value);

            if (window.editingScheduleGroupId) {
                // Editing mode
                const grp = window.scheduleGroups.find(g => g.id === window.editingScheduleGroupId);
                if (!grp) return;

                // Name check excluding itself
                if (window.scheduleGroups.some(g => g.id !== window.editingScheduleGroupId && g.name.toLowerCase() === name.toLowerCase())) {
                    showToast('Another group with that name already exists.', 'error');
                    return;
                }

                grp.name = name;
                grp.items = items;
                window.editingScheduleGroupId = null;
                showToast(`Group "${name}" updated.`, 'success');
            } else {
                // Creation mode
                if (window.scheduleGroups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
                    showToast('A group with that name already exists.', 'error');
                    return;
                }
                const colors = ['#6366f1', '#10b981', '#f97316', '#8b5cf6', '#f43f5e', '#06b6d4', '#f59e0b', '#64748b'];
                window.scheduleGroups.push({
                    id: 'sgrp-' + Date.now(),
                    name: name,
                    color: colors[window.scheduleGroups.length % colors.length],
                    items: items
                });
                showToast(`Group "${name}" created with ${items.length} items.`, 'success');
            }

            saveToCloud(true);
            closeModal('create-schedule-group-modal');
            if (window.renderSchedulePage) window.renderSchedulePage();
        };

        window.deleteScheduleGroup = function (groupId) {
            window.openConfirmModal('Delete Group', 'Remove this group? Items will become ungrouped.', () => {
                if (!window.scheduleGroups) return;
                window.scheduleGroups = window.scheduleGroups.filter(g => g.id !== groupId);
                saveToCloud(true);
                if (window.renderSchedulePage) window.renderSchedulePage();
                showToast('Group deleted.', 'success');
            });
        };

        window.assignSlotToGroup = function (workName, groupId) {
            if (!window.scheduleGroups) return;
            // Remove from all groups first
            window.scheduleGroups.forEach(g => {
                g.items = (g.items || []).filter(n => n !== workName);
            });
            // Add to target group
            const grp = window.scheduleGroups.find(g => g.id === groupId);
            if (grp) {
                if (!grp.items) grp.items = [];
                grp.items.push(workName);
            }
            saveToCloud(true);
            if (window.renderSchedulePage) window.renderSchedulePage();
        };

        window.removeSlotFromGroup = function (workName) {
            if (!window.scheduleGroups) return;
            window.scheduleGroups.forEach(g => {
                g.items = (g.items || []).filter(n => n !== workName);
            });
            saveToCloud(true);
            if (window.renderSchedulePage) window.renderSchedulePage();
        };

        window.getGroupForWork = function (workName) {
            if (!window.scheduleGroups) return null;
            return window.scheduleGroups.find(g => (g.items || []).includes(workName)) || null;
        };

        window.updateActiveScheduleSlot = function () {
            const activeContainer = document.getElementById('schedule-active-now-container');
            const mobileContainer = document.getElementById('schedule-active-now-mobile');
            const dashContainer = document.getElementById('dashboard-active-now-container');
            const dashTimerContainer = document.getElementById('dashboard-focus-timer-container');

            // Check active routine set for active block
            const currentSet = window.activeRoutineSet || 1;
            const dailyBlocks = ((currentSet === 2) ? (window.scheduleBlocks2 || []) : (window.scheduleBlocks || []))
                                .filter(b => b.day === 'Daily');

            const timeToMinutes = (t) => {
                if (!t) return 0;
                const parts = t.split(':').map(Number);
                return (parts[0] || 0) * 60 + (parts[1] || 0);
            };

            const formatTime12h = (timeStr) => {
                if (!timeStr) return '';
                const parts = timeStr.split(':').map(Number);
                let hrs = parts[0] || 0;
                const mins = parts[1] || 0;
                const ampm = hrs >= 12 ? 'PM' : 'AM';
                hrs = hrs % 12;
                if (hrs === 0) hrs = 12;
                return `${hrs}:${mins.toString().padStart(2, '0')} ${ampm}`;
            };

            const now = new Date();
            const currentMin = now.getHours() * 60 + now.getMinutes();
            const currentSec = now.getSeconds();

            let activeBlock = null;
            dailyBlocks.forEach(b => {
                const startMin = timeToMinutes(b.startTime);
                const endMin = timeToMinutes(b.endTime);
                if (startMin <= currentMin && currentMin < endMin) {
                    activeBlock = b;
                }
            });

            // Build desktop Active Now HTML (sidebar - compact)
            let desktopHtml = '';
            // Build mobile Active Now HTML (top of page - larger, more prominent)
            let mobileHtml = '';
            // Build dashboard Active Now HTML (compact, clickable navigation)
            let dashHtml = '';
            // Build dashboard Focus Timer HTML
            let dashTimerHtml = '';

            let timerElapsedMs = 0;
            let isTimerActive = false;
            let timerSeconds = 0;
            let timerProgressPercent = 0;
            let timerSubject = 'General Study';
            let timerModeLabel = 'TIMER';
            let timerStatusText = 'READY';
            let timerColor = '#2563eb';
            
            if (window.activeTimerState) {
                let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
                if (window.activeTimerState.isRunning && window.activeTimerState.startTime) {
                    elapsedMs += (Date.now() - window.activeTimerState.startTime);
                }
                timerElapsedMs = elapsedMs;
                isTimerActive = window.activeTimerState.isRunning || elapsedMs > 0;
                
                timerSubject = window.activeTimerState.selectedSubject || 'General Study';
                timerModeLabel = window.activeTimerState.mode.toUpperCase();
                timerColor = window.getSubjectColor ? window.getSubjectColor(timerSubject) : '#2563eb';
                timerStatusText = window.activeTimerState.isRunning ? 'FOCUSING' : (elapsedMs > 0 ? 'PAUSED' : 'READY');
                
                if (window.activeTimerState.mode === 'stopwatch') {
                    timerSeconds = Math.floor(elapsedMs / 1000);
                    timerProgressPercent = Math.round(((timerSeconds % 60) / 60) * 100);
                } else {
                    const targetMs = (window.activeTimerState.targetDuration || 0) * 1000;
                    const remainingMs = Math.max(0, targetMs - elapsedMs);
                    timerSeconds = window.activeTimerState.isRunning ? Math.ceil(remainingMs / 1000) : Math.floor(remainingMs / 1000);
                    const target = window.activeTimerState.targetDuration || 1;
                    const elapsedSec = Math.floor(elapsedMs / 1000);
                    timerProgressPercent = Math.min(100, Math.round((elapsedSec / target) * 100));
                }
            }

            if (activeBlock) {
                const startMin = timeToMinutes(activeBlock.startTime);
                const endMin = timeToMinutes(activeBlock.endTime);
                const durationMins = endMin - startMin;
                const elapsedMins = currentMin - startMin;
                const progressPercent = Math.round((elapsedMins / durationMins) * 100);

                // Calculate remaining time in HH:MM:SS
                const totalRemainingSeconds = (endMin - currentMin) * 60 - currentSec;
                const remHrs = Math.floor(totalRemainingSeconds / 3600);
                const remMins = Math.floor((totalRemainingSeconds % 3600) / 60);
                const remSecs = totalRemainingSeconds % 60;
                const countdownStr = `${String(remHrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(remSecs < 0 ? 0 : remSecs).padStart(2, '0')}`;

                const timeRangeStr = `${formatTime12h(activeBlock.startTime)} - ${formatTime12h(activeBlock.endTime)}`;
                const category = activeBlock.track || activeBlock.program || 'Routine';
                const blockColor = activeBlock.color || '#6366f1';

                // Desktop version (sidebar)
                desktopHtml = `
                    <div class="flex items-center justify-between mb-1.5 select-none">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Now</h3>
                        <span class="flex h-2 w-2 relative">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                    
                    <div class="rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all hover:shadow-md"
                         style="min-height: 180px; background-color: ${blockColor}cc; border: 1.5px solid ${blockColor};"
                         onclick="window.openEditScheduleModal('${activeBlock.id}')">
                        
                        <div class="flex flex-col gap-1.5 min-w-0">
                            <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block self-start leading-none max-w-full truncate"
                                  style="border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.12);">${category}</span>
                            <h4 class="text-base font-bold text-white leading-snug tracking-tight truncate mt-0.5" title="${activeBlock.task}">${activeBlock.task}</h4>
                        </div>
                        
                        <div class="mt-2 space-y-2">
                            <div class="text-center">
                                <span class="text-xl font-black font-mono tracking-wider text-white tabular-nums" style="text-shadow: 0 1px 4px rgba(0,0,0,0.2);">${countdownStr}</span>
                            </div>
                            <div class="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                                <div class="h-full rounded-full bg-white/60 transition-all duration-500" style="width: ${progressPercent}%;"></div>
                            </div>
                            <div class="flex items-center justify-between gap-2 shrink-0">
                                <span class="text-[10px] font-bold font-mono tracking-tight" style="color: rgba(255,255,255,0.75);">${timeRangeStr}</span>
                            </div>
                        </div>
                    </div>
                `;

                // Mobile version (top of page - bigger, horizontal)
                mobileHtml = `
                    <div class="rounded-2xl overflow-hidden border shadow-lg" style="border-color: ${blockColor}55; background: linear-gradient(135deg, ${blockColor}dd, ${blockColor}bb);">
                        <div class="p-4 pb-3">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="flex h-2.5 w-2.5 relative">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <h3 class="text-xs font-black uppercase tracking-widest text-white/90">Active Now</h3>
                                </div>
                                <span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                                      style="border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.1);">${category}</span>
                            </div>
                            
                            <h4 class="text-lg font-bold text-white leading-snug tracking-tight mb-2 truncate" 
                                title="${activeBlock.task}"
                                onclick="window.openEditScheduleModal('${activeBlock.id}')"
                                style="cursor: pointer;">${activeBlock.task}</h4>
                            
                            <div class="flex items-center justify-between mb-2.5">
                                <span class="text-2xl font-black font-mono tracking-wider text-white tabular-nums" style="text-shadow: 0 1px 6px rgba(0,0,0,0.25);">${countdownStr}</span>
                                <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">remaining</span>
                            </div>
                            
                            <div class="w-full bg-white/15 rounded-full h-2 mb-2.5 overflow-hidden">
                                <div class="h-full rounded-full bg-white/60 transition-all duration-500" style="width: ${progressPercent}%;"></div>
                            </div>
                            
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-xs font-bold font-mono tracking-tight" style="color: rgba(255,255,255,0.8);">${timeRangeStr}</span>
                            </div>
                        </div>
                    </div>
                `;

                // Dashboard version (clickable shortcut to Daily Schedule)
                dashHtml = `
                    <div class="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-sm flex flex-col overflow-hidden" style="height: 225px; min-height: 225px;">
                        <div class="p-4 pb-2 border-b border-slate-100 dark:border-slate-700 select-none flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Now</h3>
                            </div>
                            <span class="flex h-2 w-2 relative">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        
                        <div class="flex-1 p-4 relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all active:scale-98 rounded-b-[22px] rounded-t-none"
                             style="background-color: ${blockColor}cc;"
                             onclick="window.switchPage('schedule')">
                            
                            <div class="flex flex-col gap-1.5 min-w-0">
                                <span class="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded inline-block self-start leading-none max-w-full truncate"
                                      style="border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.12);">${category}</span>
                                <h4 class="text-sm font-black text-white leading-snug tracking-tight truncate mt-1" title="${activeBlock.task}">${activeBlock.task}</h4>
                            </div>
                            
                            <div class="mt-2 space-y-2">
                                <div class="text-center">
                                    <span class="text-2xl font-black font-mono tracking-widest text-white tabular-nums" style="text-shadow: 0 2px 8px rgba(0,0,0,0.35);">${countdownStr}</span>
                                </div>
                                <div class="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                                    <div class="h-full rounded-full bg-white/70 transition-all duration-500" style="width: ${progressPercent}%;"></div>
                                </div>
                                <div class="flex items-center justify-between gap-2 shrink-0 font-sans mt-1">
                                    <span class="text-[11px] font-bold font-mono tracking-tight text-white/85">${timeRangeStr}</span>
                                    <span class="text-[9px] font-black uppercase text-white/95 tracking-wider bg-white/15 px-2 py-0.5 rounded flex items-center gap-0.5">Go to Schedule &rarr;</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Desktop idle
                desktopHtml = `
                    <div class="flex items-center justify-between mb-1.5 select-none">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Now</h3>
                        <span class="flex h-2 w-2 relative">
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-350 dark:bg-slate-650"></span>
                        </span>
                    </div>
                    
                    <div class="bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all select-none"
                         style="min-height: 180px;">
                        <div class="flex items-center gap-2">
                            <span class="text-base">☀️</span>
                            <h4 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Free Time</h4>
                        </div>
                        <p class="text-[9px] opacity-75 text-slate-440 dark:text-slate-500 mt-2">No active routine slot right now.</p>
                    </div>
                `;

                // Mobile idle
                mobileHtml = `
                    <div class="bg-slate-50 dark:bg-slate-800/80 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between transition-all select-none">
                        <div class="flex items-center gap-2.5">
                            <span class="flex h-2.5 w-2.5 relative">
                                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-350 dark:bg-slate-650"></span>
                            </span>
                            <h3 class="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Now</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-base">☀️</span>
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">Free Time</span>
                        </div>
                    </div>
                `;

                // Dashboard idle
                dashHtml = `
                    <div class="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-sm flex flex-col overflow-hidden" style="height: 225px; min-height: 225px;">
                        <div class="p-4 pb-2 border-b border-slate-100 dark:border-slate-700 select-none flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Now</h3>
                            </div>
                            <span class="flex h-2 w-2 relative">
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-350 dark:bg-slate-650"></span>
                            </span>
                        </div>
                        
                        <div class="bg-slate-50/40 dark:bg-slate-900/20 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 select-none active:scale-98 flex-1 rounded-b-[22px] rounded-t-none p-5"
                             onclick="window.switchPage('schedule')">
                            <div class="flex items-center gap-2.5">
                                <span class="text-2xl">☀️</span>
                                <h4 class="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-450">Free Time</h4>
                            </div>
                            <p class="text-xs font-bold text-slate-400 dark:text-slate-555 mt-2.5">No active routine slot right now.<br>Go to Schedule &rarr;</p>
                        </div>
                    </div>
                `;
            }

            // Build Focus Timer HTML independently
            if (isTimerActive) {
                const hrs = Math.floor(timerSeconds / 3600);
                const mins = Math.floor((timerSeconds % 3600) / 60);
                const secs = timerSeconds % 60;
                const clockText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                
                const statusDot = window.activeTimerState.isRunning ? `
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                ` : `
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                `;

                dashTimerHtml = `
                    <div class="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-sm flex flex-col overflow-hidden" style="height: 225px; min-height: 225px;">
                        <div class="p-4 pb-2 border-b border-slate-100 dark:border-slate-700 select-none flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Focus Timer</h3>
                            </div>
                            <span class="flex h-2 w-2 relative">
                                ${statusDot}
                            </span>
                        </div>
                        
                        <div class="flex-1 p-4 relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all active:scale-98 rounded-b-[22px] rounded-t-none"
                             style="background-color: ${timerColor}cc;"
                             onclick="window.switchPage('timer')">
                            
                            <div class="flex flex-col gap-1.5 min-w-0">
                                <div class="flex justify-between items-center gap-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded inline-block self-start leading-none max-w-full truncate"
                                          style="border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.12);">${timerModeLabel}</span>
                                    <span class="text-[9px] font-black uppercase text-white/95 tracking-wider bg-white/15 px-2 py-0.5 rounded flex items-center gap-0.5">${timerStatusText}</span>
                                </div>
                                <h4 class="text-sm font-black text-white leading-snug tracking-tight truncate mt-1" title="${timerSubject}">${timerSubject}</h4>
                            </div>
                            
                            <div class="mt-2 space-y-2">
                                <div class="text-center">
                                    <span class="text-2xl font-black font-mono tracking-widest text-white tabular-nums" style="text-shadow: 0 2px 8px rgba(0,0,0,0.35);">${clockText}</span>
                                </div>
                                <div class="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                                    <div class="h-full rounded-full bg-white/70 transition-all duration-500" style="width: ${timerProgressPercent}%;"></div>
                                </div>
                                <div class="flex items-center justify-between gap-2 shrink-0 mt-1">
                                    <div class="flex items-center gap-1.5">
                                        <button onclick="event.stopPropagation(); window.toggleTimerClick();" 
                                                class="px-2.5 py-1 bg-white/20 hover:bg-white/35 text-white font-black text-[9px] uppercase tracking-widest rounded border border-white/25 active:scale-95 transition-all">
                                            ${window.activeTimerState.isRunning ? 'PAUSE' : 'START'}
                                        </button>
                                        <button onclick="event.stopPropagation(); window.resetTimerClick();" 
                                                class="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white/90 font-black text-[9px] uppercase tracking-widest rounded border border-white/10 active:scale-95 transition-all">
                                            RESET
                                        </button>
                                    </div>
                                    <span class="text-[8px] font-black uppercase text-white/95 tracking-wider bg-white/15 px-2 py-0.5 rounded flex items-center gap-0.5">Open &rarr;</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Empty Focus Timer card (clickable navigation to timer page)
                dashTimerHtml = `
                    <div class="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-sm flex flex-col overflow-hidden" style="height: 225px; min-height: 225px;">
                        <div class="p-4 pb-2 border-b border-slate-100 dark:border-slate-700 select-none flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Focus Timer</h3>
                            </div>
                            <span class="flex h-2 w-2 relative">
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-350 dark:bg-slate-650"></span>
                            </span>
                        </div>
                        
                        <div class="bg-slate-50/40 dark:bg-slate-900/20 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 select-none active:scale-98 flex-1 rounded-b-[22px] rounded-t-none p-5"
                             onclick="window.switchPage('timer')">
                            <div class="flex items-center gap-2.5">
                                <span class="text-2xl">⏱️</span>
                                <h4 class="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Focus Timer</h4>
                            </div>
                            <p class="text-xs font-bold text-slate-400 dark:text-slate-555 mt-2.5">No active timer session.<br>Tap to start focusing &rarr;</p>
                        </div>
                    </div>
                `;
            }

            if (activeContainer) activeContainer.innerHTML = desktopHtml;
            if (mobileContainer) mobileContainer.innerHTML = mobileHtml;
            if (dashContainer) dashContainer.innerHTML = dashHtml;
            if (dashTimerContainer) dashTimerContainer.innerHTML = dashTimerHtml;
        };

        // Live Header Clock with seconds (updates clock and active slot display)
        setInterval(() => {
            const now = new Date();
            let hrs = now.getHours();
            const mins = now.getMinutes().toString().padStart(2, '0');
            const secs = now.getSeconds().toString().padStart(2, '0');
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12;
            if (hrs === 0) hrs = 12;
            const timeString = `${hrs}:${mins}:${secs} ${ampm}`;

            const clockEl = document.getElementById('header-clock-stats');
            if (clockEl) {
                clockEl.innerHTML = `
                    <div class="flex items-center space-x-2 md:space-x-3">
                        <div class="p-2 md:p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg md:rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-blue-600 dark:text-blue-450 flex items-center justify-center">
                            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div class="text-left">
                            <span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Current Time</span>
                            <span class="text-blue-600 dark:text-blue-450 font-black text-sm md:text-base tracking-tight font-mono">${timeString}</span>
                        </div>
                    </div>
                `;
            }

            const mobileClockEl = document.getElementById('mobile-header-clock');
            if (mobileClockEl) {
                mobileClockEl.innerHTML = `
                    <div class="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm text-blue-600 dark:text-blue-450">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span class="font-black text-[11px] tracking-tight font-mono">${timeString}</span>
                    </div>
                `;
            }

            // Periodically refresh the Active Now view
            window.updateActiveScheduleSlot();

            // Update alarm start time value if needed
            if (window.updateAlarmStartText) {
                window.updateAlarmStartText();
            }
        }, 1000);

        window.selectScheduleColor = function (color, btnEl) {
            window.selectedScheduleColor = color;
            const picker = document.getElementById('schedule-color-picker');
            if (picker) {
                picker.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
                });
            }
            if (btnEl) {
                btnEl.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
            }
        };

        window.onScheduleTrackChange = function (selectedProgram) {
            const trackSelect = document.getElementById('schedule-input-track');
            const programSelect = document.getElementById('schedule-input-program');
            if (!trackSelect || !programSelect) return;

            const selectedTrackId = trackSelect.value;
            let programHtml = '<option value="">None (Optional)</option>';

            if (selectedTrackId) {
                const programs = window.customPrograms ? (window.customPrograms[selectedTrackId] || []) : [];
                programs.forEach(p => {
                    const pName = (typeof p === 'string') ? p : (p.name || '');
                    if (pName) programHtml += `<option value="${pName}">${pName}</option>`;
                });
            }
            programSelect.innerHTML = programHtml;
            if (selectedProgram) {
                programSelect.value = selectedProgram;
            } else {
                programSelect.value = '';
            }
        };

        window.openAddScheduleModal = function () {
            window.editingScheduleBlockId = null;
            const currentSet = window.activeRoutineSet || 1;
            window.editingScheduleSet = currentSet;

            const startInput = document.getElementById('schedule-input-start');
            if (startInput) startInput.value = '09:00';

            const endInput = document.getElementById('schedule-input-end');
            if (endInput) endInput.value = '10:00';

            const taskInput = document.getElementById('schedule-input-task');
            if (taskInput) taskInput.value = '';

            const trackSelect = document.getElementById('schedule-input-track');
            const programSelect = document.getElementById('schedule-input-program');
            if (trackSelect) {
                let trackHtml = '<option value="">None (Optional)</option>';
                (window.tracks || []).forEach(t => {
                    trackHtml += `<option value="${t.id}">${t.name}</option>`;
                });
                trackSelect.innerHTML = trackHtml;
                trackSelect.value = '';
            }
            if (programSelect) {
                programSelect.innerHTML = '<option value="">None (Optional)</option>';
                programSelect.value = '';
            }

            const defaultColor = currentSet === 2 ? '#8b5cf6' : '#6366f1';
            const pickerBtn = document.querySelector(`#schedule-color-picker button[data-color="${defaultColor}"]`) || document.querySelector('#schedule-color-picker button');
            window.selectScheduleColor(defaultColor, pickerBtn);

            const dayStartCb = document.getElementById('schedule-input-daystart');
            if (dayStartCb) dayStartCb.checked = false;

            const titleEl = document.querySelector('#add-schedule-modal h2');
            if (titleEl) titleEl.textContent = currentSet === 2 ? 'Add Routine 2 Slot' : 'Add Daily Slot';
            const descEl = document.querySelector('#add-schedule-modal p');
            if (descEl) descEl.textContent = currentSet === 2 ? 'Add a slot to your second routine set' : 'Plan your daily schedule slot';
            const submitBtn = document.querySelector('#add-schedule-modal button[onclick="window.submitAddScheduleBlock()"]');
            if (submitBtn) submitBtn.textContent = 'Add Slot';

            openModal('add-schedule-modal');
        };

        window.openEditScheduleModal = function (blockId) {
            const currentSet = window.activeRoutineSet || 1;
            window.editingScheduleSet = currentSet;
            const blocks = (currentSet === 2) ? (window.scheduleBlocks2 || []) : (window.scheduleBlocks || []);
            const block = blocks.find(b => b.id === blockId);
            if (!block) return;

            window.editingScheduleBlockId = blockId;

            const startInput = document.getElementById('schedule-input-start');
            if (startInput) startInput.value = block.startTime || '09:00';

            const endInput = document.getElementById('schedule-input-end');
            if (endInput) endInput.value = block.endTime || '10:00';

            const taskInput = document.getElementById('schedule-input-task');
            if (taskInput) taskInput.value = block.task || '';

            const trackSelect = document.getElementById('schedule-input-track');
            if (trackSelect) {
                let trackHtml = '<option value="">None (Optional)</option>';
                (window.tracks || []).forEach(t => {
                    trackHtml += `<option value="${t.id}">${t.name}</option>`;
                });
                trackSelect.innerHTML = trackHtml;
                trackSelect.value = block.track || '';
            }

            window.onScheduleTrackChange(block.program || '');

            const color = block.color || (currentSet === 2 ? '#8b5cf6' : '#6366f1');
            const pickerBtn = document.querySelector(`#schedule-color-picker button[data-color="${color}"]`) || document.querySelector('#schedule-color-picker button');
            window.selectScheduleColor(color, pickerBtn);

            const dayStartCb = document.getElementById('schedule-input-daystart');
            if (dayStartCb) dayStartCb.checked = !!block.isDayStart;

            const titleEl = document.querySelector('#add-schedule-modal h2');
            if (titleEl) titleEl.textContent = currentSet === 2 ? 'Edit Routine 2 Slot' : 'Edit Daily Slot';
            const descEl = document.querySelector('#add-schedule-modal p');
            if (descEl) descEl.textContent = currentSet === 2 ? 'Update your second routine set slot' : 'Update your daily schedule slot';
            const submitBtn = document.querySelector('#add-schedule-modal button[onclick="window.submitAddScheduleBlock()"]');
            if (submitBtn) submitBtn.textContent = 'Save Changes';

            openModal('add-schedule-modal');
        };

        window.deleteScheduleBlock = function (blockId) {
            const currentSet = window.activeRoutineSet || 1;
            const title = currentSet === 2 ? "Delete Routine 2 Slot" : "Delete Routine Slot";
            const text = currentSet === 2 ? "Are you sure you want to delete this routine slot from Routine 2?" : "Are you sure you want to delete this routine slot?";
            window.openConfirmModal(title, text, () => {
                if (currentSet === 2) {
                    if (window.scheduleBlocks2) {
                        window.scheduleBlocks2 = window.scheduleBlocks2.filter(b => b.id !== blockId);
                        saveToCloud(true);
                        renderUI();
                        showToast("Routine 2 slot deleted.", "success");
                    }
                } else {
                    if (window.scheduleBlocks) {
                        window.scheduleBlocks = window.scheduleBlocks.filter(b => b.id !== blockId);
                        saveToCloud(true);
                        renderUI();
                        showToast("Routine slot deleted.", "success");
                    }
                }
            });
        };

        window.submitAddScheduleBlock = function () {
            const startInput = document.getElementById('schedule-input-start');
            const endInput = document.getElementById('schedule-input-end');
            const taskInput = document.getElementById('schedule-input-task');
            const trackSelect = document.getElementById('schedule-input-track');
            const programSelect = document.getElementById('schedule-input-program');
            const dayStartCb = document.getElementById('schedule-input-daystart');

            if (!startInput || !endInput || !taskInput) return;

            const startTime = startInput.value;
            const endTime = endInput.value;
            const task = taskInput.value.trim();
            const track = trackSelect ? trackSelect.value : '';
            const program = programSelect ? programSelect.value : '';
            const isDayStart = dayStartCb ? dayStartCb.checked : false;

            if (!startTime || !endTime) {
                showToast("Please fill in start and end times.", "error");
                return;
            }
            if (!task) {
                showToast("Please enter a work name.", "error");
                return;
            }
            if (startTime >= endTime) {
                showToast("Start time must be before end time.", "error");
                return;
            }

            const currentSet = window.editingScheduleSet || window.activeRoutineSet || 1;
            if (currentSet === 2) {
                if (!window.scheduleBlocks2) window.scheduleBlocks2 = [];
                if (isDayStart) {
                    window.scheduleBlocks2.forEach(b => { b.isDayStart = false; });
                }
                if (window.editingScheduleBlockId) {
                    const block = window.scheduleBlocks2.find(b => b.id === window.editingScheduleBlockId);
                    if (block) {
                        block.day = 'Daily';
                        block.startTime = startTime;
                        block.endTime = endTime;
                        block.task = task;
                        block.track = track;
                        block.program = program;
                        block.color = window.selectedScheduleColor;
                        block.isDayStart = isDayStart;
                    }
                    window.editingScheduleBlockId = null;
                    showToast("Routine 2 slot updated successfully.", "success");
                } else {
                    const newBlock = {
                        id: 'schedule-block-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                        day: 'Daily',
                        startTime: startTime,
                        endTime: endTime,
                        task: task,
                        track: track,
                        program: program,
                        color: window.selectedScheduleColor,
                        isDayStart: isDayStart
                    };
                    window.scheduleBlocks2.push(newBlock);
                    showToast("Routine 2 slot added successfully.", "success");
                }
            } else {
                if (!window.scheduleBlocks) window.scheduleBlocks = [];
                if (isDayStart) {
                    window.scheduleBlocks.forEach(b => { b.isDayStart = false; });
                }
                if (window.editingScheduleBlockId) {
                    const block = window.scheduleBlocks.find(b => b.id === window.editingScheduleBlockId);
                    if (block) {
                        block.day = 'Daily';
                        block.startTime = startTime;
                        block.endTime = endTime;
                        block.task = task;
                        block.track = track;
                        block.program = program;
                        block.color = window.selectedScheduleColor;
                        block.isDayStart = isDayStart;
                    }
                    window.editingScheduleBlockId = null;
                    showToast("Routine slot updated successfully.", "success");
                } else {
                    const newBlock = {
                        id: 'schedule-block-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                        day: 'Daily',
                        startTime: startTime,
                        endTime: endTime,
                        task: task,
                        track: track,
                        program: program,
                        color: window.selectedScheduleColor,
                        isDayStart: isDayStart
                    };
                    window.scheduleBlocks.push(newBlock);
                    showToast("Schedule slot added successfully.", "success");
                }
            }

            saveToCloud(true);
            closeModal('add-schedule-modal');
            renderUI();
        };

        window.renderSchedulePage = function () {
            const bar = document.getElementById('schedule-visual-timeline-bar');
            const legend = document.getElementById('schedule-visual-legend');
            const grid = document.getElementById('schedule-timeline-grid');
            const hoursSummaryList = document.getElementById('schedule-hours-summary-list');
            const badge = document.getElementById('schedule-slots-count-badge');
            const currentSet = window.activeRoutineSet || 1;
            const blocks = (currentSet === 2) ? (window.scheduleBlocks2 || []) : (window.scheduleBlocks || []);

            const activeRoutineBadge = document.getElementById('active-routine-badge');
            if (activeRoutineBadge) {
                activeRoutineBadge.textContent = `Routine ${currentSet}`;
            }

            // Normalize old weekly blocks if any
            blocks.forEach(b => {
                if (b.day !== 'Daily') b.day = 'Daily';
            });

            // Sort blocks chronologically
            const dailyBlocks = blocks.filter(b => b.day === 'Daily').sort((a, b) => a.startTime.localeCompare(b.startTime));

            // Helper convert time to minutes from midnight
            const timeToMinutes = (t) => {
                if (!t) return 0;
                const parts = t.split(':').map(Number);
                return (parts[0] || 0) * 60 + (parts[1] || 0);
            };

            // Helper convert minutes to 12-hour AM/PM time string
            const minutesToTime = (m) => {
                let hrs = Math.floor(m / 60);
                const mins = m % 60;
                const ampm = hrs >= 12 ? 'PM' : 'AM';
                hrs = hrs % 12;
                if (hrs === 0) hrs = 12;
                return `${hrs}:${mins.toString().padStart(2, '0')} ${ampm}`;
            };

            // Helper convert 24h string to 12h display string
            const formatTime12h = (timeStr) => {
                if (!timeStr) return '';
                const parts = timeStr.split(':').map(Number);
                let hrs = parts[0] || 0;
                const mins = parts[1] || 0;
                const ampm = hrs >= 12 ? 'PM' : 'AM';
                hrs = hrs % 12;
                if (hrs === 0) hrs = 12;
                return `${hrs}:${mins.toString().padStart(2, '0')} ${ampm}`;
            };

            // Build 24-Hour Routine Allocation — vertical list: Work - Time Range - Hr
            let totalAllocatedHours = 0;
            if (bar) {
                let listHtml = '';

                if (dailyBlocks.length === 0) {
                    listHtml = `<p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-4">No work hours allocated</p>`;
                } else {
                    dailyBlocks.forEach(block => {
                        const startMin = timeToMinutes(block.startTime);
                        const endMin = timeToMinutes(block.endTime);
                        if (endMin <= startMin) return;

                        const hours = ((endMin - startMin) / 60);
                        totalAllocatedHours += hours;
                        const hrStr = hours === 1 ? '1.0 hr' : `${hours.toFixed(1)} hrs`;
                        const color = block.color || '#6366f1';
                        const timeRange = `${formatTime12h(block.startTime)} – ${formatTime12h(block.endTime)}`;

                        listHtml += `
                            <div class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20 hover:shadow-sm transition-all cursor-pointer"
                                 onclick="window.openEditScheduleModal('${block.id}')">
                                <span class="w-2 h-8 rounded-full shrink-0" style="background-color: ${color};"></span>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">${block.task}</p>
                                    <p class="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">${timeRange}</p>
                                </div>
                                <span class="text-[11px] font-black text-slate-700 dark:text-slate-300 shrink-0 tabular-nums">${hrStr}</span>
                            </div>
                        `;
                    });
                }

                bar.innerHTML = listHtml;
            }

            // Update total hours badge
            const totalBadge = document.getElementById('schedule-allocation-total');
            if (totalBadge) {
                const totalStr = totalAllocatedHours === 0 ? '0 hrs' : (totalAllocatedHours === 1 ? '1.0 hr' : `${totalAllocatedHours.toFixed(1)} hrs`);
                totalBadge.textContent = totalStr;
            }

            // Hide the legend — no longer needed for vertical list view
            if (legend) {
                legend.innerHTML = '';
            }

            // Segment blocks into 1-hour slots
            const segments = [];
            dailyBlocks.forEach(block => {
                const startMin = timeToMinutes(block.startTime);
                const endMin = timeToMinutes(block.endTime);

                if (endMin <= startMin) return;

                let currentStart = startMin;
                let isFirst = true;
                while (currentStart < endMin) {
                    const currentEnd = Math.min(currentStart + 60, endMin);
                    segments.push({
                        id: block.id,
                        task: block.task,
                        track: block.track,
                        program: block.program,
                        color: block.color || '#6366f1',
                        startTime: minutesToTime(currentStart),
                        endTime: minutesToTime(currentEnd),
                        startMin: currentStart,
                        endMin: currentEnd,
                        duration: currentEnd - currentStart,
                        isDayStart: isFirst && !!block.isDayStart
                    });
                    isFirst = false;
                    currentStart = currentEnd;
                }
            });

            // Sort segments chronologically
            segments.sort((a, b) => a.startMin - b.startMin);

            // Re-order: if a dayStart block exists, rotate the array to start from it
            const dayStartIdx = segments.findIndex(s => s.isDayStart);
            let orderedSegments = segments;
            if (dayStartIdx > 0) {
                orderedSegments = [...segments.slice(dayStartIdx), ...segments.slice(0, dayStartIdx)];
            }

            // Render slot count badge
            if (badge) {
                badge.textContent = `${orderedSegments.length} Box${orderedSegments.length === 1 ? '' : 'es'}`;
            }

            // Build timeline grid — compact boxes
            if (grid) {
                if (orderedSegments.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
                            <span class="text-3xl">📅</span>
                            <h4 class="text-xs font-black uppercase tracking-wider mt-3">No Slots Planned</h4>
                            <p class="text-[10px] opacity-75 mt-1 max-w-xs">Your daily schedule is empty. Add routine blocks to plan your typical day.</p>
                        </div>
                    `;
                } else {
                    let gridHtml = '';
                    orderedSegments.forEach((seg, idx) => {
                        const color = seg.color;
                        let metaHtml = '';
                        if (seg.track || seg.program) {
                            const trackLabel = seg.track ? `<span class="truncate block text-[8px] font-black text-white/75 uppercase tracking-widest leading-none">${seg.track}</span>` : '';
                            const progLabel = seg.program ? `<span class="truncate block text-[8px] font-black text-white/85 uppercase tracking-wider">${seg.program}</span>` : '';
                            metaHtml = `
                                <div class="mt-1 pt-1 border-t border-dashed border-white/15">
                                    ${trackLabel}
                                    ${progLabel}
                                </div>
                            `;
                        }

                        const dayStartBadge = seg.isDayStart ? `
                            <span class="inline-flex items-center text-[8px] font-black bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 mb-1" title="Day starts here">☀️ Start</span>
                        ` : '';

                        gridHtml += `
                            <div class="rounded-2xl flex flex-col hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer border border-slate-200/60 dark:border-slate-700/50"
                                 style="min-height: 140px;"
                                 onclick="window.openEditScheduleModal('${seg.id}')">
                                
                                <!-- Time header (1/4) — stroke only, no BG -->
                                <div class="flex items-center justify-center py-2.5 bg-white dark:bg-slate-800" style="flex: 0 0 25%;">
                                    <div class="flex items-center justify-center px-3 py-1.5 rounded-lg" style="border: 1.5px solid ${color}55;">
                                        <span class="text-[10px] font-black tracking-tight" style="color: ${color};">${seg.startTime} - ${seg.endTime}</span>
                                    </div>
                                </div>
                                
                                <!-- Work name + meta (3/4) — colored BG, white text, centered -->
                                <div class="flex flex-col items-center justify-center p-3 overflow-hidden text-center rounded-b-2xl" style="flex: 1 1 75%; background-color: ${color}cc;">
                                    ${dayStartBadge}
                                    <div class="space-y-1 overflow-hidden">
                                        <h4 class="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug line-clamp-2" title="${seg.task}">${seg.task}</h4>
                                        ${metaHtml}
                                    </div>
                                    
                                    <!-- Actions float hover -->
                                    <div class="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                        <button onclick="event.stopPropagation(); window.openEditScheduleModal('${seg.id}')" class="p-1 bg-white/20 hover:bg-white/30 border border-white/20 rounded-md text-white transition-colors" title="Edit">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                            </svg>
                                        </button>
                                        <button onclick="event.stopPropagation(); window.deleteScheduleBlock('${seg.id}')" class="p-1 bg-white/20 hover:bg-white/30 border border-white/20 rounded-md text-white transition-colors" title="Delete">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    grid.innerHTML = gridHtml;
                }
            }

            // Build hours summary list — group-based view only
            if (hoursSummaryList) {
                const workTotals = {};
                const workColors = {};

                dailyBlocks.forEach(b => {
                    const name = b.task || 'Untitled Work';
                    const startMin = timeToMinutes(b.startTime);
                    const endMin = timeToMinutes(b.endTime);
                    const hours = (endMin - startMin) / 60;
                    if (hours > 0) {
                        workTotals[name] = (workTotals[name] || 0) + hours;
                        workColors[name] = b.color || '#6366f1';
                    }
                });

                const sortedTotals = Object.entries(workTotals).sort((a, b) => b[1] - a[1]);
                const groups = window.scheduleGroups || [];

                // Build group assignment dropdown HTML
                const groupOptionsHtml = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

                // Render an individual work item row
                const renderWorkRow = (name, hours, color, showGroupActions) => {
                    const hrStr = hours === 1 ? '1.0 hr' : `${hours.toFixed(1)} hrs`;
                    const currentGrp = window.getGroupForWork(name);

                    let actionHtml = '';
                    if (showGroupActions && groups.length > 0) {
                        if (currentGrp) {
                            actionHtml = `
                                <button onclick="event.stopPropagation(); window.removeSlotFromGroup('${name.replace(/'/g, "\\'")}')" 
                                    class="text-[7px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0" title="Remove from group">✕</button>
                            `;
                        } else {
                            actionHtml = `
                                <select onchange="if(this.value) window.assignSlotToGroup('${name.replace(/'/g, "\\'")}', this.value); this.value='';"
                                    class="text-[8px] font-bold bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-500 cursor-pointer outline-none max-w-[60px]">
                                    <option value="">+ Grp</option>
                                    ${groupOptionsHtml}
                                </select>
                            `;
                        }
                    }

                    return `
                        <div class="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 rounded-lg hover:shadow-inner transition-all">
                            <div class="flex items-center space-x-1.5 overflow-hidden flex-1 min-w-0">
                                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: ${color};"></span>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate" title="${name}">${name}</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0 pl-1">
                                ${actionHtml}
                                <span class="text-[11px] font-black text-slate-900 dark:text-white">${hrStr}</span>
                            </div>
                        </div>
                    `;
                };

                // Groups-only view: show nothing unless groups exist
                if (groups.length === 0) {
                    hoursSummaryList.innerHTML = `<p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-4">Create a group to see summary</p>`;
                } else {
                    let summaryHtml = '';

                    groups.forEach(grp => {
                        const groupItems = (grp.items || []).filter(n => workTotals[n] !== undefined);

                        let groupTotal = 0;
                        groupItems.forEach(n => { groupTotal += workTotals[n] || 0; });
                        const grpHrStr = groupTotal === 0 ? '0 hr' : (groupTotal === 1 ? '1.0 hr' : `${groupTotal.toFixed(1)} hrs`);

                        summaryHtml += `
                            <div class="border border-slate-200/60 dark:border-slate-700/60 rounded-xl overflow-hidden mb-3">
                                <div class="flex items-center justify-between px-3 py-2 bg-slate-100/80 dark:bg-slate-800/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors" onclick="const items=this.parentElement.querySelector('.grp-items'); const chev=this.querySelector('.grp-chevron'); items.classList.toggle('hidden'); if(chev) chev.style.transform=items.classList.contains('hidden')?'rotate(0deg)':'rotate(180deg)';">
                                    <div class="flex items-center gap-2">
                                        <svg class="grp-chevron w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                        <span class="w-2.5 h-2.5 rounded-md shrink-0" style="background-color: ${grp.color};"></span>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">${grp.name}</span>
                                        <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500">(${groupItems.length})</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[10px] font-black text-slate-900 dark:text-white">${grpHrStr}</span>
                                        <button onclick="event.stopPropagation(); window.openCreateScheduleGroup('${grp.id}')" class="text-slate-400 hover:text-blue-500 transition-colors" title="Edit group">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                        <button onclick="event.stopPropagation(); window.deleteScheduleGroup('${grp.id}')" class="text-slate-400 hover:text-red-500 transition-colors" title="Delete group">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="grp-items hidden p-2 space-y-1.5 bg-white dark:bg-slate-900/20">
                                    ${groupItems.length > 0 ? groupItems.map(n => renderWorkRow(n, workTotals[n], workColors[n], true)).join('') : '<p class="text-[8px] text-slate-400 font-bold text-center py-2">No items assigned</p>'}
                                </div>
                            </div>
                        `;
                    });

                    hoursSummaryList.innerHTML = summaryHtml;
                }
            }
            if (window.updateActiveScheduleSlot) {
                window.updateActiveScheduleSlot();
            }
        };

        // Toggle Second Timeline Grid
        window.toggleSecondTimelineGrid = function () {
            const wrapper = document.getElementById('schedule-timeline-grid-2-wrapper');
            const btn = document.getElementById('schedule-toggle-grid2-btn');
            const btnWrapper = document.getElementById('schedule-toggle-grid2-btn-wrapper');
            if (!wrapper) return;

            const isHidden = wrapper.classList.contains('hidden');
            if (isHidden) {
                wrapper.classList.remove('hidden');
                if (btn) btn.innerHTML = `
                    <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Close Routine 2</span>
                `;
                if (btnWrapper) btnWrapper.classList.add('hidden');
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                wrapper.classList.add('hidden');
                if (btn) btn.innerHTML = `
                    <svg class="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                    <span>Open Routine 2</span>
                `;
                if (btnWrapper) btnWrapper.classList.remove('hidden');
            }
        };

        // --- Grid 2 (Routine 2) management functions ---
        // Flag to track which routine set the modal targets: 1 or 2
        window.editingScheduleSet = 1;

        window.openAddScheduleModal2 = function () {
            window.editingScheduleBlockId = null;
            window.editingScheduleSet = 2;

            const startInput = document.getElementById('schedule-input-start');
            if (startInput) startInput.value = '18:00';
            const endInput = document.getElementById('schedule-input-end');
            if (endInput) endInput.value = '19:00';
            const taskInput = document.getElementById('schedule-input-task');
            if (taskInput) taskInput.value = '';

            const trackSelect = document.getElementById('schedule-input-track');
            const programSelect = document.getElementById('schedule-input-program');
            if (trackSelect) {
                let trackHtml = '<option value="">None (Optional)</option>';
                (window.tracks || []).forEach(t => {
                    trackHtml += `<option value="${t.id}">${t.name}</option>`;
                });
                trackSelect.innerHTML = trackHtml;
                trackSelect.value = '';
            }
            if (programSelect) {
                programSelect.innerHTML = '<option value="">None (Optional)</option>';
                programSelect.value = '';
            }

            window.selectScheduleColor('#8b5cf6', document.querySelector('#schedule-color-picker button[data-color="#8b5cf6"]') || document.querySelector('#schedule-color-picker button[data-color="#6366f1"]'));

            const dayStartCb = document.getElementById('schedule-input-daystart');
            if (dayStartCb) dayStartCb.checked = false;

            const titleEl = document.querySelector('#add-schedule-modal h2');
            if (titleEl) titleEl.textContent = 'Add Routine 2 Slot';
            const descEl = document.querySelector('#add-schedule-modal p');
            if (descEl) descEl.textContent = 'Add a slot to your second routine set';
            const submitBtn = document.querySelector('#add-schedule-modal button[onclick="window.submitAddScheduleBlock()"]');
            if (submitBtn) submitBtn.textContent = 'Add Slot';

            openModal('add-schedule-modal');
        };






