import React, { useState, useMemo, useEffect } from 'react';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  useGetUserContributionsQuery,
  useGetUserActivityQuery,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetUserProfileQuery,
} from '@/store/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Activity,
  Calendar,
  ArrowLeft,
  Edit3,
  Zap,
  GitCommit,
  Bell,
  Volume2,
  Briefcase,
  Building2,
  Phone,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Share2,
  ListTodo,
  Users2,
  Sparkles,
  Laptop,
  MessageSquare,
  UserPlus,
  CheckSquare,
  ArrowRightLeft,
  X
} from 'lucide-react';

interface UserProfilePageProps {
  token: string;
  userId?: string;
  onBack?: () => void;
}

interface ActivityData {
  date: string;
  count: number;
}

// Generate heatmap contribution data for the last 52 weeks
function generateActivityData(apiData?: { date: string; count: number }[]): ActivityData[] {
  const weeks = 52;
  const data: ActivityData[] = [];
  const today = new Date();

  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());

  const start = new Date(currentSunday);
  start.setDate(currentSunday.getDate() - (weeks - 1) * 7);

  const apiMap = new Map<string, number>();
  if (apiData) {
    apiData.forEach((d) => apiMap.set(d.date, d.count));
  }

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (date > today) break;
    const key = date.toISOString().slice(0, 10);
    data.push({
      date: key,
      count: apiMap.get(key) ?? 0,
    });
  }
  return data;
}

function ActivityCell({ count, date, selected, onClick }: { count: number; date: string; selected?: boolean; onClick?: () => void }) {
  const intensity =
    count === 0
      ? 'bg-muted dark:bg-zinc-800 border-border/40 dark:border-zinc-700/30'
      : count <= 2
        ? 'bg-primary/15 dark:bg-indigo-950/40 text-indigo-500 border-primary/25 dark:border-indigo-900/50'
        : count <= 4
          ? 'bg-indigo-300 dark:bg-indigo-800/80 text-indigo-200 border-indigo-400 dark:border-indigo-700'
          : count <= 6
            ? 'bg-primary dark:bg-primary text-indigo-100 border-indigo-600'
            : 'bg-indigo-700 dark:bg-indigo-400 text-indigo-50 border-indigo-800';

  return (
    <div
      title={`${date}: ${count} contribution${count !== 1 ? 's' : ''}`}
      onClick={onClick}
      className={`w-3.5 h-3.5 rounded-[3px] border transition-all hover:scale-125 hover:z-10 cursor-pointer ${intensity} ${selected ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 scale-110 z-10' : ''
        }`}
    />
  );
}

