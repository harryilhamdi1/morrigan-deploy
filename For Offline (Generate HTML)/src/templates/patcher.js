const fs = require('fs');
const target = 'src/templates/scripts.js';
const patch = fs.readFileSync('src/templates/action_plan.js', 'utf8');
let content = fs.readFileSync(target, 'utf8');

const anchor = `    } else {
        document.getElementById('stFeedbackCount').textContent = '0';`;

const inject = `        // Render Action Plan
        generateStoreActionPlan(s, currentWaveKey, feedbackData);
    } else {
        document.getElementById('stFeedbackCount').textContent = '0';`;

content = content.replace(anchor, inject);

// Apply currentFeedbackData fix to loadStoreDetail
const anchor2 = `        // Initialize state and render first page
        window._vocCurrentPage = 1;`;
const inject2 = `        // Initialize state and render first page
        window._currentFeedbackData = feedbackData || [];
        window._vocCurrentPage = 1;`;

content = content.replace(anchor2, inject2);

fs.writeFileSync(target, content + '\n\n' + patch);
console.log('Appended Action Plan to scripts.js');
