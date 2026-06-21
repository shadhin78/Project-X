// js/firebase.js
// Verbatim extraction of Firebase database and auth functions from index.html

function initializeFirebase() {
    // Deprecated. Initialization is now handled asynchronously in DOMContentLoaded.
}
window.initializeFirebase = initializeFirebase;

window.handleLogout = function () {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        }).catch(err => {
            console.error("Logout error:", err);
            window.location.href = 'login.html';
        });
    } else {
        window.location.href = 'login.html';
    }
};

function loadFromCloud() {
    if (!db) return;

    const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!fbUser) {
        console.log("loadFromCloud: Cloud sync unavailable (Unauthenticated).");
        if (isInitialLoad) { renderUI(); isInitialLoad = false; }
        return;
    }

    const uid = fbUser.uid;
    db.collection('userData').doc(uid).onSnapshot((docSnap) => {
        if (window.isSyncing) {
            return; // Prevent local save from triggering loop
        }

        if (docSnap.exists) {
            const data = window.sanitizeAllData(docSnap.data());
            
            // Direct in-memory load
            if (data.tasks) { tasks = data.tasks; window.tasks = data.tasks; }
            if (data.tracks) window.tracks = data.tracks;
            if (data.customSyllabus) syllabusStructure = data.customSyllabus;
            if (data.customPrograms) window.customPrograms = data.customPrograms;
            if (data.customActions) window.customActions = data.customActions;
            if (data.paceGoals) window.paceGoals = data.paceGoals;
            if (data.passedItems) window.passedItems = data.passedItems;
            if (data.revisionData) window.revisionData = data.revisionData;
            if (data.programVisibility) window.programVisibility = data.programVisibility;
            if (data.subjectTimeLinks) window.subjectTimeLinks = data.subjectTimeLinks;
            if (data.successResults) window.successResults = data.successResults;
            if (data.timerLogs) window.timerLogs = data.timerLogs;
            if (data.activeTimerState) window.activeTimerState = data.activeTimerState;
            if (data.dashboardConfig) window.dashboardConfig = data.dashboardConfig;
            if (data.weeklyTargetsDatabase) window.weeklyTargetsDatabase = data.weeklyTargetsDatabase;
            if (data.dailyTargetsDatabase) window.dailyTargetsDatabase = data.dailyTargetsDatabase;
            if (data.scheduleBlocks) window.scheduleBlocks = data.scheduleBlocks;
            if (data.scheduleBlocks2) window.scheduleBlocks2 = data.scheduleBlocks2;
            if (data.scheduleGroups) window.scheduleGroups = data.scheduleGroups;

            window.ensureConfigDefaults();
            window.migrateLegacyData();
            window.sortAllCustomData();
            recalculateTotals();

            if (isInitialLoad) {
                // Reveal app UI
                if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
                const loadingEl = document.getElementById('auth-loading');
                const wrapperEl = document.getElementById('app-wrapper');
                if (loadingEl) {
                    loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                    setTimeout(() => { loadingEl.remove(); }, 600);
                }
                if (wrapperEl) wrapperEl.classList.remove('hidden');

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
        } else {
            console.log('loadFromCloud: Remote document empty.');
            if (isInitialLoad) {
                // Reveal app UI even if document is empty
                if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
                const loadingEl = document.getElementById('auth-loading');
                const wrapperEl = document.getElementById('app-wrapper');
                if (loadingEl) {
                    loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                    setTimeout(() => { loadingEl.remove(); }, 600);
                }
                if (wrapperEl) wrapperEl.classList.remove('hidden');

                renderUI();
                isInitialLoad = false;
            }
        }
    }, (error) => {
        console.error("Sync Error in snapshot:", error);
        if (isInitialLoad) {
            if (window.setLoadingProgress) window.setLoadingProgress(100, 'Workspace ready!');
            const loadingEl = document.getElementById('auth-loading');
            const wrapperEl = document.getElementById('app-wrapper');
            if (loadingEl) {
                loadingEl.classList.add('transition-all', 'duration-500', 'opacity-0', 'pointer-events-none');
                setTimeout(() => { loadingEl.remove(); }, 600);
            }
            if (wrapperEl) wrapperEl.classList.remove('hidden');

            renderUI();
            isInitialLoad = false;
        }
    });
}
window.loadFromCloud = loadFromCloud;

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
window.showSync = showSync;

async function saveToCloud(immediate = false) {
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
        dailyTargetsDatabase: window.dailyTargetsDatabase || {},
        scheduleBlocks: window.scheduleBlocks || [],
        scheduleBlocks2: window.scheduleBlocks2 || [],
        scheduleGroups: window.scheduleGroups || []
    };
    window.appState = payload;

    const executeSave = () => {
        if (!db) return;
        const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
        if (!fbUser) return;

        window.isSyncing = true;
        showSync('saving');
        const uid = fbUser.uid;
        db.collection('userData').doc(uid).set(payload)
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
}
window.saveToCloud = saveToCloud;
