import { useState, useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setActiveView } from "@/store/slices/uiSlice";
import { useGetMilestonesQuery } from "@/store/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListTodo,
  Plus,
} from "lucide-react";
import type { WorkspaceType } from "@/types/workspace";

interface TimelinePageProps {
  workspace: WorkspaceType | null;
}

type ZoomLevel = "Week" | "Month" | "Quarter";

export function TimelinePage({ workspace }: TimelinePageProps) {
  const dispatch = useAppDispatch();
  const workspaceId = workspace?._id || "";

  // Query milestones
  const { data: milestonesData, isLoading } = useGetMilestonesQuery(workspaceId, {
    skip: !workspaceId,
  });
  const milestones = milestonesData?.milestones || [];

  // Pivot Date state (defaults to today's start)
  const [pivotDate, setPivotDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Zoom Level state
  const [zoom, setZoom] = useState<ZoomLevel>("Month");

  // Calculate timeline start and end dates based on zoom and pivotDate
  const { startDate, endDate, columns } = useMemo(() => {
    const start = new Date(pivotDate);
    const cols: { label: string; sublabel: string; date: Date }[] = [];

    if (zoom === "Week") {
      // 14 days starting from pivotDate (usually start of current week)
      // Adjust start to the previous Monday to make it look clean
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);

      const end = new Date(start);
      end.setDate(start.getDate() + 14);

      for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
        const numLabel = d.getDate().toString();
        cols.push({
          label: dayLabel,
          sublabel: numLabel,
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    } else if (zoom === "Month") {
      // 8 weeks starting from the pivot date (usually start of the current month)
      start.setDate(1); // Set to start of month
      const end = new Date(start);
      end.setDate(start.getDate() + 8 * 7); // 56 days later

      for (let i = 0; i < 8; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
        const weekLabel = `W${i + 1}`;
        cols.push({
          label: monthLabel,
          sublabel: `${weekLabel} (${d.getDate()})`,
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    } else {
      // Quarter Zoom: 6 months starting from current month
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 6);

      for (let i = 0; i < 6; i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        const monthLabel = d.toLocaleDateString("en-US", { month: "long" });
        const yearLabel = d.getFullYear().toString();
        cols.push({
          label: monthLabel,
          sublabel: yearLabel,
          date: d,
        });
      }

      return { startDate: start, endDate: end, columns: cols };
    }
  }, [pivotDate, zoom]);

  // Navigate pivot date forward or backward
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

  // Split milestones into scheduled (having start or due date) and unscheduled
  const { scheduledMilestones, unscheduledMilestones } = useMemo(() => {
    const scheduled: typeof milestones = [];
    const unscheduled: typeof milestones = [];

    milestones.forEach((m) => {
      if (m.start_date || m.due_date) {
        scheduled.push(m);
      } else {
        unscheduled.push(m);
      }
    });

    return { scheduledMilestones: scheduled, unscheduledMilestones: unscheduled };
  }, [milestones]);

  // Calculate coordinates for milestone bars
  const getBarMetrics = (startStr: string | null, dueStr: string | null) => {
    if (!startStr && !dueStr) return { show: false, left: 0, width: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msStart = startStr
      ? new Date(startStr)
      : dueStr
        ? new Date(new Date(dueStr).getTime() - 7 * 24 * 60 * 60 * 1000)
        : today;
    const msDue = dueStr
      ? new Date(dueStr)
      : startStr
        ? new Date(new Date(startStr).getTime() + 7 * 24 * 60 * 60 * 1000)
        : today;

    const rangeStart = startDate.getTime();
    const rangeEnd = endDate.getTime();
    const rangeDuration = rangeEnd - rangeStart;

    const barStart = msStart.getTime();
    const barEnd = msDue.getTime();

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
      width: Math.max(width, 2), // Ensure at least 2% width
      isClippedStart: barStart < rangeStart,
      isClippedEnd: barEnd > rangeEnd,
      isAutoStart: !startStr,
      isAutoDue: !dueStr,
    };
  };

  // Helper to check if "Today" is in range
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Archived":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-purple-50 text-purple-700 border-purple-100";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Top Header */}
      <div className="bg-card text-card-foreground border-b border-border px-8 py-5 shrink-0 select-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span>Milestones Roadmap</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Visualize release timelines, check objectives, and track deliverable targets.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Navigation buttons */}
            <div className="flex items-center border border-border rounded-xl bg-background p-0.5 shadow-xs">
              <button
                onClick={() => handleNavigate("prev")}
                className="p-1.5 hover:bg-card text-card-foreground rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleGoToday}
                className="px-3 py-1 text-xs font-bold text-foreground/90 hover:text-primary cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => handleNavigate("next")}
                className="p-1.5 hover:bg-card text-card-foreground rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom selector */}
            <div className="flex gap-1 border border-border rounded-xl bg-background p-1 shadow-xs ml-auto md:ml-0">
              {(["Week", "Month", "Quarter"] as ZoomLevel[]).map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${zoom === z
                      ? "bg-card text-card-foreground text-primary shadow-xs border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Range display */}
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary opacity-80" />
          <span>
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            —{" "}
            {endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Main Roadmap Area */}
      <div className="flex-1 p-8 space-y-6 min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card text-card-foreground border border-border rounded-2xl">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-muted-foreground text-sm font-semibold">Loading roadmap...</span>
          </div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 bg-card text-card-foreground rounded-2xl p-8">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Milestones Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Please create a milestone in the Milestones tab and configure dates to view it on the roadmap.
            </p>
            <Button
              onClick={() => dispatch(setActiveView({ type: "milestones" }))}
              className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold px-4 h-9 cursor-pointer"
            >
              Go to Milestones
            </Button>
          </div>
        ) : (
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col">

            {/* Timeline Header Row */}
            <div className="flex border-b border-border select-none bg-muted/50">
              {/* Left spacer column for labels */}
              <div className="w-64 border-r border-border px-5 py-4 flex items-center font-bold text-xs uppercase text-muted-foreground tracking-wider">
                Workspace Milestones
              </div>

              {/* Right timeline grid columns */}
              <div className="flex-1 grid relative divide-x divide-zinc-150" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                {columns.map((col, idx) => (
                  <div key={idx} className="px-2 py-3 text-center flex flex-col items-center justify-center min-w-0">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-tight leading-tight">
                      {col.label}
                    </span>
                    <span className="text-xs font-bold text-foreground/90 leading-normal mt-0.5">
                      {col.sublabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Grid Body */}
            <div className="flex flex-col divide-y divide-zinc-100 relative min-h-60">

              {/* Vertical Today line marker */}
              {todayMarkerOffset !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none flex flex-col items-center"
                  style={{ left: `calc(16rem + (100% - 16rem) * ${todayMarkerOffset / 100})` }}
                >
                  <span className="bg-red-500 text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded shadow-sm absolute -top-1 translate-y-[-100%] leading-none whitespace-nowrap">
                    TODAY
                  </span>
                </div>
              )}

              {/* Rows */}
              {scheduledMilestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs italic text-center w-full">
                  No scheduled milestones fall within this timeline view.
                  <p className="text-[10px] mt-1 text-muted-foreground max-w-xs not-italic">
                    Try shifting the date range using the buttons above, switching zoom level, or scheduling the unscheduled milestones below.
                  </p>
                </div>
              ) : (
                scheduledMilestones.map((m) => {
                  const progress = m.stats?.progress || 0;
                  const total = m.stats?.total || 0;
                  const completed = m.stats?.completed || 0;
                  const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== "Completed";
                  const metrics = getBarMetrics(m.start_date, m.due_date);

                  return (
                    <div
                      key={m._id}
                      onClick={() => dispatch(setActiveView({ type: "milestone-details", milestoneId: m._id }))}
                      className="flex group hover:bg-background/30 transition-colors cursor-pointer"
                    >
                      {/* Left Column Description */}
                      <div className="w-64 border-r border-border p-4.5 flex flex-col justify-center shrink-0 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-xs">
                            {m.name}
                          </h4>
                          <Badge variant="outline" className={`font-semibold text-[8px] shrink-0 px-1.5 py-0.5 rounded-full select-none leading-none ${getStatusStyles(m.status)}`}>
                            {m.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold select-none">
                          <span className="flex items-center gap-1">
                            <ListTodo className="h-3 w-3" />
                            {completed}/{total} tasks
                          </span>
                          <span className="font-mono text-primary font-bold">{progress}%</span>
                        </div>
                      </div>

                      {/* Right Timeline Bar Row container */}
                      <div className="flex-1 relative p-4 flex items-center min-w-0">
                        {/* Background guide lines */}
                        <div className="absolute inset-0 grid divide-x divide-zinc-100 pointer-events-none" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                          {columns.map((_, i) => <div key={i} />)}
                        </div>

                        {/* Milestone bar itself */}
                        {metrics.show && (
                          <div
                            className={`h-9 rounded-xl border relative shadow-xs transition-all duration-200 group-hover:shadow-md overflow-hidden flex flex-col justify-center px-3.5 select-none ${isOverdue
                                ? "border-red-200 bg-red-50/30 ring-1 ring-red-100"
                                : "border-border"
                              }`}
                            style={{
                              left: `${metrics.left}%`,
                              width: `${metrics.width}%`,
                              borderColor: isOverdue ? undefined : m.color,
                              backgroundColor: isOverdue ? undefined : `${m.color}0d`,
                            }}
                          >
                            {/* Inner progress fill bar */}
                            <div
                              className="absolute top-0 bottom-0 left-0 -z-1 opacity-10 transition-all duration-300"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: isOverdue ? "#ef4444" : m.color,
                              }}
                            />

                            <div className="flex items-center justify-between gap-2.5 min-w-0">
                              <span
                                className="font-bold text-[11px] truncate"
                                style={{ color: isOverdue ? "#dc2626" : m.color }}
                              >
                                {m.name}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                {isOverdue && (
                                  <span title="Milestone Overdue!">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                                  </span>
                                )}
                                {m.status === "Completed" && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                                <span className="text-[9px] font-bold text-muted-foreground">
                                  {progress}%
                                </span>
                              </div>
                            </div>

                            {/* Clipped indicators (visual clues) */}
                            {metrics.isClippedStart && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-zinc-200 to-transparent" />
                            )}
                            {metrics.isClippedEnd && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-zinc-200 to-transparent" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Unscheduled Milestones section */}
        {unscheduledMilestones.length > 0 && (
          <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-xs select-none">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-amber-550" />
              <h3 className="text-sm font-bold text-foreground">
                Unscheduled Milestones ({unscheduledMilestones.length})
              </h3>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              These milestones don't have start or due dates configured. Give them dates in the Milestones dashboard to place them on the calendar roadmap.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unscheduledMilestones.map((m) => (
                <div
                  key={m._id}
                  onClick={() => dispatch(setActiveView({ type: "milestones" }))}
                  className="p-4 border border-border hover:border-border rounded-xl bg-muted/50 hover:bg-card text-card-foreground transition-all cursor-pointer flex flex-col group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.color }} />
                  <span className="font-bold text-foreground text-xs truncate pl-1.5 group-hover:text-primary transition-colors">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 pl-1.5">
                    <Plus className="h-3 w-3" /> Set dates to map
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
