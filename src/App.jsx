import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Mail, Lock, Zap, ChevronRight, BarChart3, ShieldCheck, Copy, Check, Loader2, RefreshCcw, Sparkles, Share2, Shield, UserX, FileText } from 'lucide-react';
import { supabase } from './lib/supabase';
import { analyzeEmails } from './lib/cerebras';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const LandingPage = () => {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('landing'); // 'landing', 'login', 'signup', 'dashboard'
  const [email, setAuthEmail] = useState('');
  const [password, setAuthPassword] = useState('');
  const [links, setLinks] = useState(['', '', '']);
  const [generatedEmails, setGeneratedEmails] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('general'); // 'general', 'trends', 'benchmarking'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('landing'); // 'landing', 'dashboard'
  const [emails, setEmails] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [selectedComp, setSelectedComp] = useState('all');
  const [analysis, setAnalysis] = useState(null);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShownExit, setHasShownExit] = useState(false);

  React.useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY < 0 && !hasShownExit && view === 'landing') {
        setShowExitIntent(true);
        setHasShownExit(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExit, view]);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setView('dashboard');
        fetchInitialData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView('dashboard');
        fetchInitialData();
      } else {
        setView('landing');
        setAuthMode('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchInitialData = async () => {
    await fetchCompetitors();
    await fetchEmails();
  };

  const fetchCompetitors = async () => {
    const { data } = await supabase.from('competitors').select('*');
    setCompetitors(data || []);
  };

  const fetchEmails = async () => {
    let query = supabase
      .from('received_emails')
      .select('*, competitors(name)')
      .order('received_at', { ascending: false });

    if (selectedComp !== 'all') {
      query = query.eq('competitor_id', selectedComp);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) console.error(fetchError);
    else setEmails(data || []);
  };

  React.useEffect(() => {
    if (session && view === 'dashboard') {
      fetchEmails();
    }
  }, [selectedComp, session, view]);

  const handleAuth = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = type === 'signup'
        ? await supabase.auth.signUp({ email: email, password })
        : await supabase.auth.signInWithPassword({ email: email, password });

      if (error) throw error;
      if (type === 'signup') alert("Check your email for the confirmation link!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSpyEmail = (url) => {
    try {
      if (!url) return null;
      let domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
      const name = domain.split('.')[0].toLowerCase();
      const salt = Math.random().toString(36).substring(2, 6);
      return `spy+${name}_${salt}@entrext.in`;
    } catch (e) {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!session) {
      setAuthMode('login');
      return;
    }

    setError(null);
    const validLinks = links.filter(link => link.trim() !== '');
    if (validLinks.length === 0) return;

    setLoading(true);
    try {
      const results = validLinks.map(link => ({
        url: link,
        email: generateSpyEmail(link)
      }));

      const { error: dbError } = await supabase
        .from('competitors')
        .insert(results.map(r => ({
          name: r.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('.')[0],
          website_url: r.url,
          spy_email: r.email,
          user_id: session.user.id
        })));

      if (dbError) throw dbError;

      setGeneratedEmails(results);
      setTimeout(() => setView('dashboard'), 2000);
    } catch (err) {
      console.error(err);
      setError("Failed to save competitors. Check your Supabase connection.");
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    const counts = {};
    emails.forEach(email => {
      const date = new Date(email.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[date] = (counts[date] || 0) + 1;
    });

    // Convert to array and sort by date (simplified)
    return Object.entries(counts).map(([name, value]) => ({ name, value })).reverse().slice(-7);
  };

  const runAnalysis = async (mode = 'general') => {
    if (emails.length === 0) return;
    setAnalyzing(true);
    setAnalysisMode(mode);
    const result = await analyzeEmails(emails, mode);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const copyToClipboard = (email, index) => {
    navigator.clipboard.writeText(email);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };
  const renderContent = () => {
    if (authMode === 'login' || authMode === 'signup') {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-blue-500/30 font-sans relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-[40px] backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-gray-400 mt-2 text-sm">Secure your spy dashboard.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
                <input type="email" value={email} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 focus:border-blue-500/50 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Password</label>
                <input type="password" value={password} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 focus:border-blue-500/50 focus:outline-none transition-all" />
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button onClick={() => handleAuth(authMode)} disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Login to Dashboard' : 'Start Spying Free')}
              </button>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-gray-500 hover:text-white text-sm mt-4">
                {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
              </button>
              <button onClick={() => setAuthMode('landing')} className="w-full text-gray-700 hover:text-gray-500 text-xs mt-2 underline">Back to Home</button>
            </div>
          </motion.div>
        </div>
      );
    }

    if (view === 'dashboard') {
      return (
        <div className="min-h-screen bg-black text-white p-8 selection:bg-cyan-500/30 font-sans">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                <Eye className="text-blue-500 w-6 h-6" />
                <span>Spy Dashboard</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowWizard(true)}
                  className="text-xs text-gray-500 hover:text-white underline underline-offset-4 mr-2"
                >
                  Need help? View Setup Wizard
                </button>
                <button
                  onClick={() => setView('landing')}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <Zap className="w-4 h-4" /> New Spy
                </button>
                <span className="text-xs text-gray-500 hidden md:inline">{session?.user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Email Stream */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" /> Ingested Emails
                  </h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedComp}
                      onChange={(e) => setSelectedComp(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="all">All Competitors</option>
                      {competitors.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={fetchEmails}
                      className="p-2 hover:bg-white/5 rounded-full text-gray-400 border border-white/5 transition-all"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {emails.length === 0 ? (
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-12 text-center overflow-hidden relative group">
                    <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-500 relative z-10">No emails ingested for this selection.</p>
                    <button
                      onClick={() => setView('landing')}
                      className="mt-6 text-blue-400 hover:underline text-sm relative z-10"
                    >
                      Add new newsletter to track
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emails.map((email, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-blue-500/20 transition-all cursor-default group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-blue-500/20">
                            {email.competitors?.name || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-gray-500">{new Date(email.received_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold mb-1 text-gray-100 group-hover:text-blue-400 transition-colors">{email.subject}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{email.body_text || 'No preview available'}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: AI Analysis & Charts */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" /> Email Velocity
                </h2>

                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 h-[240px] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="w-5 h-5 text-cyan-400" /> AI Intelligence
                </h2>

                <div className="relative p-8 overflow-hidden border rounded-3xl backdrop-blur-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/20">
                  {!analysis ? (
                    <div className="space-y-4">
                      <p className="mb-2 text-sm font-bold text-cyan-400">New Intelligence Modes</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => runAnalysis('trends')}
                          disabled={analyzing || emails.length < 3}
                          className="flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold transition-all border rounded-xl bg-white/5 hover:bg-white/10 border-white/10"
                        >
                          <BarChart3 className="w-4 h-4 text-blue-400" /> Quarterly Trends
                        </button>
                        <button
                          onClick={() => runAnalysis('benchmarking')}
                          disabled={analyzing || emails.length === 0}
                          className="flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold transition-all border rounded-xl bg-white/5 hover:bg-white/10 border-white/10"
                        >
                          <ShieldCheck className="w-4 h-4 text-green-400" /> Benchmarking
                        </button>
                      </div>

                      <button
                        onClick={() => runAnalysis('general')}
                        disabled={analyzing || emails.length === 0}
                        className="flex items-center justify-center w-full gap-2 py-4 font-bold text-black transition-all rounded-2xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 shadow-xl shadow-cyan-500/20 active:scale-[0.98]"
                      >
                        {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> {selectedComp === 'all' ? 'Market Report' : 'Competitor Deep Dive'}</>}
                      </button>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm">
                      <div className="flex items-center gap-2 mb-4 text-[10px] font-bold tracking-widest uppercase text-blue-400">
                        <Sparkles className="w-3 h-3" /> {analysisMode === 'trends' ? 'Trend Analysis Report' : analysisMode === 'benchmarking' ? 'Benchmarking Advisor' : 'Intelligence Summary'}
                      </div>
                      <div className="p-4 leading-relaxed whitespace-pre-wrap rounded-xl bg-black/40 text-gray-200 border border-white/5 shadow-inner">
                        {analysis}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAnalysis(null)}
                          className="mt-6 text-xs text-gray-500 underline underline-offset-4 decoration-blue-500/50 hover:text-white"
                        >
                          Reset and analyze again
                        </button>
                        <button
                          onClick={() => {
                            alert("Intelligence PDF Exported! (Demo)");
                          }}
                          className="flex items-center gap-2 px-4 py-2 mt-6 text-xs font-bold text-blue-400 transition-all border rounded-xl bg-white/5 border-white/10 hover:bg-white/10"
                        >
                          <Share2 className="w-3 h-3" /> Share with Team
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alerts Section */}
                <div className="p-6 border rounded-3xl bg-red-500/5 border-red-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> Real-time Alerts
                    </h3>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Competitor Flash Sale</span>
                      <div className="w-8 h-4 bg-blue-500/20 rounded-full relative"><div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500" /></div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between opacity-50">
                      <span className="text-[10px] text-gray-400">Newsletter Frequency Spike</span>
                      <div className="w-8 h-4 bg-white/10 rounded-full relative"><div className="absolute top-1 left-1 w-2 h-2 bg-gray-500 rounded-full" /></div>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-4 italic text-center">Customize your alert triggers in Settings.</p>
                </div>

                {/* Affiliate Teaser */}
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 text-center">
                  <p className="text-sm font-bold text-blue-400 mb-2">Want a Free Month?</p>
                  <p className="text-[10px] text-gray-500 mb-4">Refer a fellow marketer. When they sign up, you both get 1 month of Spy Pro for free.</p>
                  <button
                    onClick={() => alert("Affiliate Link Copied: https://emailspy.io/ref/user123 (Demo)")}
                    className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 py-3 rounded-xl text-xs font-bold border border-blue-500/20 transition-all"
                  >
                    Get Invite Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (view === 'landing') {
      return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans">
          {/* Navbar */}
          <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
              <Eye className="text-blue-500 w-6 h-6" />
              <span>Email<span className="text-blue-500">Spy</span></span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
              <button
                onClick={() => session ? setView('dashboard') : setAuthMode('login')}
                className="bg-white text-black px-5 py-2 rounded-full font-medium text-sm hover:bg-gray-200 transition-all active:scale-95"
              >
                {session ? 'Dashboard' : 'Log In'}
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-8 py-24 lg:py-40 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full -z-10 pointer-events-none opacity-50" />

            <motion.div {...fadeIn}>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-blue-500 text-xs font-semibold mb-8">
                <Zap className="w-3 h-3" />
                <span>Launch Special: Get 50% off your first month</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                Spy on Your Competitors' <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 italic">Secret Email Strategies</span>
              </h1>
              <p className="text-gray-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10">
                No manual work. No fake accounts. Join the newsletter sequences of your rivals 100% anonymously and get a weekly AI-powered intelligence report.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 mb-12 opacity-70">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
                  <Shield className="w-4 h-4 text-green-500" /> 100% GDPR Compliant
                </div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
                  <Lock className="w-4 h-4 text-blue-500" /> Bank-Grade Encryption
                </div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
                  <UserX className="w-4 h-4 text-purple-500" /> Anonymous Spy Mode
                </div>
              </div>
            </motion.div>

            {/* Action Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden"
            >
              {!generatedEmails ? (
                <div className="space-y-4 p-8">
                  <p className="text-left text-sm font-medium text-gray-400 ml-2 font-semibold">Monitor Competitors Instantly</p>
                  {links.map((link, i) => (
                    <div key={i} className="relative group">
                      <input
                        type="text"
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...links];
                          newLinks[i] = e.target.value;
                          setLinks(newLinks);
                        }}
                        placeholder="https://newsletter.competitor.com"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500/50 focus:outline-none transition-all group-hover:border-white/20"
                      />
                    </div>
                  ))}
                  {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 mt-4"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access Secret Insights <ChevronRight className="w-5 h-5" /></>}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 space-y-6"
                >
                  <div className="text-left border-b border-white/5 pb-6">
                    <h3 className="text-xl font-bold mb-2">Your Spy Identities Ready!</h3>
                    <p className="text-sm text-gray-400">Copy these emails and subscribe to your competitor newsletters manually. We will detect all incoming emails automatically.</p>
                  </div>
                  <div className="space-y-3">
                    {generatedEmails.map((item, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                        <div className="text-left">
                          <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest leading-none mb-1">{item.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('.')[0]}</p>
                          <p className="font-mono text-sm text-gray-300">{item.email}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.email, i)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg text-gray-400 hover:text-blue-400 transition-all"
                          title="Copy Email"
                        >
                          {copiedIndex === i ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setGeneratedEmails(null)}
                    className="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-4"
                  >
                    ← Edit Competitor Links
                  </button>
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* Features */}
          <section id="features" className="py-32 bg-gray-950/30 relative">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-center mb-20">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">How it works</h2>
                <p className="text-gray-400">Winning in business is about knowing what they don't.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">100% Anonymous</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">We create unique spy accounts for you. Your rivals never know who is tracking their moves.</p>
                </div>

                <div className="bg-white/5 p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Auto-Collection</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">No need to clutter your inbox. We gather every welcome sequence, discount offer, and weekly blast.</p>
                </div>

                <div className="bg-white/5 p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">AI Deep Analysis</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Cerebras AI reads every email and sends you a 1-minute summary every Monday morning. Strategy revealed.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Social Proof */}
          <section className="py-20 bg-black">
            <div className="max-w-7xl mx-auto px-8 text-center">
              <p className="text-blue-500 font-bold tracking-widest uppercase text-[10px] mb-4">Loved by 200+ Marketers</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-left">
                  <p className="text-gray-300 italic mb-6">"Saved me $500 in research. I knew exactly when my competitor was launching their Black Friday sale before they even posted on Twitter."</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
                    <div>
                      <p className="text-sm font-bold">Alex Rivera</p>
                      <p className="text-[10px] text-gray-500">Growth Lead @ SaaSify</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-left">
                  <p className="text-gray-300 italic mb-6">"The quarterly trends feature is a game-changer. It revealed their seasonal discount patterns that we completely missed."</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div>
                      <p className="text-sm font-bold">Sarah Chen</p>
                      <p className="text-[10px] text-gray-500">Founder, E-com Pulse</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-left">
                  <p className="text-gray-300 italic mb-6">"100% anonymous and GDPR safe. My law team approved it in 5 minutes. The best competitive intel tool I've used."</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-yellow-500" />
                    <div>
                      <p className="text-sm font-bold">Marc Dubois</p>
                      <p className="text-[10px] text-gray-500">Marketing Director, Global Retail</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-32">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">Choose Your Spy Level</h2>
                <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full text-yellow-500 text-xs font-bold animate-pulse">
                  <Zap className="w-3 h-3" />
                  <span>LIFETIME DEAL: Only 12 spots left for $299 one-time!</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Basic Plan */}
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 flex flex-col hover:border-blue-500/20 transition-all">
                  <h3 className="text-xl font-bold mb-2">Spy Starter</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black">$29</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-sm text-gray-400"><Check className="w-4 h-4 text-blue-500" /> Track 2 Competitors</li>
                    <li className="flex items-center gap-3 text-sm text-gray-400"><Check className="w-4 h-4 text-blue-500" /> Weekly Basic Reports</li>
                    <li className="flex items-center gap-3 text-sm text-gray-400"><Check className="w-4 h-4 text-blue-500" /> Email Ingestion</li>
                    <li className="flex items-center gap-3 text-sm text-gray-400 opacity-30"><Check className="w-4 h-4 text-gray-600" /> Quarterly Trend Analysis</li>
                  </ul>
                  <button
                    onClick={() => alert("Checkout: Spy Starter ($29/mo)")}
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    Start Basic Spying
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-blue-600/10 border border-blue-500/40 rounded-[40px] p-10 flex flex-col relative overflow-hidden shadow-2xl shadow-blue-500/10">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="bg-blue-500 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider">Most Popular</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Spy Professional</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl lg:text-5xl font-black text-blue-400">$49</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-sm text-gray-200"><ShieldCheck className="w-4 h-4 text-blue-400" /> Track Unlimited Competitors</li>
                    <li className="flex items-center gap-3 text-sm text-gray-200"><ShieldCheck className="w-4 h-4 text-blue-400" /> Quarterly Trend AI</li>
                    <li className="flex items-center gap-3 text-sm text-gray-200"><ShieldCheck className="w-4 h-4 text-blue-400" /> Real-time Alert Sync</li>
                    <li className="flex items-center gap-3 text-sm text-gray-200"><ShieldCheck className="w-4 h-4 text-blue-400" /> Benchmarking Advisor</li>
                  </ul>
                  <button
                    onClick={() => alert("Checkout: Spy Pro ($49/mo)")}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20"
                  >
                    Go Unlimited
                  </button>
                </div>
              </div>

              <p className="text-center mt-12 text-sm text-gray-500">
                Secure payments via <span className="text-white font-bold tracking-tight">Stripe</span>. No credit card required for 7-day trial.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm selection:bg-none">© 2025 EmailSpy. All secrets reserved.</p>
          </footer>
        </div>
      );
    }
    return null; // Fallback if view is neither 'dashboard' nor 'landing'
  };

  return (
    <>
      {renderContent()}
      {/* Setup Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-950 border border-white/10 p-10 rounded-[40px] max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setShowWizard(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">✕</button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Eye className="text-blue-500 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Quick Start Guide</h3>
              <p className="text-gray-400 text-sm mt-2">Zero-friction spying in 3 steps.</p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">1</div>
                <div>
                  <p className="font-bold text-sm">Create Spy Emails</p>
                  <p className="text-xs text-gray-500 mt-1">Enter newsletter links and click "Access Secret Insights".</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">2</div>
                <div>
                  <p className="font-bold text-sm">Manual Subscription</p>
                  <p className="text-xs text-gray-500 mt-1">Visit competitor sites and use your new @entrext.in emails to subscribe.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">3</div>
                <div>
                  <p className="font-bold text-sm">Profit</p>
                  <p className="text-xs text-gray-500 mt-1">Check back here on Monday for the AI strategy report.</p>
                </div>
              </div>
              <button onClick={() => setShowWizard(false)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold transition-all mt-4">Got it, let's spy!</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Exit Intent Popup */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-br from-blue-900/50 to-black border border-blue-500/30 p-12 rounded-[50px] max-w-xl w-full text-center relative shadow-2xl">
            <button onClick={() => setShowExitIntent(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white text-xl font-light">✕</button>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-3xl mb-6 border border-blue-500/20">
              <Zap className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-4xl font-bold mb-4 tracking-tighter">WAIT! Before you go...</h3>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">Get a <span className="text-blue-400 font-bold">20% Special Discount</span> for your first 3 months. Don't let your competitors win.</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-white">09</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Mins</p>
              </div>
              <p className="text-2xl font-black opacity-20">:</p>
              <div className="text-center">
                <p className="text-2xl font-black text-white">45</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Secs</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowExitIntent(false);
                setAuthMode('signup');
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 transition-all active:scale-95"
            >
              Claim My 20% Discount
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default LandingPage;
