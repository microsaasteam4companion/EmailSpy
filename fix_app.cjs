const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'LENOVO', 'Downloads', 'EmailSpy', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Check Duplicates
const checkLine = "    if (view === 'pricing') return <PricingPage />;"
// Replace 3 occurrences with 1
content = content.replace(checkLine + '\n' + checkLine + '\n    ' + checkLine, checkLine);
content = content.replace(checkLine + '\n    ' + checkLine, checkLine);
// Just to be safe, regex replace multiple
// content = content.replace(/(    if \(view === 'pricing'\) return <PricingPage \/>;\n)+/g, "    if (view === 'pricing') return <PricingPage />;\n");


// 2. Locate Garbage Block (handleDeleteCompetitor...PricingPage...if view...)
// We look for the start
const garbageStart = "  const handleDeleteCompetitor = async (id) => {";
// We look for the end
const garbageEnd = "if (view === 'pricing') return <PricingPage />;";

const startIdx = content.lastIndexOf(garbageStart);
const endIdx = content.lastIndexOf(garbageEnd);

if (startIdx !== -1 && endIdx !== -1 && startIdx > 600) { // Ensure it's the bottom one
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx + garbageEnd.length);

    const actionBox = `            {/* Action Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden"
            >
`;
    content = before + actionBox + after;
    console.log("Replaced Garbage with Action Box");
} else {
    console.log("Garbage block not found or indices wrong", startIdx, endIdx);
}

fs.writeFileSync(filePath, content);
console.log("App.jsx fixed");
