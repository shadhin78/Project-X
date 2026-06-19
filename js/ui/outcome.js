        window.mapGradeToNumeric = function (grade, evalType = 'cgpa') {
            if (!grade) return 0.0;
            const g = grade.toUpperCase().trim();
            if (evalType === 'grade') {
                switch (g) {
                    case 'A': return 4.0;
                    case 'B': return 3.0;
                    case 'C': return 2.25;
                    case 'D': return 2.00;
                    case 'E': return 0.0;
                    case 'F': return 0.0;
                    default: return 0.0;
                }
            } else {
                switch (g) {
                    case 'A+': return 4.0;
                    case 'A': return 3.75;
                    case 'A-': return 3.50;
                    case 'B+': return 3.25;
                    case 'B': return 3.00;
                    case 'B-': return 2.75;
                    case 'C+': return 2.50;
                    case 'C': return 2.25;
                    case 'D': return 2.00;
                    case 'F': return 0.00;
                    default: return 0.0;
                }
            }
        };

        // CGPA-based: estimate grade with +/- from numeric CGPA (4.0 scale)
        window.mapCgpaToGrade = function (cgpa, evalType = 'cgpa') {
            const v = parseFloat(cgpa);
            if (isNaN(v)) return '';
            if (evalType === 'grade') {
                if (v >= 4.0) return 'A';
                if (v >= 3.0) return 'B';
                if (v >= 2.25) return 'C';
                if (v >= 2.0) return 'D';
                if (v >= 0.01) return 'E';
                return 'F';
            } else {
                if (v >= 4.0) return 'A+';
                if (v >= 3.75) return 'A';
                if (v >= 3.5) return 'A-';
                if (v >= 3.25) return 'B+';
                if (v >= 3.0) return 'B';
                if (v >= 2.75) return 'B-';
                if (v >= 2.5) return 'C+';
                if (v >= 2.25) return 'C';
                if (v >= 2.0) return 'D';
                return 'F';
            }
        };

        window.formatCgpaMin2Dec = function (val) {
            let parsed = parseFloat(val);
            if (isNaN(parsed)) return '';
            return parsed.toFixed(2);
        };

        window.validateAndFormatCgpa = function (valStr) {
            if (!valStr || valStr.trim() === '') return '';
            let val = parseFloat(valStr);
            if (isNaN(val)) return '';
            if (val < 0) val = 0.00;
            if (val > 4.0) val = 4.00;
            return window.formatCgpaMin2Dec(val);
        };

        window.onCgpaBlur = function (inputEl) {
            const formatted = window.validateAndFormatCgpa(inputEl.value);
            inputEl.value = formatted;
            window.onCgpaInput(inputEl);
        };

        // Called when a CGPA input changes → update sibling auto-grade badge
        window.onCgpaInput = function (inputEl) {
            let valStr = inputEl.value;
            // Remove negative signs and invalid characters
            valStr = valStr.replace(/[^0-9.]/g, '');
            // Prevent multiple decimal points
            const parts = valStr.split('.');
            if (parts.length > 2) {
                valStr = parts[0] + '.' + parts.slice(1).join('');
            }
            // Real-time clamp (prevent value > 4)
            let val = parseFloat(valStr);
            if (!isNaN(val)) {
                if (val < 0) valStr = '0.00';
                if (val > 4.0) valStr = '4.00';
            }
            if (inputEl.value !== valStr) {
                inputEl.value = valStr;
            }

            const badge = inputEl.parentElement.querySelector('.auto-grade-badge');
            if (badge) {
                const g = window.mapCgpaToGrade(inputEl.value);
                badge.textContent = g || '—';
                badge.classList.toggle('opacity-40', !g);
            }
        };

        // Helper to update auto-cgpa badge based on grade selection
        window.updateCgpaBadge = function (gradeVal, badge) {
            if (badge) {
                const evalType = document.getElementById('res-evaluation-type')?.value || 'cgpa';
                const c = window.mapGradeToNumeric(gradeVal, evalType);
                badge.textContent = gradeVal ? window.formatCgpaMin2Dec(c) : '—';
                badge.classList.toggle('opacity-40', !gradeVal);
            }
        };

        // Called when a grade select changes → update sibling auto-cgpa badge
        window.onGradeSelect = function (selectEl) {
            const badge = selectEl.parentElement.querySelector('.auto-cgpa-badge');
            window.updateCgpaBadge(selectEl.value, badge);
        };

        // Helper to retrieve program's target CGPA and Grade from configuration or history
        window.getProgramMainTarget = function (progName) {
            let targetCGPA = '';
            for (const trackId in window.customPrograms) {
                const progList = window.customPrograms[trackId];
                if (Array.isArray(progList)) {
                    const prog = progList.find(p => (p.name || p) === progName);
                    if (prog && typeof prog === 'object' && prog.targetCGPA !== undefined && prog.targetCGPA !== null) {
                        targetCGPA = prog.targetCGPA.toString().trim();
                        if (targetCGPA) break;
                    }
                }
            }
            if (!targetCGPA) {
                const overallRecords = window.successResults
                    .filter(r => r.type === 'cgpa' && !r.subject && r.title === progName)
                    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
                if (overallRecords.length > 0 && overallRecords[0].targetCGPA) {
                    targetCGPA = overallRecords[0].targetCGPA.toString().trim();
                }
            }
            if (!targetCGPA) {
                const anyRecords = window.successResults
                    .filter(r => r.type === 'cgpa' && r.title === progName && r.targetCGPA)
                    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
                if (anyRecords.length > 0) {
                    targetCGPA = anyRecords[0].targetCGPA.toString().trim();
                }
            }
            let targetGrade = '';
            if (targetCGPA) {
                if (targetCGPA.toLowerCase() === 'none' || targetCGPA === '0') {
                    targetCGPA = 'none';
                    targetGrade = 'none';
                } else {
                    targetGrade = window.mapCgpaToGrade(targetCGPA);
                }
            }
            return { targetCGPA, targetGrade };
        };

        // Update all subject target badges from the overall program target
        window.updateSubjectTargets = function () {
            const evalType = document.getElementById('res-evaluation-type').value;
            const isGrade = evalType === 'grade';
            let targetCgpa = '';
            let targetGrade = '';
            if (isGrade) {
                targetGrade = (document.getElementById('res-overall-target-grade')?.value || '').trim();
                if (targetGrade.toLowerCase() === 'none' || targetGrade === '0') {
                    targetGrade = 'none';
                    targetCgpa = 'none';
                } else {
                    targetCgpa = targetGrade ? window.formatCgpaMin2Dec(window.mapGradeToNumeric(targetGrade, evalType)) : '';
                }
            } else {
                targetCgpa = (document.getElementById('res-overall-target-cgpa')?.value || '').trim();
                if (targetCgpa.toLowerCase() === 'none' || targetCgpa === '0') {
                    targetCgpa = 'none';
                    targetGrade = 'none';
                } else {
                    targetGrade = targetCgpa ? window.mapCgpaToGrade(targetCgpa) : '';
                }
            }

            // Prefill is handled on program select change, not continuously on edit.

            document.querySelectorAll('.res-sub-target-badge').forEach(badge => {
                if (targetCgpa && targetCgpa !== 'none' && targetGrade && targetGrade !== 'none') {
                    badge.textContent = isGrade ? `Target: ${targetGrade} (${targetCgpa})` : `Target: ${targetCgpa} (${targetGrade})`;
                    badge.classList.remove('opacity-30');
                } else if (targetCgpa === 'none') {
                    badge.textContent = 'Target: None';
                    badge.classList.add('opacity-30');
                } else {
                    badge.textContent = 'Target: —';
                    badge.classList.add('opacity-30');
                }
            });
        };

        // Real-time overall score estimation from subject inputs in modal
        window.updateModalEstScore = function () {
            const evalTypeEl = document.getElementById('res-evaluation-type');
            if (!evalTypeEl) return;
            const evalType = evalTypeEl.value;
            const isGrade = evalType === 'grade';

            const estCgpaEl = document.getElementById('res-overall-est-cgpa');
            const estGradeEl = document.getElementById('res-overall-est-grade');

            if (isGrade) {
                const gradeInputs = document.querySelectorAll('.res-sub-grade-input');
                const grades = [];
                gradeInputs.forEach(input => {
                    const val = input.value.trim();
                    if (val) grades.push(val);
                });

                if (grades.length > 0) {
                    const sumCgpa = grades.reduce((sum, g) => sum + window.mapGradeToNumeric(g, 'grade'), 0);
                    const avgCgpa = sumCgpa / grades.length;
                    const estGrade = window.mapCgpaToGrade(avgCgpa, 'grade');

                    if (estGradeEl) estGradeEl.value = estGrade;
                    const badge = estGradeEl ? estGradeEl.parentElement.querySelector('.auto-cgpa-badge') : null;
                    if (badge) {
                        badge.textContent = window.formatCgpaMin2Dec(avgCgpa);
                        badge.classList.remove('opacity-40');
                    }
                } else {
                    if (estGradeEl) estGradeEl.value = '';
                    const badge = estGradeEl ? estGradeEl.parentElement.querySelector('.auto-cgpa-badge') : null;
                    if (badge) {
                        badge.textContent = '—';
                        badge.classList.add('opacity-40');
                    }
                }
            } else {
                const cgpaInputs = document.querySelectorAll('.res-sub-cgpa-input');
                const cgpas = [];
                cgpaInputs.forEach(input => {
                    const val = parseFloat(input.value.trim());
                    if (!isNaN(val)) cgpas.push(val);
                });

                if (cgpas.length > 0) {
                    const avgCgpa = cgpas.reduce((sum, c) => sum + c, 0) / cgpas.length;
                    const estGrade = window.mapCgpaToGrade(avgCgpa, 'cgpa');

                    if (estCgpaEl) estCgpaEl.value = window.formatCgpaMin2Dec(avgCgpa);
                    const badge = estCgpaEl ? estCgpaEl.parentElement.querySelector('.auto-grade-badge') : null;
                    if (badge) {
                        badge.textContent = estGrade || '—';
                        badge.classList.remove('opacity-40');
                    }
                } else {
                    if (estCgpaEl) estCgpaEl.value = '';
                    const badge = estCgpaEl ? estCgpaEl.parentElement.querySelector('.auto-grade-badge') : null;
                    if (badge) {
                        badge.textContent = '—';
                        badge.classList.add('opacity-40');
                    }
                }
            }
        };

        window.dadbSortOrder = window.dadbSortOrder || 'desc';
        window.dadbActionFilter = window.dadbActionFilter || 'ALL';

        window.toggleDadbSort = function () {
            const states = ['desc', 'asc', 'pct-desc', 'pct-asc'];
            let idx = states.indexOf(window.dadbSortOrder);
            window.dadbSortOrder = states[(idx + 1) % states.length];
            window.openDailyActionsDBModal();
        };

        window.setDadbFilter = function (val) {
            window.dadbActionFilter = val;
            window.openDailyActionsDBModal();
        };

        window.toggleTrendDataset = function (type) {
            window.trendDatasetVisibility[type] = !window.trendDatasetVisibility[type];
            window.renderResults();
        };

        window.programTrendChartInstance = null;
        window.programTrendDatasetVisibility = { actual: true, target: true };

        window.toggleProgramTrendDataset = function (type) {
            window.programTrendDatasetVisibility[type] = !window.programTrendDatasetVisibility[type];
            if (window.currentAnalyticsProgram) {
                window.renderProgramTrendModal(window.currentAnalyticsProgram);
            }
        };

        window.showProgramAnalytics = function (progName) {
            window.currentAnalyticsProgram = progName;
            window.currentProgramAnalyticsView = 'overall';
            const titleEl = document.getElementById('ptm-results-title');
            if (titleEl) titleEl.textContent = `${progName} Progression`;
            window.switchProgramAnalyticsView('overall');
            openModal('program-trend-modal');
        };

        window.switchProgramAnalyticsView = function (view) {
            window.currentProgramAnalyticsView = view;
            const overallPanel = document.getElementById('ptm-overall-panel');
            const subjectPanel = document.getElementById('ptm-subject-panel');
            const btnOverall = document.getElementById('ptm-tab-overall');
            const btnSubject = document.getElementById('ptm-tab-subject');

            const activeTab = 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105';
            const inactiveTab = 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';

            if (view === 'overall') {
                overallPanel.classList.remove('hidden');
                subjectPanel.classList.add('hidden');
                btnOverall.className = `flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab}`;
                btnSubject.className = `flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${inactiveTab}`;
                window.renderProgramTrendModal(window.currentAnalyticsProgram);
            } else {
                overallPanel.classList.add('hidden');
                subjectPanel.classList.remove('hidden');
                btnOverall.className = `flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${inactiveTab}`;
                btnSubject.className = `flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab}`;
                window.renderSubjectWiseTrend(window.currentAnalyticsProgram);
            }
        };

        window.renderProgramTrendModal = function (progName) {
            const canvas = document.getElementById('programTrendCanvas');
            const legendEl = document.getElementById('program-trend-legend');
            if (!canvas) return;

            // Filter CGPAs for this specific program (overall only, no subjects)
            let cgpaResults = window.getProcessedResults()
                .filter(r => r.type === 'cgpa' && !r.subject && r.title === progName);

            cgpaResults.sort((a, b) => parseDateSafe(a.date) - parseDateSafe(b.date));

            // Calculate overall stats for legend
            let latestActual = '0.00';
            let latestTarget = '0.00';
            if (cgpaResults.length > 0) {
                latestActual = window.formatCgpaMin2Dec(parseFloat(cgpaResults[cgpaResults.length - 1].value) || 0);
                latestTarget = window.formatCgpaMin2Dec(parseFloat(cgpaResults[cgpaResults.length - 1].targetCGPA) || 0);
            }

            // Legend rendering
            if (legendEl) {
                const getLegendHtml = (idxKey, color, label, val) => {
                    const active = window.programTrendDatasetVisibility[idxKey];
                    return `<div onclick="window.toggleProgramTrendDataset('${idxKey}')" class="cursor-pointer flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all ${active ? 'opacity-100 scale-100 shadow-md' : 'opacity-40 grayscale scale-95 line-through'}"><div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">${label}: ${val}</span></div>`;
                };
                legendEl.innerHTML =
                    getLegendHtml('actual', '#06b6d4', 'Actual CGPA', latestActual) +
                    getLegendHtml('target', '#f59e0b', 'Target CGPA', latestTarget);
            }

            if (cgpaResults.length === 0) {
                if (window.programTrendChartInstance) window.programTrendChartInstance.destroy();
                return;
            }

            const labels = cgpaResults.map(r => {
                const d = parseDateSafe(r.date);
                const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                return `${r.title} (${dateStr})`;
            });
            const actualData = cgpaResults.map(r => parseFloat(r.value) || null);
            const targetData = cgpaResults.map(r => parseFloat(r.targetCGPA) || null);

            const allNumericValues = [];
            cgpaResults.forEach(r => {
                const act = parseFloat(r.value);
                const tgt = parseFloat(r.targetCGPA);
                if (!isNaN(act)) allNumericValues.push(act);
                if (!isNaN(tgt)) allNumericValues.push(tgt);
            });
            const yMin = 0;
            const maxVal = allNumericValues.length > 0 ? Math.max(...allNumericValues) : 4.0;
            const yMax = maxVal > 4.0 ? 5.0 : 4.0;

            if (window.programTrendChartInstance) window.programTrendChartInstance.destroy();

            const canvasCtx = canvas.getContext('2d');

            window.programTrendChartInstance = new Chart(canvasCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Actual CGPA',
                            data: actualData,
                            backgroundColor: '#06b6d4',
                            borderColor: '#06b6d4',
                            borderWidth: 0,
                            borderRadius: 6,
                            borderSkipped: false,
                            hidden: !window.programTrendDatasetVisibility.actual
                        },
                        {
                            label: 'Target CGPA',
                            data: targetData,
                            backgroundColor: '#f59e0b',
                            borderColor: '#f59e0b',
                            borderWidth: 0,
                            borderRadius: 6,
                            borderSkipped: false,
                            hidden: !window.programTrendDatasetVisibility.target
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            usePointStyle: true,
                            boxPadding: 6,
                            callbacks: {
                                title: (tooltipItems) => {
                                    const item = cgpaResults[tooltipItems[0].dataIndex];
                                    return `${item.title} (Overall Program)`;
                                },
                                label: (tooltipItem) => {
                                    const item = cgpaResults[tooltipItem.dataIndex];
                                    const isGrade = item.evaluationType === 'grade';
                                    const actVal = item.value ? window.formatCgpaMin2Dec(item.value) : 'N/A';
                                    const tgtVal = item.targetCGPA ? window.formatCgpaMin2Dec(item.targetCGPA) : 'N/A';
                                    if (tooltipItem.datasetIndex === 0) {
                                        const labelPrefix = isGrade ? 'Actual Grade: ' + (item.grade || 'N/A') : 'Actual CGPA: ' + actVal;
                                        const labelSuffix = isGrade ? ` (Numeric: ${actVal})` : (item.grade ? ` [Grade: ${item.grade}]` : '');
                                        return ` ${labelPrefix}${labelSuffix}`;
                                    } else {
                                        const labelPrefix = isGrade ? 'Target Grade: ' + (item.targetGrade || 'N/A') : 'Target CGPA: ' + tgtVal;
                                        const labelSuffix = isGrade ? ` (Numeric: ${tgtVal})` : '';
                                        return ` ${labelPrefix}${labelSuffix}`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: yMin,
                            max: yMax,
                            ticks: { font: { size: 9, weight: 'bold' } },
                            grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }
                        },
                        x: {
                            ticks: { font: { size: 9, weight: 'bold' } },
                            grid: { display: false, drawBorder: false }
                        }
                    }
                }
            });
        };

        window.renderSubjectWiseTrend = function (progName) {
            var container = document.getElementById('ptm-subject-panel');
            if (!container) return;

            var activeResults = window.getProcessedResults();
            var overallRecords = activeResults
                .filter(function (r) { return r.type === 'cgpa' && !r.subject && r.title === progName; })
                .sort(function (a, b) { return parseDateSafe(b.date) - parseDateSafe(a.date); });

            var latestOverall = overallRecords[0] || null;
            var isGradeMode = latestOverall && latestOverall.evaluationType === 'grade';
            var mainTarget = window.getProgramMainTarget(progName);
            var programTargetCgpa = mainTarget.targetCGPA ? parseFloat(mainTarget.targetCGPA) : null;
            var programTargetGrade = mainTarget.targetGrade || null;

            var subjectMap = {};
            activeResults
                .filter(function (r) { return r.type === 'cgpa' && r.subject && r.title === progName; })
                .forEach(function (r) {
                    if (!subjectMap[r.subject] || parseDateSafe(r.date) > parseDateSafe(subjectMap[r.subject].date)) {
                        subjectMap[r.subject] = r;
                    }
                });

            var subjects = Object.values(subjectMap).sort(function (a, b) { return a.subject.localeCompare(b.subject); });

            if (subjects.length === 0) {
                container.innerHTML =
                    '<div class="flex flex-col items-center justify-center py-10 gap-3">' +
                    '<span class="text-4xl grayscale opacity-40">📚</span>' +
                    '<p class="text-slate-400 text-xs font-black uppercase tracking-widest text-center">No subject-level data recorded for this program yet.</p>' +
                    '<p class="text-slate-400 text-[10px] font-bold text-center">Add subject scores using the Edit Program Card button.</p>' +
                    '</div>';
                return;
            }

            var labels = subjects.map(function (s) {
                return s.subject.length > 18 ? s.subject.substring(0, 16) + '…' : s.subject;
            });

            var actualData = subjects.map(function (s) { return parseFloat(s.value) || 0; });

            var targetData = subjects.map(function (s) {
                var val = s.targetCGPA ? s.targetCGPA : programTargetCgpa;
                if (val === 'none' || val === null || val === undefined || val === '') return null;
                var parsed = parseFloat(val);
                return isNaN(parsed) ? null : parsed;
            });

            var gradeLabels = subjects.map(function (s) { return s.grade || window.mapCgpaToGrade(s.value, isGradeMode ? 'grade' : 'cgpa') || ''; });
            var targetGradeLabel = programTargetGrade || (programTargetCgpa ? window.mapCgpaToGrade(programTargetCgpa, isGradeMode ? 'grade' : 'cgpa') : 'N/A');

            var allVals = actualData.concat(targetData.filter(function (v) { return v !== null; }));
            var maxVal = allVals.length > 0 ? Math.max.apply(null, allVals) : 4.0;
            var yMax = maxVal > 4.0 ? 5.0 : 4.0;

            var barColors = subjects.map(function (s) {
                var actual = parseFloat(s.value) || 0;
                var subTargetVal = s.targetCGPA ? s.targetCGPA : programTargetCgpa;
                if (subTargetVal === 'none' || subTargetVal === null || subTargetVal === undefined || subTargetVal === '') {
                    return '#06b6d4';
                }
                var subTarget = parseFloat(subTargetVal);
                if (isNaN(subTarget)) return '#06b6d4';
                if (actual >= subTarget) return '#10b981';
                if (actual >= subTarget * 0.85) return '#f59e0b';
                return '#ef4444';
            });

            var legendHtml =
                '<div class="flex flex-wrap justify-center gap-1.5 sm:gap-2 shrink-0">' +
                '<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-xl border border-slate-700">' +
                '<div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>' +
                '<span class="text-[9px] font-black text-white uppercase tracking-widest">Actual (Met Target)</span>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-xl border border-slate-700">' +
                '<div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>' +
                '<span class="text-[9px] font-black text-white uppercase tracking-widest">Actual (Near Target)</span>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-xl border border-slate-700">' +
                '<div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>' +
                '<span class="text-[9px] font-black text-white uppercase tracking-widest">Actual (Below Target)</span>' +
                '</div>';

            var hasTarget = targetData.some(function (v) { return v !== null; });
            if (hasTarget) {
                legendHtml +=
                    '<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-xl border border-slate-700">' +
                    '<div class="w-2.5 h-2.5 rounded bg-slate-400/80 border border-slate-300"></div>' +
                    '<span class="text-[9px] font-black text-white uppercase tracking-widest">Subject Target Bar</span>' +
                    '</div>';
            }
            legendHtml += '</div>';

            var tableRowsHtml = subjects.map(function (s, i) {
                var actual = parseFloat(s.value) || 0;
                var subTargetVal = s.targetCGPA ? s.targetCGPA : programTargetCgpa;
                var isTgtNone = subTargetVal === 'none' || subTargetVal === null || subTargetVal === undefined || subTargetVal === '';
                var subTarget = isTgtNone ? null : parseFloat(subTargetVal);
                var subTargetGrade = isTgtNone ? 'None' : (s.targetGrade || (s.targetCGPA ? window.mapCgpaToGrade(s.targetCGPA, isGradeMode ? 'grade' : 'cgpa') : targetGradeLabel));

                var met = subTarget !== null && !isNaN(subTarget) && actual >= subTarget;
                var near = subTarget !== null && !isNaN(subTarget) && !met && actual >= subTarget * 0.85;
                var statusDot = isTgtNone ? '⚪' : (met ? '🟢' : (near ? '🟡' : '🔴'));
                var statusText = isTgtNone ? 'N/A' : (met ? 'Met' : (near ? 'Near' : 'Below'));
                var targetDisp = isTgtNone ? 'None' : window.formatCgpaMin2Dec(subTargetVal);

                var gradeVal = gradeLabels[i] || '';
                var isFailed = isGradeMode
                    ? (gradeVal && ['C', 'D', 'E', 'F'].includes(gradeVal.trim().toUpperCase()))
                    : (s.value && parseFloat(s.value) < 2.0);

                var cgpaColorClass = isFailed ? 'text-red-500 dark:text-red-400 font-black' : 'text-cyan-600 dark:text-cyan-400 font-bold';
                var gradeColorClass = isFailed ? 'text-red-500 dark:text-red-400 font-black' : 'text-yellow-500 font-bold';

                var tgtGradeSpan = isTgtNone ? '' : ' <span class="text-[9px]">(' + (subTargetGrade || 'N/A') + ')</span>';

                return '<tr class="border-b border-slate-100 dark:border-slate-700/60 last:border-0">' +
                    '<td class="py-1.5 pr-2 font-bold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">' + s.subject + '</td>' +
                    '<td class="py-1.5 px-2 text-center ' + cgpaColorClass + '">' + window.formatCgpaMin2Dec(actual) + '</td>' +
                    '<td class="py-1.5 px-2 text-center ' + gradeColorClass + '">' + (gradeVal || '—') + '</td>' +
                    '<td class="py-1.5 px-2 text-center font-bold text-slate-400">' + targetDisp + tgtGradeSpan + '</td>' +
                    '<td class="py-1.5 pl-2 text-center text-[10px] font-black">' + statusDot + ' ' + statusText + '</td>' +
                    '</tr>';
            }).join('');

            container.innerHTML =
                '<div class="h-[260px] sm:h-[330px] md:h-[400px] min-h-[240px] w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl sm:rounded-2xl md:rounded-3xl p-2 sm:p-4 shadow-inner flex flex-col relative">' +
                '<div class="relative flex-1 w-full h-full"><canvas id="subjectWiseCanvas"></canvas></div>' +
                '</div>' +
                legendHtml +
                '<div class="overflow-y-auto max-h-[160px] custom-scrollbar">' +
                '<table class="w-full text-xs">' +
                '<thead><tr class="border-b border-slate-200 dark:border-slate-700">' +
                '<th class="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 py-1.5 pr-2">Subject</th>' +
                '<th class="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 py-1.5 px-2">Actual</th>' +
                '<th class="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 py-1.5 px-2">Grade</th>' +
                '<th class="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 py-1.5 px-2">Target</th>' +
                '<th class="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 py-1.5 pl-2">Status</th>' +
                '</tr></thead>' +
                '<tbody>' +
                tableRowsHtml +
                '</tbody>' +
                '</table>' +
                '</div>';

            var subCanvas = document.getElementById('subjectWiseCanvas');
            if (!subCanvas) return;
            if (window.subjectWiseChartInstance) window.subjectWiseChartInstance.destroy();

            var subCtx = subCanvas.getContext('2d');
            window.subjectWiseChartInstance = new Chart(subCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Actual CGPA',
                            data: actualData,
                            backgroundColor: barColors,
                            borderWidth: 0,
                            borderRadius: 6,
                            borderSkipped: false
                        }
                    ].concat(hasTarget ? [{
                        label: 'Subject Target',
                        data: targetData,
                        type: 'bar',
                        backgroundColor: 'rgba(148, 163, 184, 0.4)',
                        borderColor: '#94a3b8',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }] : [])
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                title: function (items) {
                                    return subjects[items[0].dataIndex] ? subjects[items[0].dataIndex].subject : '';
                                },
                                label: function (item) {
                                    if (item.datasetIndex === 0) {
                                        var s = subjects[item.dataIndex];
                                        var g = gradeLabels[item.dataIndex];
                                        return ' Actual: ' + window.formatCgpaMin2Dec(s.value) + (g ? ' (' + g + ')' : '');
                                    }
                                    var s = subjects[item.dataIndex];
                                    var subTargetVal = s.targetCGPA ? s.targetCGPA : programTargetCgpa;
                                    var isNone = subTargetVal === 'none' || !subTargetVal;
                                    var subTarget = isNone ? null : parseFloat(subTargetVal);
                                    var subTargetGrade = isNone ? 'None' : (s.targetGrade || (s.targetCGPA ? window.mapCgpaToGrade(s.targetCGPA, isGradeMode ? 'grade' : 'cgpa') : targetGradeLabel));
                                    return ' Target: ' + (subTarget !== null && !isNaN(subTarget) ? window.formatCgpaMin2Dec(subTargetVal) : 'None') + ' (' + (subTargetGrade || 'N/A') + ')';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: yMax,
                            ticks: { font: { size: 9, weight: 'bold' } },
                            grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }
                        },
                        x: {
                            ticks: { font: { size: 8, weight: 'bold' }, maxRotation: 35, minRotation: 0 },
                            grid: { display: false, drawBorder: false }
                        }
                    }
                }
            });
        };

        window.getProcessedResults = function () {
            if (!window.successResults) return [];

            const groups = {};

            window.successResults.forEach(res => {
                if (res.type !== 'cgpa') return;
                const progName = res.title || '';
                const dateStr = res.date || '';
                const key = progName + "|||" + dateStr;
                if (!groups[key]) {
                    groups[key] = {
                        program: progName,
                        date: dateStr,
                        overall: null,
                        subjects: []
                    };
                }
                if (!res.subject) {
                    groups[key].overall = { ...res };
                } else {
                    groups[key].subjects.push({ ...res });
                }
            });

            const processedOveralls = [];
            const processedSubjects = [];

            for (const key in groups) {
                const group = groups[key];
                const subjects = group.subjects;
                let overall = group.overall;

                let estCgpa = '';
                let estGrade = '';
                const evalType = (overall && overall.evaluationType) || (subjects.length > 0 && subjects[0].evaluationType) || 'cgpa';
                const isGrade = evalType === 'grade';

                const allProgramSubjects = window.getAllSubjects().filter(s => s.program === group.program);
                const totalProgramSubjectsCount = allProgramSubjects.length;

                let sumCgpa = 0;
                allProgramSubjects.forEach(ps => {
                    const res = subjects.find(s => s.subject === ps.subject);
                    if (res) {
                        if (isGrade) {
                            if (res.grade && res.grade.trim() !== '' && res.grade !== 'F') {
                                sumCgpa += window.mapGradeToNumeric(res.grade, 'grade');
                            }
                        } else {
                            const val = parseFloat(res.value);
                            if (res.value && !isNaN(val) && val > 0) {
                                sumCgpa += val;
                            }
                        }
                    }
                });

                if (totalProgramSubjectsCount > 0) {
                    const avgCgpa = sumCgpa / totalProgramSubjectsCount;
                    estCgpa = window.formatCgpaMin2Dec(avgCgpa);
                    estGrade = window.mapCgpaToGrade(avgCgpa, isGrade ? 'grade' : 'cgpa');
                }

                const fallbackMainTarget = window.getProgramMainTarget(group.program);

                if (!overall) {
                    overall = {
                        id: 'dynamic_overall_' + group.program + '_' + group.date,
                        type: 'cgpa',
                        evaluationType: evalType,
                        title: group.program,
                        subject: '',
                        value: estCgpa,
                        grade: estGrade,
                        targetGrade: fallbackMainTarget.targetGrade || '',
                        targetCGPA: fallbackMainTarget.targetCGPA || '',
                        date: group.date,
                        isEstimated: true
                    };
                } else {
                    if (isGrade) {
                        if (!overall.grade && estGrade) {
                            overall.grade = estGrade;
                            overall.value = estCgpa;
                            overall.isEstimated = true;
                        }
                    } else {
                        if (!overall.value && estCgpa) {
                            overall.value = estCgpa;
                            overall.grade = estGrade;
                            overall.isEstimated = true;
                        }
                    }
                    if (!overall.targetCGPA && fallbackMainTarget.targetCGPA) {
                        overall.targetCGPA = fallbackMainTarget.targetCGPA;
                        overall.targetGrade = fallbackMainTarget.targetGrade;
                    }
                }

                processedOveralls.push(overall);
                subjects.forEach(s => {
                    if (!s.targetCGPA && overall.targetCGPA) {
                        s.targetCGPA = overall.targetCGPA;
                        s.targetGrade = overall.targetGrade;
                    }
                    processedSubjects.push(s);
                });
            }

            const nonCgpaRecords = window.successResults.filter(r => r.type !== 'cgpa').map(r => ({ ...r }));
            return [...processedOveralls, ...processedSubjects, ...nonCgpaRecords];
        };

        window.renderSuccessResults = function () {
            window.renderResults();
        };

        window.renderResults = function () {
            const container = document.getElementById('results-container');
            const trendContainer = document.getElementById('results-trend-container');
            if (!container) return;

            const activeResults = window.getProcessedResults();

            if (!activeResults || activeResults.length === 0) {
                container.innerHTML = '<div class="col-span-full py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"><span class="text-3xl mb-3 grayscale opacity-50">🏆</span><p class="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest text-center">No results logged yet. Add your first achievement!</p></div>';
                if (trendContainer) trendContainer.classList.add('hidden');
                return;
            }

            const programGroups = {};
            const achievements = [];

            activeResults.forEach(res => {
                if (res.type === 'cgpa') {
                    const progName = res.title;
                    if (!programGroups[progName]) {
                        programGroups[progName] = {
                            type: 'program_group',
                            title: progName,
                            overall: null,
                            subjects: [],
                            date: res.date
                        };
                    }
                    if (parseDateSafe(res.date) > parseDateSafe(programGroups[progName].date)) {
                        programGroups[progName].date = res.date;
                    }
                    if (!res.subject) {
                        programGroups[progName].overall = res;
                    } else {
                        programGroups[progName].subjects.push(res);
                    }
                } else {
                    achievements.push(res);
                }
            });

            const mergedList = [
                ...Object.values(programGroups),
                ...achievements
            ].sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));

            let html = '';
            mergedList.forEach(item => {
                const dateStr = parseDateSafe(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                if (item.type === 'program_group') {
                    const progName = item.title;
                    const subjects = item.subjects.sort((a, b) => a.subject.localeCompare(b.subject));

                    // Estimate overall from subjects
                    let estCgpa = null;
                    let estGrade = null;
                    const evalType = (item.overall && item.overall.evaluationType) || (subjects.length > 0 && subjects[0].evaluationType) || 'cgpa';
                    const isGrade = evalType === 'grade';
                    const subjectsWithScores = subjects.filter(s => s.value && !isNaN(parseFloat(s.value)));
                    if (subjectsWithScores.length > 0) {
                        const sum = subjectsWithScores.reduce((acc, s) => acc + parseFloat(s.value), 0);
                        const avg = sum / subjectsWithScores.length;
                        estCgpa = window.formatCgpaMin2Dec(avg);
                        estGrade = window.mapCgpaToGrade(avg, evalType);
                    }

                    // Dynamically calculate and fill overall if empty/missing
                    let currentOverall = item.overall;
                    if (!currentOverall) {
                        currentOverall = {
                            id: 'dynamic_overall_' + progName,
                            type: 'cgpa',
                            evaluationType: (subjects.length > 0 && subjects[0].evaluationType) || 'cgpa',
                            title: progName,
                            subject: '',
                            value: estCgpa || '',
                            grade: estGrade || '',
                            targetGrade: '',
                            targetCGPA: '',
                            date: item.date,
                            isEstimated: true
                        };
                    } else {
                        const isGradeType = currentOverall.evaluationType === 'grade';
                        if (isGradeType && !currentOverall.grade && estGrade) {
                            currentOverall.grade = estGrade;
                            currentOverall.value = estCgpa || '';
                            currentOverall.isEstimated = true;
                        } else if (!isGradeType && !currentOverall.value && estCgpa) {
                            currentOverall.value = estCgpa;
                            currentOverall.grade = estGrade || '';
                            currentOverall.isEstimated = true;
                        }
                    }

                    // Check if inputted overall result matches estimated result
                    let matchStatusHtml = '';
                    if (currentOverall && !currentOverall.isEstimated && estCgpa) {
                        const isGrade = currentOverall.evaluationType === 'grade';
                        let isMatch = false;
                        if (isGrade) {
                            isMatch = (currentOverall.grade || '').trim().toUpperCase() === (estGrade || '').trim().toUpperCase();
                        } else {
                            isMatch = window.formatCgpaMin2Dec(currentOverall.value || 0) === window.formatCgpaMin2Dec(estCgpa);
                        }

                        if (isMatch) {
                            matchStatusHtml = `
                            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black shrink-0 shadow-sm shadow-emerald-500/20" title="Matches subject-wise estimate (CGPA: ${estCgpa}, Grade: ${estGrade})">✓</span>`;
                        } else {
                            matchStatusHtml = `
                            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black shrink-0 shadow-sm shadow-rose-500/20" title="Differs from subject-wise estimate (CGPA: ${estCgpa}, Grade: ${estGrade})">✗</span>`;
                        }
                    }

                    // Check if Goal is Met
                    const mainTarget = window.getProgramMainTarget(progName);
                    const targetCGPA = (currentOverall && currentOverall.targetCGPA) || mainTarget.targetCGPA;
                    const targetGrade = (currentOverall && currentOverall.targetGrade) || mainTarget.targetGrade;
                    const hasTgt = targetCGPA && targetCGPA !== 'none' && targetCGPA !== '';

                    const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
                    const progSubsList = trackId ? (syllabusStructure[trackId] || []).filter(s => s.program === progName) : [];

                    let allSubjectsAttempted = (progSubsList.length > 0);
                    progSubsList.forEach(s => {
                        const subRes = subjects.find(r => r.subject === s.subject);
                        let attempted = false;
                        if (subRes) {
                            const evalType = subRes.evaluationType || 'cgpa';
                            if (evalType === 'grade') {
                                if (subRes.grade && subRes.grade.trim() !== '' && subRes.grade.trim().toUpperCase() !== 'F') {
                                    attempted = true;
                                }
                            } else {
                                const val = parseFloat(subRes.value);
                                if (subRes.value && !isNaN(val) && val > 0) {
                                    attempted = true;
                                }
                            }
                        }
                        if (!attempted) {
                            allSubjectsAttempted = false;
                        }
                    });

                    let goalMetLabel = '';
                    if (hasTgt) {
                        let isGoalMet = false;
                        if (allSubjectsAttempted) {
                            if (evalType === 'grade') {
                                const currentGradeVal = window.mapGradeToNumeric(currentOverall.grade, 'grade');
                                const targetGradeVal = window.mapGradeToNumeric(targetGrade, 'grade');
                                isGoalMet = currentGradeVal >= targetGradeVal;
                            } else {
                                const currentCgpaVal = parseFloat(currentOverall.value) || 0;
                                const targetCgpaVal = parseFloat(targetCGPA) || 0;
                                isGoalMet = currentCgpaVal >= targetCgpaVal;
                            }
                        }

                        if (isGoalMet) {
                            goalMetLabel = ` <span class="text-xs font-black text-emerald-500 ml-1.5 whitespace-nowrap uppercase tracking-wider">[Goal Met]</span>`;
                        } else {
                            goalMetLabel = ` <span class="text-xs font-black text-rose-500 ml-1.5 whitespace-nowrap uppercase tracking-wider">[Not Met]</span>`;
                        }
                    }

                    // Check compression
                    const isProgramVisible = !window.programVisibility || window.programVisibility[progName] !== false;
                    if (!isProgramVisible) {
                        const dispScore = currentOverall.evaluationType === 'grade'
                            ? (currentOverall.grade || '—')
                            : (window.formatCgpaMin2Dec(currentOverall.value) || '—');
                        html += `
                        <div class="bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm relative group hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between opacity-60">
                            <div class="flex items-center space-x-2.5 min-w-0">
                                <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${window.getProgramColor(progName)}"></div>
                                <h4 class="text-xs font-black text-slate-650 dark:text-slate-400 truncate">${progName} <span class="text-[9px] font-bold text-slate-400 uppercase">- Program Card (Compressed)</span>${goalMetLabel}</h4>
                            </div>
                            <div class="flex items-center space-x-2 shrink-0">
                                <span class="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">${dispScore}</span>
                                <button onclick="window.toggleOutcomeProgram('${progName.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded transition-colors" title="Spread Program Everywhere">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>`;
                        return;
                    }

                    html += `
                    <div class="bg-white dark:bg-slate-800 p-5 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between">
                        <div class="absolute top-3.5 right-3.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="window.showProgramAnalytics('${progName.replace(/'/g, "\\'")}')" class="text-slate-300 hover:text-cyan-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="View Progression Trend"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></button>
                            <button onclick="window.openResultModal(null, '${progName}')" class="text-slate-300 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="Edit Program Card"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            <button onclick="window.deleteProgramGroup('${progName}')" class="text-slate-300 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all" title="Delete Program Card"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                        <div>
                            <div class="flex items-center space-x-1.5 mb-2.5">
                                <span class="text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">Program Card</span>
                                <span class="text-[8px] font-bold text-slate-400 ml-auto mr-8">${dateStr}</span>
                            </div>
                            <h4 class="font-black text-base text-slate-800 dark:text-slate-100 leading-tight mb-3 pr-12 flex items-center flex-wrap">${progName}${goalMetLabel}</h4>
                            <!-- Overall Program Score Banner -->
                            ${(() => {
                            if (!currentOverall || (!currentOverall.value && !currentOverall.grade)) return '';

                            const hasTgt = currentOverall.targetCGPA && currentOverall.targetCGPA !== 'none';
                            const tgtCgpaDisp = hasTgt ? window.formatCgpaMin2Dec(currentOverall.targetCGPA) : 'None';
                            const tgtGradeDisp = hasTgt ? (currentOverall.targetGrade || window.mapCgpaToGrade(currentOverall.targetCGPA, currentOverall.evaluationType) || '—') : 'None';

                            const isOverallFailed = currentOverall.evaluationType === 'grade'
                                ? (currentOverall.grade && ['C', 'D', 'E', 'F'].includes(currentOverall.grade.trim().toUpperCase()))
                                : (currentOverall.value && parseFloat(currentOverall.value) < 2.0);

                            const statusText = isOverallFailed ? 'FAIL' : 'PASS';
                            const scoreColorClass = isOverallFailed ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400';
                            const statusBadgeColor = isOverallFailed
                                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';

                            const indicatorText = currentOverall.isEstimated ? 'Estimated' : 'Manual';
                            const indicatorBadgeColor = currentOverall.isEstimated
                                ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800';

                            const systemText = currentOverall.evaluationType === 'grade' ? 'Grade-Based' : 'CGPA-Based';
                            const systemBadgeColor = 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';

                            return `
                                <div class="mb-4 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                                    <div class="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                        <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.25 rounded border ${systemBadgeColor}">${systemText}</span>
                                        <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.25 rounded border ${indicatorBadgeColor}">${indicatorText}</span>
                                        <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.25 rounded border ${statusBadgeColor} ml-auto">${statusText}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Target</span>
                                            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">${tgtGradeDisp} (${tgtCgpaDisp})</span>
                                        </div>
                                        <div class="text-right flex items-center gap-2">
                                            <div class="flex flex-col items-end">
                                                ${currentOverall.evaluationType === 'grade'
                                    ? `
                                                    <span class="text-sm font-black ${scoreColorClass}">Grade: ${currentOverall.grade || 'N/A'}</span>
                                                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">CGPA: ${window.formatCgpaMin2Dec(currentOverall.value) || 'N/A'}</span>
                                                    `
                                    : `
                                                    <span class="text-sm font-black ${scoreColorClass}">CGPA: ${window.formatCgpaMin2Dec(currentOverall.value) || 'N/A'}</span>
                                                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Grade: ${currentOverall.grade || 'N/A'}</span>
                                                    `
                                }
                                            </div>
                                            ${matchStatusHtml}
                                        </div>
                                    </div>
                                </div>
                                `;
                        })()}
                            
                            <!-- Subject Listing -->
                            ${subjects.length > 0 ? `
                            <div class="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                                <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject Grades</span>
                                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                    ${(() => {
                                const mainTarget = window.getProgramMainTarget(progName);
                                return subjects.map(s => {
                                    const subTargetCgpa = s.targetCGPA || mainTarget.targetCGPA;
                                    const subTargetGrade = s.targetGrade || mainTarget.targetGrade;
                                    const hasSubTgt = subTargetCgpa && subTargetCgpa !== 'none';
                                    const targetDisp = hasSubTgt ? (s.evaluationType === 'grade' ? `${subTargetGrade} (${window.formatCgpaMin2Dec(subTargetCgpa)})` : `${window.formatCgpaMin2Dec(subTargetCgpa)} (${subTargetGrade})`) : 'None';

                                    const isSubFailed = s.evaluationType === 'grade'
                                        ? (s.grade && ['C', 'D', 'E', 'F'].includes(s.grade.trim().toUpperCase()))
                                        : (s.value && parseFloat(s.value) < 2.0);
                                    const subScoreColor = isSubFailed ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';

                                    const subStatusText = isSubFailed ? 'FAIL' : 'PASS';
                                    const subStatusBadge = isSubFailed
                                        ? `<span class="inline-block text-[8px] font-black px-1.5 py-0.25 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-800/50 scale-90 origin-right">FAIL</span>`
                                        : `<span class="inline-block text-[8px] font-black px-1.5 py-0.25 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800/50 scale-90 origin-right">PASS</span>`;

                                    return `
                                            <div class="flex justify-between items-center text-xs py-1 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                                                <div class="flex flex-col truncate mr-2">
                                                    <span class="font-bold text-slate-600 dark:text-slate-300 truncate">${s.subject}</span>
                                                    <span class="text-[9px] font-bold text-slate-400">Target: ${targetDisp}</span>
                                                </div>
                                                <div class="text-right shrink-0 flex items-center gap-2">
                                                    <div class="flex flex-col items-end">
                                                        <span class="font-black ${subScoreColor}">
                                                            ${s.evaluationType === 'grade' ? (s.grade || 'N/A') : (window.formatCgpaMin2Dec(s.value) || 'N/A')}
                                                        </span>
                                                        ${s.evaluationType === 'grade' ? `<span class="text-[10px] font-bold text-slate-400 block -mt-0.5">(CGPA: ${window.formatCgpaMin2Dec(s.value)})</span>` : (s.grade ? `<span class="text-[10px] font-bold text-slate-400 block -mt-0.5">(${s.grade})</span>` : '')}
                                                    </div>
                                                    ${subStatusBadge}
                                                </div>
                                            </div>
                                            `;
                                }).join('');
                            })()}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>`;

                } else {
                    html += `
                    <div class="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between">
                        <div class="absolute top-3.5 right-3.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="window.openResultModal('${item.id}')" class="text-slate-300 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            <button onclick="window.deleteResult('${item.id}')" class="text-slate-300 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                        <div>
                            <div class="flex items-center space-x-1.5 mb-2">
                                <span class="text-[8px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-100 dark:border-yellow-800/50">Achievement</span>
                                <span class="text-[8px] font-bold text-slate-400 ml-auto mr-8">${dateStr}</span>
                            </div>
                            <h4 class="font-black text-sm md:text-base text-slate-800 dark:text-slate-100 leading-tight mb-2 pr-12">${item.title}</h4>
                        </div>
                        <div class="mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center items-center h-full min-h-[60px]">
                            <span class="text-xl md:text-2xl font-black text-yellow-600 dark:text-yellow-400 break-words text-center w-full leading-none">${item.value || 'N/A'}</span>
                            ${item.grade ? `<span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Grade: ${item.grade}</span>` : ''}
                        </div>
                    </div>`;
                }
            });
            container.innerHTML = html;
            // Populate trend filter dynamically
            const uniquePrograms = [];
            activeResults.forEach(r => {
                if (r.type === 'cgpa' && r.title && !uniquePrograms.includes(r.title)) {
                    uniquePrograms.push(r.title);
                }
            });

            const filterSelect = document.getElementById('trend-program-filter');
            if (filterSelect) {
                const currentFilterVal = filterSelect.value || 'ALL';
                let filterHtml = '<option value="ALL">All Programs</option>';
                uniquePrograms.forEach(prog => {
                    filterHtml += `<option value="${prog}" ${currentFilterVal === prog ? 'selected' : ''}>${prog}</option>`;
                });
                filterSelect.innerHTML = filterHtml;
            }

            const selectedProgFilter = filterSelect ? filterSelect.value : 'ALL';

            // Filter CGPAs for the Progression Trend Chart (Overall Program CGPAs only, no subject CGPAs)
            let cgpaResults = activeResults
                .filter(r => r.type === 'cgpa' && !r.subject)
                .sort((a, b) => parseDateSafe(a.date) - parseDateSafe(b.date));

            if (selectedProgFilter !== 'ALL') {
                cgpaResults = cgpaResults.filter(r => r.title === selectedProgFilter);
            }

            // Calculate & render stats indicators
            let latestProgramCgpa = '0.00';
            let overallTargetCgpaVal = '0.00';
            const programResults = activeResults
                .filter(r => r.type === 'cgpa' && !r.subject)
                .filter(r => selectedProgFilter === 'ALL' || r.title === selectedProgFilter)
                .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
            if (programResults.length > 0) {
                latestProgramCgpa = (parseFloat(programResults[0].value) || 0).toFixed(2);
                overallTargetCgpaVal = (parseFloat(programResults[0].targetCGPA) || 0).toFixed(2);
            }

            let subjectCgpaAvg = '0.00';
            const subjectResults = activeResults
                .filter(r => r.type === 'cgpa' && r.subject);
            if (subjectResults.length > 0) {
                const totalSubCgpa = subjectResults.reduce((acc, r) => acc + (parseFloat(r.value) || 0), 0);
                subjectCgpaAvg = (totalSubCgpa / subjectResults.length).toFixed(2);
            }

            let highestGpa = '0.00';
            const allNumericCgpas = activeResults
                .filter(r => r.type === 'cgpa')
                .map(r => parseFloat(r.value))
                .filter(v => !isNaN(v));
            if (allNumericCgpas.length > 0) {
                highestGpa = Math.max(...allNumericCgpas).toFixed(2);
            }

            const totalAchievements = window.successResults ? window.successResults.length : 0;

            const statLatest = document.getElementById('trend-stat-latest');
            const statAvg = document.getElementById('trend-stat-avg');
            const statHighest = document.getElementById('trend-stat-highest');
            const statTotal = document.getElementById('trend-stat-total');

            if (statLatest) statLatest.textContent = latestProgramCgpa;
            if (statAvg) statAvg.textContent = overallTargetCgpaVal; // Show selected target CGPA instead of subject CGPA average
            if (statHighest) statHighest.textContent = highestGpa;
            if (statTotal) statTotal.textContent = totalAchievements;

            // Render interactive results legend
            const rLeg = document.getElementById('results-legend');
            if (rLeg) {
                const getResultsLegend = (idxKey, color, label, val) => {
                    const active = window.trendDatasetVisibility[idxKey];
                    return `<div onclick="window.toggleTrendDataset('${idxKey}')" class="cursor-pointer flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all ${active ? 'opacity-100 scale-100 shadow-md' : 'opacity-40 grayscale scale-95 line-through'}"><div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">${label}: ${val}</span></div>`;
                };
                rLeg.innerHTML =
                    getResultsLegend('actual', '#06b6d4', 'Actual CGPA', latestProgramCgpa) +
                    getResultsLegend('target', '#f59e0b', 'Target CGPA', overallTargetCgpaVal);
            }

            // Calculate and render track average results
            const trackAveragesContainer = document.getElementById('track-averages-container');
            if (trackAveragesContainer) {
                let trackHtml = '';
                const trackColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7', '#f97316'];

                window.tracks.forEach((t, idx) => {
                    const tc = trackColors[idx % trackColors.length];
                    const trackProgs = window.customPrograms[t.id] || [];
                    const N = trackProgs.length;

                    let sumCgpa = 0.00;
                    trackProgs.forEach(pObj => {
                        const pName = pObj.name || pObj;
                        // Find latest overall result for this program in activeResults
                        const progOveralls = activeResults.filter(r => r.type === 'cgpa' && !r.subject && r.title === pName);
                        if (progOveralls.length > 0) {
                            progOveralls.sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
                            sumCgpa += parseFloat(progOveralls[0].value) || 0.00;
                        }
                    });

                    const avgCgpa = N > 0 ? sumCgpa / N : 0.00;
                    const avgCgpaStr = avgCgpa.toFixed(2);
                    const avgGrade = window.mapCgpaToGrade(avgCgpa, 'cgpa') || 'F';
                    const gradeColor = avgGrade === 'F' ? 'text-rose-400' : 'text-emerald-400';

                    trackHtml += `
                    <div class="flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-900/60 dark:bg-slate-900/90 rounded-lg md:rounded-xl border border-slate-700/60 dark:border-slate-700/80 shadow-sm select-none">
                        <div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-md" style="background-color: ${tc}; box-shadow: 0 0 8px ${tc}"></div>
                        <span class="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">${t.name || t.id} Avg:</span>
                        <span class="text-[9px] md:text-[11px] font-black text-white whitespace-nowrap">${avgCgpaStr} <span class="${gradeColor}">(${avgGrade})</span></span>
                    </div>`;
                });

                trackAveragesContainer.innerHTML = trackHtml;
            }

            // Trend Chart Rendering
            if (cgpaResults.length > 0 && trendContainer) {
                trendContainer.classList.remove('hidden');
                const ctx = document.getElementById('resultsTrendChart');
                if (ctx) {
                    const labels = cgpaResults.map(r => {
                        const d = parseDateSafe(r.date);
                        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        return `${r.title} (${dateStr})`;
                    });
                    const actualData = cgpaResults.map(r => parseFloat(r.value) || null);
                    const targetData = cgpaResults.map(r => parseFloat(r.targetCGPA) || null);

                    const allNumericValues = [];
                    cgpaResults.forEach(r => {
                        const act = parseFloat(r.value);
                        const tgt = parseFloat(r.targetCGPA);
                        if (!isNaN(act)) allNumericValues.push(act);
                        if (!isNaN(tgt)) allNumericValues.push(tgt);
                    });
                    const yMin = 0;
                    const maxVal = allNumericValues.length > 0 ? Math.max(...allNumericValues) : 4.0;
                    const yMax = maxVal > 4.0 ? 5.0 : 4.0;

                    if (window.resultsTrendChartInstance) window.resultsTrendChartInstance.destroy();

                    const canvasCtx = ctx.getContext('2d');

                    // Create beautiful area glow gradients
                    const gradientActual = canvasCtx.createLinearGradient(0, 0, 0, 200);
                    gradientActual.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
                    gradientActual.addColorStop(1, 'rgba(6, 182, 212, 0)');

                    const gradientTarget = canvasCtx.createLinearGradient(0, 0, 0, 200);
                    gradientTarget.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
                    gradientTarget.addColorStop(1, 'rgba(245, 158, 11, 0)');

                    Chart.defaults.color = '#94a3b8';
                    Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
                    window.resultsTrendChartInstance = new Chart(canvasCtx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Actual CGPA',
                                    data: actualData,
                                    backgroundColor: '#06b6d4',
                                    borderColor: '#06b6d4',
                                    borderWidth: 0,
                                    borderRadius: 6,
                                    borderSkipped: false,
                                    hidden: !window.trendDatasetVisibility.actual
                                },
                                {
                                    label: 'Target CGPA',
                                    data: targetData,
                                    backgroundColor: '#f59e0b',
                                    borderColor: '#f59e0b',
                                    borderWidth: 0,
                                    borderRadius: 6,
                                    borderSkipped: false,
                                    hidden: !window.trendDatasetVisibility.target
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    titleColor: '#fff',
                                    bodyColor: '#cbd5e1',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderWidth: 1,
                                    padding: 12,
                                    cornerRadius: 8,
                                    usePointStyle: true,
                                    boxPadding: 6,
                                    callbacks: {
                                        title: (tooltipItems) => {
                                            const item = cgpaResults[tooltipItems[0].dataIndex];
                                            return `${item.title} (Overall Program)`;
                                        },
                                        label: (tooltipItem) => {
                                            const item = cgpaResults[tooltipItem.dataIndex];
                                            const isGrade = item.evaluationType === 'grade';
                                            const actVal = item.value ? window.formatCgpaMin2Dec(item.value) : 'N/A';
                                            const tgtVal = item.targetCGPA ? window.formatCgpaMin2Dec(item.targetCGPA) : 'N/A';
                                            if (tooltipItem.datasetIndex === 0) {
                                                const labelPrefix = isGrade ? 'Actual Grade: ' + (item.grade || 'N/A') : 'Actual CGPA: ' + actVal;
                                                const labelSuffix = isGrade ? ` (Numeric: ${actVal})` : (item.grade ? ` [Grade: ${item.grade}]` : '');
                                                return ` ${labelPrefix}${labelSuffix}`;
                                            } else {
                                                const labelPrefix = isGrade ? 'Target Grade: ' + (item.targetGrade || 'N/A') : 'Target CGPA: ' + tgtVal;
                                                const labelSuffix = isGrade ? ` (Numeric: ${tgtVal})` : '';
                                                return ` ${labelPrefix}${labelSuffix}`;
                                            }
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    min: yMin,
                                    max: yMax,
                                    ticks: { font: { size: 9, weight: 'bold' } },
                                    grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }
                                },
                                x: {
                                    ticks: { font: { size: 9, weight: 'bold' } },
                                    grid: { display: false, drawBorder: false }
                                }
                            }
                        }
                    });
                }
            } else if (trendContainer) {
                trendContainer.classList.add('hidden');
            }
        };

        window.updateResultSubjectsGrid = function (clearOverall = false) {
            const progSelect = document.getElementById('res-prog-select');
            const listContainer = document.getElementById('res-subjects-list');
            if (!progSelect || !listContainer) return;

            const selectedProg = progSelect.value;
            listContainer.innerHTML = '';

            if (clearOverall) {
                // Clean inputs for overall
                if (document.getElementById('res-overall-grade')) document.getElementById('res-overall-grade').value = '';
                if (document.getElementById('res-overall-target-grade')) document.getElementById('res-overall-target-grade').value = '';
                document.getElementById('res-overall-cgpa').value = '';
                document.getElementById('res-overall-target-cgpa').value = '';
            }

            const evalType = document.getElementById('res-evaluation-type').value;
            const isGrade = evalType === 'grade';

            // Prefills are handled explicitly in edit mode to avoid setting targets before the user sets them.

            // Update Overall label text
            const overallLabel = document.getElementById('res-overall-label');
            if (overallLabel) {
                overallLabel.textContent = isGrade ? "Overall Program Grade" : "Overall Program CGPA";
            }

            if (selectedProg) {
                let html = '';
                window.tracks.forEach(track => {
                    if (syllabusStructure[track.id]) {
                        syllabusStructure[track.id].forEach(s => {
                            if (s.program === selectedProg) {
                                html += `
                                <div class="flex flex-col gap-1 py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-black text-slate-700 dark:text-slate-200 flex-1 truncate">${s.subject}</span>
                                        <span class="res-sub-target-badge text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/50 whitespace-nowrap opacity-30">Target: —</span>
                                    </div>
                                    <div class="flex gap-2 items-center justify-end">
                                        <!-- Grade mode: select A-F + auto CGPA badge -->
                                        <div class="${isGrade ? 'flex' : 'hidden'} items-center gap-1">
                                            <select data-subject="${s.subject}" data-field="grade"
                                                class="res-sub-grade-input w-16 sm:w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-bold text-center uppercase focus:ring-2 focus:ring-yellow-500 outline-none"
                                                onchange="window.onGradeSelect(this); window.updateModalEstScore();">
                                                <option value="">Grade</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                                <option value="E">E</option>
                                                <option value="F">F</option>
                                            </select>
                                            <span class="auto-cgpa-badge text-[10px] font-black text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 min-w-[32px] text-center opacity-40">—</span>
                                        </div>
                                        <!-- CGPA mode: text input + auto grade badge -->
                                        <div class="${isGrade ? 'hidden' : 'flex'} items-center gap-1">
                                            <input type="text" data-subject="${s.subject}" data-field="cgpa"
                                                class="res-sub-cgpa-input w-20 sm:w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-bold text-center focus:ring-2 focus:ring-yellow-500 outline-none"
                                                placeholder="CGPA" oninput="window.onCgpaInput(this); window.updateModalEstScore();"
                                                onblur="window.onCgpaBlur(this); window.updateModalEstScore();">
                                            <span class="auto-grade-badge text-[10px] font-black text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800 min-w-[24px] text-center opacity-40">—</span>
                                        </div>
                                    </div>
                                </div>`;
                            }
                        });
                    }
                });
                if (!html) {
                    listContainer.innerHTML = '<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center py-4">No subjects found in this program</p>';
                } else {
                    listContainer.innerHTML = html;
                    // Update subject targets from the overall target
                    window.updateSubjectTargets();
                    window.updateModalEstScore();
                }
            }
        };

        window.openResultModal = function (id = null, editProgramName = null) {
            window.editingResultId = id;
            window.editingProgramName = editProgramName;

            let titleStr = 'Add New Result';
            if (id) titleStr = 'Edit Result';
            else if (editProgramName) titleStr = `Edit ${editProgramName}`;
            document.getElementById('res-modal-title').textContent = titleStr;

            // Populate program dropdown
            const progSelect = document.getElementById('res-prog-select');
            progSelect.innerHTML = '';
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id]) {
                    window.customPrograms[track.id].forEach(p => {
                        const pName = p.name || p;
                        progSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
                    });
                }
            });

            const typeSelector = document.getElementById('res-type');
            const evalSelector = document.getElementById('res-evaluation-type');

            if (editProgramName) {
                // BULK PROGRAM EDIT MODE
                typeSelector.value = 'cgpa';
                typeSelector.disabled = true;
                progSelect.value = editProgramName;
                progSelect.disabled = true;

                // Prefill evaluation option
                const progRecords = window.successResults.filter(r => r.type === 'cgpa' && r.title === editProgramName);
                let evalType = 'cgpa';
                const firstRecordWithEval = progRecords.find(r => r.evaluationType);
                if (firstRecordWithEval) {
                    evalType = firstRecordWithEval.evaluationType;
                } else if (progRecords.some(r => r.grade && !r.value)) {
                    evalType = 'grade';
                }
                evalSelector.value = evalType;
                evalSelector.disabled = true;

                // Store prefill data to apply AFTER toggleResultType() re-renders the grid
                window._pendingResultPrefill = { progRecords, evalType };

                let recordDate = progRecords.find(r => r.date)?.date || '';
                if (recordDate) {
                    document.getElementById('res-date').value = recordDate;
                }
            } else if (id) {
                // SINGLE ACHIEVEMENT EDIT MODE
                const res = window.successResults.find(r => r.id === id);
                if (res) {
                    typeSelector.value = res.type;
                    typeSelector.disabled = true;
                    progSelect.disabled = true;
                    evalSelector.disabled = true;

                    document.getElementById('res-single-title-display').textContent = res.title;
                    document.getElementById('res-value').value = res.value || '';
                    document.getElementById('res-grade').value = res.grade || '';
                    document.getElementById('res-date').value = res.date;
                }
            } else {
                // ADD MODE
                typeSelector.value = 'cgpa';
                typeSelector.disabled = false;
                progSelect.disabled = false;
                evalSelector.disabled = false;
                evalSelector.value = 'cgpa';
                document.getElementById('res-title-input').value = '';
                document.getElementById('res-value').value = '';
                document.getElementById('res-grade').value = '';
                document.getElementById('res-overall-grade').value = '';
                document.getElementById('res-overall-target-grade').value = '';
                document.getElementById('res-overall-cgpa').value = '';
                document.getElementById('res-overall-target-cgpa').value = '';

                // Reset all auto-badges
                document.querySelectorAll('#resm-content .auto-grade-badge, #resm-content .auto-cgpa-badge').forEach(b => {
                    b.textContent = '—';
                    b.classList.add('opacity-40');
                });

                const d = new Date();
                const pad = (n) => n < 10 ? '0' + n : n;
                document.getElementById('res-date').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

                window._pendingResultPrefill = null;
            }

            // toggleResultType renders the grid via updateResultSubjectsGrid; do this FIRST
            window.toggleResultType();

            // Now apply prefill AFTER the grid has been rendered
            if (window._pendingResultPrefill) {
                const { progRecords, evalType } = window._pendingResultPrefill;
                window._pendingResultPrefill = null;

                // Also retrieve main target configuration
                const mainTarget = window.getProgramMainTarget(editProgramName);
                let overallPrefilled = false;

                progRecords.forEach(r => {
                    if (!r.subject) {
                        overallPrefilled = true;
                        // Overall program score
                        if (evalType === 'grade') {
                            document.getElementById('res-overall-grade').value = r.grade || '';
                            const tgtGrade = r.targetGrade || mainTarget.targetGrade;
                            document.getElementById('res-overall-target-grade').value = tgtGrade;
                            window.updateCgpaBadge(r.grade || '', document.getElementById('res-overall-grade').parentElement.querySelector('.auto-cgpa-badge'));
                            if (tgtGrade) window.updateCgpaBadge(tgtGrade, document.getElementById('res-overall-target-grade').parentElement.querySelector('.auto-cgpa-badge'));
                        } else {
                            document.getElementById('res-overall-cgpa').value = r.value || '';
                            const tgtCgpa = r.targetCGPA || mainTarget.targetCGPA;
                            document.getElementById('res-overall-target-cgpa').value = tgtCgpa;
                            window.onCgpaInput(document.getElementById('res-overall-cgpa'));
                            if (tgtCgpa) window.onCgpaInput(document.getElementById('res-overall-target-cgpa'));
                        }
                    } else {
                        // Subject-level score
                        if (evalType === 'grade') {
                            const gradeInput = Array.from(document.querySelectorAll('.res-sub-grade-input')).find(input => input.getAttribute('data-subject') === r.subject);
                            if (gradeInput) {
                                gradeInput.value = r.grade || '';
                                window.updateCgpaBadge(r.grade || '', gradeInput.parentElement.querySelector('.auto-cgpa-badge'));
                            }
                        } else {
                            const cgpaInput = Array.from(document.querySelectorAll('.res-sub-cgpa-input')).find(input => input.getAttribute('data-subject') === r.subject);
                            if (cgpaInput) {
                                cgpaInput.value = r.value || '';
                                window.onCgpaInput(cgpaInput);
                            }
                        }
                    }
                });

                if (!overallPrefilled && mainTarget.targetCGPA) {
                    if (evalType === 'grade') {
                        const gradeTargetInput = document.getElementById('res-overall-target-grade');
                        if (gradeTargetInput) {
                            gradeTargetInput.value = mainTarget.targetGrade;
                            window.updateCgpaBadge(mainTarget.targetGrade, gradeTargetInput.parentElement.querySelector('.auto-cgpa-badge'));
                        }
                    } else {
                        const cgpaTargetInput = document.getElementById('res-overall-target-cgpa');
                        if (cgpaTargetInput) {
                            cgpaTargetInput.value = mainTarget.targetCGPA;
                            window.onCgpaInput(cgpaTargetInput);
                        }
                    }
                }
            }

            window.updateModalEstScore();
            openModal('result-modal');
        };

        window.toggleResultEvaluationType = function () {
            const evalType = document.getElementById('res-evaluation-type').value;
            const cgpaFields = document.querySelectorAll('#res-subjects-grid-container .res-cgpa-field, #resm-content .res-cgpa-field');
            const gradeFields = document.querySelectorAll('#res-subjects-grid-container .res-grade-field, #resm-content .res-grade-field');

            if (evalType === 'grade') {
                cgpaFields.forEach(f => { f.classList.add('hidden'); f.classList.remove('flex'); });
                gradeFields.forEach(f => { f.classList.remove('hidden'); f.classList.add('flex'); });
            } else {
                cgpaFields.forEach(f => { f.classList.remove('hidden'); f.classList.add('flex'); });
                gradeFields.forEach(f => { f.classList.add('hidden'); f.classList.remove('flex'); });
            }

            // Reset all auto-badges
            document.querySelectorAll('#resm-content .auto-grade-badge, #resm-content .auto-cgpa-badge').forEach(b => {
                b.textContent = '—';
                b.classList.add('opacity-40');
            });

            // Update overall label
            const overallLabel = document.getElementById('res-overall-label');
            if (overallLabel) overallLabel.textContent = evalType === 'grade' ? 'Overall Program Grade' : 'Overall Program CGPA';

            window.updateResultSubjectsGrid(false);
        };

        window.toggleResultType = function () {
            const type = document.getElementById('res-type').value;
            const isEdit = !!window.editingResultId;
            const isBulkEdit = !!window.editingProgramName;

            const evalTypeContainer = document.getElementById('res-evaluation-type-container');
            if (type === 'cgpa') {
                evalTypeContainer.classList.remove('hidden');
                document.getElementById('res-evaluation-type').disabled = isBulkEdit;
            } else {
                evalTypeContainer.classList.add('hidden');
            }

            if (isBulkEdit) {
                document.getElementById('res-prog-container').classList.remove('hidden');
                document.getElementById('res-subjects-grid-container').classList.remove('hidden');
                document.getElementById('res-title-container').classList.add('hidden');
                document.getElementById('res-single-title-container').classList.add('hidden');
                document.getElementById('res-single-value-container').classList.add('hidden');
                window.toggleResultEvaluationType();
            } else if (isEdit) {
                document.getElementById('res-prog-container').classList.add('hidden');
                document.getElementById('res-subjects-grid-container').classList.add('hidden');
                document.getElementById('res-title-container').classList.add('hidden');
                document.getElementById('res-single-title-container').classList.remove('hidden');
                document.getElementById('res-single-value-container').classList.remove('hidden');
            } else {
                document.getElementById('res-single-title-container').classList.add('hidden');
                if (type === 'cgpa') {
                    document.getElementById('res-prog-container').classList.remove('hidden');
                    document.getElementById('res-subjects-grid-container').classList.remove('hidden');
                    document.getElementById('res-title-container').classList.add('hidden');
                    document.getElementById('res-single-value-container').classList.add('hidden');
                    window.toggleResultEvaluationType();
                } else {
                    document.getElementById('res-prog-container').classList.add('hidden');
                    document.getElementById('res-subjects-grid-container').classList.add('hidden');
                    document.getElementById('res-title-container').classList.remove('hidden');
                    document.getElementById('res-single-value-container').classList.remove('hidden');
                }
            }
        };

        window.saveResult = function () {
            const type = document.getElementById('res-type').value;
            const date = document.getElementById('res-date').value;
            if (!date) return showToast("Date is required", "error");

            if (window.editingProgramName) {
                // Retrieve main target configuration BEFORE filtering existing records
                const fallbackMainTarget = window.getProgramMainTarget(window.editingProgramName);

                // 1. BULK PROGRAM EDIT MODE
                window.successResults = window.successResults.filter(r => !(r.type === 'cgpa' && r.title === window.editingProgramName));

                const evalType = document.getElementById('res-evaluation-type').value;

                // Save new subject scores first (needed for estimating overall if blank)
                let gradeInputs = [];
                let cgpaInputs = [];
                if (evalType === 'grade') {
                    gradeInputs = document.querySelectorAll('.res-sub-grade-input');
                } else {
                    cgpaInputs = document.querySelectorAll('.res-sub-cgpa-input');
                }

                const subjectsData = {};
                if (evalType === 'grade') {
                    gradeInputs.forEach(input => {
                        const sub = input.getAttribute('data-subject');
                        const gVal = input.value.trim();
                        if (gVal) {
                            subjectsData[sub] = {
                                grade: gVal,
                                cgpa: window.mapGradeToNumeric(gVal, evalType).toFixed(2)
                            };
                        }
                    });
                } else {
                    cgpaInputs.forEach(input => {
                        const sub = input.getAttribute('data-subject');
                        const cVal = input.value.trim();
                        if (cVal) {
                            const formattedCgpa = window.validateAndFormatCgpa(cVal);
                            if (formattedCgpa) {
                                subjectsData[sub] = {
                                    // Automatically calculate and save estimated grade from CGPA
                                    grade: window.mapCgpaToGrade(formattedCgpa, evalType),
                                    cgpa: formattedCgpa
                                };
                            }
                        }
                    });
                }

                let overallVal = '';
                let overallGradeVal = '';
                let overallTargetCgpaVal = '';
                let overallTargetGradeVal = '';
                let isEstimatedOverall = false;
                let isExplicitNone = false;

                if (evalType === 'grade') {
                    overallGradeVal = document.getElementById('res-overall-grade').value.trim();
                    overallTargetGradeVal = document.getElementById('res-overall-target-grade').value.trim();

                    if (overallTargetGradeVal.toLowerCase() === 'none' || overallTargetGradeVal === '0') {
                        overallTargetGradeVal = 'none';
                        overallTargetCgpaVal = 'none';
                        isExplicitNone = true;
                    }

                    // Manual input works, otherwise empty. Est is handled on the fly / rendering.
                    if (!overallGradeVal) {
                        overallGradeVal = '';
                        overallVal = '';
                        isEstimatedOverall = true;
                    } else {
                        overallVal = overallGradeVal ? window.mapGradeToNumeric(overallGradeVal, evalType).toFixed(2) : '';
                        isEstimatedOverall = false;
                    }
                    if (!isExplicitNone) {
                        overallTargetCgpaVal = overallTargetGradeVal ? window.mapGradeToNumeric(overallTargetGradeVal, evalType).toFixed(2) : '';
                    }
                } else {
                    overallVal = document.getElementById('res-overall-cgpa').value.trim();
                    overallTargetCgpaVal = document.getElementById('res-overall-target-cgpa').value.trim();

                    if (overallTargetCgpaVal.toLowerCase() === 'none' || overallTargetCgpaVal === '0') {
                        overallTargetGradeVal = 'none';
                        overallTargetCgpaVal = 'none';
                        isExplicitNone = true;
                    } else {
                        overallTargetCgpaVal = window.validateAndFormatCgpa(overallTargetCgpaVal);
                    }

                    // Manual input works, otherwise empty. Est is handled on the fly / rendering.
                    if (!overallVal) {
                        overallVal = '';
                        overallGradeVal = '';
                        isEstimatedOverall = true;
                    } else {
                        overallVal = window.validateAndFormatCgpa(overallVal);
                        overallGradeVal = overallVal ? window.mapCgpaToGrade(overallVal, evalType) : '';
                        isEstimatedOverall = false;
                    }
                    if (!isExplicitNone) {
                        overallTargetGradeVal = overallTargetCgpaVal ? window.mapCgpaToGrade(overallTargetCgpaVal, evalType) : '';
                    }
                }


                if (overallVal || overallGradeVal || overallTargetCgpaVal || overallTargetGradeVal) {
                    window.successResults.push({
                        id: 'res_' + Date.now() + '_overall',
                        type: 'cgpa',
                        evaluationType: evalType,
                        title: window.editingProgramName,
                        subject: '',
                        value: overallVal,
                        grade: overallGradeVal,
                        targetGrade: overallTargetGradeVal,
                        targetCGPA: overallTargetCgpaVal,
                        date: date,
                        isEstimated: isEstimatedOverall
                    });
                }

                let timeOffset = 1;
                for (const [subName, subScores] of Object.entries(subjectsData)) {
                    window.successResults.push({
                        id: 'res_' + (Date.now() + timeOffset),
                        type: 'cgpa',
                        evaluationType: evalType,
                        title: window.editingProgramName,
                        subject: subName,
                        value: subScores.cgpa,
                        grade: subScores.grade,
                        targetCGPA: overallTargetCgpaVal,
                        targetGrade: overallTargetGradeVal,
                        date: date
                    });
                    timeOffset++;
                }

            } else if (window.editingResultId) {
                // 2. SINGLE EDIT MODE (ACHIEVEMENT)
                const res = window.successResults.find(r => r.id === window.editingResultId);
                if (!res) return showToast("Result not found", "error");

                const value = document.getElementById('res-value').value.trim();
                const grade = document.getElementById('res-grade').value.trim();
                if (!value) return showToast("Result/Value is required", "error");

                res.value = value;
                res.grade = grade;
                res.date = date;

            } else {
                // 3. ADD MODE
                if (type === 'cgpa') {
                    const program = document.getElementById('res-prog-select').value;
                    if (!program) return showToast("Target program is required", "error");

                    // Retrieve main target configuration BEFORE modifying
                    const fallbackMainTarget = window.getProgramMainTarget(program);

                    let loggedCount = 0;
                    const evalType = document.getElementById('res-evaluation-type').value;

                    // Subjects first (needed for estimating overall if blank)
                    let gradeInputs = [];
                    let cgpaInputs = [];
                    if (evalType === 'grade') {
                        gradeInputs = document.querySelectorAll('.res-sub-grade-input');
                    } else {
                        cgpaInputs = document.querySelectorAll('.res-sub-cgpa-input');
                    }

                    const subjectsData = {};
                    if (evalType === 'grade') {
                        gradeInputs.forEach(input => {
                            const sub = input.getAttribute('data-subject');
                            const gVal = input.value.trim();
                            if (gVal) {
                                subjectsData[sub] = {
                                    grade: gVal,
                                    cgpa: window.mapGradeToNumeric(gVal, evalType).toFixed(2)
                                };
                            }
                        });
                    } else {
                        cgpaInputs.forEach(input => {
                            const sub = input.getAttribute('data-subject');
                            const cVal = input.value.trim();
                            if (cVal) {
                                const formattedCgpa = window.validateAndFormatCgpa(cVal);
                                if (formattedCgpa) {
                                    subjectsData[sub] = {
                                        // Automatically calculate and save estimated grade from CGPA
                                        grade: window.mapCgpaToGrade(formattedCgpa, evalType),
                                        cgpa: formattedCgpa
                                    };
                                }
                            }
                        });
                    }

                    // Overall program score
                    let overallVal = '';
                    let overallGradeVal = '';
                    let overallTargetCgpaVal = '';
                    let overallTargetGradeVal = '';
                    let isEstimatedOverall = false;
                    let isExplicitNone = false;

                    if (evalType === 'grade') {
                        overallGradeVal = document.getElementById('res-overall-grade').value.trim();
                        overallTargetGradeVal = document.getElementById('res-overall-target-grade').value.trim();

                        if (overallTargetGradeVal.toLowerCase() === 'none' || overallTargetGradeVal === '0') {
                            overallTargetGradeVal = 'none';
                            overallTargetCgpaVal = 'none';
                            isExplicitNone = true;
                        }

                        // Manual input works, otherwise empty. Est is handled on the fly / rendering.
                        if (!overallGradeVal) {
                            overallGradeVal = '';
                            overallVal = '';
                            isEstimatedOverall = true;
                        } else {
                            overallVal = overallGradeVal ? window.mapGradeToNumeric(overallGradeVal, evalType).toFixed(2) : '';
                            isEstimatedOverall = false;
                        }
                        if (!isExplicitNone) {
                            overallTargetCgpaVal = overallTargetGradeVal ? window.mapGradeToNumeric(overallTargetGradeVal, evalType).toFixed(2) : '';
                        }
                    } else {
                        overallVal = document.getElementById('res-overall-cgpa').value.trim();
                        overallTargetCgpaVal = document.getElementById('res-overall-target-cgpa').value.trim();

                        if (overallTargetCgpaVal.toLowerCase() === 'none' || overallTargetCgpaVal === '0') {
                            overallTargetGradeVal = 'none';
                            overallTargetCgpaVal = 'none';
                            isExplicitNone = true;
                        } else {
                            overallTargetCgpaVal = window.validateAndFormatCgpa(overallTargetCgpaVal);
                        }

                        // Manual input works, otherwise empty. Est is handled on the fly / rendering.
                        if (!overallVal) {
                            overallVal = '';
                            overallGradeVal = '';
                            isEstimatedOverall = true;
                        } else {
                            overallVal = window.validateAndFormatCgpa(overallVal);
                            overallGradeVal = overallVal ? window.mapCgpaToGrade(overallVal, evalType) : '';
                            isEstimatedOverall = false;
                        }
                        if (!isExplicitNone) {
                            overallTargetGradeVal = overallTargetCgpaVal ? window.mapCgpaToGrade(overallTargetCgpaVal, evalType) : '';
                        }
                    }


                    if (overallVal || overallGradeVal || overallTargetCgpaVal || overallTargetGradeVal) {
                        window.successResults.push({
                            id: 'res_' + Date.now() + '_overall',
                            type: 'cgpa',
                            evaluationType: evalType,
                            title: program,
                            subject: '',
                            value: overallVal,
                            grade: overallGradeVal,
                            targetGrade: overallTargetGradeVal,
                            targetCGPA: overallTargetCgpaVal,
                            date: date,
                            isEstimated: isEstimatedOverall
                        });
                        loggedCount++;
                    }

                    let timeOffset = 1;
                    for (const [subName, subScores] of Object.entries(subjectsData)) {
                        window.successResults.push({
                            id: 'res_' + (Date.now() + timeOffset),
                            type: 'cgpa',
                            evaluationType: evalType,
                            title: program,
                            subject: subName,
                            value: subScores.cgpa,
                            grade: subScores.grade,
                            targetCGPA: overallTargetCgpaVal,
                            targetGrade: overallTargetGradeVal,
                            date: date
                        });
                        timeOffset++;
                        loggedCount++;
                    }

                    if (loggedCount === 0) {
                        return showToast("Please enter at least one score to save.", "error");
                    }

                } else {
                    const title = document.getElementById('res-title-input').value.trim();
                    const value = document.getElementById('res-value').value.trim();
                    const grade = document.getElementById('res-grade').value.trim();

                    if (!title) return showToast("Achievement title is required", "error");
                    if (!value) return showToast("Result/Value is required", "error");

                    window.successResults.push({
                        id: 'res_' + Date.now(),
                        type: 'achievement',
                        title: title,
                        value: value,
                        grade: grade,
                        date: date
                    });
                }
            }

            window.syncPassFreezeFromResults();
            saveToCloud();
            renderUI();
            closeModal('result-modal');
            showToast("Result saved successfully!", "success");
        };

        window.deleteResult = function (id) {
            window.openConfirmModal("Delete Result", "Are you sure you want to delete this result?", () => {
                window.successResults = window.successResults.filter(r => r.id !== id);
                window.syncPassFreezeFromResults();
                saveToCloud();
                renderUI();
                showToast("Result deleted", "success");
            });
        };

        window.deleteProgramGroup = function (programName) {
            window.openConfirmModal("Delete Program Card", `Are you sure you want to delete this program card and all its subject results?`, () => {
                window.successResults = window.successResults.filter(r => !(r.type === 'cgpa' && r.title === programName));
                window.syncPassFreezeFromResults();
                saveToCloud();
                renderUI();
                showToast("Program card deleted", "success");
            });
        };

        window.renderOutcomeProgramToggles = function () {
            const bar = document.getElementById('outcome-programs-toggle-bar');
            if (!bar) return;

            if (!window.programVisibility) {
                window.programVisibility = {};
                window.getAllPrograms().forEach(pObj => {
                    const pName = pObj.name || pObj;
                    window.programVisibility[pName] = true;
                });
            }

            let html = '';
            window.getAllPrograms().forEach(pObj => {
                const pName = pObj.name || pObj;
                const active = window.programVisibility[pName] !== false;
                const color = window.getProgramColor(pName);

                const activeStyle = active
                    ? `background-color: ${color}; color: white; border-color: ${color};`
                    : `background-color: transparent; border-color: #cbd5e1; color: #64748b; opacity: 0.6;`;

                html += `
                <button onclick="window.toggleOutcomeProgram('${pName.replace(/'/g, "\\'")}')" 
                    class="px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center gap-1.5 shadow-sm" 
                    style="${activeStyle}">
                    <span class="w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-slate-400'}"></span>
                    <span>${pName}</span>
                </button>`;
            });

            bar.innerHTML = html;
        };

        window.toggleOutcomeProgram = function (pName) {
            if (!window.programVisibility) window.programVisibility = {};
            window.programVisibility[pName] = !window.programVisibility[pName];

            // Sync with chart visibility as well!
            if (window.chartVisibility && window.chartVisibility.prog) {
                window.chartVisibility.prog[pName] = window.programVisibility[pName];
                // Update chart
                if (window.mainChartPrograms) {
                    const ds = window.mainChartPrograms.data.datasets.find(d => d.label === pName);
                    if (ds) ds.hidden = !window.programVisibility[pName];
                    window.mainChartPrograms.update();
                }
            }

            // Save and re-render everything
            saveToCloud();
            renderUI();
        };

        // --- Freeze & Pass System Logic ---
        window.renderPassConfig = function () {
            const container = document.getElementById('outcome-pass-container');
            if (!container) return;
            if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };

            let html = '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4 font-bold">Mark entire programs or specific subjects as "Passed". This freezes them, compressing their UI in the Task List and instantly satisfying their pacing requirements.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">';

            // Programs Column
            html += '<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Programs (Freeze All Subs)</h4><div class="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">';
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id] && window.customPrograms[track.id].length > 0) {
                    html += `<div class="mt-2 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1">${track.name.toUpperCase()}</div>`;
                    window.customPrograms[track.id].forEach(p => {
                        const pName = p.name || p;
                        const isChecked = window.passedItems.programs.includes(pName) ? 'checked' : '';
                        html += `
                        <label class="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all">
                            <input type="checkbox" onchange="window.togglePassStatus('program', '${pName}', this.checked)" class="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 transition-all" ${isChecked}>
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${pName}</span>
                        </label>`;
                    });
                }
            });
            html += '</div></div>';

            // Subjects Column (Updated to Accordions)
            html += '<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Individual Subjects</h4><div class="flex flex-col gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">';
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id]) {
                    window.customPrograms[track.id].forEach(prog => {
                        const progName = prog.name || prog;
                        const subs = (syllabusStructure[track.id] || []).filter(s => s.program === progName);
                        if (subs.length > 0) {
                            html += `
                            <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group">
                                <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                                    <div class="flex items-center space-x-2">
                                        <span>${progName}</span>
                                        <span class="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subs</span>
                                    </div>
                                    <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </summary>
                                <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                                    <div class="flex flex-col gap-1.5 mt-3">
                            `;
                            subs.forEach(s => {
                                const isProgPassed = window.passedItems.programs.includes(progName);
                                const isChecked = window.passedItems.subjects.includes(s.subject) || isProgPassed ? 'checked' : '';
                                let displaySub = s.subject.replace(s.program + ' - ', '').replace(s.program + ' ', '');
                                html += `
                                        <label class="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 active:scale-95 transition-all">
                                            <input type="checkbox" onchange="window.togglePassStatus('subject', '${s.subject}', this.checked)" class="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 transition-all" ${isChecked}>
                                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">${displaySub}</span>
                                        </label>`;
                            });
                            html += `
                                    </div>
                                </div>
                            </details>`;
                        }
                    });
                }
            });
            html += '</div></div></div>';

            container.innerHTML = html;
        };

        // --- Weekly Targets System Logic ---
        window.weeklyTargetsDatabase = {};

        window.formatDateRangeKey = function (start, end) {
            const opt = { day: '2-digit', month: 'short', year: 'numeric' };
            const startStr = start.toLocaleDateString('en-GB', opt);
            const endStr = end.toLocaleDateString('en-GB', opt);
            return `${startStr} - ${endStr}`;
        };

        window.getWeeklyTargetRange = function (date = new Date()) {
            const today = new Date(date);
            today.setHours(0, 0, 0, 0);
            const day = today.getDay(); // 0 is Sun, 6 is Sat
            const daysSinceSat = (day === 6) ? 0 : (day + 1);

            const startOfWeek = new Date(today.getTime() - (daysSinceSat * 24 * 60 * 60 * 1000));
            startOfWeek.setHours(0, 1, 0, 0); // Sat 00:01 AM

            const endOfWeek = new Date(startOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000));
            endOfWeek.setHours(23, 59, 59, 999); // Fri 11:59 PM

            return { start: startOfWeek, end: endOfWeek, daysSinceSat: daysSinceSat };
        };

        window.findTaskChapter = function (track, subject, chapter) {
            const key = track + 'Tasks';
            for (let i = 0; i < tasks.length; i++) {
                const t = tasks[i];
                if (t.type === 'study' && Array.isArray(t[key])) {
                    const found = t[key].find(b => b.subject === subject && b.chapter === chapter);
                    if (found) {
                        return { taskIndex: i, subTask: found };
                    }
                }
            }
            return null;
        };

        window.getChaptersForSubject = function (track, subject) {
            const key = track + 'Tasks';
            const chapters = new Set();
            tasks.forEach(t => {
                if (t.type === 'study' && Array.isArray(t[key])) {
                    t[key].forEach(b => {
                        if (b.subject === subject && b.chapter) {
                            chapters.add(b.chapter);
                        }
                    });
                }
            });
            return Array.from(chapters).sort((a, b) => {
                const extractNum = (chStr) => {
                    const match = chStr.match(/(\d+)(?!.*\d)/);
                    return match ? parseInt(match[0]) : 999;
                };
                return extractNum(a) - extractNum(b);
            });
        };

        window.updateWeeklyTargetSubjectDropdown = function () {
            const progSelectEl = document.getElementById('wt-select-prog');
            const progName = progSelectEl ? progSelectEl.value : '';
            const subSelect = document.getElementById('wt-select-sub');
            if (!subSelect) return;
            subSelect.innerHTML = '';

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId) {
                subSelect.innerHTML = '<option value="">No Subjects</option>';
                window.updateWeeklyTargetChapterDropdown();
                return;
            }

            const subs = (syllabusStructure[trackId] || []).filter(s => s.program === progName);
            if (subs.length === 0) {
                subSelect.innerHTML = '<option value="">No Subjects</option>';
            } else {
                subs.forEach(s => {
                    subSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`;
                });
            }
            window.updateWeeklyTargetChapterDropdown();
        };

        window.updateWeeklyTargetChapterDropdown = function () {
            const progSelectEl = document.getElementById('wt-select-prog');
            const progName = progSelectEl ? progSelectEl.value : '';
            const subSelectEl = document.getElementById('wt-select-sub');
            const subject = subSelectEl ? subSelectEl.value : '';
            const chSelect = document.getElementById('wt-select-ch');
            if (!chSelect) return;
            chSelect.innerHTML = '';

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId || !subject) {
                chSelect.innerHTML = '<option value="">No Chapters</option>';
                return;
            }

            const chapters = window.getChaptersForSubject(trackId, subject);
            if (chapters.length === 0) {
                chSelect.innerHTML = '<option value="">No Chapters</option>';
            } else {
                chapters.forEach(ch => {
                    chSelect.innerHTML += `<option value="${ch}">${ch}</option>`;
                });
            }
        };

        window.addWeeklyTarget = function () {
            const range = window.getWeeklyTargetRange();
            const currentWeekKey = window.formatDateRangeKey(range.start, range.end);

            const weekSelectEl = document.getElementById('wt-select-week');
            const targetWeekKey = weekSelectEl ? weekSelectEl.value : currentWeekKey;

            const progSelectEl = document.getElementById('wt-select-prog');
            const subSelectEl = document.getElementById('wt-select-sub');
            const chSelectEl = document.getElementById('wt-select-ch');
            const progName = progSelectEl ? progSelectEl.value : '';
            const subject = subSelectEl ? subSelectEl.value : '';
            const chapter = chSelectEl ? chSelectEl.value : '';

            if (!progName || !subject || !chapter) {
                return showToast("Please select a Program, Subject, and Chapter.", "error");
            }

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId) return;

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};
            if (!window.weeklyTargetsDatabase[targetWeekKey]) window.weeklyTargetsDatabase[targetWeekKey] = [];

            // Check if already exists in weekly targets database for selected week
            const exists = window.weeklyTargetsDatabase[targetWeekKey].some(t => t.track === trackId && t.subject === subject && t.chapter === chapter);
            if (exists) {
                return showToast("This target is already in your weekly target list.", "error");
            }

            // Sync baseline completion status from daily tasks
            const foundTask = window.findTaskChapter(trackId, subject, chapter);
            const isCompletedBefore = foundTask ? (foundTask.subTask.completed || false) : false;
            const completedAtBefore = foundTask ? (foundTask.subTask.completedAt || null) : null;

            window.weeklyTargetsDatabase[targetWeekKey].push({
                track: trackId,
                program: progName,
                subject: subject,
                chapter: chapter,
                completed: isCompletedBefore,
                completedAt: completedAtBefore
            });

            saveToCloud();
            renderUI();
            showToast("Weekly target chapter added!", "success");
        };

        window.deleteWeeklyTarget = function (idx) {
            const weekSelectEl = document.getElementById('wt-select-week');
            if (!weekSelectEl) return;
            const selectedWeekKey = weekSelectEl.value;

            if (window.weeklyTargetsDatabase && window.weeklyTargetsDatabase[selectedWeekKey] && window.weeklyTargetsDatabase[selectedWeekKey][idx]) {
                window.weeklyTargetsDatabase[selectedWeekKey].splice(idx, 1);
                saveToCloud();
                renderUI();
                showToast("Weekly target removed.", "success");
            }
        };

        window.toggleWeeklyTargetCompletion = function (idx, isCompleted) {
            const weekSelectEl = document.getElementById('wt-select-week');
            if (!weekSelectEl) return;
            const selectedWeekKey = weekSelectEl.value;

            if (!window.weeklyTargetsDatabase || !window.weeklyTargetsDatabase[selectedWeekKey] || !window.weeklyTargetsDatabase[selectedWeekKey][idx]) return;

            const target = window.weeklyTargetsDatabase[selectedWeekKey][idx];
            target.completed = isCompleted;
            target.completedAt = isCompleted ? new Date().toISOString() : null; // Sync date

            const found = window.findTaskChapter(target.track, target.subject, target.chapter);
            if (found) {
                found.subTask.completed = isCompleted;
                found.subTask.completedAt = target.completedAt; // Sync date
                recalculateTotals();
            }

            saveToCloud();
            renderUI();
            showToast("Chapter completion state synchronized!", "success");
        };

        window.navigateWeek = function (mode) {
            const weekSelectEl = document.getElementById('wt-select-week');
            if (!weekSelectEl) return;

            const presentRange = window.getWeeklyTargetRange();
            const presentWeekKey = window.formatDateRangeKey(presentRange.start, presentRange.end);

            const pastRange = window.getWeeklyTargetRange(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const pastWeekKey = window.formatDateRangeKey(pastRange.start, pastRange.end);

            const futureRange = window.getWeeklyTargetRange(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const futureWeekKey = window.formatDateRangeKey(futureRange.start, futureRange.end);

            let targetKey = presentWeekKey;
            if (mode === 'past') targetKey = pastWeekKey;
            else if (mode === 'future') targetKey = futureWeekKey;

            // Make sure the option exists in the selector
            let optionExists = false;
            for (let i = 0; i < weekSelectEl.options.length; i++) {
                if (weekSelectEl.options[i].value === targetKey) {
                    optionExists = true;
                    break;
                }
            }

            if (!optionExists) {
                const opt = document.createElement('option');
                opt.value = targetKey;
                opt.textContent = targetKey;
                weekSelectEl.appendChild(opt);
            }

            weekSelectEl.value = targetKey;
            window.renderWeeklyTargets();
        };

        window.renderWeeklyTargets = function () {
            const listContainer = document.getElementById('weekly-targets-list');
            const progDropdown = document.getElementById('wt-select-prog');
            const weekSelectEl = document.getElementById('wt-select-week');
            if (!listContainer || !progDropdown || !weekSelectEl) return;

            // 1. Calculate current week range
            const currentRange = window.getWeeklyTargetRange();
            const currentWeekKey = window.formatDateRangeKey(currentRange.start, currentRange.end);

            // 2. Collect all weeks in database + current week + past/future navigation weeks
            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};

            const pastRange = window.getWeeklyTargetRange(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const pastWeekKey = window.formatDateRangeKey(pastRange.start, pastRange.end);

            const futureRange = window.getWeeklyTargetRange(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const futureWeekKey = window.formatDateRangeKey(futureRange.start, futureRange.end);

            const allWeeksSet = new Set(Object.keys(window.weeklyTargetsDatabase));
            allWeeksSet.add(pastWeekKey);
            allWeeksSet.add(currentWeekKey);
            allWeeksSet.add(futureWeekKey);

            const allWeeks = Array.from(allWeeksSet).sort((a, b) => {
                const parseStart = (wkStr) => {
                    const parts = wkStr.split(' - ');
                    return parts[0] ? new Date(parts[0]) : new Date(0);
                };
                return parseStart(b) - parseStart(a);
            });

            // 3. Update week selector options if count/keys mismatch
            const currentSelectedWeek = weekSelectEl.value || currentWeekKey;
            if (weekSelectEl.options.length !== allWeeks.length) {
                weekSelectEl.innerHTML = '';
                allWeeks.forEach(wk => {
                    weekSelectEl.innerHTML += `<option value="${wk}">${wk}</option>`;
                });
                weekSelectEl.value = allWeeks.includes(currentSelectedWeek) ? currentSelectedWeek : currentWeekKey;
            }

            const activeWeekKey = weekSelectEl.value;

            // 4. Update Header displays
            document.getElementById('wt-selected-week-range').textContent = `[ ${activeWeekKey} ]`;

            const todayDate = new Date();
            const weekday = todayDate.toLocaleDateString('en-GB', { weekday: 'long' });
            const formattedToday = todayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            document.getElementById('wt-today-display').textContent = `Today: ${weekday}, ${formattedToday}`;

            const btnPast = document.getElementById('wt-btn-past');
            const btnPresent = document.getElementById('wt-btn-present');
            const btnFuture = document.getElementById('wt-btn-future');

            const activeClass = "bg-blue-600 text-white shadow";
            const inactiveClass = "text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/50";

            if (btnPast && btnPresent && btnFuture) {
                btnPast.className = `px-2.5 py-1.5 text-[9px] font-black rounded-lg transition-all ${activeWeekKey === pastWeekKey ? activeClass : inactiveClass}`;
                btnPresent.className = `px-2.5 py-1.5 text-[9px] font-black rounded-lg transition-all ${activeWeekKey === currentWeekKey ? activeClass : inactiveClass}`;
                btnFuture.className = `px-2.5 py-1.5 text-[9px] font-black rounded-lg transition-all ${activeWeekKey === futureWeekKey ? activeClass : inactiveClass}`;
            }

            // 5. Keep add form container visible for all weeks
            const addFormContainer = document.getElementById('wt-add-form-container');
            if (addFormContainer) {
                addFormContainer.classList.remove('hidden');
            }

            // 6. Update Programs / Subjects / Chapters selectors
            const activeProgs = [];
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id]) {
                    window.customPrograms[track.id].forEach(p => {
                        activeProgs.push(p.name || p);
                    });
                }
            });

            const currentSelectedProg = progDropdown.value;
            if (progDropdown.options.length !== activeProgs.length) {
                progDropdown.innerHTML = '';
                activeProgs.forEach(p => {
                    progDropdown.innerHTML += `<option value="${p}">${p}</option>`;
                });
                if (activeProgs.length > 0) {
                    if (activeProgs.includes(currentSelectedProg)) {
                        progDropdown.value = currentSelectedProg;
                    }
                    window.updateWeeklyTargetSubjectDropdown();
                }
            }

            // 7. Render targets list
            listContainer.innerHTML = '';
            const targetsList = window.weeklyTargetsDatabase[activeWeekKey] || [];

            let totalTargets = targetsList.length;
            let completedTargets = 0;

            targetsList.forEach((target, idx) => {
                const foundTask = window.findTaskChapter(target.track, target.subject, target.chapter);
                const isCompleted = target.completed || (foundTask ? foundTask.subTask.completed : false);
                if (isCompleted) completedTargets++;

                const statusColor = isCompleted
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30';

                let displaySub = target.subject.replace(target.program + ' - ', '').replace(target.program + ' ', '');

                const itemHtml = `
                <div class="flex items-center justify-between p-3 rounded-2xl border ${statusColor} transition-all duration-300">
                    <div class="flex items-center space-x-3 min-w-0">
                        <input type="checkbox" 
                            onchange="window.toggleWeeklyTargetCompletion(${idx}, this.checked)" 
                            class="form-checkbox h-4.5 w-4.5 text-emerald-500 dark:text-emerald-500 rounded border-slate-350 focus:ring-emerald-500 transition-all cursor-pointer" 
                            ${isCompleted ? 'checked' : ''}>
                        <div class="min-w-0">
                            <span class="block text-xs font-black text-slate-800 dark:text-slate-100 truncate">${target.chapter}: ${displaySub}</span>
                            <span class="block text-[8px] font-black uppercase text-slate-400 tracking-wider">${target.program}</span>
                        </div>
                    </div>
                    <button onclick="window.deleteWeeklyTarget(${idx})" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-500 rounded-lg transition-all active:scale-90 shadow-sm shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>`;
                listContainer.innerHTML += itemHtml;
            });

            if (totalTargets === 0) {
                listContainer.innerHTML = `
                <div class="col-span-full py-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    No weekly targets set for this week.
                </div>`;
            }

            // 8. Pacing metrics calculations
            const remainingTargets = totalTargets - completedTargets;
            const estFinishEl = document.getElementById('wt-est-finish');

            if (activeWeekKey === currentWeekKey) {
                const daysSinceSat = currentRange.daysSinceSat;
                const daysLeft = 7 - daysSinceSat;

                const reqPace = daysLeft > 0 ? (remainingTargets / daysLeft) : 0;
                const actPace = completedTargets / (daysSinceSat + 1);

                document.getElementById('wt-req-pace').textContent = `${reqPace.toFixed(2)} Ch/Day`;
                document.getElementById('wt-act-pace').textContent = `${actPace.toFixed(2)} Ch/Day`;

                if (remainingTargets === 0) {
                    estFinishEl.textContent = 'Goal Met';
                    estFinishEl.className = 'text-xs font-black text-emerald-600 dark:text-emerald-400';
                } else if (actPace === 0) {
                    estFinishEl.textContent = 'Infinite';
                    estFinishEl.className = 'text-xs font-black text-red-600 dark:text-red-400';
                } else {
                    const daysNeeded = remainingTargets / actPace;
                    const estDate = new Date();
                    estDate.setDate(estDate.getDate() + Math.ceil(daysNeeded));

                    const opt = { day: 'numeric', month: 'short', year: 'numeric' };
                    estFinishEl.textContent = estDate.toLocaleDateString('en-GB', opt);
                    estFinishEl.className = 'text-xs font-black text-purple-600 dark:text-purple-400';
                }
            } else {
                document.getElementById('wt-req-pace').textContent = `0.00 Ch/Day`;
                const actPace = completedTargets / 7;
                document.getElementById('wt-act-pace').textContent = `${actPace.toFixed(2)} Ch/Day`;

                if (remainingTargets === 0) {
                    estFinishEl.textContent = 'Goal Met';
                    estFinishEl.className = 'text-xs font-black text-emerald-600 dark:text-emerald-400';
                } else {
                    estFinishEl.textContent = 'Not Met';
                    estFinishEl.className = 'text-xs font-black text-rose-600 dark:text-rose-400';
                }
            }
        };

        window.renderDashboardWeeklyChecklist = function () {
            const listContainer = document.getElementById('db-weekly-targets-checklist');
            const pctEl = document.getElementById('db-weekly-checklist-pct');
            const rangeEl = document.getElementById('db-weekly-checklist-range');
            const progressEl = document.getElementById('db-weekly-checklist-progress');
            if (!listContainer) return;

            const currentRange = window.getWeeklyTargetRange();
            const currentWeekKey = window.formatDateRangeKey(currentRange.start, currentRange.end);

            if (rangeEl) rangeEl.textContent = `Week: ${currentWeekKey}`;

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};
            const targetsList = window.weeklyTargetsDatabase[currentWeekKey] || [];

            let totalTargets = targetsList.length;
            let completedTargets = 0;

            listContainer.innerHTML = '';

            targetsList.forEach((target, idx) => {
                const foundTask = window.findTaskChapter(target.track, target.subject, target.chapter);
                const isCompleted = target.completed || (foundTask ? foundTask.subTask.completed : false);
                if (isCompleted) completedTargets++;

                const statusColor = isCompleted
                    ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30';

                let displaySub = target.subject.replace(target.program + ' - ', '').replace(target.program + ' ', '');

                const itemHtml = `
                <div class="flex items-center justify-between p-2.5 rounded-xl border ${statusColor} transition-all duration-300">
                    <div class="flex items-center space-x-2.5 min-w-0">
                        <input type="checkbox" 
                            onchange="window.toggleDashboardWeeklyTargetCompletion(${idx}, this.checked)" 
                            class="form-checkbox h-4.5 w-4.5 text-emerald-500 dark:text-emerald-500 rounded border-slate-350 focus:ring-emerald-500 transition-all cursor-pointer" 
                            ${isCompleted ? 'checked' : ''}>
                        <div class="min-w-0">
                            <span class="block text-[11px] font-black text-slate-800 dark:text-slate-100 truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${target.chapter}: ${displaySub}</span>
                            <span class="block text-[8px] font-black uppercase text-slate-400 tracking-wider">${target.program}</span>
                        </div>
                    </div>
                </div>`;
                listContainer.innerHTML += itemHtml;
            });

            if (totalTargets === 0) {
                listContainer.innerHTML = `
                <div class="py-8 text-center text-[9px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    No targets set for this week.
                </div>`;
            }

            const pct = totalTargets === 0 ? 0 : Math.round((completedTargets / totalTargets) * 100);
            if (pctEl) pctEl.textContent = `${completedTargets}/${totalTargets} (${pct}%)`;
            if (progressEl) progressEl.style.width = `${pct}%`;
        };

        window.toggleDashboardWeeklyTargetCompletion = function (idx, isCompleted) {
            const currentRange = window.getWeeklyTargetRange();
            const currentWeekKey = window.formatDateRangeKey(currentRange.start, currentRange.end);

            if (!window.weeklyTargetsDatabase || !window.weeklyTargetsDatabase[currentWeekKey] || !window.weeklyTargetsDatabase[currentWeekKey][idx]) return;

            const target = window.weeklyTargetsDatabase[currentWeekKey][idx];
            target.completed = isCompleted;
            target.completedAt = isCompleted ? new Date().toISOString() : null;

            const found = window.findTaskChapter(target.track, target.subject, target.chapter);
            if (found) {
                found.subTask.completed = isCompleted;
                found.subTask.completedAt = target.completedAt;
                recalculateTotals();
            }

            saveToCloud();
            renderUI();
            showToast("Weekly checklist completion synchronized!", "success");
        };

        // --- Weekly Targets Database Modal Controls & Logic ---
        window.openWeeklyTargetsDatabase = function () {
            const modal = document.getElementById('weekly-targets-db-modal');
            if (!modal) return;

            modal.classList.remove('hidden');
            setTimeout(() => {
                const backdrop = document.getElementById('wtdb-backdrop');
                const content = document.getElementById('wtdb-content');
                if (backdrop) backdrop.classList.replace('opacity-0', 'opacity-100');
                if (content) {
                    content.classList.replace('scale-95', 'scale-100');
                    content.classList.replace('opacity-0', 'opacity-100');
                    content.classList.replace('translate-y-4', 'translate-y-0');
                }
            }, 10);

            window.switchWtdbTab('list');
            window.populateWtdbFilters();
            window.renderWtdbList();
        };

        window.switchWtdbTab = function (tab) {
            const listBtn = document.getElementById('wtdb-tab-btn-list');
            const monthBtn = document.getElementById('wtdb-tab-btn-month');
            const listContent = document.getElementById('wtdb-tab-content-list');
            const monthContent = document.getElementById('wtdb-tab-content-month');

            if (tab === 'list') {
                listBtn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-blue-600 text-white shadow-md whitespace-nowrap";
                monthBtn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap";
                listContent.classList.remove('hidden');
                monthContent.classList.add('hidden');
                window.renderWtdbList();
            } else {
                monthBtn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-blue-600 text-white shadow-md whitespace-nowrap";
                listBtn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap";
                listContent.classList.add('hidden');
                monthContent.classList.remove('hidden');
                window.renderWtdbMonthView();
            }
        };

        window.populateWtdbFilters = function () {
            const weekFilter = document.getElementById('wtdb-filter-week');
            const progFilter = document.getElementById('wtdb-filter-prog');
            const subFilter = document.getElementById('wtdb-filter-sub');
            const addProgSelect = document.getElementById('wtdb-add-prog');

            if (!weekFilter || !progFilter || !subFilter) return;

            const currentRange = window.getWeeklyTargetRange();
            const currentWeekKey = window.formatDateRangeKey(currentRange.start, currentRange.end);

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};
            const allWeeksSet = new Set(Object.keys(window.weeklyTargetsDatabase));
            allWeeksSet.add(currentWeekKey);
            const allWeeks = Array.from(allWeeksSet).sort((a, b) => {
                const parseStart = (wkStr) => {
                    const parts = wkStr.split(' - ');
                    return parts[0] ? new Date(parts[0]) : new Date(0);
                };
                return parseStart(b) - parseStart(a);
            });

            const prevWeekVal = weekFilter.value;
            weekFilter.innerHTML = '<option value="all">All Weeks</option>';
            allWeeks.forEach(wk => {
                weekFilter.innerHTML += `<option value="${wk}">${wk}</option>`;
            });
            if (prevWeekVal) weekFilter.value = prevWeekVal;
            else weekFilter.value = currentWeekKey;

            const activeProgs = [];
            window.tracks.forEach(track => {
                if (window.customPrograms[track.id]) {
                    window.customPrograms[track.id].forEach(p => {
                        activeProgs.push(p.name || p);
                    });
                }
            });

            const prevProgVal = progFilter.value;
            progFilter.innerHTML = '<option value="all">All Programs</option>';
            if (addProgSelect) addProgSelect.innerHTML = '';
            activeProgs.forEach(p => {
                progFilter.innerHTML += `<option value="${p}">${p}</option>`;
                if (addProgSelect) addProgSelect.innerHTML += `<option value="${p}">${p}</option>`;
            });
            if (prevProgVal) progFilter.value = prevProgVal;

            if (addProgSelect) window.updateWtdbAddSubjectDropdown();

            const prevSubVal = subFilter.value;
            subFilter.innerHTML = '<option value="all">All Subjects</option>';
            window.getAllSubjects().forEach(s => {
                subFilter.innerHTML += `<option value="${s.subject}">${s.subject}</option>`;
            });
            if (prevSubVal) subFilter.value = prevSubVal;
        };

        window.updateWtdbAddSubjectDropdown = function () {
            const addProgEl = document.getElementById('wtdb-add-prog');
            if (!addProgEl) return;
            const progName = addProgEl.value;
            const subSelect = document.getElementById('wtdb-add-sub');
            if (!subSelect) return;
            subSelect.innerHTML = '';

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId) {
                subSelect.innerHTML = '<option value="">No Subjects</option>';
                window.updateWtdbAddChapterDropdown();
                return;
            }

            const subs = (syllabusStructure[trackId] || []).filter(s => s.program === progName);
            if (subs.length === 0) {
                subSelect.innerHTML = '<option value="">No Subjects</option>';
            } else {
                subs.forEach(s => {
                    subSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`;
                });
            }
            window.updateWtdbAddChapterDropdown();
        };

        window.updateWtdbAddChapterDropdown = function () {
            const addProgEl = document.getElementById('wtdb-add-prog');
            if (!addProgEl) return;
            const progName = addProgEl.value;
            const subSelect = document.getElementById('wtdb-add-sub');
            if (!subSelect) return;
            const subject = subSelect.value;
            const chSelect = document.getElementById('wtdb-add-ch');
            if (!chSelect) return;
            chSelect.innerHTML = '';

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId || !subject) {
                chSelect.innerHTML = '<option value="">No Chapters</option>';
                return;
            }

            const chapters = window.getChaptersForSubject(trackId, subject);
            if (chapters.length === 0) {
                chSelect.innerHTML = '<option value="">No Chapters</option>';
            } else {
                chapters.forEach(ch => {
                    chSelect.innerHTML += `<option value="${ch}">${ch}</option>`;
                });
            }
        };

        window.addWtdbTarget = function () {
            const weekFilter = document.getElementById('wtdb-filter-week');
            let targetWeek = weekFilter ? weekFilter.value : '';
            if (!targetWeek || targetWeek === 'all') {
                const range = window.getWeeklyTargetRange();
                targetWeek = window.formatDateRangeKey(range.start, range.end);
            }

            const progName = document.getElementById('wtdb-add-prog').value;
            const subject = document.getElementById('wtdb-add-sub').value;
            const chapter = document.getElementById('wtdb-add-ch').value;

            if (!progName || !subject || !chapter) {
                return showToast("Please select a Program, Subject, and Chapter.", "error");
            }

            const trackId = window.tracks.find(t => window.customPrograms[t.id] && window.customPrograms[t.id].some(p => (p.name || p) === progName))?.id;
            if (!trackId) return;

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};
            if (!window.weeklyTargetsDatabase[targetWeek]) window.weeklyTargetsDatabase[targetWeek] = [];

            const exists = window.weeklyTargetsDatabase[targetWeek].some(t => t.track === trackId && t.subject === subject && t.chapter === chapter);
            if (exists) {
                return showToast("This target is already in the list for the selected week.", "error");
            }

            // Sync baseline completion status from daily tasks
            const foundTask = window.findTaskChapter(trackId, subject, chapter);
            const isCompletedBefore = foundTask ? (foundTask.subTask.completed || false) : false;
            const completedAtBefore = foundTask ? (foundTask.subTask.completedAt || null) : null;

            window.weeklyTargetsDatabase[targetWeek].push({
                track: trackId,
                program: progName,
                subject: subject,
                chapter: chapter,
                completed: isCompletedBefore,
                completedAt: completedAtBefore
            });

            saveToCloud();
            renderUI();
            window.renderWtdbList();
            showToast("Target added to week: " + targetWeek, "success");
        };

        window.deleteWtdbTarget = function (weekKey, idx) {
            if (window.weeklyTargetsDatabase && window.weeklyTargetsDatabase[weekKey] && window.weeklyTargetsDatabase[weekKey][idx]) {
                window.weeklyTargetsDatabase[weekKey].splice(idx, 1);
                saveToCloud();
                renderUI();
                window.renderWtdbList();
                showToast("Weekly target removed.", "success");
            }
        };

        window.toggleWtdbTargetCompletion = function (weekKey, idx, isCompleted) {
            if (!window.weeklyTargetsDatabase || !window.weeklyTargetsDatabase[weekKey] || !window.weeklyTargetsDatabase[weekKey][idx]) return;

            const target = window.weeklyTargetsDatabase[weekKey][idx];
            target.completed = isCompleted;
            target.completedAt = isCompleted ? new Date().toISOString() : null; // Sync date

            const found = window.findTaskChapter(target.track, target.subject, target.chapter);
            if (found) {
                found.subTask.completed = isCompleted;
                found.subTask.completedAt = target.completedAt; // Sync date
                recalculateTotals();
            }

            saveToCloud();
            renderUI();
            window.renderWtdbList();
            showToast("Target completion state updated!", "success");
        };

        window.renderWtdbList = function () {
            const tbody = document.getElementById('wtdb-targets-tbody');
            if (!tbody) return;

            const wFilter = document.getElementById('wtdb-filter-week').value;
            const pFilter = document.getElementById('wtdb-filter-prog').value;
            const sFilter = document.getElementById('wtdb-filter-sub').value;
            const statFilter = document.getElementById('wtdb-filter-status').value;

            tbody.innerHTML = '';
            let matchedCount = 0;

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};

            Object.keys(window.weeklyTargetsDatabase).forEach(weekKey => {
                if (wFilter !== 'all' && weekKey !== wFilter) return;

                const list = window.weeklyTargetsDatabase[weekKey] || [];
                list.forEach((target, idx) => {
                    if (pFilter !== 'all' && target.program !== pFilter) return;
                    if (sFilter !== 'all' && target.subject !== sFilter) return;

                    const foundTask = window.findTaskChapter(target.track, target.subject, target.chapter);
                    const isCompleted = target.completed || (foundTask ? foundTask.subTask.completed : false);
                    if (statFilter === 'completed' && !isCompleted) return;
                    if (statFilter === 'non-completed' && isCompleted) return;

                    matchedCount++;

                    let displaySub = target.subject.replace(target.program + ' - ', '').replace(target.program + ' ', '');

                    const row = `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td class="py-3 px-4 text-center">
                            <input type="checkbox" onchange="window.toggleWtdbTargetCompletion('${weekKey}', ${idx}, this.checked)" class="form-checkbox h-4 w-4 text-emerald-500 rounded cursor-pointer" ${isCompleted ? 'checked' : ''}>
                        </td>
                        <td class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-[10px]">${weekKey}</td>
                        <td class="py-3 px-4 uppercase text-[10px] text-slate-400">${target.program}</td>
                        <td class="py-3 px-4 truncate max-w-[120px]" title="${target.subject}">${displaySub}</td>
                        <td class="py-3 px-4 text-blue-600 dark:text-blue-400">${target.chapter}</td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="window.deleteWtdbTarget('${weekKey}', ${idx})" class="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded transition-all active:scale-90 shadow-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </td>
                    </tr>`;
                    tbody.innerHTML += row;
                });
            });

            if (matchedCount === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                        No matching targets found in database.
                    </td>
                </tr>`;
            }
        };

        window.calculateMonthWiseTargets = function () {
            const monthsData = {};

            const getMonthKey = (date) => {
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            };

            if (!window.weeklyTargetsDatabase) window.weeklyTargetsDatabase = {};

            Object.keys(window.weeklyTargetsDatabase).forEach(weekKey => {
                const targets = window.weeklyTargetsDatabase[weekKey] || [];
                if (targets.length === 0) return;

                const dates = weekKey.split(' - ');
                if (dates.length !== 2) return;

                const start = parseDateSafe(dates[0]);
                const end = parseDateSafe(dates[1]);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(start.getTime());
                    d.setDate(start.getDate() + i);
                    weekDays.push(d);
                }

                targets.forEach(t => {
                    // 1. Distribute set count (proportional by day)
                    weekDays.forEach(d => {
                        const mKey = getMonthKey(d);
                        if (!monthsData[mKey]) {
                            monthsData[mKey] = { set: 0, completed: 0, rawMonth: d };
                        }
                        monthsData[mKey].set += 1 / 7;
                    });

                    // 2. Distribute completed count
                    if (t.completed) {
                        const compDateDirect = t.completedAt ? parseDateSafe(t.completedAt) : null;
                        if (compDateDirect) {
                            const compMonthKey = getMonthKey(compDateDirect);
                            if (!monthsData[compMonthKey]) {
                                monthsData[compMonthKey] = { set: 0, completed: 0, rawMonth: compDateDirect };
                            }
                            monthsData[compMonthKey].completed += 1;
                            return;
                        }

                        const found = window.findTaskChapter(t.track, t.subject, t.chapter);
                        if (found && found.subTask && found.subTask.completed) {
                            const compDate = found.subTask.completedAt ? parseDateSafe(found.subTask.completedAt) : null;
                            if (compDate) {
                                const compMonthKey = getMonthKey(compDate);
                                if (!monthsData[compMonthKey]) {
                                    monthsData[compMonthKey] = { set: 0, completed: 0, rawMonth: compDate };
                                }
                                monthsData[compMonthKey].completed += 1;
                                return;
                            }

                            const taskObj = tasks[found.taskIndex];
                            if (taskObj && taskObj.date) {
                                // Match the task date string against the week's days
                                const foundDate = weekDays.find(d => formatDate(d) === taskObj.date);
                                const compDateFallback = foundDate || start;
                                const compMonthKey = getMonthKey(compDateFallback);
                                if (!monthsData[compMonthKey]) {
                                    monthsData[compMonthKey] = { set: 0, completed: 0, rawMonth: compDateFallback };
                                }
                                monthsData[compMonthKey].completed += 1;
                                return;
                            }
                        }

                        // Proportional fallback
                        weekDays.forEach(d => {
                            const mKey = getMonthKey(d);
                            if (!monthsData[mKey]) {
                                monthsData[mKey] = { set: 0, completed: 0, rawMonth: d };
                            }
                            monthsData[mKey].completed += 1 / 7;
                        });
                    }
                });
            });

            return Object.keys(monthsData).map(k => {
                return {
                    month: k,
                    set: Math.round(monthsData[k].set * 100) / 100,
                    completed: Math.round(monthsData[k].completed * 100) / 100,
                    rawMonth: monthsData[k].rawMonth
                };
            }).sort((a, b) => a.rawMonth - b.rawMonth);
        };

        window.renderWtdbMonthChart = function (monthsList) {
            const ctx = document.getElementById('weeklyMonthMixedChart');
            if (!ctx) return;

            const labels = monthsList.map(m => m.month);
            const setDataset = {
                type: 'bar',
                label: 'Targets Set (Proportional)',
                data: monthsList.map(m => m.set),
                backgroundColor: 'rgba(59, 130, 246, 0.65)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 6,
                order: 2
            };
            const completedDataset = {
                type: 'bar',
                label: 'Targets Completed',
                data: monthsList.map(m => m.completed),
                backgroundColor: 'rgba(16, 185, 129, 0.65)',
                borderColor: '#10b981',
                borderWidth: 2,
                borderRadius: 6,
                order: 1
            };

            if (window.wtdbMixedChartInstance) {
                window.wtdbMixedChartInstance.data.labels = labels;
                window.wtdbMixedChartInstance.data.datasets = [completedDataset, setDataset];
                window.wtdbMixedChartInstance.update();
            } else {
                window.wtdbMixedChartInstance = new Chart(ctx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [completedDataset, setDataset]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    font: { size: 10, weight: 'bold' },
                                    color: '#94a3b8'
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                titleColor: '#fff',
                                bodyColor: '#cbd5e1',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                padding: 12,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { font: { size: 9, weight: 'bold' }, color: '#94a3b8' },
                                grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }
                            },
                            x: {
                                ticks: { font: { size: 9, weight: 'bold' }, color: '#94a3b8' },
                                grid: { display: false, drawBorder: false }
                            }
                        }
                    }
                });
            }
        };

        window.renderWtdbMonthView = function () {
            const tbody = document.getElementById('wtdb-months-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            const monthsList = window.calculateMonthWiseTargets();

            monthsList.forEach(m => {
                const rate = m.set > 0 ? Math.round((m.completed / m.set) * 100) : 0;
                let rateColor = 'text-rose-600 dark:text-rose-400';
                if (rate >= 50) rateColor = 'text-orange-500';
                if (rate >= 80) rateColor = 'text-emerald-600 dark:text-emerald-400';

                const row = `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td class="py-3 px-4 font-black text-slate-800 dark:text-slate-100">${m.month}</td>
                    <td class="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-black">${m.set.toFixed(2)}</td>
                    <td class="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-black">${m.completed.toFixed(2)}</td>
                    <td class="py-3 px-4 text-center font-black ${rateColor}">${rate}%</td>
                </tr>`;
                tbody.innerHTML += row;
            });

            if (monthsList.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                        No monthly target data available. Set and complete targets in weeks to build trends.
                    </td>
                </tr>`;
            }

            window.renderWtdbMonthChart(monthsList);
        };

        window.togglePassStatus = function (type, name, isChecked) {
            if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };

            if (type === 'program') {
                if (isChecked) {
                    if (!window.passedItems.programs.includes(name)) window.passedItems.programs.push(name);

                    // Link: Checking a program automatically checks all its subjects
                    let programSubs = [];
                    window.tracks.forEach(track => {
                        if (syllabusStructure[track.id]) {
                            syllabusStructure[track.id].forEach(s => {
                                if (s.program === name) programSubs.push(s.subject);
                            });
                        }
                    });
                    programSubs.forEach(sub => {
                        if (!window.passedItems.subjects.includes(sub)) window.passedItems.subjects.push(sub);
                    });

                } else {
                    window.passedItems.programs = window.passedItems.programs.filter(p => p !== name);

                    // Link: Unchecking a program automatically unchecks all its subjects
                    let programSubs = [];
                    window.tracks.forEach(track => {
                        if (syllabusStructure[track.id]) {
                            syllabusStructure[track.id].forEach(s => {
                                if (s.program === name) programSubs.push(s.subject);
                            });
                        }
                    });
                    window.passedItems.subjects = window.passedItems.subjects.filter(s => !programSubs.includes(s));
                }
            } else if (type === 'subject') {
                if (isChecked) {
                    if (!window.passedItems.subjects.includes(name)) window.passedItems.subjects.push(name);

                    // Link: Check if all subjects in the program are now checked
                    const sObj = window.getAllSubjects().find(s => s.subject === name);
                    if (sObj) {
                        const progName = sObj.program;
                        let allSubsInProg = [];
                        window.tracks.forEach(track => {
                            if (syllabusStructure[track.id]) {
                                syllabusStructure[track.id].forEach(s => {
                                    if (s.program === progName) allSubsInProg.push(s.subject);
                                });
                            }
                        });
                        const allPassed = allSubsInProg.every(sub => window.passedItems.subjects.includes(sub));
                        if (allPassed && !window.passedItems.programs.includes(progName)) {
                            window.passedItems.programs.push(progName);
                        }
                    }

                } else {
                    window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== name);

                    // Link: Unchecking a subject must uncheck its parent program
                    const sObj = window.getAllSubjects().find(s => s.subject === name);
                    if (sObj) {
                        const progName = sObj.program;
                        window.passedItems.programs = window.passedItems.programs.filter(p => p !== progName);
                    }
                }
            }

            saveToCloud();
            updateSuccessScore();
            renderUI();
            window.renderPassConfig();
            showToast(name + (isChecked ? " frozen & marked passed!" : " unfrozen!"), "success");
        };
