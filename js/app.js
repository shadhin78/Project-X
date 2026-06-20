window.toggleMobileSidebar = function () {
    const sidebar = document.getElementById('sidebar-container');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
        const isOpen = sidebar.classList.contains('translate-x-0');
        if (isOpen) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            if (backdrop) {
                backdrop.classList.add('opacity-0', 'pointer-events-none');
                backdrop.classList.remove('opacity-100');
            }
        } else {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            if (backdrop) {
                backdrop.classList.remove('opacity-0', 'pointer-events-none');
                backdrop.classList.add('opacity-100');
            }
        }
    }
};

window.closeMobileSidebar = function () {
    const sidebar = document.getElementById('sidebar-container');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
    if (backdrop) {
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
    }
};

window.switchPage = function (pageId) {
    const pages = ['dashboard', 'timer', 'daily-actions', 'schedule', 'subjects', 'paces-management', 'master-config', 'outcome'];
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) {
            if (p === pageId) {
                el.classList.remove('hidden');
                el.classList.add('animate-page-enter');
            } else {
                el.classList.add('hidden');
                el.classList.remove('animate-page-enter');
            }
        }
    });

    const buttons = {
        'dashboard': { active: 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-lg', hover: 'hover:border-blue-400' },
        'daily-actions': { active: 'bg-orange-500 text-white border-orange-500 shadow-lg', hover: 'hover:border-orange-400' },
        'subjects': { active: 'bg-violet-600 text-white border-violet-600 shadow-lg', hover: 'hover:border-violet-400' },
        'paces-management': { active: 'bg-red-600 text-white border-red-600 shadow-lg', hover: 'hover:border-red-400' },
        'master-config': { active: 'bg-indigo-600 text-white border-indigo-600 shadow-lg', hover: 'hover:border-indigo-400' },
        'outcome': { active: 'bg-yellow-500 text-white border-yellow-500 shadow-lg', hover: 'hover:border-yellow-400' },
        'timer': { active: 'bg-emerald-600 text-white border-emerald-600 shadow-lg', hover: 'hover:border-emerald-400' },
        'schedule': { active: 'bg-cyan-600 text-white border-cyan-600 shadow-lg', hover: 'hover:border-cyan-400' }
    };

    pages.forEach(p => {
        const btn = document.getElementById(`btn-nav-${p}`);
        if (btn) {
            const baseClass = "w-full border-2 px-4 py-3 rounded-2xl font-black text-xs transition-all duration-300 hover:translate-x-1.5 hover:shadow-md active:scale-98 flex items-center gap-3";
            if (p === pageId) {
                btn.className = `${baseClass} ${buttons[p].active}`;
            } else {
                btn.className = `${baseClass} bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 ${buttons[p].hover}`;
            }
        }
    });

    const contentPanel = document.getElementById('main-content-panel');
    if (contentPanel) {
        contentPanel.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Handle chart resizing or rendering when visible
    if (pageId === 'dashboard') {
        setTimeout(() => {
            if (window.mainChartPrograms) window.mainChartPrograms.resize();
            if (window.monthlyChartActions) window.monthlyChartActions.resize();
            if (window.yearlyChartActions) window.yearlyChartActions.resize();
        }, 50);
    } else if (pageId === 'subjects') {
        setTimeout(() => {
            if (progressChart) progressChart.resize();
        }, 50);
    } else if (pageId === 'outcome') {
        setTimeout(() => {
            if (window.resultsTrendChartInstance) window.resultsTrendChartInstance.resize();
        }, 50);
    } else if (pageId === 'schedule') {
        window.renderSchedulePage();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (isAppInitialized) return;
    window.isAppInitialized = true;

    // Offline-first Audit & Console Diagnostics
    (async () => {
        console.log("=== PROJECT X OFFLINE-FIRST DIAGNOSTICS ===");

        // 1. Service Worker status
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length > 0) {
                console.log(`[Diagnostic] Service Worker: Active (Scope: ${registrations[0].scope})`);
            } else {
                console.warn("[Diagnostic] Service Worker: Registered but not active or missing.");
            }
        } else {
            console.error("[Diagnostic] Service Worker: Not supported by browser.");
        }

        // 2. IndexedDB status
        if (window.localDB) {
            try {
                const isOpen = window.localDB.isOpen();
                console.log(`[Diagnostic] IndexedDB: ${isOpen ? 'Connected (Open)' : 'Disconnected (Closed)'}`);
                const taskCount = await window.localDB.tasks.count();
                const queueCount = await window.localDB.syncQueue.count();
                console.log(`[Diagnostic] IndexedDB Records: Tasks: ${taskCount}, Pending Sync Queue: ${queueCount}`);
            } catch (idbErr) {
                console.error("[Diagnostic] IndexedDB Error:", idbErr);
            }
        } else {
            console.error("[Diagnostic] IndexedDB: window.localDB is undefined.");
        }

        // 3. Firestore cache status
        if (typeof db !== 'undefined' && db) {
            console.log("[Diagnostic] Firestore: Cache persistence enabled (synchronizeTabs: true)");
        } else {
            console.warn("[Diagnostic] Firestore: DB reference not initialized yet.");
        }

        // 4. Sync status
        const isOnline = navigator.onLine;
        console.log(`[Diagnostic] Network Status: ${isOnline ? 'Online' : 'Offline'}`);
        if (window.syncManager) {
            console.log(`[Diagnostic] Sync Manager Status: ${window.syncManager.isProcessing ? 'Processing' : 'Idle'}`);
        }
        console.log("==========================================");
    })();

    window.updateConnectionStatus = function () {
        const el = document.getElementById('connection-status');
        const dot = document.getElementById('connection-dot');
        const text = document.getElementById('connection-text');
        const mobDot = document.getElementById('mobile-connection-dot');

        const isOnline = navigator.onLine;
        if (isOnline) {
            if (el) el.className = "flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg border border-emerald-500/20 dark:border-emerald-500/30 transition-all duration-300";
            if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
            if (text) {
                text.className = "text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-450";
                text.textContent = "Online";
            }
            if (mobDot) {
                mobDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
                mobDot.title = "Online";
            }
        } else {
            if (el) el.className = "flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg border border-amber-500/20 dark:border-amber-500/30 transition-all duration-300";
            if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-amber-500";
            if (text) {
                text.className = "text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-450";
                text.textContent = "Offline";
            }
            if (mobDot) {
                mobDot.className = "w-1.5 h-1.5 rounded-full bg-amber-500";
                mobDot.title = "Offline";
            }
        }
    };

    window.addEventListener('online', window.updateConnectionStatus);
    window.addEventListener('offline', window.updateConnectionStatus);
    window.updateConnectionStatus();

    // Fetch config and initialize Firebase
    let config;
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error("API config endpoint not available");
        config = await res.json();
        localStorage.setItem('firebaseConfig', JSON.stringify(config));
    } catch (err) {
        console.warn("API config failed, trying static .env fallback...", err);
        try {
            const res = await fetch('/.env');
            if (!res.ok) throw new Error(".env file not available");
            const envText = await res.text();
            const env = {};
            envText.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const parts = trimmed.split('=');
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim();
                    env[key] = val;
                }
            });

            config = {
                apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
            };

            if (!config.apiKey) throw new Error("No API key found in .env");
            console.log("Loaded Firebase config from static .env fallback successfully!");
            localStorage.setItem('firebaseConfig', JSON.stringify(config));
        } catch (fallbackErr) {
            console.warn("Network config fetch failed, checking localStorage fallback...", fallbackErr);
            const cachedConfig = localStorage.getItem('firebaseConfig');
            if (cachedConfig) {
                config = JSON.parse(cachedConfig);
                console.log("Loaded Firebase config from localStorage cache for offline boot.");
            } else {
                console.warn("Failed to load Firebase configuration, using offline placeholder config.");
                config = {
                    apiKey: "mock-api-key",
                    authDomain: "mock-project.firebaseapp.com",
                    projectId: "mock-project",
                    storageBucket: "mock-project.appspot.com",
                    messagingSenderId: "1234567890",
                    appId: "1:1234567890:web:mockapp"
                };
            }
        }
    }

    try {
        firebase.initializeApp(config);
        window.db = firebase.firestore();
        console.log("Firebase Connected");

        db.enablePersistence({ synchronizeTabs: true })
            .then(() => console.log("Firestore offline persistence enabled."))
            .catch((err) => {
                console.warn("Firestore persistence failed:", err.code);
            });
    } catch (e) {
        console.error("Firebase init error:", e);
    }

    // Route guard
    firebase.auth().onAuthStateChanged(async (user) => {
        let currentUser = user;
        const isLocal = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.startsWith('192.168.') ||
            window.location.hostname.startsWith('10.') ||
            window.location.hostname.startsWith('172.');
        const isOffline = !navigator.onLine;
        if (!currentUser && (isLocal || isOffline)) {
            currentUser = {
                email: 'ris2k29@gmail.com',
                displayName: isOffline ? 'Offline Admin' : 'Local Admin',
                uid: isOffline ? 'offline-admin-uid' : 'local-admin-uid'
            };
        }
        if (!currentUser) {
            window.location.href = '/login.html';
            return;
        }

        if (currentUser.email !== 'ris2k29@gmail.com') {
            firebase.auth().signOut().then(() => {
                window.location.href = '/login.html?error=denied';
            });
            return;
        }

        // Authorized
        console.log("Admin authorized:", currentUser.email);
        window.currentUser = currentUser;

        // Update profile section with local settings override if available
        const localName = localStorage.getItem('studyPlan_profileName');
        const localEmail = localStorage.getItem('studyPlan_profileEmail');
        const displayName = localName || currentUser.displayName || 'ris2k29';
        const displayEmail = localEmail || currentUser.email;

        const profileNameEl = document.getElementById('profile-name');
        const profileEmailEl = document.getElementById('profile-email');
        const profileAvatarEl = document.getElementById('profile-avatar');
        if (profileNameEl) {
            profileNameEl.textContent = displayName;
        }
        if (profileEmailEl) {
            profileEmailEl.textContent = displayEmail;
        }
        if (profileAvatarEl) {
            const initial = displayName.charAt(0).toUpperCase();
            profileAvatarEl.textContent = initial;
        }

        // Offline-first startup sequence
        try {
            window.syncLogger.log('STARTUP', 'Booting offline-first: loading local Dexie DB...');
            let hasDexieData = false;
            if (window.localDB) {
                const tasksCount = await window.localDB.tasks.count();
                if (tasksCount > 0) {
                    hasDexieData = true;
                    // Migrate records in IndexedDB if they are missing fields
                    const tables = ['tasks', 'timerLogs', 'scheduleBlocks', 'scheduleBlocks2', 'scheduleGroups'];
                    const keyFields = {
                        tasks: 'id',
                        timerLogs: 'id',
                        scheduleBlocks: 'id',
                        scheduleBlocks2: 'id',
                        scheduleGroups: 'id'
                    };
                    for (const table of tables) {
                        const records = await window.localDB[table].toArray();
                        for (const r of records) {
                            const originalStr = JSON.stringify(r);
                            const migrated = window.migrateRecord(r, r[keyFields[table]], 'synced');
                            if (JSON.stringify(migrated) !== originalStr) {
                                await window.localDB[table].put(migrated);
                                window.syncLogger.log('MIGRATION', `Migrated record in ${table}, ID: ${migrated.id}`);
                            }
                        }
                    }

                    // Also check appSettings settings
                    const settings = await window.localDB.appSettings.toArray();
                    for (const s of settings) {
                        if (s.updatedAt === undefined || s.version === undefined || s.syncStatus === undefined) {
                            s.updatedAt = s.updatedAt || 1718880000000;
                            s.version = s.version || 1;
                            s.syncStatus = s.syncStatus || 'synced';
                            await window.localDB.appSettings.put(s);
                            window.syncLogger.log('MIGRATION', `Migrated appSetting: ${s.key}`);
                        }
                    }
                    
                    // Load to memory
                    if (window.syncManager && window.syncManager.loadDexieToMemoryState) {
                        await window.syncManager.loadDexieToMemoryState();
                    }
                }
            }

            if (!hasDexieData) {
                window.syncLogger.log('STARTUP', 'Dexie is empty. Falling back to localStorage...');
                let stored = localStorage.getItem('studyMasterBackup');
                if (!stored && isLocal) {
                    window.syncLogger.log('STARTUP', 'LocalStorage empty. Using mock placeholder data on localhost...');
                    const mockData = {
                        tracks: [
                            { id: "track-1", name: "Math 1st", priority: 1, order: 0 }
                        ],
                        customPrograms: {
                            "track-1": [
                                { id: "math-prog", name: "Math 1st Program", priority: 1, order: 0 }
                            ]
                        },
                        customSyllabus: {
                            "track-1": [
                                { subject: "Math 1st Global Baseline", program: "Math 1st Program", chapters: 10, priority: 1, order: 0 }
                            ]
                        },
                        tasks: [
                            { id: 1, date: "Jun 13", day: "Sat", type: "study", studyDay: 1, "track-1Study": false, "track-1Tasks": [{ subject: "Math 1st Global Baseline", chapter: "Ch. 1", title: "Topic 1", completed: false, id: "track-1-1" }] }
                        ],
                        paceGoals: [
                            { id: "math-baseline", target: "Math 1st Global Baseline", type: "subject", startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() }
                        ],
                        weeklyTargetsDatabase: {
                            "Migration Week": [
                                { track: "track-1", program: "Math 1st Program", subject: "Math 1st Global Baseline", chapter: "Ch. 1", completed: false }
                            ]
                        }
                    };
                    stored = JSON.stringify(mockData);
                    localStorage.setItem('studyMasterBackup', stored);
                }

                if (stored) {
                    const data = window.sanitizeAllData(JSON.parse(stored));
                    if (data.tasks) {
                        window.tasks = data.tasks;
                        tasks = data.tasks;
                        if (data.tracks) window.tracks = data.tracks;
                        if (data.customPrograms) window.customPrograms = data.customPrograms;
                        if (data.customActions) window.customActions = data.customActions;
                        if (data.paceGoals) window.paceGoals = data.paceGoals;
                        if (data.passedItems) window.passedItems = data.passedItems;
                        if (data.revisionData) window.revisionData = data.revisionData;
                        if (data.subjectTimeLinks) window.subjectTimeLinks = data.subjectTimeLinks;
                        if (data.successResults) window.successResults = data.successResults;
                        if (data.scheduleBlocks) window.scheduleBlocks = data.scheduleBlocks;
                        if (data.scheduleBlocks2) window.scheduleBlocks2 = data.scheduleBlocks2;
                        if (data.scheduleGroups) window.scheduleGroups = data.scheduleGroups;
                        if (data.weeklyTargetsDatabase) window.weeklyTargetsDatabase = data.weeklyTargetsDatabase;
                        if (data.programVisibility) window.programVisibility = data.programVisibility;
                        if (data.timerLogs) window.timerLogs = data.timerLogs;
                        if (data.activeTimerState) window.activeTimerState = data.activeTimerState;
                        if (data.dashboardConfig) {
                            window.dashboardConfig = data.dashboardConfig;
                            if (window.dashboardConfig.trendStartDate) {
                                const trendStart = parseDateSafe(window.dashboardConfig.trendStartDate);
                                if (!isNaN(trendStart.getTime())) {
                                    trendStart.setHours(0, 0, 0, 0);
                                    window.PLAN_START_DATE = trendStart;
                                }
                            }
                        }
                        if (data.customSyllabus) {
                            syllabusStructure = data.customSyllabus;
                            recalculateTotals();
                        }
                    }

                    if (window.saveCurrentStateToIndexedDB) {
                        await window.saveCurrentStateToIndexedDB();
                    }
                }
            }
        } catch (e) {
            window.syncLogger.log('STARTUP', 'Error during local boot sequence:', e);
        }

        window.migrateLegacyData();
        window.sortAllCustomData();

        // Reveal app UI
        const loadingEl = document.getElementById('auth-loading');
        const wrapperEl = document.getElementById('app-wrapper');
        if (loadingEl) loadingEl.classList.add('hidden');
        if (wrapperEl) wrapperEl.classList.remove('hidden');

        renderUI();
        loadFromCloud();
        if (window.syncManager) window.syncManager.processQueue();
        window.switchPage('dashboard');
    });
});

// ==========================================
// --- Timer & Stopwatch Real-time Logic ---
// ==========================================

