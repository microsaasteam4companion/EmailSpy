const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'LENOVO', 'Downloads', 'EmailSpy', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Anchor 1: End of Header Section Features
const anchor1 = '                  <UserX className="w-4 h-4 text-purple-500" /> Anonymous Spy Mode';
// Anchor 2: Start of Action Box Content
const anchor2 = '<p className="text-left text-sm font-medium text-gray-400 ml-2 font-semibold">Monitor Competitors Instantly</p>';

const idx1 = content.indexOf(anchor1);
const idx2 = content.indexOf(anchor2);

if (idx1 !== -1 && idx2 !== -1) {
    // Find close tag of headers div
    const closeHeaderDiv = '                </div>\r\n              </div>\r\n            </motion.div>';
    // We want to reconstruct:
    // 1. Close the header section correctly.
    // 2. Open the Action Box.
    // 3. Ensure syntax is perfect.

    const correctBlock = `                </div>
              </div>
            </motion.div>

            {/* Action Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden"
            >
            
            {!generatedEmails ? (
              <div className="space-y-4 p-8">
                `;

    // We replace everything between anchor1 and anchor2 with valid structure
    // But we need to be careful about what we cut.
    // idx1 is start of anchor1.
    // We want to preserve anchor1.
    // We want to delete everything FROM end of anchor1 TO start of anchor2.

    // Let's find end of anchor1 line
    const afterAnchor1 = content.indexOf('\n', idx1) + 1; // Start of next line

    // Let's verify we are cutting garbage
    const garbage = content.substring(afterAnchor1, idx2);
    // console.log("Garbage to replace:\n", garbage);

    content = content.substring(0, afterAnchor1) + correctBlock + content.substring(idx2);

    fs.writeFileSync(filePath, content);
    console.log("SUCCESS: Replaced broken block using anchors.");
} else {
    console.log("FAILED to find anchors:", idx1, idx2);
    // Fallback: Check for just "Anonymous Spy Mode" (shorter)
    const shortAnchor = "Anonymous Spy Mode";
    const idx3 = content.indexOf(shortAnchor);
    if (idx3 !== -1 && idx2 !== -1) {
        console.log("Found short anchor, attempting fuzzy fix...");
        // Logic similar to above could go here but let's stick to precise first.
    }
}
