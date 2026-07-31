/**
 * Project X Supabase Connection & Service Module
 * Established in window.SupabaseService namespace.
 * Manages Supabase Client, Authentication, and Workspace Persistence.
 */

window.dataHydrationComplete = false;

function normalizeSupabaseUser(user) {
    if (!user) return null;
    const email = user.email || '';
    const nameFromMeta = user.user_metadata ? (user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name) : null;
    const displayName = nameFromMeta || (email ? email.split('@')[0] : 'ris2k29');
    return {
        ...user,
        uid: user.id || user.uid || 'mock-local-user-id',
        id: user.id || user.uid || 'mock-local-user-id',
        email: email,
        displayName: displayName
    };
}

window.SupabaseService = {
    client: null,
    _currentUser: null,
    _authListeners: [],

    // 1. Fetch Supabase configuration keys from API or fallbacks
    fetchConfig: async function() {
        if (window.location.protocol === 'file:') {
            console.log("file:// protocol detected in SupabaseService.fetchConfig. Checking local cache...");
            const cachedConfig = safeStorage.getItem('supabaseConfig');
            if (cachedConfig) {
                try {
                    return JSON.parse(cachedConfig);
                } catch (e) {}
            }
            return { supabaseUrl: "", supabasePublishableKey: "" };
        }

        let config = {};
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error("API config endpoint not available");
            const data = await res.json();
            
            config = {
                supabaseUrl: data.supabaseUrl || data.NEXT_PUBLIC_SUPABASE_URL || "",
                supabasePublishableKey: data.supabasePublishableKey || data.SUPABASE_PUBLISHABLE_KEY || data.NEXT_PUBLIC_SUPABASE_ANON_KEY || data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
            };

            if (config.supabaseUrl && config.supabasePublishableKey) {
                safeStorage.setItem('supabaseConfig', JSON.stringify(config));
            }
        } catch (err) {
            console.warn("Supabase config fetch failed, checking localStorage fallback...", err);
            const cachedConfig = safeStorage.getItem('supabaseConfig');
            if (cachedConfig) {
                try {
                    config = JSON.parse(cachedConfig);
                } catch(e) {}
            }
        }
        return config;
    },

    // 2. Initialize Supabase Client
    init: function(config) {
        if (this.client) {
            return this.client;
        }

        const supabaseUrl = (config && config.supabaseUrl) ? config.supabaseUrl : "";
        const supabaseKey = (config && (config.supabasePublishableKey || config.supabaseAnonKey)) ? (config.supabasePublishableKey || config.supabaseAnonKey) : "";

        if (!supabaseUrl || !supabaseKey) {
            console.warn("Supabase credentials missing or not yet loaded in config.");
            return null;
        }

        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            console.warn("Supabase JS SDK (@supabase/supabase-js) is not loaded in window.");
            return null;
        }

        try {
            this.client = window.supabase.createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
            window.supabaseClient = this.client;
            if (window.AppState) {
                window.AppState.supabase = this.client;
            }

            // Bind auth state change listener to sync current user state & realtime channels
            this.client.auth.onAuthStateChange((event, session) => {
                const user = session ? normalizeSupabaseUser(session.user) : null;
                this._currentUser = user;
                this._notifyAuthListeners(user, event, session);
                if (user) {
                    this.subscribeToRealtime();
                } else {
                    this.unsubscribeFromRealtime();
                }
            });

            this._setupAutoSyncListeners();

            console.log("Supabase client initialized successfully with Auth persistence & Realtime sync.");
            return this.client;
        } catch (err) {
            console.error("Failed to initialize Supabase client:", err);
            this.client = null;
            return null;
        }
    },

    // 3. Helper methods for status & client access
    getClient: function() {
        return this.client;
    },

    isInitialized: function() {
        return !!this.client;
    },

    // 4. Supabase Authentication: Login
    login: async function(email, password) {
        const cleanEmail = (email || '').trim().toLowerCase();

        // Local development / file:// protocol fallback ONLY
        if (window.location.protocol === 'file:') {
            console.log("Supabase login mocked under file:// protocol.");
            if (cleanEmail === 'ris2k29@gmail.com' && password === '787898') {
                const localUser = normalizeSupabaseUser({
                    id: 'mock-local-user-id',
                    email: 'ris2k29@gmail.com',
                    user_metadata: { display_name: 'ris2k29 (Local)' }
                });
                safeStorage.setItem('local_auth_user', JSON.stringify(localUser));
                this._currentUser = localUser;
                this._notifyAuthListeners(localUser, 'SIGNED_IN', null);
                return { user: localUser };
            }
            throw { code: 'auth/wrong-password', message: 'Invalid email or password.' };
        }

        if (!this.client) {
            const cachedConfig = safeStorage.getItem('supabaseConfig');
            if (cachedConfig) {
                try {
                    this.init(JSON.parse(cachedConfig));
                } catch(e) {}
            }
        }

        if (!this.client) {
            throw { code: 'auth/service-unavailable', message: 'Supabase client is not initialized.' };
        }

        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email: cleanEmail,
                password: password
            });

            if (error) {
                console.warn("Supabase Auth sign-in error:", error);
                const msg = (error.message || '').toLowerCase();
                if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || error.status === 400) {
                    throw { code: 'auth/wrong-password', message: 'Invalid email or password.' };
                } else if (msg.includes('invalid email') || msg.includes('email format')) {
                    throw { code: 'auth/invalid-email', message: 'Invalid email address format.' };
                } else if (msg.includes('disabled') || msg.includes('banned')) {
                    throw { code: 'auth/user-disabled', message: 'This user account has been disabled.' };
                }
                throw { code: 'auth/unknown', message: error.message || 'Authentication failed. Please check your credentials.' };
            }

            if (!data || !data.user) {
                throw { code: 'auth/user-not-found', message: 'Invalid email or password.' };
            }

            const user = normalizeSupabaseUser(data.user);

            // Admin email security check
            if (user.email !== 'ris2k29@gmail.com') {
                await this.client.auth.signOut();
                throw { code: 'auth/access-denied', message: 'Access denied. Project X is private.' };
            }

            safeStorage.removeItem('local_auth_user');
            this._currentUser = user;
            return { user: user, session: data.session };

        } catch (err) {
            if (err && err.code) throw err;
            throw { code: 'auth/unknown', message: (err && err.message) ? err.message : 'Authentication failed.' };
        }
    },

    // 5. Supabase Authentication: Logout
    logout: async function() {
        safeStorage.removeItem('local_auth_user');
        this._currentUser = null;

        if (window.location.protocol === 'file:') {
            console.log("Supabase logout mocked under file:// protocol.");
            this._notifyAuthListeners(null, 'SIGNED_OUT', null);
            return;
        }

        if (this.client) {
            try {
                await this.client.auth.signOut();
            } catch (e) {
                console.warn("Supabase signOut error:", e);
            }
        }
        this._notifyAuthListeners(null, 'SIGNED_OUT', null);
    },

    // 6. Get Current Authenticated User
    getCurrentUser: function() {
        if (window.location.protocol === 'file:') {
            const cached = safeStorage.getItem('local_auth_user');
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
            return { email: 'ris2k29@gmail.com', uid: 'mock-local-user-id', id: 'mock-local-user-id', displayName: 'ris2k29 (Local)' };
        }

        if (this._currentUser) {
            return this._currentUser;
        }

        if (this.client) {
            try {
                const session = this.client.auth.session ? this.client.auth.session() : null;
                if (session && session.user) {
                    this._currentUser = normalizeSupabaseUser(session.user);
                    return this._currentUser;
                }
            } catch(e) {}
        }

        const cached = safeStorage.getItem('local_auth_user');
        if (cached) {
            try { return JSON.parse(cached); } catch(e) {}
        }
        return null;
    },

    // 7. Auth State Listener
    onAuthStateChanged: function(callback) {
        if (!this._authListeners) this._authListeners = [];
        this._authListeners.push(callback);

        if (window.location.protocol === 'file:') {
            console.log("file:// protocol detected in Supabase onAuthStateChanged. Emitting mock user.");
            setTimeout(() => {
                const localUser = this.getCurrentUser();
                callback(localUser);
            }, 50);
            return () => {
                this._authListeners = this._authListeners.filter(cb => cb !== callback);
            };
        }

        if (this.client) {
            this.client.auth.getSession().then(({ data: { session } }) => {
                if (session && session.user) {
                    const user = normalizeSupabaseUser(session.user);
                    this._currentUser = user;
                    callback(user);
                } else {
                    callback(null);
                }
            }).catch(() => {
                callback(this.getCurrentUser());
            });
        } else {
            setTimeout(() => callback(this.getCurrentUser()), 50);
        }

        return () => {
            this._authListeners = this._authListeners.filter(cb => cb !== callback);
        };
    },

    // Internal helper to trigger listeners
    _notifyAuthListeners: function(user, event, session) {
        if (this._authListeners && this._authListeners.length > 0) {
            this._authListeners.forEach(cb => {
                try { cb(user, event, session); } catch(e) {}
            });
        }
    },

    // 8. Save Workspace State to Supabase (user_workspaces.state_data JSONB)
    saveToCloud: async function(immediate = false) {
        if (!window.dataHydrationComplete) {
            console.warn("saveToCloud blocked: Initial workspace hydration from cloud has not completed yet.");
            return;
        }

        const payload = {
            tasks: AppState.tasks || [],
            tracks: window.tracks || [],
            customSyllabus: window.syllabusStructure || {},
            customPrograms: window.customPrograms || {},
            customActions: window.customActions || [],
            paceGoals: window.paceGoals || [],
            passedItems: window.passedItems || { programs: [], subjects: [] },
            revisionData: window.revisionData || { active: [], progress: {} },
            programVisibility: window.programVisibility || {},
            subjectTimeLinks: window.subjectTimeLinks || {},
            successResults: window.successResults || [],
            timerLogs: window.timerLogs || [],
            dailyFocusHoursTarget: window.dailyFocusHoursTarget || 4.0,
            dailyFocusHoursTargetDate: window.dailyFocusHoursTargetDate || "",
            dailyFocusHoursTargetHistory: window.dailyFocusHoursTargetHistory || [],
            timerAnalyticsRange: window.timerAnalyticsRange || 180,
            timerAnalyticsGrouping: window.timerAnalyticsGrouping || 'daily',
            timerAnalyticsChartStyle: window.timerAnalyticsChartStyle || 'combo',
            subjectFocusTargets: window.subjectFocusTargets || {},
            dashboardConfig: window.dashboardConfig || {},
            weeklyTargetsDatabase: window.weeklyTargetsDatabase || {},
            dailyTargetsDatabase: window.dailyTargetsDatabase || {},
            scheduleBlocks: window.scheduleBlocks || [],
            scheduleBlocks2: window.scheduleBlocks2 || [],
            scheduleGroups: window.scheduleGroups || [],
            fiscalLedger: AppState.fiscalLedger || { transactions: [], budgets: [], vaults: [] },
            examSessions: AppState.examSessions || [],
            examRoutine: AppState.examRoutine || [],
            selectedCountdownExamId: AppState.selectedCountdownExamId || 'auto'
        };

        window.appState = payload;

        // Save locally to safeStorage cache
        try {
            safeStorage.setItem('cached_fullAppState', JSON.stringify(payload));
        } catch(e) {}

        const user = this.getCurrentUser();
        if (!user || !user.id || user.id === 'mock-local-user-id') {
            if (window.location.protocol === 'file:') {
                console.log("Local/file:// workspace state saved locally.");
            }
            return;
        }

        if (!this.client) {
            return;
        }

        if (typeof showSync === 'function') showSync('saving');

        try {
            const { error } = await this.client
                .from('user_workspaces')
                .upsert({
                    user_id: user.id,
                    state_data: payload,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.warn("Supabase user_workspaces upsert error:", error);
                if (typeof showSync === 'function') showSync('error');
            } else {
                this._lastLocalSaveTimestamp = Date.now();
                if (typeof showSync === 'function') showSync('saved');
            }
        } catch (err) {
            console.warn("Supabase saveToCloud exception:", err);
            if (typeof showSync === 'function') showSync('error');
        }
    },

    // 9. Load Workspace State from Supabase (user_workspaces.state_data)
    loadFromCloud: async function() {
        console.log("SupabaseService.loadFromCloud starting workspace hydration...");

        const completeHydration = () => {
            window.dataHydrationComplete = true;
            if (typeof window.ensureConfigDefaults === 'function') window.ensureConfigDefaults();
            if (typeof window.migrateLegacyData === 'function') window.migrateLegacyData();
            if (typeof window.sortAllCustomData === 'function') window.sortAllCustomData();
            if (typeof recalculateTotals === 'function') recalculateTotals();

            if (AppState.isInitialLoad) {
                if (typeof window.dismissLoadingScreen === 'function') window.dismissLoadingScreen();
                if (typeof renderUI === 'function') renderUI();
            } else {
                if (typeof renderUI === 'function') renderUI();
            }
        };

        const user = this.getCurrentUser();

        // Baseline local storage cache - Hydrate immediately for zero-delay instant render
        const localCachedStr = safeStorage.getItem('cached_fullAppState');
        let localData = null;
        if (localCachedStr) {
            try { 
                localData = JSON.parse(localCachedStr);
                window.applyFullAppState(localData, false);
                window.dataHydrationComplete = true;
            } catch(e) {}
        }

        if (window.location.protocol === 'file:' || !user || !user.id || user.id === 'mock-local-user-id' || !this.client) {
            completeHydration();
            return;
        }

        try {
            const { data, error } = await this.client
                .from('user_workspaces')
                .select('state_data, updated_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.warn("Supabase user_workspaces query error:", error);
                completeHydration();
                return;
            }

            if (data && data.state_data && typeof data.state_data === 'object' && Object.keys(data.state_data).length > 0) {
                const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
                // Only overwrite local state if remote data is at least as fresh as local save time
                if (!localData || !this._lastLocalSaveTimestamp || remoteTime >= (this._lastLocalSaveTimestamp - 2000)) {
                    console.log("Successfully restored workspace from Supabase user_workspaces.");
                    safeStorage.setItem('cached_fullAppState', JSON.stringify(data.state_data));
                    window.applyFullAppState(data.state_data, false);
                } else {
                    console.log("Local workspace is newer than remote. Syncing local workspace to cloud...");
                    this.saveToCloud(true);
                }
                completeHydration();
            } else {
                console.log("No prior cloud workspace row found in Supabase. Hydrating baseline workspace...");
                completeHydration();
                // Create initial cloud workspace row for newly authenticated user
                this.saveToCloud(true);
            }
        } catch (err) {
            console.warn("Supabase loadFromCloud exception:", err);
            completeHydration();
        }
    },

    // 10. Save Active Timer State
    saveTimerToCloud: async function() {
        if (window.TimerService && typeof window.TimerService.saveActiveStateToStore === 'function') {
            window.TimerService.saveActiveStateToStore();
        }
        return this.saveToCloud(true);
    },

    // 11. Wipe User Cloud Workspace
    wipeCloudWorkspace: async function() {
        const user = this.getCurrentUser();
        safeStorage.removeItem('cached_fullAppState');

        if (user && user.id && user.id !== 'mock-local-user-id' && this.client) {
            try {
                await this.client
                    .from('user_workspaces')
                    .delete()
                    .eq('user_id', user.id);
                console.log("User workspace row deleted from Supabase.");
            } catch (e) {
                console.warn("Error deleting workspace row from Supabase:", e);
            }
        }
        console.log("Memory and local workspace wiped to clean slate.");
    },

    // 12. Realtime Cross-Device Synchronization
    _realtimeChannel: null,
    _lastLocalSaveTimestamp: 0,
    _hasBoundAutoSync: false,

    subscribeToRealtime: function() {
        const user = this.getCurrentUser();
        if (!this.client || !user || !user.id || user.id === 'mock-local-user-id') return;

        if (this._realtimeChannel) {
            try { this.client.removeChannel(this._realtimeChannel); } catch(e) {}
        }

        try {
            const channelName = `realtime:user_workspaces:${user.id}`;
            this._realtimeChannel = this.client
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_workspaces',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log("Supabase Realtime change event received:", payload.eventType);
                        if (payload.new && payload.new.state_data && typeof payload.new.state_data === 'object') {
                            const remoteUpdatedAt = payload.new.updated_at ? new Date(payload.new.updated_at).getTime() : Date.now();
                            if (remoteUpdatedAt > (this._lastLocalSaveTimestamp + 1500)) {
                                console.log("Applying real-time workspace update from remote device...");
                                safeStorage.setItem('cached_fullAppState', JSON.stringify(payload.new.state_data));
                                window.applyFullAppState(payload.new.state_data, false);
                                if (typeof recalculateTotals === 'function') recalculateTotals();
                                if (typeof renderUI === 'function') renderUI();
                                if (typeof window.showSync === 'function') window.showSync('saved');
                                if (typeof showToast === 'function') showToast("Workspace updated in real-time from another device", "info");
                            }
                        }
                    }
                )
                .subscribe((status) => {
                    console.log("Supabase Realtime subscription status:", status);
                });
        } catch (err) {
            console.warn("Failed to subscribe to Supabase Realtime channel:", err);
        }
    },

    unsubscribeFromRealtime: function() {
        if (this._realtimeChannel && this.client) {
            try {
                this.client.removeChannel(this._realtimeChannel);
                this._realtimeChannel = null;
            } catch(e) {}
        }
    },

    _setupAutoSyncListeners: function() {
        if (this._hasBoundAutoSync) return;
        this._hasBoundAutoSync = true;

        let lastFocusCheck = 0;
        const checkCloudOnFocus = () => {
            const now = Date.now();
            if (now - lastFocusCheck > 3000) {
                lastFocusCheck = now;
                if (this.getCurrentUser() && window.dataHydrationComplete) {
                    console.log("Window focused / visible: checking remote workspace status...");
                    this.checkForRemoteUpdates();
                }
            }
        };

        window.addEventListener('focus', checkCloudOnFocus);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkCloudOnFocus();
            }
        });

        // 15-second background heartbeat check for seamless cross-device sync
        setInterval(() => {
            if (document.visibilityState === 'visible' && this.getCurrentUser() && window.dataHydrationComplete && !AppState.isSaving) {
                this.checkForRemoteUpdates();
            }
        }, 15000);
    },

    checkForRemoteUpdates: async function() {
        const user = this.getCurrentUser();
        if (!this.client || !user || !user.id || user.id === 'mock-local-user-id') return;

        try {
            const { data, error } = await this.client
                .from('user_workspaces')
                .select('updated_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!error && data && data.updated_at) {
                const remoteTime = new Date(data.updated_at).getTime();
                if (remoteTime > (this._lastLocalSaveTimestamp + 2000)) {
                    console.log("Newer remote workspace detected. Reloading from cloud...");
                    this.loadFromCloud();
                }
            }
        } catch(e) {}
    }
};

// Global status badge updater UI function
window.showSync = function(state) {
    const badge = document.getElementById('sync-status-badge') || document.getElementById('sync-status');
    if (!badge) return;
    if (state === 'saving') {
        badge.textContent = 'Syncing...';
        badge.className = 'text-xs font-bold text-amber-500 flex items-center gap-1';
    } else if (state === 'saved') {
        badge.textContent = 'Synced';
        badge.className = 'text-xs font-bold text-emerald-500 flex items-center gap-1';
    } else if (state === 'error') {
        badge.textContent = 'Offline';
        badge.className = 'text-xs font-bold text-red-500 flex items-center gap-1';
    }
};

// Global compatibility aliases
window.saveToCloud = window.SupabaseService.saveToCloud.bind(window.SupabaseService);
window.loadFromCloud = window.SupabaseService.loadFromCloud.bind(window.SupabaseService);
window.saveTimerToCloud = window.SupabaseService.saveTimerToCloud.bind(window.SupabaseService);
window.FirebaseService = window.SupabaseService;


