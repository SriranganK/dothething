// src/components/board/CalendarView.tsx
import { useState, useMemo } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { priorityDotColors } from "./TaskCard";
import type { BoardType, ItemType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useUpdateItemMutation,
  useDeleteItemMutation,
  useCreateItemMutation,
} from "@/store/services/api";

import {
  CalendarDays,
  AlertTriangle,
  Clock3,
  Plus,
  SlidersHorizontal,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Pencil,
  Copy,
  Link,
  Archive,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";

interface CalendarViewProps {
  board: BoardType;
  items: ItemType[];
  onCardClick: (item: ItemType) => void;
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isPastDate(dateStr: string) {
  const cellDate = new Date(dateStr);
  cellDate.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  return cellDate < todayDate;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarTaskCardProps {
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

function CalendarTaskCard({
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
}: CalendarTaskCardProps) {
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
              <button className="h-3 w-3 rounded-full cursor-pointer focus:outline-none flex items-center justify-center hover:scale-110 transition-transform">
                <PriorityIndicator priority={item.priority} showText={false} className="border-0 bg-transparent p-0 hover:bg-transparent" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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
            className={`text-[11px] font-bold truncate hover:text-indigo-655 cursor-pointer text-left flex-1 hover:underline ${
              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {item.title}
          </button>
        </div>

        {/* Meatballs menu */}
        <div className="absolute right-1 top-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-muted-foreground focus:outline-none">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {rbac.canEditCard() && (
                <DropdownMenuItem onClick={() => onCardClick(item)}>
                  <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                  Edit Issue
                </DropdownMenuItem>
              )}
              {rbac.canMoveCard() && board.columns && board.columns.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRightLeft className="size-3.5 mr-2 text-muted-foreground" />
                    Move Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
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
              {rbac.canDeleteCard() ? (
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
              ) : (
                <DropdownMenuItem variant="destructive" disabled>
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
              ${displayOverdue ? "text-red-600 font-extrabold bg-red-50/40" : "text-muted-foreground"}`}
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
                  <button className="focus:outline-none cursor-pointer rounded-full hover:scale-105 transition-transform">
                    <Avatar className="h-4.5 w-4.5 border border-border" title={resolvedName}>
                      <AvatarFallback className="bg-primary/10 text-indigo-700 text-[8px] font-bold uppercase">
                        {initials || "??"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-card text-card-foreground p-2.5 border border-border rounded-xl shadow-lg" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase px-1">Assigned</DropdownMenuLabel>
                  <div className="px-1 py-0.5 text-xs font-extrabold text-foreground">{resolvedName}</div>
                  {assigneeOptions && assigneeOptions.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase px-1">Reassign</DropdownMenuLabel>
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
                              className="text-xs py-1 px-1.5 rounded-lg cursor-pointer hover:bg-background"
                            >
                              {optionName}
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateItem({ id: item._id, body: { assignee: "" } }).unwrap();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="text-xs py-1 px-1.5 text-red-655 hover:bg-red-50 rounded-lg cursor-pointer font-bold"
                  >
                    Unassign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })() : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none cursor-pointer rounded-full text-muted-foreground hover:text-muted-foreground" title="Unassigned">
                  <Avatar className="h-4.5 w-4.5 border border-dashed border-border bg-muted/50 hover:bg-background">
                    <AvatarFallback className="text-[8px] font-bold text-muted-foreground">+</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card text-card-foreground p-2.5 border border-border rounded-xl shadow-lg" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase px-1">Assign</DropdownMenuLabel>
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
                          className="text-xs py-1 px-1.5 rounded-lg cursor-pointer hover:bg-background"
                        >
                          {optionName}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-405 p-1 italic">No members</p>
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

export function CalendarView({
  board,
  items,
  onCardClick,
  assigneeOptions = [],
  emailToNameMap = {},
}: CalendarViewProps) {
  const confirm = useConfirm();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // RTK mutations and permissions
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [createItem] = useCreateItemMutation();
  const rbac = useRBAC();

  // Local filtering states
  const [localFilterPriority, setLocalFilterPriority] = useState<string>("All");
  const [localFilterType, setLocalFilterType] = useState<string>("All");
  const [localFilterStatus, setLocalFilterStatus] = useState<string>("All");

  // Dialog State for Quick Add
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<ItemTypeClass>("Task");
  const [newTaskPriority, setNewTaskPriority] = useState<ItemPriorityClass>("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Expand / collapse sidebar list sections
  const [expandOverdue, setExpandOverdue] = useState(true);
  const [expandToday, setExpandToday] = useState(true);
  const [expandUnscheduled, setExpandUnscheduled] = useState(true);
  const [showMobileOrganizer, setShowMobileOrganizer] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await createItem({
        boardId: board._id,
        body: {
          title: newTaskTitle.trim(),
          columnId: board.columns[0]?.id || "",
          type: newTaskType,
          priority: newTaskPriority,
          dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        }
      }).unwrap();

      // Reset task values
      setNewTaskTitle("");
      setNewTaskType("Task");
      setNewTaskPriority("Medium");
      setNewTaskDueDate("");
      setShowAddTaskDialog(false);
    } catch (err) {
      console.error("Failed to quick add task:", err);
    }
  };

  const renderDayTasksPopoverContent = (
    dateKey: string,
    sortedItems: ItemType[]
  ) => {
    return (
      <div
        className="w-full select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              {new Date(dateKey).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h4>

            <p className="text-xs text-muted-foreground mt-1">
              {sortedItems.length} task
              {sortedItems.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>

          {!isPastDate(dateKey) && (
            <Button
              size="sm"
              onClick={() => {
                setNewTaskDueDate(dateKey);
                setShowAddTaskDialog(true);
              }}
              className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {/* Tasks */}
        <div className="mt-3 max-h-[320px] overflow-y-auto space-y-2">
          {sortedItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No tasks scheduled
            </div>
          ) : (
            sortedItems.map((item) => {
              const col = board.columns?.find((c) => c.id === item.columnId);
              const isCompleted = col
                ? (col.isDone ||
                   col.name.toLowerCase().includes("done") ||
                   col.name.toLowerCase().includes("complete") ||
                   col.name.toLowerCase().includes("finish") ||
                   col.name.toLowerCase().includes("archive"))
                : false;
              const overdue = isOverdue(item) && !isCompleted;

              const columnName = col?.name || item.columnId;

              return (
                <div
                  key={item._id}
                  onClick={() => onCardClick(item)}
                  className="
                  cursor-pointer
                  rounded-xl
                  border
                  border-border
                  bg-card text-card-foreground
                  p-3
                  hover:border-indigo-300
                  hover:shadow-md
                  transition-all
                "
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-3 w-3 rounded-full shrink-0 ${priorityDotColors[item.priority] ||
                        "bg-muted-foreground/20"
                        }`}
                    />

                    <div className="flex-1 min-w-0">
                      <h5 className={`text-sm font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.title}
                      </h5>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                          {columnName}
                        </span>

                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium ${item.priority === "High"
                              ? "bg-red-50 text-red-600"
                              : item.priority === "Medium"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                        >
                          {item.priority}
                        </span>

                        {overdue && (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };
  // Locally filtered items list
  const viewItems = useMemo(() => {
    return items.filter((item) => {
      const matchesPriority = localFilterPriority === "All" || item.priority === localFilterPriority;
      const matchesType = localFilterType === "All" || item.type === localFilterType;
      const matchesStatus = localFilterStatus === "All" || item.columnId === localFilterStatus;
      return matchesPriority && matchesType && matchesStatus;
    });
  }, [items, localFilterPriority, localFilterType, localFilterStatus]);

  // Map items to their due dates (YYYY-MM-DD -> items[])
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ItemType[]>();
    viewItems.forEach((item) => {
      if (item.dueDate) {
        const d = new Date(item.dueDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
    });
    return map;
  }, [viewItems]);

  // Unscheduled items (no due date)
  const unscheduled = useMemo(() => {
    return viewItems.filter((item) => {
      if (item.dueDate) return false;
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
  }, [viewItems, board.columns]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

  // Build calendar grid (6 rows x 7 cols)
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length < 42) calendarCells.push(null);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const isOverdue = (item: ItemType) => {
    if (!item.dueDate) return false;

    const due = new Date(item.dueDate);
    due.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return due < now;
  };

  const overdueItems = useMemo(() => {
    return viewItems.filter((item) => {
      if (!item.dueDate) return false;

      const col = board.columns?.find((c) => c.id === item.columnId);
      const isCompleted = col
        ? (col.isDone ||
           col.name.toLowerCase().includes("done") ||
           col.name.toLowerCase().includes("complete") ||
           col.name.toLowerCase().includes("finish") ||
           col.name.toLowerCase().includes("archive"))
        : false;
      if (isCompleted) return false;

      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      return due < now;
    });
  }, [viewItems, board.columns]);

  const dueTodayItems = useMemo(() => {
    return viewItems.filter((item) => {
      if (!item.dueDate) return false;

      const col = board.columns?.find((c) => c.id === item.columnId);
      const isCompleted = col
        ? (col.isDone ||
           col.name.toLowerCase().includes("done") ||
           col.name.toLowerCase().includes("complete") ||
           col.name.toLowerCase().includes("finish") ||
           col.name.toLowerCase().includes("archive"))
        : false;
      if (isCompleted) return false;

      const due = new Date(item.dueDate);
      const now = new Date();

      return (
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear()
      );
    });
  }, [viewItems, board.columns]);

  const highPriorityCount = useMemo(() => {
    return viewItems.filter((item) => item.priority === "High" || item.priority === "Critical" || item.priority === "Highest").length;
  }, [viewItems]);

  const getDaysLate = (item: ItemType) => {
    if (!item.dueDate) return 0;

    const due = new Date(item.dueDate);
    const now = new Date();

    return Math.floor(
      (now.getTime() - due.getTime()) /
      (1000 * 60 * 60 * 24)
    );
  };

  const handleRescheduleOverdue = async () => {
    if (overdueItems.length === 0) return;
    const todayStr = new Date().toISOString();
    let count = 0;
    for (const item of overdueItems) {
      try {
        await updateItem({ id: item._id, body: { dueDate: todayStr } }).unwrap();
        count++;
      } catch (err) {
        console.error("Failed to reschedule overdue item", item._id, err);
      }
    }
  };

  const handleClearDueDates = async () => {
    const withDueDate = viewItems.filter(item => item.dueDate);
    if (withDueDate.length === 0) return;
    const ok = await confirm({
      title: "Clear Due Dates",
      description: `Are you sure you want to clear due dates for all ${withDueDate.length} filtered task(s)?`,
      confirmText: "Clear",
      variant: "destructive",
    });
    if (!ok) return;
    let count = 0;
    for (const item of withDueDate) {
      try {
        await updateItem({ id: item._id, body: { dueDate: null } }).unwrap();
        count++;
      } catch (err) {
        console.error("Failed to clear due date", item._id, err);
      }
    }
  };

  const handleArchiveCompleted = async () => {
    if (!board.columns || board.columns.length === 0) return;
    const completedColumnIds = board.columns
      .filter(col => {
        const name = col.name.toLowerCase();
        return name.includes("done") || name.includes("complete") || name.includes("finish") || name.includes("archive");
      })
      .map(col => col.id);

    if (completedColumnIds.length === 0 && board.columns.length > 0) {
      completedColumnIds.push(board.columns[board.columns.length - 1].id);
    }

    const completedItems = viewItems.filter(item => completedColumnIds.includes(item.columnId) && !item.archived);
    if (completedItems.length === 0) {
      toast.warning("No completed tasks found in Done/Completed columns to archive.");
      return;
    }

    const ok = await confirm({
      title: "Archive Completed Tasks",
      description: `Are you sure you want to archive all ${completedItems.length} completed task(s)?`,
      confirmText: "Archive All",
    });
    if (!ok) return;
    let count = 0;
    for (const item of completedItems) {
      try {
        await updateItem({ id: item._id, body: { archived: true } }).unwrap();
        count++;
      } catch (err) {
        console.error("Failed to archive item", item._id, err);
      }
    }
  };

  const scheduledCount = items.filter(
    (i) => i.dueDate
  ).length;

  const scheduledMonthCount = useMemo(() => {
    return items.filter((item) => {
      if (!item.dueDate) return false;
      const d = new Date(item.dueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [items, currentMonth, currentYear]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* SMART SIDEBAR (LEFT) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[300px] border-r border-border bg-card flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:w-85 lg:z-0 lg:flex
        ${showMobileOrganizer ? "translate-x-0" : "-translate-x-full"}
      `}>


        {/* STATS */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border bg-card text-card-foreground cursor-pointer border-border/50  p-3 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Scheduled
              </div>
              <div className="text-xl font-bold mt-0.5">
                {scheduledCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-card text-card-foreground cursor-pointer border-border/50  p-3 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Overdue
              </div>
              <div className="text-xl font-bold text-red-600 mt-0.5">
                {overdueItems.length}
              </div>
            </div>

            <div className="rounded-2xl border cursor-pointer bg-card text-card-foreground border-border/50  p-3 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                No Date
              </div>
              <div className="text-xl font-bold mt-0.5">
                {unscheduled.length}
              </div>
            </div>

            <div className="rounded-2xl border bg-card text-card-foreground cursor-pointer border-border/50  p-3 hover:bg-muted/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                High Priority
              </div>
              <div className="text-xl font-bold text-orange-600 mt-0.5">
                {highPriorityCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* OVERDUE */}
          <div className="rounded-2xl bg-red-50/30 border border-red-100 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <button
              onClick={() => setExpandOverdue(!expandOverdue)}
              className="flex items-center justify-between w-full text-left focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  Overdue ({overdueItems.length})
                </span>
              </div>
              {expandOverdue ? (
                <ChevronDown className="h-4 w-4 text-red-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-red-500" />
              )}
            </button>

            {expandOverdue && overdueItems.length > 0 && (
              <div className="space-y-2 mt-3 animate-in slide-in-from-top-1 duration-200">
                {overdueItems.slice(0, 5).map((item) => {
                  const overdue = isOverdue(item);
                  return (
                    <CalendarTaskCard
                      key={item._id}
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
                  );
                })}
              </div>
            )}
            {expandOverdue && overdueItems.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic mt-2 pl-6">No overdue tasks</p>
            )}
          </div>

          {/* TODAY */}
          <div className="rounded-2xl bg-emerald-50/30 border border-emerald-100 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <button
              onClick={() => setExpandToday(!expandToday)}
              className="flex items-center justify-between w-full text-left focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-emerald-650" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Due Today ({dueTodayItems.length})
                </span>
              </div>
              {expandToday ? (
                <ChevronDown className="h-4 w-4 text-emerald-650" />
              ) : (
                <ChevronRight className="h-4 w-4 text-emerald-650" />
              )}
            </button>

            {expandToday && dueTodayItems.length > 0 && (
              <div className="space-y-2 mt-3 animate-in slide-in-from-top-1 duration-200">
                {dueTodayItems.map((item) => {
                  const overdue = isOverdue(item);
                  return (
                    <CalendarTaskCard
                      key={item._id}
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
                  );
                })}
              </div>
            )}
            {expandToday && dueTodayItems.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic mt-2 pl-6">No tasks due today</p>
            )}
          </div>

          {/* UNSCHEDULED */}
          <div className="rounded-2xl border border-border/50 bg-background/20 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <button
              onClick={() => setExpandUnscheduled(!expandUnscheduled)}
              className="flex items-center justify-between w-full text-left focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-foreground/90 uppercase tracking-wider">
                  Unscheduled ({unscheduled.length})
                </span>
              </div>
              {expandUnscheduled ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expandUnscheduled && unscheduled.length > 0 && (
              <div className="space-y-2 mt-3 animate-in slide-in-from-top-1 duration-200">
                {unscheduled.map((item) => {
                  const overdue = isOverdue(item);
                  return (
                    <CalendarTaskCard
                      key={item._id}
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
                  );
                })}
              </div>
            )}
            {expandUnscheduled && unscheduled.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic mt-2 pl-6">No unscheduled tasks</p>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CALENDAR GRID (RIGHT) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* CONTROL BAR & FILTERS HEADER (Apple / Google Style) */}
        <div className="flex flex-row items-center justify-between gap-3 px-6 py-4 border-b border-border bg-card text-card-foreground/95 backdrop-blur-md sticky top-0 z-50 shrink-0 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10/60 rounded-xl border border-primary/20 text-primary shadow-sm shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span className="hidden md:inline-flex text-[10px] font-semibold text-muted-foreground bg-muted border border-border/50 px-2 py-0.5 rounded-full">
                  {scheduledMonthCount} active
                </span>
              </h2>
              <p className="hidden md:block text-[11px] text-zinc-404 mt-0.5">Monthly Calendar View</p>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden shrink-0 rounded-xl h-8 px-2.5 border-border bg-card font-bold flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filter</span>
          </Button>

          {/* Date Navigator & Selection Controls */}
          <div className="hidden md:flex flex-wrap items-center gap-2.5">
            {/* Shift Controls */}
            <div className="flex items-center border border-border bg-card text-card-foreground rounded-xl shadow-xs p-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={goToPrevMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-zinc-655 hover:text-foreground hover:bg-background"
              >
                Today
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={goToNextMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dropdown selectors for Month & Year */}
            <div className="flex items-center gap-1.5">
              <Select
                value={currentMonth.toString()}
                onValueChange={(val) => setCurrentMonth(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 w-28 rounded-xl border-border text-xs font-semibold bg-card text-card-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[60]">
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={idx.toString()} className="text-xs cursor-pointer rounded-lg">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={currentYear.toString()}
                onValueChange={(val) => setCurrentYear(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 w-20 rounded-xl border-border text-xs font-semibold bg-card text-card-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[60]">
                  {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((yr) => (
                    <SelectItem key={yr} value={yr.toString()} className="text-xs cursor-pointer rounded-lg">
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Add Button */}
            <Button
              size="sm"
              onClick={() => {
                setNewTaskDueDate("");
                setShowAddTaskDialog(true);
              }}
              className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer shadow-sm hover:scale-[1.01] transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          </div>
        </div>

        {/* WEEKDAYS */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          key={`${currentMonth}-${currentYear}`}
          className="grid grid-cols-7 flex-1 overflow-auto animate-in fade-in duration-300"
        >
          {calendarCells.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={idx}
                  className="border-r border-b border-border bg-background"
                />
              );
            }

            const dateKey = `${currentYear}-${String(
              currentMonth + 1
            ).padStart(2, "0")}-${String(day).padStart(
              2,
              "0"
            )}`;

            const dayItems = itemsByDate.get(dateKey) || [];
            const priorityOrder: Record<string, number> = {
              Critical: 0,
              Highest: 1,
              High: 2,
              Medium: 3,
              Low: 4,
              Lowest: 5,
            };
            const sortedDayItems = [...dayItems].sort((a, b) => {
              const pA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
              const pB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
              return pA - pB;
            });
            const todayCell = isToday(day);

            const cellContent = (
              <div
                className={`
                  border-r border-b border-border
                  min-h-16 md:min-h-40
                  p-1 md:p-2
                  transition-all duration-300
                  hover:bg-background/60
                  hover:shadow-inner
                  group flex flex-col justify-between h-full
                  ${todayCell
                    ? "bg-primary/10/40"
                    : "bg-card text-card-foreground"
                  }
                `}
              >
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-1 md:mb-2">
                    <div
                      className={`
                        w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center
                        text-xs md:text-sm font-bold transition-all
                        ${todayCell
                          ? "bg-primary text-white shadow-lg"
                          : "text-foreground/90"
                        }
                      `}
                    >
                      {day}
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                      {/* Hover Plus Button like Google Calendar */}
                      {!isPastDate(dateKey) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTaskDueDate(dateKey);
                            setShowAddTaskDialog(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground/90 cursor-pointer"
                          title="Add task on this day"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Hover Eye Button to view all tasks */}
                      {dayItems.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground/90 cursor-pointer"
                              title="View all tasks on this day"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-full bg-card text-card-foreground/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-xl z-[100]">
                            {renderDayTasksPopoverContent(dateKey, sortedDayItems)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {dayItems.length > 0 && (
                        <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {dayItems.length}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop View: Full Card List */}
                  <div className="hidden md:block space-y-1.5 flex-1 overflow-y-auto">
                    {sortedDayItems.slice(0, 2).map((item) => {
                      const col = board.columns?.find((c) => c.id === item.columnId);
                      const isCompleted = col
                        ? (col.isDone ||
                           col.name.toLowerCase().includes("done") ||
                           col.name.toLowerCase().includes("complete") ||
                           col.name.toLowerCase().includes("finish") ||
                           col.name.toLowerCase().includes("archive"))
                        : false;
                      const overdue = isOverdue(item) && !isCompleted;
                      return (
                        <button
                          key={item._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCardClick(item);
                          }}
                          className={`
                            w-full text-left
                            rounded-lg
                            border
                            p-2
                            bg-card text-card-foreground
                            shadow-sm
                            transition-all duration-200
                            hover:-translate-y-0.5
                            hover:shadow-md
                            cursor-pointer
                            ${overdue
                              ? "border-red-200 border-l-4 border-l-red-500"
                              : "border-border"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`w-2 h-2 rounded-full ${priorityDotColors[item.priority]}`}
                            />
                            <span className={`text-[11px] font-semibold truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              Due
                            </span>
                            {overdue && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-655 text-[9px] font-bold">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          {overdue && (
                            <div className="mt-1 text-[10px] font-semibold text-red-500">
                              {getDaysLate(item)} day{getDaysLate(item) > 1 ? "s" : ""} late
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {sortedDayItems.length > 2 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-center text-[10px] font-bold text-primary hover:text-indigo-755 bg-primary/10/45 hover:bg-primary/10 py-1.5 rounded-lg border border-dashed border-indigo-150 transition-colors cursor-pointer mt-1"
                          >
                            +{sortedDayItems.length - 2} more task{sortedDayItems.length - 2 > 1 ? "s" : ""}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="bg-card text-card-foreground/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-xl z-[100]">
                          {renderDayTasksPopoverContent(dateKey, sortedDayItems)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Mobile View: Tiny Color Indicator Dots */}
                <div className="flex md:hidden flex-wrap gap-1 justify-center mt-1 shrink-0 pb-1">
                  {sortedDayItems.map((item) => (
                    <span
                      key={item._id}
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDotColors[item.priority]}`}
                    />
                  ))}
                </div>
              </div>
            );

            return (
              <div key={dateKey} className="contents">
                {/* Mobile Trigger wrapper */}
                <div className="block md:hidden h-full">
                  {dayItems.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full h-full p-0 border-0 bg-transparent text-left focus:outline-none select-none cursor-pointer">
                          {cellContent}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-[85vw] max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-3 shadow-xl z-[100]">
                        {renderDayTasksPopoverContent(dateKey, sortedDayItems)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    cellContent
                  )}
                </div>

                {/* Desktop static layout */}
                <div className="hidden md:block h-full">
                  {cellContent}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog for Quick Add Task */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full z-[101]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Add Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new task under the first column of the board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="task-title" className="text-xs font-bold text-muted-foreground">Task Title</label>
              <Input
                id="task-title"
                placeholder="Write a task description..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-background/30 focus:bg-card text-card-foreground focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Type</label>
                <Select value={newTaskType} onValueChange={(val) => setNewTaskType(val as ItemTypeClass)}>
                  <SelectTrigger className="h-10 rounded-xl border-border bg-background/30 focus:bg-card text-card-foreground">
                    <SelectValue placeholder="Task" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg z-[102]">
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Idea">Idea</SelectItem>
                    <SelectItem value="Issue">Issue</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Priority</label>
                <Select value={newTaskPriority} onValueChange={(val) => setNewTaskPriority(val as ItemPriorityClass)}>
                  <SelectTrigger className="h-10 rounded-xl border-border bg-background/30 focus:bg-card text-card-foreground">
                    <SelectValue placeholder="Medium" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg z-[102]">
                    <SelectItem value="Lowest">Lowest</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Highest">Highest</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="task-due-date" className="text-xs font-bold text-muted-foreground">Due Date (Optional)</label>
              <Input
                id="task-due-date"
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="h-10 rounded-xl border-border bg-background/30 focus:bg-card text-card-foreground focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddTaskDialog(false)}
                className="rounded-xl px-4 text-muted-foreground hover:bg-background"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl px-5 bg-primary hover:bg-indigo-705 text-white font-semibold"
              >
                Create Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>


      {showMobileOrganizer && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setShowMobileOrganizer(false)}
        />
      )}

      {/* Mobile Filters/Config Dialog */}
      <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <DialogContent className="max-w-[90vw] rounded-2xl bg-card border border-border shadow-xl p-6 text-foreground">
          <DialogHeader>
            <DialogTitle>Calendar Configurations</DialogTitle>
            <DialogDescription>Shift calendar range month, year, or jump to today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Shift Month Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Navigate Month</label>
              <div className="flex items-center justify-between border border-border bg-muted/30 text-card-foreground rounded-xl p-1.5 w-full">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { goToPrevMonth(); }}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-muted-foreground hover:text-foreground hover:bg-background font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <div className="w-[1px] h-5 bg-border shrink-0" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { goToToday(); }}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-zinc-655 hover:text-foreground hover:bg-background cursor-pointer"
                >
                  Today
                </Button>
                <div className="w-[1px] h-5 bg-border shrink-0" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { goToNextMonth(); }}
                  className="flex-grow flex-1 py-1.5 h-auto rounded-lg text-muted-foreground hover:text-foreground hover:bg-background font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Month & Year Selectors */}
            <div className="space-y-3.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Select Month / Year</label>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Month</span>
                  <Select
                    value={currentMonth.toString()}
                    onValueChange={(val) => setCurrentMonth(parseInt(val, 10))}
                  >
                    <SelectTrigger className="h-9 w-full rounded-xl border border-border text-xs font-semibold bg-muted/50 text-foreground cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[150]">
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={idx.toString()} className="text-xs cursor-pointer rounded-lg">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Year</span>
                  <Select
                    value={currentYear.toString()}
                    onValueChange={(val) => setCurrentYear(parseInt(val, 10))}
                  >
                    <SelectTrigger className="h-9 w-full rounded-xl border border-border text-xs font-semibold bg-muted/50 text-foreground cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[150]">
                      {Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i).map((yr) => (
                        <SelectItem key={yr} value={yr.toString()} className="text-xs cursor-pointer rounded-lg">
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
