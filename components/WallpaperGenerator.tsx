import React, { useState, useEffect, useRef } from 'react';
import { MediaFile, GenerationState, DirectorResponse, SavedStyle } from '../types';
import FileUpload from './FileUpload';
import ResultDisplay from './ResultDisplay';
import { generateWallpaperFusion, generateReversePrompt, fileToGenerativePart } from '../services/geminiService';
import { ArrowRight, Smartphone, Cat, Palette, Sparkles, Save, BookTemplate, Trash2, Plus, UploadCloud } from 'lucide-react';

const WallpaperGenerator: React.FC = () => {
  // Inputs
  const [styleImage, setStyleImage] = useState<MediaFile | null>(null);
  const [subjectImage, setSubjectImage] = useState<MediaFile | null>(null);
  const [customText, setCustomText] = useState('');
  
  // Saved Styles State
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [activeSavedStyle, setActiveSavedStyle] = useState<SavedStyle | null>(null);

  // Hidden input for importing styles
  const importStyleInputRef = useRef<HTMLInputElement>(null);

  // Generation State
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    result: null,
    error: null,
  });

  // Load styles from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wallpaper_styles');
    if (saved) {
      try {
        setSavedStyles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved styles");
      }
    }
  }, []);

  const handleGenerate = async () => {
    // Validation: Need either an Image OR an Active Saved Style
    if (!styleImage && !activeSavedStyle) return;

    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Logic: If using saved style, pass its analysis string. If using image, pass the file.
      const styleSource = activeSavedStyle ? activeSavedStyle.analysis : styleImage!;
      
      const response = await generateWallpaperFusion(
        styleSource, 
        subjectImage || undefined,
        customText
      );
      
      setGenerationState({
        isLoading: false,
        result: response,
        error: null,
      });
    } catch (error: any) {
      setGenerationState({
        isLoading: false,
        result: null,
        error: error.message || "Wallpaper generation failed.",
      });
    }
  };

  // Helper to create a small persistent thumbnail from a Blob URL
  const createPersistentThumbnail = async (src: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Resize to height 200px to save LocalStorage space
            const scale = 200 / img.height;
            canvas.height = 200;
            canvas.width = img.width * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Compress heavily
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => {
            console.error("Failed to create thumbnail");
            resolve(src); // Fallback (might fail storage if blob)
        };
    });
  };

  // Logic to handle importing an existing image directly into the library
  // AUTOMATIC NAMING: No prompt(), AI determines name.
  const handleImportStyle = async (file: File) => {
    if (!file) return;
    
    // Set loading immediately to give feedback
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
        // 2. Prepare file
        const { data, mimeType } = await fileToGenerativePart(file);
        const mediaFile: MediaFile = { 
            file, 
            type: 'image', 
            previewUrl: URL.createObjectURL(file),
            base64Data: data,
            mimeType 
        };

        // 3. Analyze Style (Using the Director Mode analysis to get the 'Recipe' AND 'Title')
        // Using existing generateReversePrompt which now returns a 'title'
        const analysisResult = await generateReversePrompt(mediaFile);
        
        // 4. Create Thumbnail
        const thumbnailUrl = await createPersistentThumbnail(mediaFile.previewUrl);

        // 5. Save with AUTO GENERATED NAME
        const autoName = analysisResult.title || file.name.split('.')[0] || "New Style";
        
        const newStyle: SavedStyle = {
            id: Date.now().toString(),
            name: autoName,
            analysis: analysisResult.analysis, // Use the Chinese analysis as the description/recipe
            thumbnailUrl: thumbnailUrl
        };

        const updatedStyles = [newStyle, ...savedStyles];
        try {
            localStorage.setItem('wallpaper_styles', JSON.stringify(updatedStyles));
            setSavedStyles(updatedStyles);
            // Optional: alert or toast, but seamless is better. 
            // We just let it appear in the UI.
        } catch (storageError) {
            alert("儲存失敗：瀏覽器儲存空間不足。");
        }

    } catch (e: any) {
        console.error(e);
        alert("匯入風格分析失敗: " + e.message);
    } finally {
        setGenerationState(prev => ({ ...prev, isLoading: false }));
        // Clear the input so same file can be selected again if needed
        if (importStyleInputRef.current) {
            importStyleInputRef.current.value = '';
        }
    }
  };

  // Save the CURRENT generated result as a style
  // AUTOMATIC NAMING: Uses the result title.
  const handleSaveStyle = async () => {
    if (!generationState.result || (!styleImage && !activeSavedStyle)) return;
    
    // Auto-generate name from the result Title or a default
    const name = generationState.result.title || `Style ${new Date().toLocaleTimeString()}`;

    try {
        let thumbnailUrl = "";

        if (styleImage) {
            thumbnailUrl = await createPersistentThumbnail(styleImage.previewUrl);
        } else if (activeSavedStyle) {
            thumbnailUrl = activeSavedStyle.thumbnailUrl;
        }

        const newStyle: SavedStyle = {
        id: Date.now().toString(),
        name,
        analysis: generationState.result.analysis,
        thumbnailUrl: thumbnailUrl
        };

        const updatedStyles = [newStyle, ...savedStyles];
        
        try {
            localStorage.setItem('wallpaper_styles', JSON.stringify(updatedStyles));
            setSavedStyles(updatedStyles);
            alert(`風格 "${name}" 已儲存！ (Saved)`);
        } catch (storageError) {
            alert("儲存失敗：瀏覽器儲存空間不足。請刪除一些舊的風格再試一次。");
        }
        
    } catch (e) {
        console.error(e);
        alert("儲存縮圖時發生錯誤");
    }
  };

  const handleDeleteStyle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定刪除此風格？")) {
        const updated = savedStyles.filter(s => s.id !== id);
        setSavedStyles(updated);
        localStorage.setItem('wallpaper_styles', JSON.stringify(updated));
        if (activeSavedStyle?.id === id) setActiveSavedStyle(null);
    }
  };

  const handleSelectStyle = (style: SavedStyle) => {
    setActiveSavedStyle(style);
    setStyleImage(null); // Clear manual upload when selecting saved style
  };

  const handleClearStyle = () => {
    setActiveSavedStyle(null);
    setStyleImage(null);
  };

  const handleUpdateResult = (newResult: DirectorResponse) => {
    setGenerationState(prev => ({ ...prev, result: newResult }));
  };

  const handleReset = () => {
    // Only clear result, keep inputs for easier iteration
    setGenerationState({ isLoading: false, result: null, error: null });
  };

  const handleFullReset = () => {
    setStyleImage(null);
    setSubjectImage(null);
    setActiveSavedStyle(null);
    setCustomText('');
    setGenerationState({ isLoading: false, result: null, error: null });
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Smartphone className="text-purple-400" /> 手機桌布工作室
        </h2>
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">
          建立你的風格庫。上傳風格圖或使用已儲存的樣式，融合特定的主角與客製化需求。
        </p>
      </div>

      {/* SAVED STYLES LIBRARY */}
      {!generationState.result && (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm font-semibold px-1">
                <BookTemplate className="w-4 h-4 text-indigo-400" /> 
                風格資料庫 (Saved Styles)
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent min-h-[180px]">
                
                {/* Create/Import New Style Button */}
                <button 
                    onClick={() => importStyleInputRef.current?.click()}
                    disabled={generationState.isLoading}
                    className={`flex-shrink-0 w-32 h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group
                        ${generationState.isLoading 
                            ? 'border-gray-700 bg-gray-900 cursor-not-allowed opacity-50' 
                            : 'border-indigo-500 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white'}
                    `}
                >
                    <div className="p-2 bg-indigo-500/20 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        {generationState.isLoading ? (
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <UploadCloud className="w-6 h-6" />
                        )}
                    </div>
                    <span className="text-xs font-medium text-center px-2">
                        {generationState.isLoading ? '分析中...' : '匯入風格圖片\n(Import Style)'}
                    </span>
                </button>
                <input 
                    type="file" 
                    ref={importStyleInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImportStyle(e.target.files[0])}
                />

                {savedStyles.map(style => (
                    <div 
                        key={style.id}
                        onClick={() => handleSelectStyle(style)}
                        className={`
                            relative flex-shrink-0 w-32 h-44 rounded-xl border-2 overflow-hidden cursor-pointer group transition-all
                            ${activeSavedStyle?.id === style.id ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105' : 'border-gray-700 opacity-70 hover:opacity-100 hover:border-gray-500'}
                        `}
                    >
                        <img src={style.thumbnailUrl} alt={style.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2">
                            <span className="text-white text-xs font-bold truncate">{style.name}</span>
                        </div>
                        <button 
                            onClick={(e) => handleDeleteStyle(style.id, e)}
                            className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* INPUT AREA */}
      {!generationState.result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative bg-gray-800/20 p-6 rounded-2xl border border-gray-700/50">
          
          {/* COLUMN 1: STYLE SOURCE */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm uppercase tracking-wider">
               <Palette className="w-4 h-4" /> 步驟 1: 選擇風格 (Style)
             </div>
             
             {activeSavedStyle ? (
                 <div className="relative rounded-xl border-2 border-purple-500 bg-gray-900 p-4 h-64 flex flex-col items-center justify-center text-center gap-3">
                     <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-600 shadow-lg">
                         <img src={activeSavedStyle.thumbnailUrl} className="w-full h-full object-cover" alt="Active" />
                     </div>
                     <div>
                        <h3 className="text-white font-bold text-lg">{activeSavedStyle.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">已載入風格參數</p>
                     </div>
                     <button onClick={handleClearStyle} className="mt-2 text-xs text-red-400 hover:underline">取消選取 (Deselect)</button>
                 </div>
             ) : styleImage ? (
               <div className="relative rounded-xl border border-purple-500/50 overflow-hidden h-64 bg-black group">
                  <img src={styleImage.previewUrl} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="Style" />
                  <button onClick={() => setStyleImage(null)} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">更換圖片</button>
               </div>
             ) : (
               <FileUpload onFileSelect={setStyleImage} isLoading={generationState.isLoading} />
             )}
          </div>

          {/* COLUMN 2: SUBJECT & CUSTOMIZATION */}
          <div className="space-y-4 flex flex-col">
             <div className="flex items-center justify-between text-pink-300 font-semibold text-sm uppercase tracking-wider">
               <span className="flex items-center gap-2"><Cat className="w-4 h-4" /> 步驟 2: 內容與細節</span>
             </div>
             
             {/* Subject Image (Optional) */}
             <div className="flex-1">
                {subjectImage ? (
                <div className="relative rounded-xl border border-pink-500/50 overflow-hidden h-40 bg-black group mb-3">
                    <img src={subjectImage.previewUrl} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="Subject" />
                    <button onClick={() => setSubjectImage(null)} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">更換主角</button>
                </div>
                ) : (
                <div className="relative h-40 mb-3">
                    <FileUpload onFileSelect={setSubjectImage} isLoading={generationState.isLoading} />
                    <div className="absolute bottom-2 w-full text-center pointer-events-none">
                        <span className="text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded">可選：上傳主角圖片</span>
                    </div>
                </div>
                )}
             </div>

             {/* Custom Text Input */}
             <div>
                 <label className="block text-xs text-gray-400 mb-1.5 ml-1">客製化需求 / 描述主角 (Custom Text)</label>
                 <textarea 
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="例如：把貓咪換成一隻柴犬，背景要有霓虹燈，加入 'Summer Vibes' 的文字..."
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none h-24 resize-none placeholder-gray-600"
                 />
             </div>
          </div>
        </div>
      )}

      {/* GENERATE BUTTON */}
      {!generationState.result && (
        <div className="flex justify-center mt-2">
          <button
            onClick={handleGenerate}
            disabled={(!styleImage && !activeSavedStyle) || generationState.isLoading}
            className={`
              px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 w-full md:w-auto justify-center
              ${(!styleImage && !activeSavedStyle)
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-purple-500/30 hover:scale-105 active:scale-95'}
            `}
          >
            {generationState.isLoading ? (
               <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> AI 處理中...</span>
            ) : (
               <>
                 <Sparkles className="w-5 h-5" /> 
                 {activeSavedStyle ? `套用風格並生成 (Apply Style)` : '分析風格並生成 (Generate)'}
               </>
            )}
          </button>
        </div>
      )}

      {/* RESULTS AREA */}
      {generationState.result && (
        <div className="mt-8 relative">
            
            {/* Save Style Button (Visible only if valid result) */}
            <div className="flex justify-between items-center mb-4">
                <button 
                    onClick={handleFullReset}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" /> 返回編輯 (Back)
                </button>
                
                {/* Only show save button if it came from a one-time generation, not an already saved style */}
                {!activeSavedStyle && (
                    <button 
                        onClick={handleSaveStyle}
                        className="bg-gray-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-gray-700 hover:border-green-500"
                    >
                        <Save className="w-4 h-4" /> 儲存此風格 (Save Style)
                    </button>
                )}
            </div>

            <ResultDisplay 
              media={styleImage || { previewUrl: activeSavedStyle?.thumbnailUrl || '', type: 'image', file: new File([], ''), base64Data: '' }}
              additionalMedia={subjectImage}
              state={generationState}
              onGenerate={handleGenerate}
              onReset={handleFullReset}
              onUpdateResult={handleUpdateResult}
            />
        </div>
      )}
    </div>
  );
};

export default WallpaperGenerator;