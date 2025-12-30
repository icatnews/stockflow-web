import { GoogleGenAI, Type } from "@google/genai";
import { MediaFile, DirectorResponse, StockSenseiResponse, MarketInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = "gemini-3-pro-preview";

const stockSenseiSchema = {
  type: Type.OBJECT,
  properties: {
    seo: {
      type: Type.OBJECT,
      properties: {
        titles: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Two professional stock titles in English."
        },
        bestTitle: { 
          type: Type.STRING,
          description: "The most commercially viable title for stock platforms."
        },
        keywords: { 
          type: Type.STRING,
          description: "35 to 50 relevant English keywords separated by commas."
        },
      },
      required: ["titles", "bestTitle", "keywords"],
    },
  },
  required: ["seo"],
};

const marketInsightSchema = {
  type: Type.OBJECT,
  properties: {
    trendingThemes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"],
      },
    },
    upcomingEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "keywords"],
      },
    },
    hotKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    commercialAdvice: { type: Type.STRING },
  },
  required: ["trendingThemes", "upcomingEvents", "hotKeywords", "commercialAdvice"],
};

const directorSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    analysis: { type: Type.STRING },
    prompt: { type: Type.STRING },
  },
  required: ["analysis", "prompt"],
};

export const getMarketInsights = async (): Promise<MarketInsight> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const systemInstruction = `
      你現在是「StockFlow 智慧大腦」，全球頂尖圖庫市場分析官。
      當前日期是：${today}。
      你的任務是分析當前國際圖庫（Adobe Stock, Shutterstock, Getty Images）的搜尋趨勢、季節性需求與高頻關鍵字。
      請務必根據當前日期，精準預測接下來 2-3 個月的全球重大節慶（例如：跨年慶典、元旦、農曆新年、情人節、春季旅遊等）。
      
      輸出要求（繁體中文）：
      1. 【熱門趨勢】：列出 3 個當前全球最熱賣的視覺主題。
      2. 【即將到來的節慶】：列出 3 個最具商業潛力的節慶，並為每個節慶提供 5-8 個對應的高頻英文關鍵字。
      3. 【高頻關鍵字】：提供 10 個與目前季節或趨勢相關的通用英文高頻搜尋詞。
      4. 【商業建議】：給予創作者一段精確的拍攝或生成建議。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請分析從 ${today} 開始的全球圖庫市場趨勢與建議。`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: marketInsightSchema
      }
    });

    return JSON.parse(response.text || "{}") as MarketInsight;
  } catch (error: any) {
    throw new Error(error.message || "Market Insights fetch failed.");
  }
};

export const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({ mimeType: file.type, data: base64Data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateStockSenseiAnalysis = async (media: MediaFile): Promise<StockSenseiResponse> => {
  try {
    const systemInstruction = `
      你現在是「StockSensei X」，全球頂尖圖庫 SEO 專家。
      你不需要進行任何視覺或市場 analysis。你的唯一任務是針對使用者提供的圖片、影片或文字描述，生成專業的英文 SEO 套件。
      
      輸出要求：
      1. 【SEO Titles】: 提供 2 個精準標題。
      2. 【Best Title】: 選出最符合圖庫搜尋權重的一個標題。
      3. 【Keywords】: 提供 35 到 50 個英文關鍵字，以逗號分隔。
      
      規則：
      - 內容全部使用英文。
      - 標題必須符合 Adobe Stock, Shutterstock 的商業命名標準（包含具象描述與場景關鍵字）。
    `;

    const parts: any[] = [];
    if (media.type === 'text') {
      parts.push({ text: `請為以下主題生成 SEO：${media.textContent}` });
    } else {
      parts.push({ text: media.type === 'video' ? "幫我產出這段影片的 SEO 英文" : "這張圖片幫我做 SEO" });
      parts.push({ inlineData: { mimeType: media.mimeType!, data: media.base64Data! } });
    }

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: stockSenseiSchema
      }
    });

    return JSON.parse(response.text || "{}") as StockSenseiResponse;
  } catch (error: any) {
    throw new Error(error.message || "StockSensei SEO generation failed.");
  }
};

export const generateReversePrompt = async (media: MediaFile): Promise<DirectorResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
            { text: "請分析這份素材。我要先製作一張風格類似的「靜態圖片」，請給我 Image Prompt。" },
            { inlineData: { mimeType: media.mimeType!, data: media.base64Data! } }
        ]
      },
      config: { 
        systemInstruction: "你是一位頂尖的 AI 視覺導演。請以「繁體中文」提供專業的視覺構圖、光影與風格分析 (analysis)，並以「英文」提供對應的 AI 繪圖提示詞 (prompt)。",
        responseMimeType: "application/json",
        responseSchema: directorSchema
      }
    });
    return JSON.parse(response.text || "{}") as DirectorResponse;
  } catch (e) { throw e; }
};

