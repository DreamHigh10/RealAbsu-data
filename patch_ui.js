const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add AnimatePresence around the views
const beforeSwitch = `        </header>

        <AnimatePresence mode="wait">`;
const afterSwitch = `        </AnimatePresence>
      </main>
    </div>
  );
}`;

code = code.replace(/        <\/header>([\s\S]*?)      <\/main>\n    <\/div>\n  \);\n}/, (match, p1) => {
    
    let inner = p1;
    // Replace {activeView === 'dashboard' && ( <div className="flex-1...
    inner = inner.replace(/\{activeView === '([^']+)' && \(\s*<div/g, `{activeView === '$1' && (\n          <motion.div\n            key="$1"\n            initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}\n            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}\n            exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}\n            transition={{ duration: 0.4, ease: 'easeOut' }}\n            className="flex-1 flex flex-col" style={{ minHeight: 0 }}\n          >\n            <div`);
    // Now we need to close the extra div we wrapped with motion.div
    inner = inner.replace(/          <\/div>\n        \)}/g, `            </div>\n          </motion.div>\n        )}`);

    return beforeSwitch + '\n' + inner + '\n' + afterSwitch;
});

// Artistic touches
code = code.replace(/className="flex h-screen w-full font-sans overflow-hidden bg-slate-50"/g, 'className="flex h-screen w-full font-sans overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50"');
code = code.replace(/bg-slate-900/g, 'bg-gradient-to-b from-indigo-950 to-slate-950 border-r border-indigo-900/30');

// Login screen artistic touches
code = code.replace(/className="min-h-screen flex items-center justify-center bg-slate-50"/g, 'className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50"');
code = code.replace(/bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm/g, 'bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 w-full max-w-sm');

fs.writeFileSync('src/App.tsx', code);
