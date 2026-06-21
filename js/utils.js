// js/utils.js
// Verbatim extraction of utility functions from index.html

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