export const refinePromptWithFeedback = async (
  media: MediaFile,
  previousResult: DirectorResponse,
  feedback: string,
  badMedia?: MediaFile,
  additionalMedia?: MediaFile
): Promise<DirectorResponse> => {
  try {
    const parts: any[] = [
      { text: `Refine prompt based on feedback. Previous analysis: "${previousResult.analysis}". User feedback: "${feedback}".` },
      { inlineData: { mimeType: media.mimeType!, data: media.base64Data! } }
    ];
    if (badMedia) parts.push({ inlineData: { mimeType: badMedia.mimeType!, data: badMedia.base64Data! } });
    if (additionalMedia) parts.push({ inlineData: { mimeType: additionalMedia.mimeType!, data: additionalMedia.base64Data! } });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts },
      config: {
        systemInstruction: "你是一位專業的視覺修正導演。請以「繁體中文」解釋修正策略 (analysis)，並以「英文」產出優化後的提示詞 (prompt)。",
        responseMimeType: "application/json",
        responseSchema: directorSchema
      }
    });
    return JSON.parse(response.text || "{}") as DirectorResponse;
  } catch (e) { throw e; }
};

export const generateVideoPromptFromImage = async (media: MediaFile, generatedImage: MediaFile): Promise<DirectorResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          { text: "Generate a video motion prompt." },
          { inlineData: { mimeType: media.mimeType!, data: media.base64Data! } },
          { inlineData: { mimeType: generatedImage.mimeType!, data: generatedImage.base64Data! } }
        ]
      },
      config: {
        systemInstruction: "你是一位 AI 動態攝影導演。請以「繁體中文」分析運鏡、動作與節奏策略 (analysis)，並以「英文」產出對應的動態提示詞 (prompt)。",
        responseMimeType: "application/json",
        responseSchema: directorSchema
      }
    });
    return JSON.parse(response.text || "{}") as DirectorResponse;
  } catch (e) { throw e; }
};

export const refineVideoPromptWithFeedback = async (
  media: MediaFile,
  generatedImage: MediaFile,
  previousResult: DirectorResponse,
  feedback: string,
  badVideo?: MediaFile
): Promise<DirectorResponse> => {
  try {
    const parts: any[] = [
      { text: `Refine video prompt. Feedback: "${feedback}".` },
      { inlineData: { mimeType: media.mimeType!, data: media.base64Data! } },
      { inlineData: { mimeType: generatedImage.mimeType!, data: generatedImage.base64Data! } }
    ];
    if (badVideo) parts.push({ inlineData: { mimeType: badVideo.mimeType!, data: badVideo.base64Data! } });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts },
      config: {
        systemInstruction: "你是一位專業的動態修正式導演。請以「繁體中文」解釋運鏡修正策略 (analysis)，並以「英文」產出優化後的動態提示詞 (prompt)。",
        responseMimeType: "application/json",
        responseSchema: directorSchema
      }
    });
    return JSON.parse(response.text || "{}") as DirectorResponse;
  } catch (e) { throw e; }
};

export const generateWallpaperFusion = async (styleSource: MediaFile | string, subjectImage?: MediaFile, customText?: string): Promise<DirectorResponse> => {
  try {
    const parts: any[] = [];
    let promptContext = "Create cinematic wallpaper fusion prompt.";
    if (typeof styleSource === 'string') promptContext += ` Style: ${styleSource}.`;
    else parts.push({ inlineData: { mimeType: styleSource.mimeType!, data: styleSource.base64Data! } });
    if (subjectImage) parts.push({ inlineData: { mimeType: subjectImage.mimeType!, data: subjectImage.base64Data! } });
    if (customText) promptContext += ` User req: ${customText}.`;
    parts.push({ text: promptContext });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts },
      config: {
        systemInstruction: "你是一位手機桌布視覺藝術總監。請以「繁體中文」說明風格融合邏輯 (analysis)，並以「英文」產出最終生成的提示詞 (prompt)。",
        responseMimeType: "application/json",
        responseSchema: directorSchema
      }
    });
    return JSON.parse(response.text || "{}") as DirectorResponse;
  } catch (e) { throw e; }
};