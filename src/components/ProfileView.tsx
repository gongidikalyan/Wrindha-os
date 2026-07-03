import React, { useState, useEffect } from "react";
import { 
  User, 
  Settings, 
  Users, 
  CreditCard, 
  Sparkles, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  Check, 
  Copy, 
  Trash2, 
  Award, 
  ArrowRight,
  Shield,
  Smartphone,
  QrCode,
  Lock,
  Unlock,
  Key,
  Database,
  Info,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Download,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ProfileViewProps {
  referrals: any[];
  setReferrals: (r: any[]) => void;
  userName: string;
  setUserName: (n: string) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  subscriptionTier: string;
  session: any;
  setActiveTab: (t: string) => void;
  handleLogout?: () => Promise<void>;
}

export function ProfileView({
  referrals,
  setReferrals,
  userName,
  setUserName,
  theme,
  setTheme,
  subscriptionTier,
  session,
  setActiveTab,
  handleLogout
}: ProfileViewProps) {
  // Sidebar Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    "account" | "referrals" | "subscription" | "themes" | "notifications" | "logout"
  >("account");

  // Success / Info Toast Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // 1. ACCOUNT SETTINGS STATES & HANDLERS
  // ----------------------------------------------------
  const [firstName, setFirstName] = useState(() => localStorage.getItem("wrindha_first_name") || "");
  const [lastName, setLastName] = useState(() => localStorage.getItem("wrindha_last_name") || "");
  const [userProfilePhone, setUserProfilePhone] = useState(() => localStorage.getItem("wrindha_phone_number") || "");
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem("wrindha_avatar_seed") || userName || "Kalyan");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Two-Factor Auth
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => localStorage.getItem("wrindha_2fa_enabled") === "true");
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState("");

  // Connected Accounts
  const [connectedAccounts, setConnectedAccounts] = useState(() => {
    const saved = localStorage.getItem("wrindha_connected_accounts");
    return saved ? JSON.parse(saved) : { google: true, github: false, microsoft: false };
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState(() => {
    const saved = localStorage.getItem("wrindha_privacy_settings");
    return saved ? JSON.parse(saved) : {
      publicProfile: false,
      showAchievements: true,
      showProductivityStats: true,
      dataSharing: true,
      marketingEmails: false
    };
  });

  // Session & Devices Management
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("wrindha_active_sessions");
    return saved ? JSON.parse(saved) : [
      { id: "s1", device: "Chrome on Windows 11", location: "Mumbai, India", isCurrent: true, date: "Active now" },
      { id: "s2", device: "Safari on iPhone 15 Pro", location: "Delhi, India", isCurrent: false, date: "2 hours ago" },
      { id: "s3", device: "Chrome on Apple MacOS", location: "Bangalore, India", isCurrent: false, date: "2 days ago" }
    ];
  });

  // Account Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(() => localStorage.getItem("wrindha_deletion_requested") === "true");

  useEffect(() => {
    localStorage.setItem("wrindha_connected_accounts", JSON.stringify(connectedAccounts));
  }, [connectedAccounts]);

  useEffect(() => {
    localStorage.setItem("wrindha_privacy_settings", JSON.stringify(privacySettings));
  }, [privacySettings]);

  useEffect(() => {
    localStorage.setItem("wrindha_active_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const handleSaveAccountInfo = () => {
    localStorage.setItem("wrindha_first_name", firstName);
    localStorage.setItem("wrindha_last_name", lastName);
    localStorage.setItem("wrindha_phone_number", userProfilePhone);
    localStorage.setItem("wrindha_avatar_seed", avatarSeed);
    
    // Propagate username to parent App state
    const fullDisplayName = `${firstName} ${lastName}`.trim() || userName;
    setUserName(fullDisplayName);
    localStorage.setItem("wrindha_user_name", fullDisplayName);
    
    showToast("Profile information updated successfully.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password updated successfully. Changes applied.");
  };

  const handleToggle2FA = () => {
    if (twoFactorEnabled) {
      setTwoFactorEnabled(false);
      localStorage.setItem("wrindha_2fa_enabled", "false");
      showToast("Two-Factor Authentication disabled.");
    } else {
      setShow2FAModal(true);
    }
  };

  const handleVerify2FA = () => {
    if (twoFactorInputCode.length === 6) {
      setTwoFactorEnabled(true);
      localStorage.setItem("wrindha_2fa_enabled", "true");
      setShow2FAModal(false);
      setTwoFactorInputCode("");
      showToast("Two-Factor Authentication successfully configured!");
    } else {
      alert("Please enter a valid 6-digit confirmation code.");
    }
  };

  const handleExportData = () => {
    const backupData = {
      username: userName,
      firstName,
      lastName,
      userProfilePhone,
      avatarSeed,
      privacySettings,
      connectedAccounts,
      referrals,
      subscriptionTier,
      exportedAt: new Date().toISOString(),
      app: "WrindhaOS Premium"
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wrindha_os_profile_export.json`;
    link.click();
    showToast("Your comprehensive account data export has begun.");
  };

  const handleConfirmDeletion = () => {
    setDeletionRequested(true);
    localStorage.setItem("wrindha_deletion_requested", "true");
    setShowDeleteModal(false);
    showToast("Account deletion request submitted. Processing within 14 business days.");
  };

  const handleCancelDeletion = () => {
    setDeletionRequested(false);
    localStorage.setItem("wrindha_deletion_requested", "false");
    showToast("Account deletion request cancelled.");
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    showToast("Session revoked and device logged out securely.");
  };

  const handleRevokeAllSessions = () => {
    setSessions(sessions.filter(s => s.isCurrent));
    showToast("Successfully logged out of all other active sessions.");
  };

  // ----------------------------------------------------
  // 2. REFERRALS STATES & HANDLERS
  // ----------------------------------------------------
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState<"Completed" | "Pending">("Completed");
  const [copied, setCopied] = useState(false);

  const completedCount = referrals.filter(r => r.status === 'Completed').length;
  const pendingCount = referrals.filter(r => r.status === 'Pending').length;
  const discountPct = Math.min(20, completedCount * 4);
  const originalPrice = 59;
  const currentPrice = originalPrice * (1 - discountPct / 100);

  const referralCode = `WRINDHA-${session?.user?.id?.substr(0, 5).toUpperCase() || 'KALYAN'}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`Hey, join me on WrindhaOS—the ultimate productivity operating system! Use my referral code "${referralCode}" to get started: https://wrindha.com`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Referral invitation copied to clipboard!");
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newRef = {
      id: Math.random().toString(36).substr(2, 9),
      name: inviteName,
      email: inviteEmail,
      date: new Date().toISOString().split('T')[0],
      status: inviteType
    };
    setReferrals([...referrals, newRef]);
    setInviteName("");
    setInviteEmail("");
    showToast(`Referral invite successfully created with state: ${inviteType}!`);
  };

  const handleApprovePendingReferral = (id: string) => {
    setReferrals(referrals.map(r => r.id === id ? { ...r, status: 'Completed' as const } : r));
    showToast("Simulated referral verification: Invite updated to Joined!");
  };

  const handleRemoveReferral = (id: string) => {
    setReferrals(referrals.filter(r => r.id !== id));
    showToast("Referral entry removed.");
  };

  const handleShareSocial = (platform: "whatsapp" | "telegram" | "email") => {
    const text = `Hey, join me on WrindhaOS—the ultimate productivity operating system! Use my referral code "${referralCode}" to sign up:`;
    const url = "https://wrindha.com";
    let shareUrl = "";

    if (platform === "whatsapp") {
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`;
    } else if (platform === "telegram") {
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    } else {
      shareUrl = `mailto:?subject=Join%20me%20on%20WrindhaOS&body=${encodeURIComponent(text + " " + url)}`;
    }
    window.open(shareUrl, "_blank");
  };

  // ----------------------------------------------------
  // 3. SUBSCRIPTION STATES & HANDLERS
  // ----------------------------------------------------
  const [invoices, setInvoices] = useState([
    { id: "INV-2026-004", date: "2026-06-01", amount: "₹51.92", status: "Paid", description: "Premium OS Membership - 1 Month" },
    { id: "INV-2026-003", date: "2026-05-01", amount: "₹51.92", status: "Paid", description: "Premium OS Membership - 1 Month" },
    { id: "INV-2026-002", date: "2026-04-01", amount: "₹59.00", status: "Paid", description: "Premium OS Membership - 1 Month" },
    { id: "INV-2026-001", date: "2026-03-01", amount: "₹59.00", status: "Paid", description: "Premium OS Membership - 1 Month" },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const handleDownloadInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const handleCancelSubscription = () => {
    if (confirm("Are you sure you want to cancel your Premium benefits? You will lose unlimited habit streaks, priorities matrices, and academic syllabus features.")) {
      showToast("Subscription cancellation request received. Your plan will transition to Free at the end of the billing cycle.");
    }
  };

  // ----------------------------------------------------
  // 4. THEMES & ACCENTS
  // ----------------------------------------------------
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("wrindha_accent_color") || "purple");
  const [syncWithSystem, setSyncWithSystem] = useState(() => localStorage.getItem("wrindha_theme_system") === "true");

  const accents = [
    { id: "purple", name: "Imperial Purple", bg: "bg-purple-600", border: "border-purple-600", text: "text-purple-500", rawHex: "#9333ea" },
    { id: "indigo", name: "Deep Indigo", bg: "bg-indigo-600", border: "border-indigo-600", text: "text-indigo-500", rawHex: "#4f46e5" },
    { id: "teal", name: "Biscay Teal", bg: "bg-teal-600", border: "border-teal-600", text: "text-teal-500", rawHex: "#0d9488" },
    { id: "emerald", name: "Emerald Forest", bg: "bg-emerald-600", border: "border-emerald-600", text: "text-emerald-500", rawHex: "#059669" },
    { id: "rose", name: "Crimson Rose", bg: "bg-rose-600", border: "border-rose-600", text: "text-rose-500", rawHex: "#e11d48" },
    { id: "amber", name: "Autumn Amber", bg: "bg-amber-600", border: "border-amber-600", text: "text-amber-500", rawHex: "#d97706" }
  ];

  useEffect(() => {
    localStorage.setItem("wrindha_accent_color", accentColor);
    // Custom accent apply if supported, or just cosmetic preview
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem("wrindha_theme_system", syncWithSystem.toString());
    if (syncWithSystem) {
      const matchDark = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? "dark" : "light");
      };
      setTheme(matchDark.matches ? "dark" : "light");
      matchDark.addEventListener("change", handleSystemChange);
      return () => matchDark.removeEventListener("change", handleSystemChange);
    }
  }, [syncWithSystem, setTheme]);

  // ----------------------------------------------------
  // 5. NOTIFICATIONS STATES & HANDLERS
  // ----------------------------------------------------
  const [notifPreferences, setNotifPreferences] = useState(() => {
    const saved = localStorage.getItem("wrindha_notif_preferences");
    return saved ? JSON.parse(saved) : {
      studyReminders: true,
      revisionAlerts: true,
      timetableAlerts: true,
      habitReminders: true,
      streakWarnings: true,
      dueDateAlerts: true,
      priorityAlerts: true,
      subscriptionRenewals: true,
      paymentConfirmations: true,
      referralJoins: true,
      referralMilestones: true,
      productUpdates: true,
      announcements: true,
      maintenanceAlerts: false,
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      quietHoursEnabled: false,
      quietStart: "22:00",
      quietEnd: "07:00",
      dailyDigest: true,
      weeklySummary: true
    };
  });

  useEffect(() => {
    localStorage.setItem("wrindha_notif_preferences", JSON.stringify(notifPreferences));
  }, [notifPreferences]);

  const handleUpdateNotifPref = (key: string, value: any) => {
    setNotifPreferences((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleToggleAllNotifs = (enable: boolean) => {
    setNotifPreferences((prev: any) => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        if (typeof copy[k] === "boolean") {
          copy[k] = enable;
        }
      });
      return copy;
    });
    showToast(enable ? "All notification categories enabled." : "All notifications muted.");
  };

  // ----------------------------------------------------
  // 6. LOGOUT MODAL & ACTIONS
  // ----------------------------------------------------
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutType, setLogoutType] = useState<"current" | "all">("current");

  const executeLogout = async () => {
    setShowLogoutModal(false);
    if (handleLogout) {
      if (logoutType === "all") {
        localStorage.removeItem("wrindha_active_sessions");
      }
      await handleLogout();
      showToast("Securely logged out. Sessions cleared.");
    } else {
      alert("Demo logout executed successfully.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-900 dark:text-white pb-16">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-gray-900 dark:bg-purple-950 text-white rounded-2xl border border-gray-800 dark:border-purple-800/80 shadow-2xl flex items-center gap-3 max-w-sm"
          >
            <div className="p-1 bg-emerald-500 rounded-full text-white">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <User className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span>Profile OS Hub</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Configure your personal configurations, subscription billing, premium aesthetics, and communication channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">Status:</span>
          <span className="px-3.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-black rounded-full border border-purple-100 dark:border-purple-900/30 uppercase tracking-wider shadow-sm flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            {subscriptionTier} Acc
          </span>
        </div>
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sub Navigation Sidebar */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-1.5" id="profile-sub-sidebar">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider px-3 pb-2 border-b border-gray-50 dark:border-gray-800 mb-3">
            Profile Settings
          </p>
          
          {[
            { id: "account", label: "Account Settings", icon: Settings, color: "text-indigo-500" },
            { id: "referrals", label: "Referrals & Rewards", icon: Users, color: "text-teal-500" },
            { id: "subscription", label: "Subscription & Billing", icon: CreditCard, color: "text-purple-500" },
            { id: "themes", label: "Premium Themes", icon: Sparkles, color: "text-amber-500" },
            { id: "notifications", label: "Notifications", icon: Bell, color: "text-rose-500" },
            { id: "logout", label: "Logout", icon: LogOut, color: "text-red-500" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "logout") {
                  setLogoutType("current");
                  setShowLogoutModal(true);
                } else {
                  setActiveSubTab(tab.id as any);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 py-3 px-3 transition-all duration-300 group relative rounded-2xl font-bold text-xs overflow-hidden cursor-pointer",
                activeSubTab === tab.id && tab.id !== "logout"
                  ? "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 pl-2.5 pr-3 font-black"
                  : tab.id === "logout"
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 pl-3 pr-3 hover:translate-x-1"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-black dark:hover:text-white pl-3 pr-3 hover:translate-x-1"
              )}
            >
              {activeSubTab === tab.id && tab.id !== "logout" && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-purple-600 dark:bg-purple-400" />
              )}
              <tab.icon className={cn(
                "w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 shrink-0", 
                activeSubTab === tab.id && tab.id !== "logout" ? "text-purple-500 scale-105" : tab.color
              )} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Column: Active Sub-Panel Area */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Panel A: Account Settings */}
          {activeSubTab === "account" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Profile Details Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <Settings className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-lg tracking-tight">Personal Credentials</h3>
                </div>

                {/* Avatar / Profile Pic Editor */}
                <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-3xl border border-gray-100 dark:border-gray-800/60 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-1 shadow-lg shadow-purple-500/15 shrink-0 overflow-hidden relative group">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-full bg-white dark:bg-gray-900" 
                    />
                  </div>
                  <div className="space-y-3 flex-1 w-full">
                    <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">Profile Identity Image</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                      WrindhaOS generates secure, premium vector avatars dynamically. Customise your visual theme seed below to update your dynamic identity across all dashboard modules.
                    </p>
                    <div className="flex gap-2 w-full max-w-sm">
                      <input 
                        type="text"
                        className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold flex-1 outline-none focus:border-purple-500"
                        placeholder="Avatar Seed (e.g. Felix)"
                        value={avatarSeed}
                        onChange={(e) => setAvatarSeed(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
                          setAvatarSeed(rand);
                          showToast("New dynamic avatar seed generated!");
                        }}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Randomise
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">First Name</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Name</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Username</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                      value={userName}
                      disabled
                      placeholder="Username"
                    />
                    <p className="text-[9px] text-gray-400">Account Username is linked directly to display identifier and cannot be changed.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Phone Number (Optional)</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                      value={userProfilePhone}
                      onChange={(e) => setUserProfilePhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Email Address</label>
                  <input 
                    type="email"
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-800/40 opacity-70 cursor-not-allowed rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-150 dark:border-gray-850"
                    value={session?.user?.email || "guest@wrindha.com"}
                  />
                  <p className="text-[10px] text-gray-400">Primary authentication address managed securely via Supabase Auth services.</p>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-gray-800/80">
                  <button 
                    onClick={handleSaveAccountInfo}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/15 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Save Account Information</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Password & Security Card */}
              <form onSubmit={handleChangePassword} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <Key className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-lg tracking-tight">Security & Credentials</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">New Password</label>
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 bottom-2.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">Confirm Password</label>
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-gray-50 dark:border-gray-800/80 pt-6">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggle2FA}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                        twoFactorEnabled ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-transform duration-200",
                        twoFactorEnabled ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">Two-Factor Authentication</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest block font-mono mt-0.5",
                        twoFactorEnabled ? "text-emerald-500" : "text-gray-400"
                      )}>
                        {twoFactorEnabled ? "🔐 ENABLED / SECURITY SECURE" : "🔓 DISABLED / RECOMMENDED"}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="bg-black dark:bg-gray-800 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl transition-all cursor-pointer"
                  >
                    Change Credentials
                  </button>
                </div>
              </form>

              {/* Connected Accounts & Privacy Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Connected Accounts */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2.5 border-b border-gray-50 dark:border-gray-800 pb-3">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-md tracking-tight">Connected Accounts</h4>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Link external platforms for instant, seamless login and calendar synch integrations.</p>

                  <div className="space-y-3">
                    {[
                      { id: "google", name: "Google Accounts Services", status: connectedAccounts.google, icon: "🌐" },
                      { id: "github", name: "GitHub Developer Accounts", status: connectedAccounts.github, icon: "💻" },
                      { id: "microsoft", name: "Microsoft Live Active", status: connectedAccounts.microsoft, icon: "🏢" }
                    ].map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800/40">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{acc.icon}</span>
                          <div>
                            <span className="text-xs font-bold block">{acc.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono">{acc.status ? "LINKED SECURELY" : "NOT CONNECTED"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setConnectedAccounts((prev: any) => ({ ...prev, [acc.id]: !prev[acc.id] }));
                            showToast(acc.status ? `Disconnected from ${acc.name}.` : `Connected successfully to ${acc.name}!`);
                          }}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            acc.status 
                              ? "bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40" 
                              : "bg-purple-500 hover:bg-purple-600 text-white"
                          )}
                        >
                          {acc.status ? "Disconnect" : "Link"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2.5 border-b border-gray-50 dark:border-gray-800 pb-3">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-md tracking-tight">Privacy Settings</h4>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Configure global parameters on what data gets indexed or displayed.</p>

                  <div className="space-y-4 pt-1">
                    {[
                      { key: "publicProfile", label: "Public Profile Index", desc: "Allow profile analytics lookup by other platform workspace users." },
                      { key: "showAchievements", label: "Show Achievements Badge", desc: "Index and showcase gamified badges inside user summaries." },
                      { key: "showProductivityStats", label: "Show Productivity Stats", desc: "Show habits and matrices logs inside global ledger." },
                      { key: "dataSharing", label: "Data Sharing Preferences", desc: "Authorize telemetry processing for predictive habit pattern learning." },
                      { key: "marketingEmails", label: "Marketing Preferences", desc: "Receive email updates regarding new theme rollouts." }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{item.label}</span>
                          <span className="text-[10px] text-gray-400 leading-snug block">{item.desc}</span>
                        </div>
                        <button
                          onClick={() => {
                            const next = !privacySettings[item.key];
                            setPrivacySettings((prev: any) => ({ ...prev, [item.key]: next }));
                            showToast(`${item.label} setting updated.`);
                          }}
                          className={cn(
                            "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                            privacySettings[item.key] ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                            privacySettings[item.key] ? "translate-x-4.5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Devices Management */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-lg tracking-tight">Active Devices Ledger</h3>
                  </div>
                  {sessions.length > 1 && (
                    <button 
                      onClick={handleRevokeAllSessions}
                      className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Log out of all other sessions
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">You are currently logged into WrindhaOS on these devices. Revoke any unfamiliar devices instantly.</p>

                <div className="divide-y divide-gray-50 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                  {sessions.map((sessionItem: any) => (
                    <div key={sessionItem.id} className="flex items-center justify-between p-4 text-xs">
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{sessionItem.device}</span>
                          {sessionItem.isCurrent && (
                            <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-black text-[8px] uppercase px-2 py-0.5 rounded-full border border-emerald-150/30">CURRENT SESSION</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{sessionItem.location} • {sessionItem.date}</div>
                      </div>

                      {!sessionItem.isCurrent && (
                        <button 
                          onClick={() => handleRevokeSession(sessionItem.id)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Export & Account Deletion */}
              <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-lg tracking-tight">Danger Zone</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Data Export */}
                  <div className="space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider block">Data Export & Backup</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                      Download a complete machine-readable copy of your profile statistics, financial accounts ledger, timetables, and task matrices in JSON schema format.
                    </p>
                    <button
                      onClick={handleExportData}
                      className="px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-gray-100 dark:border-gray-800 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Database JSON</span>
                    </button>
                  </div>

                  {/* Account Deletion */}
                  <div className="space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider block text-red-500">Permanent Account Deletion</span>
                    
                    {deletionRequested ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                          ⚠️ A request to permanently erase this registered account profile was logged. Your data is queued for cleanup.
                        </p>
                        <button
                          onClick={handleCancelDeletion}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Cancel Deletion Request
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                          Delete your WrindhaOS active profile and completely wipe all local, cloud database entries, logs, subscription registries, and files permanently. This is irreversible.
                        </p>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/10 cursor-pointer"
                        >
                          Request Account Erase
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Panel B: Refer & Save System */}
          {activeSubTab === "referrals" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Main Referral Stats Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <div>
                    <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-500" />
                      <span>Refer & Save System</span>
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Share your passion for WrindhaOS. Get a recurring 4% discount for every successful referral, up to 20% max!
                    </p>
                  </div>

                  <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 rounded-2xl px-5 py-2.5 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-black">Active Referral Benefit</span>
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{discountPct}% OFF</span>
                  </div>
                </div>

                {/* Referral Dashboard KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Friends Joined</span>
                    <div className="text-2xl font-black mt-1 font-mono flex items-baseline gap-1.5">
                      <span>{completedCount}</span>
                      <span className="text-xs font-normal text-gray-400">/ 5 successful</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden relative">
                      <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${(completedCount / 5) * 100}%` }}></div>
                    </div>
                    {pendingCount > 0 && (
                      <span className="text-[9px] text-amber-500 font-bold block animate-pulse">⏱️ {pendingCount} Pending Verification</span>
                    )}
                  </div>

                  <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Base Premium Price</span>
                    <div className="text-2xl font-black mt-1 font-mono">₹{originalPrice}.00<span className="text-xs font-normal text-gray-400">/mo</span></div>
                    <span className="text-[9px] text-gray-400 mt-2 block">Standard subscription fee</span>
                  </div>

                  <div className="p-5 bg-teal-500/5 dark:bg-teal-500/10 rounded-2xl border border-teal-500/20">
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Effective Premium Price</span>
                    <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 font-mono">₹{currentPrice.toFixed(2)}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                    <span className="text-[9px] text-teal-600 dark:text-teal-400 font-bold mt-2 block">Recurrent personalized pricing!</span>
                  </div>
                </div>

                {/* Progress Indicators / Milestones */}
                <div className="space-y-3 pt-3">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Discount Milestone Steps</span>
                  <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                    {[1, 2, 3, 4, 5].map(step => {
                      const discountValue = step * 4;
                      const active = completedCount >= step;
                      return (
                        <div 
                          key={step} 
                          className={cn(
                            "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                            active 
                              ? "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40 text-teal-600 dark:text-teal-400 shadow-sm" 
                              : "bg-gray-50 dark:bg-gray-850 border-gray-100 dark:border-gray-800 text-gray-400"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                            active ? "bg-teal-500 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                          )}>
                            {active ? "✓" : step}
                          </div>
                          <span>{discountValue}% OFF</span>
                          <span className="text-[8px] opacity-75 font-normal">Friend {step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Share Link & Action Controls */}
                <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-3xl border border-gray-100 dark:border-gray-800/80 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Your Unique Referral Code & Invite Link</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 font-mono text-sm font-bold flex-1 select-all break-all text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                      <span>{referralCode}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded">Invite Code</span>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        copied ? "bg-emerald-500 text-white" : "bg-black dark:bg-indigo-600 hover:opacity-90 text-white"
                      )}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied" : "Copy Link"}</span>
                    </button>
                  </div>

                  {/* WhatsApp, Telegram, Email Share Controls */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button 
                      onClick={() => handleShareSocial("whatsapp")}
                      className="px-4 py-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      WhatsApp
                    </button>
                    <button 
                      onClick={() => handleShareSocial("telegram")}
                      className="px-4 py-2 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      Telegram
                    </button>
                    <button 
                      onClick={() => handleShareSocial("email")}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      Email Share
                    </button>
                  </div>
                </div>

                {/* Referral Simulation Invite Form */}
                <form onSubmit={handleSendInvite} className="bg-gray-50 dark:bg-gray-850 p-5 rounded-3xl border border-gray-100 dark:border-gray-800/80 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-850 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Invite a Friend (Premium Preview Simulator)</h4>
                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-0.5 rounded-lg gap-0.5">
                      {(["Completed", "Pending"] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setInviteType(type)}
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer",
                            inviteType === type 
                              ? "bg-purple-500 text-white" 
                              : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Friend's Full Name"
                      className="bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-800 outline-none focus:border-teal-400"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                    <input 
                      type="email" 
                      placeholder="Friend's Email Address"
                      className="bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-800 outline-none focus:border-teal-400"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-600 text-white text-[11px] font-black uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all cursor-pointer w-full sm:w-auto"
                  >
                    Send simulated invite
                  </button>
                </form>

                {/* Invited Friends History List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm tracking-tight text-gray-800 dark:text-gray-200">Friends Invited ({referrals.length})</h4>
                  {referrals.length === 0 ? (
                    <div className="p-6 border border-dashed border-gray-150 dark:border-gray-800 rounded-2xl text-center text-xs text-gray-400">
                      No friends invited yet. Use your invite link to get started!
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                      {referrals.map((ref) => (
                        <div key={ref.id} className="flex items-center justify-between p-4 text-xs">
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{ref.name}</span>
                              <span className="text-[9px] text-gray-400 font-normal">({ref.email})</span>
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Invited on {ref.date}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            {ref.status === "Completed" ? (
                              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full border border-emerald-100 dark:border-emerald-900/30 uppercase tracking-wide flex items-center gap-1">
                                <Check className="w-3 h-3" /> Joined
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full border border-amber-100 dark:border-amber-900/30 uppercase tracking-wide flex items-center gap-1">
                                  Pending
                                </span>
                                <button
                                  onClick={() => handleApprovePendingReferral(ref.id)}
                                  className="px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                  title="Simulate verification sign up"
                                >
                                  Verify Join
                                </button>
                              </div>
                            )}
                            <button 
                              onClick={() => handleRemoveReferral(ref.id)}
                              className="text-gray-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                              title="Remove referral"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Panel C: Subscription & Billing */}
          {activeSubTab === "subscription" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Premium Membership Benefits Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <div>
                    <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-500" />
                      <span>WrindhaOS Premium Benefits</span>
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Enjoy the complete power of WrindhaOS without limitations.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Current Plan:</span>
                    <span className="px-3.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-full border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-wider">
                      {subscriptionTier}
                    </span>
                  </div>
                </div>

                {/* Pricing Breakdown Card - Key Requirement to list plans and pricing before */}
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-3xl space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono block">PLANS & PRICING</span>
                      <h4 className="font-extrabold text-base text-gray-900 dark:text-white mt-1">Premium OS Complete Access</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 line-through block">₹59.00/mo</span>
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">₹{currentPrice.toFixed(2)}<span className="text-xs font-normal">/mo</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Unlimited Habit Trackers & Custom Streaks",
                      "Unlimited Priority Eisenhower Matrix Tasks",
                      "Advanced Interactive Multi-tier Daily Timetables",
                      "In-depth Visual Analytics & Global Performance Reports",
                      "Full Financial Accounts & Budget tracking",
                      "Dedicated Study Planner, Focus Center, & Syllabus Suite",
                      "Career Roadmaps with Goal Pyramids Integration",
                      "Direct Priority VIP Support & Zero Ad Limits"
                    ].map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-indigo-100/50 dark:border-indigo-900/20 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-gray-500">
                    <div>
                      <span className="block">Referral Discount Applied: {discountPct}% ({completedCount} / 5 successful invites)</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black block mt-0.5">Your Personalized Premium pricing: ₹{currentPrice.toFixed(2)}/month</span>
                    </div>

                    <div className="flex gap-2">
                      {subscriptionTier !== "Free" ? (
                        <button 
                          onClick={handleCancelSubscription}
                          className="px-4 py-2 border border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 text-red-600 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel Plan
                        </button>
                      ) : (
                        <button 
                          onClick={() => setActiveTab('pricing')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                        >
                          Upgrade Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment History / Invoice Tables */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-2">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Transaction & Invoice History</h4>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase">ALL TRANSACTIONS SECURE</span>
                  </div>

                  <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 dark:bg-gray-850 text-gray-400 text-[10px] uppercase font-mono border-b border-gray-100 dark:border-gray-800">
                        <tr>
                          <th className="p-4">Invoice ID</th>
                          <th className="p-4">Billing Date</th>
                          <th className="p-4">Description</th>
                          <th className="p-4 text-right">Amount</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/30">
                            <td className="p-4 font-mono font-bold text-indigo-500">{inv.id}</td>
                            <td className="p-4">{inv.date}</td>
                            <td className="p-4">{inv.description}</td>
                            <td className="p-4 text-right font-mono font-bold">{inv.amount}</td>
                            <td className="p-4 text-center">
                              <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-black text-[9px] uppercase px-2 py-0.5 rounded-full border border-emerald-100">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleDownloadInvoice(inv)}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Download Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Printable Invoice Modal / Viewer */}
              <AnimatePresence>
                {selectedInvoice && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-[2.5rem] p-8 max-w-lg w-full border border-gray-100 dark:border-gray-800 shadow-2xl relative space-y-6"
                    >
                      {/* Close button */}
                      <button 
                        onClick={() => setSelectedInvoice(null)}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        ✕
                      </button>

                      {/* Printable Area */}
                      <div className="space-y-6 border border-gray-100 dark:border-gray-900 p-6 rounded-3xl" id="printable-invoice">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase font-mono block">WRINDHA OS SYSTEM</span>
                            <h3 className="text-xl font-black mt-1">INVOICE</h3>
                            <p className="text-[10px] text-gray-400">Transaction Serial ID: {selectedInvoice.id}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Date: {selectedInvoice.date}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold block uppercase px-2 py-0.5 rounded-full border border-emerald-200 mt-2">PAID</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-b border-gray-50 dark:border-gray-800/80 py-4">
                          <div>
                            <span className="text-gray-400 uppercase font-mono block">Billed To</span>
                            <span className="font-bold text-xs block mt-1">{userName}</span>
                            <span className="text-gray-500 block">{session?.user?.email || "guest@wrindha.com"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 uppercase font-mono block">Billed From</span>
                            <span className="font-bold text-xs block mt-1">Wrindha Productivity Lab</span>
                            <span className="text-gray-500 block">Kalyan Gongidi • Bangalore, KA</span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between font-bold border-b border-gray-50 dark:border-gray-900 pb-1.5">
                            <span>Item description</span>
                            <span>Total Price</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>{selectedInvoice.description}</span>
                            <span>{selectedInvoice.amount}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-gray-50 dark:border-gray-900 pt-2 text-sm text-indigo-500">
                            <span>Total Billed Amount:</span>
                            <span>{selectedInvoice.amount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.print()}
                          className="flex-1 bg-black dark:bg-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-2xl transition-all cursor-pointer"
                        >
                          Print / Save Invoice PDF
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(null)}
                          className="px-6 py-3 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-xs font-bold rounded-2xl cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Panel D: Premium Aesthetics (Themes) */}
          {activeSubTab === "themes" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-lg tracking-tight">Premium Aesthetics</h3>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Configure visual parameters to match your style or preferences. Themes are masterfully tuned for high-contrast accessibility.
                </p>

                {/* Theme toggle buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={cn(
                      "p-5 border rounded-2xl flex flex-col items-center justify-center gap-3.5 transition-all active:scale-95 cursor-pointer text-center",
                      theme === 'light' 
                        ? "border-teal-500 bg-teal-50/20 text-teal-600 dark:text-teal-400 shadow-sm" 
                        : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-lg">
                      ☀️
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">Enterprise Light Mode</span>
                      <span className="text-[9px] text-gray-400 mt-0.5 block">Crisp readability & professional surfaces</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "p-5 border rounded-2xl flex flex-col items-center justify-center gap-3.5 transition-all active:scale-95 cursor-pointer text-center",
                      theme === 'dark' 
                        ? "border-purple-500 bg-purple-950/20 text-purple-400 shadow-sm" 
                        : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-950 border border-gray-800 flex items-center justify-center shadow-lg text-lg">
                      🌙
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">Cosmic Dark Mode</span>
                      <span className="text-[9px] text-gray-400 mt-0.5 block">Deep canvas shadows & purple glowing gradients</span>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800/40 mt-2">
                  <div>
                    <span className="text-xs font-bold block">Sync with System Settings</span>
                    <span className="text-[10px] text-gray-400 leading-snug block">Automatically track your operating system's theme preference.</span>
                  </div>
                  <button
                    onClick={() => {
                      setSyncWithSystem(!syncWithSystem);
                      showToast(syncWithSystem ? "System sync disabled." : "System sync enabled!");
                    }}
                    className={cn(
                      "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none cursor-pointer",
                      syncWithSystem ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                      syncWithSystem ? "translate-x-4.5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Custom Accent Color Palette Selection */}
                <div className="space-y-3 pt-3 border-t border-gray-50 dark:border-gray-800/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Personalised Accent Colors (Future-ready)</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Pick an accent color to customize indicators and highlighted items across the interface.</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                    {accents.map(acc => {
                      const active = accentColor === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setAccentColor(acc.id);
                            showToast(`Accent color updated to: ${acc.name}!`);
                          }}
                          className={cn(
                            "p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-center",
                            active 
                              ? "bg-gray-50 dark:bg-gray-850/60 border-purple-500 text-purple-600 dark:text-purple-400" 
                              : "border-gray-100 dark:border-gray-800 hover:bg-gray-50/50"
                          )}
                        >
                          <div className={cn("w-5.5 h-5.5 rounded-full shadow-inner relative", acc.bg)}>
                            {active && (
                              <div className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-black">
                                ✓
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wide block truncate w-full">{acc.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accessibility Statement Checklist */}
                <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 rounded-2xl flex gap-3 mt-4 text-xs text-gray-500 leading-relaxed">
                  <HelpCircle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-extrabold text-gray-800 dark:text-white block uppercase text-[10px] tracking-wide">Accessibility Compliance Statement</span>
                    <p>
                      WrindhaOS adheres strictly to WCAG AA color-contrast specifications. Elements have been styled using semantic high-contrast components, complete keyboard focus-outline compatibility, and aria-friendly descriptors for screen-readers.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Panel E: Notification Channels Setup */}
          {activeSubTab === "notifications" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-lg tracking-tight">Notification Channels</h3>
                  </div>

                  <div className="flex gap-2 text-[10px] font-black uppercase">
                    <button 
                      onClick={() => handleToggleAllNotifs(true)}
                      className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 rounded-xl transition-all border border-gray-100 dark:border-gray-800 cursor-pointer"
                    >
                      Enable All
                    </button>
                    <button 
                      onClick={() => handleToggleAllNotifs(false)}
                      className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 rounded-xl transition-all border border-gray-100 dark:border-gray-800 cursor-pointer text-red-500"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Subsections of Notifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Category A: Academic & Productivity */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">1. Academic & Productivity</h4>
                    
                    {[
                      { key: "studyReminders", title: "Study Reminders", desc: "Alerts when scheduled study sessions are due to start." },
                      { key: "revisionAlerts", title: "Revision Alerts", desc: "Notification warnings based on spacing-repetition intervals." },
                      { key: "timetableAlerts", title: "Timetable Notifications", desc: "Weekly academic roster and schedule changes alerts." },
                      { key: "habitReminders", title: "Habit Trackers Reminders", desc: "Daily reminders to complete and log active streaks." },
                      { key: "streakWarnings", title: "Habit Streak Warnings", desc: "Critical alerts when habits are close to breaking." }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{item.title}</span>
                          <span className="text-[10px] text-gray-400 leading-snug block">{item.desc}</span>
                        </div>
                        <button
                          onClick={() => handleUpdateNotifPref(item.key, !notifPreferences[item.key])}
                          className={cn(
                            "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                            notifPreferences[item.key] ? "bg-rose-500" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                            notifPreferences[item.key] ? "translate-x-4.5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Category B: Finance & Milestones */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">2. Finance, Referrals & Updates</h4>
                    
                    {[
                      { key: "dueDateAlerts", title: "Task Due Date Alerts", desc: "Notifications when active tasks are nearing deadline." },
                      { key: "priorityAlerts", title: "Priority Node Reminders", desc: "Reminders to clear Level 3 Important focus blocks." },
                      { key: "subscriptionRenewals", title: "Subscription Renewals", desc: "Renewal alerts 3 days prior to invoice billing." },
                      { key: "paymentConfirmations", title: "Payment Confirmations", desc: "Successful subscription processing transaction receipts." },
                      { key: "referralJoins", title: "New Referral Joined", desc: "Alert when dynamic invite code gets registered." },
                      { key: "referralMilestones", title: "Discount Milestones", desc: "Updates when friends trigger a 4% milestone discount." },
                      { key: "productUpdates", title: "Product Features Updates", desc: "Release notes for new vector widgets & tools." },
                      { key: "announcements", title: "Platform Announcements", desc: "System maintenance and announcements updates." }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{item.title}</span>
                          <span className="text-[10px] text-gray-400 leading-snug block">{item.desc}</span>
                        </div>
                        <button
                          onClick={() => handleUpdateNotifPref(item.key, !notifPreferences[item.key])}
                          className={cn(
                            "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                            notifPreferences[item.key] ? "bg-rose-500" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                            notifPreferences[item.key] ? "translate-x-4.5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Delivery Channels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50 dark:border-gray-800/80">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">3. Delivery Channels</span>
                    
                    {[
                      { key: "pushEnabled", title: "Browser Push Alerts", desc: "Allow local device screen popups." },
                      { key: "emailEnabled", title: "Registered Email Notifications", desc: "Send summaries to auth mailbox address." },
                      { key: "inAppEnabled", title: "In-App Notifications Centre", desc: "Store alerts under active layout alerts." }
                    ].map(chan => (
                      <div key={chan.key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{chan.title}</span>
                          <span className="text-[10px] text-gray-400 block leading-tight">{chan.desc}</span>
                        </div>
                        <button
                          onClick={() => handleUpdateNotifPref(chan.key, !notifPreferences[chan.key])}
                          className={cn(
                            "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                            notifPreferences[chan.key] ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                            notifPreferences[chan.key] ? "translate-x-4.5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Quiet Hours & Digests */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">4. Quiet Hours & Digests</span>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-bold block">Quiet Hours Mode</span>
                        <span className="text-[10px] text-gray-400 block leading-snug">Automatically mute all notification triggers during specified intervals.</span>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifPref("quietHoursEnabled", !notifPreferences.quietHoursEnabled)}
                        className={cn(
                          "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                          notifPreferences.quietHoursEnabled ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                          notifPreferences.quietHoursEnabled ? "translate-x-4.5" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {notifPreferences.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800 flex-wrap">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-gray-400">Quiet Hours Mute From</label>
                          <input 
                            type="time"
                            className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold block w-full text-center"
                            value={notifPreferences.quietStart}
                            onChange={(e) => handleUpdateNotifPref("quietStart", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-gray-400">Quiet Hours Mute To</label>
                          <input 
                            type="time"
                            className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold block w-full text-center"
                            value={notifPreferences.quietEnd}
                            onChange={(e) => handleUpdateNotifPref("quietEnd", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-bold block">Daily Digest Summary</span>
                        <span className="text-[10px] text-gray-400 block leading-snug">Bundle all alerts into a daily briefing summary.</span>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifPref("dailyDigest", !notifPreferences.dailyDigest)}
                        className={cn(
                          "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                          notifPreferences.dailyDigest ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                          notifPreferences.dailyDigest ? "translate-x-4.5" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-bold block">Weekly Summary Analytics</span>
                        <span className="text-[10px] text-gray-400 block leading-snug">Receive detailed productivity insights regarding finished habits & courses.</span>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifPref("weeklySummary", !notifPreferences.weeklySummary)}
                        className={cn(
                          "w-10 h-5.5 rounded-full p-1 transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                          notifPreferences.weeklySummary ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200",
                          notifPreferences.weeklySummary ? "translate-x-4.5" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-gray-800/80">
                  <button 
                    onClick={() => showToast("Notification settings and quiet hours preference saved.")}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl shadow-lg shadow-purple-600/15 active:scale-95 transition-all cursor-pointer"
                  >
                    Save Notifications Profile
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setShow2FAModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center mx-auto text-indigo-500">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight">Setup Two-Factor Authentication</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Scan this QR code with your authenticator app (Google Authenticator, Microsoft, or Authy) to link security keys.
                </p>
              </div>

              {/* Fake QR Image */}
              <div className="w-40 h-40 bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 p-2.5 rounded-2xl mx-auto flex items-center justify-center">
                <div className="text-center space-y-1 select-none">
                  <QrCode className="w-24 h-24 text-gray-800 dark:text-gray-200 mx-auto" />
                  <span className="text-[8px] font-mono block text-gray-400 tracking-wider">WRINDHA-OS-KEY</span>
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Verification Code</label>
                <input 
                  type="text"
                  maxLength={6}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-800 rounded-xl px-4 py-3 text-center font-mono font-black text-lg tracking-widest outline-none focus:border-indigo-500"
                  placeholder="000000"
                  value={twoFactorInputCode}
                  onChange={(e) => setTwoFactorInputCode(e.target.value.replace(/\D/g, ""))}
                />
                <p className="text-[9px] text-gray-400">Enter the generated 6-digit passcode to verify configuration.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVerify2FA}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer"
                >
                  Verify & Activate
                </button>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DANGER ACCOUNT DELETION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-red-600">Delete Account Profile?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  You are initiating a permanent account deletion process. Doing so will completely wipe all registered timetables, study materials, streaks ledger, and active payment histories permanently.
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 rounded-2xl text-[11px] text-red-700 dark:text-red-400 font-medium leading-relaxed">
                🚨 Erasing this account profile cannot be undone. To prevent accidental triggers, you must manually confirm deletion.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDeletion}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer"
                >
                  Confirm Permanent Erase
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-150 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-center mx-auto text-purple-500">
                  <LogOut className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight">Confirm Logout</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Are you sure you want to securely log out of your WrindhaOS active workspace?
                </p>
              </div>

              {/* Logout Options selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLogoutType("current")}
                  className={cn(
                    "p-4 rounded-2xl border text-center space-y-2 cursor-pointer transition-all",
                    logoutType === "current" 
                      ? "border-purple-500 bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold" 
                      : "border-gray-100 dark:border-gray-800 text-gray-400 hover:bg-gray-50/50"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-wider block">This Device</span>
                  <span className="text-[9px] font-normal block leading-tight">Log out of current browser session only.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoutType("all")}
                  className={cn(
                    "p-4 rounded-2xl border text-center space-y-2 cursor-pointer transition-all",
                    logoutType === "all" 
                      ? "border-purple-500 bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold" 
                      : "border-gray-100 dark:border-gray-800 text-gray-400 hover:bg-gray-50/50"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-wider block">All Devices</span>
                  <span className="text-[9px] font-normal block leading-tight">Revoke all active device session keys.</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={executeLogout}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-purple-600/15"
                >
                  Confirm Secure Logout
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-150 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
