import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Crown, 
  Sparkles, 
  Trophy, 
  Zap, 
  Shield, 
  Lock, 
  CheckCircle, 
  TrendingUp, 
  Flame, 
  ChevronRight, 
  X,
  Star,
  PartyPopper
} from "lucide-react";
import { Habit } from "../types";
import { cn } from "../lib/utils";

interface HabitRewardsProps {
  habits: Habit[];
  theme: "light" | "dark";
}

interface BadgeConfig {
  id: string;
  name: string;
  milestone: number; // in days
  description: string;
  icon: React.ComponentType<any>;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend";
  gradient: string;
  solidColor: string;
  glow: string;
}

const BADGES: BadgeConfig[] = [
  {
    id: "badge-7",
    name: "Weekly Champion",
    milestone: 7,
    description: "Maintain a daily habit streak for 7 consecutive days to build initial routine momentum.",
    icon: Award,
    tier: "Bronze",
    gradient: "from-amber-600/10 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/20",
    solidColor: "border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20",
    glow: "shadow-orange-500/10"
  },
  {
    id: "badge-14",
    name: "Habit Builder",
    milestone: 14,
    description: "Form deep neurological roots by keeping a habit active for 14 straight days.",
    icon: Shield,
    tier: "Silver",
    gradient: "from-cyan-600/10 to-blue-500/10 dark:from-cyan-950/30 dark:to-blue-950/20",
    solidColor: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
    glow: "shadow-blue-500/10"
  },
  {
    id: "badge-30",
    name: "Month Master",
    milestone: 30,
    description: "Forge unbreakable neuro-circuits. Complete a remarkable 30-day streak.",
    icon: Sparkles,
    tier: "Gold",
    gradient: "from-yellow-500/10 to-amber-500/15 dark:from-yellow-950/30 dark:to-amber-950/20",
    solidColor: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-55/40 dark:bg-yellow-950/20",
    glow: "shadow-yellow-500/10"
  },
  {
    id: "badge-60",
    name: "Steel Discipline",
    milestone: 60,
    description: "Command your daily lifestyle. Establish a magnificent 60-day unbroken routine.",
    icon: Crown,
    tier: "Platinum",
    gradient: "from-purple-600/10 to-indigo-500/10 dark:from-purple-950/30 dark:to-indigo-950/20",
    solidColor: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20",
    glow: "shadow-indigo-500/10"
  },
  {
    id: "badge-100",
    name: "Unstoppable Legend",
    milestone: 100,
    description: "Reach elite supreme status. Transcend limits with a legendary 100-day journey.",
    icon: Trophy,
    tier: "Legend",
    gradient: "from-rose-500/15 to-pink-500/15 dark:from-rose-950/30 dark:to-pink-950/20",
    solidColor: "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20",
    glow: "shadow-rose-500/15"
  }
];

