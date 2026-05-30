import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.trim() === "") {
      return null;
    }
    try {
      aiInstance = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
      return null;
    }
  }
  return aiInstance;
}

export const gemini = {
  async generateContent(prompt: string, systemInstruction?: string) {
    try {
      const ai = getAi();
      if (!ai) {
        return "Note: Gemini API key is not configured. Running in secure offline fallback mode.";
      }
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Note: Gemini API key is not configured or quota exceeded. Running in secure offline fallback mode.";
    }
  },

  async getAiSuggestions(module: string, context: any) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY" && apiKey.trim() !== "") {
        try {
          const prompt = `Provide 3 actionable tips for my ${module} module. 
            Context: ${JSON.stringify(context)}. 
            Format: JSON array of strings.`;
          
          const result = await this.generateContent(prompt, "You are an elite productivity coach.");
          // Clean summary output to avoid markdown block wrapping
          const cleanText = result.replace(/```json/g, "").replace(/```/g, "").trim();
          return JSON.parse(cleanText || "[]");
        } catch (apiError) {
          console.warn("Gemini API call failed, falling back to local offline suggestions:", apiError);
        }
      }

      // High-quality Offline Productivity Engine
      const habitsCount = context.habits || 0;
      const tasksCount = context.tasks || 0;

      const tips: string[] = [];

      // Habit-driven insights
      if (habitsCount === 0) {
        tips.push("Consistency beats intensity: Start by tracking just 1 simple daily habit, like drinking water or walking.");
      } else if (habitsCount < 3) {
        tips.push(`Your ${habitsCount} active habit${habitsCount > 1 ? 's' : ''} form the core of your daily momentum. Keep the streaks alive!`);
      } else {
        tips.push(`Tracking ${habitsCount} active habits is commendable! Focus on daily consistency before introducing more.`);
      }

      // Task-driven insights
      if (tasksCount === 0) {
        tips.push("Inbox Zero! 🎉 You have no pending tasks. Take a moment to reflect, rest, or plan your next major milestone.");
      } else if (tasksCount > 5) {
        tips.push(`You have ${tasksCount} pending tasks. Apply the '2-Minute Rule': If a task takes less than 2 minutes, tackle it now.`);
        tips.push("Triage your workload: Group remaining tasks in your Priority Matrix and focus only on Urgent & Important quadrants.");
      } else {
        tips.push(`With ${tasksCount} pending task${tasksCount > 1 ? 's' : ''}, schedule dedicated 30-minute focus blocks to clear them.`);
      }

      // Proactive general productivity cards
      const randomTips = [
        "Time-blocking: Allocate specific blocks on your Timetable to work only on high-priority course work.",
        "Eat the Frog: Solve your most challenging or high-priority task first thing in the morning when focus is highest.",
        "Take mindful breaks: Practice the Pomodoro technique (25m deep study, 5m rest) to maintain stamina.",
        "Monotasking is power: Multitasking reduces mental output by up to 40%. Dive all-in on one focus subject.",
        "Budget Check-ins: Log simple daily expense details to keep your live Budget Health gauge accurate."
      ];

      // Sift unique tips in
      const shuffled = [...randomTips].sort(() => 0.5 - Math.random());
      while (tips.length < 3 && shuffled.length > 0) {
        const nextTip = shuffled.pop();
        if (nextTip && !tips.includes(nextTip)) {
          tips.push(nextTip);
        }
      }

      return tips.slice(0, 3);
    } catch (error) {
      console.warn("Could not generate offline suggestions:", error);
      return [
        "Consistency beats intensity: Start by tracking 1 simple daily habit.",
        "Eat the Frog: Tackle your most difficult task first in the morning to build success momentum.",
        "Use Pomodoro clocks: Work 25 minutes completely uninterrupted, then rest for 5 minutes."
      ];
    }
  }
};

