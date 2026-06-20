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

        window.syncLogger = {
            log: function (tag, message, details = '') {
                const timestamp = new Date().toISOString();
                const detailStr = details ? ' ' + (typeof details === 'object' ? JSON.stringify(details) : details) : '';
                console.log(`[${tag}] [${timestamp}] ${message}${detailStr}`);
            }
        };

        window.migrateRecord = function (record, defaultId, defaultSyncStatus = 'synced') {
            if (!record || typeof record !== 'object') return record;
            if (record.id === undefined || record.id === null) {
                record.id = defaultId;
            }
            if (record.updatedAt === undefined || record.updatedAt === null) {
                record.updatedAt = 1718880000000; // June 20, 2024
            }
            if (record.version === undefined || record.version === null) {
                record.version = 1;
            }
            if (record.syncStatus === undefined || record.syncStatus === null) {
                record.syncStatus = defaultSyncStatus;
            }
            return record;
        };

        window.enrichChangedRecords = async function (tableName, currentArray, keyField = 'id') {
            const oldRecords = await window.localDB[tableName].toArray();
            const oldMap = new Map(oldRecords.map(r => [r[keyField], r]));
            
            const enrichedArray = [];
            let changedAny = false;
            
            for (let item of currentArray) {
                const itemCopy = { ...item };
                const oldItem = oldMap.get(itemCopy[keyField]);
                
                if (!oldItem) {
                    itemCopy.updatedAt = Date.now();
                    itemCopy.version = 1;
                    itemCopy.syncStatus = 'pending';
                    changedAny = true;
                    window.syncLogger.log('DEXIE', `New record in ${tableName}: ${itemCopy[keyField]}`);
                } else {
                    const cleanCopy = { ...itemCopy };
                    delete cleanCopy.updatedAt;
                    delete cleanCopy.version;
                    delete cleanCopy.syncStatus;
                    delete cleanCopy.deleted;
                    
                    const cleanOld = { ...oldItem };
                    delete cleanOld.updatedAt;
                    delete cleanOld.version;
                    delete cleanOld.syncStatus;
                    delete cleanOld.deleted;
                    
                    if (JSON.stringify(cleanCopy) !== JSON.stringify(cleanOld)) {
                        itemCopy.updatedAt = Date.now();
                        itemCopy.version = (oldItem.version || 0) + 1;
                        itemCopy.syncStatus = 'pending';
                        changedAny = true;
                        window.syncLogger.log('DEXIE', `Modified record in ${tableName}: ${itemCopy[keyField]} (v${itemCopy.version})`);
                    } else {
                        itemCopy.updatedAt = oldItem.updatedAt || 1718880000000;
                        itemCopy.version = oldItem.version || 1;
                        itemCopy.syncStatus = oldItem.syncStatus || 'synced';
                    }
                }
                enrichedArray.push(itemCopy);
            }
            
            const currentKeys = new Set(currentArray.map(r => r[keyField]));
            const deletedItems = oldRecords.filter(r => !currentKeys.has(r[keyField]));
            
            if (deletedItems.length > 0) {
                changedAny = true;
                const deletedRecordsSetting = await window.localDB.appSettings.get('deletedRecords') || { key: 'deletedRecords', value: [] };
                const deletedList = Array.isArray(deletedRecordsSetting.value) ? deletedRecordsSetting.value : [];
                
                for (let del of deletedItems) {
                    if (!deletedList.some(d => d.table === tableName && d.id === del[keyField])) {
                        deletedList.push({
                            id: del[keyField],
                            table: tableName,
                            deletedAt: Date.now()
                        });
                        window.syncLogger.log('DEXIE', `Deleted record tombstone in ${tableName}: ${del[keyField]}`);
                    }
                }
                
                await window.localDB.appSettings.put({
                    key: 'deletedRecords',
                    value: deletedList,
                    updatedAt: Date.now(),
                    version: (deletedRecordsSetting.version || 0) + 1,
                    syncStatus: 'pending'
                });
            }
            
            return { enrichedArray, changedAny };
        };

        window.enrichSetting = async function (key, newValue) {
            const oldSetting = await window.localDB.appSettings.get(key);
            let updatedSetting;
            
            if (!oldSetting) {
                updatedSetting = {
                    key,
                    value: newValue,
                    updatedAt: Date.now(),
                    version: 1,
                    syncStatus: 'pending'
                };
                window.syncLogger.log('DEXIE', `New setting created: ${key}`);
            } else {
                const cleanOld = oldSetting.value;
                if (JSON.stringify(cleanOld) !== JSON.stringify(newValue)) {
                    updatedSetting = {
                        key,
                        value: newValue,
                        updatedAt: Date.now(),
                        version: (oldSetting.version || 0) + 1,
                        syncStatus: 'pending'
                    };
                    window.syncLogger.log('DEXIE', `Setting modified: ${key} (v${updatedSetting.version})`);
                } else {
                    updatedSetting = {
                        key,
                        value: newValue,
                        updatedAt: oldSetting.updatedAt || 1718880000000,
                        version: oldSetting.version || 1,
                        syncStatus: oldSetting.syncStatus || 'synced'
                    };
                }
            }
            return updatedSetting;
        };

        window.unionArrays = function (arr1, arr2) {
            if (!Array.isArray(arr1)) arr1 = [];
            if (!Array.isArray(arr2)) arr2 = [];
            return Array.from(new Set([...arr1, ...arr2]));
        };

        window.mergeWeeklyTargets = function (local, remote) {
            local = local || {};
            remote = remote || {};
            const merged = { ...remote };
            for (const week in local) {
                if (!merged[week]) {
                    merged[week] = local[week];
                } else {
                    const remoteWeekTargets = merged[week];
                    const localWeekTargets = local[week];
                    const targetMap = new Map();
                    remoteWeekTargets.forEach(t => {
                        const key = `${t.track}||${t.program}||${t.subject}||${t.chapter}`;
                        targetMap.set(key, t);
                    });
                    localWeekTargets.forEach(t => {
                        const key = `${t.track}||${t.program}||${t.subject}||${t.chapter}`;
                        if (targetMap.has(key)) {
                            const existing = targetMap.get(key);
                            targetMap.set(key, {
                                ...existing,
                                completed: existing.completed || t.completed
                            });
                        } else {
                            targetMap.set(key, t);
                        }
                    });
                    merged[week] = Array.from(targetMap.values());
                }
            }
            return merged;
        };

        window.mergeRevisionData = function (local, remote) {
            local = local || { active: [], progress: {} };
            remote = remote || { active: [], progress: {} };
            const active = window.unionArrays(local.active, remote.active);
            const progress = { ...remote.progress };
            for (const sub in local.progress) {
                if (!progress[sub]) {
                    progress[sub] = local.progress[sub];
                } else {
                    progress[sub] = { ...progress[sub] };
                    for (const ch in local.progress[sub]) {
                        progress[sub][ch] = progress[sub][ch] || local.progress[sub][ch];
                    }
                }
            }
            return { active, progress };
        };

        window.mergeDeletedRecords = function (local, remote) {
            local = local || [];
            remote = remote || [];
            const map = new Map();
            remote.forEach(r => map.set(`${r.table}||${r.id}`, r));
            local.forEach(r => {
                const key = `${r.table}||${r.id}`;
                if (map.has(key)) {
                    const existing = map.get(key);
                    if (r.deletedAt > existing.deletedAt) {
                        map.set(key, r);
                    }
                } else {
                    map.set(key, r);
                }
            });
            return Array.from(map.values());
        };

        window.mergeArrayById = function (localArr, remoteArr, idField = 'id') {
            localArr = Array.isArray(localArr) ? localArr : [];
            remoteArr = Array.isArray(remoteArr) ? remoteArr : [];
            const map = new Map();
            remoteArr.forEach(item => {
                if (item && item[idField] !== undefined) map.set(item[idField], item);
            });
            localArr.forEach(item => {
                if (item && item[idField] !== undefined) {
                    if (map.has(item[idField])) {
                        const existing = map.get(item[idField]);
                        if (item.updatedAt && existing.updatedAt) {
                            if (item.updatedAt > existing.updatedAt) {
                                map.set(item[idField], item);
                            }
                        } else {
                            map.set(item[idField], { ...existing, ...item });
                        }
                    } else {
                        map.set(item[idField], item);
                    }
                }
            });
            return Array.from(map.values());
        };

        window.mergeCustomPrograms = function (local, remote) {
            local = local || {};
            remote = remote || {};
            const merged = { ...remote };
            for (const trackId in local) {
                if (!merged[trackId]) {
                    merged[trackId] = local[trackId];
                } else {
                    merged[trackId] = window.mergeArrayById(local[trackId], merged[trackId], 'id');
                }
            }
            return merged;
        };

        window.mergeCustomSyllabus = function (local, remote) {
            local = local || {};
            remote = remote || {};
            const merged = { ...remote };
            for (const trackId in local) {
                if (!merged[trackId]) {
                    merged[trackId] = local[trackId];
                } else {
                    merged[trackId] = window.mergeArrayById(local[trackId], merged[trackId], 'subject');
                }
            }
            return merged;
        };

        window.mergeSubjectTimeLinks = function (local, remote) {
            local = local || {};
            remote = remote || {};
            const merged = { ...remote };
            for (const sub in local) {
                if (!merged[sub]) {
                    merged[sub] = local[sub];
                } else {
                    const localLink = local[sub];
                    const remoteLink = remote[sub];
                    if (localLink.updatedAt && remoteLink.updatedAt) {
                        if (localLink.updatedAt > remoteLink.updatedAt) {
                            merged[sub] = localLink;
                        }
                    } else {
                        merged[sub] = { ...remoteLink, ...localLink };
                    }
                }
            }
            return merged;
        };

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
            
            enqueue: async function (payload) {
                this.processQueue();
                if (window.updateSyncDashboardUI) {
                    window.updateSyncDashboardUI();
                }
            },
            
            processQueue: async function () {
                if (this.isProcessing) {
                    window.syncLogger.log('SYNC-UP', 'SyncManager is already processing.');
                    return;
                }
                
                if (!navigator.onLine) {
                    window.syncLogger.log('SYNC-UP', 'SyncManager: Offline. Operations queued locally.');
                    this.updateSyncStatusUI();
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                    return;
                }

                const isAllowed = window.isCloudSyncAllowed && window.isCloudSyncAllowed();
                if (!isAllowed) {
                    const isMockConfig = (typeof firebase !== 'undefined' && firebase.app && firebase.app().options && firebase.app().options.apiKey === "mock-api-key");
                    window.syncLogger.log('SYNC-UP', 'SyncManager: Cloud sync disallowed (Offline/Mock/Unauthenticated).');
                    window.lastSyncError = isMockConfig ? "Using mock configuration. Cloud sync disabled." : "Authentication required for cloud backup.";
                    this.updateSyncStatusUI();
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                    return;
                }

                this.isProcessing = true;
                showSync('saving');
                
                let logId;
                try {
                    logId = await window.localDB.syncQueue.add({
                        timestamp: Date.now(),
                        status: 'syncing'
                    });
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                } catch (e) {
                    console.error("Failed to add log to syncQueue:", e);
                }

                try {
                    const uid = window.currentUser ? window.currentUser.uid : 'unknown';
                    window.syncLogger.log('FIRESTORE', `Reading remote document for sync. User: ${uid}`);
                    
                    const docSnap = await db.collection('userData').doc(uid).get();
                    if (window.firestoreDiagnostics) {
                        window.firestoreDiagnostics.log('READ/GET', 'userData', uid);
                    }
                    
                    let remoteData = docSnap.exists ? docSnap.data() : null;
                    
                    await this.resolveAllConflicts(remoteData);
                    
                    if (logId !== undefined) {
                        await window.localDB.syncQueue.update(logId, { status: 'synced' });
                    }
                    
                    showSync('saved');
                    window.lastSyncTime = Date.now();
                    if (window.localDBHelper) {
                        await window.localDBHelper.setSetting('lastSyncTime', window.lastSyncTime);
                    }
                } catch (err) {
                    window.syncLogger.log('SYNC-UP', 'Sync failed:', err);
                    window.lastSyncError = err.message || String(err);
                    showSync('error');
                    
                    if (logId !== undefined) {
                        await window.localDB.syncQueue.update(logId, { status: 'error' });
                    }
                } finally {
                    this.isProcessing = false;
                    this.updateSyncStatusUI();
                    if (window.updateSyncDashboardUI) {
                        window.updateSyncDashboardUI();
                    }
                }
            },

            resolveAllConflicts: async function (remoteData) {
                window.syncLogger.log('SYNC-DOWN', 'Running record-level bidirectional sync & conflict resolution...');
                
                const uid = window.currentUser ? window.currentUser.uid : 'unknown';
                if (!remoteData) {
                    window.syncLogger.log('SYNC-UP', 'Remote document empty. Uploading entire local state...');
                    
                    await this.markAllSynced();
                    
                    const payload = this.constructFullPayload();
                    await db.collection('userData').doc(uid).set(payload);
                    if (window.firestoreDiagnostics) {
                        window.firestoreDiagnostics.log('WRITE/SET', 'userData', uid);
                    }
                    await this.loadDexieToMemoryState();
                    return;
                }

                let hasLocalPending = false;
                const remoteMetadata = remoteData.metadata || { settings: {}, records: {} };
                const settingsMeta = remoteMetadata.settings || {};
                
                const nextSettingsMeta = { ...settingsMeta };
                const nextRemoteData = { ...remoteData };
                if (!nextRemoteData.metadata) nextRemoteData.metadata = {};
                nextRemoteData.metadata.settings = nextSettingsMeta;

                const localSettings = await window.localDB.appSettings.toArray();
                const localSettingsMap = new Map(localSettings.map(s => [s.key, s]));
                
                const allSettingKeys = new Set([
                    ...localSettings.map(s => s.key),
                    ...Object.keys(remoteData).filter(k => k !== 'tasks' && k !== 'timerLogs' && k !== 'scheduleBlocks' && k !== 'scheduleBlocks2' && k !== 'scheduleGroups' && k !== 'metadata' && k !== 'weeklyTargets' && k !== 'deletedRecords')
                ]);

                for (const key of allSettingKeys) {
                    if (key === 'deletedRecords') continue;
                    
                    const localSetting = localSettingsMap.get(key);
                    const remoteValue = remoteData[key];
                    const remoteMeta = settingsMeta[key] || { updatedAt: 0, version: 1 };
                    
                    if (remoteValue !== undefined && !localSetting) {
                        await window.localDB.appSettings.put({
                            key,
                            value: remoteValue,
                            updatedAt: remoteMeta.updatedAt || 1718880000000,
                            version: remoteMeta.version || 1,
                            syncStatus: 'synced'
                        });
                        window.syncLogger.log('SYNC-DOWN', `Downloaded remote-only setting key: ${key}`);
                    } else if (remoteValue === undefined && localSetting) {
                        if (localSetting.syncStatus === 'pending') {
                            nextRemoteData[key] = localSetting.value;
                            nextSettingsMeta[key] = { updatedAt: localSetting.updatedAt, version: localSetting.version };
                            hasLocalPending = true;
                        } else {
                            await window.localDB.appSettings.delete(key);
                            window.syncLogger.log('SYNC-DOWN', `Deleted local setting key (not found on remote): ${key}`);
                        }
                    } else if (remoteValue !== undefined && localSetting) {
                        const localTS = localSetting.updatedAt || 1718880000000;
                        const localVer = localSetting.version || 1;
                        const remoteTS = remoteMeta.updatedAt || 0;
                        const remoteVer = remoteMeta.version || 1;
                        
                        if (localSetting.syncStatus === 'pending') {
                            hasLocalPending = true;
                            
                            if (remoteTS > localTS || remoteVer > localVer) {
                                window.syncLogger.log('CONFLICT', `Conflict on setting key: ${key}. Remote wins/merging.`, { localTS, remoteTS, localVer, remoteVer });
                                
                                let mergedValue = remoteValue;
                                if (key === 'weeklyTargetsDatabase') mergedValue = window.mergeWeeklyTargets(localSetting.value, remoteValue);
                                else if (key === 'passedItems') mergedValue = { programs: window.unionArrays(localSetting.value?.programs, remoteValue?.programs), subjects: window.unionArrays(localSetting.value?.subjects, remoteValue?.subjects) };
                                else if (key === 'revisionData') mergedValue = window.mergeRevisionData(localSetting.value, remoteValue);
                                else if (key === 'customSyllabus') mergedValue = window.mergeCustomSyllabus(localSetting.value, remoteValue);
                                else if (key === 'customPrograms') mergedValue = window.mergeCustomPrograms(localSetting.value, remoteValue);
                                else if (key === 'tracks') mergedValue = window.mergeArrayById(localSetting.value, remoteValue, 'id');
                                else if (key === 'paceGoals') mergedValue = window.mergeArrayById(localSetting.value, remoteValue, 'id');
                                else if (key === 'subjectTimeLinks') mergedValue = window.mergeSubjectTimeLinks(localSetting.value, remoteValue);
                                
                                const nextTS = Math.max(localTS, remoteTS);
                                const nextVer = Math.max(localVer, remoteVer) + 1;
                                
                                await window.localDB.appSettings.put({
                                    key,
                                    value: mergedValue,
                                    updatedAt: nextTS,
                                    version: nextVer,
                                    syncStatus: 'pending'
                                });
                                nextRemoteData[key] = mergedValue;
                                nextSettingsMeta[key] = { updatedAt: nextTS, version: nextVer };
                            } else {
                                nextRemoteData[key] = localSetting.value;
                                nextSettingsMeta[key] = { updatedAt: localTS, version: localVer };
                            }
                        } else {
                            if (remoteTS > localTS || remoteVer > localVer) {
                                await window.localDB.appSettings.put({
                                    key,
                                    value: remoteValue,
                                    updatedAt: remoteTS,
                                    version: remoteVer,
                                    syncStatus: 'synced'
                                });
                                window.syncLogger.log('SYNC-DOWN', `Updated local setting key from remote: ${key}`);
                            }
                        }
                    }
                }

                const localTombSetting = await window.localDB.appSettings.get('deletedRecords') || { key: 'deletedRecords', value: [] };
                const remoteTombVal = remoteData.deletedRecords || [];
                const mergedTombstones = window.mergeDeletedRecords(localTombSetting.value, remoteTombVal);
                
                await window.localDB.appSettings.put({
                    key: 'deletedRecords',
                    value: mergedTombstones,
                    updatedAt: Date.now(),
                    version: (localTombSetting.version || 0) + 1,
                    syncStatus: localTombSetting.syncStatus === 'pending' || remoteData.deletedRecords ? 'pending' : 'synced'
                });
                nextRemoteData.deletedRecords = mergedTombstones;

                const tables = ['tasks', 'timerLogs', 'scheduleBlocks', 'scheduleBlocks2', 'scheduleGroups'];
                const keyFields = {
                    tasks: 'id',
                    timerLogs: 'id',
                    scheduleBlocks: 'id',
                    scheduleBlocks2: 'id',
                    scheduleGroups: 'id'
                };
                
                for (const table of tables) {
                    const keyField = keyFields[table];
                    const localRecords = await window.localDB[table].toArray();
                    const localMap = new Map(localRecords.map(r => [r[keyField], r]));
                    
                    const remoteArray = Array.isArray(remoteData[table]) ? remoteData[table] : [];
                    const remoteMap = new Map(remoteArray.map(r => [r[keyField], r]));
                    
                    const allKeys = new Set([...localRecords.map(r => r[keyField]), ...remoteArray.map(r => r[keyField])]);
                    const mergedRecords = [];
                    const recordsToPutLocal = [];
                    const recordsToDeleteLocal = [];
                    
                    for (const id of allKeys) {
                        const localRec = localMap.get(id);
                        const remoteRec = remoteMap.get(id);
                        
                        const isDeleted = mergedTombstones.some(t => t.table === table && String(t.id) === String(id));
                        if (isDeleted) {
                            if (localRec) recordsToDeleteLocal.push(id);
                            window.syncLogger.log('SYNC-DOWN', `Soft-deleted record removed from tables: ${table}, ID: ${id}`);
                            continue;
                        }
                        
                        if (remoteRec && !localRec) {
                            const migrated = window.migrateRecord(remoteRec, id, 'synced');
                            recordsToPutLocal.push(migrated);
                            mergedRecords.push(migrated);
                            window.syncLogger.log('SYNC-DOWN', `Downloaded remote-only record. Table: ${table}, ID: ${id}`);
                        } else if (!remoteRec && localRec) {
                            if (localRec.syncStatus === 'pending') {
                                mergedRecords.push(localRec);
                                hasLocalPending = true;
                            } else {
                                recordsToDeleteLocal.push(id);
                                window.syncLogger.log('SYNC-DOWN', `Removed local record not found on remote. Table: ${table}, ID: ${id}`);
                            }
                        } else if (remoteRec && localRec) {
                            const migratedRemote = window.migrateRecord(remoteRec, id, 'synced');
                            const migratedLocal = window.migrateRecord(localRec, id, localRec.syncStatus);
                            
                            const localTS = migratedLocal.updatedAt;
                            const localVer = migratedLocal.version;
                            const remoteTS = migratedRemote.updatedAt;
                            const remoteVer = migratedRemote.version;
                            
                            if (migratedLocal.syncStatus === 'pending') {
                                hasLocalPending = true;
                                
                                if (remoteTS > localTS || remoteVer > localVer) {
                                    window.syncLogger.log('CONFLICT', `Conflict on table ${table}, ID: ${id}. Remote wins.`, { localTS, remoteTS, localVer, remoteVer });
                                    recordsToPutLocal.push(migratedRemote);
                                    mergedRecords.push(migratedRemote);
                                } else {
                                    mergedRecords.push(migratedLocal);
                                }
                            } else {
                                if (remoteTS > localTS || remoteVer > localVer) {
                                    recordsToPutLocal.push(migratedRemote);
                                    mergedRecords.push(migratedRemote);
                                    window.syncLogger.log('SYNC-DOWN', `Updated local record from remote. Table: ${table}, ID: ${id}`);
                                } else {
                                    mergedRecords.push(migratedLocal);
                                }
                            }
                        }
                    }
                    
                    for (const rec of recordsToPutLocal) {
                        await window.localDB[table].put(rec);
                    }
                    for (const id of recordsToDeleteLocal) {
                        await window.localDB[table].delete(id);
                    }
                    
                    nextRemoteData[table] = mergedRecords;
                }

                if (hasLocalPending) {
                    window.syncLogger.log('SYNC-UP', 'Uploading local changes merged with remote...');
                    const cleanRemoteData = { ...nextRemoteData };
                    for (const table of tables) {
                        if (Array.isArray(cleanRemoteData[table])) {
                            cleanRemoteData[table] = cleanRemoteData[table].map(r => ({ ...r, syncStatus: 'synced' }));
                        }
                    }
                    const cleanSettingsMeta = { ...nextSettingsMeta };
                    for (const key in cleanRemoteData) {
                        if (key !== 'tasks' && key !== 'timerLogs' && key !== 'scheduleBlocks' && key !== 'scheduleBlocks2' && key !== 'scheduleGroups' && key !== 'metadata' && key !== 'weeklyTargets' && key !== 'deletedRecords') {
                            const meta = cleanSettingsMeta[key] || { updatedAt: Date.now(), version: 1 };
                            cleanSettingsMeta[key] = { updatedAt: meta.updatedAt, version: meta.version };
                        }
                    }
                    cleanRemoteData.metadata.settings = cleanSettingsMeta;
                    
                    window.isSyncing = true;
                    await db.collection('userData').doc(uid).set(cleanRemoteData);
                    if (window.firestoreDiagnostics) {
                        window.firestoreDiagnostics.log('WRITE/SET', 'userData', uid);
                    }
                    
                    await this.markAllSynced();
                    window.syncLogger.log('SYNC-UP', 'Successfully uploaded and synced all local pending changes.');
                } else {
                    window.syncLogger.log('SYNC-DOWN', 'Local database is fully up to date with remote. No upload needed.');
                }
                
                await this.loadDexieToMemoryState();
            },

            markAllSynced: async function () {
                const tables = ['tasks', 'timerLogs', 'scheduleBlocks', 'scheduleBlocks2', 'scheduleGroups'];
                for (const table of tables) {
                    const records = await window.localDB[table].toArray();
                    for (const r of records) {
                        if (r.syncStatus === 'pending') {
                            r.syncStatus = 'synced';
                            await window.localDB[table].put(r);
                        }
                    }
                }
                
                const settings = await window.localDB.appSettings.toArray();
                for (const s of settings) {
                    if (s.syncStatus === 'pending') {
                        s.syncStatus = 'synced';
                        await window.localDB.appSettings.put(s);
                    }
                }
            },

            loadDexieToMemoryState: async function () {
                window.syncLogger.log('STARTUP', 'Refreshing memory state and window variables from Dexie...');
                
                const dbTasks = await window.localDB.tasks.toArray();
                window.tasks = dbTasks.map(t => window.migrateRecord(t, t.id, 'synced'));
                tasks = window.tasks;
                
                const dbTimerLogs = await window.localDB.timerLogs.toArray();
                window.timerLogs = dbTimerLogs.map(l => window.migrateRecord(l, l.id, 'synced'));
                
                const dbBlocks = await window.localDB.scheduleBlocks.toArray();
                window.scheduleBlocks = dbBlocks.map(b => window.migrateRecord(b, b.id, 'synced'));
                
                const dbBlocks2 = await window.localDB.scheduleBlocks2.toArray();
                window.scheduleBlocks2 = dbBlocks2.map(b => window.migrateRecord(b, b.id, 'synced'));
                
                const dbGroups = await window.localDB.scheduleGroups.toArray();
                window.scheduleGroups = dbGroups.map(g => window.migrateRecord(g, g.id, 'synced'));
                
                const tracks = await window.localDB.appSettings.get('tracks');
                if (tracks) window.tracks = tracks.value;
                
                const customSyllabus = await window.localDB.appSettings.get('customSyllabus');
                if (customSyllabus) syllabusStructure = customSyllabus.value;
                
                const customPrograms = await window.localDB.appSettings.get('customPrograms');
                if (customPrograms) window.customPrograms = customPrograms.value;
                
                const customActions = await window.localDB.appSettings.get('customActions');
                if (customActions) window.customActions = customActions.value;
                
                const paceGoals = await window.localDB.appSettings.get('paceGoals');
                if (paceGoals) window.paceGoals = paceGoals.value;
                
                const passedItems = await window.localDB.appSettings.get('passedItems');
                if (passedItems) window.passedItems = passedItems.value;
                
                const revisionData = await window.localDB.appSettings.get('revisionData');
                if (revisionData) window.revisionData = revisionData.value;
                
                const subjectTimeLinks = await window.localDB.appSettings.get('subjectTimeLinks');
                if (subjectTimeLinks) window.subjectTimeLinks = subjectTimeLinks.value;
                
                const successResults = await window.localDB.appSettings.get('successResults');
                if (successResults) window.successResults = successResults.value;
                
                const activeTimerState = await window.localDB.appSettings.get('activeTimerState');
                if (activeTimerState) window.activeTimerState = activeTimerState.value;
                
                const dashboardConfig = await window.localDB.appSettings.get('dashboardConfig');
                if (dashboardConfig) window.dashboardConfig = dashboardConfig.value;
                
                const weeklyTargetsDatabase = await window.localDB.appSettings.get('weeklyTargetsDatabase');
                if (weeklyTargetsDatabase) window.weeklyTargetsDatabase = weeklyTargetsDatabase.value;
                
                const activeRoutineSet = await window.localDB.appSettings.get('activeRoutineSet');
                if (activeRoutineSet) window.activeRoutineSet = activeRoutineSet.value;
                
                window.migrateLegacyData();
                window.sortAllCustomData();
                recalculateTotals();
                
                window.appState = this.constructFullPayload();
                localStorage.setItem('studyMasterBackup', JSON.stringify(window.appState));
            },

            constructFullPayload: function () {
                return {
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
                    activeTimerState: window.activeTimerState,
                    dashboardConfig: window.dashboardConfig,
                    weeklyTargetsDatabase: window.weeklyTargetsDatabase || {},
                    scheduleBlocks: window.scheduleBlocks || [],
                    scheduleBlocks2: window.scheduleBlocks2 || [],
                    scheduleGroups: window.scheduleGroups || [],
                    deletedRecords: (function() {
                        const s = localStorage.getItem('studyMasterBackup');
                        try { return JSON.parse(s).deletedRecords || []; } catch(e) { return []; }
                    })(),
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
            },

            updateSyncStatusUI: async function () {
                const tables = ['tasks', 'timerLogs', 'scheduleBlocks', 'scheduleBlocks2', 'scheduleGroups'];
                let pendingCount = 0;
                try {
                    for (const table of tables) {
                        const records = await window.localDB[table].toArray();
                        pendingCount += records.filter(r => r.syncStatus === 'pending').length;
                    }
                    const settings = await window.localDB.appSettings.toArray();
                    pendingCount += settings.filter(s => s.syncStatus === 'pending').length;
                } catch (e) {
                    pendingCount = 0;
                }
                
                const syncingCount = this.isProcessing ? 1 : 0;
                
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
                        syncText.textContent = `Syncing (${pendingCount})`;
                        syncText.className = "text-[9px] font-black uppercase tracking-widest text-blue-500";
                    } else {
                        syncIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`;
                        syncIcon.className = "w-3.5 h-3.5 text-amber-500";
                        syncText.textContent = `Pending (${pendingCount})`;
                        syncText.className = "text-[9px] font-black uppercase tracking-widest text-amber-500";
                    }
                } else {
                    syncIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />`;
                    syncIcon.className = "w-3.5 h-3.5 text-emerald-500";
                    syncText.textContent = "Synced";
                    syncText.className = "text-[9px] font-black uppercase tracking-widest text-emerald-500";
                    syncStatusEl.classList.remove('opacity-0', 'scale-95');
                    syncStatusEl.classList.add('opacity-100', 'scale-100');
                    
                    setTimeout(() => {
                        let currentPending = 0;
                        const checkTables = async () => {
                            try {
                                for (const table of tables) {
                                    const records = await window.localDB[table].toArray();
                                    currentPending += records.filter(r => r.syncStatus === 'pending').length;
                                }
                                const settings = await window.localDB.appSettings.toArray();
                                currentPending += settings.filter(s => s.syncStatus === 'pending').length;
                            } catch (e) {}
                            if (currentPending === 0 && !this.isProcessing) {
                                syncStatusEl.classList.add('opacity-0', 'scale-95');
                                syncStatusEl.classList.remove('opacity-100', 'scale-100');
                            }
                        };
                        checkTables();
                    }, 2000);
                }
            }
        };