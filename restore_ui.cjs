const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'LENOVO', 'Downloads', 'EmailSpy', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const insertionPoint = "  const renderContent = () => {";
const idx = content.indexOf(insertionPoint);

if (idx !== -1) {
    const missingFunctions = `
  const handleDeleteCompetitor = async (id) => {
    if (!confirm("Are you sure? All ingested emails for this competitor will also be deleted.")) return;

    const { error } = await supabase.from('competitors').delete().eq('id', id);
    if (error) {
      alert("Error deleting competitor");
    } else {
      setCompetitors(prev => prev.filter(c => c.id !== id));
      if (selectedComp === id) setSelectedComp('all');
    }
  };

  const PricingPage = () => (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter cursor-pointer" onClick={() => setView('landing')}>
            <Eye className="text-blue-500 w-6 h-6" />
            <span>Email<span className="text-blue-500">Spy</span></span>
          </div>
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white text-sm">Close</button>
        </header>

        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Upgrade your Intelligence</h1>
          <p className="text-gray-400 max-w-xl mx-auto">Stop guessing. Start knowing. Unlock the full power of EmailSpy.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Starter Plan */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col hover:border-blue-500/30 transition-all">
            <div className="mb-4">
              <h3 className="text-xl font-bold">Spy Starter</h3>
              <p className="text-gray-400 text-sm">For solo founders testing the waters.</p>
            </div>
            <div className="text-3xl font-bold mb-8">
              Free <span className="text-sm text-gray-500 font-normal">/forever</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-sm text-gray-300"><Check className="w-4 h-4 text-green-500" /> 1 Competitor Tracked</li>
              <li className="flex items-center gap-3 text-sm text-gray-300"><Check className="w-4 h-4 text-green-500" /> Basic Email Ingestion</li>
              <li className="flex items-center gap-3 text-sm text-gray-300"><Check className="w-4 h-4 text-green-500" /> 3-Day Retention</li>
              <li className="flex items-center gap-3 text-sm text-gray-500"><X className="w-4 h-4" /> No AI Analysis</li>
            </ul>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl font-bold text-sm transition-all cursor-not-allowed">Current Plan</button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-blue-500/10">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">Recommended</div>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">Spy Professional <Zap className="w-4 h-4" /></h3>
              <p className="text-gray-400 text-sm">For growth marketers who need results.</p>
            </div>
            <div className="text-3xl font-bold mb-8">
              $29 <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-sm text-white font-medium"><Check className="w-4 h-4 text-blue-500" /> Track Unlimited Competitors</li>
              <li className="flex items-center gap-3 text-sm text-white font-medium"><Check className="w-4 h-4 text-blue-500" /> Llama 3.3 AI Strategy Reports</li>
              <li className="flex items-center gap-3 text-sm text-white font-medium"><Check className="w-4 h-4 text-blue-500" /> Real-time "Flash Sale" Alerts</li>
              <li className="flex items-center gap-3 text-sm text-white font-medium"><Check className="w-4 h-4 text-blue-500" /> Competitor Benchmarking</li>
            </ul>
            <button 
              onClick={() => alert("✅ Stripe Integration Beta\\n\\nSince this is an unfinished demo, we are marking your account as 'Interested' in the Pro Plan!")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/25"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
`;
    content = content.substring(0, idx) + missingFunctions + content.substring(idx);
    fs.writeFileSync(filePath, content);
    console.log("Restored missing functions.");
} else {
    console.error("Insertion point not found.");
}
