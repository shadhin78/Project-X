        // Initialize Dexie Local Database Layer
        window.localDB = new Dexie("ProjectXLocalDB");
        window.localDB.version(1).stores({
            tasks: 'id, date, type, studyDay',
            timerLogs: '++id, subject, duration, timestamp',
            scheduleBlocks: 'id, day, startTime, endTime, task, track, program, color, isDayStart',
            scheduleBlocks2: 'id, day, startTime, endTime, task, track, program, color, isDayStart',
            scheduleGroups: 'id, name',
            appSettings: 'key, value'
        });
        window.localDB.version(2).stores({
            tasks: 'id, date, type, studyDay',
            timerLogs: '++id, subject, duration, timestamp',
            scheduleBlocks: 'id, day, startTime, endTime, task, track, program, color, isDayStart',
            scheduleBlocks2: 'id, day, startTime, endTime, task, track, program, color, isDayStart',
            scheduleGroups: 'id, name',
            appSettings: 'key, value',
            syncQueue: '++id, timestamp, status'
        });

        window.localDBHelper = {
            // --- Tasks ---
            createTask: async function (task) {
                return await window.localDB.tasks.put(task);
            },
            readTask: async function (id) {
                return await window.localDB.tasks.get(id);
            },
            readAllTasks: async function () {
                return await window.localDB.tasks.toArray();
            },
            updateTask: async function (task) {
                return await window.localDB.tasks.put(task);
            },
            deleteTask: async function (id) {
                return await window.localDB.tasks.delete(id);
            },

            // --- Timer Logs ---
            createTimerLog: async function (log) {
                return await window.localDB.timerLogs.add(log);
            },
            readTimerLog: async function (id) {
                return await window.localDB.timerLogs.get(id);
            },
            readAllTimerLogs: async function () {
                return await window.localDB.timerLogs.toArray();
            },
            updateTimerLog: async function (log) {
                return await window.localDB.timerLogs.put(log);
            },
            deleteTimerLog: async function (id) {
                return await window.localDB.timerLogs.delete(id);
            },

            // --- Schedule Blocks (Routine 1) ---
            createScheduleBlock: async function (block) {
                return await window.localDB.scheduleBlocks.put(block);
            },
            readScheduleBlock: async function (id) {
                return await window.localDB.scheduleBlocks.get(id);
            },
            readAllScheduleBlocks: async function () {
                return await window.localDB.scheduleBlocks.toArray();
            },
            updateScheduleBlock: async function (block) {
                return await window.localDB.scheduleBlocks.put(block);
            },
            deleteScheduleBlock: async function (id) {
                return await window.localDB.scheduleBlocks.delete(id);
            },

            // --- Schedule Blocks (Routine 2) ---
            createScheduleBlock2: async function (block) {
                return await window.localDB.scheduleBlocks2.put(block);
            },
            readScheduleBlock2: async function (id) {
                return await window.localDB.scheduleBlocks2.get(id);
            },
            readAllScheduleBlocks2: async function () {
                return await window.localDB.scheduleBlocks2.toArray();
            },
            updateScheduleBlock2: async function (block) {
                return await window.localDB.scheduleBlocks2.put(block);
            },
            deleteScheduleBlock2: async function (id) {
                return await window.localDB.scheduleBlocks2.delete(id);
            },

            // --- Schedule Groups ---
            createScheduleGroup: async function (group) {
                return await window.localDB.scheduleGroups.put(group);
            },
            readScheduleGroup: async function (id) {
                return await window.localDB.scheduleGroups.get(id);
            },
            readAllScheduleGroups: async function () {
                return await window.localDB.scheduleGroups.toArray();
            },
            updateScheduleGroup: async function (group) {
                return await window.localDB.scheduleGroups.put(group);
            },
            deleteScheduleGroup: async function (id) {
                return await window.localDB.scheduleGroups.delete(id);
            },

            // --- App Settings (Key-Value) ---
            setSetting: async function (key, value) {
                return await window.localDB.appSettings.put({ key, value });
            },
            getSetting: async function (key) {
                const res = await window.localDB.appSettings.get(key);
                return res ? res.value : null;
            },
            deleteSetting: async function (key) {
                return await window.localDB.appSettings.delete(key);
            }
        };

        window.syncManager = {
            isProcessing: false,
            
            // Queue an operation
            enqueue: async function (payload) {
                try {
                    const pendingItem = await window.localDB.syncQueue
                        .where('status')
                        .equals('pending')
                        .first();
                        
                    if (pendingItem) {
                        pendingItem.payload = payload;
                        pendingItem.timestamp = Date.now();
                        await window.localDB.syncQueue.put(pendingItem);
                        console.log("Updated existing pending sync item with latest state.");
                    } else {
                        const queueItem = {
                            timestamp: Date.now(),
                            status: 'pending',
                            payload: payload
                        };
                        const id = await window.localDB.syncQueue.add(queueItem);
                        console.log("Enqueued local change with ID:", id);
                    }
                } catch (err) {
                    console.error("SyncManager enqueue error:", err);
                }
                this.processQueue();
                if (window.updateSyncDashboardUI) {
                    window.updateSyncDashboardUI();
                }
            },
            
            // Process the queue
            processQueue: async function () {
                if (this.isProcessing) {
                    console.log("SyncManager is already processing.");
                    return;
                }
                
                if (!navigator.onLine) {
                    console.log("SyncManager: Offline. Operations queued.");
                    this.updateSyncStatusUI();
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                    return;
                }
                
                this.isProcessing = true;
                
                try {
                    // Find the oldest pending item
                    let pendingItem = await window.localDB.syncQueue
                        .where('status')
                        .equals('pending')
                        .first();
                        
                    while (pendingItem) {
                        console.log("Processing sync item:", pendingItem.id);
                        
                        // Mark as syncing to prevent duplicates
                        pendingItem.status = 'syncing';
                        await window.localDB.syncQueue.put(pendingItem);
                        this.updateSyncStatusUI();
                        if (window.updateSyncDashboardUI) {
                            window.updateSyncDashboardUI();
                        }
                        
                        try {
                            if (db) {
                                showSync('saving');
                                window.isSyncing = true;
                                await db.collection('studyPlan').doc('globalData').set(pendingItem.payload);
                                
                                // Success: Mark as synced
                                pendingItem.status = 'synced';
                                await window.localDB.syncQueue.put(pendingItem);
                                showSync('saved');
                                console.log("Successfully synced item:", pendingItem.id);
                                
                                window.lastSyncTime = Date.now();
                                if (window.localDBHelper) {
                                    await window.localDBHelper.setSetting('lastSyncTime', window.lastSyncTime);
                                }
                                if (window.updateSyncDashboardUI) {
                                    window.updateSyncDashboardUI();
                                }
                            } else {
                                throw new Error("Firestore DB reference not initialized");
                            }
                        } catch (syncErr) {
                            console.error("Failed to sync item:", pendingItem.id, syncErr);
                            // Revert status to pending so it can be retried
                            pendingItem.status = 'pending';
                            await window.localDB.syncQueue.put(pendingItem);
                            showSync('error');
                            window.lastSyncError = syncErr.message || String(syncErr);
                            if (window.updateSyncDashboardUI) {
                                window.updateSyncDashboardUI();
                            }
                            break; // Stop loop and retry later
                        } finally {
                            window.isSyncing = false;
                        }
                        
                        // Grab next pending item
                        pendingItem = await window.localDB.syncQueue
                            .where('status')
                            .equals('pending')
                            .first();
                    }
                } catch (err) {
                    console.error("SyncManager processQueue error:", err);
                } finally {
                    this.isProcessing = false;
                    this.updateSyncStatusUI();
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                }
            },
            
            // Update sync queue indicator in UI
            updateSyncStatusUI: async function () {
                const pendingCount = await window.localDB.syncQueue
                    .where('status')
                    .equals('pending')
                    .count();
                const syncingCount = await window.localDB.syncQueue
                    .where('status')
                    .equals('syncing')
                    .count();
                    
                const syncStatusEl = document.getElementById('sync-status');
                const syncIcon = document.getElementById('sync-icon');
                const syncText = document.getElementById('sync-text');
                
                if (!syncStatusEl || !syncIcon || !syncText) return;
                
                if (pendingCount > 0 || syncingCount > 0) {
                    syncStatusEl.classList.remove('opacity-0', 'scale-95');
                    syncStatusEl.classList.add('opacity-100', 'scale-100');
                    
                    if (syncingCount > 0) {
                        syncIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`;
                        syncIcon.className = "w-3.5 h-3.5 animate-spin text-blue-500";
                        syncText.textContent = `Syncing (${syncingCount})`;
                        syncText.className = "text-[9px] font-black uppercase tracking-widest text-blue-500";
                    } else {
                        syncIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`;
                        syncIcon.className = "w-3.5 h-3.5 text-amber-500";
                        syncText.textContent = `Pending (${pendingCount})`;
                        syncText.className = "text-[9px] font-black uppercase tracking-widest text-amber-500";
                    }
                } else {
                    // If everything is synced, show saved state
                    syncIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />`;
                    syncIcon.className = "w-3.5 h-3.5 text-emerald-500";
                    syncText.textContent = "Synced";
                    syncText.className = "text-[9px] font-black uppercase tracking-widest text-emerald-500";
                    syncStatusEl.classList.remove('opacity-0', 'scale-95');
                    syncStatusEl.classList.add('opacity-100', 'scale-100');
                    
                    // Fade out after 2 seconds
                    setTimeout(() => {
                        // Double check if still no pending items
                        window.localDB.syncQueue.where('status').anyOf('pending', 'syncing').count().then(count => {
                            if (count === 0) {
                                syncStatusEl.classList.add('opacity-0', 'scale-95');
                                syncStatusEl.classList.remove('opacity-100', 'scale-100');
                            }
                        });
                    }, 2000);
                }
            }
        };