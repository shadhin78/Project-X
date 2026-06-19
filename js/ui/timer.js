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
                if (!window.activeTimerState) return;

                let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
                if (window.activeTimerState.isRunning && window.activeTimerState.startTime) {
                    elapsedMs += (Date.now() - window.activeTimerState.startTime);
                }

                let displaySeconds = 0;
                if (window.activeTimerState.mode === 'stopwatch') {
                    displaySeconds = Math.floor(elapsedMs / 1000);
                    const saveBtn = document.getElementById('timer-btn-save');
                    if (saveBtn) {
                        saveBtn.disabled = (displaySeconds === 0);
                    }
                } else {
                    const targetMs = (window.activeTimerState.targetDuration || 0) * 1000;
                    const remainingMs = Math.max(0, targetMs - elapsedMs);
                    displaySeconds = Math.ceil(remainingMs / 1000);

                    if (remainingMs <= 0 && window.activeTimerState.isRunning) {
                        window.activeTimerState.isRunning = false;
                        window.activeTimerState.elapsedBeforeStart = targetMs;
                        window.activeTimerState.startTime = null;

                        playCompletionChime();
                        saveToCloud(true);

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
            }

            function updateTimerUI(displaySeconds) {
                const hrs = Math.floor(displaySeconds / 3600);
                const mins = Math.floor((displaySeconds % 3600) / 60);
                const secs = displaySeconds % 60;
                const clockText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                safeSetText('timer-clock-text', clockText);
                if (window.updateActiveScheduleSlot) {
                    window.updateActiveScheduleSlot();
                }

                const progressRing = document.getElementById('timer-progress-ring');
                if (progressRing) {
                    if (window.activeTimerState.mode === 'stopwatch') {
                        const progress = (displaySeconds % 60) / 60;
                        const offset = 289 - (progress * 289);
                        progressRing.setAttribute('stroke-dashoffset', offset);
                    } else {
                        const target = window.activeTimerState.targetDuration || 1;
                        const progress = Math.min(1, displaySeconds / target);
                        const offset = 289 - (progress * 289);
                        progressRing.setAttribute('stroke-dashoffset', offset);
                    }
                }

                const statusText = document.getElementById('timer-status-text');
                if (statusText) {
                    if (window.activeTimerState.isRunning) {
                        statusText.textContent = 'FOCUSING';
                        statusText.className = 'text-[8px] font-bold uppercase tracking-widest text-emerald-500 mt-2';
                    } else {
                        let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
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
                    if (window.activeTimerState.isRunning) {
                        toggleBtn.textContent = 'PAUSE';
                        toggleBtn.className = 'px-10 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-md active:scale-95 transition-all';
                    } else {
                        toggleBtn.textContent = 'START';
                        toggleBtn.className = 'px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-md active:scale-95 transition-all';
                    }
                }
            }

            window.syncTimerStateFromCloud = function () {
                if (!window.activeTimerState) return;

                const subjectSelect = document.getElementById('timer-subject-select');
                if (subjectSelect && window.activeTimerState.selectedSubject) {
                    subjectSelect.value = window.activeTimerState.selectedSubject;
                }

                const btnStopwatch = document.getElementById('tm-mode-stopwatch');
                const btnTimer = document.getElementById('tm-mode-timer');
                const btnAlarm = document.getElementById('tm-mode-alarm');
                const presetsContainer = document.getElementById('timer-presets-container');
                const alarmContainer = document.getElementById('timer-alarm-container');

                if (btnStopwatch && btnTimer && btnAlarm) {
                    const activeClass = "w-1/3 py-2.5 text-xs font-black rounded-xl transition-all bg-blue-600 text-white shadow";
                    const inactiveClass = "w-1/3 py-2.5 text-xs font-black rounded-xl transition-all text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/80";
                    if (window.activeTimerState.mode === 'stopwatch') {
                        btnStopwatch.className = activeClass;
                        btnTimer.className = inactiveClass;
                        btnAlarm.className = inactiveClass;
                        if (presetsContainer) presetsContainer.classList.add('hidden');
                        if (alarmContainer) alarmContainer.classList.add('hidden');
                    } else if (window.activeTimerState.mode === 'timer') {
                        btnStopwatch.className = inactiveClass;
                        btnTimer.className = activeClass;
                        btnAlarm.className = inactiveClass;
                        if (presetsContainer) {
                            presetsContainer.classList.remove('hidden');
                            presetsContainer.classList.add('flex');
                        }
                        if (alarmContainer) alarmContainer.classList.add('hidden');
                    } else if (window.activeTimerState.mode === 'alarm') {
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

                if (window.activeTimerState.mode === 'alarm') {
                    window.updateAlarmStartText();
                }

                if (window.timerInterval) {
                    clearInterval(window.timerInterval);
                    window.timerInterval = null;
                }

                tickTimer();

                if (window.activeTimerState.isRunning) {
                    window.timerInterval = setInterval(tickTimer, 200);
                }
            };

            window.updateAlarmStartText = function () {
                const useCurrentCb = document.getElementById('timer-alarm-use-current');
                const startInput = document.getElementById('timer-alarm-start');
                if (useCurrentCb && useCurrentCb.checked && startInput && (!window.activeTimerState || !window.activeTimerState.isRunning)) {
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

            window.setTimerMode = function (mode) {
                if (window.activeTimerState.mode === mode) return;
                if (window.activeTimerState.isRunning) {
                    showToast("Please pause the timer before changing modes.", "error");
                    return;
                }
                window.activeTimerState.mode = mode;
                window.activeTimerState.elapsedBeforeStart = 0;
                window.activeTimerState.startTime = null;
                if (mode === 'timer') {
                    window.activeTimerState.targetDuration = 25 * 60;
                } else if (mode === 'alarm') {
                    window.activeTimerState.targetDuration = 0;
                } else {
                    window.activeTimerState.targetDuration = 0;
                }
                saveToCloud(true);
                window.syncTimerStateFromCloud();
            };

            window.setTimerPreset = function (minutes) {
                if (window.activeTimerState.isRunning) {
                    showToast("Please pause the timer before changing presets.", "error");
                    return;
                }
                window.activeTimerState.targetDuration = minutes * 60;
                window.activeTimerState.elapsedBeforeStart = 0;
                window.activeTimerState.startTime = null;
                saveToCloud(true);
                window.syncTimerStateFromCloud();
                showToast(`Timer set to ${minutes} minutes.`, "success");
            };

            window.promptCustomTimer = function () {
                if (window.activeTimerState.isRunning) {
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
                window.activeTimerState.targetDuration = minutes * 60;
                window.activeTimerState.elapsedBeforeStart = 0;
                window.activeTimerState.startTime = null;
                saveToCloud(true);
                window.syncTimerStateFromCloud();
                closeModal('custom-timer-modal');
                showToast(`Timer set to ${minutes} minutes.`, "success");
            };

            window.toggleTimerClick = function () {
                if (!window.activeTimerState) return;

                const subjectSelect = document.getElementById('timer-subject-select');
                if (subjectSelect) {
                    window.activeTimerState.selectedSubject = subjectSelect.value;
                }

                if (window.activeTimerState.isRunning) {
                    window.activeTimerState.isRunning = false;
                    if (window.activeTimerState.startTime) {
                        window.activeTimerState.elapsedBeforeStart += (Date.now() - window.activeTimerState.startTime);
                    }
                    window.activeTimerState.startTime = null;
                } else {
                    if (window.activeTimerState.mode === 'alarm') {
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
                        
                        window.activeTimerState.targetDuration = duration;
                        
                        let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
                        const targetMs = (window.activeTimerState.targetDuration || 0) * 1000;
                        if (elapsedMs >= targetMs) {
                            window.activeTimerState.elapsedBeforeStart = 0;
                        }
                    } else if (window.activeTimerState.mode === 'timer') {
                        let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
                        const targetMs = (window.activeTimerState.targetDuration || 0) * 1000;
                        if (elapsedMs >= targetMs) {
                            window.activeTimerState.elapsedBeforeStart = 0;
                        }
                    }
                    window.activeTimerState.isRunning = true;
                    window.activeTimerState.startTime = Date.now();
                }
                saveToCloud(true);
                window.syncTimerStateFromCloud();
            };

            window.resetTimerClick = function () {
                if (!window.activeTimerState) return;
                window.openConfirmModal(
                    "Reset Timer/Stopwatch?",
                    "Are you sure you want to reset the current session? This will clear all accumulated time.",
                    () => {
                        window.activeTimerState.isRunning = false;
                        window.activeTimerState.startTime = null;
                        window.activeTimerState.elapsedBeforeStart = 0;
                        saveToCloud(true);
                        window.syncTimerStateFromCloud();
                        showToast("Timer reset.", "success");
                    }
                );
            };

            window.saveTimerSession = function () {
                if (!window.activeTimerState) return;

                let elapsedMs = window.activeTimerState.elapsedBeforeStart || 0;
                if (window.activeTimerState.isRunning && window.activeTimerState.startTime) {
                    elapsedMs += (Date.now() - window.activeTimerState.startTime);
                }

                const elapsedSeconds = Math.floor(elapsedMs / 1000);
                if (elapsedSeconds <= 0) {
                    showToast("No focus duration accumulated to save.", "error");
                    return;
                }

                const subject = window.activeTimerState.selectedSubject || 'General Study';
                const mode = window.activeTimerState.mode;

                const newLog = {
                    id: 'timer-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    subject: subject,
                    duration: elapsedSeconds,
                    date: new Date().toISOString(),
                    mode: mode
                };

                if (!window.timerLogs) window.timerLogs = [];
                window.timerLogs.unshift(newLog);

                window.activeTimerState.isRunning = false;
                window.activeTimerState.startTime = null;
                window.activeTimerState.elapsedBeforeStart = 0;

                saveToCloud(true);
                window.syncTimerStateFromCloud();
                window.renderTimerPage();
                showToast(`Saved session: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s for ${subject}.`, "success");
            };

            window.deleteTimerLog = function (logId) {
                window.openConfirmModal(
                    "Delete Study Record?",
                    "Are you sure you want to delete this study record? This action cannot be undone.",
                    () => {
                        if (!window.timerLogs) window.timerLogs = [];
                        window.timerLogs = window.timerLogs.filter(log => log.id !== logId);
                        saveToCloud(true);
                        window.renderTimerPage();
                        showToast("Study session deleted.", "success");
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
                } else if (window.activeTimerState && window.activeTimerState.selectedSubject) {
                    select.value = window.activeTimerState.selectedSubject;
                }
            }

            function getDurationString(totalSeconds) {
                const hrs = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;
                return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            window.renderTimerPage = function () {
                if (!window.timerLogs) window.timerLogs = [];

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

                window.timerLogs.forEach(log => {
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

                    if (window.timerLogs.length === 0) {
                        historyHtml = `
                            <tr>
                                <td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                    No focus sessions recorded yet
                                </td>
                            </tr>
                        `;
                    } else {
                        window.timerLogs.forEach(log => {
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

            document.addEventListener('change', (e) => {
                if (e.target && e.target.id === 'timer-subject-select') {
                    if (window.activeTimerState) {
                        window.activeTimerState.selectedSubject = e.target.value;
                        saveToCloud(true);
                    }
                }
            });

            // Store original parent so we can return the panel after exiting fullscreen
            window._timerFsOriginalParent = null;
            window._timerFsOriginalNext = null;
            window._timerFsActive = false;

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
                // If already exiting, don't double-fire
                if (panel.classList.contains('timer-fs-exiting')) return;

                // Play exit animation
                panel.classList.add('timer-fs-exiting');
                _updateTimerFsBtn(false);

                // Wait for animation to finish, then clean up
                setTimeout(() => {
                    panel.classList.remove('timer-fullscreen', 'timer-fs-exiting', 'dark');
                    document.body.classList.remove('timer-fullscreen-active');
                    window._timerFsActive = false;
                    // Move panel back to its original position in the DOM
                    if (window._timerFsOriginalParent) {
                        if (window._timerFsOriginalNext && window._timerFsOriginalNext.parentNode === window._timerFsOriginalParent) {
                            window._timerFsOriginalParent.insertBefore(panel, window._timerFsOriginalNext);
                        } else {
                            window._timerFsOriginalParent.appendChild(panel);
                        }
                        window._timerFsOriginalParent = null;
                        window._timerFsOriginalNext = null;
                    }
                }, 300); // matches timerFsExit animation duration
            };

            // Listen for fullscreenchange to handle Escape key / browser exit
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

            window.toggleTimerFullscreen = function () {
                const panel = document.getElementById('timer-active-panel');
                if (!panel) return;

                const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;

                // Currently in fullscreen → exit
                if (window._timerFsActive) {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(() => { });
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                    // cleanup is handled by fullscreenchange listener
                    return;
                }

                // Enter fullscreen
                window._timerFsActive = true;

                // Save the panel's current DOM position so we can restore it later
                window._timerFsOriginalParent = panel.parentNode;
                window._timerFsOriginalNext = panel.nextSibling;

                // Move panel to document.body to escape any parent transform/animation containing blocks
                document.body.appendChild(panel);

                panel.classList.add('timer-fullscreen');
                panel.classList.toggle('dark', isDark);
                document.body.classList.add('timer-fullscreen-active');
                _updateTimerFsBtn(true);

                // Request true browser fullscreen (like F11) — no browser chrome, no gaps
                const docEl = document.documentElement;
                const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
                if (requestFs) {
                    requestFs.call(docEl).catch(() => {
                        // Fullscreen API denied (e.g. iframe restrictions) — CSS fallback still works
                    });
                }
            };

            // --- Progressive Web App (PWA) Logic ---
            let deferredPrompt = null;
            const installBtn = document.getElementById('pwa-install-btn');

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                if (installBtn) {
                    installBtn.classList.remove('hidden');
                    installBtn.classList.add('flex');
                }
                console.log("[PWA] beforeinstallprompt event fired.");
            });

            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`[PWA] User response to install prompt: ${outcome}`);
                    if (outcome === 'accepted') {
                        installBtn.classList.add('hidden');
                        installBtn.classList.remove('flex');
                    }
                    deferredPrompt = null;
                });
            }

            window.addEventListener('appinstalled', (evt) => {
                console.log('[PWA] Project X was installed successfully!');
                if (installBtn) {
                    installBtn.classList.add('hidden');
                    installBtn.classList.remove('flex');
                }
                if (typeof showToast === 'function') {
                    showToast('Project X Installed Successfully!', 'success');
                }
            });

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./service-worker.js')
                    .then((reg) => {
                        console.log('[PWA] Service Worker registered successfully:', reg.scope);
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[PWA] New content is available; please refresh.');
                                    if (typeof showToast === 'function') {
                                        showToast('New update available! Refresh to update.', 'info');
                                    }
                                }
                            });
                        });
                    })
                    .catch((err) => {
                        console.error('[PWA] Service Worker registration failed:', err);
                    });
            }
