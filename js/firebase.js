/**
 * Project X Firebase & Data Layer Module
 * Established in window.FirebaseService namespace.
 */

// Private internal helper function to update DOM sync status indicator
function showSync(state) {
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
}

window.FirebaseService = {
    // 1. Fetch Firebase Configuration from API, fallback to .env or cached settings
    fetchConfig: async function() {
        if (window.location.protocol === 'file:') {
            console.log("file:// protocol detected in fetchConfig. Using offline fallback config.");
            return {
                apiKey: "AIzaSyDfYjJ7CKqXb4CsQc65CSL205bxQG6cj0E",
                authDomain: "project-x-787898.firebaseapp.com",
                projectId: "project-x-787898",
                storageBucket: "project-x-787898.firebasestorage.app",
                messagingSenderId: "1011303841705",
                appId: "1:1011303841705:web:4bc5a13023b5a1cd1e8eb8"
            };
        }

        let config;
        try {
            const clientSendTime = Date.now();
            const res = await fetch('/api/config');
            const clientRecvTime = Date.now();
            if (!res.ok) throw new Error("API config endpoint not available");
            config = await res.json();

            // Validate that the config contains the required apiKey
            if (!config || !config.apiKey) {
                throw new Error("Invalid or empty configuration from API config endpoint");
            }
            
            const serverDateStr = res.headers.get('Date');
            if (serverDateStr) {
                const serverTime = new Date(serverDateStr).getTime();
                const latency = (clientRecvTime - clientSendTime) / 2;
                window.serverTimeOffset = serverTime - (clientSendTime + latency);
                console.log("Estimated server clock offset (ms):", window.serverTimeOffset);
            }
            
            safeStorage.setItem('firebaseConfig', JSON.stringify(config));
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
                safeStorage.setItem('firebaseConfig', JSON.stringify(config));
            } catch (fallbackErr) {
                console.warn("Network config fetch failed, checking localStorage fallback...", fallbackErr);
                const cachedConfig = safeStorage.getItem('firebaseConfig');
                if (cachedConfig) {
                    config = JSON.parse(cachedConfig);
                    console.log("Loaded Firebase config from localStorage cache for offline boot.");
                } else {
                    console.warn("Failed to load Firebase configuration, using offline fallback config.");
                    config = {
                        apiKey: "AIzaSyDfYjJ7CKqXb4CsQc65CSL205bxQG6cj0E",
                        authDomain: "project-x-787898.firebaseapp.com",
                        projectId: "project-x-787898",
                        storageBucket: "project-x-787898.firebasestorage.app",
                        messagingSenderId: "1011303841705",
                        appId: "1:1011303841705:web:4bc5a13023b5a1cd1e8eb8"
                    };
                }
            }
        }
        return config;
    },

    // 2. Initialize Firebase Client App and Firestore reference
    init: function(config) {
        if (window.location.protocol === 'file:') {
            AppState.db = null;
            console.log("Firebase initialized in mock mode for file:// protocol.");
            return;
        }
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(config);
            if (typeof firebase.firestore === 'function') {
                AppState.db = firebase.firestore();
            }
            console.log("Firebase initialized successfully.");
        }
    },

    // 3. Authenticate with Email / Password under Local Persistence
    login: async function(email, password) {
        if (window.location.protocol === 'file:') {
            console.log("Firebase login mocked under file:// protocol.");
            return { user: { email: 'ris2k29@gmail.com', uid: 'mock-local-user-id' } };
        }
        if (typeof firebase !== 'undefined' && firebase.auth) {
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            return firebase.auth().signInWithEmailAndPassword(email, password);
        }
        throw new Error("Firebase SDK not loaded.");
    },

    // 4. Log out the current session
    logout: async function() {
        if (window.location.protocol === 'file:') {
            console.log("Firebase logout mocked under file:// protocol.");
            return;
        }
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return firebase.auth().signOut();
        }
        throw new Error("Firebase SDK not loaded.");
    },

    // 5. Expose current authenticated user reference
    getCurrentUser: function() {
        if (window.location.protocol === 'file:') {
            return { email: 'ris2k29@gmail.com', uid: 'mock-local-user-id', displayName: 'ris2k29 (Local)' };
        }
        return (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    },

    // 6. Auth State Changes Listener
    onAuthStateChanged: function(callback) {
        if (window.location.protocol === 'file:') {
            console.log("file:// protocol detected in onAuthStateChanged. Emitting mock user.");
            setTimeout(() => {
                callback({
                    email: 'ris2k29@gmail.com',
                    uid: 'mock-local-user-id',
                    displayName: 'ris2k29 (Local)'
                });
            }, 100);
            return () => {};
        }
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return firebase.auth().onAuthStateChanged(callback);
        }
    },

    // 7. Register Firestore Real-time Snapshot Listener
    startSnapshotListener: function(uid, onData, onError) {
        if (AppState.db) {
            return AppState.db.collection('userData').doc(uid).onSnapshot(onData, onError);
        }
    },

    // 8. Push Local Workspace to Firestore Cloud Database
    saveToCloud: async function(immediate = false) {
        const executeSave = () => {
            if (!AppState.db) return;
            const fbUser = window.FirebaseService.getCurrentUser();
            if (!fbUser) return;

            const payload = {
                tasks: AppState.tasks,
                tracks: window.tracks,
                customSyllabus: window.syllabusStructure,
                customPrograms: window.customPrograms,
                customActions: window.customActions,
                paceGoals: window.paceGoals,
                passedItems: window.passedItems,
                revisionData: window.revisionData,
                programVisibility: window.programVisibility || {},
                subjectTimeLinks: window.subjectTimeLinks,
                successResults: window.successResults,
                timerLogs: window.timerLogs || [],
                dailyFocusHoursTarget: window.dailyFocusHoursTarget || 4.0,
                dailyFocusHoursTargetDate: window.dailyFocusHoursTargetDate || "",
                dailyFocusHoursTargetHistory: window.dailyFocusHoursTargetHistory || [],
                subjectFocusTargets: window.subjectFocusTargets || {},
                dashboardConfig: window.dashboardConfig,
                weeklyTargetsDatabase: window.weeklyTargetsDatabase || {},
                dailyTargetsDatabase: window.dailyTargetsDatabase || {},
                scheduleBlocks: window.scheduleBlocks || [],
                scheduleBlocks2: window.scheduleBlocks2 || [],
                scheduleGroups: window.scheduleGroups || [],
                fiscalLedger: AppState.fiscalLedger || { transactions: [], budgets: [], vaults: [] }
            };
            window.appState = payload;

            window.isSyncing = true;
            showSync('saving');
            const uid = fbUser.uid;

            const sanitized = window.sanitizeAllData ? window.sanitizeAllData(payload) : payload;
            AppState.db.collection('userData').doc(uid).set(sanitized, { merge: true })
                .then(() => {
                    showSync('saved');
                })
                .catch((error) => {
                    console.error('Firestore save failed:', error);
                    showSync('error');
                })
                .finally(() => {
                    setTimeout(() => { window.isSyncing = false; }, 300);
                });
        };

        if (immediate) {
            if (window.saveTimeout) clearTimeout(window.saveTimeout);
            executeSave();
        } else {
            if (window.saveTimeout) clearTimeout(window.saveTimeout);
            window.saveTimeout = setTimeout(executeSave, 800);
        }
    },

    saveTimerToCloud: async function() {
        if (window.TimerService && typeof window.TimerService.saveActiveStateToStore === 'function') {
            window.TimerService.saveActiveStateToStore();
        }
        if (!AppState.db) return;
        const fbUser = window.FirebaseService.getCurrentUser();
        if (!fbUser) return;

        window.isSyncing = true;
        const uid = fbUser.uid;
        const timerPayload = {
            activeTimerState: window.activeTimerState || {
                isRunning: false,
                mode: 'stopwatch',
                startTime: null,
                elapsedBeforeStart: 0,
                targetDuration: 0,
                selectedSubject: 'General Study'
            }
        };


        const sanitizedTimer = window.sanitizeAllData ? window.sanitizeAllData(timerPayload) : timerPayload;
        return AppState.db.collection('userData').doc(uid).set(sanitizedTimer, { merge: true })
            .then(() => {
                console.log("Firestore timer state updated successfully.");
            })
            .catch((error) => {
                console.error("Firestore timer state update failed:", error);
            })
            .finally(() => {
                setTimeout(() => { window.isSyncing = false; }, 300);
            });
    },

    // 9. Load workspace from Cloud Snapshot Listener
    loadFromCloud: function() {
        if (!AppState.db) return;

        const fbUser = window.FirebaseService.getCurrentUser();
        if (!fbUser) {
            console.log("loadFromCloud: Cloud sync unavailable (Unauthenticated).");
            if (AppState.isInitialLoad) { renderUI(); AppState.isInitialLoad = false; }
            return;
        }

        const uid = fbUser.uid;
        window.FirebaseService.startSnapshotListener(uid, (docSnap) => {
            if (window.isSyncing) {
                return; // Prevent local save from triggering loop
            }

            if (docSnap.exists) {
                const data = window.sanitizeAllData(docSnap.data());
                
                // Direct in-memory load
                if (data.tasks) { AppState.tasks = data.tasks; window.tasks = data.tasks; }
                if (data.tracks) window.tracks = data.tracks;
                if (data.customSyllabus) window.syllabusStructure = data.customSyllabus;
                if (data.customPrograms) window.customPrograms = data.customPrograms;
                if (data.customActions) window.customActions = data.customActions;
                if (data.paceGoals) window.paceGoals = data.paceGoals;
                if (data.passedItems) window.passedItems = data.passedItems;
                if (data.revisionData) window.revisionData = data.revisionData;
                if (data.programVisibility) window.programVisibility = data.programVisibility;
                if (data.subjectTimeLinks) window.subjectTimeLinks = data.subjectTimeLinks;
                if (data.successResults) window.successResults = data.successResults;
                if (data.timerLogs) window.timerLogs = data.timerLogs;
                if (data.dailyFocusHoursTarget !== undefined) window.dailyFocusHoursTarget = data.dailyFocusHoursTarget;
                if (data.dailyFocusHoursTargetDate !== undefined) window.dailyFocusHoursTargetDate = data.dailyFocusHoursTargetDate;
                if (data.dailyFocusHoursTargetHistory !== undefined) window.dailyFocusHoursTargetHistory = data.dailyFocusHoursTargetHistory;
                if (data.subjectFocusTargets) window.subjectFocusTargets = data.subjectFocusTargets;
                if (data.activeTimerState) window.activeTimerState = data.activeTimerState;
                if (data.dashboardConfig) window.dashboardConfig = data.dashboardConfig;
                if (data.weeklyTargetsDatabase) window.weeklyTargetsDatabase = data.weeklyTargetsDatabase;
                if (data.dailyTargetsDatabase) window.dailyTargetsDatabase = data.dailyTargetsDatabase;
                if (data.scheduleBlocks) window.scheduleBlocks = data.scheduleBlocks;
                if (data.scheduleBlocks2) window.scheduleBlocks2 = data.scheduleBlocks2;
                if (data.scheduleGroups) window.scheduleGroups = data.scheduleGroups;
                if (data.fiscalLedger) AppState.fiscalLedger = data.fiscalLedger;

                window.ensureConfigDefaults();
                window.migrateLegacyData();
                window.sortAllCustomData();
                recalculateTotals();

                if (AppState.isInitialLoad) {
                    if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
                    const loadingEl = document.getElementById('auth-loading');
                    const wrapperEl = document.getElementById('app-wrapper');
                    if (loadingEl) {
                        loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                        setTimeout(() => { loadingEl.remove(); }, 600);
                    }
                    if (wrapperEl) wrapperEl.classList.remove('hidden');

                    renderUI();
                    AppState.isInitialLoad = false;
                } else {
                    requestAnimationFrame(() => {
                        const scrollPos = window.scrollY; // Preserve scroll position
                        renderUI();
                        window.scrollTo(0, scrollPos); // Seamlessly restore scroll
                        showSync('saved');
                    });
                }
            } else {
                console.log('loadFromCloud: Remote document empty.');
                if (AppState.isInitialLoad) {
                    if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
                    const loadingEl = document.getElementById('auth-loading');
                    const wrapperEl = document.getElementById('app-wrapper');
                    if (loadingEl) {
                        loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                        setTimeout(() => { loadingEl.remove(); }, 600);
                    }
                    if (wrapperEl) wrapperEl.classList.remove('hidden');

                    renderUI();
                    AppState.isInitialLoad = false;
                }
            }
        }, (error) => {
            console.error("Sync Error in snapshot:", error);
            if (AppState.isInitialLoad) {
                if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
                const loadingEl = document.getElementById('auth-loading');
                const wrapperEl = document.getElementById('app-wrapper');
                if (loadingEl) {
                    loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                    setTimeout(() => { loadingEl.remove(); }, 600);
                }
                if (wrapperEl) wrapperEl.classList.remove('hidden');

                renderUI();
                AppState.isInitialLoad = false;
            }
        });
    }
};

// Global compatibility aliases
window.saveToCloud = window.FirebaseService.saveToCloud;
window.loadFromCloud = window.FirebaseService.loadFromCloud;
window.saveTimerToCloud = window.FirebaseService.saveTimerToCloud;
window.showSync = showSync;
