import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      throw new Error("Gemini API Key is not configured. Please add GEMINI_API_KEY to your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const gemini = {
  async generateContent(prompt: string, systemInstruction?: string) {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  async getAiSuggestions(module: string, context: any) {
    try {
      const prompt = `Provide 3 actionable tips for my ${module} module. 
        Context: ${JSON.stringify(context)}. 
        Format: JSON array of strings.`;
      
      const result = await this.generateContent(prompt, "You are an elite productivity coach.");
      return JSON.parse(result || "[]");
    } catch (error) {
      console.warn("Could not get AI suggestions:", error);
      return [];
    }
  }
};
