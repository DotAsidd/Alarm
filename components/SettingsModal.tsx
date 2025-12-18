
import React from 'react';
import { Settings } from '../types';
import { X, Volume2, Sparkles, Clock } from 'lucide-react';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Preferences
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-medium">AI Smart Reminders</p>
                <p className="text-sm text-slate-400">Personalized tips every interval</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, enableAI: !settings.enableAI })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableAI ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableAI ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Voice Announcements</p>
                <p className="text-sm text-slate-400">Audio playback of reminders</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, enableTTS: !settings.enableTTS })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableTTS ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableTTS ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl">
            <p className="font-medium mb-3">Reminder Interval</p>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onUpdate({ ...settings, frequency: mins })}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${settings.frequency === mins ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-700 text-slate-300'}`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
