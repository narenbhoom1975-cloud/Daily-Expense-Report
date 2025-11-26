import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { ProcessingStatus } from '../types';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  status: ProcessingStatus;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, status }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startVisualizer = (stream: MediaStream) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(248, 250, 252)'; // Match bg-slate-50
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Use the actual mime type of the recorder to prevent format mismatch
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        onRecordingComplete(blob);
        stopVisualizer();
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      startVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full">
      {/* Visualizer Canvas */}
      <div className="w-full h-32 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
        {!isRecording && status !== ProcessingStatus.PROCESSING && (
           <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
             Ready to record
           </div>
        )}
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={128} 
          className="w-full h-full"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center space-y-3">
        {status === ProcessingStatus.PROCESSING ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-600 font-medium animate-pulse">Processing with Gemini AI...</p>
          </div>
        ) : !isRecording ? (
          <button
            onClick={startRecording}
            className="group relative flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
          >
             <div className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-20 group-hover:opacity-40"></div>
             <ICONS.Microphone className="w-8 h-8 text-white" />
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center w-20 h-20 bg-red-500 rounded-full shadow-lg shadow-red-500/30 hover:scale-105 transition-all duration-300"
          >
            <ICONS.Stop className="w-10 h-10 text-white" />
          </button>
        )}

        {isRecording && (
          <div className="text-red-500 font-mono font-bold text-lg animate-pulse">
            {formatTime(recordingTime)}
          </div>
        )}
      </div>
      
      <p className="text-slate-500 text-sm text-center max-w-md">
        {!isRecording && status !== ProcessingStatus.PROCESSING 
          ? "Tap microphone to start. Speak in Hindi or English."
          : isRecording 
            ? "Listening... Say things like 'do hazaar ka petrol' or '500 rupees for vegetables'"
            : "Calculating totals..."}
      </p>
    </div>
  );
};