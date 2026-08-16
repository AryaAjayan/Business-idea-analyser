"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import VoiceOrb from "@/components/VoiceOrb";
import TranscriptStream from "@/components/TranscriptStream";
import AgentWorkspace from "@/components/AgentWorkspace";
import InvestorSnapshot from "@/components/InvestorSnapshot";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import ConfidenceHistory from "@/components/ConfidenceHistory";
import FullSessionLog from "@/components/FullSessionLog";
import ConfirmModal from "@/components/ConfirmModal";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useAgentSocket } from "@/hooks/useAgentSocket";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface PastSession {
  session_id: string;
  display_title: string;
  updated_at: string;
  feasibility_score?: number | null;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}



export default function Home() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState("Auto-detect");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Renaming state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  const [activeSessionTitle, setActiveSessionTitle] = useState("Untitled conversation");
  const [isEditingActiveTitle, setIsEditingActiveTitle] = useState(false);
  const [activeTitleDraft, setActiveTitleDraft] = useState("");

  const handleRename = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setPastSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, display_title: newTitle } : s));
        if (sessionStarted && agent.activeSessionId === sessionId) {
          setActiveSessionTitle(newTitle);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const mic = useAudioStream();
  const agent = useAgentSocket(WS_URL);

  useEffect(() => {
    fetch(`${API_URL}/sessions`)
      .then((r) => r.json())
      .then((data: PastSession[]) => setPastSessions(data))
      .catch(() => setPastSessions([]))
      .finally(() => setLoadingSessions(false));
  }, []);

  const startSession = useCallback(async (sessionId?: string) => {
    const finalSessionId = sessionId || crypto.randomUUID();
    console.log(">>> [Step 1 Frontend] RESUME/START CLICKED. Using finalSessionId:", finalSessionId, "| passed sessionId:", sessionId);
    
    const existing = pastSessions.find(s => s.session_id === finalSessionId);
    setActiveSessionTitle(existing ? existing.display_title : "Untitled conversation");
    
    agent.connect(finalSessionId);
    await mic.start((chunk) => agent.sendAudioChunk(chunk));
    
    // If they picked a language before starting, tell the backend right away
    if (language !== "Auto-detect") {
      // Need a tiny timeout to ensure the WS is actually open before sending
      setTimeout(() => agent.setLanguage(language), 500);
    }
    
    agent.setAgentState("listening");
    setSessionStarted(true);
    setSidebarOpen(false); // Close mobile drawer when starting
  }, [agent, mic, language, pastSessions]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (sessionStarted) {
      agent.setLanguage(newLang);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const sessionId = crypto.randomUUID();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const res = await fetch(`${API_URL}/upload-context`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await startSession(sessionId);
      } else {
        alert("Failed to upload document.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading document.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  }, [startSession]);

  const endSessionDirectly = useCallback(() => {
    mic.stop();
    agent.disconnect();
    setSessionStarted(false);
    fetch(`${API_URL}/sessions`)
      .then((r) => r.json())
      .then((data: PastSession[]) => setPastSessions(data))
      .catch(() => {});
  }, [agent, mic]);

  const endSession = useCallback(() => {
    setConfirmModalConfig({
      isOpen: true,
      title: "End Session",
      message: "Are you sure you want to end this session? You won't be able to continue talking to Nova in this conversation.",
      confirmLabel: "End Session",
      isDestructive: true,
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        endSessionDirectly();
      }
    });
  }, [endSessionDirectly]);

  const handleSidebarDownload = async (sessionId: string) => {
    try {
      setDownloadingId(sessionId);
      const res = await fetch(`${API_URL}/sessions/${sessionId}/report`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.report) throw new Error();
      
      const { pdf } = await import("@react-pdf/renderer");
      const InvestorReportPDF = (await import("@/components/InvestorReportPDF")).default;
      
      const blob = await pdf(<InvestorReportPDF report={data.report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${sessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("No report available for this session.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation? This action cannot be undone.",
      confirmLabel: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${API_URL}/sessions/${sessionId}`, { method: "DELETE" });
          if (res.ok) {
            setPastSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (sessionStarted && agent.activeSessionId === sessionId) {
              endSessionDirectly();
            }
          } else {
            alert("Failed to delete session.");
          }
        } catch (err) {
          alert("Error deleting session.");
        }
      }
    });
  };

  const displayedAmplitude = agent.agentState === "speaking" ? agent.agentAmplitude : mic.amplitude;
  const hasLogContent = agent.transcript.length > 0 || agent.toolEvents.length > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-void text-main relative">
      
      {/* ── Ambient Background (covers entire app) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-100 mix-blend-screen dark:mix-blend-normal overflow-hidden">
        {/* Particle Dots Layer for parallax depth */}
        <motion.div
          className="absolute inset-[-50%] z-0 opacity-[0.15] dark:opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, var(--theme) 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }}
          animate={{ x: [0, -60], y: [0, -60] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-grid-pattern z-0" />
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[160px] opacity-80"
          style={{ background: "radial-gradient(circle, var(--ambient-primary) 0%, rgba(0,0,0,0) 70%)" }}
          animate={{ x: [0, 80, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full blur-[200px] opacity-80"
          style={{ background: "radial-gradient(circle, var(--ambient-secondary) 0%, rgba(0,0,0,0) 70%)" }}
          animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* ── Mobile Sidebar Drawer Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        className={`fixed md:relative z-50 h-full w-[320px] bg-panel border-r border-theme shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-theme flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Nova</h1>
            <p className="text-xs text-muted font-medium mt-0.5">Business Idea Analyzer</p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted font-semibold">Language</label>
            <select 
              value={language}
              onChange={handleLanguageChange}
              className="bg-void border border-theme text-main text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="Auto-detect">Auto-detect (Speak freely)</option>
              <optgroup label="Global Languages">
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Italian">Italian</option>
                <option value="Russian">Russian</option>
                <option value="Mandarin">Mandarin</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Arabic">Arabic</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Thai">Thai</option>
              </optgroup>
              <optgroup label="Indian Languages">
                <option value="Hindi">Hindi</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Kannada">Kannada</option>
                <option value="Bengali">Bengali</option>
                <option value="Marathi">Marathi</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Urdu">Urdu</option>
              </optgroup>
            </select>
          </div>

          <button
            onClick={() => {
              if (sessionStarted) endSession();
              setEditingSessionId(null);
              setActiveSessionTitle("Untitled conversation");
              setSidebarOpen(false);
            }}
            className="w-full mt-2 py-2 px-4 rounded-lg border-2 border-dashed border-theme hover:border-indigo-500/50 hover:bg-indigo-500/10 text-muted hover:text-main text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
          >
            <span>+</span> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3 px-2">History</h2>
          
          {!loadingSessions && pastSessions.length === 0 && (
            <p className="text-sm text-muted/60 px-2 italic">No past sessions.</p>
          )}

          <div className="flex flex-col gap-2">
            {pastSessions.map((s) => (
              <div
                key={s.session_id}
                className="group flex flex-col bg-panel card-3d border border-theme rounded-xl px-4 py-3 hover:shadow-xl transition-all duration-300 hover:border-muted/40 hover:-translate-y-[1px]"
              >
                <div className="flex-1 min-w-0 mb-3">
                  {editingSessionId === s.session_id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitleValue}
                      onChange={e => setEditTitleValue(e.target.value)}
                      onBlur={() => {
                        setEditingSessionId(null);
                        if (editTitleValue.trim() && editTitleValue !== s.display_title) {
                          handleRename(s.session_id, editTitleValue.trim());
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingSessionId(null);
                      }}
                      className="bg-transparent border-b border-theme outline-none text-sm font-medium w-full text-main/90 focus:border-indigo-500/50"
                    />
                  ) : (
                    <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => { setEditingSessionId(s.session_id); setEditTitleValue(s.display_title); }}>
                      <p className="text-sm text-main/90 truncate font-medium">{s.display_title}</p>
                      <span className="text-xs opacity-0 group-hover/edit:opacity-100 transition-opacity">✏️</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted uppercase tracking-wider">{formatDate(s.updated_at)}</p>
                    {s.feasibility_score != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        s.feasibility_score >= 70 ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                        s.feasibility_score >= 40 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {s.feasibility_score}/100
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startSession(s.session_id)}
                    className="flex-1 px-3 py-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold transition-all duration-200 hover:shadow-sm"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.session_id)}
                    title="Delete Conversation"
                    className="shrink-0 p-1.5 rounded-md bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/30 hover:shadow-sm text-muted hover:text-red-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


      </motion.aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 h-full overflow-y-auto relative z-10 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-theme bg-panel backdrop-blur sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-main">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display font-bold ml-2">Nova</span>
        </div>

        <div className="flex-1 flex flex-col items-center p-6 lg:p-10 max-w-5xl mx-auto w-full">
          
          {/* Main Top Section: Orb + Meter */}
          <div className="flex flex-col items-center gap-6 w-full max-w-lg pt-10">
            {sessionStarted && (
              <div className="flex flex-col items-center mb-2 h-8">
                {isEditingActiveTitle ? (
                  <input
                    type="text"
                    autoFocus
                    value={activeTitleDraft}
                    onChange={e => setActiveTitleDraft(e.target.value)}
                    onBlur={() => {
                        setIsEditingActiveTitle(false);
                        if (activeTitleDraft.trim() && activeTitleDraft !== activeSessionTitle) {
                            setActiveSessionTitle(activeTitleDraft.trim());
                            if (agent.activeSessionId) handleRename(agent.activeSessionId, activeTitleDraft.trim());
                        }
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                            setIsEditingActiveTitle(false);
                            setActiveTitleDraft(activeSessionTitle);
                        }
                    }}
                    className="bg-transparent border-b border-theme outline-none text-xl font-bold text-center w-64 text-main focus:border-indigo-500/50"
                  />
                ) : (
                  <h2 
                    className="text-xl font-bold cursor-pointer hover:opacity-80 flex items-center gap-2 text-main"
                    onClick={() => {
                      setActiveTitleDraft(activeSessionTitle);
                      setIsEditingActiveTitle(true);
                    }}
                  >
                    {activeSessionTitle} <span className="text-muted text-sm opacity-60">✏️</span>
                  </h2>
                )}
              </div>
            )}
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              {mic.micFailed ? (
                <div className="w-full max-w-sm flex flex-col gap-3">
                  <p className="text-sm text-red-400 font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                    Microphone unavailable - you can type instead
                  </p>
                  <input 
                    type="text" 
                    placeholder="Type your response to Nova..."
                    className="w-full bg-panel border border-theme rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none shadow-inner"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        agent.sendTextInput(e.currentTarget.value.trim());
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              ) : (
                <VoiceOrb state={agent.agentState} amplitude={displayedAmplitude} />
              )}
            </motion.div>
            
            <ConfidenceMeter score={agent.confidenceScore} />
            <ConfidenceHistory data={agent.confidenceHistory} />

            {!sessionStarted ? (
              <motion.div 
                className="flex flex-col items-center gap-6 w-full mt-8 relative"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
                }}
              >
                <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} className="flex flex-col items-center gap-4 w-full">
                  <div className="relative group flex justify-center">
                    {/* Subtle pulsing background glow specifically for the Start button */}
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-500"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.button
                      id="start-session-btn"
                      onClick={() => startSession()}
                      className="btn-primary relative px-10 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-display text-xl font-bold tracking-wide flex items-center gap-3"
                      whileHover={{ scale: 1.04, filter: "brightness(1.1)" }}
                      whileTap={{ scale: 0.96 }}
                      disabled={isUploading}
                    >
                      <span>Start talking to Nova</span>
                      <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </motion.button>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full max-w-xs mt-4">
                    <div className="h-px bg-theme flex-1" />
                    <span className="text-xs text-muted uppercase font-bold tracking-widest">OR</span>
                    <div className="h-px bg-theme flex-1" />
                  </div>

                  <label className="flex flex-col items-center justify-center w-full max-w-xs p-5 rounded-2xl border-2 border-dashed border-theme hover:border-solid hover:border-indigo-400/50 bg-panel hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 cursor-pointer transition-all duration-300 group overflow-hidden relative">
                    {isUploading && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    <span className="text-2xl mb-2 opacity-40 group-hover:opacity-70 transition-opacity group-hover:-translate-y-1 transform duration-300">📄</span>
                    <span className="text-sm font-medium text-muted group-hover:text-main transition-colors text-center relative z-10">
                      {isUploading ? (
                        <span className="flex items-center gap-2">Extracting context...</span>
                      ) : "Upload existing research"}
                    </span>
                    <span className="text-[11px] text-muted/60 mt-1 relative z-10">PDF or Images</span>
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 mt-6 w-full max-w-sm">
                <motion.button
                  id="generate-report-btn"
                  onClick={agent.generateReport}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-400/30 text-white text-base font-bold tracking-wide transition shadow-lg hover:shadow-xl flex justify-center items-center gap-2"
                >
                  Generate Final Report
                </motion.button>
                
                <div className="flex items-center justify-center gap-4 w-full">
                  {hasLogContent && (
                    <button
                      id="full-log-btn"
                      onClick={() => setShowFullLog(true)}
                      className="flex-1 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-theme text-muted hover:text-main transition-colors font-medium shadow-sm text-sm"
                    >
                      View full transcript
                    </button>
                  )}
                  <button
                    id="end-session-btn"
                    onClick={endSession}
                    className="flex-1 px-4 py-2 rounded-full bg-void border border-theme text-muted hover:text-red-500 transition-colors font-medium shadow-sm text-sm"
                  >
                    End session
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Workspace Panel and Report Area */}
          <div className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center mt-12 pb-20">
            {sessionStarted && (
              <div className="w-full lg:w-80 shrink-0">
                <h3 className="text-xs uppercase tracking-widest text-muted font-bold mb-4 px-2">Agent Actions</h3>
                <AgentWorkspace events={agent.toolEvents} />
              </div>
            )}

            {agent.report && (
              <div className="flex-1 w-full flex justify-center">
                <InvestorSnapshot report={agent.report} />
              </div>
            )}
          </div>

        </div>
      </main>

      {showFullLog && (
        <FullSessionLog
          transcript={agent.transcript}
          toolEvents={agent.toolEvents}
          onClose={() => setShowFullLog(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        isDestructive={confirmModalConfig.isDestructive}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
