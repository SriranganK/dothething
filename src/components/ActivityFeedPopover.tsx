// src/components/ActivityFeedPopover.tsx
import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  FileText,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Tag,
  Activity as ActivityIcon,
  Search,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
  workspaceId: string | undefined;
  activities: any[];
  isLoading?: boolean;
}

function getRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "Some time ago";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getActionInfo(act: any) {
  const title = act.metadata?.taskTitle || act.metadata?.itemName || "a task";
  switch (act.actionType) {
    case "TASK_CREATED":
      return {
        text: `created task "${title}"`,
        colorClass: "bg-pink-100 text-pink-600 border-pink-200",
        icon: <PlusCircle className="h-3.5 w-3.5" />,
        badge: "Created",
        badgeClass: "bg-pink-50 text-pink-600 border-pink-100",
      };
    case "STATUS_CHANGED":
      return {
        text: `moved "${title}" → ${act.newValue || "new status"}`,
        colorClass: "bg-violet-100 text-violet-600 border-violet-200",
        icon: <FileText className="h-3.5 w-3.5" />,
        badge: "Status",
        badgeClass: "bg-violet-50 text-violet-600 border-violet-100",
      };
    case "TASK_ASSIGNED":
      return {
        text: `assigned "${title}" to ${act.newValue || "a member"}`,
        colorClass: "bg-amber-100 text-amber-600 border-amber-200",
        icon: <Users className="h-3.5 w-3.5" />,
        badge: "Assigned",
        badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
      };
    case "TASK_UNASSIGNED":
      return {
        text: `unassigned "${title}"`,
        colorClass: "bg-orange-100 text-orange-600 border-orange-200",
        icon: <Users className="h-3.5 w-3.5" />,
        badge: "Unassigned",
        badgeClass: "bg-orange-50 text-orange-600 border-orange-100",
      };
    case "COMMENT_ADDED":
      return {
        text: `commented on "${title}"`,
        colorClass: "bg-emerald-100 text-emerald-600 border-emerald-200",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        badge: "Comment",
        badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
      };
    case "TASK_DELETED":
      return {
        text: `deleted task "${title}"`,
        colorClass: "bg-red-100 text-red-600 border-red-200",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        badge: "Deleted",
        badgeClass: "bg-red-50 text-red-600 border-red-100",
      };
    case "LABEL_ADDED":
      return {
        text: `added label to "${title}"`,
        colorClass: "bg-teal-100 text-teal-600 border-teal-200",
        icon: <Tag className="h-3.5 w-3.5" />,
        badge: "Label",
        badgeClass: "bg-teal-50 text-teal-600 border-teal-100",
      };
    case "MEMBER_ADDED":
      return {
        text: `added a new member to the workspace`,
        colorClass: "bg-cyan-100 text-cyan-600 border-cyan-200",
        icon: <Users className="h-3.5 w-3.5" />,
        badge: "Member",
        badgeClass: "bg-cyan-50 text-cyan-600 border-cyan-100",
      };
    case "PRIORITY_CHANGED":
      return {
        text: `changed priority of "${title}" → ${act.newValue || ""}`,
        colorClass: "bg-blue-100 text-blue-600 border-blue-200",
        icon: <FileText className="h-3.5 w-3.5" />,
        badge: "Priority",
        badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      };
    case "DUE_DATE_CHANGED":
      return {
        text: `updated due date of "${title}"`,
        colorClass: "bg-indigo-100 text-indigo-600 border-indigo-200",
        icon: <Clock className="h-3.5 w-3.5" />,
        badge: "Due Date",
        badgeClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
      };
    case "TITLE_CHANGED":
      return {
        text: `renamed a task to "${act.newValue || title}"`,
        colorClass: "bg-violet-100 text-violet-600 border-violet-200",
        icon: <FileText className="h-3.5 w-3.5" />,
        badge: "Renamed",
        badgeClass: "bg-violet-50 text-violet-600 border-violet-100",
      };
    default:
      return {
        text: `updated "${title}"`,
        colorClass: "bg-blue-100 text-blue-600 border-blue-200",
        icon: <Clock className="h-3.5 w-3.5" />,
        badge: "Update",
        badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      };
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
];

function getAvatarColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

export function ActivityFeedPopover({ children, activities, isLoading }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");

  const uniqueUsers = useMemo(() => {
    const names = activities
      .map((a) => a.actorId?.name || a.actorId?.email?.split("@")[0] || "Someone")
      .filter(Boolean);
    return [...new Set(names)];
  }, [activities]);

  const enrichedActivities = useMemo(() => {
    return activities.map((act) => {
      const actorName = act.actorId?.name || act.actorId?.email?.split("@")[0] || "Someone";
      const info = getActionInfo(act);
      const time = getRelativeTime(act.createdAt);
      const title = act.metadata?.taskTitle || act.metadata?.itemName || "";
      return { ...act, actorName, info, time, title };
    });
  }, [activities]);

  const filtered = useMemo(() => {
    return enrichedActivities.filter((act) => {
      const matchUser = filterUser === "all" || act.actorName === filterUser;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        act.actorName.toLowerCase().includes(q) ||
        act.title.toLowerCase().includes(q) ||
        act.info.text.toLowerCase().includes(q);
      return matchUser && matchSearch;
    });
  }, [enrichedActivities, filterUser, search]);

  // Stats
  const totalActivities = activities.length;
  const uniqueContributors = uniqueUsers.length;
  const createdCount = activities.filter((a) => a.actionType === "TASK_CREATED").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[520px] p-0 border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-white/80" />
              <h3 className="font-bold text-white text-sm">Workspace Activity</h3>
            </div>
            <span className="text-xs text-white/70">{totalActivities} total events</span>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-xl font-extrabold text-white">{totalActivities}</p>
              <p className="text-[10px] text-white/70 mt-0.5 font-medium uppercase tracking-wider">Events</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-xl font-extrabold text-white">{uniqueContributors}</p>
              <p className="text-[10px] text-white/70 mt-0.5 font-medium uppercase tracking-wider">Contributors</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-xl font-extrabold text-white">{createdCount}</p>
              <p className="text-[10px] text-white/70 mt-0.5 font-medium uppercase tracking-wider">Created</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 bg-zinc-50/80 border-b border-zinc-100">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs border-zinc-200 bg-white rounded-lg focus-visible:ring-indigo-500"
            />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="h-8 text-xs w-[130px] border-zinc-200 bg-white rounded-lg">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All users</SelectItem>
              {uniqueUsers.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity List */}
        <ScrollArea className="h-[340px]">
          <div className="px-4 py-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-zinc-200 rounded w-3/4" />
                    <div className="h-2 bg-zinc-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ActivityIcon className="h-10 w-10 text-zinc-200 mb-3" />
                <p className="text-sm font-medium text-zinc-400">No activity found</p>
                <p className="text-xs text-zinc-300 mt-1">
                  {search || filterUser !== "all" ? "Try adjusting your filters" : "Actions on boards will appear here"}
                </p>
              </div>
            ) : (
              filtered.map((act) => (
                <div
                  key={act._id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all group"
                >
                  {/* Actor avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${getAvatarColor(act.actorName)}`}>
                    {getInitials(act.actorName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-700 leading-snug">
                          <span className="font-bold text-zinc-900">{act.actorName}</span>{" "}
                          {act.info.text}
                        </p>
                      </div>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${act.info.colorClass}`}>
                        {act.info.icon}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        className={`text-[9px] font-bold px-1.5 py-0 border shadow-none rounded-md ${act.info.badgeClass}`}
                      >
                        {act.info.badge}
                      </Badge>
                      <span className="text-[10px] text-zinc-400">{act.time}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50 text-center">
          <span className="text-[10px] text-zinc-400">
            Showing {filtered.length} of {totalActivities} events
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
