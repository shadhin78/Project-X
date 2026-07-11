/**
 * Project X Focus Timer Module
 * Established in window.TimerService namespace.
 */

(function () {
    // --- PRIVATE UTILITIES & HELPERS ---

    function parseStartTime(startTime) {
        if (!startTime) return 0;
        if (typeof startTime.toDate === 'function') {
            return startTime.toDate().getTime();
        }
        if (startTime instanceof Date) {
            return startTime.getTime();
        }
        if (typeof startTime === 'string') {
            return new Date(startTime).getTime();
        }
        return Number(startTime);
    }

    function isAnyTimerRunning() {
        if (!AppState.activeTimerState) return false;
        if (AppState.activeTimerState.isRunning) return true;
        if (AppState.activeTimerState.timerStates) {
            return Object.values(AppState.activeTimerState.timerStates).some(store => store.isRunning);
        }
        return false;
    }

    function playCompletionChime() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // First beep: D5
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);

            // Second beep: A5
            setTimeout(() => {
                let osc2 = audioCtx.createOscillator();
                let gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
                osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
                gain2.gain.setValueAtTime(0, audioCtx.currentTime);
                gain2.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.5);
            }, 150);
        } catch (e) {
            console.warn("Audio Context failed to play chime:", e);
        }
    }

    function tickTimer() {
        if (!AppState.activeTimerState) return;

        // Run background timer check
        checkBackgroundTimers();

        let elapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
        if (AppState.activeTimerState.isRunning && AppState.activeTimerState.startTime) {
            elapsedMs += (window.getServerTime() - parseStartTime(AppState.activeTimerState.startTime));
        }

        let displaySeconds = 0;
        if (AppState.activeTimerState.mode === 'stopwatch') {
            displaySeconds = Math.floor(elapsedMs / 1000);
            const saveBtn = document.getElementById('timer-btn-save');
            if (saveBtn) {
                saveBtn.disabled = (displaySeconds === 0);
            }
        } else {
            const targetMs = (AppState.activeTimerState.targetDuration || 0) * 1000;
            const remainingMs = Math.max(0, targetMs - elapsedMs);
            displaySeconds = Math.ceil(remainingMs / 1000);

            if (remainingMs <= 0 && AppState.activeTimerState.isRunning) {
                AppState.activeTimerState.isRunning = false;
                AppState.activeTimerState.elapsedBeforeStart = targetMs;
                AppState.activeTimerState.startTime = null;

                // Sync to store for current mode since it changed status
                saveActiveStateToStore();

                playCompletionChime();
                FirebaseService.saveTimerToCloud();

                const saveBtn = document.getElementById('timer-btn-save');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            } else {
                const saveBtn = document.getElementById('timer-btn-save');
                if (saveBtn) {
                    saveBtn.disabled = (elapsedMs < 1000);
                }
            }
        }

        updateTimerUI(displaySeconds);

        if (!isAnyTimerRunning()) {
            if (AppState.timerInterval) {
                clearInterval(AppState.timerInterval);
                AppState.timerInterval = null;
            }
        }
    }

    function updateTimerUI(displaySeconds) {
        const hrs = Math.floor(displaySeconds / 3600);
        const mins = Math.floor((displaySeconds % 3600) / 60);
        const secs = displaySeconds % 60;
        const clockText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        safeSetText('timer-clock-text', clockText);

        const progressRing = document.getElementById('timer-progress-ring');
        if (progressRing) {
            if (AppState.activeTimerState.mode === 'stopwatch') {
                const progress = (displaySeconds % 60) / 60;
                const offset = 289 - (progress * 289);
                progressRing.setAttribute('stroke-dashoffset', offset);
            } else {
                const target = AppState.activeTimerState.targetDuration || 1;
                const progress = Math.min(1, displaySeconds / target);
                const offset = 289 - (progress * 289);
                progressRing.setAttribute('stroke-dashoffset', offset);
            }
        }

        const statusText = document.getElementById('timer-status-text');
        if (statusText) {
            if (AppState.activeTimerState.isRunning) {
                statusText.textContent = 'FOCUSING';
                statusText.className = 'text-[8px] font-bold uppercase tracking-widest text-emerald-500 mt-2';
            } else {
                let elapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
                if (elapsedMs > 0) {
                    statusText.textContent = 'PAUSED';
                    statusText.className = 'text-[8px] font-bold uppercase tracking-widest text-amber-500 mt-2';
                } else {
                    statusText.textContent = 'READY';
                    statusText.className = 'text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-2';
                }
            }
        }

        const toggleBtn = document.getElementById('timer-btn-toggle');
        if (toggleBtn) {
            if (AppState.activeTimerState.isRunning) {
                toggleBtn.textContent = 'PAUSE';
                toggleBtn.className = 'px-10 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-md active:scale-95 transition-all';
            } else {
                toggleBtn.textContent = 'START';
                toggleBtn.className = 'px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-md active:scale-95 transition-all';
            }
        }
    }

    function populateTimerSubjects() {
        const select = document.getElementById('timer-subject-select');
        if (!select) return;

        const currentValue = select.value;
        let optionsHtml = `<option value="General Study">General Study</option>`;

        const subjects = window.getAllSubjects ? window.getAllSubjects() : [];
        const uniqueSubjects = Array.from(new Set(subjects.map(s => s.subject))).filter(Boolean);

        uniqueSubjects.forEach(sub => {
            optionsHtml += `<option value="${sub}">${sub}</option>`;
        });

        select.innerHTML = optionsHtml;

        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        } else if (AppState.activeTimerState && AppState.activeTimerState.selectedSubject) {
            select.value = AppState.activeTimerState.selectedSubject;
        }
    }

    function getDurationString(totalSeconds) {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const _updateTimerFsBtn = (active) => {
        const btn = document.getElementById('timer-btn-fullscreen');
        if (!btn) return;
        if (active) {
            btn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 14h6m0 0v6m0-6L4 20m16-6h-6m0 0v6m0-6l6 6M4 10h6m0 0V4m0 6L4 4m16 6h-6m0 0V4m0 6l6-6"></path>
                </svg>
            `;
            btn.title = "Exit Fullscreen";
        } else {
            btn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4"></path>
                </svg>
            `;
            btn.title = "Toggle Fullscreen";
        }
    };

    const _exitTimerFsCleanup = () => {
        const panel = document.getElementById('timer-active-panel');
        if (!panel) return;
        if (panel.classList.contains('timer-fs-exiting')) return;

        panel.classList.add('timer-fs-exiting');
        _updateTimerFsBtn(false);

        setTimeout(() => {
            panel.classList.remove('timer-fullscreen', 'timer-fs-exiting', 'dark');
            document.body.classList.remove('timer-fullscreen-active');
            window._timerFsActive = false;
            if (window._timerFsOriginalParent) {
                if (window._timerFsOriginalNext && window._timerFsOriginalNext.parentNode === window._timerFsOriginalParent) {
                    window._timerFsOriginalParent.insertBefore(panel, window._timerFsOriginalNext);
                } else {
                    window._timerFsOriginalParent.appendChild(panel);
                }
                window._timerFsOriginalParent = null;
                window._timerFsOriginalNext = null;
            }
        }, 300);
    };

    // --- MULTI-MODE STATE PERSISTENCE HELPERS ---

    function saveActiveStateToStore() {
        if (!AppState.activeTimerState) return;
        if (!AppState.activeTimerState.timerStates) {
            AppState.activeTimerState.timerStates = {
                stopwatch: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study' },
                timer: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 25 * 60, selectedSubject: 'General Study' },
                alarm: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study', alarmStart: '', alarmEnd: '', alarmUseCurrent: true }
            };
        }
        const currentMode = AppState.activeTimerState.mode;
        if (!AppState.activeTimerState.timerStates[currentMode]) {
            AppState.activeTimerState.timerStates[currentMode] = {};
        }
        const store = AppState.activeTimerState.timerStates[currentMode];
        
        store.isRunning = AppState.activeTimerState.isRunning;
        store.startTime = AppState.activeTimerState.startTime;
        store.elapsedBeforeStart = AppState.activeTimerState.elapsedBeforeStart;
        store.targetDuration = AppState.activeTimerState.targetDuration;
        store.selectedSubject = AppState.activeTimerState.selectedSubject || 'General Study';
        
        if (currentMode === 'alarm') {
            const startEl = document.getElementById('timer-alarm-start');
            const endEl = document.getElementById('timer-alarm-end');
            const useCurrentCb = document.getElementById('timer-alarm-use-current');
            
            store.alarmStart = startEl ? startEl.value : '';
            store.alarmEnd = endEl ? endEl.value : '';
            store.alarmUseCurrent = useCurrentCb ? useCurrentCb.checked : true;
        }
    }

    function loadActiveStateFromStore(mode) {
        if (!AppState.activeTimerState) return;
        if (!AppState.activeTimerState.timerStates) {
            AppState.activeTimerState.timerStates = {
                stopwatch: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study' },
                timer: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 25 * 60, selectedSubject: 'General Study' },
                alarm: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study', alarmStart: '', alarmEnd: '', alarmUseCurrent: true }
            };
        }
        if (!AppState.activeTimerState.timerStates[mode]) {
            AppState.activeTimerState.timerStates[mode] = {
                isRunning: false,
                startTime: null,
                elapsedBeforeStart: 0,
                targetDuration: mode === 'timer' ? 25 * 60 : 0,
                selectedSubject: 'General Study'
            };
        }
        const store = AppState.activeTimerState.timerStates[mode];
        
        AppState.activeTimerState.mode = mode;
        AppState.activeTimerState.isRunning = store.isRunning;
        AppState.activeTimerState.startTime = store.startTime;
        AppState.activeTimerState.elapsedBeforeStart = store.elapsedBeforeStart;
        AppState.activeTimerState.targetDuration = store.targetDuration;
        AppState.activeTimerState.selectedSubject = store.selectedSubject || 'General Study';
        
        // Restore DOM inputs for alarm mode
        if (mode === 'alarm') {
            setTimeout(() => {
                const startEl = document.getElementById('timer-alarm-start');
                const endEl = document.getElementById('timer-alarm-end');
                const useCurrentCb = document.getElementById('timer-alarm-use-current');
                
                if (startEl && store.alarmStart !== undefined) startEl.value = store.alarmStart;
                if (endEl && store.alarmEnd !== undefined) endEl.value = store.alarmEnd;
                if (useCurrentCb && store.alarmUseCurrent !== undefined) {
                    useCurrentCb.checked = store.alarmUseCurrent;
                    window.toggleAlarmUseCurrent();
                }
            }, 50);
        }
        
        const subjectSelect = document.getElementById('timer-subject-select');
        if (subjectSelect) {
            subjectSelect.value = AppState.activeTimerState.selectedSubject;
        }
    }

    function checkBackgroundTimers() {
        if (!AppState.activeTimerState || !AppState.activeTimerState.timerStates) return;
        
        let stateChanged = false;
        
        Object.entries(AppState.activeTimerState.timerStates).forEach(([mode, store]) => {
            if (mode === AppState.activeTimerState.mode) return; // skip currently active mode
            if (!store.isRunning) return;
            
            let elapsedMs = store.elapsedBeforeStart || 0;
            if (store.startTime) {
                elapsedMs += (window.getServerTime() - parseStartTime(store.startTime));
            }
            
            if (mode === 'timer' || mode === 'alarm') {
                const targetMs = (store.targetDuration || 0) * 1000;
                if (elapsedMs >= targetMs) {
                    store.isRunning = false;
                    store.elapsedBeforeStart = targetMs;
                    store.startTime = null;
                    
                    playCompletionChime();
                    stateChanged = true;
                    showToast(`Background ${mode === 'alarm' ? 'Alarm Range' : 'Timer'} has completed!`, "success");
                }
            }
        });
        
        if (stateChanged) {
            FirebaseService.saveTimerToCloud();
            window.TimerService.updateDisplay();
        }
    }

    // --- GLOBAL BUTTON & ACTION HANDLERS ---

    window.syncTimerStateFromCloud = function () {
        if (!AppState.activeTimerState) return;

        // Initialize state store if missing
        if (!AppState.activeTimerState.timerStates) {
            AppState.activeTimerState.timerStates = {
                stopwatch: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study' },
                timer: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 25 * 60, selectedSubject: 'General Study' },
                alarm: { isRunning: false, startTime: null, elapsedBeforeStart: 0, targetDuration: 0, selectedSubject: 'General Study', alarmStart: '', alarmEnd: '', alarmUseCurrent: true }
            };
            // Seed current mode values
            const currentMode = AppState.activeTimerState.mode || 'stopwatch';
            AppState.activeTimerState.timerStates[currentMode] = {
                isRunning: AppState.activeTimerState.isRunning || false,
                startTime: AppState.activeTimerState.startTime || null,
                elapsedBeforeStart: AppState.activeTimerState.elapsedBeforeStart || 0,
                targetDuration: AppState.activeTimerState.targetDuration || 0,
                selectedSubject: AppState.activeTimerState.selectedSubject || 'General Study',
                alarmStart: document.getElementById('timer-alarm-start')?.value || '',
                alarmEnd: document.getElementById('timer-alarm-end')?.value || '',
                alarmUseCurrent: document.getElementById('timer-alarm-use-current')?.checked !== false
            };
        }

        // Restore alarm inputs if active mode is alarm
        if (AppState.activeTimerState.mode === 'alarm') {
            const store = AppState.activeTimerState.timerStates.alarm;
            const startEl = document.getElementById('timer-alarm-start');
            const endEl = document.getElementById('timer-alarm-end');
            const useCurrentCb = document.getElementById('timer-alarm-use-current');
            
            if (startEl && store.alarmStart !== undefined) startEl.value = store.alarmStart;
            if (endEl && store.alarmEnd !== undefined) endEl.value = store.alarmEnd;
            if (useCurrentCb && store.alarmUseCurrent !== undefined) {
                useCurrentCb.checked = store.alarmUseCurrent;
                window.toggleAlarmUseCurrent();
            }
        }

        const subjectSelect = document.getElementById('timer-subject-select');
        if (subjectSelect && AppState.activeTimerState.selectedSubject) {
            subjectSelect.value = AppState.activeTimerState.selectedSubject;
        }

        const btnStopwatch = document.getElementById('tm-mode-stopwatch');
        const btnTimer = document.getElementById('tm-mode-timer');
        const btnAlarm = document.getElementById('tm-mode-alarm');
        const presetsContainer = document.getElementById('timer-presets-container');
        const alarmContainer = document.getElementById('timer-alarm-container');

        if (btnStopwatch && btnTimer && btnAlarm) {
            const activeClass = "w-1/3 py-2.5 text-xs font-black rounded-xl transition-all bg-blue-600 text-white shadow";
            const inactiveClass = "w-1/3 py-2.5 text-xs font-black rounded-xl transition-all text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/80";
            if (AppState.activeTimerState.mode === 'stopwatch') {
                btnStopwatch.className = activeClass;
                btnTimer.className = inactiveClass;
                btnAlarm.className = inactiveClass;
                if (presetsContainer) presetsContainer.classList.add('hidden');
                if (alarmContainer) alarmContainer.classList.add('hidden');
            } else if (AppState.activeTimerState.mode === 'timer') {
                btnStopwatch.className = inactiveClass;
                btnTimer.className = activeClass;
                btnAlarm.className = inactiveClass;
                if (presetsContainer) {
                    presetsContainer.classList.remove('hidden');
                    presetsContainer.classList.add('flex');
                }
                if (alarmContainer) alarmContainer.classList.add('hidden');
            } else if (AppState.activeTimerState.mode === 'alarm') {
                btnStopwatch.className = inactiveClass;
                btnTimer.className = inactiveClass;
                btnAlarm.className = activeClass;
                if (presetsContainer) presetsContainer.classList.add('hidden');
                if (alarmContainer) {
                    alarmContainer.classList.remove('hidden');
                    alarmContainer.classList.add('flex');
                }
            }
        }

        if (AppState.activeTimerState.mode === 'alarm') {
            window.updateAlarmStartText();
        }

        if (AppState.timerInterval) {
            clearInterval(AppState.timerInterval);
            AppState.timerInterval = null;
        }

        tickTimer();

        if (isAnyTimerRunning()) {
            AppState.timerInterval = setInterval(tickTimer, 200);
        }
    };

    window.updateAlarmStartText = function () {
        const useCurrentCb = document.getElementById('timer-alarm-use-current');
        const startInput = document.getElementById('timer-alarm-start');
        if (useCurrentCb && useCurrentCb.checked && startInput && (!AppState.activeTimerState || !AppState.activeTimerState.isRunning)) {
            const now = new Date();
            const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            startInput.value = curTimeStr;
        }
    };

    window.toggleAlarmUseCurrent = function () {
        const useCurrentCb = document.getElementById('timer-alarm-use-current');
        const startInput = document.getElementById('timer-alarm-start');
        if (useCurrentCb && startInput) {
            if (useCurrentCb.checked) {
                startInput.disabled = true;
                window.updateAlarmStartText();
            } else {
                startInput.disabled = false;
            }
        }
    };

    window.openTimerWarningModal = function (message) {
        if (message) {
            const msgEl = document.getElementById('tw-message');
            if (msgEl) msgEl.textContent = message;
        }
        const modal = document.getElementById('timer-warning-modal');
        const backdrop = document.getElementById('tw-backdrop');
        const content = document.getElementById('tw-content');
        if (!modal || !backdrop || !content) return;
        modal.classList.remove('hidden'); void modal.offsetWidth;
        backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
        document.body.classList.add('overflow-hidden');
    };

    window.closeTimerWarningModal = function () {
        const modal = document.getElementById('timer-warning-modal');
        const backdrop = document.getElementById('tw-backdrop');
        const content = document.getElementById('tw-content');
        if (!modal || !backdrop || !content) return;
        backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
        setTimeout(() => { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }, 300);
    };

    window.setTimerMode = function (mode) {
        if (AppState.activeTimerState.mode === mode) return;
        
        // Save the current active mode state (do NOT pause it automatically)
        saveActiveStateToStore();
        
        loadActiveStateFromStore(mode);
        FirebaseService.saveTimerToCloud();
        window.TimerService.restore();
    };

    window.setTimerPreset = function (minutes) {
        if (AppState.activeTimerState.isRunning) {
            showToast("Please pause the timer before changing presets.", "error");
            return;
        }
        AppState.activeTimerState.targetDuration = minutes * 60;
        AppState.activeTimerState.elapsedBeforeStart = 0;
        AppState.activeTimerState.startTime = null;
        saveActiveStateToStore();
        FirebaseService.saveTimerToCloud();
        window.TimerService.restore();
        showToast(`Timer set to ${minutes} minutes.`, "success");
    };

    window.promptCustomTimer = function () {
        if (AppState.activeTimerState.isRunning) {
            showToast("Please pause the timer before changing presets.", "error");
            return;
        }
        const input = document.getElementById('custom-timer-input-minutes');
        if (input) {
            input.value = "25";
        }
        openModal('custom-timer-modal');
    };

    window.submitCustomTimer = function () {
        const input = document.getElementById('custom-timer-input-minutes');
        if (!input) return;
        const minutes = parseInt(input.value, 10);
        if (isNaN(minutes) || minutes <= 0) {
            showToast("Please enter a valid positive number of minutes.", "error");
            return;
        }
        AppState.activeTimerState.targetDuration = minutes * 60;
        AppState.activeTimerState.elapsedBeforeStart = 0;
        AppState.activeTimerState.startTime = null;
        saveActiveStateToStore();
        FirebaseService.saveTimerToCloud();
        window.TimerService.restore();
        closeModal('custom-timer-modal');
        showToast(`Timer set to ${minutes} minutes.`, "success");
    };

    window.toggleTimerClick = function () {
        if (!AppState.activeTimerState) return;

        const subjectSelect = document.getElementById('timer-subject-select');
        if (subjectSelect) {
            AppState.activeTimerState.selectedSubject = subjectSelect.value;
        }

        if (AppState.activeTimerState.isRunning) {
            window.TimerService.pause();
        } else {
            if (AppState.activeTimerState.mode === 'alarm') {
                const startEl = document.getElementById('timer-alarm-start');
                const endEl = document.getElementById('timer-alarm-end');
                if (!startEl || !endEl || !endEl.value) {
                    showToast("Please specify an End Time for the alarm range.", "error");
                    return;
                }
                
                const useCurrent = document.getElementById('timer-alarm-use-current')?.checked;
                if (useCurrent) {
                    const now = new Date();
                    const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    startEl.value = curTimeStr;
                }
                
                const startTimeVal = startEl.value;
                const endTimeVal = endEl.value;
                if (!startTimeVal) {
                    showToast("Please specify a Start Time.", "error");
                    return;
                }
                
                const timeStrToSeconds = (str) => {
                    const parts = str.split(':').map(Number);
                    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60;
                };
                
                let duration = timeStrToSeconds(endTimeVal) - timeStrToSeconds(startTimeVal);
                if (duration <= 0) {
                    duration += 24 * 3600; // cross-midnight
                }
                
                AppState.activeTimerState.targetDuration = duration;
                
                let elapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
                const targetMs = (AppState.activeTimerState.targetDuration || 0) * 1000;
                if (elapsedMs >= targetMs) {
                    AppState.activeTimerState.elapsedBeforeStart = 0;
                }
            } else if (AppState.activeTimerState.mode === 'timer') {
                let elapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
                const targetMs = (AppState.activeTimerState.targetDuration || 0) * 1000;
                if (elapsedMs >= targetMs) {
                    AppState.activeTimerState.elapsedBeforeStart = 0;
                }
            }
            window.TimerService.start();
        }
    };

    window.resetTimerClick = function () {
        if (!AppState.activeTimerState) return;
        window.openConfirmModal(
            "Reset Timer/Stopwatch?",
            "Are you sure you want to reset the current session? This will clear all accumulated time.",
            () => {
                window.TimerService.reset();
                showToast("Timer reset.", "success");
            }
        );
    };

    window.saveTimerSession = function () {
        if (!AppState.activeTimerState) return;

        let elapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
        if (AppState.activeTimerState.isRunning && AppState.activeTimerState.startTime) {
            elapsedMs += (window.getServerTime() - parseStartTime(AppState.activeTimerState.startTime));
        }

        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        if (elapsedSeconds <= 0) {
            showToast("No focus duration accumulated to save.", "error");
            return;
        }

        const subject = AppState.activeTimerState.selectedSubject || 'General Study';
        const mode = AppState.activeTimerState.mode;

        const newLog = {
            id: 'timer-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            subject: subject,
            duration: elapsedSeconds,
            date: new Date(window.getServerTime()).toISOString(),
            mode: mode
        };

        if (!AppState.timerLogs) AppState.timerLogs = [];
        AppState.timerLogs.unshift(newLog);

        AppState.activeTimerState.isRunning = false;
        AppState.activeTimerState.startTime = null;
        AppState.activeTimerState.elapsedBeforeStart = 0;

        // Also reset stored state for active mode since we just saved it!
        const currentMode = AppState.activeTimerState.mode;
        if (AppState.activeTimerState.timerStates && AppState.activeTimerState.timerStates[currentMode]) {
            const store = AppState.activeTimerState.timerStates[currentMode];
            store.isRunning = false;
            store.startTime = null;
            store.elapsedBeforeStart = 0;
        }

        saveActiveStateToStore();
        FirebaseService.saveToCloud(true);
        FirebaseService.saveTimerToCloud();
        window.TimerService.restore();
        window.TimerService.updateDisplay();
        showToast(`Saved session: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s for ${subject}.`, "success");
    };

    window.deleteTimerLog = function (logId) {
        window.openConfirmModal(
            "Delete Study Record?",
            "Are you sure you want to delete this study record? This action cannot be undone.",
            () => {
                if (!AppState.timerLogs) AppState.timerLogs = [];
                AppState.timerLogs = AppState.timerLogs.filter(log => log.id !== logId);
                FirebaseService.saveToCloud(true);
                window.TimerService.updateDisplay();
                showToast("Study session deleted.", "success");
            }
        );
    };

    window.openTimerAnalyticsModal = function () {
        const targetInput = document.getElementById('timer-target-input');
        if (targetInput) {
            targetInput.value = window.dailyFocusHoursTarget || 4.0;
        }
        window.openModal('timer-analytics-modal');
    };

    window.updateDailyFocusHoursTarget = function (value) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed > 0) {
            window.dailyFocusHoursTarget = parsed;
            if (window.FirebaseService) {
                window.FirebaseService.saveToCloud(true);
            }
            window.renderTimerAnalyticsChart();
        }
    };

    window.renderTimerAnalyticsChart = function () {
        const ctx = document.getElementById('timerAnalyticsChart');
        if (!ctx) return;

        if (window.timerAnalyticsChartInstance) {
            window.timerAnalyticsChartInstance.destroy();
        }

        const labels = [];
        const actualData = [];
        const targetData = [];
        const targetHours = window.dailyFocusHoursTarget || 4.0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);

            const label = window.Utils.formatDate(d);
            labels.push(label);

            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

            let totalSeconds = 0;
            if (AppState.timerLogs) {
                AppState.timerLogs.forEach(log => {
                    const logTime = new Date(log.date).getTime();
                    if (logTime >= dayStart && logTime <= dayEnd) {
                        totalSeconds += parseInt(log.duration || 0, 10);
                    }
                });
            }

            const actualHrs = parseFloat((totalSeconds / 3600).toFixed(2));
            actualData.push(actualHrs);
            targetData.push(targetHours);
        }

        const maxVal = Math.max(...actualData, targetHours);
        const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.25) : 5;

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';

        window.timerAnalyticsChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Focus Hours',
                        data: actualData,
                        backgroundColor: '#10b981',
                        borderRadius: 4,
                        borderSkipped: false
                    },
                    {
                        label: 'Target Focus Hours',
                        data: targetData,
                        backgroundColor: '#6366f1',
                        borderRadius: 4,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: { weight: 'bold', size: 10 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${c.parsed.y} hrs`
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: yMax,
                        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                        ticks: {
                            font: { weight: 'bold' },
                            callback: v => `${v}h`
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { weight: 'bold', size: 10 } }
                    }
                }
            }
        });
    };

    window.renderTimerPage = function () {
        if (!AppState.timerLogs) AppState.timerLogs = [];

        populateTimerSubjects();

        const now = new Date();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        let secondsToday = 0;
        let secondsWeek = 0;
        let secondsMonth = 0;

        const subjectSeconds = {};

        AppState.timerLogs.forEach(log => {
            const logDate = new Date(log.date);
            const duration = parseInt(log.duration || 0, 10);

            if (logDate >= todayStart) {
                secondsToday += duration;
            }
            if (logDate >= weekStart) {
                secondsWeek += duration;
            }
            if (logDate >= monthStart) {
                secondsMonth += duration;
            }

            const sub = log.subject || 'General Study';
            subjectSeconds[sub] = (subjectSeconds[sub] || 0) + duration;
        });

        safeSetText('timer-stat-today', getDurationString(secondsToday));
        safeSetText('timer-stat-week', getDurationString(secondsWeek));
        safeSetText('timer-stat-month', getDurationString(secondsMonth));

        const breakdownContainer = document.getElementById('timer-subject-breakdown-container');
        if (breakdownContainer) {
            let breakdownHtml = '';
            const sortedSubjects = Object.entries(subjectSeconds).sort((a, b) => b[1] - a[1]);
            const maxSeconds = sortedSubjects.length > 0 ? sortedSubjects[0][1] : 1;

            if (sortedSubjects.length === 0) {
                breakdownHtml = `<p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider py-4 text-center">No study records yet</p>`;
            } else {
                sortedSubjects.forEach(([subj, sec]) => {
                    const pct = Math.max(5, Math.round((sec / maxSeconds) * 100));
                    const hours = (sec / 3600).toFixed(1);
                    const color = getSubjectColor(subj);

                    breakdownHtml += `
                        <div class="space-y-1">
                            <div class="flex justify-between items-center text-xs">
                                <span class="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70%]" title="${subj}">${subj}</span>
                                <span class="font-black text-slate-900 dark:text-white">${hours}h</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${color};"></div>
                            </div>
                        </div>
                    `;
                });
            }
            breakdownContainer.innerHTML = breakdownHtml;
        }

        const historyTableBody = document.getElementById('timer-history-table-body');
        if (historyTableBody) {
            let historyHtml = '';

            if (AppState.timerLogs.length === 0) {
                historyHtml = `
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            No focus sessions recorded yet
                        </td>
                    </tr>
                `;
            } else {
                AppState.timerLogs.forEach(log => {
                    const dateObj = new Date(log.date);
                    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    const durationMinutes = Math.floor(log.duration / 60);
                    const durationSeconds = log.duration % 60;
                    let durStr = '';
                    if (durationMinutes > 0) {
                        durStr += `${durationMinutes}m `;
                    }
                    durStr += `${durationSeconds}s`;

                    const modeBadge = log.mode === 'timer' ?
                        `<span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-wider rounded border border-blue-100 dark:border-blue-900/30">Timer</span>` :
                        log.mode === 'addx' ?
                        `<span class="px-2 py-0.5 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-black text-[9px] uppercase tracking-wider rounded border border-orange-100 dark:border-orange-900/30">Added</span>` :
                        `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider rounded border border-emerald-100 dark:border-emerald-900/30">Stopwatch</span>`;

                    historyHtml += `
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="py-3 font-bold text-slate-500 dark:text-slate-400">${dateStr}</td>
                            <td class="py-3 font-black text-slate-800 dark:text-white">${log.subject}</td>
                            <td class="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">${durStr}</td>
                            <td class="py-3 text-center">${modeBadge}</td>
                            <td class="py-3 text-right">
                                <button onclick="window.deleteTimerLog('${log.id}')" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all">
                                    <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            historyTableBody.innerHTML = historyHtml;
        }
    };

    window.switchAtsmTab = function (tab) {
        window._atsmActiveTab = tab;
        const tabHours = document.getElementById('atsm-tab-hours');
        const tabRange = document.getElementById('atsm-tab-range');
        const panelHours = document.getElementById('atsm-panel-hours');
        const panelRange = document.getElementById('atsm-panel-range');

        const activeClass = 'flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all bg-emerald-600 text-white shadow';
        const inactiveClass = 'flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/80';

        if (tab === 'hours') {
            if (tabHours) tabHours.className = activeClass;
            if (tabRange) tabRange.className = inactiveClass;
            if (panelHours) { panelHours.classList.remove('hidden'); panelHours.classList.add('flex'); }
            if (panelRange) { panelRange.classList.add('hidden'); panelRange.classList.remove('flex'); }
        } else {
            if (tabHours) tabHours.className = inactiveClass;
            if (tabRange) tabRange.className = activeClass;
            if (panelHours) { panelHours.classList.add('hidden'); panelHours.classList.remove('flex'); }
            if (panelRange) { panelRange.classList.remove('hidden'); panelRange.classList.add('flex'); }
        }
    };

    window.updateAtsmRangePreview = function () {
        const startInput = document.getElementById('atsm-range-start');
        const endInput = document.getElementById('atsm-range-end');
        const preview = document.getElementById('atsm-range-preview');
        if (!startInput || !endInput || !preview) return;

        if (startInput.value && endInput.value) {
            let diff = Utils.toMinutes(endInput.value) - Utils.toMinutes(startInput.value);
            if (diff <= 0) diff += 24 * 60; // cross-midnight
            const hrs = Math.floor(diff / 60);
            const mins = diff % 60;
            let durStr = '';
            if (hrs > 0) durStr += `${hrs}h `;
            durStr += `${mins}m`;
            preview.textContent = `Duration: ${durStr}`;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
    };

    window.openAddTimerSessionModal = function () {
        const now = new Date();
        const dateInput = document.getElementById('atsm-date');
        if (dateInput) {
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        const hoursInput = document.getElementById('atsm-hours');
        const minutesInput = document.getElementById('atsm-minutes');
        if (hoursInput) hoursInput.value = '0';
        if (minutesInput) minutesInput.value = '25';

        const rangeStart = document.getElementById('atsm-range-start');
        const rangeEnd = document.getElementById('atsm-range-end');
        if (rangeStart) rangeStart.value = '';
        if (rangeEnd) rangeEnd.value = '';
        const preview = document.getElementById('atsm-range-preview');
        if (preview) preview.classList.add('hidden');

        window.switchAtsmTab('hours');

        const subjectSelect = document.getElementById('atsm-subject');
        if (subjectSelect) {
            let optionsHtml = `<option value="General Study">General Study</option>`;
            const subjects = window.getAllSubjects ? window.getAllSubjects() : [];
            const uniqueSubjects = Array.from(new Set(subjects.map(s => s.subject))).filter(Boolean);
            uniqueSubjects.forEach(sub => {
                optionsHtml += `<option value="${sub}">${sub}</option>`;
            });
            subjectSelect.innerHTML = optionsHtml;
        }

        openModal('add-timer-session-modal');
    };

    window.submitManualTimerSession = function () {
        const dateInput = document.getElementById('atsm-date');
        const subjectSelect = document.getElementById('atsm-subject');

        if (!dateInput || !dateInput.value) {
            showToast("Please select a date.", "error");
            return;
        }

        let totalSeconds = 0;
        let sessionTimeStr = '12:00';

        if (window._atsmActiveTab === 'hours') {
            const hoursInput = document.getElementById('atsm-hours');
            const minutesInput = document.getElementById('atsm-minutes');
            const hours = parseInt(hoursInput?.value || '0', 10);
            const minutes = parseInt(minutesInput?.value || '0', 10);

            if (isNaN(hours) || isNaN(minutes)) {
                showToast("Please enter valid duration numbers.", "error");
                return;
            }
            totalSeconds = (hours * 3600) + (minutes * 60);
            if (totalSeconds <= 0) {
                showToast("Duration must be greater than zero.", "error");
                return;
            }
        } else {
            const startInput = document.getElementById('atsm-range-start');
            const endInput = document.getElementById('atsm-range-end');

            if (!startInput?.value || !endInput?.value) {
                showToast("Please enter both start and end times.", "error");
                return;
            }

            let diffMinutes = Utils.toMinutes(endInput.value) - Utils.toMinutes(startInput.value);
            if (diffMinutes <= 0) diffMinutes += 24 * 60; // cross-midnight

            totalSeconds = diffMinutes * 60;
            sessionTimeStr = startInput.value;
        }

        const timeParts = sessionTimeStr.split(':').map(Number);
        const sessionDate = new Date(dateInput.value + 'T' + String(timeParts[0] || 0).padStart(2, '0') + ':' + String(timeParts[1] || 0).padStart(2, '0') + ':00');

        if (isNaN(sessionDate.getTime())) {
            showToast("Invalid date entered.", "error");
            return;
        }

        const subject = subjectSelect?.value || 'General Study';

        const newLog = {
            id: 'timer-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            subject: subject,
            duration: totalSeconds,
            date: sessionDate.toISOString(),
            mode: 'addx'
        };

        if (!AppState.timerLogs) AppState.timerLogs = [];
        AppState.timerLogs.unshift(newLog);

        AppState.timerLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        FirebaseService.saveToCloud(true);
        window.TimerService.updateDisplay();
        closeModal('add-timer-session-modal');

        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const durationStr = (hrs > 0 ? `${hrs}h ` : '') + `${mins}m`;
        showToast(`Session added: ${durationStr} for ${subject}.`, "success");
    };

    window._timerFsOriginalParent = null;
    window._timerFsOriginalNext = null;
    window._timerFsActive = false;

    window.toggleTimerFullscreen = function () {
        const panel = document.getElementById('timer-active-panel');
        if (!panel) return;

        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (window._timerFsActive) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            return;
        }

        window._timerFsActive = true;

        window._timerFsOriginalParent = panel.parentNode;
        window._timerFsOriginalNext = panel.nextSibling;

        document.body.appendChild(panel);

        panel.classList.add('timer-fullscreen');
        panel.classList.toggle('dark', isDark);
        document.body.classList.add('timer-fullscreen-active');
        _updateTimerFsBtn(true);

        const docEl = document.documentElement;
        const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
        if (requestFs) {
            requestFs.call(docEl).catch(() => {
            });
        }
    };

    // --- PUBLIC SERVICE DEFINITION ---

    window.TimerService = {
        init: function () {
            // Setup DOM event listeners

            // 1. Subject change listener
            document.addEventListener('change', (e) => {
                if (e.target && e.target.id === 'timer-subject-select') {
                    if (AppState.activeTimerState) {
                        AppState.activeTimerState.selectedSubject = e.target.value;
                        FirebaseService.saveTimerToCloud();
                    }
                }
            });

            // 2. Fullscreen change listeners
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement && window._timerFsActive) {
                    _exitTimerFsCleanup();
                }
            });
            document.addEventListener('webkitfullscreenchange', () => {
                if (!document.webkitFullscreenElement && window._timerFsActive) {
                    _exitTimerFsCleanup();
                }
            });

            // Restore/synchronize state immediately
            window.TimerService.restore();
        },

        saveActiveStateToStore: function () {
            saveActiveStateToStore();
        },

        loadActiveStateFromStore: function (mode) {
            loadActiveStateFromStore(mode);
        },

        start: function () {
            if (AppState.activeTimerState && !AppState.activeTimerState.isRunning) {
                // Check if any other mode is running
                if (AppState.activeTimerState.timerStates) {
                    const runningMode = Object.keys(AppState.activeTimerState.timerStates).find(mode => {
                        return mode !== AppState.activeTimerState.mode && AppState.activeTimerState.timerStates[mode].isRunning;
                    });
                    if (runningMode) {
                        const friendlyName = runningMode === 'stopwatch' ? 'Stopwatch' : (runningMode === 'alarm' ? 'Alarm Range' : 'Timer');
                        window.openTimerWarningModal(`Another session (${friendlyName}) is already active. Please pause it first.`);
                        return;
                    }
                }
                
                AppState.activeTimerState.isRunning = true;
                AppState.activeTimerState.startTime = window.getServerTime();
                saveActiveStateToStore();
                FirebaseService.saveTimerToCloud();
                window.TimerService.restore();
            }
        },

        pause: function () {
            if (AppState.activeTimerState && AppState.activeTimerState.isRunning) {
                AppState.activeTimerState.isRunning = false;
                if (AppState.activeTimerState.startTime) {
                    AppState.activeTimerState.elapsedBeforeStart += (window.getServerTime() - parseStartTime(AppState.activeTimerState.startTime));
                }
                AppState.activeTimerState.startTime = null;
                saveActiveStateToStore();
                FirebaseService.saveTimerToCloud();
                window.TimerService.restore();
            }
        },

        resume: function () {
            window.TimerService.start();
        },

        stop: function () {
            window.TimerService.pause();
        },

        reset: function () {
            if (AppState.activeTimerState) {
                AppState.activeTimerState.isRunning = false;
                AppState.activeTimerState.startTime = null;
                AppState.activeTimerState.elapsedBeforeStart = 0;
                
                // Also reset stored state for active mode
                const currentMode = AppState.activeTimerState.mode;
                if (AppState.activeTimerState.timerStates && AppState.activeTimerState.timerStates[currentMode]) {
                    const store = AppState.activeTimerState.timerStates[currentMode];
                    store.isRunning = false;
                    store.startTime = null;
                    store.elapsedBeforeStart = 0;
                    if (currentMode === 'timer') {
                        store.targetDuration = 25 * 60;
                        AppState.activeTimerState.targetDuration = 25 * 60;
                    } else if (currentMode === 'alarm') {
                        store.targetDuration = 0;
                        store.alarmStart = '';
                        store.alarmEnd = '';
                        store.alarmUseCurrent = true;
                        AppState.activeTimerState.targetDuration = 0;
                    } else {
                        store.targetDuration = 0;
                        AppState.activeTimerState.targetDuration = 0;
                    }
                }
                
                saveActiveStateToStore();
                FirebaseService.saveTimerToCloud();
                window.TimerService.restore();
            }
        },

        skip: function () {
            console.warn("TimerService: skip not implemented (no break/skip sessions exist in current codebase).");
        },

        saveSession: function () {
            window.saveTimerSession();
        },

        restore: function () {
            window.syncTimerStateFromCloud();
        },

        updateDisplay: function () {
            tickTimer();
            if (typeof window.renderTimerPage === 'function') {
                window.renderTimerPage();
            }
        },

        destroy: function () {
            if (AppState.timerInterval) {
                clearInterval(AppState.timerInterval);
                AppState.timerInterval = null;
            }
        }
    };
})();
