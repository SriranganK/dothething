// src/Pages/WorkspaceDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  LayoutDashboard,
  CalendarDays,
  Activity as ActivityIcon,
  Clock,
  Layout,
  ArrowRight,
  Trash2,
  Star,
  Search,
  SlidersHorizontal,
  User,
  Calendar,
  Tag,
  Settings,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Percent,
  Sparkles,
  ChevronDown,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Kanban,
  Megaphone,
  Briefcase,
  Lock,
  Eye,
} from "lucide-react";
import type { WorkspaceType, BoardType } from "@/types/workspace";
import { useAppDispatch } from "@/store/hooks";
import { setActiveView, setShowSettingsModal } from "@/store/slices/uiSlice";
import {
  useGetDashboardAnalyticsQuery,
  useGetWorkspaceOverviewQuery,
  useGetMilestonesQuery,
  useGetLabelsQuery,
  useCreateLabelMutation,
  useGetWorkspaceActivityQuery,
  useGetWorkspaceMembersQuery,
} from "@/store/services/api";
import { ActivityFeedPopover } from "@/components/ActivityFeedPopover";

import JiraSummaryPage from "@/Pages/JiraSummaryPage";

interface WorkspaceDashboardProps {
  user: any;
  workspace: WorkspaceType | null;
  token: string;
  boards: BoardType[];
  onCreateBoard: () => void;
  onSelectBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  workspaceItems?: any[];
  workspaceMembers?: any[];
}

const iconMap: Record<string, any> = {
  CalendarDays,
  ActivityIcon,
  Layers,
  Kanban,
  Megaphone,
  Briefcase,
};

