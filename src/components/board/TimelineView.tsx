// src/components/board/TimelineView.tsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Trash2,
  User,
  Lightbulb,
  Bug,
  AlertTriangle,
  CircleDot,
  PlusSquare,
  CalendarDays,
  Pencil,
  Link,
  Archive,
  UserMinus,
  UserPlus,
  Sliders,
  ArrowLeftRight,
  Layers,
  Search,
  FileText,
} from "lucide-react";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useUpdateItemMutation,
  useDeleteItemMutation,
  useCreateItemMutation,
} from "@/store/services/api";
import type { BoardType, ItemType, ColumnType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";

interface TimelineViewProps {
  board: BoardType;
  items: ItemType[];
  onCardClick: (item: ItemType) => void;
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
}

type ZoomLevel = "day" | "week" | "month";

// Helper functions for date math
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// styling type matching
const typeIcons: Record<ItemTypeClass, React.ReactNode> = {
  Task: <CircleDot className="h-3 w-3 text-blue-500" />,
  Bug: <Bug className="h-3 w-3 text-red-500" />,
  Lead: <CircleDot className="h-3 w-3 text-emerald-500" />,
  Idea: <Lightbulb className="h-3 w-3 text-purple-500" />,
  Issue: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  Event: <Calendar className="h-3 w-3 text-indigo-500" />,
  Feature: <Layers className="h-3 w-3 text-violet-500" />,
  Research: <Search className="h-3 w-3 text-cyan-500" />,
  Documentation: <FileText className="h-3 w-3 text-slate-500" />,
};

const priorityDotColors: Record<ItemPriorityClass, string> = {
  Lowest: "bg-slate-350",
  Low: "bg-blue-400",
  Medium: "bg-amber-400",
  High: "bg-orange-400",
  Highest: "bg-red-400",
  Critical: "bg-red-500",
};

const priorityPillColors: Record<ItemPriorityClass, string> = {
  Lowest: "bg-background text-foreground/90 border-border/80 border-l-slate-300",
  Low: "bg-blue-50 text-blue-800 border-blue-200/80 border-l-blue-400",
  Medium: "bg-amber-50 text-amber-800 border-amber-200/80 border-l-amber-400",
  High: "bg-orange-50/80 text-orange-800 border-orange-200/80 border-l-orange-400",
  Highest: "bg-red-50 text-red-800 border-red-200/80 border-l-red-450",
  Critical: "bg-rose-50 text-rose-800 border-rose-250 border-l-rose-500 font-semibold shadow-[0_1px_2px_rgba(244,63,94,0.05)]",
};

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Unified coordinate resolver helper
const getItemDates = (item: ItemType) => {
  const start = item.startDate
    ? new Date(item.startDate)
    : item.dueDate
      ? addDays(new Date(item.dueDate), -2)
      : new Date(item.createdAt);
  const end = item.dueDate
    ? new Date(item.dueDate)
    : addDays(start, 2);
  return { start, end };
};

// Render vertical divider lines for background grid alignment
function GridRowBackground({ zoomLevel, dayHeaders, PX_PER_DAY }: { zoomLevel: ZoomLevel; dayHeaders: any[]; PX_PER_DAY: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {dayHeaders.map((dh, i) => {
        let isDivider = false;
        if (zoomLevel === "day") {
          isDivider = true;
        } else if (zoomLevel === "week") {
          isDivider = dh.date.getDay() === 1; // Every Monday
        } else if (zoomLevel === "month") {
          isDivider = dh.date.getDate() === 1; // Month boundary
        }

        if (!isDivider && i !== 0) return null;

        return (
          <div
            key={i}
            className={`absolute top-0 bottom-0 border-l ${dh.isToday
                ? "border-indigo-400/40 bg-primary/10/5"
                : dh.isWeekend && zoomLevel === "day"
                  ? "border-border/50 bg-background/30"
                  : "border-border/20"
              }`}
            style={{ left: `${i * PX_PER_DAY}px` }}
          />
        );
      })}
    </div>
  );
}

// Interactive Left Sidebar Task Card (mirroring CalendarTaskCard)
interface SidebarTaskCardProps {
  item: ItemType;
  overdue: boolean;
  onCardClick: (item: ItemType) => void;
  updateItem: any;
  createItem: any;
  deleteItem: any;
  rbac: any;
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
  board: BoardType;
  getDaysLate: (item: ItemType) => number;
}

function SidebarTaskCard({
  item,
  overdue,
  onCardClick,
  updateItem,
  createItem,
  deleteItem,
  rbac,
  assigneeOptions = [],
  emailToNameMap = {},
  board,
  getDaysLate,
}: SidebarTaskCardProps) {
  const confirm = useConfirm();
  const col = board.columns?.find((c) => c.id === item.columnId);
  const isCompleted = col
    ? (col.isDone ||
       col.name.toLowerCase().includes("done") ||
       col.name.toLowerCase().includes("complete") ||
       col.name.toLowerCase().includes("finish") ||
       col.name.toLowerCase().includes("archive"))
    : false;

  const displayOverdue = overdue && !isCompleted;
  return (
    <div
      className={`
        w-full text-left
        rounded-xl
        border
        p-2
        bg-card text-card-foreground
        shadow-[0_1px_2px_rgba(0,0,0,0.04)]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]
        group/item
        relative
        ${displayOverdue
          ? "border-red-100 border-l-4 border-l-red-500"
          : "border-zinc-250/70"
        }
      `}
    >
      <div className="flex items-start justify-between mb-1 pr-5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Priority dropdown indicator */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-3 w-3 rounded-full cursor-pointer focus:outline-none flex items-center justify-center hover:scale-110 transition-transform border-none bg-transparent">
                <PriorityIndicator priority={item.priority} showText={false} className="border-0 bg-transparent p-0 hover:bg-transparent" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[60]">
              {(['Critical', 'Highest', 'High', 'Medium', 'Low', 'Lowest'] as ItemPriorityClass[]).map((prio) => (
                <DropdownMenuItem
                  key={prio}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await updateItem({ id: item._id, body: { priority: prio } }).unwrap();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <PriorityIndicator priority={prio} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => onCardClick(item)}
            className={`text-[11px] font-bold truncate hover:text-primary cursor-pointer text-left flex-1 hover:underline border-none bg-transparent ${
              isCompleted ? "line-through text-muted-foreground" : "text-zinc-850"
            }`}
          >
            {item.title}
          </button>
        </div>

        {/* Meatballs menu */}
        <div className="absolute right-1 top-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-muted-foreground focus:outline-none border-none bg-transparent">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[80]">
              {rbac.canEditCard() && (
                <DropdownMenuItem onClick={() => onCardClick(item)}>
                  <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                  Edit Issue
                </DropdownMenuItem>
              )}
              {rbac.canMoveCard() && board.columns && board.columns.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowLeftRight className="size-3.5 mr-2 text-muted-foreground" />
                    Move Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[85]">
                    {board.columns.map((col) => (
                      <DropdownMenuItem
                        key={col.id}
                        disabled={col.id === item.columnId}
                        onClick={async () => {
                          try {
                            await updateItem({ id: item._id, body: { columnId: col.id } }).unwrap();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <StatusIndicator status={col.name} showText={false} className="border-0 bg-transparent p-0 mr-2" />
                        {col.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await createItem({
                      boardId: item.board,
                      body: {
                        title: `${item.title} (Copy)`,
                        columnId: item.columnId,
                        type: item.type,
                        priority: item.priority,
                        assignee: item.assignee,
                        dueDate: item.dueDate,
                        description: item.description,
                      }
                    }).unwrap();
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <Copy className="size-3.5 mr-2 text-muted-foreground" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/workspace/${board.workspace}/board/${board._id}/item/${item._id}`);
                }}
              >
                <Link className="size-3.5 mr-2 text-muted-foreground" />
                Copy Link
              </DropdownMenuItem>
              {rbac.canArchive() && (
                <DropdownMenuItem
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Archive Task",
                      description: `Are you sure you want to archive "${item.title}"?`,
                      confirmText: "Archive",
                    });
                    if (ok) {
                      try {
                        await updateItem({ id: item._id, body: { archived: true } }).unwrap();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                >
                  <Archive className="size-3.5 mr-2 text-muted-foreground" />
                  Archive
                </DropdownMenuItem>
              )}
              {rbac.canDeleteCard() && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete Task",
                      description: `Are you sure you want to permanently delete task "${item.title}"?`,
                      confirmText: "Delete",
                      variant: "destructive",
                    });
                    if (ok) {
                      try {
                        await deleteItem(item._id).unwrap();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                >
                  <Trash2 className="size-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 pt-1 border-t border-border">
        {/* Due Date picker */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : ""}
            onChange={async (e) => {
              const val = e.target.value ? new Date(e.target.value).toISOString() : null;
              try {
                await updateItem({ id: item._id, body: { dueDate: val } }).unwrap();
              } catch (err) {
                console.error(err);
              }
            }}
            className={`text-[9px] font-bold bg-transparent hover:bg-muted/50 focus:bg-card text-card-foreground rounded px-1 py-0.5 border-none outline-none focus:ring-0 cursor-pointer w-20
              ${displayOverdue ? "text-red-655 font-extrabold bg-red-50/40" : "text-muted-foreground"}`}
          />
        </div>

        {/* Assignee Avatar Dropdown */}
        <div className="flex items-center shrink-0">
          {item.assignee ? (() => {
            const resolvedName = emailToNameMap[item.assignee.toLowerCase().trim()] || item.assignee;
            const initials = resolvedName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none cursor-pointer rounded-full hover:scale-105 transition-transform border-none bg-transparent">
                    <Avatar className="h-4.5 w-4.5 border border-border" title={resolvedName}>
                      <AvatarFallback className="bg-primary/10 text-indigo-700 text-[8px] font-bold uppercase">
                        {initials || "??"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel className="px-3">Assigned</DropdownMenuLabel>
                  <div className="px-3 py-1 text-xs font-extrabold text-foreground">{resolvedName}</div>
                  {assigneeOptions && assigneeOptions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-3">Reassign</DropdownMenuLabel>
                      <div className="max-h-28 overflow-y-auto">
                        {assigneeOptions.map((email) => {
                          const optionName = emailToNameMap[email.toLowerCase().trim()] || email;
                          return (
                            <DropdownMenuItem
                              key={email}
                              onClick={async () => {
                                try {
                                  await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            >
                              <UserPlus className="size-3.5 mr-2 text-muted-foreground" />
                              {optionName}
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateItem({ id: item._id, body: { assignee: "" } }).unwrap();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    variant="destructive"
                  >
                    <UserMinus className="size-3.5 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })() : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none cursor-pointer rounded-full text-muted-foreground hover:text-zinc-655 border-none bg-transparent" title="Unassigned">
                  <Avatar className="h-4.5 w-4.5 border border-dashed border-border bg-muted/50 hover:bg-background">
                    <AvatarFallback className="text-[8px] font-bold text-muted-foreground">+</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="px-3">Assign</DropdownMenuLabel>
                {assigneeOptions && assigneeOptions.length > 0 ? (
                  <div className="max-h-28 overflow-y-auto">
                    {assigneeOptions.map((email) => {
                      const optionName = emailToNameMap[email.toLowerCase().trim()] || email;
                      return (
                        <DropdownMenuItem
                          key={email}
                          onClick={async () => {
                            try {
                              await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <UserPlus className="size-3.5 mr-2 text-muted-foreground" />
                          {optionName}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground px-3 py-1.5 italic">No members</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {displayOverdue && (
        <div className="mt-1 text-[9px] font-bold text-red-500 bg-red-50/30 px-1 py-0.5 rounded border border-red-100/50 w-fit">
          {getDaysLate(item)} day{getDaysLate(item) > 1 ? "s" : ""} late
        </div>
      )}
    </div>
  );
}

export function TimelineView({
  board,
  items,
  onCardClick,
  assigneeOptions = [],
  emailToNameMap = {},
}: TimelineViewProps) {
  const confirm = useConfirm();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rbac = useRBAC();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [createItem] = useCreateItemMutation();

  // UX settings: Zoom level & range override
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("day");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const sortedColumns = useMemo(() => {
    return [...board.columns].sort((a, b) => a.order - b.order);
  }, [board.columns]);


  // Quick Add Task Form Modal State
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<ItemTypeClass>("Task");
  const [newTaskPriority, setNewTaskPriority] = useState<ItemPriorityClass>("Medium");
  const [newTaskColumnId, setNewTaskColumnId] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = isMobile ? 144 : 340;

  // Initialize group expand toggles
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    sortedColumns.forEach((col) => {
      initial[col.id] = true;
    });
    setExpandedGroups(initial);
  }, [sortedColumns]);

  // Apply filters locally in real time
  const filteredItems = useMemo(() => {
    return items.filter((item) => !item.archived);
  }, [items]);

  // Separate tasks with and without dates
  const timelineItems = useMemo(() => {
    return filteredItems.filter((it) => it.dueDate || it.startDate);
  }, [filteredItems]);

  // Sidebar overdue helper
  const isOverdue = (item: ItemType) => {
    if (!item.dueDate) return false;
    const col = board.columns?.find((c) => c.id === item.columnId);
    if (!col) return false;
    if (
      col.isDone ||
      col.name.toLowerCase().includes("done") ||
      col.name.toLowerCase().includes("complete") ||
      col.name.toLowerCase().includes("finish") ||
      col.name.toLowerCase().includes("archive")
    ) {
      return false;
    }
    const due = new Date(item.dueDate);
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return due < now;
  };

  const getDaysLate = (item: ItemType) => {
    if (!item.dueDate) return 0;
    const due = new Date(item.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Lists for left sidebar dropdown cards
  const overdueItems = useMemo(() => {
    return filteredItems.filter((item) => isOverdue(item));
  }, [filteredItems, board.columns]);

  const unscheduledSidebarItems = useMemo(() => {
    return filteredItems.filter((item) => {
      if (item.startDate || item.dueDate) return false;
      const col = board.columns?.find((c) => c.id === item.columnId);
      const isCompleted = col
        ? (col.isDone ||
           col.name.toLowerCase().includes("done") ||
           col.name.toLowerCase().includes("complete") ||
           col.name.toLowerCase().includes("finish") ||
           col.name.toLowerCase().includes("archive"))
        : false;
      return !isCompleted;
    });
  }, [filteredItems, board.columns]);

  // Stats calculators
  const scheduledCount = useMemo(() => {
    return items.filter((i) => i.startDate || i.dueDate).length;
  }, [items]);

  const highPriorityCount = useMemo(() => {
    return filteredItems.filter(
      (item) => item.priority === "High" || item.priority === "Critical" || item.priority === "Highest"
    ).length;
  }, [filteredItems]);

  // Group filtered items by status column for row indexing (both sidebar and grid tracks)
  const groupedItems = useMemo(() => {
    const groups: { column: ColumnType; items: ItemType[] }[] = [];
    sortedColumns.forEach((col) => {
      const colItems = filteredItems
        .filter((it) => it.columnId === col.id)
        .sort((a, b) => {
          const aDates = getItemDates(a);
          const bDates = getItemDates(b);
          // Place scheduled tasks first, then unscheduled
          const aHasDates = !!(a.startDate || a.dueDate);
          const bHasDates = !!(b.startDate || b.dueDate);
          if (aHasDates && !bHasDates) return -1;
          if (!aHasDates && bHasDates) return 1;
          return aDates.start.getTime() - bDates.start.getTime();
        });
      groups.push({ column: col, items: colItems });
    });
    return groups;
  }, [filteredItems, sortedColumns]);

  // PX widths depending on Zoom levels (Google Calendar style)
  const PX_PER_DAY = useMemo(() => {
    if (zoomLevel === "day") return 48;
    if (zoomLevel === "week") return 16; // 1 week (7 days) = 112px
    return 4; // 1 month (~30 days) = 120px
  }, [zoomLevel]);

  // Calculate timeline display range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (customRange) {
      const total = daysBetween(customRange.start, customRange.end) + 1;
      return { startDate: customRange.start, endDate: customRange.end, totalDays: Math.max(total, 5) };
    }

    if (timelineItems.length === 0) {
      const today = new Date();
      const start = addDays(today, -7);
      const end = addDays(today, 30);
      return { startDate: start, endDate: end, totalDays: 38 };
    }

    let minDate = new Date();
    let maxDate = new Date();

    timelineItems.forEach((item) => {
      const dates = getItemDates(item);
      if (dates.start < minDate) minDate = new Date(dates.start);
      if (dates.end > maxDate) maxDate = new Date(dates.end);
    });

    // Padding at boundaries
    const start = addDays(minDate, -4);
    const end = addDays(maxDate, 8);
    const total = daysBetween(start, end) + 1;

    return { startDate: start, endDate: end, totalDays: Math.max(total, 15) };
  }, [timelineItems, customRange]);

  // Generate Date Header Cells aligned with PX_PER_DAY
  const headerCells = useMemo(() => {
    const cells: { key: string; label: string; subLabel: string; width: number; isToday: boolean; isWeekend: boolean; date: Date }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (zoomLevel === "day") {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(startDate, i);
        d.setHours(0, 0, 0, 0);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        cells.push({
          key: `day-${i}`,
          label: d.getDate().toString(),
          subLabel: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
          width: PX_PER_DAY,
          isToday: d.getTime() === today.getTime(),
          isWeekend,
          date: d,
        });
      }
    } else if (zoomLevel === "week") {
      for (let i = 0; i < totalDays; i += 7) {
        const d = addDays(startDate, i);
        const endOfWeek = addDays(d, 6);
        d.setHours(0, 0, 0, 0);

        cells.push({
          key: `week-${i}`,
          label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          subLabel: `to ${endOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          width: PX_PER_DAY * 7,
          isToday: false,
          isWeekend: false,
          date: d,
        });
      }
    } else if (zoomLevel === "month") {
      let currentMonthKey = "";
      let currentDaysCount = 0;
      let currentMonthStart: Date | null = null;

      for (let i = 0; i < totalDays; i++) {
        const d = addDays(startDate, i);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

        if (!currentMonthStart) {
          currentMonthStart = d;
        }

        if (monthKey !== currentMonthKey && currentMonthKey !== "") {
          cells.push({
            key: `month-${currentMonthKey}`,
            label: currentMonthStart.toLocaleDateString(undefined, { month: "long" }),
            subLabel: currentMonthStart.getFullYear().toString(),
            width: currentDaysCount * PX_PER_DAY,
            isToday: false,
            isWeekend: false,
            date: currentMonthStart,
          });
          currentMonthStart = d;
          currentDaysCount = 1;
        } else {
          currentDaysCount++;
        }
        currentMonthKey = monthKey;
      }

      if (currentMonthStart && currentDaysCount > 0) {
        cells.push({
          key: `month-${currentMonthKey}`,
          label: currentMonthStart.toLocaleDateString(undefined, { month: "long" }),
          subLabel: currentMonthStart.getFullYear().toString(),
          width: currentDaysCount * PX_PER_DAY,
          isToday: false,
          isWeekend: false,
          date: currentMonthStart,
        });
      }
    }
    return cells;
  }, [startDate, totalDays, zoomLevel, PX_PER_DAY]);

  // Major category header blocks (Months/Years spanning columns)
  const majorHeaders = useMemo(() => {
    const headers: { key: string; label: string; width: number }[] = [];
    let currentGroupLabel = "";
    let currentWidth = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(startDate, i);
      let label = "";
      if (zoomLevel === "day" || zoomLevel === "week") {
        label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      } else {
        label = d.getFullYear().toString();
      }

      if (label !== currentGroupLabel) {
        if (currentWidth > 0) {
          headers.push({ key: `major-${currentGroupLabel}-${i}`, label: currentGroupLabel, width: currentWidth });
        }
        currentGroupLabel = label;
        currentWidth = PX_PER_DAY;
      } else {
        currentWidth += PX_PER_DAY;
      }
    }

    if (currentWidth > 0) {
      headers.push({ key: `major-${currentGroupLabel}-last`, label: currentGroupLabel, width: currentWidth });
    }
    return headers;
  }, [startDate, totalDays, zoomLevel, PX_PER_DAY]);

  const todayOffset = daysBetween(startDate, new Date());

  // Date Shift bulk action & inline adjustments
  const handleShiftTaskDate = async (item: ItemType, shiftDays: number, mode: "shift" | "extend") => {
    const dates = getItemDates(item);
    let newStart = new Date(dates.start);
    let newDue = new Date(dates.end);

    if (mode === "shift") {
      newStart.setDate(newStart.getDate() + shiftDays);
      newDue.setDate(newDue.getDate() + shiftDays);
    } else if (mode === "extend") {
      newDue.setDate(newDue.getDate() + shiftDays);
      if (newDue < newStart) {
        newDue = new Date(newStart);
      }
    }

    try {
      await updateItem({
        id: item._id,
        body: {
          startDate: newStart.toISOString(),
          dueDate: newDue.toISOString(),
        },
      }).unwrap();
    } catch (err) {
      console.error("Failed to shift date:", err);
    }
  };

  // Click handler on empty space on the grid to create a task
  const handleGridCellClick = (e: React.MouseEvent<HTMLDivElement>, colId: string) => {
    // Only capture click directly on the container, not on task card pills
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const daysFromStart = Math.floor(clickX / PX_PER_DAY);
    const clickedDate = addDays(startDate, daysFromStart);

    setNewTaskStartDate(clickedDate.toISOString().slice(0, 10));
    setNewTaskDueDate(addDays(clickedDate, 2).toISOString().slice(0, 10));
    setNewTaskColumnId(colId);
    setNewTaskTitle("");
    setNewTaskAssignee("");
    setShowAddTaskDialog(true);
  };

  // Click handler on a specific task row track to set date range or create task
  const handleTrackClick = async (e: React.MouseEvent, item: ItemType, colId: string) => {
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const daysFromStart = Math.floor(clickX / PX_PER_DAY);
    const clickedDate = addDays(startDate, daysFromStart);

    // If the task has no start date and no due date, schedule it starting on click date
    if (!item.startDate && !item.dueDate) {
      try {
        await updateItem({
          id: item._id,
          body: {
            startDate: clickedDate.toISOString(),
            dueDate: addDays(clickedDate, 2).toISOString(),
          }
        }).unwrap();
      } catch (err) {
        console.error("Failed to schedule task on track click:", err);
      }
    } else {
      // Create new task in this column
      handleGridCellClick(e as any, colId);
    }
  };

  // Submit quick add task dialog
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskColumnId) return;

    try {
      await createItem({
        boardId: board._id,
        body: {
          title: newTaskTitle.trim(),
          columnId: newTaskColumnId,
          type: newTaskType,
          priority: newTaskPriority,
          assignee: newTaskAssignee || undefined,
          startDate: newTaskStartDate ? new Date(newTaskStartDate).toISOString() : null,
          dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        },
      }).unwrap();

      // Reset
      setNewTaskTitle("");
      setNewTaskStartDate("");
      setNewTaskDueDate("");
      setNewTaskAssignee("");
      setShowAddTaskDialog(false);
    } catch (err) {
      console.error("Failed to quick add task from timeline:", err);
    }
  };


  // Shift range selectors
  const handleShiftTimelineRange = (direction: "prev" | "next") => {
    const baseSpan = daysBetween(startDate, endDate);
    const shiftDays = Math.max(Math.floor(baseSpan * 0.5), 5) * (direction === "prev" ? -1 : 1);
    setCustomRange({
      start: addDays(startDate, shiftDays),
      end: addDays(endDate, shiftDays),
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background/20 font-sans select-none">
      {/* 1. CONTROL BAR & RANGE CONTROLS (Apple / Google Style) */}
      <div className="flex flex-row items-center justify-between gap-3 px-6 py-4 border-b border-border bg-card text-card-foreground/95 backdrop-blur-md sticky top-0 z-50 shrink-0 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10/60 rounded-xl border border-primary/20 text-primary shadow-sm shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>{formatDateShort(startDate)} — {formatDateShort(endDate)}</span>
            </h2>
          </div>
        </div>

        {/* Mobile Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileFilters(true)}
          className="md:hidden shrink-0 rounded-xl h-8 px-2.5 border-border bg-card font-bold flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
        >
          <Sliders className="h-4 w-4" />
          <span>Filter</span>
        </Button>

        {/* Date Navigator & Timeline Range Input (Desktop only) */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {/* Shift Controls */}
          <div className="flex items-center border border-border bg-card text-card-foreground rounded-xl shadow-xs p-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleShiftTimelineRange("prev")}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomRange(null)}
              className="h-7 px-2.5 rounded-lg text-xs font-semibold text-zinc-655 hover:text-foreground hover:bg-background"
            >
              Reset Fit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleShiftTimelineRange("next")}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Date range picker overrides */}
          <div className="flex items-center gap-1 bg-card text-card-foreground border border-border p-1 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-zinc-404 px-1 uppercase">Start</span>
            <input
              type="date"
              value={startDate.toISOString().slice(0, 10)}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomRange({
                    start: new Date(e.target.value),
                    end: endDate > new Date(e.target.value) ? endDate : addDays(new Date(e.target.value), 14),
                  });
                }
              }}
              className="text-xs bg-background border border-border rounded-lg px-2 py-0.5 outline-none focus:border-indigo-400 focus:bg-card text-card-foreground text-foreground cursor-pointer"
            />
            <span className="text-[10px] font-bold text-zinc-404 px-1 uppercase">End</span>
            <input
              type="date"
              value={endDate.toISOString().slice(0, 10)}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomRange({
                    start: startDate < new Date(e.target.value) ? startDate : addDays(new Date(e.target.value), -14),
                    end: new Date(e.target.value),
                  });
                }
              }}
              className="text-xs bg-background border border-border rounded-lg px-2 py-0.5 outline-none focus:border-indigo-400 focus:bg-card text-card-foreground text-foreground cursor-pointer"
            />
          </div>
        </div>

        {/* Zoom segmented controller (Apple style) (Desktop only) */}
        <div className="hidden md:flex items-center gap-2">
          <div className="bg-muted p-0.5 rounded-xl border border-border/50 flex gap-0.5">
            {(["day", "week", "month"] as ZoomLevel[]).map((level) => {
              const active = zoomLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${active
                      ? "bg-card text-card-foreground text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06)] border border-black/5"
                      : "text-muted-foreground hover:text-zinc-805 hover:bg-background"
                    }`}
                >
                  {level}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            onClick={() => {
              setNewTaskStartDate("");
              setNewTaskDueDate("");
              setNewTaskColumnId(board.columns[0]?.id || "");
              setNewTaskTitle("");
              setNewTaskAssignee("");
              setShowAddTaskDialog(true);
            }}
            className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer shadow-sm hover:scale-[1.01] transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>
      {/* 2. HERO & STATS DASHBOARD ROW */}
      <div className="hidden sm:flex px-6 py-4 bg-card text-card-foreground border-b border-border flex-col lg:flex-row gap-4 shrink-0">
        {/* Stats Grid spanning horizontally */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-card text-card-foreground border-border/60 p-3.5 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="text-[9px] font-extrabold text-zinc-404 uppercase tracking-wider">Scheduled</div>
            <div className="text-xl font-bold mt-1 text-foreground">{scheduledCount}</div>
          </div>
          <div className="rounded-2xl border bg-card text-card-foreground border-border/60 p-3.5 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="text-[9px] font-extrabold text-zinc-404 uppercase tracking-wider">Overdue</div>
            <div className="text-xl font-bold mt-1 text-red-600">{overdueItems.length}</div>
          </div>
          <div className="rounded-2xl border bg-card text-card-foreground border-border/60 p-3.5 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="text-[9px] font-extrabold text-zinc-404 uppercase tracking-wider">No Date</div>
            <div className="text-xl font-bold mt-1 text-zinc-705">{unscheduledSidebarItems.length}</div>
          </div>
          <div className="rounded-2xl border bg-card text-card-foreground border-border/60 p-3.5 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="text-[9px] font-extrabold text-zinc-404 uppercase tracking-wider">High Priority</div>
            <div className="text-xl font-bold mt-1 text-orange-600">{highPriorityCount}</div>
          </div>
        </div>
      </div>

      {/* 4. CORE INTEGRATED SCROLL VIEW */}
      <div className="flex-1 overflow-auto relative" ref={scrollRef}>
        <div className="min-w-max flex flex-col min-h-full">

          {/* A. DATE HEADERS ROW (sticky vertically at top-0, scrolls horizontally) */}
          <div className="sticky top-0 z-40 bg-card text-card-foreground flex border-b border-border shrink-0 shadow-xs">
            {/* Left anchor: Sidebar sticky header spacer */}
            <div className="sticky left-0 z-50 w-36 lg:w-85 shrink-0 bg-background border-r border-border h-16 animate-in" />

            {/* Right: Date spanning labels */}
            <div className="flex flex-col h-16 relative">
              {/* Row 1: Months / Years */}
              <div className="flex h-8 border-b border-border relative">
                {majorHeaders.map((mh) => (
                  <div
                    key={mh.key}
                    className="border-r border-border/40 h-full flex items-center px-3 text-[10px] font-bold text-zinc-404 uppercase tracking-wider bg-zinc-55/50 shrink-0"
                    style={{ width: `${mh.width}px` }}
                  >
                    {mh.label}
                  </div>
                ))}
              </div>

              {/* Row 2: minor Zoom Labels */}
              <div className="flex h-8 relative">
                {headerCells.map((cell) => (
                  <div
                    key={cell.key}
                    className={`border-r border-border flex flex-col items-center justify-center shrink-0 h-full leading-none
                    ${cell.isToday ? "bg-primary/10/70 text-primary" : cell.isWeekend ? "bg-background text-muted-foreground" : "text-zinc-655"}`}
                    style={{ width: `${cell.width}px` }}
                  >
                    {zoomLevel === "day" ? (
                      <>
                        <span className={`text-[10px] font-extrabold ${cell.isToday ? "bg-primary text-white w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs" : ""}`}>
                          {cell.label}
                        </span>
                        <span className="text-[8px] font-bold uppercase mt-0.5 text-muted-foreground">
                          {cell.subLabel}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold">{cell.label}</span>
                        <span className="text-[8px] text-zinc-404 font-medium mt-0.5">{cell.subLabel}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* C. MAIN ROW GROUPS AND TASK TRACKS (row-by-row sidebar & timeline grid) */}
          <div className="flex-1 flex flex-col">
            {groupedItems.map((group) => {
              const isGroupExpanded = expandedGroups[group.column.id] !== false;

              return (
                <div key={group.column.id} className="flex flex-col">
                  {/* Status Group Header Row */}
                  <div className="flex border-b border-zinc-250 bg-muted/50 hover:bg-muted/70 transition-colors h-10 align-middle">
                    {/* Left: Sidebar Status Header (sticky horizontally) */}
                    <button
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.column.id]: !isGroupExpanded }))}
                      className="sticky left-0 z-30 w-36 lg:w-85 shrink-0 bg-muted/90 border-r border-border flex items-center justify-between px-2 lg:px-4 h-full cursor-pointer hover:bg-muted/40 text-left transition-colors focus:outline-none border-none"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isGroupExpanded ? "" : "-rotate-90"}`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          {group.column.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-405 bg-muted/80 border border-border/40 px-1.5 py-0.5 rounded-full shrink-0">
                        {group.items.length} tasks
                      </span>
                    </button>

                    {/* Right: Gantt Grid background header */}
                    <div
                      onClick={(e) => handleGridCellClick(e, group.column.id)}
                      className="flex-1 relative cursor-cell h-full"
                      title="Click empty grid space to create a task here"
                    >
                      <GridRowBackground zoomLevel={zoomLevel} dayHeaders={headerCells} PX_PER_DAY={PX_PER_DAY} />
                    </div>
                  </div>

                  {/* Tasks Rows under this column */}
                  {isGroupExpanded && (
                    <div className="flex flex-col">
                      {group.items.map((item) => {
                        const dates = getItemDates(item);
                        const hasDates = !!(item.startDate || item.dueDate);

                        // Horizontal offsets if scheduled
                        const offsetDays = daysBetween(startDate, dates.start);
                        const spanDays = Math.max(daysBetween(dates.start, dates.end) + 1, 1);
                        const left = Math.max(offsetDays * PX_PER_DAY, 0);
                        const width = Math.max(spanDays * PX_PER_DAY - 6, 28);

                        const col = board.columns?.find((c) => c.id === item.columnId);
                        const isCompleted = col
                          ? (col.isDone ||
                             col.name.toLowerCase().includes("done") ||
                             col.name.toLowerCase().includes("complete") ||
                             col.name.toLowerCase().includes("finish") ||
                             col.name.toLowerCase().includes("archive"))
                          : false;
                        const overdue = isOverdue(item);

                        return (
                          <div
                            key={item._id}
                            onMouseEnter={() => setHoveredItem(item._id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`flex border-b border-border transition-colors min-h-[54px] py-1 flex-row items-center hover:bg-background/30
                            ${hoveredItem === item._id ? "bg-primary/10/15" : ""}`}
                          >
                            {/* Left: Sidebar Task Card (sticky horizontally) */}
                            <div className="sticky left-0 z-30 w-36 lg:w-85 shrink-0 bg-card text-card-foreground border-r border-border flex flex-col justify-center px-2 lg:px-4 h-full">
                              <SidebarTaskCard
                                item={item}
                                overdue={overdue}
                                onCardClick={onCardClick}
                                updateItem={updateItem}
                                createItem={createItem}
                                deleteItem={deleteItem}
                                rbac={rbac}
                                assigneeOptions={assigneeOptions}
                                emailToNameMap={emailToNameMap}
                                board={board}
                                getDaysLate={getDaysLate}
                              />
                            </div>

                            {/* Right: Gantt Grid Track cell (aligned horizontally) */}
                            <div
                              onClick={(e) => handleTrackClick(e, item, group.column.id)}
                              className="flex-1 relative cursor-cell self-stretch min-h-[46px]"
                            >
                              <GridRowBackground zoomLevel={zoomLevel} dayHeaders={headerCells} PX_PER_DAY={PX_PER_DAY} />

                              {/* Task Bar Pill Card (if scheduled) */}
                              {hasDates ? (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className={`absolute top-2 bottom-2 rounded-xl flex items-center justify-between px-2.5 border border-l-4 transition-all z-10 group/bar select-none
                                  ${priorityPillColors[item.priority] || "bg-muted text-foreground/90 border-border border-l-zinc-400"}
                                  ${hoveredItem === item._id ? "ring-2 ring-indigo-400/40 shadow-md scale-[1.002]" : "shadow-xs"}`}
                                  style={{
                                    left: `${left}px`,
                                    width: `${width}px`,
                                  }}
                                  title={`${item.title}\nDates: ${formatDateShort(dates.start)} to ${formatDateShort(dates.end)}\nPriority: ${item.priority}\nAssignee: ${item.assignee || "Unassigned"}`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1 cursor-pointer h-full" onClick={() => onCardClick(item)}>
                                    <span className="shrink-0">{typeIcons[item.type]}</span>
                                    <span className={`text-[10px] font-extrabold truncate select-none ${isCompleted ? "line-through opacity-70" : ""}`}>
                                      {item.title}
                                    </span>
                                  </div>

                                  {/* Hover action meatballs */}
                                  <div className="flex items-center gap-1 h-full shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="h-5 w-5 rounded-md hover:bg-black/5 flex items-center justify-center text-zinc-550 hover:text-foreground cursor-pointer focus:outline-none focus:ring-0 border-none bg-transparent">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuLabel className="px-3">Quick Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onCardClick(item)}>
                                          <Pencil className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Edit Details
                                        </DropdownMenuItem>

                                        {/* Move status column submenu */}
                                        {rbac.canMoveCard() && (
                                          <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Move Status
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                              {sortedColumns.map((col) => (
                                                <DropdownMenuItem
                                                  key={col.id}
                                                  disabled={col.id === item.columnId}
                                                  onClick={async () => {
                                                    try {
                                                      await updateItem({ id: item._id, body: { columnId: col.id } }).unwrap();
                                                    } catch (e) {
                                                      console.error(e);
                                                    }
                                                  }}
                                                >
                                                  <StatusIndicator status={col.name} showText={false} className="border-0 bg-transparent p-0 mr-2" />
                                                  {col.name}
                                                </DropdownMenuItem>
                                              ))}
                                            </DropdownMenuSubContent>
                                          </DropdownMenuSub>
                                        )}

                                        {/* Date shifting controls */}
                                        {rbac.canEditCard() && (
                                          <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Reschedule Dates
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent className="w-56">
                                              <DropdownMenuLabel className="px-3">Shift Entire Task</DropdownMenuLabel>
                                              <DropdownMenuItem onClick={() => handleShiftTaskDate(item, 1, "shift")}>
                                                Move forward 1 day
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleShiftTaskDate(item, -1, "shift")}>
                                                Move backward 1 day
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuLabel className="px-3">Adjust Span</DropdownMenuLabel>
                                              <DropdownMenuItem onClick={() => handleShiftTaskDate(item, 1, "extend")}>
                                                Extend end 1 day
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleShiftTaskDate(item, -1, "extend")}>
                                                Reduce end 1 day
                                              </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                          </DropdownMenuSub>
                                        )}

                                        {/* Assignee options */}
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger>
                                            <User className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Assign To
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuSubContent className="max-h-48 overflow-y-auto w-48">
                                            {assigneeOptions.map((email) => (
                                              <DropdownMenuItem
                                                key={email}
                                                onClick={async () => {
                                                  try {
                                                    await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                }}
                                              >
                                                <UserPlus className="size-3.5 mr-2 text-muted-foreground" />
                                                {emailToNameMap[email.toLowerCase()] || email}
                                              </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={async () => {
                                                try {
                                                  await updateItem({ id: item._id, body: { assignee: "" } }).unwrap();
                                                } catch (e) {
                                                  console.error(e);
                                                }
                                              }}
                                              variant="destructive"
                                            >
                                              <UserMinus className="size-3.5 mr-2" />
                                              Unassign
                                            </DropdownMenuItem>
                                          </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        {/* Priority Submenu */}
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger>
                                            <Sliders className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Priority
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuSubContent>
                                            {(["Lowest", "Low", "Medium", "High", "Highest", "Critical"] as ItemPriorityClass[]).map((prio) => (
                                              <DropdownMenuItem
                                                key={prio}
                                                onClick={async () => {
                                                  try {
                                                    await updateItem({ id: item._id, body: { priority: prio } }).unwrap();
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                }}
                                              >
                                                <PriorityIndicator priority={prio} />
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSeparator />

                                        {/* Duplicate option */}
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            try {
                                              await createItem({
                                                boardId: item.board,
                                                body: {
                                                  title: `${item.title} (Copy)`,
                                                  columnId: item.columnId,
                                                  type: item.type,
                                                  priority: item.priority,
                                                  assignee: item.assignee,
                                                  startDate: item.startDate,
                                                  dueDate: item.dueDate,
                                                  description: item.description,
                                                },
                                              }).unwrap();
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                        >
                                          <Copy className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Duplicate
                                        </DropdownMenuItem>

                                        {/* Copy URL share */}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const url = `${window.location.origin}/workspace/${board.workspace}/board/${board._id}/item/${item._id}`;
                                            navigator.clipboard.writeText(url);
                                          }}
                                        >
                                          <Link className="h-3.5 w-3.5 text-muted-foreground mr-2" /> Copy Link
                                        </DropdownMenuItem>

                                        {/* Delete item */}
                                        {rbac.canDeleteCard() && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              variant="destructive"
                                              onClick={async () => {
                                                const ok = await confirm({
                                                  title: "Delete Task",
                                                  description: `Are you sure you want to permanently delete task "${item.title}"?`,
                                                  confirmText: "Delete",
                                                });
                                                if (ok) {
                                                  try {
                                                    await deleteItem(item._id).unwrap();
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                }
                                              }}
                                            >
                                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Task
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ) : (
                                // Hint click-to-schedule for unscheduled rows
                                <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                  <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 border border-dashed border-border rounded px-1.5 py-0.5">
                                    Click timeline to schedule
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today line overlay */}
          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{
                left: `${zoomLevel === "day"
                    ? todayOffset * PX_PER_DAY + sidebarWidth // Align offset considering dynamic sidebar width
                    : todayOffset * PX_PER_DAY + sidebarWidth
                  }px`,
              }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow-md animate-ping" />
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow-md" />
            </div>
          )}
        </div>
      </div>

      {/* 4. QUICK ADD TASK DIALOGUE MODAL */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="sm:max-w-[440px] bg-card text-card-foreground border border-zinc-255 rounded-2xl shadow-xl p-5 z-[100]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PlusSquare className="h-5 w-5 text-indigo-655" />
              Quick Add Task to Timeline
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Add a task directly into the calendar layout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-404 uppercase">Title</label>
              <Input
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task name..."
                className="h-9 rounded-xl border-zinc-250 focus-visible:ring-1 focus-visible:ring-indigo-400 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-404 uppercase">Type</label>
                <Select value={newTaskType} onValueChange={(val) => setNewTaskType(val as ItemTypeClass)}>
                  <SelectTrigger className="h-9 rounded-xl border-zinc-255 text-xs bg-muted/50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg z-[110]">
                    {(["Task", "Bug", "Lead", "Idea", "Issue", "Event"] as ItemTypeClass[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs cursor-pointer rounded-lg">
                        <span className="flex items-center gap-2">{typeIcons[t]} {t}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-404 uppercase">Priority</label>
                <Select value={newTaskPriority} onValueChange={(val) => setNewTaskPriority(val as ItemPriorityClass)}>
                  <SelectTrigger className="h-9 rounded-xl border-zinc-255 text-xs bg-muted/50">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg z-[110]">
                    {(["Lowest", "Low", "Medium", "High", "Highest", "Critical"] as ItemPriorityClass[]).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs cursor-pointer rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${priorityDotColors[p]}`} />
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-404 uppercase">Status Column</label>
              <Select value={newTaskColumnId} onValueChange={setNewTaskColumnId}>
                <SelectTrigger className="h-9 rounded-xl border-zinc-255 text-xs bg-muted/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg z-[110]">
                  {sortedColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs cursor-pointer rounded-lg">
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-404 uppercase">Start Date</label>
                <input
                  type="date"
                  value={newTaskStartDate}
                  onChange={(e) => setNewTaskStartDate(e.target.value)}
                  className="w-full text-xs h-9 bg-background border border-zinc-250 rounded-xl px-3 outline-none focus:border-indigo-400 focus:bg-card text-card-foreground text-foreground cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-404 uppercase">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full text-xs h-9 bg-background border border-zinc-250 rounded-xl px-3 outline-none focus:border-indigo-400 focus:bg-card text-card-foreground text-foreground cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-404 uppercase">Assignee</label>
              <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                <SelectTrigger className="h-9 rounded-xl border-zinc-255 text-xs bg-muted/50">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto z-[110]">
                  <SelectItem value="unassigned" className="text-xs text-zinc-450 italic cursor-pointer rounded-lg">
                    Unassigned
                  </SelectItem>
                  {assigneeOptions.map((email) => (
                    <SelectItem key={email} value={email} className="text-xs cursor-pointer rounded-lg">
                      {emailToNameMap[email.toLowerCase()] || email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddTaskDialog(false)}
                className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-background"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm"
              >
                Create Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Filters/Config Dialog */}
      <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <DialogContent className="max-w-[90vw] rounded-2xl bg-card border border-border shadow-xl p-6 text-foreground">
          <DialogHeader>
            <DialogTitle>Timeline Configurations</DialogTitle>
            <DialogDescription>Adjust calendar range zoom, fit, and dates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Zoom Segmented Control */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zoom Level</label>
              <div className="bg-muted p-1 rounded-xl border border-border/50 flex gap-1 w-full justify-stretch">
                {(["day", "week", "month"] as ZoomLevel[]).map((level) => {
                  const active = zoomLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`flex-grow py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        active
                          ? "bg-card text-card-foreground text-primary shadow-xs border border-black/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift Range Controls */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift Range</label>
              <div className="flex items-center justify-between border border-border bg-muted/30 text-card-foreground rounded-xl p-1.5 w-full">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleShiftTimelineRange("prev")}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-muted-foreground hover:text-foreground hover:bg-background font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <div className="w-[1px] h-5 bg-border shrink-0" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomRange(null);
                    setShowMobileFilters(false);
                  }}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-zinc-655 hover:text-foreground hover:bg-background cursor-pointer"
                >
                  Reset Fit
                </Button>
                <div className="w-[1px] h-5 bg-border shrink-0" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleShiftTimelineRange("next")}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-muted-foreground hover:text-foreground hover:bg-background font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Date range picker overrides */}
            <div className="space-y-3.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Custom Date Range</label>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Start</span>
                  <input
                    type="date"
                    value={startDate.toISOString().slice(0, 10)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomRange({
                          start: new Date(e.target.value),
                          end: endDate > new Date(e.target.value) ? endDate : addDays(new Date(e.target.value), 14),
                        });
                      }
                    }}
                    className="w-full text-xs bg-muted/50 border border-border rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:bg-card text-foreground cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">End</span>
                  <input
                    type="date"
                    value={endDate.toISOString().slice(0, 10)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomRange({
                          start: startDate < new Date(e.target.value) ? startDate : addDays(new Date(e.target.value), -14),
                          end: new Date(e.target.value),
                        });
                      }
                    }}
                    className="w-full text-xs bg-muted/50 border border-border rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:bg-card text-foreground cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold h-10 cursor-pointer"
              onClick={() => setShowMobileFilters(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
