        window.isCloudSyncAllowed = function () {
            const isMockConfig = (typeof firebase !== 'undefined' && firebase.app && firebase.app().options && firebase.app().options.apiKey === "mock-api-key");
            if (isMockConfig) return false;
            
            const currentUser = window.currentUser;
            if (!currentUser) return false;
            
            if (currentUser.uid === 'local-admin-uid' || currentUser.uid === 'offline-admin-uid') {
                return false;
            }
            return true;
        };

        // Attach window listeners
        window.addEventListener('online', () => {
            if (window.syncManager) window.syncManager.processQueue();
            if (window.updateSyncDashboardUI) window.updateSyncDashboardUI();
        });
        window.addEventListener('offline', () => {
            if (window.updateSyncDashboardUI) window.updateSyncDashboardUI();
        });

        window.firestoreDiagnostics = {
            logs: [],
            log: function(operation, collection, document, error = null) {
                const uid = (window.currentUser && window.currentUser.uid) || 'Unauthenticated';
                const path = `${collection}/${document}`;
                const status = error ? 'FAILED' : 'SUCCESS';
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    uid: uid,
                    path: path,
                    operation: operation,
                    status: status,
                    error: error ? { message: error.message, code: error.code } : null
                };
                this.logs.unshift(logEntry);
                if (this.logs.length > 50) this.logs.pop(); // Keep last 50 logs
                
                console.log(`[Firestore Diags] ${operation} to ${path} - Status: ${status}`, error || '');
            },
            getReport: function() {
                const uid = (window.currentUser && window.currentUser.uid) || 'Unauthenticated';
                const email = (window.currentUser && window.currentUser.email) || 'None';
                const isAllowed = window.isCloudSyncAllowed ? window.isCloudSyncAllowed() : false;
                
                let reason = "Access allowed";
                if (uid === 'Unauthenticated') {
                    reason = "User is not authenticated with Firebase Auth.";
                } else if (uid === 'local-admin-uid' || uid === 'offline-admin-uid') {
                    reason = "Bypassed login on localhost (Mock Local Admin mode). No Firebase credentials.";
                } else if (!isAllowed) {
                    reason = "Cloud sync configuration disabled or unauthorized session.";
                }
                
                return {
                    currentAuthUser: { uid: uid, email: email },
                    isCloudSyncAllowed: isAllowed,
                    expectedRules: {
                        collection: "userData",
                        document: "{uid}",
                        rule: "allow read, write: if request.auth != null && request.auth.uid == userId;"
                    },
                    history: this.logs,
                    reasonAccessDeniedFallback: reason
                };
            }
        };
        window.printFirestorePermissionsReport = function() {
            console.log("=== FIRESTORE PERMISSIONS REPORT ===");
            console.dir(window.firestoreDiagnostics.getReport());
        };

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
                if (errorMsg) {
                    if (window.lastSyncError.includes("Authentication required")) {
                        errorMsg.innerHTML = `${window.lastSyncError} <a href="/login.html" class="text-blue-500 hover:text-blue-600 dark:text-blue-450 dark:hover:text-blue-400 underline font-black ml-1">Sign in here &rarr;</a>`;
                    } else {
                        errorMsg.textContent = window.lastSyncError;
                    }
                }
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

            const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
            const isMockConfig = (typeof firebase !== 'undefined' && firebase.app && firebase.app().options && firebase.app().options.apiKey === "mock-api-key");
            
            if (isMockConfig || !fbUser) {
                console.log("loadFromCloud: Cloud sync unavailable (Offline/Mock Mode).");
                if (isInitialLoad) { renderUI(); isInitialLoad = false; }
                return;
            }

            const uid = window.currentUser ? window.currentUser.uid : 'unknown';
            db.collection('userData').doc(uid).onSnapshot((docSnap) => {
                if (window.firestoreDiagnostics) {
                    window.firestoreDiagnostics.log('READ/SUBSCRIBE', 'userData', uid);
                }
                if (window.isSyncing) {
                    window.syncLogger.log('FIRESTORE', 'loadFromCloud: Snapshot ignored because we are currently syncing up.');
                    return; // Prevent loop
                }

                if (docSnap.exists) {
                    const data = window.sanitizeAllData(docSnap.data());
                    window.syncLogger.log('FIRESTORE', 'loadFromCloud: New remote snapshot received. Resolving conflicts...');
                    
                    if (window.syncManager && window.syncManager.resolveAllConflicts) {
                        window.syncManager.resolveAllConflicts(data).then(() => {
                            if (isInitialLoad) {
                                renderUI();
                                isInitialLoad = false;
                            } else {
                                requestAnimationFrame(() => {
                                    const scrollPos = window.scrollY; // Preserve scroll position
                                    renderUI();
                                    window.scrollTo(0, scrollPos); // Seamlessly restore scroll
                                    showSync('saved');
                                });
                            }
                        }).catch(err => {
                            window.syncLogger.log('FIRESTORE', 'Error resolving snapshot conflicts:', err);
                        });
                    } else {
                        window.syncLogger.log('FIRESTORE', 'syncManager.resolveAllConflicts not found, skipping.');
                    }
                } else {
                    window.syncLogger.log('FIRESTORE', 'loadFromCloud: Remote document empty.');
                    if (isInitialLoad) {
                        renderUI();
                        isInitialLoad = false;
                    }
                }
            }, (error) => {
                console.error("Sync Error in snapshot:", error);
                const uid = window.currentUser ? window.currentUser.uid : 'unknown';
                if (window.firestoreDiagnostics) {
                    window.firestoreDiagnostics.log('READ/SUBSCRIBE', 'userData', uid, error);
                }
                window.lastSyncError = error.message || String(error);
                if (window.updateSyncDashboardUI) {
                    window.updateSyncDashboardUI();
                }
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

        window.saveCurrentStateToIndexedDB = async function () {
            if (window.localDBHelper) {
                window.syncLogger.log('DEXIE', 'Differ & backup starting for current state to IndexedDB...');
                
                // 1. Settings (Key-Value)
                const settingsToSave = {
                    dashboardConfig: window.dashboardConfig,
                    weeklyTargetsDatabase: window.weeklyTargetsDatabase || {},
                    activeTimerState: window.activeTimerState,
                    passedItems: window.passedItems || { programs: [], subjects: [] },
                    revisionData: window.revisionData || { active: [], progress: {} },
                    subjectTimeLinks: window.subjectTimeLinks || {},
                    successResults: window.successResults || [],
                    tracks: window.tracks || [],
                    activeRoutineSet: window.activeRoutineSet || 1,
                    customPrograms: window.customPrograms || {},
                    customSyllabus: syllabusStructure || {},
                    customActions: window.customActions || [],
                    paceGoals: window.paceGoals || []
                };

                for (const key in settingsToSave) {
                    const enriched = await window.enrichSetting(key, settingsToSave[key]);
                    await window.localDB.appSettings.put(enriched);
                }

                // 2. Tasks
                const tasksResult = await window.enrichChangedRecords('tasks', tasks, 'id');
                window.tasks = tasksResult.enrichedArray;
                tasks = tasksResult.enrichedArray;
                await window.localDB.tasks.clear();
                if (window.tasks.length > 0) {
                    await window.localDB.tasks.bulkPut(window.tasks);
                }

                // 3. Timer Logs
                const timerLogsResult = await window.enrichChangedRecords('timerLogs', window.timerLogs || [], 'id');
                window.timerLogs = timerLogsResult.enrichedArray;
                await window.localDB.timerLogs.clear();
                if (window.timerLogs.length > 0) {
                    await window.localDB.timerLogs.bulkPut(window.timerLogs);
                }

                // 4. Schedule Blocks
                const scheduleBlocksResult = await window.enrichChangedRecords('scheduleBlocks', window.scheduleBlocks || [], 'id');
                window.scheduleBlocks = scheduleBlocksResult.enrichedArray;
                await window.localDB.scheduleBlocks.clear();
                if (window.scheduleBlocks.length > 0) {
                    await window.localDB.scheduleBlocks.bulkPut(window.scheduleBlocks);
                }

                // 5. Schedule Blocks 2
                const scheduleBlocks2Result = await window.enrichChangedRecords('scheduleBlocks2', window.scheduleBlocks2 || [], 'id');
                window.scheduleBlocks2 = scheduleBlocks2Result.enrichedArray;
                await window.localDB.scheduleBlocks2.clear();
                if (window.scheduleBlocks2.length > 0) {
                    await window.localDB.scheduleBlocks2.bulkPut(window.scheduleBlocks2);
                }

                // 6. Schedule Groups
                const scheduleGroupsResult = await window.enrichChangedRecords('scheduleGroups', window.scheduleGroups || [], 'id');
                window.scheduleGroups = scheduleGroupsResult.enrichedArray;
                await window.localDB.scheduleGroups.clear();
                if (window.scheduleGroups.length > 0) {
                    await window.localDB.scheduleGroups.bulkPut(window.scheduleGroups);
                }

                window.syncLogger.log('DEXIE', 'IndexedDB local backup complete (differ & enrich executed).');
            }
        };

        async function saveToCloud(immediate = false) {
            if (window.saveCurrentStateToIndexedDB) {
                await window.saveCurrentStateToIndexedDB();
            }

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

            localStorage.setItem('studyMasterBackup', JSON.stringify(window.appState));
            window.syncLogger.log('CACHE', 'Offline Backup Saved to LocalStorage');

            const executeSave = () => {
                if (window.syncManager) {
                    window.syncManager.enqueue(window.appState);
                } else if (db) {
                    const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
                    const isMockConfig = (typeof firebase !== 'undefined' && firebase.app && firebase.app().options && firebase.app().options.apiKey === "mock-api-key");
                    if (isMockConfig || !fbUser) {
                        window.syncLogger.log('FIRESTORE', 'saveToCloud: Cloud sync unavailable (Offline/Mock Mode).');
                        showSync('error');
                        return;
                    }

                    window.isSyncing = true;
                    showSync('saving');
                    const uid = window.currentUser ? window.currentUser.uid : 'unknown';
                    db.collection('userData').doc(uid).set(window.appState)
                        .then(() => {
                            window.syncLogger.log('FIRESTORE', 'Cloud Sync Success via direct set');
                            if (window.firestoreDiagnostics) {
                                window.firestoreDiagnostics.log('WRITE/SET', 'userData', uid);
                            }
                            showSync('saved');
                        })
                        .catch((error) => {
                            window.syncLogger.log('FIRESTORE', 'Sync Error via direct set:', error);
                            if (window.firestoreDiagnostics) {
                                window.firestoreDiagnostics.log('WRITE/SET', 'userData', uid, error);
                            }
                            showSync('error');
                        })
                        .finally(() => {
                            setTimeout(() => { window.isSyncing = false; }, 300);
                        });
                }
            };

            if (immediate) {
                if (window.saveTimeout) clearTimeout(window.saveTimeout);
                executeSave();
            } else {
                if (window.saveTimeout) clearTimeout(window.saveTimeout);
                window.saveTimeout = setTimeout(executeSave, 800);
            }
        }


// Expose functions to window namespace
window.initializeFirebase = initializeFirebase;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
