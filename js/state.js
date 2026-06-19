        window.sanitizeAllData = function (val) {
            if (typeof val === 'string') {
                return val.replace(/<[^>]*>/g, '');
            } else if (Array.isArray(val)) {
                return val.map(window.sanitizeAllData);
            } else if (val !== null && typeof val === 'object') {
                if (val instanceof Date) return val;
                if (typeof val.toDate === 'function') return val;
                const cleaned = {};
                for (const key in val) {
                    if (Object.prototype.hasOwnProperty.call(val, key)) {
                        cleaned[key] = window.sanitizeAllData(val[key]);
                    }
                }
                return cleaned;
            }
            return val;
        };
        window.appState = {};
        window.tracks = [];
        window.timerLogs = [];
        window.activeTimerState = {
            isRunning: false,
            mode: 'stopwatch',
            startTime: null,
            elapsedBeforeStart: 0,
            targetDuration: 0,
            selectedSubject: 'General Study'
        };
        window.timerInterval = null;
        window.db = undefined;
        window.isSyncing = false;
        window.isAppInitialized = false;
        window.tasks = [];
        window.progressChart = undefined;
        window.masterLineChart = undefined;
        window.localDataJSON = "";
        window.saveTimeout = null;
        window.isSaving = false;
        window.needsSave = false;

        window.activeRoutineSet = 1;

        window.customPrograms = {};

        window.syllabusStructure = {};

        window.totalStaticChapters = 0;

        window.migrateLegacyData = function () {
            let dataPurged = false;

            if (!window.tracks) {
                window.tracks = [];
            }
            if (Array.isArray(window.tracks)) {
                window.tracks = window.tracks.map(t => {
                    if (typeof t === 'string') {
                        return { id: t, name: t.toUpperCase(), priority: 3 };
                    }
                    if (t && typeof t === 'object' && t.priority === undefined) {
                        t.priority = 3;
                    }
                    return t;
                });
            }
            if (!window.customPrograms) {
                window.customPrograms = {};
            }

            window.tracks.forEach(trackObj => {
                const track = trackObj.id;
                if (!Array.isArray(window.customPrograms[track])) {
                    window.customPrograms[track] = [];
                }

                window.customPrograms[track] = window.customPrograms[track].map((p, idx) => {
                    if (typeof p === 'string') {
                        const id = p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        return {
                            id: id || 'prog-' + idx,
                            name: p,
                            priority: 3,
                            order: idx
                        };
                    } else if (p && typeof p === 'object') {
                        if (!p.id) {
                            p.id = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'prog-' + idx;
                        }
                        if (p.priority === undefined) p.priority = 3;
                        if (p.order === undefined) p.order = idx;
                        return p;
                    }
                    return null;
                }).filter(Boolean);

                const origLength = window.customPrograms[track].length;
                window.customPrograms[track] = window.customPrograms[track].filter(p => {
                    const name = (p.name || '').trim();
                    const id = (p.id || '').trim().toLowerCase();
                    if (!name) return false;
                    if (id.includes('onerror') || id.includes('onload') || id.includes('json') || id.includes('document-body') || id.includes('img-src')) return false;
                    return true;
                });

                if (window.customPrograms[track].length !== origLength) {
                    dataPurged = true;
                }
            });

            if (syllabusStructure) {
                window.tracks.forEach(trackObj => {
                    const track = trackObj.id;
                    if (!syllabusStructure[track]) {
                        syllabusStructure[track] = [];
                    }
                    if (Array.isArray(syllabusStructure[track])) {
                        const origLength = syllabusStructure[track].length;
                        syllabusStructure[track] = syllabusStructure[track].filter(s => {
                            const prog = (s.program || '').trim();
                            if (!prog) return false;
                            const id = prog.toLowerCase();
                            if (id.includes('onerror') || id.includes('onload') || id.includes('json') || id.includes('document-body') || id.includes('img-src')) return false;
                            return true;
                        });

                        if (syllabusStructure[track].length !== origLength) {
                            dataPurged = true;
                        }

                        syllabusStructure[track].forEach((s, idx) => {
                            if (s.priority === undefined) s.priority = 3;
                            if (s.order === undefined) s.order = idx;
                            if (!s.program) {
                                s.program = trackObj.name + " Prog";
                            }
                        });
                    }
                });
            }

            if (window.successResults) {
                const origLength = window.successResults.length;
                window.successResults = window.successResults.filter(r => {
                    const title = (r.title || '').trim();
                    if (!title) return false;
                    const id = title.toLowerCase();
                    if (id.includes('onerror') || id.includes('onload') || id.includes('json') || id.includes('document-body') || id.includes('img-src')) return false;
                    return true;
                });
                if (window.successResults.length !== origLength) {
                    dataPurged = true;
                }
            }

            if (window.passedItems) {
                if (window.passedItems.programs) {
                    const origLength = window.passedItems.programs.length;
                    window.passedItems.programs = window.passedItems.programs.filter(p => {
                        const id = p.trim().toLowerCase();
                        if (!id) return false;
                        if (id.includes('onerror') || id.includes('onload') || id.includes('json') || id.includes('document-body') || id.includes('img-src')) return false;
                        return true;
                    });
                    if (window.passedItems.programs.length !== origLength) {
                        dataPurged = true;
                    }
                }
            }

            if (window.paceGoals) {
                const origLength = window.paceGoals.length;
                window.paceGoals = window.paceGoals.filter(g => {
                    const tgt = (g.target || '').trim();
                    if (!tgt) return false;
                    const id = tgt.toLowerCase();
                    if (id.includes('onerror') || id.includes('onload') || id.includes('json') || id.includes('document-body') || id.includes('img-src')) return false;
                    return true;
                });
                if (window.paceGoals.length !== origLength) {
                    dataPurged = true;
                }
            }

            if (dataPurged) {
                console.log("Malicious data purged. Saving back to cloud.");
                saveToCloud(true);
            }

            // Migrate old data for existing tasks to ensure all tracks are present
            if (Array.isArray(tasks)) {
                tasks.forEach(task => {
                    // Legacy migration: convert caTask (single object) to caTasks (one-element array)
                    if (task.caTask) {
                        if (!task.caTasks) {
                            task.caTasks = [{
                                ...task.caTask,
                                id: task.caTask.id || `ca-${task.id}`
                            }];
                        }
                        delete task.caTask;
                    }
                    window.tracks.forEach(trackObj => {
                        const trackId = trackObj.id;
                        if (task.type === 'study') {
                            if (task[trackId + 'Study'] === undefined) {
                                task[trackId + 'Study'] = false;
                            }
                            const key = trackId + 'Tasks';
                            if (!task[key]) {
                                task[key] = [{ subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: `${trackId}-${task.id}` }];
                            }
                        } else if (task.type === 'holiday') {
                            if (task[trackId + 'Study'] === undefined) {
                                task[trackId + 'Study'] = false;
                            }
                        }
                    });
                });
            }

            // And customActions
            if (Array.isArray(window.customActions)) {
                window.customActions.forEach((a, idx) => {
                    if (a.priority === undefined) a.priority = 3;
                    if (a.order === undefined) a.order = idx;
                });
            }

            window.ensureConfigDefaults();
            window.normalizePriorities();
            window.syncPassFreezeFromResults();

            if (!window.timerLogs) {
                window.timerLogs = [];
            }
            if (!window.activeTimerState || typeof window.activeTimerState !== 'object') {
                window.activeTimerState = {
                    isRunning: false,
                    mode: 'stopwatch',
                    startTime: null,
                    elapsedBeforeStart: 0,
                    targetDuration: 0,
                    selectedSubject: 'General Study'
                };
            }
            if (!window.scheduleBlocks) {
                window.scheduleBlocks = [];
            }
            if (!window.scheduleBlocks2) {
                window.scheduleBlocks2 = [];
            }
            if (!window.scheduleGroups) {
                window.scheduleGroups = [];
            }
            if (window.scheduleShowGrouped === undefined) {
                window.scheduleShowGrouped = false;
            }
        };

        window.getAllSubjects = function () {
            let all = [];
            window.tracks.forEach(t => {
                if (syllabusStructure[t.id]) {
                    all = all.concat(syllabusStructure[t.id]);
                }
            });
            return all.sort((a, b) => {
                const pA = a.priority !== undefined ? a.priority : 3;
                const pB = b.priority !== undefined ? b.priority : 3;
                if (pA !== pB) return pA - pB;
                const oA = a.order !== undefined ? a.order : 999;
                const oB = b.order !== undefined ? b.order : 999;
                return oA - oB;
            });
        };

        window.getAllPrograms = function () {
            let all = [];
            window.tracks.forEach(t => {
                if (window.customPrograms[t.id]) {
                    window.customPrograms[t.id].forEach(p => {
                        all.push({ ...p, _trackId: t.id, _trackName: t.name });
                    });
                }
            });
            return all.sort((a, b) => {
                const pA = a.priority !== undefined ? a.priority : 999;
                const pB = b.priority !== undefined ? b.priority : 999;
                if (pA !== pB) return pA - pB;
                const oA = a.order !== undefined ? a.order : 999;
                const oB = b.order !== undefined ? b.order : 999;
                return oA - oB;
            });
        };

        window.ensureConfigDefaults = function () {
            if (!window.dashboardConfig) {
                window.dashboardConfig = {};
            }
            if (window.dashboardConfig.activePaceGoalId === undefined) {
                const defaultGoal = (window.paceGoals && window.paceGoals.find(g => g.id === 'global-timeline')) || (window.paceGoals && window.paceGoals[0]);
                window.dashboardConfig.activePaceGoalId = defaultGoal ? defaultGoal.id : null;
            }
            if (!window.dashboardConfig.trendStartDate) {
                window.dashboardConfig.trendStartDate = PLAN_START_DATE.toISOString().split('T')[0];
            }
            if (window.dashboardConfig.trendEndDate === undefined) {
                window.dashboardConfig.trendEndDate = "";
            }
            if (window.dashboardConfig.showDaysRemaining === undefined) {
                window.dashboardConfig.showDaysRemaining = false;
            }
            if (!window.dashboardConfig.independentPaces) {
                window.dashboardConfig.independentPaces = { tracks: {}, programs: {}, subjects: {} };
            }
            if (!window.dashboardConfig.independentPaces.tracks) {
                window.dashboardConfig.independentPaces.tracks = {};
            }
            if (!window.dashboardConfig.independentPaces.programs) {
                window.dashboardConfig.independentPaces.programs = {};
            }
            if (!window.dashboardConfig.independentPaces.subjects) {
                window.dashboardConfig.independentPaces.subjects = {};
            }
        };

        window.normalizePriorities = function () {
            // 1. Tracks
            if (Array.isArray(window.tracks)) {
                const priorities = window.tracks.map(t => t.priority);
                const hasDuplicates = new Set(priorities).size !== priorities.length;
                const hasInvalid = priorities.some(p => typeof p !== 'number' || p < 1 || p > window.tracks.length);
                if (hasDuplicates || hasInvalid) {
                    window.tracks.forEach((t, idx) => {
                        t.priority = idx + 1;
                        t.order = idx;
                    });
                }
            }

            // 2. Programs
            const flatProgs = [];
            window.tracks.forEach(trackObj => {
                if (window.customPrograms[trackObj.id]) {
                    window.customPrograms[trackObj.id].forEach(p => {
                        flatProgs.push(p);
                    });
                }
            });
            const progPriorities = flatProgs.map(p => p.priority);
            const progsHasDuplicates = new Set(progPriorities).size !== progPriorities.length;
            const progsHasInvalid = progPriorities.some(p => typeof p !== 'number' || p < 1 || p > flatProgs.length);
            if (progsHasDuplicates || progsHasInvalid) {
                flatProgs.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.order ?? 999) - (b.order ?? 999));
                flatProgs.forEach((p, idx) => {
                    p.priority = idx + 1;
                    p.order = idx;
                });
            }

            // 3. Subjects
            const flatSubs = window.getAllSubjects();
            const subPriorities = flatSubs.map(s => s.priority);
            const subsHasDuplicates = new Set(subPriorities).size !== subPriorities.length;
            const subsHasInvalid = subPriorities.some(p => typeof p !== 'number' || p < 1 || p > flatSubs.length);
            if (subsHasDuplicates || subsHasInvalid) {
                flatSubs.forEach((s, idx) => {
                    s.priority = idx + 1;
                    s.order = idx;
                });
            }

            // 4. Actions
            if (Array.isArray(window.customActions)) {
                const actionPriorities = window.customActions.map(a => a.priority);
                const actionsHasDuplicates = new Set(actionPriorities).size !== actionPriorities.length;
                const actionsHasInvalid = actionPriorities.some(p => typeof p !== 'number' || p < 1 || p > window.customActions.length);
                if (actionsHasDuplicates || actionsHasInvalid) {
                    window.customActions.forEach((a, idx) => {
                        a.priority = idx + 1;
                        a.order = idx;
                    });
                }
            }
        };

        window.populateTrackDropdowns = function () {
            const trackDropdowns = ['add-ch-track', 'add-sub-track', 'add-prog-track', 'manage-track', 'esm-track'];
            trackDropdowns.forEach(id => {
                const select = document.getElementById(id);
                if (!select) return;
                const currentVal = select.value;
                select.innerHTML = window.tracks.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                if (currentVal && window.tracks.some(t => t.id === currentVal)) {
                    select.value = currentVal;
                }
            });
        };

        window.sortAllCustomData = function () {
            const tracks = window.tracks ? window.tracks.map(t => t.id) : [];
            // 1. Sort customPrograms
            tracks.forEach(track => {
                if (Array.isArray(window.customPrograms[track])) {
                    window.customPrograms[track].sort((a, b) => {
                        const pA = a.priority !== undefined ? a.priority : 3;
                        const pB = b.priority !== undefined ? b.priority : 3;
                        if (pA !== pB) return pA - pB;
                        const oA = a.order !== undefined ? a.order : 999;
                        const oB = b.order !== undefined ? b.order : 999;
                        return oA - oB;
                    });
                }
            });

            // 2. Sort syllabusStructure track subjects
            tracks.forEach(track => {
                if (Array.isArray(syllabusStructure[track])) {
                    syllabusStructure[track].sort((a, b) => {
                        const pA_subj = a.priority !== undefined ? a.priority : 3;
                        const pB_subj = b.priority !== undefined ? b.priority : 3;
                        if (pA_subj !== pB_subj) return pA_subj - pB_subj;

                        const oA_subj = a.order !== undefined ? a.order : 999;
                        const oB_subj = b.order !== undefined ? b.order : 999;
                        return oA_subj - oB_subj;
                    });
                }
            });

            // 3. Sort customActions
            if (Array.isArray(window.customActions)) {
                window.customActions.sort((a, b) => {
                    const pA = a.priority !== undefined ? a.priority : 3;
                    const pB = b.priority !== undefined ? b.priority : 3;
                    if (pA !== pB) return pA - pB;
                    const oA = a.order !== undefined ? a.order : 999;
                    const oB = b.order !== undefined ? b.order : 999;
                    return oA - oB;
                });
            }
        };

        window.getSortedPrograms = function (track) {
            if (!window.customPrograms || !window.customPrograms[track]) return [];
            return [...window.customPrograms[track]];
        };

        window.sortAllSubjects = function (subjects, track) {
            if (!Array.isArray(subjects)) return [];
            return [...subjects].sort((a, b) => {
                const pA = a.priority !== undefined ? a.priority : 3;
                const pB = b.priority !== undefined ? b.priority : 3;
                if (pA !== pB) return pA - pB;
                const oA = a.order !== undefined ? a.order : 999;
                const oB = b.order !== undefined ? b.order : 999;
                return oA - oB;
            });
        };

        window.getSortedTrackSubjects = function (track) {
            if (!syllabusStructure || !syllabusStructure[track]) return [];
            return [...syllabusStructure[track]];
        };
