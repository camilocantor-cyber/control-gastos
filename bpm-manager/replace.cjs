const fs = require('fs');
let content = fs.readFileSync('src/components/WorkflowBuilder.tsx', 'utf8');

content = content.replace(/className=\"w-full h-10 px-4 bg-white dark:bg-slate-950 (?!text-slate-900)/g, 'className=\"w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 ');

content = content.replace(/className=\"w-full p-4 bg-white dark:bg-slate-950 (?!text-slate-900)/g, 'className=\"w-full p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 ');

fs.writeFileSync('src/components/WorkflowBuilder.tsx', content);