export function WorkspaceDashboard({
  user,
  workspace,
  token,
  boards,
  onCreateBoard,
  onSelectBoard,
  onDeleteBoard,
  workspaceItems = [],
  workspaceMembers = [],
}: WorkspaceDashboardProps) {
  const dispatch = useAppDispatch();

  // State definitions
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "favorites" | "recent">("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "tasks">("updated");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "private" | "workspace">("all");
  const [activeRightTab, setActiveRightTab] = useState<"performers" | "milestones" | "labels" | "profile">("performers");
  const [overviewTimeframe, setOverviewTimeframe] = useState<"this_day" | "this_week" | "this_month" | "this_year">("this_week");

  // Summary Dialog
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryBoard, setSummaryBoard] = useState<BoardType | null>(null);
  const [summaryItems, setSummaryItems] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Label Quick Create form
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");
  const [labelMessage, setLabelMessage] = useState({ type: "", text: "" });

  // Load favorites & recently viewed from localStorage (scoped by workspace id)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (!workspace?._id) return [];
    try {
      const saved = localStorage.getItem(`ws_${workspace._id}_favorites`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    if (!workspace?._id) return [];
    try {
      const saved = localStorage.getItem(`ws_${workspace._id}_recent`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync state if workspace ID changes
  useEffect(() => {
    if (workspace?._id) {
      try {
        const savedFavs = localStorage.getItem(`ws_${workspace._id}_favorites`);
        setFavorites(savedFavs ? JSON.parse(savedFavs) : []);

        const savedRecent = localStorage.getItem(`ws_${workspace._id}_recent`);
        setRecentlyViewed(savedRecent ? JSON.parse(savedRecent) : []);
      } catch (err) {
        console.error("Failed to load local settings from workspace:", err);
      }
    }
  }, [workspace?._id]);

  // Queries
  const { data: analyticsData, isLoading: analyticsLoading } =
    useGetDashboardAnalyticsQuery(workspace?._id || "", {
      skip: !workspace?._id,
    });

  const { data: overviewData, isLoading: overviewLoading } =
    useGetWorkspaceOverviewQuery(
      {
        workspaceId: workspace?._id || "",
        timeframe: overviewTimeframe.replace("this_", ""),
      },
      {
        skip: !workspace?._id,
      }
    );

  const { data: milestonesData, isLoading: milestonesLoading } =
    useGetMilestonesQuery(workspace?._id || "", {
      skip: !workspace?._id,
    });

  const { data: labelsData } = useGetLabelsQuery(workspace?._id || "", {
    skip: !workspace?._id,
  });

  const { data: activityData, isLoading: activityLoading } =
    useGetWorkspaceActivityQuery(
      { workspaceId: workspace?._id || "", page: 1, limit: 50 },
      { skip: !workspace?._id }
    );

  const { data: membersData } = useGetWorkspaceMembersQuery(workspace?._id || "", {
    skip: !workspace?._id,
  });

  const [createLabel, { isLoading: labelSubmitting }] = useCreateLabelMutation();

  const milestones = milestonesData?.milestones || [];
  const labels = labelsData?.labels || [];
  const dbActivities = activityData?.activities || [];
  const members = membersData?.members || [];

  // Toggle favorite helper
  const handleToggleFavorite = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workspace?._id) return;
    const nextFavorites = favorites.includes(boardId)
      ? favorites.filter((id) => id !== boardId)
      : [...favorites, boardId];
    setFavorites(nextFavorites);
    localStorage.setItem(
      `ws_${workspace._id}_favorites`,
      JSON.stringify(nextFavorites)
    );
  };

  // Keyboard shortcut Ctrl+F trigger listener to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("board-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Summary loading handler
  const openBoardSummary = async (board: BoardType) => {
    try {
      setSummaryLoading(true);
      setSummaryBoard(board);
      setSummaryOpen(true);

      const itemsRes = await fetch(
        `http://localhost:5000/api/boards/${board._id}/items`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!itemsRes.ok) {
        throw new Error("Failed to fetch board items");
      }

      const itemsData = await itemsRes.json();
      setSummaryItems(itemsData.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Board selection wrapper (logs recent board views)
  const handleBoardClick = (boardId: string) => {
    if (workspace?._id) {
      const nextRecent = [
        boardId,
        ...recentlyViewed.filter((id) => id !== boardId),
      ].slice(0, 8);
      setRecentlyViewed(nextRecent);
      localStorage.setItem(
        `ws_${workspace._id}_recent`,
        JSON.stringify(nextRecent)
      );
    }
    onSelectBoard(boardId);
  };

  // Label submission handler
  const handleCreateLabelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim() || !workspace?._id) return;
    setLabelMessage({ type: "", text: "" });
    try {
      await createLabel({
        workspaceId: workspace._id,
        name: newLabelName.trim(),
        color: newLabelColor,
      }).unwrap();
      setLabelMessage({ type: "success", text: `Label "${newLabelName}" created!` });
      setNewLabelName("");
    } catch (err: any) {
      setLabelMessage({
        type: "error",
        text: err?.data?.message || "Failed to create label.",
      });
    }
  };

  // Helper values & greetings
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Analytics metrics — sourced entirely from real backend data
  const analytics = analyticsData || {};

  // Overview stats from dedicated endpoint
  const totalTasks = overviewData?.totalTasks ?? 0;
  const completedTasks = overviewData?.completedTasks ?? 0;
  const workspaceProgress = overviewData?.workspaceProgress ?? 0;
  const boardsCount = overviewData?.totalBoards ?? boards.length;
  const activeMilestonesCount = overviewData?.activeMilestones ?? 0;
  const recentActivityCount = overviewData?.recentActivityCount ?? 0;
  const totalMembers = overviewData?.totalMembers ?? members.length;

  const activityLabel = useMemo(() => {
    switch (overviewTimeframe) {
      case "this_day":
        return "Activity (today)";
      case "this_week":
        return "Activity (7d)";
      case "this_month":
        return "Activity (30d)";
      case "this_year":
        return "Activity (365d)";
      default:
        return "Activity (7d)";
    }
  }, [overviewTimeframe]);

  // Activity feed — DB only, no mock data
  const activitiesList = useMemo(() => {
    return dbActivities.slice(0, 6).map((act) => {
      const actorName = act.actorId?.name || act.actorId?.email?.split('@')[0] || "Someone";
      const title = act.metadata?.taskTitle || act.metadata?.itemName || "a task";
      let actionText = `updated "${title}"`;
      let colorClass = "bg-blue-100 text-blue-600 border-blue-200";
      let icon = <Clock className="h-3.5 w-3.5" />;

      switch (act.actionType) {
        case "TASK_CREATED":
          actionText = `created task "${title}"`;
          colorClass = "bg-pink-100 text-pink-600 border-pink-200";
          icon = <PlusCircle className="h-3.5 w-3.5" />;
          break;
        case "STATUS_CHANGED":
          actionText = `moved "${title}" → ${act.newValue || "new status"}`;
          colorClass = "bg-violet-100 text-violet-600 border-violet-200";
          icon = <FileText className="h-3.5 w-3.5" />;
          break;
        case "TASK_ASSIGNED":
          actionText = `assigned "${title}" to ${act.newValue || "a member"}`;
          colorClass = "bg-amber-100 text-amber-600 border-amber-200";
          icon = <Users className="h-3.5 w-3.5" />;
          break;
        case "COMMENT_ADDED":
          actionText = `commented on "${title}"`;
          colorClass = "bg-emerald-100 text-emerald-600 border-emerald-200";
          icon = <MessageSquare className="h-3.5 w-3.5" />;
          break;
        case "TASK_DELETED":
          actionText = `deleted task "${title}"`;
          colorClass = "bg-red-100 text-red-600 border-red-200";
          icon = <AlertCircle className="h-3.5 w-3.5" />;
          break;
        case "LABEL_ADDED":
          actionText = `added label to "${title}"`;
          colorClass = "bg-teal-100 text-teal-600 border-teal-200";
          icon = <Tag className="h-3.5 w-3.5" />;
          break;
        case "MEMBER_ADDED":
          actionText = `added a member to the workspace`;
          colorClass = "bg-cyan-100 text-cyan-600 border-cyan-200";
          icon = <Users className="h-3.5 w-3.5" />;
          break;
        default:
          break;
      }

      const timeAgo = (() => {
        const diff = Date.now() - new Date(act.createdAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      })();

      return { id: act._id, user: actorName, action: actionText, time: timeAgo, colorClass, icon };
    });
  }, [dbActivities]);

  // Process & filter boards list
  const filteredBoards = useMemo(() => {
    let list = [...boards];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    // Tabs filtering
    if (selectedFilter === "favorites") {
      list = list.filter((b) => favorites.includes(b._id));
    } else if (selectedFilter === "recent") {
      list = list.filter((b) => recentlyViewed.includes(b._id));
      list.sort((a, b) => recentlyViewed.indexOf(a._id) - recentlyViewed.indexOf(b._id));
    }

    // Visibility filter
    if (visibilityFilter !== "all") {
      list = list.filter(
        (b) => (b.visibility || "WORKSPACE").toLowerCase() === visibilityFilter
      );
    }

    // Sorting (skip original sorting order if recentlyViewed filter was active)
    if (selectedFilter !== "recent") {
      list.sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else if (sortBy === "tasks") {
          const countA = (a.columns || []).reduce(
            (sum, col) => sum + (col.items?.length || col.itemCount || 0),
            0
          );
          const countB = (b.columns || []).reduce(
            (sum, col) => sum + (col.items?.length || col.itemCount || 0),
            0
          );
          return countB - countA;
        } else {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      });
    }

    return list;
  }, [
    boards,
    searchQuery,
    selectedFilter,
    sortBy,
    visibilityFilter,
    favorites,
    recentlyViewed,
  ]);

  // Member rendering helper
  const getAvatarBg = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-primary/15 text-primary border-primary/25",
      "bg-violet-100 text-violet-700 border-violet-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    return colors[hash % colors.length];
  };

  // Performers — from analytics teamWorkload, falling back to workspace items + members
  const performers = useMemo(() => {
    // Primary: use analytics teamWorkload if available
    if (analytics.teamWorkload && analytics.teamWorkload.length > 0) {
      return analytics.teamWorkload
        .filter((w: any) => w.name !== 'Unassigned')
        .slice(0, 5)
        .map((w: any) => ({
          name: w.name,
          tasks: w.tasksCount,
          initials: w.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        }));
    }
    // Fallback: build performers from workspaceItems + workspaceMembers
    if (workspaceItems && workspaceItems.length > 0) {
      // Build email → name map from members
      const emailToName: Record<string, string> = {};
      workspaceMembers.forEach((m: any) => {
        if (m.userId?.email && m.userId?.name) {
          emailToName[m.userId.email.toLowerCase().trim()] = m.userId.name;
        }
      });
      // Count tasks per assignee
      const workload: Record<string, number> = {};
      workspaceItems.forEach((item: any) => {
        const raw = (item.assignee || '').trim();
        if (!raw) return;
        // Resolve email to name if possible
        const name = emailToName[raw.toLowerCase()] || raw;
        if (!name || name === 'Unassigned') return;
        workload[name] = (workload[name] || 0) + 1;
      });
      return Object.entries(workload)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, tasks]) => ({
          name,
          tasks,
          initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        }));
    }
    return [];
  }, [analytics, workspaceItems, workspaceMembers]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card text-card-foreground">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Header Row: Good evening, Srirangan */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {greeting}, {user?.name?.split(" ")[0] || "Srirangan"} 
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm font-medium">
                {workspace?.name || "Best workspace"} · {workspace?.type || "Personal"}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {workspace?.role !== "GUEST" && (
                <Button
                  onClick={onCreateBoard}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold h-10 px-5 rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Board
                </Button>
              )}
         
            </div>
          </div>

          {/* Three-Card Overview Section Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Box 1: Workspace Overview (Boards, Tasks, Completed, Progress) */}
            <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-foreground text-sm">Workspace Overview</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-bold bg-background border border-border/60 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                      <span className="capitalize">{overviewTimeframe.replace("_", " ")}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 bg-card border border-border text-card-foreground">
                    <DropdownMenuItem 
                      onClick={() => setOverviewTimeframe("this_day")}
                      className={`cursor-pointer ${overviewTimeframe === "this_day" ? "bg-muted font-bold" : ""}`}
                    >
                      This Day
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setOverviewTimeframe("this_week")}
                      className={`cursor-pointer ${overviewTimeframe === "this_week" ? "bg-muted font-bold" : ""}`}
                    >
                      This Week
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setOverviewTimeframe("this_month")}
                      className={`cursor-pointer ${overviewTimeframe === "this_month" ? "bg-muted font-bold" : ""}`}
                    >
                      This Month
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setOverviewTimeframe("this_year")}
                      className={`cursor-pointer ${overviewTimeframe === "this_year" ? "bg-muted font-bold" : ""}`}
                    >
                      This Year
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sub-metrics grid */}
              <div className="grid grid-cols-3 gap-2 pt-4 flex-1 items-center">
                {/* Boards Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-primary tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : boardsCount}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">Boards</span>
                    <div className="h-[3px] w-6 bg-primary rounded-full mt-1.5" />
                  </div>
                </div>

                {/* Tasks Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : totalTasks}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">Tasks</span>
                    <div className="h-[3px] w-6 bg-blue-500 rounded-full mt-1.5" />
                  </div>
                </div>

                {/* Completed Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : completedTasks}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">Completed</span>
                    <div className="h-[3px] w-6 bg-emerald-500 rounded-full mt-1.5" />
                  </div>
                </div>

                {/* Progress Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-amber-500 tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : `${workspaceProgress}%`}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">Progress</span>
                    <div className="h-[3px] w-6 bg-amber-500 rounded-full mt-1.5" />
                  </div>
                </div>

                {/* Active Milestones Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-violet-600 tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : activeMilestonesCount}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">Milestones</span>
                    <div className="h-[3px] w-6 bg-violet-500 rounded-full mt-1.5" />
                  </div>
                </div>

                {/* Recent Activity Count Card */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between h-24">
                  <span className="text-3xl font-extrabold text-rose-500 tracking-tight">
                    {overviewLoading ? (
                      <span className="inline-block w-8 h-7 bg-muted animate-pulse rounded" />
                    ) : recentActivityCount}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">{activityLabel}</span>
                    <div className="h-[3px] w-6 bg-rose-500 rounded-full mt-1.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Activity Feed (Matching circles layout) */}
            <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-foreground text-sm">Activity Feed</h3>
                <ActivityFeedPopover
                  workspaceId={workspace?._id}
                  activities={activityData?.activities || []}
                  isLoading={activityLoading}
                >
                  <span className="text-xs text-[#5850ec] hover:text-indigo-800 font-bold cursor-pointer select-none">
                    View all
                  </span>
                </ActivityFeedPopover>
              </div>

              <div className="space-y-3 pt-3 flex-1 overflow-y-auto">
                {activityLoading ? (
                  <div className="space-y-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2.5 bg-muted animate-pulse rounded w-3/4" />
                          <div className="h-2 bg-background animate-pulse rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activitiesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <ActivityIcon className="h-8 w-8 text-zinc-200 mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">No recent activity</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Actions on boards will appear here</p>
                  </div>
                ) : (
                  activitiesList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${item.colorClass}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground/90 leading-snug truncate">
                            <span className="font-bold text-foreground">{item.user}</span> {item.action}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap shrink-0">{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Box 3: Tabbed Widget Card (Top Performers, Milestones, Labels, Profile) */}
            <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[220px]">
              
              {/* Header Tab Toggles */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex gap-2 overflow-x-auto pr-2 pb-0.5">
                  <button
                    onClick={() => setActiveRightTab("performers")}
                    className={`text-xs font-bold whitespace-nowrap pb-1.5 border-b-2 transition-all cursor-pointer ${
                      activeRightTab === "performers"
                        ? "border-indigo-600 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground/90"
                    }`}
                  >
                    Performers
                  </button>
                  <button
                    onClick={() => setActiveRightTab("milestones")}
                    className={`text-xs font-bold whitespace-nowrap pb-1.5 border-b-2 transition-all cursor-pointer ${
                      activeRightTab === "milestones"
                        ? "border-indigo-600 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground/90"
                    }`}
                  >
                    Milestones
                  </button>
                  <button
                    onClick={() => setActiveRightTab("labels")}
                    className={`text-xs font-bold whitespace-nowrap pb-1.5 border-b-2 transition-all cursor-pointer ${
                      activeRightTab === "labels"
                        ? "border-indigo-600 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground/90"
                    }`}
                  >
                    Labels
                  </button>
                  <button
                    onClick={() => setActiveRightTab("profile")}
                    className={`text-xs font-bold whitespace-nowrap pb-1.5 border-b-2 transition-all cursor-pointer ${
                      activeRightTab === "profile"
                        ? "border-indigo-600 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground/90"
                    }`}
                  >
                    Profile
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold bg-background border border-border/60 px-1.5 py-0.5 rounded-md shrink-0">
                  <span className="capitalize">{overviewTimeframe.replace("_", " ")}</span>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 pt-3 flex flex-col justify-between overflow-y-auto">
                {activeRightTab === "performers" && (
                  <>
                    <div className="space-y-2">
                      {analyticsLoading ? (
                        [1,2,3].map(i => (
                          <div key={i} className="flex items-center gap-2 py-0.5">
                            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                            <div className="h-3 bg-muted animate-pulse rounded flex-1" />
                          </div>
                        ))
                      ) : performers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <Users className="h-7 w-7 text-zinc-200 mb-1.5" />
                          <p className="text-xs text-muted-foreground">No task data yet</p>
                          <p className="text-[10px] text-muted-foreground">Assign tasks to members to see workload</p>
                        </div>
                      ) : (
                        performers.map((perf: any) => (
                          <div key={perf.name} className="flex items-center justify-between text-xs py-0.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs border ${getAvatarBg(perf.name)}`}>
                                {perf.initials}
                              </div>
                              <span className="font-bold text-foreground">{perf.name}</span>
                            </div>
                            <span className="text-muted-foreground font-bold">{perf.tasks} tasks</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="pt-2 text-center border-t border-zinc-50">
                      <span className="text-xs text-[#5850ec] hover:text-indigo-800 font-bold cursor-pointer inline-flex items-center gap-1">
                        🏆 View Leaderboard
                      </span>
                    </div>
                  </>
                )}

                {activeRightTab === "milestones" && (
                  <div className="space-y-2.5">
                    {milestones.length === 0 ? (
                      <p className="text-muted-foreground text-xs italic text-center py-4">No active milestones</p>
                    ) : (
                      milestones.slice(0, 2).map((ms) => {
                        const progress = ms.stats?.progress || 0;
                        return (
                          <div
                            key={ms._id}
                            onClick={() => dispatch(setActiveView({ type: "milestone-details", milestoneId: ms._id }))}
                            className="p-2 border border-border rounded-lg hover:border-primary/20 hover:shadow-xs transition-all cursor-pointer bg-card text-card-foreground"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground truncate">{ms.name}</span>
                              <Badge className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-1 py-0 text-[8px] font-bold">
                                {ms.status || "ACTIVE"}
                              </Badge>
                            </div>
                            <div className="mt-2 w-full bg-muted h-1 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-1 block">Due: {ms.due_date ? new Date(ms.due_date).toLocaleDateString() : "TBD"}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeRightTab === "labels" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {labels.slice(0, 8).map((lbl) => (
                        <Badge
                          key={lbl._id}
                          style={{
                            backgroundColor: `${lbl.color}15`,
                            borderColor: `${lbl.color}30`,
                            color: lbl.color,
                          }}
                          className="text-[9px] font-bold border shadow-none px-1.5 py-0 rounded-lg select-none"
                        >
                          {lbl.name}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Tiny inline create */}
                    <form onSubmit={handleCreateLabelSubmit} className="flex gap-1.5 pt-1.5 border-t border-zinc-50">
                      <Input
                        placeholder="New label..."
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        className="h-7 text-[10px] rounded-lg border-border bg-muted/50 flex-1"
                        required
                      />
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="w-7 h-7 rounded border border-border cursor-pointer p-0 shrink-0"
                      />
                      <Button type="submit" size="sm" className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2 shrink-0 cursor-pointer">
                        <Plus />
                      </Button>
                    </form>
                  </div>
                )}

                {activeRightTab === "profile" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Workspace:</span>
                      <span className="font-bold text-foreground truncate max-w-[140px]">{workspace?.name || "Best Workspace"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="font-bold text-foreground truncate max-w-[140px]">
                        {typeof workspace?.owner === "string" ? workspace.owner : workspace?.owner?.name || "Srirangan"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-bold text-foreground">
                        {workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "June 2026"}
                      </span>
                    </div>
                    <div className="pt-2 text-center border-t border-zinc-50">
                      <span
                        onClick={() => dispatch(setActiveView({ type: "workspace-profile" }))}
                        className="text-xs text-primary hover:text-indigo-800 font-bold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        Settings Profile <Settings className="h-3 w-3 inline" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Your Boards Section */}
          <div className="space-y-4 pt-4">
            
            {/* Header + Filter controls row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Your Boards</h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Tabs Filter (All, Favorites, Recently Viewed) */}
                <div className="flex border border-border p-1 bg-muted/50 rounded-xl">
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilter === "all"
                        ? "bg-[#4f46e5] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    All Boards
                  </button>
                  <button
                    onClick={() => setSelectedFilter("favorites")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilter === "favorites"
                        ? "bg-[#4f46e5] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Favorites
                  </button>
                  <button
                    onClick={() => setSelectedFilter("recent")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilter === "recent"
                        ? "bg-[#4f46e5] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Recently Viewed
                  </button>
                </div>

                {/* Input Search Boards */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="board-search-input"
                    placeholder="Search boards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-card text-card-foreground border-border rounded-xl text-foreground focus-visible:ring-ring/20 focus-visible:border-primary/50 text-xs h-9 w-52"
                  />
                </div>

                {/* View Switchers */}
                <div className="flex border border-border rounded-xl p-1 bg-muted/50">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded-lg cursor-pointer transition-all ${
                      viewMode === "grid"
                        ? "bg-card text-card-foreground text-[#4f46e5] border border-border/50 shadow-xs"
                        : "text-muted-foreground hover:text-muted-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1 rounded-lg cursor-pointer transition-all ${
                      viewMode === "list"
                        ? "bg-card text-card-foreground text-[#4f46e5] border border-border/50 shadow-xs"
                        : "text-muted-foreground hover:text-muted-foreground"
                    }`}
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Filters Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-border rounded-xl text-xs text-muted-foreground font-bold h-9 px-3 bg-card text-card-foreground"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setVisibilityFilter("all")}>
                      <Eye className="size-3.5 mr-2 text-zinc-400" />
                      All Visibility
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setVisibilityFilter("workspace")}>
                      <Briefcase className="size-3.5 mr-2 text-zinc-400" />
                      Workspace Boards
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibilityFilter("private")}>
                      <Lock className="size-3.5 mr-2 text-zinc-400" />
                      Private Boards
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Boards Grid or List View */}
            {filteredBoards.length === 0 ? (
              <div className="bg-card text-card-foreground border border-border border-dashed rounded-2xl p-16 text-center space-y-4">
                <Layout className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">No boards found matching the filters.</p>
              </div>
            ) : viewMode === "grid" ? (
              
              // GRID VIEW
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr">
                {filteredBoards.map((board) => {
                  const columns = board.columns || [];
                  const isFav = favorites.includes(board._id);
                  const totalBoardTasks = columns.reduce((sum, col) => {
                    return sum + (col.items?.length || col.itemCount || 0);
                  }, 0);

                  // Extract deterministic board icon and styles matching the image mock cards
                  let boardIcon = <Layout className="h-4 w-4 text-indigo-500" />;
                  let boardColorTheme = "bg-primary/10 border-primary/20 text-primary";
                  
                  if (board.name.toLowerCase().includes("track")) {
                    boardIcon = <LayoutDashboard className="h-4 w-4 text-amber-500" />;
                    boardColorTheme = "bg-amber-50 border-amber-100 text-amber-600";
                  } else if (board.name.toLowerCase().includes("hiring") || board.name.toLowerCase().includes("pipeline")) {
                    boardIcon = <Kanban className="h-4 w-4 text-indigo-500" />;
                    boardColorTheme = "bg-primary/10 border-primary/20 text-primary";
                  } else if (board.name.toLowerCase().includes("roadmap") || board.name.toLowerCase().includes("product")) {
                    boardIcon = <CalendarDays className="h-4 w-4 text-rose-500" />;
                    boardColorTheme = "bg-rose-50 border-rose-100 text-rose-600";
                  } else if (board.name.toLowerCase().includes("market") || board.name.toLowerCase().includes("campaign")) {
                    boardIcon = <Megaphone className="h-4 w-4 text-indigo-500" />;
                    boardColorTheme = "bg-primary/10 border-primary/20 text-primary";
                  } else if (board.name.toLowerCase().includes("design") || board.name.toLowerCase().includes("system")) {
                    boardIcon = <Layers className="h-4 w-4 text-emerald-500" />;
                    boardColorTheme = "bg-emerald-50 border-emerald-100 text-emerald-600";
                  }

                  return (
                    <motion.div
                      key={board._id}
                      layoutId={`board-grid-card-${board._id}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -2 }}
                      onClick={() => handleBoardClick(board._id)}
                      className="group bg-card text-card-foreground border border-border rounded-2xl p-5 flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:border-primary/25 transition-all duration-300 cursor-pointer min-h-[240px] relative"
                    >
                      {/* Top actions block */}
                      <div className="flex items-center justify-between">
                        {/* Star icon */}
                        <button
                          onClick={(e) => handleToggleFavorite(board._id, e)}
                          className={`p-1 rounded-md hover:bg-background cursor-pointer transition-all ${
                            isFav ? "text-amber-400" : "text-muted-foreground hover:text-muted-foreground"
                          }`}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Star className={`h-4.5 w-4.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-muted-foreground cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4.5 w-4.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                  e.stopPropagation();
                                  openBoardSummary(board);
                              }}
                            >
                              <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View Board Summary
                            </DropdownMenuItem>
                            {(workspace?.role === "OWNER" || workspace?.role === "ADMIN") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBoardToDelete(board._id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete Board
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Icon + Title Section */}
                      <div className="mt-3 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${boardColorTheme}`}>
                          {boardIcon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                            {board.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                            {columns.length} columns
                          </p>
                        </div>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="mt-4">
                        <div className="flex h-5 overflow-hidden rounded-md bg-muted/80 mb-3 border border-border">
                          {columns.map((col, idx) => {
                            const count = col.items?.length || col.itemCount || 0;
                            const percentage = totalBoardTasks > 0 ? (count / totalBoardTasks) * 100 : 0;
                            const colors = [
                              "bg-[#4f46e5]", // Violet/indigo
                              "bg-[#5850ec]", // Purple
                              "bg-fuchsia-500", // Magenta
                              "bg-emerald-500", // Green
                              "bg-amber-400", // Orange
                            ];
                            const color = colors[idx % colors.length];

                            return (
                              <TooltipProvider key={col.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`${color} text-[10px] font-bold text-white flex items-center justify-center transition-all cursor-pointer`}
                                      style={{
                                        width: count > 0 ? `${Math.max(percentage, 10)}%` : "0%",
                                      }}
                                    >
                                      {count > 0 ? count : ""}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-zinc-900 border-none text-[10px] py-1 rounded-lg text-white">
                                    {col.name}: {count} tasks
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                          {totalBoardTasks === 0 && (
                            <div className="w-full flex items-center justify-center text-[10px] text-muted-foreground bg-background italic">
                              0 tasks
                            </div>
                          )}
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap gap-1.5 min-h-[50px] content-start">
                          {columns.slice(0, 3).map((col) => {
                            const count = col.items?.length || col.itemCount || 0;
                            return (
                              <span
                                key={col.id}
                                className="text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border/40 px-2 py-0.5 rounded-lg select-none whitespace-nowrap"
                              >
                                {col.name} ({count})
                              </span>
                            );
                          })}
                          {columns.length > 3 && (
                            <span className="text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border/40 px-2 py-0.5 rounded-lg select-none whitespace-nowrap">
                              +{columns.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Date + Avatars */}
                      <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          Created {new Date(board.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Avatars */}
                          {board.members && board.members.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden pr-0.5">
                              {board.members.slice(0, 3).map((m) => (
                                <TooltipProvider key={m.userId}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={`w-5.5 h-5.5 rounded-full border border-white text-[8px] font-extrabold flex items-center justify-center select-none uppercase shrink-0 shadow-xs ${getAvatarBg(m.name || m.userId)}`}>
                                        {(m.name || m.userId).slice(0, 2)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-950 text-white rounded-lg text-[9px] border-none py-1">
                                      {m.name || m.userId} ({m.role.toLowerCase()})
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                              {board.members.length > 3 && (
                                <div className="w-5.5 h-5.5 rounded-full border border-white text-[8px] font-extrabold flex items-center justify-center bg-muted text-muted-foreground shadow-xs">
                                  +{board.members.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Create New Board Dashed Card */}
                {workspace?.role !== "GUEST" && (
                  <button
                    onClick={onCreateBoard}
                    className="group bg-card text-card-foreground border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/10/10 rounded-2xl p-5 flex flex-col items-center justify-center h-full min-h-[240px] transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold shadow-xs group-hover:bg-primary/15 transition-all">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-foreground mt-3 group-hover:text-primary transition-colors">
                      Create New Board
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Start organizing your work
                    </span>
                  </button>
                )}
              </div>
            ) : (
              
              // LIST VIEW
              <div className="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Board Name</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Columns</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Tasks Summary</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Created At</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Visibility</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wide text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBoards.map((board) => {
                        const columns = board.columns || [];
                        const isFav = favorites.includes(board._id);
                        const totalBoardTasks = columns.reduce((sum, col) => {
                          return sum + (col.items?.length || col.itemCount || 0);
                        }, 0);

                        return (
                          <tr
                            key={board._id}
                            onClick={() => handleBoardClick(board._id)}
                            className="border-b border-border hover:bg-background transition-colors cursor-pointer group"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleToggleFavorite(board._id, e)}
                                  className={`p-1 rounded hover:bg-muted shrink-0 transition-colors ${
                                    isFav ? "text-amber-400" : "text-muted-foreground group-hover:text-muted-foreground"
                                  }`}
                                >
                                  <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400" : ""}`} />
                                </button>
                                <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-xs">
                                  {board.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs text-muted-foreground font-bold">
                                {columns.length} columns
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground/90">
                                  {totalBoardTasks} tasks
                                </span>
                                <div className="w-16 bg-muted h-1 rounded-full overflow-hidden">
                                  <div
                                    className="bg-primary h-full rounded-full"
                                    style={{
                                      width: totalBoardTasks > 0 ? "50%" : "0%",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground font-medium">
                              {new Date(board.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary" className="bg-muted border border-border/50 text-muted-foreground capitalize text-[10px] font-bold">
                                {board.visibility || "Workspace"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              {/* Dropdown Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-muted-foreground cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4.5 w-4.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openBoardSummary(board);
                                    }}
                                  >
                                    <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    View Board Summary
                                  </DropdownMenuItem>
                                  {(workspace?.role === "OWNER" || workspace?.role === "ADMIN") && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBoardToDelete(board._id);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Delete Board
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card text-card-foreground border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold">Delete Board</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this board? All lists, items, tasks, labels, and activity history will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border font-semibold cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (boardToDelete) {
                  await onDeleteBoard(boardToDelete);
                }
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Dialog Modal */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-[85vw]! h-[90vh]! rounded-2xl p-0 overflow-hidden bg-card text-card-foreground border-border">
          <div className="flex-1 h-full overflow-auto p-6">
            {summaryLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">Generating Summary report...</span>
              </div>
            ) : (
              <JiraSummaryPage items={summaryItems} board={summaryBoard} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
