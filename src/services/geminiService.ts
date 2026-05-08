import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const gemini = {
  async generateContent(prompt: string, systemInstruction?: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  async getAiSuggestions(module: string, context: any) {
    const prompt = `Provide 3 actionable tips for my ${module} module. 
      Context: ${JSON.stringify(context)}. 
      Format: JSON array of strings.`;
    
    const result = await this.generateContent(prompt, "You are an elite productivity coach.");
    try {
      return JSON.parse(result || "[]");
    } catch {
      return [];
    }
  }
};
