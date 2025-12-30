import React, { useState, useEffect } from 'react';
import { MediaFile, StockSenseiResponse, MarketInsight, MarketEvent } from '../types';
import FileUpload from './FileUpload';
import { generateStockSenseiAnalysis, getMarketInsights } from '../services/geminiService';
import { TrendingUp, Search, Copy, Check, AlertCircle, BarChart3, ChevronRight, Type as TextIcon, Image as ImageIcon, Brain, Calendar, Zap, Lightbulb, ChevronDown } from 'lucide-react';

const StockSensei: React.FC = () => {
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [textInput, setTextInput] = useState('');
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StockSenseiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI Smart Brain State
  const [insights, setInsights] = useState<MarketInsight | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);

  const fetchInsights = async () => {
    setIsInsightLoading(true);
    try {
      const data = await getMarketInsights();
      setInsights(data);
      // Automatically select first event if available
      if (data.upcomingEvents.length > 0) setSelectedEvent(data.upcomingEvents[0]);
    } catch (err) {
      console.error("Failed to fetch insights", err);
    } finally {
      setIsInsightLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleFileSelect = (m: MediaFile) => {
    setMedia(m);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (inputType === 'file' && !media) return;
    if (inputType === 'text' && !textInput.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const payload: MediaFile = inputType === 'text' 
        ? { type: 'text', textContent: textInput }
        : media!;
      
      const data = await generateStockSenseiAnalysis(payload);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "SEO 生成失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-12 pb-20">
      {/* SECTION: SEO TOOLS */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
            <TrendingUp className="text-green-400 w-8 h-8" /> StockSensei <span className="text-green-500">X</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto font-medium">
            專業圖庫 SEO 專家。撰寫標題與關鍵字，提升作品曝光與銷量。
          </p>
        </div>

        {!result ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800 self-center max-w-xs mx-auto">
              <button 
                onClick={() => setInputType('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${inputType === 'file' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> 媒體上傳
              </button>
              <button 
                onClick={() => setInputType('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${inputType === 'text' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <TextIcon className="w-3.5 h-3.5" /> 文字描述
              </button>
            </div>

            {inputType === 'file' ? (
              !media ? (
                <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
              ) : (
                <div className="space-y-6">
                  <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-black aspect-video shadow-2xl group">
                    {media.type === 'video' ? (
                      <video src={media.previewUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={media.previewUrl} alt="Target" className="w-full h-full object-contain" />
                    )}
                    <button onClick={() => setMedia(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors">
                      <AlertCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            ) : (
              <textarea
                className="w-full h-40 bg-gray-900 border border-gray-700 rounded-2xl p-4 text-gray-200 outline-none focus:border-green-500 transition-colors placeholder:text-gray-600 shadow-inner"
                placeholder="請輸入主題或作品描述，例如：'A futuristic cyberpunk city at sunset with neon lights'..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading || (inputType === 'file' && !media) || (inputType === 'text' && !textInput.trim())}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 tracking-wider"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              {isLoading ? "正在產出 SEO 套件..." : "產出完整 SEO 套件 (Generate SEO)"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h4 className="text-green-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Search className="w-4 h-4" /> SEO Titles (Options)
                </h4>
                <div className="space-y-3">
                  {result.seo.titles.map((title, i) => (
                    <div key={i} className="group relative bg-black/50 border border-gray-800 p-4 rounded-xl hover:border-gray-600 transition-colors">
                      <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Option {i + 1}</p>
                      <p className="text-white font-medium text-sm leading-relaxed pr-8">{title}</p>
                      <button 
                        onClick={() => copyToClipboard(title, `title-${i}`)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                      >
                        {copiedKey === `title-${i}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-600/10 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-400 text-[10px] uppercase font-black tracking-widest">Recommended Best Title</p>
                  <button 
                    onClick={() => copyToClipboard(result.seo.bestTitle, 'best-title')}
                    className="text-green-400 hover:text-white"
                  >
                    {copiedKey === 'best-title' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <h3 className="text-xl font-bold text-white leading-tight">{result.seo.bestTitle}</h3>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-green-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Keywords (35-50)
                  </h4>
                  <button 
                    onClick={() => copyToClipboard(result.seo.keywords, 'keywords')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[10px] font-bold transition-all uppercase"
                  >
                    {copiedKey === 'keywords' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'keywords' ? 'Copied' : 'Copy All'}
                  </button>
                </div>
                <div className="flex-grow p-4 bg-black/50 rounded-xl text-[12px] font-mono text-gray-400 leading-relaxed border border-gray-800 overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-gray-800">
                  {result.seo.keywords}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <button 
                onClick={() => { setResult(null); setMedia(null); setTextInput(''); }} 
                className="text-gray-500 text-xs hover:text-white font-bold transition-colors flex items-center gap-2 uppercase tracking-widest"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> 生成另一個項目的 SEO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: AI SMART BRAIN */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-900/80 border border-gray-700 rounded-[2rem] overflow-hidden shadow-2xl relative">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-900/40 to-indigo-900/40 px-8 py-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-green-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">AI 智慧策略大腦</h3>
                <p className="text-xs text-green-400/80 font-bold uppercase tracking-widest">Global Market Intelligence</p>
              </div>
            </div>
            <button 
              onClick={fetchInsights}
              disabled={isInsightLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isInsightLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3 text-yellow-400" />}
              刷新洞察
            </button>
          </div>

          <div className="p-8">
            {isInsightLoading && !insights ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 animate-pulse">
                <Brain className="w-12 h-12 text-gray-700" />
                <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">正在連接全球市場數據庫...</p>
              </div>
            ) : insights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Trends & Interactive Events */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> 當前熱門趨勢 (Trending)
                    </h4>
                    <div className="space-y-3">
                      {insights.trendingThemes.map((theme, idx) => (
                        <div key={idx} className="bg-black/40 border border-gray-800 p-4 rounded-xl group hover:border-green-500/50 transition-colors">
                          <h5 className="text-green-400 font-bold text-sm mb-1">{theme.title}</h5>
                          <p className="text-xs text-gray-400 leading-relaxed">{theme.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 即將到來的高需求節慶 (Events)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.upcomingEvents.map((event, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setSelectedEvent(event)}
                          className={`px-4 py-2 text-[11px] font-bold rounded-full transition-all border ${selectedEvent?.name === event.name ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50 scale-105' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'}`}
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>

                    {selectedEvent && (
                      <div className="mt-4 p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">「{selectedEvent.name}」專屬關鍵字</p>
                          <button 
                            onClick={() => copyToClipboard(selectedEvent.keywords.join(', '), 'event-kw')}
                            className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors"
                          >
                            {copiedKey === 'event-kw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-bold uppercase">{copiedKey === 'event-kw' ? 'Copied' : 'Copy All'}</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.keywords.map((kw, i) => (
                            <button 
                              key={i}
                              onClick={() => copyToClipboard(kw, `ev-kw-${i}`)}
                              className="px-2 py-1 bg-black/40 border border-indigo-500/20 rounded text-[10px] text-gray-400 font-mono hover:text-white hover:border-indigo-400 transition-all flex items-center gap-1.5"
                            >
                              {kw}
                              {copiedKey === `ev-kw-${i}` ? <Check className="w-2 h-2 text-green-400" /> : <Copy className="w-2 h-2 opacity-50" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Hot Keywords & Commercial Advice */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4" /> 季節性高頻搜尋詞 (High-Freq)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {insights.hotKeywords.map((kw, idx) => (
                        <div 
                          key={idx}
                          className="group px-3 py-2 bg-gray-800/40 border border-gray-700 hover:border-green-500/50 text-gray-300 text-[11px] font-mono rounded-lg transition-all flex items-center justify-between"
                        >
                          <span className="truncate pr-2">{kw}</span>
                          <button 
                            onClick={() => copyToClipboard(kw, `hot-kw-${idx}`)}
                            className="text-gray-500 hover:text-green-400 transition-colors flex-shrink-0"
                          >
                            {copiedKey === `hot-kw-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Lightbulb className="w-16 h-16 text-indigo-500" />
                    </div>
                    <h4 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">商業專家建議 (Expert Advice)</h4>
                    <p className="text-sm text-gray-300 leading-relaxed relative z-10 italic">
                      "{insights.commercialAdvice}"
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          
          <div className="bg-gray-800/30 px-8 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Strategy Engine v4.2 • Updated Daily</p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-[10px] text-green-500/60 font-bold">● ADOBE STOCK READY</span>
              <span className="flex items-center gap-1 text-[10px] text-indigo-500/60 font-bold">● GETTY IMAGES SYNC</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-3 max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default StockSensei;