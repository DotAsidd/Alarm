import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Bell, History, Settings as SettingsIcon, Zap, CheckCircle2, Volume2, VolumeX, PlayCircle, Info, RefreshCw } from 'lucide-react';
import { Reminder, Settings } from './types';
import { generateReminderMessage, speakMessage } from './services/geminiService';
import SettingsModal from './components/SettingsModal';

const ALARM_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [phtTime, setPhtTime] = useState<Date>(new Date());
  const [nextReminder, setNextReminder] = useState<number>(0);
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('pht_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('pht_settings');
    return saved ? JSON.parse(saved) : {
      enableAI: true,
      enableTTS: true,
      frequency: 10,
    };
  });

  const lastProcessedMinute = useRef<number>(-1);
  const alarmAudio = useRef<HTMLAudioElement | null>(null);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('pht_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('pht_settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize audio object
  useEffect(() => {
    alarmAudio.current = new Audio(ALARM_URL);
    alarmAudio.current.preload = 'auto';
    
    return () => {
      if (alarmAudio.current) {
        alarmAudio.current.pause();
        alarmAudio.current = null;
      }
    };
  }, []);

  // Sync with Philippines Time (UTC+8)
  const getPhtTime = useCallback(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 8);
  }, []);

  const triggerReminder = useCallback(async (timeStr: string) => {
    // 1. Play Alarm Sound immediately if unlocked
    if (audioUnlocked && alarmAudio.current) {
      alarmAudio.current.currentTime = 0;
      alarmAudio.current.play().catch(e => {
        console.warn("Audio play blocked - might need fresh interaction", e);
        setAudioUnlocked(false);
      });
      setIsAlarmPlaying(true);
      setTimeout(() => setIsAlarmPlaying(false), 8000); 
    }

    // 2. Process AI / TTS Message
    let message = `It's ${timeStr}. Time for your ${settings.frequency}-minute reminder!`;
    
    if (settings.enableAI) {
      try {
        const aiMessage = await generateReminderMessage(timeStr);
        message = aiMessage;
      } catch (err) {
        console.error("AI Error, falling back to system message", err);
      }
    }

    const newReminder: Reminder = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      time: timeStr,
      message: message,
      type: settings.enableAI ? 'ai' : 'system'
    };

    setReminders(prev => [newReminder, ...prev].slice(0, 20));

    if (settings.enableTTS && audioUnlocked) {
      setTimeout(() => speakMessage(message), 1200);
    }

    // Browser Notification
    if (Notification.permission === 'granted') {
      const n = new Notification('PHT Focus Reminder', { 
        body: message, 
        silent: false,
        tag: 'pht-reminder'
      });
      n.onclick = () => window.focus();
    }
  }, [settings, audioUnlocked]);

  // Timer Loop
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const currentPht = getPhtTime();
      setPhtTime(currentPht);

      const minutes = currentPht.getMinutes();
      const seconds = currentPht.getSeconds();

      const rem = minutes % settings.frequency;
      const secondsUntilNext = (settings.frequency - rem) * 60 - seconds;
      setNextReminder(secondsUntilNext);

      // Trigger condition: exact minute boundary
      if (minutes % settings.frequency === 0 && seconds === 0) {
        if (lastProcessedMinute.current !== minutes) {
          lastProcessedMinute.current = minutes;
          const timeStr = currentPht.toLocaleTimeString('en-PH', { hour12: true, hour: 'numeric', minute: '2-digit' });
          triggerReminder(timeStr);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getPhtTime, settings.frequency, triggerReminder]);

  const handleUnlockAudio = () => {
    if (alarmAudio.current) {
      alarmAudio.current.play().then(() => {
        alarmAudio.current?.pause();
        setAudioUnlocked(true);
      }).catch(console.error);
    }
  };

  const testAlarm = () => {
    if (alarmAudio.current && audioUnlocked) {
      alarmAudio.current.currentTime = 0;
      alarmAudio.current.play();
      setIsAlarmPlaying(true);
      setTimeout(() => setIsAlarmPlaying(false), 3000);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all reminder history?")) {
      setReminders([]);
    }
  };

  const formatTimeRemaining = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-6xl mx-auto selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">PHT Focus</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">10-Min Cycle Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {audioUnlocked && (
            <button 
              onClick={testAlarm}
              className="p-3 glass-panel rounded-xl hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-indigo-400"
              title="Test Alarm"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 glass-panel rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <SettingsIcon className="w-6 h-6 text-slate-300" />
          </button>
        </div>
      </header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-7 space-y-8">
          <section className={`glass-panel p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500 ${isAlarmPlaying ? 'ring-4 ring-red-500 shadow-[0_0_80px_rgba(239,68,68,0.5)] bg-red-950/20' : ''}`}>
            {!audioUnlocked && (
              <div className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <PlayCircle className="w-12 h-12 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Background Audio Blocked</h3>
                <p className="text-slate-400 text-sm mb-8 max-w-sm">Browsers require a click to play sounds. Press below to enable the 10-minute alarm sounds even when you're in another tab.</p>
                <button 
                  onClick={handleUnlockAudio}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  Enable Audio Reminders
                </button>
              </div>
            )}

            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Clock className={`w-64 h-64 text-white rotate-12 ${isAlarmPlaying ? 'animate-ping' : ''}`} />
            </div>
            
            <p className="text-indigo-400 font-bold tracking-[0.3em] uppercase text-xs mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Philippines Standard Time
            </p>
            
            <h2 className={`text-7xl md:text-9xl font-black clock-shadow mb-10 tracking-tighter transition-all duration-300 tabular-nums ${isAlarmPlaying ? 'text-red-400 scale-105' : 'text-white'}`}>
              {phtTime.toLocaleTimeString('en-PH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            
            <div className="flex flex-wrap justify-center items-center gap-4 w-full max-w-lg">
              <div className="flex-1 flex items-center justify-between bg-slate-900/80 px-6 py-4 rounded-2xl border border-indigo-500/20 min-w-[200px]">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" /> Next Alarm
                </span>
                <span className="font-mono text-2xl text-indigo-300 font-bold">{formatTimeRemaining(nextReminder)}</span>
              </div>
              
              <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${audioUnlocked ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-lg shadow-green-500/5' : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-lg shadow-red-500/5'}`}>
                {audioUnlocked ? <Volume2 className="w-5 h-5 animate-bounce" /> : <VolumeX className="w-5 h-5" />}
                <span className="text-sm font-black uppercase tracking-wider">{audioUnlocked ? 'Armed' : 'Muted'}</span>
              </div>
            </div>
          </section>

          <section className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              Latest Insight
            </h3>
            {reminders.length > 0 ? (
              <div className="bg-slate-900/50 p-8 rounded-[2rem] border-l-8 border-indigo-500 shadow-inner relative group">
                <div className="absolute top-4 right-4 text-slate-700 font-black text-6xl opacity-10 select-none">"</div>
                <p className="text-xl md:text-2xl text-slate-100 font-medium leading-relaxed">
                  {reminders[0].message}
                </p>
                <div className="flex items-center justify-between mt-6">
                  <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Recorded at {reminders[0].time} PHT
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      {reminders[0].type} generated
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-700/50 flex flex-col items-center gap-4">
                <Info className="w-10 h-10 text-slate-700" />
                <p className="font-medium">Waiting for your first {settings.frequency}-minute checkpoint...</p>
                <p className="text-xs text-slate-600 max-w-xs">The dashboard automatically syncs with Philippine Time and generates insights at every interval.</p>
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <section className="glass-panel p-8 rounded-[2.5rem] h-full flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <History className="w-6 h-6 text-indigo-400" />
                Cycle History
              </h3>
              <button 
                onClick={clearHistory}
                className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-4 flex-grow overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {reminders.length > 0 ? reminders.map((rem, idx) => (
                <div key={rem.id} className={`flex gap-4 p-4 rounded-2xl transition-all border border-transparent hover:border-slate-700/50 hover:bg-slate-800/20 group ${idx === 0 ? 'bg-indigo-500/5 border-indigo-500/10' : ''}`}>
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-slate-200">{rem.time}</span>
                      {rem.type === 'ai' && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-indigo-400" />
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-bold uppercase tracking-tighter">AI Insight</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 leading-snug break-words">
                      {rem.message}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <History className="w-16 h-16 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No Logs Yet</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="bg-indigo-600/10 p-5 rounded-2xl border border-indigo-500/20 flex items-center justify-between group hover:bg-indigo-600/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Background Persistent</p>
                    <p className="text-slate-400 text-xs mt-0.5">Keep this tab open for alarms</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md">
                   LIVE
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full mt-12 mb-8 flex flex-col md:flex-row justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] gap-4">
        <p>&copy; 2024 PHT Focus PRO • Synced to PH Standard Time</p>
        <div className="flex gap-6">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> System Ready</span>
          <span className="flex items-center gap-1 text-indigo-400"><Zap className="w-3 h-3" /> Gemini 3 Flash</span>
        </div>
      </footer>

      {isSettingsOpen && (
        <SettingsModal 
          settings={settings} 
          onUpdate={setSettings} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;

const Sparkles: React.FC<any> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);