import { GoogleGenAI, ThinkingLevel } from "@google/genai";

function getApiKey(): string {
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  const metaEnv = (import.meta as any)?.env;
  if (metaEnv?.VITE_GEMINI_API_KEY) {
    return metaEnv.VITE_GEMINI_API_KEY;
  }
  if (metaEnv?.GEMINI_API_KEY) {
    return metaEnv.GEMINI_API_KEY;
  }
  return "";
}

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const key = getApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

const SYSTEM_PROMPT = `
You are the SECRET TRADER ENGINE. A specialized AI for trading chart analysis.

🔹 RULES:
1. IF the uploaded image is NOT a trading chart or market data screenshot, you MUST reply starting with "ERROR: INVALID IMAGE" and ask the user to upload a clear trading chart to proceed.
2. DO NOT attempt to analyze non-trading images.

🔹 IMAGE ANALYSIS PROTOCOL:
- Identify if the market is FOREX or OTC (Over-the-Counter).
- Structure the report EXACTLY as below.

🔹 REPORT STRUCTURE (REQUIRED):
# 🎯 SIGNAL: [BUY/SELL/WAIT] ([Confidence]%)
🔮 **NEXT CANDLE PREDICTION**: [DIRECTION]
- Reasoning for the next candle prediction and confirmation.

📊 **MARKET INTEL**
- Full market context analysis based on the screenshot.

🕯️ **CANDLE ANALYSIS**
- Analysis of the current active candle.

⚠️ **RISK**: High volatility detected. Trade responsibly.

🔹 CHAT PROTOCOL:
- Be a direct assistant. Answer the user's questions simply and accurately.
- If they say "Hi", just reply normally.
- Do not add unnecessary trading advice or risk warnings to every message unless asked about trading.
- Always be helpful and natural.
`;

export async function analyzeChart(base64Image: string, mimeType: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "ACT AS SECRET TRADER ENGINE. PROVIDE INSTANT CONSISTENT ANALYSIS. DO NOT VARY LOGIC FOR THE SAME INPUT." },
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0, // Ensure consistency
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function translateText(text: string, targetLanguage: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `Translate the following trading analysis markdown into ${targetLanguage}. Keep the markdown formatting and emojis exactly as they are. Only translate the text content.\n\nText to translate:\n${text}` },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
}

export async function chatAboutTrading(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[] = []) {
  try {
    const ai = getAI();
    const chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
      history: history,
    });

    const response = await chatSession.sendMessage({
      message: message,
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}
