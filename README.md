# Wrindha OS

An all-in-one productivity ecosystem for students, combining Study Planning, Habit Tracking, Expense Management, and Task Orchestration into a single polished interface.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Features

- **Dashboard**: High-level overview of your daily progress.
- **Study Planner**: Course management with exam trackers and material links.
- **Habit Tracker**: Daily and weekly habits with streak monitoring.
- **Expense Tracker**: Categorized spending logs with visual charts.
- **Goal System**: Track long-term objectives with progress bars.
- **Eisenhower Matrix**: Prioritize tasks using the 4-quadrant productivity method.
- **Timetable**: Keep track of your weekly schedule.
- **Admin View**: User insights for platform administrators.
- **AI-Powered**: Integration with Gemini AI for smart tips and productivity summaries.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js (Express), Supabase (Auth & Database).
- **Animation**: Framer Motion.
- **AI**: Google Gemini API.

## 📦 Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- A Supabase Project ([supabase.com](https://supabase.com))
- A Google AI Studio API Key ([aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repository
```bash
git clone https://github.com/your-username/wrindha-os.git
cd wrindha-os
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup
Run the SQL commands found in `supabase_schema.sql` inside your Supabase SQL Editor to set up the necessary tables and Row Level Security (RLS) policies.

### 5. Start Development Server
```bash
npm run dev
```

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Created by **Kalyan**, a B.Tech student passionate about productivity and technology.