export default function UserProfilePage({ token, userId, onBack }: UserProfilePageProps) {
  const { user, login } = useAuth();

  const isOwnProfile = !userId || userId === user?.id;

  const { data: profileResponse, isLoading: loadingProfile } = useGetUserProfileQuery(userId || '', {
    skip: isOwnProfile || !userId,
  });

  const targetUserId = isOwnProfile ? (user?.id || '') : (userId || '');

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security' | 'notifications'>('overview');

  // Custom profile fields synced from Auth Context user state
  const [designation, setDesignation] = useState(user?.designation || '');
  const [company, setCompany] = useState(user?.company || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [location, setLocation] = useState(user?.location || '');
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [status, setStatus] = useState(user?.status || 'Active');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Status Dropdown open state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Keep state synced with context updates
  useEffect(() => {
    if (user && isOwnProfile) {
      setName(user.name || '');
      setEmail(user.email || '');
      setDesignation(user.designation || '');
      setCompany(user.company || '');
      setPhone(user.phone || '');
      setDepartment(user.department || '');
      setLocation(user.location || '');
      setTimezone(user.timezone || '');
      setStatus(user.status || 'Active');
    }
  }, [user, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile && (activeTab === 'security' || activeTab === 'notifications')) {
      setActiveTab('overview');
    }
  }, [isOwnProfile, activeTab]);

  // General details forms
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA State synced with backend database
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);

  useEffect(() => {
    if (user && isOwnProfile) {
      setTwoFactorEnabled(user.twoFactorEnabled || false);
    }
  }, [user, isOwnProfile]);

  // Fetch contributions & activities
  const { data: contributionsResponse } = useGetUserContributionsQuery(targetUserId, { skip: !targetUserId });

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch activities for selected date
  const { data: dateActivityResponse } = useGetUserActivityQuery(
    { userId: targetUserId, date: selectedDate || '' },
    { skip: !targetUserId || !selectedDate }
  );

  // Timeline pagination state
  const [timelinePage, setTimelinePage] = useState(1);

  // Fetch global user activity for timeline
  const { data: globalActivityResponse, isLoading: loadingGlobalActivity } = useGetUserActivityQuery(
    { userId: targetUserId, page: timelinePage, limit: 10 },
    { skip: !targetUserId }
  );

  // Notification Preferences
  const { data: prefData } = useGetPreferencesQuery(undefined, { skip: !isOwnProfile });
  const [updatePreferences] = useUpdatePreferencesMutation();

  const handleTogglePreference = async (field: string, currentValue: boolean) => {
    try {
      await updatePreferences({ [field]: !currentValue }).unwrap();
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const displayUser = isOwnProfile ? user : profileResponse?.user;
  const displayName = isOwnProfile ? name : (profileResponse?.user?.name || '');
  const displayEmail = isOwnProfile ? email : (profileResponse?.user?.email || '');
  const displayDesignation = isOwnProfile ? designation : (profileResponse?.user?.designation || '');
  const displayCompany = isOwnProfile ? company : (profileResponse?.user?.company || '');
  const displayPhone = isOwnProfile ? phone : (profileResponse?.user?.phone || '');
  const displayDepartment = isOwnProfile ? department : (profileResponse?.user?.department || '');
  const displayLocation = isOwnProfile ? location : (profileResponse?.user?.location || '');
  const displayTimezone = isOwnProfile ? timezone : (profileResponse?.user?.timezone || '');
  const displayStatus = isOwnProfile ? status : (profileResponse?.user?.status || 'Active');

  const activityData = useMemo(() => {
    return generateActivityData(contributionsResponse?.dailyActivity);
  }, [contributionsResponse]);

  // Streak calculations
  const longestStreak = useMemo(() => {
    if (!contributionsResponse?.dailyActivity) return 0;
    const activeDates = new Set(contributionsResponse.dailyActivity.filter(a => a.count > 0).map(a => a.date));
    let maxStreak = 0;
    let currentStreak = 0;

    const today = new Date();
    for (let i = 365; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (activeDates.has(key)) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
    return maxStreak;
  }, [contributionsResponse]);

  const activeDays = useMemo(() => {
    if (!contributionsResponse?.dailyActivity) return 0;
    return contributionsResponse.dailyActivity.filter(a => a.count > 0).length;
  }, [contributionsResponse]);

  const totalContributions = useMemo(() => {
    return contributionsResponse?.totalContributions || 0;
  }, [contributionsResponse]);

  // Day metrics calculation
  const dayMetrics = useMemo(() => {
    const metrics = {
      created: 0,
      completed: 0,
      comments: 0,
      assignments: 0,
      status: 0,
      dates: 0,
      priority: 0,
      others: 0
    };

    if (!dateActivityResponse?.activities) return metrics;

    dateActivityResponse.activities.forEach((act: any) => {
      const type = act.actionType;
      if (type === 'TASK_CREATED') {
        metrics.created++;
      } else if (type === 'STATUS_CHANGED') {
        metrics.status++;
        if (act.newValue === 'Done' || act.newValue === 'Completed' || act.newValue === 'Closed') {
          metrics.completed++;
        }
      } else if (['COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED'].includes(type)) {
        metrics.comments++;
      } else if (['TASK_ASSIGNED', 'TASK_UNASSIGNED'].includes(type)) {
        metrics.assignments++;
      } else if (['DUE_DATE_CHANGED', 'START_DATE_CHANGED'].includes(type)) {
        metrics.dates++;
      } else if (type === 'PRIORITY_CHANGED') {
        metrics.priority++;
      } else {
        metrics.others++;
      }
    });

    return metrics;
  }, [dateActivityResponse]);

  // Avatar gradient derived from name
  const avatarColors = [
    'from-indigo-500 via-indigo-600 to-violet-700',
    'from-rose-500 via-pink-500 to-fuchsia-700',
    'from-emerald-500 via-teal-500 to-cyan-700',
    'from-amber-500 via-orange-500 to-rose-700',
    'from-blue-500 via-sky-500 to-indigo-700',
  ];
  const colorIdx = displayName ? displayName.charCodeAt(0) % avatarColors.length : 0;
  const avatarGradient = avatarColors[colorIdx];

  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'US';

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          designation: designation.trim(),
          company: company.trim(),
          phone: phone.trim(),
          department: department.trim(),
          location: location.trim(),
          timezone: timezone.trim(),
          status: status
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      if (user) {
        login(token, {
          ...user,
          name: data.user?.name || name.trim(),
          email: data.user?.email || email.trim(),
          designation: data.user?.designation || designation.trim(),
          company: data.user?.company || company.trim(),
          phone: data.user?.phone || phone.trim(),
          department: data.user?.department || department.trim(),
          location: data.user?.location || location.trim(),
          timezone: data.user?.timezone || timezone.trim(),
          status: data.user?.status || status
        });
      }
      setInfoMsg({ type: 'success', text: 'Display profile details updated successfully!' });
      setIsEditingInfo(false);
    } catch (err: any) {
      setInfoMsg({ type: 'error', text: err.message });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          designation: designation.trim(),
          company: company.trim(),
          phone: phone.trim(),
          department: department.trim(),
          location: location.trim(),
          timezone: timezone.trim(),
          status: newStatus
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (user) {
        login(token, { ...user, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleToggle2FA = async () => {
    const newVal = !twoFactorEnabled;
    setTwoFactorEnabled(newVal);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          designation: designation.trim(),
          company: company.trim(),
          phone: phone.trim(),
          department: department.trim(),
          location: location.trim(),
          timezone: timezone.trim(),
          status: status,
          twoFactorEnabled: newVal
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (user) {
        login(token, { ...user, twoFactorEnabled: newVal });
      }
    } catch (err) {
      console.error("Failed to toggle 2FA:", err);
      setTwoFactorEnabled(!newVal); // revert
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');
      setPwMsg({ type: 'success', text: 'Password security changes saved!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const copyShareLink = () => {
    const mockUrl = `${window.location.origin}/profile/user/${user?.id || 'guest'}`;
    navigator.clipboard.writeText(mockUrl);
    toast.success('Profile URL copied to clipboard!');
  };

  const getStatusDetails = (currentStatus: string) => {
    switch (currentStatus.toLowerCase()) {
      case 'active':
        return { color: 'bg-emerald-500 dark:bg-emerald-400', label: 'Active Now', border: 'border-emerald-500/20' };
      case 'away':
        return { color: 'bg-amber-500 dark:bg-amber-400', label: 'Away', border: 'border-amber-500/20' };
      case 'offline':
      default:
        return { color: 'bg-zinc-400 dark:bg-zinc-500', label: 'Offline', border: 'border-zinc-400/20' };
    }
  };

  const statusMeta = getStatusDetails(displayStatus);

  // Group activities for heatmap columns
  const heatmapWeeks = useMemo(() => {
    const weeksList: ActivityData[][] = [];
    let currentWeek: ActivityData[] = [];

    activityData.forEach((d, i) => {
      currentWeek.push(d);
      if (currentWeek.length === 7 || i === activityData.length - 1) {
        weeksList.push(currentWeek);
        currentWeek = [];
      }
    });
    return weeksList;
  }, [activityData]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Identify column positions of new months
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;
    heatmapWeeks.forEach((wk, colIdx) => {
      if (wk.length > 0) {
        const m = new Date(wk[0].date).getMonth();
        if (m !== lastMonth) {
          labels.push({ month: months[m], col: colIdx });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [heatmapWeeks]);

  const getTimelineIcon = (actionType: string) => {
    const type = actionType || '';
    if (type.includes('CREATED')) return { icon: CheckSquare, bg: 'bg-primary/10 dark:bg-indigo-950/60', text: 'text-primary dark:text-indigo-400' };
    if (type.includes('STATUS')) return { icon: ArrowRightLeft, bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400' };
    if (type.includes('COMMENT')) return { icon: MessageSquare, bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-600 dark:text-sky-400' };
    if (type.includes('ASSIGN')) return { icon: UserPlus, bg: 'bg-violet-50 dark:bg-violet-950/60', text: 'text-violet-600 dark:text-violet-400' };
    if (type.includes('DATE') || type.includes('TIME')) return { icon: Calendar, bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400' };
    return { icon: Activity, bg: 'bg-background dark:bg-zinc-800/80', text: 'text-muted-foreground dark:text-muted-foreground' };
  };

  if (loadingProfile) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted/50 dark:bg-zinc-950/80 transition-colors flex items-center justify-center p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/50 dark:bg-zinc-950/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 space-y-8">

        {/* Navigation & Title bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border dark:border-border hover:bg-card text-card-foreground dark:hover:bg-zinc-900 text-muted-foreground dark:text-muted-foreground transition-all cursor-pointer shadow-xs"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-zinc-100">Account Profile</h1>
              <p className="text-xs text-zinc-500 dark:text-muted-foreground">
                {isOwnProfile
                  ? "Manage user credentials, notifications preferences, and collaborations dashboard"
                  : "View member profile, contact details, activity timeline, and accomplishments"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={copyShareLink}
              className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-border dark:border-border hover:bg-background dark:hover:bg-zinc-900"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            {isOwnProfile && (
              <Button
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* ── Glassmorphic Banner and Profile Hero ── */}
        <div className="relative border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-xs transition-all duration-300">
          <div className={`h-40 bg-gradient-to-r ${avatarGradient} relative overflow-hidden`}>
            {/* Overlay grid lines / noise pattern */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35 backdrop-blur-[1px]" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Badge className="bg-black/30 text-white border-none font-bold text-[10px] uppercase tracking-wider backdrop-blur-md">
                Enterprise
              </Badge>
            </div>
          </div>

          <div className="px-8 pb-8 pt-0 flex flex-col md:flex-row md:items-end md:justify-between gap-6 relative">
            {/* Avatar block */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-5 -mt-14">
              <div className="relative group">
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-4xl font-extrabold shadow-lg border-4 border-white dark:border-zinc-900 transition-transform duration-300 group-hover:scale-102`}>
                  {initials}
                </div>
                {/* Status Dot overlay */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-card text-card-foreground dark:bg-zinc-900 flex items-center justify-center shadow-md border border-border dark:border-border">
                  <div className={`w-3.5 h-3.5 rounded-full ${statusMeta.color}`} />
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-foreground dark:text-zinc-100 leading-none">{displayName || 'Jane Doe'}</h2>
                  <div className="relative">
                    {isOwnProfile ? (
                      <button
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-pointer transition-colors ${statusMeta.border} bg-background dark:bg-zinc-800 text-muted-foreground dark:text-muted-foreground`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.color}`} />
                        {displayStatus}
                      </button>
                    ) : (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-colors ${statusMeta.border} bg-background dark:bg-zinc-800 text-muted-foreground dark:text-muted-foreground`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.color}`} />
                        {displayStatus}
                      </div>
                    )}

                    {isOwnProfile && showStatusDropdown && (
                      <div className="absolute left-0 mt-2.5 w-36 rounded-2xl border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-200">
                        {['Active', 'Away', 'Offline'].map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              handleUpdateStatus(st);
                              setShowStatusDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-foreground/90 dark:text-muted-foreground hover:bg-background dark:hover:bg-zinc-800/60 flex items-center gap-2 cursor-pointer"
                          >
                            <span className={`w-2 h-2 rounded-full ${getStatusDetails(st).color}`} />
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  {displayDesignation}
                  <span className="text-muted-foreground dark:text-foreground/90">•</span>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {displayCompany}
                </p>
              </div>
            </div>

            <div className="text-left md:text-right pb-2 text-xs text-zinc-400 dark:text-muted-foreground font-semibold space-y-1">
              <div className="flex items-center md:justify-end gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Joined {displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'June 2026'}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Account ID: {displayUser?.id || displayUser?._id || 'guest-00052'}</p>
            </div>
          </div>
        </div>

        {/* ── Inner Tabs Sidebar + Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">

          {/* Inner Sidebar tabs */}
          <aside className="space-y-1 bg-card text-card-foreground dark:bg-zinc-900 border border-border dark:border-border rounded-2xl p-2.5 shadow-2xs">
            {[
              { id: 'overview', label: 'Overview', icon: User, desc: 'Profile and analytics' },
              { id: 'activity', label: 'Recent Activity', icon: Activity, desc: isOwnProfile ? 'Your updates feed' : 'Member updates feed' },
              isOwnProfile && { id: 'security', label: 'Security & Sign-In', icon: Lock, desc: 'Credential configuration' },
              isOwnProfile && { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alert channels preferences' },
            ].filter((t): t is { id: 'overview' | 'activity' | 'security' | 'notifications'; label: string; icon: any; desc: string } => !!t).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group cursor-pointer ${isActive
                      ? 'bg-primary/10 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 shadow-3xs'
                      : 'text-muted-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-zinc-800/40 hover:text-foreground dark:hover:text-zinc-200'
                    }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-primary dark:text-indigo-400' : 'text-muted-foreground group-hover:text-muted-foreground'}`} />
                  <div>
                    <p className="text-xs font-bold leading-none">{tab.label}</p>
                    <p className="text-[9px] font-medium text-muted-foreground dark:text-muted-foreground mt-1 leading-none">{tab.desc}</p>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto text-indigo-500/70" />}
                </button>
              );
            })}
          </aside>

          {/* Main Display Area */}
          <main className="space-y-6">

            {/* ── EDIT PROFILE SLIDE CARD ── */}
            {isEditingInfo && (
              <Card className="border border-primary/25 dark:border-indigo-900/50 bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
                <CardHeader className="border-b border-border dark:border-border pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-indigo-950 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200">Edit Profile Details</CardTitle>
                        <CardDescription className="text-xs">Modify display metrics and custom information cards</CardDescription>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingInfo(false)}
                      className="text-muted-foreground hover:text-foreground/90 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </CardHeader>
                <form onSubmit={handleSaveInfo}>
                  <CardContent className="py-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-name" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Display Name</Label>
                        <Input
                          id="edit-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-email" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Email Address</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                          required
                        />
                      </div>

                      {/* Designation */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-desig" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Designation / Role</Label>
                        <Input
                          id="edit-desig"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>

                      {/* Company */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-company" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Company Name</Label>
                        <Input
                          id="edit-company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-phone" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Phone Number</Label>
                        <Input
                          id="edit-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-dept" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Department</Label>
                        <Input
                          id="edit-dept"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>

                      {/* Location */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-loc" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Location / City</Label>
                        <Input
                          id="edit-loc"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>

                      {/* Timezone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-tz" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Timezone</Label>
                        <Input
                          id="edit-tz"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="h-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs text-foreground dark:text-zinc-100 focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                        />
                      </div>
                    </div>

                    {infoMsg && (
                      <div
                        className={`flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-xl border ${infoMsg.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/40'
                          }`}
                      >
                        {infoMsg.type === 'success' ? (
                          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                        )}
                        {infoMsg.text}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t border-border dark:border-border/80 justify-end gap-2.5 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingInfo(false)}
                      className="h-9 px-4 rounded-xl text-xs font-semibold border-border dark:border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingInfo}
                      className="h-9 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {savingInfo ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Save Details
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* Analytics / Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Completed Tasks', value: totalContributions > 0 ? Math.round(totalContributions * 0.45) : 18, icon: ListTodo, color: 'text-primary dark:text-indigo-400', bg: 'bg-primary/10 dark:bg-indigo-950/30' },
                    { label: 'Total Contributions', value: totalContributions, icon: GitCommit, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                    { label: 'Active Streak', value: `${longestStreak} Days`, icon: Zap, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                    { label: 'Workspace Score', value: Math.min(100, 70 + activeDays), icon: Sparkles, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
                  ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={i} className="bg-card text-card-foreground dark:bg-zinc-900 border border-border dark:border-border rounded-2xl p-4.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                          <p className="text-xl font-black text-foreground dark:text-zinc-100 leading-none">{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                          <StatIcon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Profile Overview Details Cards */}
                <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-border dark:border-border pb-4">
                    <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200">Contact & Organization</CardTitle>
                    <CardDescription className="text-xs">Key metrics and personal directories</CardDescription>
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { label: 'Email Address', value: displayEmail, icon: Mail },
                        { label: 'Phone Number', value: displayPhone, icon: Phone },
                        { label: 'Department', value: displayDepartment, icon: Users2 },
                        { label: 'Office Location', value: displayLocation, icon: MapPin },
                        { label: 'Timezone Settings', value: displayTimezone, icon: Clock },
                        { label: 'Employment Role', value: displayDesignation, icon: Briefcase },
                      ].map((item, i) => {
                        const ItemIcon = item.icon;
                        return (
                          <div key={i} className="flex gap-3.5 items-start">
                            <div className="w-9 h-9 rounded-xl bg-background dark:bg-zinc-800/80 border border-border/40 dark:border-zinc-700/20 flex items-center justify-center shrink-0">
                              <ItemIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider leading-none">{item.label}</p>
                              <p className="text-xs font-semibold text-zinc-700 dark:text-muted-foreground mt-1.5 truncate leading-tight">{item.value || 'Not Configured'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Heatmap Contribution Section */}
                <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-border dark:border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200 flex items-center gap-2">
                        <Activity className="h-4.5 w-4.5 text-indigo-500" />
                        Contributions Log
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isOwnProfile ? "Your actions across all active boards for the past 12 months" : "Actions across all active boards for the past 12 months"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                      <span>Less</span>
                      {['bg-muted dark:bg-zinc-800', 'bg-primary/15 dark:bg-indigo-950/40', 'bg-indigo-300 dark:bg-indigo-800/80', 'bg-primary', 'bg-indigo-700'].map((c, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
                      ))}
                      <span>More</span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="overflow-x-auto pb-3">
                      <div className="min-w-max">
                        {/* Month labels */}
                        <div className="flex ml-8 mb-2 gap-[3px]">
                          {heatmapWeeks.map((_, colIdx) => {
                            const label = monthLabels.find((m) => m.col === colIdx);
                            return (
                              <div key={colIdx} className="w-3.5 text-[8px] text-muted-foreground dark:text-muted-foreground font-bold text-center leading-none">
                                {label ? label.month : ''}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          {/* Day Labels */}
                          <div className="flex flex-col gap-[3px] justify-start pt-0.5">
                            {days.map((day, i) => (
                              <div key={i} className="h-3.5 text-[8px] text-muted-foreground dark:text-muted-foreground font-bold flex items-center leading-none">
                                {i % 2 === 1 ? day.slice(0, 1) : ''}
                              </div>
                            ))}
                          </div>

                          {/* Grid */}
                          <div className="flex gap-[3px]">
                            {heatmapWeeks.map((wk, wi) => (
                              <div key={wi} className="flex flex-col gap-[3px]">
                                {Array.from({ length: 7 }).map((_, di) => {
                                  const cell = wk[di];
                                  if (!cell) return <div key={di} className="w-3.5 h-3.5" />;
                                  return (
                                    <ActivityCell
                                      key={di}
                                      count={cell.count}
                                      date={cell.date}
                                      selected={selectedDate === cell.date}
                                      onClick={() => setSelectedDate(selectedDate === cell.date ? null : cell.date)}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Streaks information block */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-border dark:border-border pt-5 mt-3 gap-4">
                      {[
                        { label: 'Yearly Contributions', value: totalContributions, icon: GitCommit, text: 'contributions total' },
                        { label: 'Active Contribution Days', value: activeDays, icon: Calendar, text: 'days with activity' },
                        { label: 'Longest Streak', value: `${longestStreak} Days`, icon: Zap, text: 'consecutive active days' },
                      ].map((card, i) => {
                        const CardIcon = card.icon;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-background dark:bg-zinc-800/60 border border-border/40 dark:border-zinc-700/20 flex items-center justify-center text-muted-foreground">
                              <CardIcon className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{card.value}</p>
                              <p className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground leading-tight">{card.label}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected date activity log */}
                    {selectedDate && (
                      <div className="mt-6 border-t border-primary/20 dark:border-indigo-950/60 pt-6 space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-foreground dark:text-zinc-200 uppercase tracking-wider">
                            Activities on {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </h4>
                          <button
                            onClick={() => setSelectedDate(null)}
                            className="text-[10px] font-bold text-primary dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Reset Selection
                          </button>
                        </div>

                        {/* Selected day metrics summary */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {[
                            { label: 'Created', value: dayMetrics.created },
                            { label: 'Completed', value: dayMetrics.completed },
                            { label: 'Comments', value: dayMetrics.comments },
                            { label: 'Assignments', value: dayMetrics.assignments },
                            { label: 'Updates', value: dayMetrics.status + dayMetrics.dates },
                            { label: 'Others', value: dayMetrics.others },
                          ].map((dm, idx) => (
                            <div key={idx} className="bg-background dark:bg-zinc-800/40 border border-border dark:border-border/50 rounded-xl p-2 text-center">
                              <p className="text-lg font-black text-foreground dark:text-zinc-100 leading-none">{dm.value}</p>
                              <p className="text-[9px] font-bold text-muted-foreground dark:text-muted-foreground mt-1">{dm.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Detailed action list */}
                        <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-1">
                          {!dateActivityResponse?.activities || dateActivityResponse.activities.length === 0 ? (
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground italic text-center py-4">No specific events recorded for this date.</p>
                          ) : (
                            dateActivityResponse.activities.map((act: any) => {
                              const timeStr = new Date(act.createdAt).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              const actionDesc = act.actionType.toLowerCase().replace(/_/g, ' ');
                              const taskKey = act.metadata?.taskKey || (act.taskId ? `TASK-${String(act.taskId).slice(-5).toUpperCase()}` : '');
                              const taskTitle = act.metadata?.taskTitle || act.metadata?.projectName || '';
                              const timelineStyle = getTimelineIcon(act.actionType);
                              const TimelineIconComponent = timelineStyle.icon;

                              return (
                                <div key={act._id} className="flex gap-3 text-xs bg-background dark:bg-zinc-800/30 border border-border dark:border-border rounded-xl p-3 items-center hover:bg-muted/50 dark:hover:bg-zinc-800/50 transition-colors">
                                  <div className={`w-8 h-8 rounded-lg ${timelineStyle.bg} flex items-center justify-center shrink-0`}>
                                    <TimelineIconComponent className={`h-4.5 w-4.5 ${timelineStyle.text}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-foreground dark:text-zinc-200 capitalize">{actionDesc}</span>
                                      {taskKey && (
                                        act.taskId ? (
                                          <Link
                                            to={`/item/${act.taskId}`}
                                            className="font-bold text-primary dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-350 underline decoration-indigo-350 dark:decoration-indigo-700 decoration-1 underline-offset-2 hover:decoration-indigo-500"
                                          >
                                            {taskKey}
                                          </Link>
                                        ) : (
                                          <span className="font-bold text-primary dark:text-indigo-400">{taskKey}</span>
                                        )
                                      )}
                                      {taskTitle && <span className="text-muted-foreground dark:text-muted-foreground truncate max-w-[200px]">({taskTitle})</span>}
                                    </div>
                                    {act.newValue && typeof act.newValue === 'string' && act.newValue.length < 60 && (
                                      <p className="text-[10px] text-muted-foreground dark:text-zinc-400 italic mt-0.5">Value shifted to "{act.newValue}"</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">{timeStr}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── RECENT ACTIVITY FEED TIMELINE TAB ── */}
            {activeTab === 'activity' && (
              <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-border dark:border-border pb-4">
                  <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200">Recent Updates Timeline</CardTitle>
                  <CardDescription className="text-xs">
                    {isOwnProfile ? "Continuous timeline log of your task contributions and updates" : "Continuous timeline log of task contributions and updates"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-6">
                  {loadingGlobalActivity ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-zinc-400 dark:text-muted-foreground font-semibold">Loading timeline events...</p>
                    </div>
                  ) : !globalActivityResponse?.activities || globalActivityResponse.activities.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground italic">No logged activity logs found in this scope.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-border dark:border-border space-y-6">
                      {globalActivityResponse.activities.map((act: any) => {
                        const dateStr = new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        const timeStr = new Date(act.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const timelineStyle = getTimelineIcon(act.actionType);
                        const TimelineIconComponent = timelineStyle.icon;

                        return (
                          <div key={act._id} className="relative group">
                            {/* Dot overlay indicator */}
                            <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-card text-card-foreground dark:bg-zinc-900 flex items-center justify-center border border-border dark:border-border shadow-2xs group-hover:scale-110 transition-transform">
                              <div className={`w-3.5 h-3.5 rounded-full ${timelineStyle.bg} flex items-center justify-center`}>
                                <TimelineIconComponent className={`h-2.5 w-2.5 ${timelineStyle.text}`} />
                              </div>
                            </div>

                            <div className="bg-background/70 dark:bg-zinc-800/10 border border-border/50 dark:border-border/50 rounded-2xl p-4 space-y-1.5 hover:shadow-2xs transition-shadow">
                              <div className="flex items-center justify-between gap-4">
                                <Badge className="bg-primary/10/60 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 border border-primary/20 dark:border-indigo-900/30 text-[9px] font-bold uppercase tracking-wider">
                                  {act.actionType.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {dateStr} @ {timeStr}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-foreground/90 dark:text-muted-foreground leading-relaxed">
                                {act.metadata?.taskKey && (
                                  act.taskId ? (
                                    <Link
                                      to={`/item/${act.taskId}`}
                                      className="font-extrabold text-primary dark:text-indigo-400 mr-1.5 underline decoration-indigo-350 dark:decoration-indigo-700 decoration-1 underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                      {act.metadata.taskKey}
                                    </Link>
                                  ) : (
                                    <span className="font-extrabold text-primary dark:text-indigo-400 mr-1.5">{act.metadata.taskKey}</span>
                                  )
                                )}
                                {act.metadata?.taskTitle || act.metadata?.projectName || 'Workspace interaction details'}
                              </p>
                              {act.newValue && typeof act.newValue === 'string' && act.newValue.length < 150 && (
                                <div className="bg-card text-card-foreground dark:bg-zinc-900/40 border border-border dark:border-zinc-800 p-2.5 rounded-xl text-[10px] text-muted-foreground dark:text-muted-foreground italic">
                                  {act.oldValue && <span className="line-through text-muted-foreground mr-2">"{act.oldValue}"</span>}
                                  <span>→ "{act.newValue}"</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {globalActivityResponse?.totalPages && globalActivityResponse.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border dark:border-border pt-5 mt-6">
                      <p className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Page {timelinePage} of {globalActivityResponse.totalPages} ({globalActivityResponse.total} events)
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimelinePage((p) => Math.max(p - 1, 1))}
                          disabled={timelinePage === 1}
                          className="h-8 rounded-xl px-3 text-[10px] font-bold gap-1 cursor-pointer border-border dark:border-border"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimelinePage((p) => Math.min(p + 1, globalActivityResponse.totalPages))}
                          disabled={timelinePage === globalActivityResponse.totalPages}
                          className="h-8 rounded-xl px-3 text-[10px] font-bold gap-1 cursor-pointer border-border dark:border-border"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── SECURITY & SIGN-IN TAB ── */}
            {activeTab === 'security' && (
              <div className="space-y-6">

                {/* Credentials updates */}
                <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-border dark:border-border pb-4">
                    <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200">Update Sign-in Password</CardTitle>
                    <CardDescription className="text-xs">Update your credentials to maintain a highly secure account</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleChangePassword}>
                    <CardContent className="py-6 space-y-4">
                      {/* Current password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="curr-pw" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="curr-pw"
                            type={showCurrentPw ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current credentials password"
                            className="h-10 pr-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/90 cursor-pointer"
                          >
                            {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* New Password */}
                        <div className="space-y-1.5">
                          <Label htmlFor="new-pw" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-pw"
                              type={showNewPw ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Minimum 8 characters"
                              className="h-10 pr-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPw(!showNewPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/90 cursor-pointer"
                            >
                              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                          <Label htmlFor="conf-pw" className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="conf-pw"
                              type={showConfirmPw ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat new password"
                              className="h-10 pr-10 rounded-xl border-border dark:border-border bg-background dark:bg-zinc-900 font-medium text-xs focus-visible:ring-ring focus-visible:bg-card text-card-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/90 cursor-pointer"
                            >
                              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {pwMsg && (
                        <div
                          className={`flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-xl border ${pwMsg.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/40'
                            }`}
                        >
                          {pwMsg.type === 'success' ? (
                            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                          )}
                          {pwMsg.text}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t border-border dark:border-border/80 justify-end py-4">
                      <Button
                        type="submit"
                        disabled={savingPw}
                        className="h-9 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {savingPw ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

              </div>
            )}

            {/* ── NOTIFICATIONS PREFERENCES TAB ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-border dark:border-border pb-4">
                    <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200 flex items-center gap-2">
                      <Mail className="h-4.5 w-4.5 text-indigo-500" />
                      Email Alerts Preferences
                    </CardTitle>
                    <CardDescription className="text-xs">Customize which active tasks send notification messages to your email inbox</CardDescription>
                  </CardHeader>
                  <CardContent className="py-6 space-y-4">
                    {[
                      { key: 'emailMentions', label: 'Comment Mentions', desc: 'Notify when another user explicitly mentions your username inside a card comment thread.' },
                      { key: 'emailAssignments', label: 'Task Assignments', desc: 'Notify immediately when an owner or admin assigns you to a task column card.' },
                      { key: 'emailReminders', label: 'Due Date Reminders', desc: 'Receive alert digests when a task assignment approaches its scheduled due date.' },
                      { key: 'emailAnnouncements', label: 'Workspace Announcements', desc: 'Send emails when workspace-wide milestones or announcements are published.' },
                    ].map((pref) => {
                      const value = prefData?.preference?.[pref.key] ?? true;
                      return (
                        <div key={pref.key} className="flex items-center justify-between gap-6 border-b border-border dark:border-border/60 pb-4 last:border-0 last:pb-0">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{pref.label}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-muted-foreground leading-relaxed max-w-md">{pref.desc}</p>
                          </div>
                          <button
                            onClick={() => handleTogglePreference(pref.key, value)}
                            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${value ? 'bg-primary' : 'bg-muted dark:bg-zinc-800'
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-card text-card-foreground shadow-sm transition duration-200 ease-in-out ${value ? 'translate-x-4.5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border border-border dark:border-border bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-border dark:border-border pb-4">
                    <CardTitle className="text-sm font-black text-foreground dark:text-zinc-200 flex items-center gap-2">
                      <Volume2 className="h-4.5 w-4.5 text-indigo-500" />
                      In-App & Browser Alerts
                    </CardTitle>
                    <CardDescription className="text-xs">Adjust local push notifications and sound indicators in your active tab</CardDescription>
                  </CardHeader>
                  <CardContent className="py-6 space-y-4">
                    {[
                      { key: 'pushEnabled', label: 'Push Notifications', desc: 'Deliver instant browser push notifications for updates happening in your open workspaces.' },
                      { key: 'soundEnabled', label: 'Notification Chime Alert', desc: 'Play an acoustic alert chime whenever you are mentioned or assigned a card task.' },
                    ].map((pref) => {
                      const value = prefData?.preference?.[pref.key] ?? true;
                      return (
                        <div key={pref.key} className="flex items-center justify-between gap-6 border-b border-border dark:border-border/60 pb-4 last:border-0 last:pb-0">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{pref.label}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-muted-foreground leading-relaxed max-w-md">{pref.desc}</p>
                          </div>
                          <button
                            onClick={() => handleTogglePreference(pref.key, value)}
                            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${value ? 'bg-primary' : 'bg-muted dark:bg-zinc-800'
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-card text-card-foreground shadow-sm transition duration-200 ease-in-out ${value ? 'translate-x-4.5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}



          </main>
        </div>

      </div>
    </div>
  );
}
