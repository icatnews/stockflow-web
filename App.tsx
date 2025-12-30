import React, { useState } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ResultDisplay from './components/ResultDisplay';
import StockSensei from './components/StockSensei';
import { MediaFile, GenerationState, DirectorResponse, AppMode } from './types';
import { generateReversePrompt } from './services/geminiService';
import { Clapperboard, TrendingUp, Cpu } from 'lucide-react';

const App: React.FC = () => {
  // Set DeCode AI (director) as default and first page
  const [appMode, setAppMode] = useState<AppMode>('director');

  // Director Mode State
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const handleFileSelect = (selectedMedia: MediaFile) => {
    setMedia(selectedMedia);
    setGenerationState({ isLoading: false, result: null, error: null });
  };

  const handleReset = () => {
    setMedia(null);
    setGenerationState({ isLoading: false, result: null, error: null });
  };

  const handleGenerate = async () => {
    if (!media) return;
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: DirectorResponse = await generateReversePrompt(media);
      setGenerationState({ isLoading: false, result: response, error: null });
    } catch (err: any) {
      setGenerationState({
        isLoading: false,
        result: null,
        error: err.message || "Something went wrong during generation.",
      });
    }
  };

  const handleUpdateResult = (newResult: DirectorResponse) => {
    setGenerationState(prev => ({ ...prev, result: newResult, isLoading: false }));
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-start p-4 md:p-8">
        <div className="w-full max-w-6xl space-y-6">
          
          {/* NAVIGATION TABS - Reordered: DeCode AI first */}
          <div className="flex justify-center">
            <div className="bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800 flex gap-1 relative overflow-hidden backdrop-blur-md shadow-2xl">
              <button
                onClick={() => setAppMode('director')}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative z-10
                  ${appMode === 'director' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
                `}
              >
                <Cpu className="w-4 h-4" />
                DeCode AI (視覺解碼)
              </button>
              <button
                onClick={() => setAppMode('stocksensei')}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative z-10
                  ${appMode === 'stocksensei' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20 scale-105' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
                `}
              >
                <TrendingUp className="w-4 h-4" />
                StockSensei X (圖庫專家)
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="w-full bg-gray-900/20 border border-gray-800 rounded-[2.5rem] p-6 md:p-10 backdrop-blur-xl shadow-2xl min-h-[600px] transition-all duration-500">
            
            {appMode === 'director' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                 {!media && (
                    <div className="text-center space-y-4 mb-10">
                      <h2 className="text-4xl font-black text-white tracking-tighter">
                        DeCode <span className="text-indigo-500 italic">AI</span>
                      </h2>
                      <p className="text-gray-500 text-sm max-w-lg mx-auto">
                        分析影視素材，透過反向工程提取大師級鏡頭語法與 AI 提示詞。
                      </p>
                    </div>
                  )}

                  {!media ? (
                    <FileUpload onFileSelect={handleFileSelect} isLoading={generationState.isLoading} />
                  ) : (
                    <ResultDisplay 
                      media={media} 
                      state={generationState} 
                      onGenerate={handleGenerate}
                      onReset={handleReset}
                      onUpdateResult={handleUpdateResult}
                    />
                  )}
              </div>
            )}

            {appMode === 'stocksensei' && (
              <StockSensei />
            )}

          </div>

        </div>
      </main>
      
      <footer className="py-8 text-center text-gray-800 text-[10px] border-t border-gray-900/50 uppercase tracking-[0.2em]">
        <p>StockFlow AI Global Strategy • Powered by Gemini 3 Pro</p>
      </footer>
    </div>
  );
};

export default App;