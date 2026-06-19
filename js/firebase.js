
        // Attach window listeners
        window.addEventListener('online', () => {
            if (window.syncManager) window.syncManager.processQueue();
            if (window.updateSyncDashboardUI) window.updateSyncDashboardUI();
        });
        window.addEventListener('offline', () => {
            if (window.updateSyncDashboardUI) window.updateSyncDashboardUI();
        });

        window.lastSyncTime = null;
        window.lastSyncError = null;

        // Initialize lastSyncTime from database cache
        (async () => {
            if (window.localDBHelper) {
                try {
                    window.lastSyncTime = await window.localDBHelper.getSetting('lastSyncTime');
                } catch (e) {}
            }
        })();

        window.updateSyncDashboardUI = async function () {
            const netDot = document.getElementById('sync-dash-net-dot');
            const netText = document.getElementById('sync-dash-net-text');
            const timeVal = document.getElementById('sync-dash-time');
            const pendingCountEl = document.getElementById('sync-dash-pending-count');
            const errorContainer = document.getElementById('sync-dash-error-container');
            const errorMsg = document.getElementById('sync-dash-error-msg');
            const logList = document.getElementById('sync-dash-log-list');
            const progressContainer = document.getElementById('sync-dash-progress-container');
            const progressBar = document.getElementById('sync-dash-progress-bar');
            const progressText = document.getElementById('sync-dash-progress-text');

            if (!pendingCountEl) return;

            // Connection status
            const isOnline = navigator.onLine;
            if (isOnline) {
                if (netDot) netDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
                if (netText) netText.textContent = "Online";
            } else {
                if (netDot) netDot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
                if (netText) netText.textContent = "Offline";
            }

            // Last Sync Time formatting
            if (window.lastSyncTime) {
                const diffSec = Math.floor((Date.now() - window.lastSyncTime) / 1000);
                if (diffSec < 5) {
                    timeVal.textContent = "Just now";
                } else if (diffSec < 60) {
                    timeVal.textContent = `${diffSec} seconds ago`;
                } else if (diffSec < 3600) {
                    timeVal.textContent = `${Math.floor(diffSec / 60)} minutes ago`;
                } else {
                    timeVal.textContent = new Date(window.lastSyncTime).toLocaleTimeString();
                }
            } else {
                timeVal.textContent = "Never";
            }

            // Sync Queue counts
            let pendingCount = 0;
            let syncingCount = 0;
            let logs = [];
            
            if (window.localDB) {
                try {
                    pendingCount = await window.localDB.syncQueue.where('status').equals('pending').count();
                    syncingCount = await window.localDB.syncQueue.where('status').equals('syncing').count();
                    // Load the last 5 logs from syncQueue (both pending, syncing, synced)
                    logs = await window.localDB.syncQueue.orderBy('timestamp').reverse().limit(5).toArray();
                } catch (e) {
                    console.error("Error loading sync stats:", e);
                }
            }

            pendingCountEl.textContent = pendingCount;

            // Sync progress indicator
            if (syncingCount > 0 || (window.syncManager && window.syncManager.isProcessing)) {
                if (progressContainer) progressContainer.classList.remove('hidden');
                // Simulate progress
                const total = pendingCount + syncingCount + 1;
                const progress = Math.round((1 - (pendingCount / total)) * 100);
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}%`;
            } else {
                if (progressContainer) progressContainer.classList.add('hidden');
            }

            // Error display
            if (window.lastSyncError) {
                if (errorContainer) errorContainer.classList.remove('hidden');
                if (errorMsg) errorMsg.textContent = window.lastSyncError;
            } else {
                if (errorContainer) errorContainer.classList.add('hidden');
            }

            // Sync Log list
            if (logList) {
                if (logs.length > 0) {
                    logList.innerHTML = logs.map(log => {
                        let statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                        if (log.status === 'synced') statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                        if (log.status === 'syncing') statusColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
                        
                        const timeStr = new Date(log.timestamp).toLocaleTimeString();
                        return `
                            <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                                <div class="flex flex-col">
                                    <span class="font-black text-slate-700 dark:text-slate-200">Operation #${log.id}</span>
                                    <span class="text-[10px] text-slate-400 font-bold">${timeStr}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded-lg border font-black text-[9px] uppercase tracking-wider ${statusColor}">
                                    ${log.status}
                                </span>
                            </div>
                        `;
                    }).join('');
                } else {
                    logList.innerHTML = `<div class="text-center py-4 text-xs text-slate-400 font-medium">No recent operations logged.</div>`;
                }
            }
        };

        window.openSyncDashboardModal = function () {
            window.updateSyncDashboardUI();
            window.openModal('sync-dashboard-modal');
        };

        window.closeSyncDashboardModal = function () {
            window.closeModal('sync-dashboard-modal');
        };

        window.triggerManualSync = async function () {
            const btn = document.getElementById('btn-manual-sync');
            const spinner = document.getElementById('manual-sync-spinner');
            const btnText = document.getElementById('manual-sync-text');

            if (btn) btn.disabled = true;
            if (spinner) spinner.classList.remove('hidden');
            if (btnText) btnText.textContent = 'Syncing...';

            window.lastSyncError = null;

            try {
                if (window.syncManager) {
                    await window.syncManager.processQueue();
                }
            } catch (e) {
                console.error("Manual sync triggered error:", e);
            }

            setTimeout(async () => {
                await window.updateSyncDashboardUI();
                if (btn) btn.disabled = false;
                if (spinner) spinner.classList.add('hidden');
                if (btnText) btnText.textContent = 'Force Manual Sync';
            }, 800);
        };

        function initializeFirebase() {
            // Deprecated. Initialization is now handled asynchronously in DOMContentLoaded.
        }

        window.handleLogout = function () {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    window.location.href = '/login.html';
                }).catch(err => {
                    console.error("Logout error:", err);
                    window.location.href = '/login.html';
                });
            } else {
                window.location.href = '/login.html';
            }
        };

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




        function loadFromCloud() {
            if (!db) return;
            db.collection('studyPlan').doc('globalData').onSnapshot((docSnap) => {
                if (isSyncing) return; // Prevent loop

                if (docSnap.exists) {
                    const data = window.sanitizeAllData(docSnap.data());
                    let newTasks = defaultTasks;

                    if (data.tracks) window.tracks = data.tracks;
                    if (data.customPrograms) window.customPrograms = data.customPrograms;
                    if (data.customActions) window.customActions = data.customActions;
                    if (data.programVisibility) window.programVisibility = data.programVisibility;
                    if (data.paceGoals) window.paceGoals = data.paceGoals;
                    else window.paceGoals = [];
                    if (data.passedItems) window.passedItems = data.passedItems;
                    else window.passedItems = { programs: [], subjects: [] };
                    if (data.revisionData) window.revisionData = data.revisionData;
                    else window.revisionData = { active: [], progress: {} };
                    if (data.subjectTimeLinks) window.subjectTimeLinks = data.subjectTimeLinks;
                    else window.subjectTimeLinks = {};
                    if (data.successResults) window.successResults = data.successResults;
                    else window.successResults = [];
                    if (data.timerLogs) window.timerLogs = data.timerLogs;
                    else window.timerLogs = [];
                    if (data.activeTimerState) window.activeTimerState = data.activeTimerState;
                    else window.activeTimerState = {
                        isRunning: false,
                        mode: 'stopwatch',
                        startTime: null,
                        elapsedBeforeStart: 0,
                        targetDuration: 0,
                        selectedSubject: 'General Study'
                    };
                    if (data.scheduleBlocks) window.scheduleBlocks = data.scheduleBlocks;
                    else window.scheduleBlocks = [];
                    if (data.scheduleBlocks2) window.scheduleBlocks2 = data.scheduleBlocks2;
                    else window.scheduleBlocks2 = [];
                    if (data.scheduleGroups) window.scheduleGroups = data.scheduleGroups;
                    else window.scheduleGroups = [];
                    if (window.syncTimerStateFromCloud) {
                        window.syncTimerStateFromCloud();
                    }
                    if (data.weeklyTargetsDatabase) {
                        window.weeklyTargetsDatabase = data.weeklyTargetsDatabase;
                    } else {
                        window.weeklyTargetsDatabase = {};
                    }
                    if (Array.isArray(data.weeklyTargets) && data.weeklyTargets.length > 0) {
                        const defaultRange = window.getWeeklyTargetRange ? window.getWeeklyTargetRange() : null;
                        if (defaultRange) {
                            const key = window.formatDateRangeKey ? window.formatDateRangeKey(defaultRange.start, defaultRange.end) : "Migration Week";
                            if (!window.weeklyTargetsDatabase[key]) {
                                window.weeklyTargetsDatabase[key] = data.weeklyTargets.map(t => {
                                    return {
                                        track: t.track || "",
                                        program: t.program || "",
                                        subject: t.subject || "",
                                        chapter: t.chapter || "",
                                        completed: t.completed || false
                                    };
                                });
                            }
                        }
                    }
                    if (data.dashboardConfig) {
                        window.dashboardConfig = data.dashboardConfig;
                        if (!window.dashboardConfig.trendStartDate) {
                            window.dashboardConfig.trendStartDate = PLAN_START_DATE.toISOString().split('T')[0];
                        } else {
                            const trendStart = parseDateSafe(window.dashboardConfig.trendStartDate);
                            if (!isNaN(trendStart.getTime())) {
                                trendStart.setHours(0, 0, 0, 0);
                                window.PLAN_START_DATE = trendStart;
                            }
                        }
                    }

                    if (data.customSyllabus) {
                        window.syllabusStructure = data.customSyllabus;
                        window.tracks.forEach(trackObj => {
                            const track = trackObj.id;
                            if (syllabusStructure[track]) {
                                syllabusStructure[track].forEach(s => {
                                    if (!s.program) {
                                        s.program = trackObj.name + " Prog";
                                    }
                                });
                            }
                        });
                        recalculateTotals();
                        if (isInitialLoad) window.switchSysTab('chapter');
                    }

                    window.migrateLegacyData();
                    window.sortAllCustomData();

                    if (data.tasks && data.tasks.length > 0) {
                        newTasks = data.tasks.map(t => {
                            const formatted = { ...t };
                            window.customActions.forEach(a => { formatted[a.id] = formatted[a.id] === true; });
                            return formatted;
                        });

                        const lastTask = newTasks[newTasks.length - 1];
                        if (lastTask && lastTask.id) {
                            const newEndDate = new Date(PLAN_START_DATE.getTime());
                            newEndDate.setDate(newEndDate.getDate() + (lastTask.id - 1));
                            window.PLAN_END_DATE = newEndDate;
                        }
                    } else { if (isInitialLoad) saveToCloud(true); }

                    window.tasks = newTasks;

                    // Always backup to localStorage
                    window.appState = data;
                    localStorage.setItem('studyMasterBackup', JSON.stringify(window.appState));
                    console.log("Cloud Sync Success");

                    if (isInitialLoad) { renderUI(); isInitialLoad = false; }
                    else {
                        requestAnimationFrame(() => {
                            const scrollPos = window.scrollY; // Preserve scroll position
                            renderUI();
                            window.scrollTo(0, scrollPos); // Seamlessly restore scroll
                            showSync('saved');
                        });
                    }
                } else {
                    if (isInitialLoad) saveToCloud(true);
                }
            }, (error) => {
                console.error("Sync Error:", error);
                if (isInitialLoad) { renderUI(); isInitialLoad = false; }
            });
        }

        const showSync = (state) => {
            const el = document.getElementById('sync-status');
            const icon = document.getElementById('sync-icon');
            const text = document.getElementById('sync-text');
            if (!el || !icon || !text) return;

            el.classList.remove('opacity-0', 'scale-95');
            el.classList.add('opacity-100', 'scale-100');

            if (state === 'saving') {
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`;
                icon.classList.add('animate-spin', 'text-blue-500');
                icon.classList.remove('text-emerald-500', 'text-red-500');
                text.textContent = 'Saving...'; text.className = 'text-[9px] font-black uppercase tracking-widest text-blue-500';
            } else if (state === 'saved') {
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />`;
                icon.classList.remove('animate-spin', 'text-blue-500', 'text-red-500');
                icon.classList.add('text-emerald-500');
                text.textContent = 'Saved'; text.className = 'text-[9px] font-black uppercase tracking-widest text-emerald-500';
                setTimeout(() => { el.classList.remove('opacity-100', 'scale-100'); el.classList.add('opacity-0', 'scale-95'); }, 2000);
            } else if (state === 'error') {
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />`;
                icon.classList.remove('animate-spin', 'text-blue-500', 'text-emerald-500');
                icon.classList.add('text-red-500');
                text.textContent = 'Error'; text.className = 'text-[9px] font-black uppercase tracking-widest text-red-500';
            }
        };

        function saveToCloud(immediate = false) {
            const payload = {
                tasks: tasks,
                tracks: window.tracks,
                customSyllabus: syllabusStructure,
                customPrograms: window.customPrograms,
                customActions: window.customActions,
                paceGoals: window.paceGoals,
                passedItems: window.passedItems,
                revisionData: window.revisionData,
                programVisibility: window.programVisibility || {},
                subjectTimeLinks: window.subjectTimeLinks,
                successResults: window.successResults,
                timerLogs: window.timerLogs || [],
                activeTimerState: window.activeTimerState || {
                    isRunning: false,
                    mode: 'stopwatch',
                    startTime: null,
                    elapsedBeforeStart: 0,
                    targetDuration: 0,
                    selectedSubject: 'General Study'
                },
                dashboardConfig: window.dashboardConfig,
                weeklyTargetsDatabase: window.weeklyTargetsDatabase || {},
                scheduleBlocks: window.scheduleBlocks || [],
                scheduleBlocks2: window.scheduleBlocks2 || [],
                scheduleGroups: window.scheduleGroups || [],
                weeklyTargets: (function () {
                    const range = window.getWeeklyTargetRange ? window.getWeeklyTargetRange() : null;
                    if (range && window.weeklyTargetsDatabase) {
                        const key = window.formatDateRangeKey ? window.formatDateRangeKey(range.start, range.end) : null;
                        if (key && window.weeklyTargetsDatabase[key]) {
                            return window.weeklyTargetsDatabase[key];
                        }
                    }
                    return [];
                })()
            };
            window.appState = payload;

            // Backup locally
            localStorage.setItem('studyMasterBackup', JSON.stringify(window.appState));
            console.log("Offline Backup Saved");

            // Parallel save to IndexedDB via Dexie
            if (window.localDBHelper) {
                window.localDBHelper.setSetting('dashboardConfig', window.dashboardConfig);
                window.localDBHelper.setSetting('weeklyTargetsDatabase', window.weeklyTargetsDatabase || {});
                window.localDBHelper.setSetting('activeTimerState', window.activeTimerState);
                window.localDBHelper.setSetting('passedItems', window.passedItems || { programs: [], subjects: [] });
                window.localDBHelper.setSetting('revisionData', window.revisionData || { active: [], progress: {} });
                window.localDBHelper.setSetting('subjectTimeLinks', window.subjectTimeLinks || {});
                window.localDBHelper.setSetting('successResults', window.successResults || []);
                window.localDBHelper.setSetting('tracks', window.tracks || []);
                window.localDBHelper.setSetting('activeRoutineSet', window.activeRoutineSet || 1);
                window.localDBHelper.setSetting('customPrograms', window.customPrograms || {});
                window.localDBHelper.setSetting('customSyllabus', syllabusStructure || {});
                window.localDBHelper.setSetting('customActions', window.customActions || []);
                window.localDBHelper.setSetting('paceGoals', window.paceGoals || []);
                
                window.localDB.tasks.clear().then(() => {
                    if (Array.isArray(tasks)) {
                        window.localDB.tasks.bulkPut(tasks).catch(err => console.error("Error bulk putting tasks:", err));
                    }
                });
                
                window.localDB.timerLogs.clear().then(() => {
                    if (Array.isArray(window.timerLogs)) {
                        window.localDB.timerLogs.bulkPut(window.timerLogs).catch(err => console.error("Error bulk putting timerLogs:", err));
                    }
                });
                
                window.localDB.scheduleBlocks.clear().then(() => {
                    const blocks = window.scheduleBlocks || [];
                    if (Array.isArray(blocks)) {
                        window.localDB.scheduleBlocks.bulkPut(blocks).catch(err => console.error("Error bulk putting scheduleBlocks:", err));
                    }
                });
                
                window.localDB.scheduleBlocks2.clear().then(() => {
                    const blocks2 = window.scheduleBlocks2 || [];
                    if (Array.isArray(blocks2)) {
                        window.localDB.scheduleBlocks2.bulkPut(blocks2).catch(err => console.error("Error bulk putting scheduleBlocks2:", err));
                    }
                });
                
                window.localDB.scheduleGroups.clear().then(() => {
                    const groups = window.scheduleGroups || [];
                    if (Array.isArray(groups)) {
                        window.localDB.scheduleGroups.bulkPut(groups).catch(err => console.error("Error bulk putting scheduleGroups:", err));
                    }
                });
                
                console.log("IndexedDB Local Backup Saved");
            }

            const executeSave = () => {
                if (window.syncManager) {
                    window.syncManager.enqueue(window.appState);
                } else if (db) {
                    window.isSyncing = true;
                    showSync('saving');

                    db.collection('studyPlan').doc('globalData').set(window.appState)
                        .then(() => {
                            console.log("Cloud Sync Success");
                            showSync('saved');
                        })
                        .catch((error) => {
                            console.error("Sync Error:", error);
                            showSync('error');
                        })
                        .finally(() => {
                            setTimeout(() => { window.isSyncing = false; }, 300);
                        });
                }
            };

            if (immediate) {
                if (saveTimeout) clearTimeout(saveTimeout);
                executeSave();
            } else {
                if (saveTimeout) clearTimeout(saveTimeout);
                window.saveTimeout = setTimeout(executeSave, 800);
            }
        }


// Expose functions to window namespace
window.initializeFirebase = initializeFirebase;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
