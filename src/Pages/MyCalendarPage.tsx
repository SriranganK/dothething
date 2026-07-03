// src/Pages/MyCalendarPage.tsx
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CircleDot,
  Bug,
  Lightbulb,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  User,
  ChevronRight,
  ChevronLeft,
  Filter,
  X,
  ListTodo
} from "lucide-react";
import type { WorkspaceType, BoardType, ItemType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";

interface MyCalendarPageProps {
  user: any;
  workspace: WorkspaceType | null;
  myTasks: ItemType[];
  dummyBoard: BoardType;
  emailToNameMap: Record<string, string>;
  onCardClick: (item: ItemType) => void;
}

const typeIcons: Record<ItemTypeClass, React.ReactNode> = {
  Task: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  Bug: <Bug className="h-3.5 w-3.5 text-rose-500" />,
  Lead: <CircleDot className="h-3.5 w-3.5 text-emerald-500" />,
  Idea: <Lightbulb className="h-3.5 w-3.5 text-violet-500" />,
  Issue: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  Event: <Calendar className="h-3.5 w-3.5 text-orange-500" />,
};

const priorityColors: Record<ItemPriorityClass, string> = {
  Critical: "border-l-red-600 bg-red-50/20",
  Highest: "border-l-red-500 bg-red-50/10",
  High: "border-l-amber-500 bg-amber-50/10",
  Medium: "border-l-blue-500 bg-blue-50/10",
  Low: "border-l-zinc-300 bg-background/10",
  Lowest: "border-l-zinc-200 bg-background/5",
};

const priorityTextColors: Record<ItemPriorityClass, string> = {
  Critical: "text-red-700 bg-red-50 border-red-200",
  Highest: "text-red-600 bg-red-50 border-red-100",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Medium: "text-blue-700 bg-blue-50 border-blue-200",
  Low: "text-muted-foreground bg-muted border-border",
  Lowest: "text-muted-foreground bg-background border-border",
};

// Premium background colors for calendar grid pills
const typeThemeClasses: Record<ItemTypeClass, string> = {
  Task: "bg-blue-50/80 border-blue-150 text-blue-700 hover:bg-blue-100/90",
  Bug: "bg-rose-50/80 border-rose-150 text-rose-700 hover:bg-rose-100/90",
  Lead: "bg-emerald-50/80 border-emerald-150 text-emerald-700 hover:bg-emerald-100/90",
  Idea: "bg-violet-50/80 border-violet-150 text-violet-700 hover:bg-violet-100/90",
  Issue: "bg-amber-50/80 border-amber-150 text-amber-700 hover:bg-amber-100/90",
  Event: "bg-orange-50/80 border-orange-150 text-orange-700 hover:bg-orange-100/90",
};

// Safe local date parsing helper (ignores system timezone shifts)
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

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export function MyCalendarPage({
  _user,
  workspace,
  myTasks,
  emailToNameMap,
  onCardClick,
}: Omit<MyCalendarPageProps, "user"> & { _user?: any }) {
  // Calendar states
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");

  // Filter states
  const [typeFilter, setTypeFilter] = useState<"all" | ItemTypeClass>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ItemPriorityClass>("all");

  // State for the "more tasks" dialog overlay
  const [overlayDay, setOverlayDay] = useState<{ date: Date; tasks: ItemType[] } | null>(null);

  // 1. Filter tasks by type/priority and check that they have some date info
  const filteredTasks = useMemo(() => {
    return myTasks.filter((task) => {
      if (!task.startDate && !task.dueDate) return false;
      if (typeFilter !== "all" && task.type !== typeFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [myTasks, typeFilter, priorityFilter]);

  // Check if a task falls on a specific date
  const isTaskOnDate = (task: ItemType, day: Date) => {
    const dStart = task.startDate ? parseLocalDate(task.startDate) : null;
    const dDue = task.dueDate ? parseLocalDate(task.dueDate) : null;
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    if (dStart && dDue) {
      const start = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
      const end = new Date(dDue.getFullYear(), dDue.getMonth(), dDue.getDate());
      return target >= start && target <= end;
    }

    const singleDate = dDue || dStart;
    if (!singleDate) return false;

    return (
      singleDate.getFullYear() === target.getFullYear() &&
      singleDate.getMonth() === target.getMonth() &&
      singleDate.getDate() === target.getDate()
    );
  };

  // Generate Month cells (42 cells: previous padding + current days + next padding)
  const monthCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon...
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const today = new Date();

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        isToday: isSameDay(d, today),
      });
    }

    // Next month padding to fill exactly 42 grid cells
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
      });
    }

    return cells;
  }, [currentDate]);

  // Generate Week cells (7 cells starting from Sunday of the current date week)
  const weekCells = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    // Offset back to Sunday
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const cells: { date: Date; isToday: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      cells.push({
        date: d,
        isToday: isSameDay(d, today),
      });
    }
    return cells;
  }, [currentDate]);

  // Original Agenda Grouping
  const agendaGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const groups: {
      overdue: ItemType[];
      today: ItemType[];
      tomorrow: ItemType[];
      thisWeek: ItemType[];
      later: ItemType[];
    } = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
    };

    filteredTasks.forEach((task) => {
      const taskDateStr = task.dueDate || task.startDate;
      if (!taskDateStr) return;

      const taskDate = parseLocalDate(taskDateStr);
      if (!taskDate) return;
      taskDate.setHours(0, 0, 0, 0);

      const isDone =
        task.status?.toLowerCase().includes("done") ||
        task.status?.toLowerCase().includes("complete") ||
        task.columnId?.toLowerCase().includes("done");

      if (taskDate < today && !isDone) {
        groups.overdue.push(task);
      } else if (taskDate.getTime() === today.getTime()) {
        groups.today.push(task);
      } else if (taskDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(task);
      } else if (taskDate > tomorrow && taskDate <= endOfWeek) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    });

    const sortByDate = (a: ItemType, b: ItemType) => {
      const dateA = new Date(a.dueDate || a.startDate || 0).getTime();
      const dateB = new Date(b.dueDate || b.startDate || 0).getTime();
      return dateA - dateB;
    };

    Object.keys(groups).forEach((key) => {
      groups[key as keyof typeof groups].sort(sortByDate);
    });

    return groups;
  }, [filteredTasks]);

  const handleNavigate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const handleGoToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAssigneeText = (assigneeEmail: string) => {
    if (!assigneeEmail) return "Unassigned";
    return emailToNameMap[assigneeEmail] || assigneeEmail;
  };

  const renderAgendaCard = (task: ItemType) => {
    const isDone =
      task.status?.toLowerCase().includes("done") ||
      task.status?.toLowerCase().includes("complete") ||
      task.columnId?.toLowerCase().includes("done");

    return (
      <div
        key={task._id}
        onClick={() => onCardClick(task)}
        className={`flex items-start justify-between p-4 rounded-xl border border-border/85 bg-card text-card-foreground hover:border-border hover:shadow-md transition-all duration-200 cursor-pointer group border-l-4 ${priorityColors[task.priority] || "border-l-zinc-200"
          }`}
      >
        <div className="flex gap-3 min-w-0">
          <div className="mt-1 shrink-0">
            {typeIcons[task.type] || <CircleDot className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <h4 className={`text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h4>
            <p className="text-zinc-550 text-xs mt-1 truncate max-w-md">
              {task.description || "No description provided."}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {task.startDate && (
                <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  Start: {formatDate(task.startDate)}
                </span>
              )}
              {task.dueDate && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold border ${isDone
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                    : new Date(task.dueDate) < new Date()
                      ? 'text-red-700 bg-red-50 border-red-200 animate-pulse'
                      : 'text-muted-foreground bg-muted border-border'
                  }`}>
                  Due: {formatDate(task.dueDate)}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                <User className="h-3 w-3" />
                {getAssigneeText(task.assignee)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <Badge className={`text-[10px] font-bold border py-0.5 px-2 rounded-lg shadow-none uppercase ${priorityTextColors[task.priority]}`}>
            {task.priority}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    );
  };

  const renderGridTaskPill = (task: ItemType) => {
    const isDone =
      task.status?.toLowerCase().includes("done") ||
      task.status?.toLowerCase().includes("complete") ||
      task.columnId?.toLowerCase().includes("done");

    return (
      <div
        key={task._id}
        onClick={(e) => {
          e.stopPropagation();
          onCardClick(task);
        }}
        className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] font-medium border flex items-center gap-1 transition-all select-none hover:shadow-xs cursor-pointer ${typeThemeClasses[task.type] || "bg-background border-border text-foreground"
          } ${isDone ? "opacity-50 line-through" : ""}`}
      >
        {isDone ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
        ) : (
          typeIcons[task.type]
        )}
        <span className="truncate">{task.title}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background select-none relative">
      {/* Top Header & Navigation */}
      <div className="bg-card text-card-foreground border-b border-border px-6 py-4 shrink-0 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Month navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              {workspace?.name ? `${workspace.name} Calendar` : "Calendar"}
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
              className="text-foreground/90 hover:text-foreground font-bold px-2.5 rounded-md text-xs hover:bg-card text-card-foreground shadow-none border-none"
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
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
              className="bg-transparent border-none outline-none font-bold text-primary cursor-pointer text-[11px] ml-1"
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
              className="bg-transparent border-none outline-none font-bold text-primary cursor-pointer text-[11px] ml-1"
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

        {/* Right Side: View modes */}
        <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/60 shadow-inner">
          <Button
            variant={viewMode === "month" ? "outline" : "ghost"}
            size="xs"
            onClick={() => setViewMode("month")}
            className={`text-xs font-semibold px-3 py-1 shadow-none ${viewMode === "month" ? "bg-card text-card-foreground text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Month
          </Button>
          <Button
            variant={viewMode === "week" ? "outline" : "ghost"}
            size="xs"
            onClick={() => setViewMode("week")}
            className={`text-xs font-semibold px-3 py-1 shadow-none ${viewMode === "week" ? "bg-card text-card-foreground text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "agenda" ? "outline" : "ghost"}
            size="xs"
            onClick={() => setViewMode("agenda")}
            className={`text-xs font-semibold px-3 py-1 shadow-none ${viewMode === "agenda" ? "bg-card text-card-foreground text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Agenda
          </Button>
        </div>
      </div>

      {/* Main Calendar View Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 flex flex-col min-h-0">

        {/* MONTH VIEW */}
        {viewMode === "month" && (
          <div className="flex-1 flex flex-col min-h-[500px] border border-border rounded-2xl overflow-hidden bg-card text-card-foreground shadow-xs">
            {/* Days header row */}
            <div className="grid grid-cols-7 border-b border-border bg-background/80 py-2.5 select-none text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <span key={dayName} className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                  {dayName}
                </span>
              ))}
            </div>

            {/* Grid cells */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-zinc-150">
              {monthCells.map((cell, index) => {
                const dayTasks = filteredTasks.filter((task) => isTaskOnDate(task, cell.date));
                const maxVisibleTasks = 3;
                const visibleTasks = dayTasks.slice(0, maxVisibleTasks);
                const hiddenCount = dayTasks.length - maxVisibleTasks;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (dayTasks.length > 0) {
                        setOverlayDay({ date: cell.date, tasks: dayTasks });
                      }
                    }}
                    className={`p-1.5 flex flex-col group relative transition-colors hover:bg-muted/50 min-h-0 cursor-pointer ${cell.isCurrentMonth ? "bg-card text-card-foreground" : "bg-background text-zinc-450"
                      }`}
                  >
                    {/* Day number with circle highlight */}
                    <div className="flex justify-end items-center mb-1 select-none">
                      <span
                        className={`text-xs font-extrabold flex items-center justify-center rounded-full transition-all ${cell.isToday
                            ? "bg-primary text-white w-6 h-6 shadow-xs font-bold"
                            : cell.isCurrentMonth
                              ? "text-foreground hover:bg-muted w-6 h-6"
                              : "text-muted-foreground w-6 h-6"
                          }`}
                      >
                        {cell.date.getDate()}
                      </span>
                    </div>

                    {/* Stacked Tasks list */}
                    <div className="flex-1 space-y-1 overflow-hidden min-h-0">
                      {visibleTasks.map(renderGridTaskPill)}
                    </div>

                    {/* More tasks label */}
                    {hiddenCount > 0 && (
                      <div
                        className="mt-1 text-[10px] font-bold text-primary group-hover:text-indigo-850 text-left px-1 py-0.5 rounded w-fit transition-colors shrink-0"
                      >
                        + {hiddenCount} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === "week" && (
          <div className="flex-1 grid grid-cols-7 border border-border rounded-2xl overflow-hidden bg-card text-card-foreground shadow-xs min-h-[500px]">
            {weekCells.map((cell, index) => {
              const dayTasks = filteredTasks.filter((task) => isTaskOnDate(task, cell.date));

              return (
                <div
                  key={index}
                  className={`flex flex-col border-r border-border last:border-r-0 hover:bg-background/30 transition-colors ${cell.isToday ? "bg-primary/10/10" : ""
                    }`}
                >
                  {/* Column Header */}
                  <div className={`p-4 border-b border-border text-center flex flex-col items-center select-none ${cell.isToday ? "bg-primary/10/20" : "bg-muted/50"
                    }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      {cell.date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={`text-lg font-extrabold flex items-center justify-center rounded-full mt-1.5 ${cell.isToday
                        ? "bg-primary text-white w-8 h-8 shadow-xs"
                        : "text-foreground"
                      }`}>
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-4">
                        <span className="text-[10px] text-muted-foreground font-semibold select-none">No Tasks</span>
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const isDone =
                          task.status?.toLowerCase().includes("done") ||
                          task.status?.toLowerCase().includes("complete") ||
                          task.columnId?.toLowerCase().includes("done");

                        return (
                          <div
                            key={task._id}
                            onClick={() => onCardClick(task)}
                            className={`p-3 rounded-xl border border-border bg-card text-card-foreground hover:border-border hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col gap-2 ${priorityColors[task.priority] || "border-l-zinc-200"
                              } border-l-4`}
                          >
                            <div className="flex gap-2">
                              <span className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-650" />
                                ) : (
                                  typeIcons[task.type]
                                )}
                              </span>
                              <h4 className={`text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate ${isDone ? "line-through text-muted-foreground" : ""
                                }`}>
                                {task.title}
                              </h4>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className={`text-[9px] font-bold border py-0.5 px-1.5 rounded w-fit ${priorityTextColors[task.priority]}`}>
                                {task.priority}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                                <User className="h-2.5 w-2.5" />
                                {getAssigneeText(task.assignee)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AGENDA VIEW */}
        {viewMode === "agenda" && (
          <div className="max-w-4xl mx-auto w-full space-y-8">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-8 max-w-lg mx-auto mt-8">
                <ListTodo className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-bold text-foreground">No scheduled tasks</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  No tasks match your filter criteria or have start/due dates in this workspace.
                </p>
              </div>
            ) : (
              <>
                {/* Overdue */}
                {agendaGroups.overdue.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-655">Overdue</h3>
                      <Badge className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg shadow-none">
                        {agendaGroups.overdue.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {agendaGroups.overdue.map(renderAgendaCard)}
                    </div>
                  </div>
                )}

                {/* Today */}
                {agendaGroups.today.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">Today</h3>
                      <Badge className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg shadow-none">
                        {agendaGroups.today.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {agendaGroups.today.map(renderAgendaCard)}
                    </div>
                  </div>
                )}

                {/* Tomorrow */}
                {agendaGroups.tomorrow.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-zinc-500" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground/90">Tomorrow</h3>
                      <Badge className="bg-muted border border-border text-foreground/90 text-[10px] font-bold rounded-lg shadow-none">
                        {agendaGroups.tomorrow.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {agendaGroups.tomorrow.map(renderAgendaCard)}
                    </div>
                  </div>
                )}

                {/* This Week */}
                {agendaGroups.thisWeek.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-zinc-400" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Upcoming (Next 7 Days)</h3>
                      <Badge className="bg-muted border border-border text-muted-foreground text-[10px] font-bold rounded-lg shadow-none">
                        {agendaGroups.thisWeek.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {agendaGroups.thisWeek.map(renderAgendaCard)}
                    </div>
                  </div>
                )}

                {/* Later */}
                {agendaGroups.later.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-550">Later</h3>
                      <Badge className="bg-background border border-border text-zinc-550 text-[10px] font-bold rounded-lg shadow-none">
                        {agendaGroups.later.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {agendaGroups.later.map(renderAgendaCard)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* OVERLAY POPUP FOR MORE TASKS */}
      {overlayDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
          <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[500px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4 shrink-0 bg-background">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {overlayDay.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </h3>
                <p className="text-[10px] text-zinc-555 font-semibold mt-0.5">{overlayDay.tasks.length} Scheduled items</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setOverlayDay(null);
                }}
                className="text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {overlayDay.tasks.map((task) => {
                const isDone =
                  task.status?.toLowerCase().includes("done") ||
                  task.status?.toLowerCase().includes("complete") ||
                  task.columnId?.toLowerCase().includes("done");

                return (
                  <div
                    key={task._id}
                    onClick={() => {
                      setOverlayDay(null);
                      onCardClick(task);
                    }}
                    className={`flex items-start justify-between p-3.5 rounded-xl border border-border hover:border-border hover:shadow-xs transition-all duration-200 cursor-pointer group border-l-4 ${priorityColors[task.priority] || "border-l-zinc-200"
                      } bg-card text-card-foreground`}
                  >
                    <div className="flex gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-650" />
                        ) : (
                          typeIcons[task.type]
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate ${isDone ? "line-through text-muted-foreground" : ""
                          }`}>
                          {task.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                          {task.description || "No description provided."}
                        </p>
                        <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 mt-1.5">
                          <User className="h-2.5 w-2.5" />
                          {getAssigneeText(task.assignee)}
                        </span>
                      </div>
                    </div>
                    <Badge className={`text-[9px] font-bold border py-0.5 px-1.5 rounded shadow-none uppercase shrink-0 ${priorityTextColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
