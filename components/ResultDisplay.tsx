import React, { useState, useRef } from 'react';
import { Copy, Check, RefreshCw, Wand2, MessageSquarePlus, ImagePlus, ArrowRight, Upload, Lightbulb, XCircle, Film, AlertCircle, Mic, MicOff } from 'lucide-react';
import { MediaFile, GenerationState, DirectorResponse } from '../types';
import { refinePromptWithFeedback, generateVideoPromptFromImage, refineVideoPromptWithFeedback, fileToGenerativePart } from '../services/geminiService';

interface ResultDisplayProps {
  media: MediaFile;
  additionalMedia?: MediaFile | null; // For Wallpaper mode (Subject context)
  state: GenerationState;
  onGenerate: () => void;
  onReset: () => void;
  onUpdateResult: (newResult: DirectorResponse) => void; 
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ media, additionalMedia, state, onGenerate, onReset, onUpdateResult }) => {
  const [copied, setCopied] = useState(false);
  
  // Workflow Phase Tracking
  const [phase, setPhase] = useState<'image-prompt' | 'video-prompt'>('image-prompt');

  // Refinement States
  const [activeTab, setActiveTab] = useState<'none' | 'refine' | 'image-to-video'>('none');
  const [feedbackText, setFeedbackText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // State for Review Loop (The "Good" Asset)
  const [generatedImage, setGeneratedImage] = useState<MediaFile | null>(null);
  
  // State for Negative Feedback Loop
  const [badResultImage, setBadResultImage] = useState<MediaFile | null>(null);
  const [badResultVideo, setBadResultVideo] = useState<MediaFile | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const badResultInputRef = useRef<HTMLInputElement>(null);
  const badResultVideoInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (state.result && state.result.prompt) {
      navigator.clipboard.writeText(state.result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper for uploading generic media
  const handleMediaUpload = async (file: File, setter: (m: MediaFile | null) => void, forcedType?: 'image' | 'video') => {
    try {
        const { data, mimeType } = await fileToGenerativePart(file);
        const type = forcedType || (file.type.startsWith('video/') ? 'video' : 'image');
        setter({
          file,
          previewUrl: URL.createObjectURL(file),
          type,
          base64Data: data,
          mimeType: mimeType
        });
      } catch (err) {
        alert("Failed to load media");
      }
  };

  // --- VOICE INPUT HANDLER ---
  const toggleListening = () => {
    if (isListening) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } else {
      // Start
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("您的瀏覽器不支援語音輸入 (Web Speech API)。請使用 Chrome 或 Edge。");
        return;
      }

      const recognition = new SpeechRecognition();
      
      recognition.lang = 'cmn-Hant-TW'; // Traditional Chinese
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setFeedbackText(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  // --- ACTIONS ---

  // 1. Refine (Works for both Image Phase and Video Phase)
  const handleRefineSubmit = async () => {
    if (!state.result) return;
    const hasBadMedia = phase === 'image-prompt' ? !!badResultImage : !!badResultVideo;

    if (!feedbackText.trim() && !hasBadMedia) {
        alert("請輸入文字回饋或上傳不滿意的生成結果");
        return;
    }

    setIsRefining(true);
    try {
      let newResponse;
      
      if (phase === 'image-prompt') {
          // Refine IMAGE Prompt
          newResponse = await refinePromptWithFeedback(
            media, 
            state.result, 
            feedbackText, 
            badResultImage || undefined,
            additionalMedia || undefined
          );
      } else {
          // Refine VIDEO Prompt
          // We must have a generatedImage to exist in this phase
          if (!generatedImage) throw new Error("Missing asset context");

          newResponse = await refineVideoPromptWithFeedback(
              media,
              generatedImage,
              state.result,
              feedbackText,
              badResultVideo || undefined
          );
      }

      onUpdateResult(newResponse);
      setFeedbackText('');
      setBadResultImage(null);
      setBadResultVideo(null);
      setActiveTab('none');
    } catch (e) {
      console.error(e);
      alert("Refinement failed. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  // 2. Next Step: Image -> Video Prompt
  const handleVideoPromptSubmit = async () => {
    if (!generatedImage) return;
    setIsRefining(true);
    try {
      const newResponse = await generateVideoPromptFromImage(media, generatedImage);
      onUpdateResult(newResponse);
      setPhase('video-prompt'); // Switch Phase
      setActiveTab('none');
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full animate-in fade-in zoom-in duration-300">
      
      {/* LEFT COLUMN: VISUALS & ACTIONS */}
      <div className="flex flex-col gap-6">
        {/* Main Media Preview */}
        <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video shadow-2xl group">
          {media.type === 'video' ? (
            <video src={media.previewUrl} controls className="w-full h-full object-contain" />
          ) : (
            <img src={media.previewUrl} alt="Original" className="w-full h-full object-contain" />
          )}
          <button 
            onClick={onReset}
            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-all text-xs opacity-0 group-hover:opacity-100"
            title="Start Over"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-[10px] rounded backdrop-blur-sm uppercase tracking-wider font-bold">
            Reference {media.type}
          </div>
        </div>

        {/* Initial Generate Button */}
        {!state.result && !state.isLoading && (
           <button
             onClick={onGenerate}
             className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 text-lg"
           >
             <Wand2 className="w-5 h-5" />
             分析素材 & 給我 Image Prompt
           </button>
        )}

        {/* Loading State */}
        {(state.isLoading || isRefining) && (
          <div className="w-full py-6 px-6 bg-gray-900/50 text-indigo-300 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center gap-3 animate-pulse">
             <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-sm font-medium tracking-wide">
               {isRefining ? 'AI 導演正在調整策略 (Thinking)...' : '正在分析視覺細節...'}
             </span>
          </div>
        )}

        {/* FEEDBACK & WORKFLOW ACTIONS (Only visible after result) */}
        {state.result && !state.isLoading && !isRefining && (
          <div className="flex flex-col gap-3 bg-gray-800/40 p-4 rounded-xl border border-gray-700 transition-all">
            
            {/* Phase Indicator */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Workflow: {phase === 'image-prompt' ? 'Phase 1 - Static Image' : 'Phase 2 - Video Motion'}
                </h4>
                {phase === 'video-prompt' && generatedImage && (
                     <div className="flex items-center gap-2 bg-gray-900 px-2 py-1 rounded border border-gray-700">
                         <span className="text-[10px] text-gray-500">Based on Asset:</span>
                         <img src={generatedImage.previewUrl} className="w-4 h-4 rounded-sm object-cover" />
                     </div>
                )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab(activeTab === 'refine' ? 'none' : 'refine')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${activeTab === 'refine' ? 'bg-red-600/80 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                `}
              >
                <MessageSquarePlus className="w-4 h-4" />
                {phase === 'image-prompt' ? 'Image 失敗 (Refine)' : 'Video 失敗 (Refine)'}
              </button>
              
              {/* Only show "Next Step" if we are in Image Phase */}
              {phase === 'image-prompt' && (
                  <button 
                    onClick={() => setActiveTab(activeTab === 'image-to-video' ? 'none' : 'image-to-video')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                    ${activeTab === 'image-to-video' ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                    `}
                  >
                    <ImagePlus className="w-4 h-4" />
                    圖片成功 (Next Step)
                  </button>
              )}
            </div>

            {/* TAB: REFINE (Handles BOTH Phases) */}
            {activeTab === 'refine' && (
              <div className="mt-2 animate-in slide-in-from-top-2 duration-200 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-2">
                   {phase === 'image-prompt' 
                     ? '告訴我哪裡不好，我會修正 Image Prompt。請上傳你覺得失敗的圖。'
                     : '影片效果不對？請上傳失敗的影片，或描述動作哪裡有問題。'
                   }
                </p>

                {/* Bad Media Upload */}
                <div className="mb-3">
                    {/* CASE 1: IMAGE PHASE REFINEMENT */}
                    {phase === 'image-prompt' && (
                        !badResultImage ? (
                            <div 
                                onClick={() => badResultInputRef.current?.click()}
                                className="border border-dashed border-gray-600 hover:border-indigo-500 hover:bg-gray-800 cursor-pointer rounded-lg h-20 flex flex-col items-center justify-center text-gray-500 transition-colors"
                            >
                                <Upload className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">上傳不滿意的生成圖 (選填)</span>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-red-500/40 h-32 bg-black flex items-center justify-center group">
                                <img src={badResultImage.previewUrl} className="h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" alt="Bad Result" />
                                <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1.5 rounded">Bad Result</div>
                                <button 
                                onClick={() => setBadResultImage(null)}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full"
                                >
                                <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    )}

                    {/* CASE 2: VIDEO PHASE REFINEMENT */}
                    {phase === 'video-prompt' && (
                        !badResultVideo ? (
                            <div 
                                onClick={() => badResultVideoInputRef.current?.click()}
                                className="border border-dashed border-gray-600 hover:border-indigo-500 hover:bg-gray-800 cursor-pointer rounded-lg h-20 flex flex-col items-center justify-center text-gray-500 transition-colors"
                            >
                                <Film className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">上傳不滿意的影片 (選填)</span>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-red-500/40 h-32 bg-black flex items-center justify-center group">
                                <video src={badResultVideo.previewUrl} className="h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1.5 rounded">Bad Result</div>
                                <button 
                                onClick={() => setBadResultVideo(null)}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full"
                                >
                                <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    )}

                    {/* Inputs */}
                    <input 
                        type="file" 
                        ref={badResultInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], setBadResultImage, 'image')}
                    />
                    <input 
                        type="file" 
                        ref={badResultVideoInputRef} 
                        className="hidden" 
                        accept="video/*"
                        onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], setBadResultVideo, 'video')}
                    />
                </div>

                {/* TEXT INPUT WITH VOICE */}
                <div className="relative">
                  <textarea
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none pr-10"
                    rows={2}
                    placeholder={phase === 'image-prompt' ? "例如：風格太寫實了，我要再卡通一點... (可使用麥克風)" : "例如：動作太快了，運鏡不要轉動... (可使用麥克風)"}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <button 
                    onClick={toggleListening}
                    className={`absolute bottom-3 right-3 p-1.5 rounded-full transition-all duration-300 
                      ${isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    title={isListening ? "停止錄音" : "語音輸入"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                <button 
                  onClick={handleRefineSubmit}
                  disabled={!feedbackText.trim() && !badResultImage && !badResultVideo}
                  className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  修正 {phase === 'image-prompt' ? 'Image Prompt' : 'Video Prompt'} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* TAB: UPLOAD GENERATED IMAGE (Positive Flow) */}
            {activeTab === 'image-to-video' && (
              <div className="mt-2 animate-in slide-in-from-top-2 duration-200 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-3">
                  圖片滿意了嗎？請上傳給我確認，我會分析它並給我 **Video Prompt**。
                </p>
                
                {!generatedImage ? (
                  <div 
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-600 hover:border-green-500 hover:bg-gray-800 cursor-pointer rounded-lg h-32 flex flex-col items-center justify-center text-gray-500 transition-colors"
                  >
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs">點擊上傳「滿意」的生成圖片</span>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-gray-600 h-32 bg-black flex items-center justify-center">
                    <img src={generatedImage.previewUrl} className="h-full object-contain" alt="Generated" />
                    <button 
                      onClick={() => setGeneratedImage(null)}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0], setGeneratedImage, 'image')}
                />

                <button 
                  onClick={handleVideoPromptSubmit}
                  disabled={!generatedImage}
                  className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  確認圖片 & 取得 Video Prompt <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: OUTPUT TEXT */}
      <div className="flex flex-col h-full gap-4">
        
        {state.isLoading ? (
             <div className="flex-grow rounded-xl border border-gray-800 bg-gray-900/50 flex flex-col items-center justify-center text-gray-500 gap-4 min-h-[400px]">
                <div className="space-y-3 w-3/4 animate-pulse">
                  <div className="h-2 bg-gray-800 rounded w-full"></div>
                  <div className="h-2 bg-gray-800 rounded w-5/6"></div>
                  <div className="h-2 bg-gray-800 rounded w-4/6"></div>
                </div>
                <p className="text-xs font-mono text-indigo-400/70">AI 正在思考中...</p>
             </div>
        ) : !state.result ? (
            <div className="flex-grow rounded-xl border border-gray-800 bg-gray-900/50 flex flex-col items-center justify-center text-gray-600 min-h-[400px]">
               <Wand2 className="w-10 h-10 mb-3 opacity-20" />
               <p className="text-sm">等待指示。</p>
            </div>
        ) : (
          <>
            {/* BOX 1: CHINESE STRATEGY */}
            <div className="rounded-xl border border-indigo-500/30 bg-gray-900 shadow-lg flex flex-col overflow-hidden">
               <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-sm font-semibold text-gray-200">導演策略 (Strategy & Analysis)</h3>
                 </div>
                 {phase === 'video-prompt' && (
                     <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30">
                        VIDEO PHASE
                     </span>
                 )}
               </div>
               <div className="p-5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                 {state.result.analysis}
               </div>
            </div>

            {/* BOX 2: ENGLISH PROMPT */}
            <div className="flex-grow rounded-xl border border-gray-700 bg-black shadow-lg flex flex-col overflow-hidden">
               <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {phase === 'image-prompt' ? 'English Image Prompt' : 'English Video Prompt'}
                 </h3>
                 <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-900/50"
                 >
                   {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                   {copied ? 'Copied!' : 'Copy Prompt'}
                 </button>
               </div>
               <div className="p-5 flex-grow font-mono text-sm text-green-400 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                 {state.result.prompt}
               </div>
            </div>
          </>
        )}

        {state.error && (
            <div className="rounded-xl bg-red-900/20 border border-red-500/50 p-4 text-red-200 text-sm flex items-start gap-3">
              <div className="mt-0.5">
                  <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">Error</p>
                <p>{state.error}</p>
                <button onClick={onGenerate} className="mt-2 text-xs underline hover:text-white">Retry</button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;