export default function HabitRewards({ habits, theme }: HabitRewardsProps) {
  const [selectedHabitId, setSelectedHabitId] = useState<string>("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);

  // Determine current active streak based on selection
  const getActiveStreak = () => {
    if (habits.length === 0) return 0;
    if (selectedHabitId === "all") {
      // Return maximum among all
      return Math.max(...habits.map(h => h.streak || 0), 0);
    } else {
      const h = habits.find(h => h.id === selectedHabitId);
      return h ? h.streak || 0 : 0;
    }
  };

  const currentStreak = getActiveStreak();

  // Selected habit info details
  const selectedHabitName = selectedHabitId === "all" 
    ? "All Habits (Overall Premium Best)" 
    : habits.find(h => h.id === selectedHabitId)?.name || "Selected Habit";

  // Achievements stats
  const unlockedBadgesCount = BADGES.filter(b => currentStreak >= b.milestone).length;
  const nextBadge = BADGES.find(b => currentStreak < b.milestone);
  const remainingDays = nextBadge ? nextBadge.milestone - currentStreak : 0;
  const progressPercent = nextBadge 
    ? Math.round((currentStreak / nextBadge.milestone) * 100) 
    : 100;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-8 select-none shadow-sm transition-colors duration-300">
      
      {/* Header section with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-gray-50 dark:border-gray-850">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Achievements Hub</span>
          </div>
          <h3 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center gap-2">
            <span>Streak Rewards Cabinet</span>
            <span className="hidden sm:inline text-xs font-normal text-gray-400 dark:text-gray-500">Milestones & Badges</span>
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 tracking-normal max-w-xl">
            Ticking your premium habits builds historical streaks. Lock in 7, 14, 30, 60, or 100 consecutive days to immortalize your achievements!
          </p>
        </div>

        {/* Dashboard Streak Highlights */}
        <div className="flex items-center gap-4 shrink-0 bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border border-gray-150/40 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Best Streak</div>
              <div className="text-xl font-black text-gray-950 dark:text-white mt-0.5 font-mono">{currentStreak} <span className="text-xs font-semibold text-gray-400">Days</span></div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Unlocked</div>
              <div className="text-xl font-black text-gray-950 dark:text-white mt-0.5 font-mono">{unlockedBadgesCount} <span className="text-xs font-semibold text-gray-400">/ 5</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Habits selector tabs */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Select Streak Scope</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedHabitId("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 border",
              selectedHabitId === "all"
                ? "bg-black text-white border-black dark:bg-indigo-600 dark:border-indigo-500"
                : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-800/80 text-gray-600 dark:text-gray-400 border-transparent"
            )}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Overall Best Streak</span>
          </button>
          {habits.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHabitId(h.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                selectedHabitId === h.id
                  ? "bg-black text-white border-black dark:bg-indigo-600 dark:border-indigo-500"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-800/80 text-gray-600 dark:text-gray-400 border-transparent"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", h.color || "bg-indigo-500")} />
              <span>{h.name}</span>
              <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{h.streak || 0}d</span>
            </button>
          ))}
          {habits.length === 0 && (
            <span className="text-xs italic text-gray-400">Create daily tracks to unlock personalized habit analysis.</span>
          )}
        </div>
      </div>

      {/* Next Milestone Progress Guage */}
      {nextBadge ? (
        <div className="bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-950/[0.04] p-5 rounded-3xl border border-gray-100 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Next Milestone Tracker</span>
            </div>
            <h4 className="text-base font-black text-gray-950 dark:text-white">
              Unlock <span className="text-indigo-600 dark:text-indigo-400">{nextBadge.name} ({nextBadge.milestone} Days)</span>
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
              Keep completing <strong className="text-gray-900 dark:text-gray-200">"{selectedHabitName}"</strong> active consecutively. Just <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">{remainingDays} more days</span> required to forge this unique trophy!
            </p>
          </div>
          <div className="w-full md:w-64 space-y-2 shrink-0">
            <div className="flex justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500">
              <span className="font-mono">{currentStreak} / {nextBadge.milestone} Days</span>
              <span className="font-mono">{progressPercent}% Completed</span>
            </div>
            <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-[2px] border border-gray-200/40 dark:border-gray-700/40">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-500 dark:to-indigo-400 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 rounded-3xl border border-emerald-500/20 text-center space-y-1.5">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-500">
            <PartyPopper className="w-5 h-5 animate-bounce" />
          </div>
          <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-base">Ultimate Synergy Unlocked! 🏆</h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            Astounding diligence! Every single streak milestone up to 100 days has been officially unlocked. You hold supreme habits control.
          </p>
        </div>
      )}

      {/* Badges Cabinet Layout Grid */}
      <div className="space-y-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Rewards Showcase Cabinet (Click badges to inspect)</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {BADGES.map((badge) => {
            const isUnlocked = currentStreak >= badge.milestone;
            const BadgeIcon = badge.icon;
            
            return (
              <motion.div
                whileHover={{ y: isUnlocked ? -4 : 0 }}
                transition={{ duration: 0.2 }}
                key={badge.id}
                onClick={() => isUnlocked && setSelectedBadge(badge)}
                className={cn(
                  "border-2 rounded-[2rem] p-5 flex flex-col items-center text-center justify-between min-h-[190px] relative overflow-hidden cursor-help",
                  isUnlocked 
                    ? cn("bg-gradient-to-br border-indigo-200/60 dark:border-indigo-900/30", badge.solidColor, badge.glow)
                    : "bg-gray-50/20 dark:bg-gray-950/25 border-gray-150 dark:border-gray-800 text-gray-400 dark:text-gray-500 opacity-70"
                )}
              >
                {/* Visual Glow overlay background */}
                {isUnlocked && (
                  <span className="absolute -bottom-10 -right-10 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-xl pointer-events-none" />
                )}

                {/* Badge tier indicator tag */}
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                  isUnlocked 
                    ? "bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800" 
                    : "bg-gray-100 dark:bg-gray-850"
                )}>
                  {badge.tier}
                </span>

                {/* Badge Icon center container */}
                <div className="py-4 flex flex-col items-center">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-inner mb-3",
                    isUnlocked 
                      ? "bg-white/80 dark:bg-gray-900/80 border border-indigo-100/50 dark:border-indigo-950" 
                      : "bg-gray-100 dark:bg-gray-850 text-gray-400"
                  )}>
                    {isUnlocked ? (
                      <BadgeIcon className="w-7 h-7" />
                    ) : (
                      <Lock className="w-5 h-5 opacity-60 text-gray-400" />
                    )}
                  </div>
                  
                  <h4 className="font-extrabold text-[13px] tracking-tight leading-tight dark:text-white">
                    {badge.name}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    {badge.milestone} Days Goal
                  </p>
                </div>

                {/* Bottom Status feedback */}
                <div className="w-full pt-2">
                  {isUnlocked ? (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 w-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">
                      Locked ({currentStreak}/{badge.milestone}d)
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pop-up Celebration modal */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-[300] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-7 md:p-8 border border-indigo-200 dark:border-gray-800 shadow-2xl relative text-center space-y-6"
            >
              {/* Closing Trigger button */}
              <button 
                onClick={() => setSelectedBadge(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors text-gray-400"
                aria-label="Close dialog"
                id="close-celebration-badge-btn"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-rose-500"></div>

              {/* Icon Container with active particle styling */}
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                <selectedBadge.icon className="w-10 h-10 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              </div>

              {/* Badge info content */}
              <div className="space-y-2">
                <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {selectedBadge.tier} Tier Award
                </span>
                <h3 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight mt-1">
                  {selectedBadge.name} Unlocked!
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  Achieved streak milestone of {selectedBadge.milestone} consecutive days
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-semibold pt-2">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 py-3 px-4 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 font-bold max-w-xs mx-auto">
                🚀 Checked inside standard habit streak parameters for {selectedHabitName}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full py-3 bg-black dark:bg-indigo-600 hover:opacity-90 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-md active:scale-95"
                >
                  Claim My Glory! 🔥
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
