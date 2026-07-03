// src/Pages/MyTimelinePage.tsx
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CircleDot,
  Bug,
  Lightbulb,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  User,
  ChevronRight,
  ChevronLeft,
  Filter
} from "lucide-react";
import type { WorkspaceType, BoardType, ItemType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";

interface MyTimelinePageProps {
  user: any;
  workspace: WorkspaceType | null;
  myTasks: ItemType[];
  dummyBoard: BoardType;
  emailToNameMap: Record<string, string>;
  onCardClick: (item: ItemType) => void;
}

const typeIcons: Record<ItemTypeClass, React.ReactNode> = {
  Task: <CircleDot className="h-4 w-4 text-blue-500" />,
  Bug: <Bug className="h-4 w-4 text-rose-500" />,
  Lead: <CircleDot className="h-4 w-4 text-emerald-500" />,
  Idea: <Lightbulb className="h-4 w-4 text-violet-500" />,
  Issue: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  Event: <Calendar className="h-4 w-4 text-orange-500" />,
};

const priorityColors: Record<ItemPriorityClass, string> = {
  Critical: "border-l-red-600",
  Highest: "border-l-red-500",
  High: "border-l-amber-500",
  Medium: "border-l-blue-500",
  Low: "border-l-zinc-300",
  Lowest: "border-l-zinc-200",
};

const priorityTextColors: Record<ItemPriorityClass, string> = {
  Critical: "text-red-700 bg-red-50 border-red-200",
  Highest: "text-red-600 bg-red-50 border-red-100",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Medium: "text-blue-700 bg-blue-50 border-blue-200",
  Low: "text-muted-foreground bg-muted border-border",
  Lowest: "text-muted-foreground bg-background border-border",
};

// Premium gradient bar styles for timeline pills
const typePillThemeClasses: Record<ItemTypeClass, { bar: string; border: string }> = {
  Task: {
    bar: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/20",
    border: "border-blue-300"
  },
  Bug: {
    bar: "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-rose-500/20",
    border: "border-rose-300"
  },
  Lead: {
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20",
    border: "border-emerald-300"
  },
  Idea: {
    bar: "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-violet-500/20",
    border: "border-violet-300"
  },
  Issue: {
    bar: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20",
    border: "border-amber-300"
  },
  Event: {
    bar: "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-orange-500/20",
    border: "border-orange-300"
  },
};

// Safe local date parsing helper
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return null;
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

export function MyTimelinePage({
  _user,
  workspace,
  myTasks,
  emailToNameMap,
  onCardClick,
}: Omit<MyTimelinePageProps, "user"> & { _user?: any }) {
  // Navigation & Zoom states
  const [pivotDate, setPivotDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [zoom, setZoom] = useState<"Week" | "Month" | "Quarter">("Month");

  // Filter states
  const [typeFilter, setTypeFilter] = useState<"all" | ItemTypeClass>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ItemPriorityClass>("all");

  // 1. Filter tasks that have BOTH a start date and a due date
  const baseRangedTasks = useMemo(() => {
    return myTasks.filter((task) => task.startDate && task.dueDate);
  }, [myTasks]);

  // Apply visual filters
  const filteredTasks = useMemo(() => {
    return baseRangedTasks.filter((task) => {
      if (typeFilter !== "all" && task.type !== typeFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [baseRangedTasks, typeFilter, priorityFilter]);

  // Calculate duration in days between startDate and dueDate
  const getTaskDuration = (task: ItemType) => {
    if (!task.startDate || !task.dueDate) return 0;
    const start = parseLocalDate(task.startDate);
    const end = parseLocalDate(task.dueDate);
    if (!start || !end) return 0;
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return diffDays;
  };

  // Sort tasks by start date ascending
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.startDate || 0).getTime();
      const dateB = new Date(b.startDate || 0).getTime();
      return dateA - dateB;
    });
  }, [filteredTasks]);

  // Calculate timeline start/end dates and columns based on zoom level and pivotDate
  const { startDate, endDate, columns } = useMemo(() => {
    const start = new Date(pivotDate);
    const cols: { label: string; sublabel: string; date: Date }[] = [];

    if (zoom === "Week") {
      // 14 days columns
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 14);
      end.setHours(23, 59, 59, 999);

      for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cols.push({
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          sublabel: d.getDate().toString(),
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    } else if (zoom === "Month") {
      // Current Month columns
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const totalDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const end = new Date(start.getFullYear(), start.getMonth(), totalDays, 23, 59, 59, 999);

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cols.push({
          label: d.toLocaleDateString("en-US", { weekday: "narrow" }), // e.g. M, T, W
          sublabel: d.getDate().toString(),
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    } else {
      // Quarter Zoom: 12 weeks columns (84 days)
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 12 * 7);
      end.setHours(23, 59, 59, 999);

      for (let i = 0; i < 12; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        cols.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          sublabel: `W${i + 1}`,
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    }
  }, [pivotDate, zoom]);

  // Navigate pivot dates
  const handleNavigate = (direction: "prev" | "next") => {
    const newDate = new Date(pivotDate);
    if (zoom === "Week") {
      newDate.setDate(pivotDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (zoom === "Month") {
      newDate.setMonth(pivotDate.getMonth() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setMonth(pivotDate.getMonth() + (direction === "next" ? 3 : -3));
    }
    setPivotDate(newDate);
  };

  const handleGoToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setPivotDate(d);
  };

  // Calculate left and width percentages for milestone task bars
  const getBarMetrics = (task: ItemType) => {
    if (!task.startDate || !task.dueDate) return { show: false, left: 0, width: 0 };

    const taskStart = parseLocalDate(task.startDate);
    const taskEnd = parseLocalDate(task.dueDate);
    if (!taskStart || !taskEnd) return { show: false, left: 0, width: 0 };

    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(23, 59, 59, 999);

    const rangeStart = startDate.getTime();
    const rangeEnd = endDate.getTime();
    const rangeDuration = rangeEnd - rangeStart;

    const barStart = taskStart.getTime();
    const barEnd = taskEnd.getTime();

    // Out of range check
    if (barEnd < rangeStart || barStart > rangeEnd) {
      return { show: false, left: 0, width: 0, isOut: true };
    }

    const visibleStart = Math.max(barStart, rangeStart);
    const visibleEnd = Math.min(barEnd, rangeEnd);

    const left = ((visibleStart - rangeStart) / rangeDuration) * 100;
    const width = ((visibleEnd - visibleStart) / rangeDuration) * 100;

    return {
      show: true,
      left,
      width: Math.max(width, 1.5),
      isClippedStart: barStart < rangeStart,
      isClippedEnd: barEnd > rangeEnd,
    };
  };

  // Red line indicator offset for today
  const todayMarkerOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const time = today.getTime();
    const start = startDate.getTime();
    const end = endDate.getTime();

    if (time >= start && time <= end) {
      return ((time - start) / (end - start)) * 100;
    }
    return null;
  }, [startDate, endDate]);

  const getAssigneeText = (assigneeEmail: string) => {
    if (!assigneeEmail) return "Unassigned";
    return emailToNameMap[assigneeEmail] || assigneeEmail;
  };

  const hasAnyTasks = sortedTasks.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background relative select-none">

      {/* Page Header */}
      <div className="bg-card text-card-foreground border-b border-border px-6 py-4 shrink-0 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Navigation and Date */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
              </svg>
            </span>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              {workspace?.name ? `${workspace.name} Timeline` : "Timeline"}
            </h1>
          </div>

          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleNavigate("prev")}
              className="text-muted-foreground hover:text-foreground rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleGoToday}
              className="text-foreground/90 hover:text-foreground font-bold px-2.5 rounded-md text-xs hover:bg-card text-card-foreground border-none shadow-none"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleNavigate("next")}
              className="text-muted-foreground hover:text-foreground rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-sm font-extrabold text-foreground capitalize tracking-tight px-1">
            {zoom === "Week" && "Week View"}
            {zoom === "Month" && pivotDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            {zoom === "Quarter" && `Q - Starting ${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
          </span>
        </div>

        {/* Center: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-card text-card-foreground border border-border px-2 py-1 rounded-lg">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent border-none outline-none font-bold text-indigo-655 cursor-pointer text-[11px] ml-1"
            >
              <option value="all">All</option>
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Lead">Lead</option>
              <option value="Idea">Idea</option>
              <option value="Issue">Issue</option>
              <option value="Event">Event</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-card text-card-foreground border border-border px-2 py-1 rounded-lg">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent border-none outline-none font-bold text-indigo-655 cursor-pointer text-[11px] ml-1"
            >
              <option value="all">All</option>
              <option value="Critical">Critical</option>
              <option value="Highest">Highest</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Lowest">Lowest</option>
            </select>
          </div>
        </div>

        {/* Right: Zoom level toggles */}
        <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/60 shadow-inner">
          {["Week", "Month", "Quarter"].map((z) => (
            <Button
              key={z}
              variant={zoom === z ? "outline" : "ghost"}
              size="xs"
              onClick={() => setZoom(z as any)}
              className={`text-xs font-semibold px-3 py-1 shadow-none ${zoom === z ? "bg-card text-card-foreground text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {z}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content scroll area */}
      <div className="flex-1 overflow-hidden p-6">
        {!hasAnyTasks ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8 max-w-lg mx-auto mt-8">
            <Clock className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">No range timeline tasks</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              None of your tasks in this workspace have both a start date and a due date assigned, or match your filter criteria. Edit a task to assign a range to build your timeline!
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col border border-border rounded-2xl overflow-hidden bg-card text-card-foreground shadow-xs">

            {/* Split layout: Sidebar left + scrollable Timeline right */}
            <div className="flex-1 flex min-h-0 relative">

              {/* Left sidebar: Task labels (Frozen) */}
              <div className="w-80 border-r border-border flex-shrink-0 flex flex-col bg-muted/50 min-h-0 select-none z-10">
                {/* Sidebar Header */}
                <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Tasks</span>
                  <Badge className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg shadow-none px-2 py-0.5">
                    {sortedTasks.length} Ranged
                  </Badge>
                </div>
                {/* Sidebar Task List */}
                <div className="flex-1 overflow-y-hidden divide-y divide-zinc-150">
                  {sortedTasks.map((task) => {
                    const isDone =
                      task.status?.toLowerCase().includes("done") ||
                      task.status?.toLowerCase().includes("complete") ||
                      task.columnId?.toLowerCase().includes("done");

                    return (
                      <div
                        key={task._id}
                        onClick={() => onCardClick(task)}
                        className={`h-14 px-4 flex flex-col justify-center hover:bg-muted/60 cursor-pointer transition-colors border-l-4 ${priorityColors[task.priority] || "border-l-transparent"
                          }`}
                      >
                        <div className="flex items-center justify-between min-w-0 pr-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                typeIcons[task.type]
                              )}
                            </span>
                            <span className={`text-xs font-bold text-foreground truncate ${isDone ? "line-through text-muted-foreground" : ""
                              }`}>
                              {task.title}
                            </span>
                          </div>

                          <Badge className={`text-[8px] font-bold border rounded px-1 shrink-0 ${priorityTextColors[task.priority]}`}>
                            {task.priority[0]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 pl-5 text-[9px] text-muted-foreground font-semibold">
                          <User className="h-2.5 w-2.5" />
                          <span>{getAssigneeText(task.assignee)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right timeline grid (Scrollable) */}
              <div className="flex-1 overflow-auto flex flex-col relative min-w-0">
                {/* Timeline content width wrapper */}
                <div className="w-full min-w-[900px] flex flex-col h-full relative">

                  {/* Timeline Header (dates) */}
                  <div className="h-14 border-b border-border bg-background/70 backdrop-blur-xs flex flex-shrink-0 relative z-10">
                    {columns.map((col, index) => (
                      <div
                        key={index}
                        className="flex-1 border-r border-border last:border-r-0 flex flex-col items-center justify-center py-1.5 select-none"
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          {col.label}
                        </span>
                        <span className="text-xs font-extrabold text-foreground/90 mt-0.5">
                          {col.sublabel}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Timeline Grid Body */}
                  <div className="flex-1 relative min-h-0 overflow-y-hidden select-none">

                    {/* Background Grid columns */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((_, index) => (
                        <div key={index} className="flex-1 border-r border-border last:border-r-0 h-full" />
                      ))}
                    </div>

                    {/* Today vertical line marker */}
                    {todayMarkerOffset !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{ left: `${todayMarkerOffset}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 shadow-md" />
                      </div>
                    )}

                    {/* Rows with horizontal bar capsules */}
                    <div className="divide-y divide-zinc-150">
                      {sortedTasks.map((task) => {
                        const metrics = getBarMetrics(task);
                        const duration = getTaskDuration(task);
                        const isDone =
                          task.status?.toLowerCase().includes("done") ||
                          task.status?.toLowerCase().includes("complete") ||
                          task.columnId?.toLowerCase().includes("done");

                        const theme = typePillThemeClasses[task.type] || {
                          bar: "bg-zinc-500 text-white",
                          border: "border-border"
                        };

                        return (
                          <div
                            key={task._id}
                            className="h-14 relative flex items-center hover:bg-background"
                          >
                            {metrics.show && (
                              <div
                                onClick={() => onCardClick(task)}
                                className={`absolute h-7 rounded-lg px-2 flex items-center justify-between border text-[10px] font-bold shadow-xs cursor-pointer select-none transition-all hover:scale-[1.01] hover:shadow-md ${isDone
                                    ? "bg-muted border-border text-muted-foreground line-through opacity-70"
                                    : `${theme.bar} ${theme.border}`
                                  }`}
                                style={{
                                  left: `${metrics.left}%`,
                                  width: `${metrics.width}%`,
                                }}
                              >
                                <span className="truncate pr-2">
                                  {task.title}
                                </span>
                                <span className="shrink-0 text-[9px] opacity-90 font-extrabold bg-black/10 px-1 py-0.5 rounded">
                                  {duration}d
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
