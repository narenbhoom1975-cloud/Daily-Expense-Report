import React, { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { ExpenseList } from './components/ExpenseList';
import { processAudioWithGemini } from './services/geminiService';
import { ExpenseResponse, ProcessingStatus } from './types';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ExpenseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = async (blob: Blob) => {
    setStatus(ProcessingStatus.PROCESSING);
    setError(null);
    
    try {
      const data = await processAudioWithGemini(blob);
      setResult(data);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setError("Failed to process audio. Please try again.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleReset = () => {
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-md">
               <ICONS.Sparkles className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">VoiceTracker AI</h1>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Gemini 2.5 Flash
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        
        {/* Intro (only show if idle or error) */}
        {(status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR) && (
           <div className="mb-10 text-center max-w-lg mx-auto">
             <h2 className="text-3xl font-bold text-slate-900 mb-3">Track Expenses with Your Voice</h2>
             <p className="text-slate-500 text-lg">
               Speak naturally in <span className="text-indigo-600 font-medium">Hindi</span> or <span className="text-indigo-600 font-medium">English</span>. 
               AI will transcribe, translate, and calculate totals instantly.
             </p>
             
             {/* Sample Pills */}
             <div className="flex flex-wrap justify-center gap-2 mt-6">
               <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">
                 "200 ka aaloo, 500 ka petrol"
               </span>
               <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">
                 "Fifty thousand for laptop"
               </span>
               <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">
                 "Dedh lakh ki shopping"
               </span>
             </div>
           </div>
        )}

        {/* Error State */}
        {status === ProcessingStatus.ERROR && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center animate-in fade-in slide-in-from-top-2">
            {error}
            <button onClick={handleReset} className="block mx-auto mt-2 text-sm underline font-medium">Try Again</button>
          </div>
        )}

        {/* Recorder Section */}
        {status !== ProcessingStatus.SUCCESS && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-8 transition-all duration-500">
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete} 
              status={status}
            />
          </div>
        )}

        {/* Results Section */}
        {status === ProcessingStatus.SUCCESS && result && (
          <ExpenseList data={result} onReset={handleReset} />
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-auto bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2024 Voice Expense Tracker. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;