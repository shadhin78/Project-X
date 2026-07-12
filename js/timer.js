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

        // Update dashboard Focus Timer card in real-time if it exists
        if (document.getElementById('dash-timer-clock-text') || document.getElementById('dash-timer-progress-bar')) {
            let displayState = AppState.activeTimerState;
            let displayMode = AppState.activeTimerState.mode || 'stopwatch';

            if (AppState.activeTimerState.timerStates) {
                const runningMode = Object.keys(AppState.activeTimerState.timerStates).find(
                    m => AppState.activeTimerState.timerStates[m].isRunning
                );
                if (runningMode) {
                    displayMode = runningMode;
                    displayState = AppState.activeTimerState.timerStates[runningMode];
                }
            }

            const isTimerRunning = displayState.isRunning || false;
            let dashElapsedMs = displayState.elapsedBeforeStart || 0;
            if (displayState.isRunning && displayState.startTime) {
                dashElapsedMs += (window.getServerTime() - parseStartTime(displayState.startTime));
            }
            let dashSeconds = 0;
            let dashProgressPercent = 0;
            if (displayMode === 'stopwatch') {
                dashSeconds = Math.floor(dashElapsedMs / 1000);
                dashProgressPercent = Math.round(((dashSeconds % 60) / 60) * 100);
            } else {
                const targetMs = (displayState.targetDuration || 0) * 1000;
                const remainingMs = Math.max(0, targetMs - dashElapsedMs);
                dashSeconds = displayState.isRunning ? Math.ceil(remainingMs / 1000) : Math.floor(remainingMs / 1000);
                const target = displayState.targetDuration || 1;
                const elapsedSec = Math.floor(dashElapsedMs / 1000);
                dashProgressPercent = Math.min(100, Math.round((elapsedSec / target) * 100));
            }

            const dashHrs = Math.floor(dashSeconds / 3600);
            const dashMins = Math.floor((dashSeconds % 3600) / 60);
            const dashSecs = dashSeconds % 60;
            const dashClockText = `${String(dashHrs).padStart(2, '0')}:${String(dashMins).padStart(2, '0')}:${String(dashSecs).padStart(2, '0')}`;

            safeSetText('dash-timer-clock-text', dashClockText);

            const dashProgressBar = document.getElementById('dash-timer-progress-bar');
            if (dashProgressBar) {
                dashProgressBar.style.width = `${dashProgressPercent}%`;
            }

            const dashModeLabel = document.getElementById('dash-timer-mode-label');
            if (dashModeLabel) {
                dashModeLabel.textContent = displayMode.toUpperCase();
            }

            const dashStatusText = document.getElementById('dash-timer-status-text');
            if (dashStatusText) {
                dashStatusText.textContent = displayState.isRunning ? 'FOCUSING' : (dashElapsedMs > 0 ? 'PAUSED' : 'READY');
            }

            const dashSubjectText = document.getElementById('dash-timer-subject-text');
            if (dashSubjectText) {
                dashSubjectText.textContent = displayState.selectedSubject || 'General Study';
            }

            const dashCardBody = document.getElementById('dash-timer-card-body');
            if (dashCardBody) {
                const timerColor = window.getSubjectColor ? window.getSubjectColor(displayState.selectedSubject || 'General Study') : '#2563eb';
                dashCardBody.style.backgroundColor = `${timerColor}cc`;
            }

            const dashBtnToggle = document.getElementById('dash-timer-btn-toggle');
            if (dashBtnToggle) {
                dashBtnToggle.textContent = isTimerRunning ? 'PAUSE' : 'START';
            }
        }
        updateSubjectTargetUI();
    }

    function updateSubjectTargetUI() {
        const listContainer = document.getElementById('subject-targets-list');
        if (!listContainer) return;

        if (!window.subjectFocusTargets || Object.keys(window.subjectFocusTargets).length === 0) {
            listContainer.innerHTML = `<p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider py-4 text-center">No subject targets set. Click + to add one.</p>`;
            return;
        }

        let html = '';
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        Object.entries(window.subjectFocusTargets).forEach(([subject, target]) => {
            const targetHours = parseInt(target.hours, 10) || 0;
            const targetMinutes = parseInt(target.minutes, 10) || 0;

            // Calculate Today's Done time for subject (in seconds)
            let doneSeconds = 0;
            if (AppState.timerLogs) {
                AppState.timerLogs.forEach(log => {
                    const logDate = new Date(log.date);
                    if (logDate >= todayStart && (log.subject || 'General Study') === subject) {
                        doneSeconds += parseInt(log.duration || 0, 10);
                    }
                });
            }

            // Include current active running timer/stopwatch if its subject matches
            if (AppState.activeTimerState && (AppState.activeTimerState.selectedSubject || 'General Study') === subject) {
                let activeElapsedMs = AppState.activeTimerState.elapsedBeforeStart || 0;
                if (AppState.activeTimerState.isRunning && AppState.activeTimerState.startTime) {
                    activeElapsedMs += (window.getServerTime() - parseStartTime(AppState.activeTimerState.startTime));
                }
                doneSeconds += Math.floor(activeElapsedMs / 1000);
            }

            // Format Done using compact 00h 00m form to prevent mobile squishing
            const doneHrs = Math.floor(doneSeconds / 3600);
            const doneMins = Math.floor((doneSeconds % 3600) / 60);
            const doneText = `${String(doneHrs).padStart(2, '0')}h ${String(doneMins).padStart(2, '0')}m`;

            // Calculate Remain
            const targetSeconds = (targetHours * 3600) + (targetMinutes * 60);
            const remainSeconds = Math.max(0, targetSeconds - doneSeconds);
            const remainHrs = Math.floor(remainSeconds / 3600);
            const remainMins = Math.floor((remainSeconds % 3600) / 60);
            const remainText = `${String(remainHrs).padStart(2, '0')}h ${String(remainMins).padStart(2, '0')}m`;

            const remainColorClass = (targetSeconds > 0 && remainSeconds === 0) ? 'text-emerald-500' : 'text-indigo-500 dark:text-indigo-400';
            const targetText = `${String(targetHours).padStart(2, '0')}h ${String(targetMinutes).padStart(2, '0')}m`;

            // Calculate target completion percentage
            const progressPercent = targetSeconds > 0 ? Math.min(100, Math.round((doneSeconds / targetSeconds) * 100)) : 0;

            // Resolve subject theme color for left border and progress indicators
            const subjColor = (typeof window.getSubjectColor === 'function') ? window.getSubjectColor(subject) : '#6366f1';

            html += `
                <div class="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col gap-2.5 shadow-sm relative overflow-hidden" style="border-left: 4px solid ${subjColor};">
                    <div class="flex justify-between items-center gap-2">
                        <span class="font-black text-xs text-slate-800 dark:text-white truncate" title="${subject}">${subject}</span>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <!-- Progress Badge -->
                            <span class="text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}">${progressPercent}%</span>
                            
                            <!-- Edit Button -->
                            <button onclick="window.openSubjectTargetModal('${subject.replace(/'/g, "\\'")}')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all" title="Edit Target">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Premium Progress Bar -->
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%; background-color: ${progressPercent >= 100 ? '#10b981' : subjColor};"></div>
                    </div>

                    <!-- Details Grid -->
                    <div class="grid grid-cols-3 gap-1.5 text-center mt-0.5">
                        <div class="flex flex-col bg-white dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/80 rounded-xl py-1 px-0.5">
                            <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">Done</span>
                            <span class="text-[9.5px] font-black text-emerald-500 font-mono whitespace-nowrap">${doneText}</span>
                        </div>
                        <div class="flex flex-col bg-white dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/80 rounded-xl py-1 px-0.5">
                            <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">Remain</span>
                            <span class="text-[9.5px] font-black ${remainColorClass} font-mono whitespace-nowrap">${remainText}</span>
                        </div>
                        <div class="flex flex-col bg-white dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/80 rounded-xl py-1 px-0.5">
                            <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">Target</span>
                            <span class="text-[9.5px] font-black text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">${targetText}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    }

    window.openSubjectTargetModal = function (prefilledSubject = '') {
        const modal = document.getElementById('subject-target-modal');
        const backdrop = document.getElementById('stm-target-backdrop');
        const content = document.getElementById('stm-target-content');
        if (!modal || !backdrop || !content) return;

        // Populate modal subject selector first
        const select = document.getElementById('modal-target-subject');
        if (select) {
            let optionsHtml = `<option value="General Study">General Study</option>`;
            const subjects = window.getAllSubjects ? window.getAllSubjects() : [];
            const uniqueSubjects = Array.from(new Set(subjects.map(s => s.subject))).filter(Boolean);
            uniqueSubjects.forEach(sub => {
                optionsHtml += `<option value="${sub}">${sub}</option>`;
            });
            select.innerHTML = optionsHtml;

            if (prefilledSubject) {
                select.value = prefilledSubject;
                select.disabled = true; // when editing, disable changing subject to avoid confusion
                document.getElementById('subject-target-modal-title').textContent = 'Edit Subject Target';
            } else {
                select.disabled = false;
                document.getElementById('subject-target-modal-title').textContent = 'Add Subject Target';
            }
        }

        // Set inputs
        let hours = 1;
        let minutes = 0;
        const targetSubject = prefilledSubject || (select ? select.value : 'General Study');
        if (window.subjectFocusTargets && window.subjectFocusTargets[targetSubject]) {
            const tgt = window.subjectFocusTargets[targetSubject];
            hours = tgt.hours !== undefined ? tgt.hours : 1;
            minutes = tgt.minutes !== undefined ? tgt.minutes : 0;
        }

        const hrsInput = document.getElementById('modal-target-hours');
        const minsInput = document.getElementById('modal-target-minutes');
        if (hrsInput) hrsInput.value = hours;
        if (minsInput) minsInput.value = minutes;

        // Toggle Delete button based on Edit/Add mode
        const deleteBtn = document.getElementById('modal-target-delete-btn');
        if (deleteBtn) {
            if (prefilledSubject) {
                deleteBtn.classList.remove('hidden');
                deleteBtn.onclick = function () {
                    window.deleteSubjectTarget(prefilledSubject);
                };
            } else {
                deleteBtn.classList.add('hidden');
                deleteBtn.onclick = null;
            }
        }

        // Animate open
        modal.classList.remove('hidden'); void modal.offsetWidth;
        backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
        document.body.classList.add('overflow-hidden');
    };

    window.closeSubjectTargetModal = function () {
        const modal = document.getElementById('subject-target-modal');
        const backdrop = document.getElementById('stm-target-backdrop');
        const content = document.getElementById('stm-target-content');
        if (!modal || !backdrop || !content) return;

        backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
        setTimeout(() => { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }, 300);
    };

    window.submitSubjectTarget = function () {
        const select = document.getElementById('modal-target-subject');
        if (!select) return;
        const subject = select.value || 'General Study';

        const hrsInput = document.getElementById('modal-target-hours');
        const minsInput = document.getElementById('modal-target-minutes');
        if (!hrsInput || !minsInput) return;

        let hours = parseInt(hrsInput.value, 10);
        let minutes = parseInt(minsInput.value, 10);

        if (isNaN(hours) || hours < 0) hours = 0;
        if (isNaN(minutes) || minutes < 0) minutes = 0;
        if (minutes > 59) minutes = 59;

        if (!window.subjectFocusTargets) {
            window.subjectFocusTargets = {};
        }

        window.subjectFocusTargets[subject] = { hours, minutes };

        if (window.FirebaseService) {
            window.FirebaseService.saveToCloud(true);
        }

        window.closeSubjectTargetModal();
        updateSubjectTargetUI();
    };

    window.deleteSubjectTarget = function (subject) {
        window.openConfirmModal(
            "Delete Subject Target?",
            `Are you sure you want to remove the focus target for "${subject}"?`,
            () => {
                if (window.subjectFocusTargets && window.subjectFocusTargets[subject]) {
                    delete window.subjectFocusTargets[subject];
                    if (window.FirebaseService) {
                        window.FirebaseService.saveToCloud(true);
                    }
                    updateSubjectTargetUI();
                    showToast(`Target for ${subject} deleted.`, "success");
                    if (typeof window.closeSubjectTargetModal === 'function') {
                        window.closeSubjectTargetModal();
                    }
                }
            }
        );
    };

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

        const modalSelect = document.getElementById('modal-target-subject');
        if (modalSelect) {
            const currentVal = modalSelect.value;
            modalSelect.innerHTML = optionsHtml;
            if (currentVal && Array.from(modalSelect.options).some(opt => opt.value === currentVal)) {
                modalSelect.value = currentVal;
            }
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

        // Determine if any tracker is running
        let runningMode = null;
        if (AppState.activeTimerState.timerStates) {
            runningMode = Object.keys(AppState.activeTimerState.timerStates).find(
                m => AppState.activeTimerState.timerStates[m].isRunning
            );
        }

        if (AppState.activeTimerState.isRunning || runningMode) {
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

    window.timerAnalyticsRange = 180; // default to 6 Months
    window.timerAnalyticsChartStyle = 'combo'; // default to combo
    window.timerAnalyticsGrouping = 'daily'; // default to daily

    window.updateTimerAnalyticsControls = function () {
        const range = window.timerAnalyticsRange || 180;
        const style = window.timerAnalyticsChartStyle || 'combo';
        const grouping = window.timerAnalyticsGrouping || 'daily';

        // 1. Sync timeframe buttons styling
        [7, 30, 180].forEach(d => {
            const btn = document.getElementById(`tar-btn-${d}`);
            if (btn) {
                if (d === range) {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30";
                } else {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
                }
            }
        });

        // 2. Manage Grouping buttons based on selected Range
        const weeklyBtn = document.getElementById('tag-btn-weekly');
        const monthlyBtn = document.getElementById('tag-btn-monthly');

        if (range === 7) {
            // Force daily grouping for 7 days
            window.timerAnalyticsGrouping = 'daily';
            if (weeklyBtn) weeklyBtn.setAttribute('disabled', 'true');
            if (monthlyBtn) monthlyBtn.setAttribute('disabled', 'true');
            if (weeklyBtn) weeklyBtn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed";
            if (monthlyBtn) monthlyBtn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed";
        } else if (range === 30) {
            if (weeklyBtn) weeklyBtn.removeAttribute('disabled');
            if (monthlyBtn) monthlyBtn.setAttribute('disabled', 'true');
            if (monthlyBtn) monthlyBtn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed";
            if (window.timerAnalyticsGrouping === 'monthly') {
                window.timerAnalyticsGrouping = 'daily';
            }
        } else {
            // 180 days: all options allowed
            if (weeklyBtn) weeklyBtn.removeAttribute('disabled');
            if (monthlyBtn) monthlyBtn.removeAttribute('disabled');
        }

        const activeGrouping = window.timerAnalyticsGrouping;
        ['daily', 'weekly', 'monthly'].forEach(g => {
            const btn = document.getElementById(`tag-btn-${g}`);
            if (btn) {
                if (btn.hasAttribute('disabled')) return; // already styled above
                if (g === activeGrouping) {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30";
                } else {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
                }
            }
        });

        // 3. Sync Chart Style buttons styling
        ['combo', 'bar', 'line'].forEach(s => {
            const btn = document.getElementById(`tas-btn-${s}`);
            if (btn) {
                if (s === style) {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30";
                } else {
                    btn.className = "shrink-0 px-2 py-1 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
                }
            }
        });
    };

    window.openTimerAnalyticsModal = function () {
        const targetInput = document.getElementById('timer-target-input');
        if (targetInput) {
            targetInput.value = window.dailyFocusHoursTarget || 4.0;
        }
        if (window.timerAnalyticsRange === undefined) {
            window.timerAnalyticsRange = 180;
        }
        if (window.timerAnalyticsChartStyle === undefined) {
            window.timerAnalyticsChartStyle = 'combo';
        }
        if (window.timerAnalyticsGrouping === undefined) {
            window.timerAnalyticsGrouping = 'daily';
        }
        window.updateTimerAnalyticsControls();
        window.openModal('timer-analytics-modal');
    };

    window.getDailyFocusHoursTargetForDate = function (dateObj) {
        if (!window.dailyFocusHoursTargetHistory || window.dailyFocusHoursTargetHistory.length === 0) {
            return window.dailyFocusHoursTarget || 4.0;
        }

        const sorted = [...window.dailyFocusHoursTargetHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

        const queryDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const queryTime = queryDate.getTime();

        const firstEntryDate = new Date(sorted[0].date);
        const firstEntryStartOfDay = new Date(firstEntryDate.getFullYear(), firstEntryDate.getMonth(), firstEntryDate.getDate()).getTime();

        if (queryTime < firstEntryStartOfDay) {
            return 0;
        }

        let activeTarget = sorted[0].target;
        for (let i = 0; i < sorted.length; i++) {
            const entryDate = new Date(sorted[i].date);
            const entryStartOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
            if (queryTime >= entryStartOfDay) {
                activeTarget = sorted[i].target;
            }
        }
        return activeTarget;
    };

    window.updateDailyFocusHoursTarget = function (value) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed > 0) {
            window.dailyFocusHoursTarget = parsed;
            window.dailyFocusHoursTargetDate = new Date().toISOString();

            if (!window.dailyFocusHoursTargetHistory) {
                window.dailyFocusHoursTargetHistory = [];
            }

            const todayStr = new Date().toDateString();
            const existingIdx = window.dailyFocusHoursTargetHistory.findIndex(entry =>
                new Date(entry.date).toDateString() === todayStr
            );

            if (existingIdx !== -1) {
                window.dailyFocusHoursTargetHistory[existingIdx].target = parsed;
                window.dailyFocusHoursTargetHistory[existingIdx].date = new Date().toISOString();
            } else {
                window.dailyFocusHoursTargetHistory.push({
                    date: new Date().toISOString(),
                    target: parsed
                });
            }

            if (window.FirebaseService) {
                window.FirebaseService.saveToCloud(true);
            }
            window.renderTimerAnalyticsChart();
        }
    };

    window.setTimerAnalyticsRange = function (days) {
        window.timerAnalyticsRange = days;
        window.updateTimerAnalyticsControls();
        window.renderTimerAnalyticsChart();
    };

    window.setTimerAnalyticsGrouping = function (grouping) {
        const range = window.timerAnalyticsRange || 180;
        if (range === 7 && grouping !== 'daily') return;
        if (range === 30 && grouping === 'monthly') return;

        window.timerAnalyticsGrouping = grouping;
        window.updateTimerAnalyticsControls();
        window.renderTimerAnalyticsChart();
    };

    window.setTimerAnalyticsChartStyle = function (style) {
        window.timerAnalyticsChartStyle = style;
        window.updateTimerAnalyticsControls();
        window.renderTimerAnalyticsChart();
    };

    window.renderTimerAnalyticsChart = function () {
        const ctx = document.getElementById('timerAnalyticsChart');
        if (!ctx) return;

        if (window.timerAnalyticsChartInstance) {
            window.timerAnalyticsChartInstance.destroy();
        }

        const range = window.timerAnalyticsRange || 180;
        const style = window.timerAnalyticsChartStyle || 'combo';
        let grouping = window.timerAnalyticsGrouping || 'daily';

        // Range constraints on grouping
        if (range === 7) {
            grouping = 'daily';
        } else if (range === 30 && grouping === 'monthly') {
            grouping = 'daily';
        }

        // 1. Gather daily data points
        const dailyPoints = [];
        for (let i = range - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);

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
            const dayTarget = window.getDailyFocusHoursTargetForDate(d);

            dailyPoints.push({
                date: d,
                actual: actualHrs,
                target: dayTarget
            });
        }

        // 2. Compute Analytics Statistics (overall for the selected range)
        const sumActual = dailyPoints.reduce((acc, p) => acc + p.actual, 0);
        const avgActual = parseFloat((sumActual / range).toFixed(2));

        // Target Met Success Rate
        const successDays = dailyPoints.filter(p => p.actual >= p.target).length;
        const successRate = range > 0 ? Math.round((successDays / range) * 100) : 0;

        // Peak Day
        let peakDay = { actual: 0, date: null };
        dailyPoints.forEach(p => {
            if (p.actual > peakDay.actual) {
                peakDay = p;
            }
        });

        // Update Stats UI
        const avgDisplay = document.getElementById('timer-average-focus');
        if (avgDisplay) {
            avgDisplay.innerText = `${avgActual.toFixed(2)}h`;
        }

        const totalDisplay = document.getElementById('timer-total-focus');
        if (totalDisplay) {
            totalDisplay.innerText = `${sumActual.toFixed(2)}h`;
        }

        const successDisplay = document.getElementById('timer-success-rate');
        if (successDisplay) {
            successDisplay.innerText = `${successRate}%`;
            // Color code success rate
            if (successRate >= 75) {
                successDisplay.className = "text-base md:text-lg font-black text-emerald-600 dark:text-emerald-400";
            } else if (successRate >= 40) {
                successDisplay.className = "text-base md:text-lg font-black text-amber-600 dark:text-amber-400";
            } else {
                successDisplay.className = "text-base md:text-lg font-black text-rose-600 dark:text-rose-400";
            }
        }

        const successSubtitle = document.getElementById('timer-success-rate-subtitle');
        if (successSubtitle) {
            successSubtitle.innerText = `${successDays} of ${range} days met target`;
        }

        const peakValueDisplay = document.getElementById('timer-peak-value');
        const peakDateDisplay = document.getElementById('timer-peak-date');
        if (peakValueDisplay && peakDateDisplay) {
            if (peakDay.actual > 0 && peakDay.date) {
                peakValueDisplay.innerText = `${peakDay.actual.toFixed(2)}h`;
                peakDateDisplay.innerText = peakDay.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            } else {
                peakValueDisplay.innerText = "0.00h";
                peakDateDisplay.innerText = "No Data";
            }
        }

        // 3. Perform Data Aggregation for Chart
        let chartLabels = [];
        let chartActuals = [];
        let chartTargets = [];

        if (grouping === 'weekly') {
            // Group by 7-day windows starting from the most recent day backwards
            const weeks = [];
            const revPoints = [...dailyPoints].reverse();
            let currentWeek = [];

            for (let i = 0; i < revPoints.length; i++) {
                currentWeek.push(revPoints[i]);
                if (currentWeek.length === 7 || i === revPoints.length - 1) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
            }

            // Restore chronological order
            weeks.reverse();

            weeks.forEach(week => {
                const weekActualSum = week.reduce((acc, p) => acc + p.actual, 0);
                const weekTargetSum = week.reduce((acc, p) => acc + p.target, 0);
                const avgWeekActual = parseFloat((weekActualSum / week.length).toFixed(2));
                const avgWeekTarget = parseFloat((weekTargetSum / week.length).toFixed(2));

                chartActuals.push(avgWeekActual);
                chartTargets.push(avgWeekTarget);

                // Week Label (oldest in week to newest)
                const startD = week[week.length - 1].date;
                const endD = week[0].date;
                const startStr = startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const endStr = endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                chartLabels.push(`${startStr} - ${endStr}`);
            });
        } else if (grouping === 'monthly') {
            // Group by calendar month
            const monthlyGroups = {};
            dailyPoints.forEach(p => {
                const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyGroups[key]) {
                    monthlyGroups[key] = [];
                }
                monthlyGroups[key].push(p);
            });

            // Chronological sort
            const sortedKeys = Object.keys(monthlyGroups).sort();

            sortedKeys.forEach(key => {
                const group = monthlyGroups[key];
                const groupActualSum = group.reduce((acc, p) => acc + p.actual, 0);
                const groupTargetSum = group.reduce((acc, p) => acc + p.target, 0);
                const avgGroupActual = parseFloat((groupActualSum / group.length).toFixed(2));
                const avgGroupTarget = parseFloat((groupTargetSum / group.length).toFixed(2));

                chartActuals.push(avgGroupActual);
                chartTargets.push(avgGroupTarget);

                const firstD = group[0].date;
                const labelStr = firstD.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                chartLabels.push(labelStr);
            });
        } else {
            // Daily (default)
            chartLabels = dailyPoints.map(p => window.Utils.formatDate(p.date));
            chartActuals = dailyPoints.map(p => p.actual);
            chartTargets = dailyPoints.map(p => p.target);
        }

        // 4. Set up datasets based on visual style
        let datasets = [];
        const canvasCtx = ctx.getContext('2d');
        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (style === 'combo') {
            // Combo: Actual is Bar with rounded gradients, Target is Line with glow
            let successBarGrad = 'rgba(16, 185, 129, 1.0)';
            let failBarGrad = 'rgba(99, 102, 241, 1.0)';
            try {
                const successGrad = canvasCtx.createLinearGradient(0, 300, 0, 0);
                successGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
                successGrad.addColorStop(1, 'rgba(16, 185, 129, 1.0)');
                successBarGrad = successGrad;

                const failGrad = canvasCtx.createLinearGradient(0, 300, 0, 0);
                failGrad.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
                failGrad.addColorStop(1, 'rgba(99, 102, 241, 1.0)');
                failBarGrad = failGrad;
            } catch (e) {
                console.error(e);
            }

            const barColors = [];
            const barHoverColors = [];
            for (let i = 0; i < chartActuals.length; i++) {
                const met = chartActuals[i] >= chartTargets[i];
                if (met) {
                    barColors.push(successBarGrad);
                    barHoverColors.push('rgba(16, 185, 129, 1)');
                } else {
                    barColors.push(failBarGrad);
                    barHoverColors.push('rgba(99, 102, 241, 1)');
                }
            }

            datasets = [
                {
                    type: 'bar',
                    label: grouping === 'daily' ? 'Actual Focus Hours' : 'Avg Daily Focus (Actual)',
                    data: chartActuals,
                    backgroundColor: barColors,
                    hoverBackgroundColor: barHoverColors,
                    borderRadius: 8,
                    borderWidth: 0,
                    barPercentage: range > 30 && grouping === 'daily' ? 0.8 : 0.6
                },
                {
                    type: 'line',
                    label: grouping === 'daily' ? 'Target Focus Hours' : 'Avg Daily Focus (Target)',
                    data: chartTargets,
                    borderColor: '#f43f5e',
                    borderWidth: 3.5,
                    borderDash: [6, 4],
                    fill: false,
                    tension: 0.4,
                    pointRadius: chartActuals.length > 30 ? 0 : 4.5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: isDark ? '#0f172a' : '#ffffff',
                    pointBorderColor: '#f43f5e',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#f43f5e',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }
            ];
        } else if (style === 'bar') {
            // Bar: Grouped side-by-side actual vs target with premium gradients
            let barActualGrad = 'rgba(99, 102, 241, 1.0)';
            let barTargetGrad = 'rgba(244, 63, 94, 1.0)';
            try {
                const g1 = canvasCtx.createLinearGradient(0, 300, 0, 0);
                g1.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
                g1.addColorStop(1, 'rgba(99, 102, 241, 1.0)');
                barActualGrad = g1;

                const g2 = canvasCtx.createLinearGradient(0, 300, 0, 0);
                g2.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
                g2.addColorStop(1, 'rgba(244, 63, 94, 1.0)');
                barTargetGrad = g2;
            } catch (e) {
                console.error(e);
            }

            datasets = [
                {
                    type: 'bar',
                    label: grouping === 'daily' ? 'Actual Focus Hours' : 'Avg Daily Focus (Actual)',
                    data: chartActuals,
                    backgroundColor: barActualGrad,
                    hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
                    borderRadius: 6,
                    borderWidth: 0
                },
                {
                    type: 'bar',
                    label: grouping === 'daily' ? 'Target Focus Hours' : 'Avg Daily Focus (Target)',
                    data: chartTargets,
                    backgroundColor: barTargetGrad,
                    hoverBackgroundColor: 'rgba(244, 63, 94, 1.0)',
                    borderRadius: 6,
                    borderWidth: 0
                }
            ];
        } else {
            // Line/Area: Line charts with futuristic linear gradients & smooth organic curves
            let actualLineGradient = '#6366f1';
            let actualFillGradient = 'rgba(99, 102, 241, 0.65)';
            try {
                const width = ctx.clientWidth || 500;
                const gradLine = canvasCtx.createLinearGradient(0, 0, width, 0);
                gradLine.addColorStop(0, '#818cf8');    // Bright Light Indigo
                gradLine.addColorStop(0.5, '#6366f1');  // Primary Indigo
                gradLine.addColorStop(1, '#4f46e5');    // Dark Indigo
                actualLineGradient = gradLine;

                const gradFill = canvasCtx.createLinearGradient(0, 0, 0, 300);
                gradFill.addColorStop(0, 'rgba(99, 102, 241, 0.85)'); // Indigo glow at top
                gradFill.addColorStop(0.5, 'rgba(129, 140, 248, 0.55)'); // Lighter indigo fade
                gradFill.addColorStop(1, 'rgba(99, 102, 241, 0)'); // Transparent
                actualFillGradient = gradFill;
            } catch (e) {
                console.error(e);
            }

            datasets = [
                {
                    type: 'line',
                    label: grouping === 'daily' ? 'Actual Focus Hours' : 'Avg Daily Focus (Actual)',
                    data: chartActuals,
                    borderColor: actualLineGradient,
                    borderWidth: 4,
                    backgroundColor: actualFillGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: chartActuals.length > 30 ? 0 : 4,
                    pointHoverRadius: 8,
                    pointBackgroundColor: isDark ? '#0f172a' : '#ffffff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2.5,
                    pointHoverBackgroundColor: '#4f46e5',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                },
                {
                    type: 'line',
                    label: grouping === 'daily' ? 'Target Focus Hours' : 'Avg Daily Focus (Target)',
                    data: chartTargets,
                    borderColor: '#f43f5e',
                    borderWidth: 3.5,
                    borderDash: [6, 4],
                    fill: false,
                    tension: 0.4,
                    pointRadius: chartActuals.length > 30 ? 0 : 4.5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: isDark ? '#0f172a' : '#ffffff',
                    pointBorderColor: '#f43f5e',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#f43f5e',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }
            ];
        }

        // 5. Build and configure the Chart
        const maxVal = Math.max(...chartActuals, ...chartTargets);
        const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.2) : 5;
        const textColor = isDark ? '#94a3b8' : '#64748b';

        Chart.defaults.color = textColor;
        Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';

        // Custom plugins to add futuristic touches
        const shadowPlugin = {
            id: 'timerAnalyticsShadow',
            beforeDatasetDraw: (chart, args) => {
                const { ctx: drawingCtx } = chart;
                const dataset = chart.data.datasets[args.index];
                drawingCtx.save();
                if (dataset.type === 'line') {
                    drawingCtx.shadowColor = (args.index === 0)
                        ? (isDark ? 'rgba(99, 102, 241, 0.65)' : 'rgba(99, 102, 241, 0.45)')
                        : (isDark ? 'rgba(244, 63, 94, 0.55)' : 'rgba(244, 63, 94, 0.35)');
                    drawingCtx.shadowBlur = 10;
                    drawingCtx.shadowOffsetX = 0;
                    drawingCtx.shadowOffsetY = 4;
                }
            },
            afterDatasetDraw: (chart, args) => {
                const { ctx: drawingCtx } = chart;
                drawingCtx.restore();
            }
        };

        const crosshairPlugin = {
            id: 'timerAnalyticsCrosshair',
            afterDraw: (chart) => {
                const activeElements = chart.tooltip?.getActiveElements?.() || chart.tooltip?._active || [];
                if (activeElements.length) {
                    const activePoint = activeElements[0];
                    const { ctx: drawingCtx, chartArea: { top, bottom } } = chart;
                    const x = activePoint.element.x;
                    drawingCtx.save();
                    drawingCtx.beginPath();
                    drawingCtx.moveTo(x, top);
                    drawingCtx.lineTo(x, bottom);
                    drawingCtx.lineWidth = 1.2;
                    drawingCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.08)';
                    drawingCtx.setLineDash([4, 4]);
                    drawingCtx.stroke();
                    drawingCtx.restore();
                }
            }
        };

        window.timerAnalyticsChartInstance = new Chart(canvasCtx, {
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                weight: 'bold',
                                size: 11,
                                family: 'Outfit, Inter, sans-serif'
                            },
                            color: isDark ? '#cbd5e1' : '#475569',
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.15)',
                        borderWidth: 1.5,
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        titleFont: {
                            family: 'Outfit, Inter, sans-serif',
                            weight: '800',
                            size: 12
                        },
                        bodyColor: isDark ? '#cbd5e1' : '#334155',
                        bodyFont: {
                            family: 'Inter, sans-serif',
                            weight: '600',
                            size: 11
                        },
                        footerColor: isDark ? '#818cf8' : '#6366f1',
                        footerFont: {
                            family: 'Inter, sans-serif',
                            weight: '800',
                            size: 10
                        },
                        cornerRadius: 12,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return ` ${label}: ${value.toFixed(2)} hrs`;
                            },
                            footer: function (tooltipItems) {
                                if (tooltipItems.length >= 2) {
                                    const actual = tooltipItems[0].parsed.y;
                                    const target = tooltipItems[1].parsed.y;
                                    const diff = actual - target;
                                    const percent = target > 0 ? Math.round((actual / target) * 100) : 0;
                                    if (diff >= 0) {
                                        return `Goal Met! (+${diff.toFixed(2)}h, ${percent}%)`;
                                    } else {
                                        return `Goal Missed (${diff.toFixed(2)}h, ${percent}%)`;
                                    }
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: yMax,
                        grid: {
                            color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                            drawBorder: false,
                            borderDash: [5, 5]
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: isDark ? '#94a3b8' : '#64748b',
                            font: {
                                weight: 'bold',
                                family: 'Inter, sans-serif',
                                size: 10
                            },
                            padding: 8,
                            callback: v => `${v}h`
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: isDark ? '#94a3b8' : '#64748b',
                            font: {
                                weight: 'bold',
                                family: 'Inter, sans-serif',
                                size: 10
                            },
                            padding: 8,
                            maxTicksLimit: chartLabels.length > 30 ? 6 : (chartLabels.length > 7 ? 10 : 7),
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                }
            },
            plugins: [
                shadowPlugin,
                crosshairPlugin,
                {
                    id: 'targetLineLabel',
                    afterDraw: (chart) => {
                        const { ctx: drawingCtx, chartArea: { right }, scales: { y: yScale } } = chart;
                        const targetHours = window.dailyFocusHoursTarget || 4.0;
                        const yPos = yScale.getPixelForValue(targetHours);

                        if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
                            drawingCtx.save();
                            drawingCtx.fillStyle = '#f43f5e';
                            drawingCtx.font = 'bold 9px Inter, sans-serif';
                            drawingCtx.textAlign = 'right';
                            drawingCtx.textBaseline = 'bottom';
                            drawingCtx.fillText('CURRENT GOAL', right - 4, yPos - 4);
                            drawingCtx.restore();
                        }
                    }
                }
            ]
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
                        updateSubjectTargetUI();
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
            if (AppState.activeTimerState) {
                if (AppState.activeTimerState.isRunning) {
                    AppState.activeTimerState.isRunning = false;
                    if (AppState.activeTimerState.startTime) {
                        AppState.activeTimerState.elapsedBeforeStart += (window.getServerTime() - parseStartTime(AppState.activeTimerState.startTime));
                    }
                    AppState.activeTimerState.startTime = null;
                }

                if (AppState.activeTimerState.timerStates) {
                    Object.keys(AppState.activeTimerState.timerStates).forEach(mode => {
                        const store = AppState.activeTimerState.timerStates[mode];
                        if (store.isRunning) {
                            store.isRunning = false;
                            if (store.startTime) {
                                store.elapsedBeforeStart += (window.getServerTime() - parseStartTime(store.startTime));
                            }
                            store.startTime = null;
                        }
                    });
                }

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
                let targetMode = AppState.activeTimerState.mode;
                if (AppState.activeTimerState.timerStates) {
                    const runningMode = Object.keys(AppState.activeTimerState.timerStates).find(
                        m => AppState.activeTimerState.timerStates[m].isRunning
                    );
                    if (runningMode) {
                        targetMode = runningMode;
                    }
                }

                if (targetMode === AppState.activeTimerState.mode) {
                    AppState.activeTimerState.isRunning = false;
                    AppState.activeTimerState.startTime = null;
                    AppState.activeTimerState.elapsedBeforeStart = 0;
                }

                if (AppState.activeTimerState.timerStates && AppState.activeTimerState.timerStates[targetMode]) {
                    const store = AppState.activeTimerState.timerStates[targetMode];
                    store.isRunning = false;
                    store.startTime = null;
                    store.elapsedBeforeStart = 0;
                    if (targetMode === 'timer') {
                        store.targetDuration = 25 * 60;
                        if (targetMode === AppState.activeTimerState.mode) {
                            AppState.activeTimerState.targetDuration = 25 * 60;
                        }
                    } else if (targetMode === 'alarm') {
                        store.targetDuration = 0;
                        store.alarmStart = '';
                        store.alarmEnd = '';
                        store.alarmUseCurrent = true;
                        if (targetMode === AppState.activeTimerState.mode) {
                            AppState.activeTimerState.targetDuration = 0;
                        }
                    } else {
                        store.targetDuration = 0;
                        if (targetMode === AppState.activeTimerState.mode) {
                            AppState.activeTimerState.targetDuration = 0;
                        }
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
            // Real-time synchronization for Focus Analytics Modal if open
            const timerAnalyticsModal = document.getElementById('timer-analytics-modal');
            if (timerAnalyticsModal && !timerAnalyticsModal.classList.contains('hidden')) {
                if (typeof window.updateTimerAnalyticsControls === 'function') {
                    window.updateTimerAnalyticsControls();
                }
                if (typeof window.renderTimerAnalyticsChart === 'function') {
                    window.renderTimerAnalyticsChart();
                }
                const targetInput = document.getElementById('timer-target-input');
                if (targetInput && document.activeElement !== targetInput) {
                    targetInput.value = window.dailyFocusHoursTarget || 4.0;
                }
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
