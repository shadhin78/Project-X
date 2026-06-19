        window.formatDaysPassed = function (daysPassed) {
            if (daysPassed > 30) {
                const months = Math.floor(daysPassed / 30);
                const days = daysPassed % 30;
                const monthStr = months === 1 ? "1 Month" : `${months} Months`;
                if (days > 0) {
                    const dayStr = days === 1 ? "1 Day" : `${days} Days`;
                    return `${monthStr}, ${dayStr}`;
                }
                return monthStr;
            }
            return daysPassed === 1 ? "1 Day" : `${daysPassed} Days`;
        };

        window.paceGoals = [];
        window.globalStartDate = null;
        window.globalEndDate = null;

        function getSubjectColor(subjName) {
            if (subjectColors[subjName]) return subjectColors[subjName];
            const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
            let hash = 0;
            for (let i = 0; i < subjName.length; i++) hash = subjName.charCodeAt(i) + ((hash << 5) - hash);
            const color = colors[Math.abs(hash) % colors.length];
            subjectColors[subjName] = color;
            return color;
        }

        window.getProgramColor = function (pName) {
            const allProgs = window.getAllPrograms().map(p => p.name || p);
            const idx = allProgs.indexOf(pName);
            if (idx !== -1) {
                return dynamicLineColors[idx % dynamicLineColors.length];
            }
            return '#6366f1';
        };

        const dynamicLineColors = ['#6366f1', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6'];

        let isInitialLoad = true;
        window.currentFilter = 'All';

        window.PLAN_START_DATE = new Date();
        PLAN_START_DATE.setHours(0, 0, 0, 0);
        window.PLAN_END_DATE = new Date();
        PLAN_END_DATE.setMonth(PLAN_END_DATE.getMonth() + 10);
        PLAN_END_DATE.setHours(23, 59, 59, 999);

        function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
        function safeSetHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
        function safeSetClass(id, className) { const el = document.getElementById(id); if (el) el.className = className; }
        function formatDate(dateObj) { return `${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getDate()}`; }

        function getTaskDate(task) {
            const baseDate = new Date(PLAN_START_DATE.getTime());
            baseDate.setDate(baseDate.getDate() + (task.id - 1));
            return baseDate;
        }

        function parseDateSafe(dateStr) {
            if (!dateStr) return new Date();
            if (dateStr instanceof Date) return new Date(dateStr.getTime());
            if (typeof dateStr === 'object') {
                if (typeof dateStr.toDate === 'function') return dateStr.toDate();
                if (dateStr.seconds !== undefined) return new Date(dateStr.seconds * 1000);
            }
            // Try parsing directly first
            let parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) return parsed;

            // Fallback split logic if direct parsing failed and it has dashes
            if (typeof dateStr === 'string' && dateStr.includes('-')) {
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts.map(Number);
                    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                        return new Date(y, m - 1, d);
                    }
                }
            }
            return new Date();
        }

        // Grade-based: A=4.00, B=3.00, C=2.25, D=2.00, E=0.00, F=0.00
        window.openModal = function (modalId, typeKey = null) {
            if (modalId === 'analytics-modal' && typeKey) populateAnalyticsModal(typeKey);
            const backdrops = { 'sync-dashboard-modal': 'sdm-backdrop', 'create-schedule-group-modal': 'csgm-backdrop', 'pace-candle-modal': 'pcm-backdrop', 'program-trend-modal': 'ptm-results-backdrop', 'analytics-modal': 'am-backdrop', 'yearly-actions-modal': 'ym-backdrop', 'subject-trend-modal': 'stm-backdrop', 'edit-task-modal': 'etm-backdrop', 'edit-pace-modal': 'epm-backdrop', 'edit-trends-pace-modal': 'etpm-backdrop', 'pace-trend-modal': 'ptm-backdrop', 'goal-details-modal': 'gdm-backdrop', 'revision-manage-modal': 'rmm-backdrop', 'revision-trend-modal': 'rvm-backdrop', 'global-history-modal': 'ghm-backdrop', 'subject-time-modal': 'stm-time-backdrop', 'daily-actions-db-modal': 'dadb-backdrop', 'weekly-targets-db-modal': 'wtdb-backdrop', 'result-modal': 'resm-backdrop', 'edit-subject-modal': 'esm-backdrop', 'edit-track-modal': 'etm-track-backdrop', 'custom-timer-modal': 'ctm-backdrop', 'account-settings-modal': 'asm-account-backdrop', 'add-schedule-modal': 'asm-schedule-backdrop' };
            const contents = { 'sync-dashboard-modal': 'sdm-content', 'create-schedule-group-modal': 'csgm-content', 'pace-candle-modal': 'pcm-content', 'program-trend-modal': 'ptm-results-content', 'analytics-modal': 'am-content', 'yearly-actions-modal': 'ym-content', 'subject-trend-modal': 'stm-content', 'edit-task-modal': 'etm-content', 'edit-pace-modal': 'epm-content', 'edit-trends-pace-modal': 'etpm-content', 'pace-trend-modal': 'ptm-content', 'goal-details-modal': 'gdm-content', 'revision-manage-modal': 'rmm-content', 'revision-trend-modal': 'rvm-content', 'global-history-modal': 'ghm-content', 'subject-time-modal': 'stm-time-content', 'daily-actions-db-modal': 'dadb-content', 'weekly-targets-db-modal': 'wtdb-content', 'result-modal': 'resm-content', 'edit-subject-modal': 'esm-content', 'edit-track-modal': 'etm-track-content', 'custom-timer-modal': 'ctm-content', 'account-settings-modal': 'asm-account-content', 'add-schedule-modal': 'asm-schedule-content' };
            const modal = document.getElementById(modalId); const backdrop = document.getElementById(backdrops[modalId]); const content = document.getElementById(contents[modalId]);
            if (!modal || !backdrop || !content) return;

            modal.classList.remove('hidden'); void modal.offsetWidth;
            backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
            content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
            document.body.classList.add('overflow-hidden');

            if (modalId === 'revision-trend-modal') {
                window.renderRevisionTrendChart();
            }

            // Critical Fix: Sync all charts properly by giving the CSS transform transition time (300ms) to complete
            // before recalculating canvas dimensions. This applies to Analytics, Yearly, Pace, and Subject modals perfectly.
            setTimeout(() => {
                if (modalId === 'yearly-actions-modal' && window.yearlyChartActions) window.yearlyChartActions.resize();
                if (modalId === 'subject-trend-modal' && window.subjectTrendChart) window.subjectTrendChart.resize();
                if (modalId === 'revision-trend-modal' && window.revisionTrendChartInstance) window.revisionTrendChartInstance.resize();
                if (modalId === 'pace-trend-modal' && window.paceTrendChartInstance) window.paceTrendChartInstance.resize();
                if (modalId === 'analytics-modal' && masterLineChart) masterLineChart.resize();
                if (modalId === 'global-history-modal' && window.globalHistoryChartInstance) window.globalHistoryChartInstance.resize();
                if (modalId === 'daily-actions-db-modal' && window.dadbTrendChartInstance) window.dadbTrendChartInstance.resize();
                if (modalId === 'weekly-targets-db-modal' && window.wtdbMixedChartInstance) window.wtdbMixedChartInstance.resize();
                if (modalId === 'program-trend-modal' && window.programTrendChartInstance) window.programTrendChartInstance.resize();
                if (modalId === 'program-trend-modal' && window.subjectWiseChartInstance) window.subjectWiseChartInstance.resize();
                if (modalId === 'pace-candle-modal' && window.paceCandleChartInstance) window.paceCandleChartInstance.resize();
            }, 320);
        };

        window.closeModal = function (modalId) {
            const backdrops = { 'sync-dashboard-modal': 'sdm-backdrop', 'create-schedule-group-modal': 'csgm-backdrop', 'pace-candle-modal': 'pcm-backdrop', 'program-trend-modal': 'ptm-results-backdrop', 'analytics-modal': 'am-backdrop', 'yearly-actions-modal': 'ym-backdrop', 'subject-trend-modal': 'stm-backdrop', 'edit-task-modal': 'etm-backdrop', 'edit-pace-modal': 'epm-backdrop', 'edit-trends-pace-modal': 'etpm-backdrop', 'pace-trend-modal': 'ptm-backdrop', 'goal-details-modal': 'gdm-backdrop', 'revision-manage-modal': 'rmm-backdrop', 'revision-trend-modal': 'rvm-backdrop', 'global-history-modal': 'ghm-backdrop', 'subject-time-modal': 'stm-time-backdrop', 'daily-actions-db-modal': 'dadb-backdrop', 'weekly-targets-db-modal': 'wtdb-backdrop', 'result-modal': 'resm-backdrop', 'edit-subject-modal': 'esm-backdrop', 'edit-track-modal': 'etm-track-backdrop', 'custom-timer-modal': 'ctm-backdrop', 'account-settings-modal': 'asm-account-backdrop', 'add-schedule-modal': 'asm-schedule-backdrop' };
            const contents = { 'sync-dashboard-modal': 'sdm-content', 'create-schedule-group-modal': 'csgm-content', 'pace-candle-modal': 'pcm-content', 'program-trend-modal': 'ptm-results-content', 'analytics-modal': 'am-content', 'yearly-actions-modal': 'ym-content', 'subject-trend-modal': 'stm-content', 'edit-task-modal': 'etm-content', 'edit-pace-modal': 'epm-content', 'edit-trends-pace-modal': 'etpm-content', 'pace-trend-modal': 'ptm-content', 'goal-details-modal': 'gdm-content', 'revision-manage-modal': 'rmm-content', 'revision-trend-modal': 'rvm-content', 'global-history-modal': 'ghm-content', 'subject-time-modal': 'stm-time-content', 'daily-actions-db-modal': 'dadb-content', 'weekly-targets-db-modal': 'wtdb-content', 'result-modal': 'resm-content', 'edit-subject-modal': 'esm-content', 'edit-track-modal': 'etm-track-content', 'custom-timer-modal': 'ctm-content', 'account-settings-modal': 'asm-account-content', 'add-schedule-modal': 'asm-schedule-content' };
            const modal = document.getElementById(modalId); const backdrop = document.getElementById(backdrops[modalId]); const content = document.getElementById(contents[modalId]);
            if (!modal || !backdrop || !content) return;

            backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
            content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
            setTimeout(() => { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }, 300);
        };

        window.pendingDeleteAction = null;

        window.openConfirmModal = function (title, message, actionCallback) {
            document.getElementById('cm-title').textContent = title;
            document.getElementById('cm-message').textContent = message;
            window.pendingDeleteAction = actionCallback;
            const modal = document.getElementById('confirm-modal');
            const backdrop = document.getElementById('cm-backdrop');
            const content = document.getElementById('cm-content');
            if (!modal || !backdrop || !content) return;
            modal.classList.remove('hidden'); void modal.offsetWidth;
            backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
            content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
            document.body.classList.add('overflow-hidden');
        };

        window.closeConfirmModal = function () {
            const modal = document.getElementById('confirm-modal');
            const backdrop = document.getElementById('cm-backdrop');
            const content = document.getElementById('cm-content');
            if (!modal || !backdrop || !content) return;
            backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
            content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
            setTimeout(() => { modal.classList.add('hidden'); window.pendingDeleteAction = null; document.body.classList.remove('overflow-hidden'); }, 300);
        };

        window.executeConfirmedDelete = function () {
            if (window.pendingDeleteAction) window.pendingDeleteAction();
            window.closeConfirmModal();
        };

        window.showCongratsModal = function () {
            const modal = document.getElementById('congrats-modal');
            const backdrop = document.getElementById('congrats-backdrop');
            const content = document.getElementById('congrats-content');
            const dateEl = document.getElementById('congrats-end-date');

            if (!modal || !backdrop || !content) return;

            const today = new Date();
            dateEl.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            window.switchCongratsPage(1);

            modal.classList.remove('hidden');
            void modal.offsetWidth;
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
            content.classList.remove('scale-50', 'opacity-0', 'translate-y-10');
            content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
            document.body.classList.add('overflow-hidden');

            setTimeout(() => window.fireConfetti(), 300);
        };

        window.switchCongratsPage = function (pageNum) {
            const page1 = document.getElementById('congrats-page-1');
            const page2 = document.getElementById('congrats-page-2');
            if (!page1 || !page2) return;

            if (pageNum === 1) {
                page2.classList.add('hidden');
                page1.classList.remove('hidden');
            } else {
                page1.classList.add('hidden');
                page2.classList.remove('hidden');
                window.renderCongratsSummary();
            }
        };

        window.renderCongratsSummary = function () {
            const listContainer = document.getElementById('congrats-summary-list');
            if (!listContainer) return;

            const activeResults = window.getProcessedResults();

            if (!activeResults || activeResults.length === 0) {
                listContainer.innerHTML = '<div class="text-center py-8 text-slate-400"><span class="text-4xl block mb-3 opacity-50 grayscale">🌟</span><p class="text-xs font-black uppercase tracking-widest">You conquered the syllabus!</p><p class="text-[10px] mt-1 font-bold">No explicit achievements logged yet.</p></div>';
                return;
            }

            const sorted = [...activeResults].sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
            let html = '';
            sorted.forEach(res => {
                const isCgpa = res.type === 'cgpa';
                let colorClass = 'yellow';
                let badgeText = 'Achievement';
                let icon = '🏆';
                let displayTitle = res.title;

                if (isCgpa) {
                    if (res.subject) {
                        colorClass = 'emerald';
                        badgeText = 'Subject CGPA';
                        icon = '📚';
                        displayTitle = `${res.title} - ${res.subject}`;
                    } else {
                        colorClass = 'blue';
                        badgeText = 'Program CGPA';
                        icon = '🎓';
                    }
                }
                const dateStr = parseDateSafe(res.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                const isFailed = isCgpa && (
                    res.evaluationType === 'grade'
                        ? (res.grade && ['C', 'D', 'E', 'F'].includes(res.grade.trim().toUpperCase()))
                        : (res.value && parseFloat(res.value) < 2.0)
                );

                const valColor = isFailed ? 'text-red-500 dark:text-red-400' : `text-${colorClass}-600 dark:text-${colorClass}-400`;
                const gradeColor = isFailed ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-400';

                html += `
                <div class="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3 hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div class="text-2xl sm:text-3xl drop-shadow-sm">${icon}</div>
                        <div class="flex flex-col truncate pr-2">
                            <span class="text-[10px] font-black uppercase tracking-widest text-${colorClass}-500 dark:text-${colorClass}-400 mb-0.5">${badgeText}</span>
                            <span class="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">${displayTitle}</span>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${dateStr}</span>
                        </div>
                    </div>
                    <div class="shrink-0 bg-white dark:bg-slate-800 px-3 sm:px-4 py-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-center min-w-[3.5rem] flex flex-col justify-center items-center">
                        <span class="text-xs sm:text-sm font-black ${valColor} leading-none">${res.value || 'N/A'}</span>
                        ${res.grade ? `<span class="text-[8px] font-bold ${gradeColor} mt-0.5">${res.grade}</span>` : ''}
                        ${isCgpa ? `<span class="inline-block text-[7px] font-black px-1 mt-1 rounded ${isFailed ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'}">${isFailed ? 'FAIL' : 'PASS'}</span>` : ''}
                    </div>
                </div>`;
            });
            listContainer.innerHTML = html;
        };

        window.closeCongratsModal = function () {
            const modal = document.getElementById('congrats-modal');
            const backdrop = document.getElementById('congrats-backdrop');
            const content = document.getElementById('congrats-content');

            backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
            content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
            content.classList.add('scale-95', 'opacity-0', 'translate-y-4');

            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }, 500);
        };

        window.fireConfetti = function () {
            const canvas = document.getElementById('confetti-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const particles = [];
            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4'];

            // Initial Firework Burst
            for (let i = 0; i < 200; i++) {
                particles.push({
                    x: canvas.width / 2,
                    y: canvas.height / 2 + 100,
                    r: Math.random() * 6 + 3,
                    dx: Math.random() * 24 - 12,
                    dy: Math.random() * -24 - 5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    tilt: Math.floor(Math.random() * 10) - 10,
                    tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
                    tiltAngle: 0,
                    type: Math.random() > 0.5 ? 'circle' : 'rect'
                });
            }

            let animationId;
            function render() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach((p, index) => {
                    p.tiltAngle += p.tiltAngleIncrement;
                    p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
                    p.x += Math.sin(p.tiltAngle) * 2;
                    p.dy += 0.08; // gravity
                    p.x += p.dx;
                    p.y += p.dy;

                    ctx.beginPath();
                    if (p.type === 'circle') {
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.fill();
                    } else {
                        ctx.lineWidth = p.r;
                        ctx.strokeStyle = p.color;
                        ctx.moveTo(p.x + p.tilt + p.r, p.y);
                        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
                        ctx.stroke();
                    }

                    if (p.y > canvas.height || p.x < -50 || p.x > canvas.width + 50) {
                        particles.splice(index, 1);
                    }
                });

                if (particles.length > 0) {
                    animationId = requestAnimationFrame(render);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            render();

            // Raining Flowers/Confetti phase
            let shoots = 0;
            let shootInterval = setInterval(() => {
                shoots++;
                if (shoots > 8) {
                    clearInterval(shootInterval);
                    return;
                }
                for (let i = 0; i < 40; i++) {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: -20,
                        r: Math.random() * 6 + 3,
                        dx: Math.random() * 4 - 2,
                        dy: Math.random() * 5 + 2,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        tilt: Math.floor(Math.random() * 10) - 10,
                        tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
                        tiltAngle: 0,
                        type: Math.random() > 0.5 ? 'circle' : 'rect'
                    });
                }
            }, 600);
        };

        function showToast(msg, type) {
            const t = document.getElementById('toast-message'); if (!t) return;
            t.textContent = msg;
            t.className = `mt-5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl px-5 py-3 text-center transition-all duration-300 w-full md:w-auto self-start border shadow-md ${type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'}`;
            t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 4000);
        }

        // Fast global resize listener to ensure all canvas charts remain perfectly responsive across device orientations
        let resizeDebounceTimer = null;
        window.addEventListener('resize', () => {
            if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
            resizeDebounceTimer = setTimeout(() => {
                const charts = [
                    progressChart, window.mainChartPrograms, window.monthlyChartActions,
                    window.yearlyChartActions, window.subjectTrendChart, window.paceTrendChartInstance,
                    window.revisionTrendChartInstance, window.globalHistoryChartInstance, masterLineChart,
                    window.dadbTrendChartInstance, window.resultsTrendChartInstance, window.programTrendChartInstance
                ];
                charts.forEach(c => { if (c && typeof c.resize === 'function') c.resize(); });
            }, 50);
        });

        // ==========================================
        // DYNAMIC TRACKS CONFIGURATION SYSTEM
        // ==========================================


// Expose functions to window namespace
window.getSubjectColor = getSubjectColor;
window.safeSetText = safeSetText;
window.safeSetHtml = safeSetHtml;
window.safeSetClass = safeSetClass;
window.formatDate = formatDate;
window.getTaskDate = getTaskDate;
window.parseDateSafe = parseDateSafe;
window.showToast = showToast;
