// src/components/board/ListView.tsx
import { useState } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckSquare,
  MessageSquare,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useUpdateItemMutation,
  useCreateItemMutation,
} from "@/store/services/api";
import { typeBadges, priorityDotColors, typeIcons } from "./TaskCard";
import type { BoardType, ItemType, ColumnType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  Sliders,
  Pencil,
  Copy,
  Link,
  Archive,
  ArrowRightLeft,
  Settings,
  ArrowLeft,
  ArrowRight,
  ChevronsRight,
  UserMinus,
  UserPlus,
} from "lucide-react";

interface ListViewProps {
  board: BoardType;
  items: ItemType[];
  onCardClick: (item: ItemType) => void;
  onCreateCard: (colId: string, title: string) => Promise<void>;
  onMoveCard: (itemId: string, targetColId: string, newOrder?: number) => Promise<void>;
  onReorderCard: (itemId: string, colId: string, newOrder: number) => Promise<void>;
  onBulkUpdateStatus: (itemIds: string[], targetColId: string) => Promise<void>;
  onBulkUpdatePriority: (itemIds: string[], priority: string) => Promise<void>;
  onBulkDelete: (itemIds: string[]) => Promise<void>;
  workspaceRole?: string;
  emailToNameMap?: Record<string, string>;
  assigneeOptions?: string[];
  onRenameColumn?: (colId: string, name: string) => Promise<void>;
  onUpdateColumn?: (colId: string, updates: Partial<ColumnType>) => Promise<void>;
  onDeleteColumn?: (colId: string) => Promise<void>;
  onShiftColumn?: (colId: string, direction: "left" | "right") => Promise<void>;
  onMoveColumnToEnd?: (colId: string) => Promise<void>;
}

type SortKey = "title" | "type" | "priority" | "assignee" | "dueDate" | "column";
type SortDir = "asc" | "desc";

const priorityOrder = { Critical: 0, Highest: 1, High: 2, Medium: 3, Low: 4, Lowest: 5 };

// Color mapping for Monday-style status groupings
const getColumnColorTheme = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("todo") || n.includes("to do") || n.includes("backlog")) {
    return {
      border: "border-l-primary",
      bg: "bg-primary/10/30",
      text: "text-primary",
      dot: "bg-primary",
      badge: "bg-primary/10 text-primary border-primary/25",
    };
  }
  if (n.includes("progress") || n.includes("doing") || n.includes("review") || n.includes("active")) {
    return {
      border: "border-l-amber-500",
      bg: "bg-amber-50/30",
      text: "text-amber-700",
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 border-amber-250/60",
    };
  }
  if (n.includes("done") || n.includes("complete") || n.includes("resolve") || n.includes("finish")) {
    return {
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/30",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-250/65",
    };
  }
  return {
    border: "border-l-purple-500",
    bg: "bg-purple-50/30",
    text: "text-purple-700",
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  };
};

export function ListView({
  board,
  items,
  onCardClick,
  onCreateCard,
  onMoveCard,
  onReorderCard,
  onBulkUpdateStatus,
  onBulkUpdatePriority,
  onBulkDelete,
  workspaceRole,
  emailToNameMap,
  assigneeOptions,
  onRenameColumn,
  onUpdateColumn,
  onDeleteColumn,
  onShiftColumn,
  onMoveColumnToEnd,
}: ListViewProps) {
  const confirm = useConfirm();
  const [sortKey, setSortKey] = useState<SortKey>("column");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [quickAddTitles, setQuickAddTitles] = useState<Record<string, string>>({});
  const [activeDragItem, setActiveDragItem] = useState<ItemType | null>(null);

  // States for column configuration & deletion
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [activeConfigureColumn, setActiveConfigureColumn] = useState<ColumnType | null>(null);
  const [configName, setConfigName] = useState("");
  const [configStatusMapping, setConfigStatusMapping] = useState("");
  const [configIsDone, setConfigIsDone] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const handleOpenConfigure = (col: ColumnType) => {
    setActiveConfigureColumn(col);
    setConfigName(col.name);
    setConfigStatusMapping(col.statusMapping || "");
    setConfigIsDone(!!col.isDone);
  };

  const handleSaveConfig = async () => {
    if (!activeConfigureColumn || !onUpdateColumn) return;
    await onUpdateColumn(activeConfigureColumn.id, {
      name: configName.trim(),
      statusMapping: configStatusMapping.trim(),
      isDone: configIsDone,
    });
    setActiveConfigureColumn(null);
  };

  const handleRenameColumn = async (colId: string) => {
    if (!editColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    if (onRenameColumn) {
      await onRenameColumn(colId, editColumnName.trim());
    }
    setEditingColumnId(null);
    setEditColumnName("");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getColumnItems = (colId: string) => {
    const colItems = items.filter((it) => it.columnId === colId);
    if (sortKey === "column") {
      return colItems.sort((a, b) => a.order - b.order);
    }

    return colItems.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "type":
          return dir * a.type.localeCompare(b.type);
        case "priority":
          return dir * ((priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
        case "assignee":
          return dir * (a.assignee || "zzz").localeCompare(b.assignee || "zzz");
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        default:
          return dir * (a.order - b.order);
      }
    });
  };

  const toggleColumnCollapse = (colId: string) => {
    setCollapsedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(items.map((it) => it._id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleQuickCreate = async (colId: string) => {
    const title = quickAddTitles[colId];
    if (!title || !title.trim()) return;
    await onCreateCard(colId, title.trim());
    setQuickAddTitles((prev) => ({ ...prev, [colId]: "" }));
  };

  const isAllSelected = items.length > 0 && selectedItemIds.length === items.length;
  const isSomeSelected = selectedItemIds.length > 0 && selectedItemIds.length < items.length;

  // Custom ref to assign checkbox indeterminate state
  const checkboxRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = isSomeSelected;
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((it) => it._id === event.active.id);
    if (item) setActiveDragItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedItem = items.find((it) => it._id === activeId);
    if (!draggedItem) return;

    // dropped over a column section directly
    const targetColumn = board.columns.find((c) => c.id === overId);
    if (targetColumn) {
      if (draggedItem.columnId !== targetColumn.id) {
        await onMoveCard(activeId, targetColumn.id, 0);
      }
      return;
    }

    const overItem = items.find((it) => it._id === overId);
    if (overItem) {
      const targetColId = overItem.columnId;
      if (draggedItem.columnId === targetColId) {
        // reorder within column
        const colItems = getColumnItems(targetColId);
        const oldIndex = colItems.findIndex((it) => it._id === activeId);
        const newIndex = colItems.findIndex((it) => it._id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          await onReorderCard(activeId, targetColId, newIndex);
        }
      } else {
        // move to another column
        const targetColItems = getColumnItems(targetColId);
        const overIndex = targetColItems.findIndex((it) => it._id === overId);
        await onMoveCard(activeId, targetColId, overIndex >= 0 ? overIndex : 0);
      }
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 p-4 md:p-6 overflow-x-auto overflow-y-auto">
        <div className="min-w-0 md:min-w-225 bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Main Table Column Header Row */}
          <div className="grid grid-cols-[32px_1fr_90px] md:grid-cols-[48px_40px_1fr_120px_120px_140px_140px_120px] gap-2 items-center border-b border-border bg-background/80 py-3 select-none">
            {/* Grip col placeholder */}
            <div className="hidden md:block" />
            {/* Master checkbox */}
            <div className="flex justify-center">
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            {/* Headings */}
            {[
              { key: "title" as SortKey, label: "Task Title" },
              { key: "type" as SortKey, label: "Type" },
              { key: "priority" as SortKey, label: "Priority" },
              { key: "assignee" as SortKey, label: "Assignee" },
              { key: "dueDate" as SortKey, label: "Due Date" },
              { key: "column" as SortKey, label: "Status" },
            ].map(({ key, label }, idx) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`flex items-center gap-1 px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left w-full
                  ${idx === 0 ? "font-bold" : ""}
                  ${idx >= 1 && idx <= 4 ? "hidden md:flex" : "flex"}
                `}
              >
                {label}
                <SortIcon colKey={key} />
              </button>
            ))}
          </div>

          {/* Grouped Status Sections */}
          <div className="divide-y divide-zinc-200/60">
            {sortedColumns.map((column, colIdx) => {
              const theme = getColumnColorTheme(column.name);
              const colItems = getColumnItems(column.id);
              const itemIds = colItems.map((it) => it._id);
              const isCollapsed = !!collapsedColumns[column.id];

              return (
                <div key={column.id} className="flex flex-col">
                  {/* Collapsible Header */}
                  <div className={`flex items-center justify-between py-2.5 px-3 bg-background hover:bg-background transition-colors border-b border-border/60 ${theme.border} border-l-4`}>
                    <div className="flex items-center min-w-0 flex-1">
                      <button
                        onClick={() => toggleColumnCollapse(column.id)}
                        className="p-1 hover:bg-muted/70 text-muted-foreground rounded cursor-pointer mr-1.5 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {editingColumnId === column.id ? (
                        <input
                          type="text"
                          value={editColumnName}
                          onChange={(e) => setEditColumnName(e.target.value)}
                          onBlur={() => handleRenameColumn(column.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameColumn(column.id)}
                          className="text-xs font-bold text-zinc-955 bg-card text-card-foreground border border-border px-2 py-0.5 rounded-lg w-48 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          onDoubleClick={() => {
                            if (workspaceRole !== "GUEST") {
                              setEditingColumnId(column.id);
                              setEditColumnName(column.name);
                            }
                          }}
                          className={`text-xs font-extrabold uppercase tracking-wider ${theme.text} flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-all`}
                        >
                          {column.name}
                        </span>
                      )}

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-muted/80 text-muted-foreground shrink-0 ml-2">
                        {colItems.length}
                      </span>
                    </div>

                    {/* Column controls / meatballs menu */}
                    {workspaceRole !== 'GUEST' && (
                      <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted/70 text-muted-foreground cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenConfigure(column)}>
                              <Settings className="size-3.5 mr-2 text-muted-foreground" />
                              Configure Column
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onShiftColumn?.(column.id, "left")}
                              disabled={colIdx === 0}
                            >
                              <ArrowLeft className="size-3.5 mr-2 text-muted-foreground" />
                              Move Left
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onShiftColumn?.(column.id, "right")}
                              disabled={colIdx === sortedColumns.length - 1}
                            >
                              <ArrowRight className="size-3.5 mr-2 text-muted-foreground" />
                              Move Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMoveColumnToEnd?.(column.id)}>
                              <ChevronsRight className="size-3.5 mr-2 text-muted-foreground" />
                              Move To End
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => { setColumnToDelete(column.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {/* Tasks Rows Container */}
                  {!isCollapsed && (
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      <DroppableSection colId={column.id}>
                        {colItems.length === 0 ? (
                          <div className={`px-12 py-6 text-center text-muted-foreground text-xs italic bg-card text-card-foreground border-b border-border ${theme.border} border-l-4`}>
                            No tasks in this status
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {colItems.map((item) => {
                              const isOverdue =
                                item.dueDate &&
                                new Date(item.dueDate) < new Date() &&
                                !column.name.toLowerCase().includes("done");

                              return (
                                <SortableRow
                                  key={item._id}
                                  item={item}
                                  column={column}
                                  board={board}
                                  assigneeOptions={assigneeOptions}
                                  selected={selectedItemIds.includes(item._id)}
                                  onSelect={() => handleSelectItem(item._id)}
                                  onClick={() => onCardClick(item)}
                                  onDelete={async () => {
                                    const ok = await confirm({
                                      title: "Delete Task",
                                      description: `Are you sure you want to permanently delete task "${item.title}"?`,
                                      confirmText: "Delete",
                                      variant: "destructive",
                                    });
                                    if (ok) {
                                      await onBulkDelete([item._id]);
                                    }
                                  }}
                                  theme={theme}
                                  isOverdue={!!isOverdue}
                                  emailToNameMap={emailToNameMap}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Inline Task Creation Row at bottom of status table */}
                        <div className={`grid grid-cols-[48px_40px_1fr] gap-2 items-center px-4 py-2 border-b border-border/40 bg-background/10 hover:bg-background transition-all ${theme.border} border-l-4`}>
                          <div className="flex justify-center text-muted-foreground">
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                          </div>
                          <div /> {/* checkbox spacing */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`+ Add task to ${column.name}...`}
                              value={quickAddTitles[column.id] || ""}
                              onChange={(e) =>
                                setQuickAddTitles((prev) => ({
                                  ...prev,
                                  [column.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleQuickCreate(column.id);
                              }}
                              className="w-full text-xs text-foreground/90 bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground font-semibold py-1 focus:outline-none"
                            />
                            {quickAddTitles[column.id]?.trim() && (
                              <button
                                onClick={() => handleQuickCreate(column.id)}
                                className="text-[10px] bg-primary hover:bg-primary/90 text-white font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </DroppableSection>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950 border border-border text-white rounded-2xl px-6 py-3.5 shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 pr-4 border-r border-border">
            <span className="bg-primary text-white text-[10px] font-extrabold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full">
              {selectedItemIds.length}
            </span>
            <span className="text-xs font-bold text-muted-foreground">tasks selected</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Change Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold gap-1.5 rounded-xl cursor-pointer">
                  <ArrowRightLeft className="size-3.5" />
                  Move to status...
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-950 border border-border text-white rounded-xl">
                {board.columns.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={async () => {
                      await onBulkUpdateStatus(selectedItemIds, c.id);
                      setSelectedItemIds([]);
                    }}
                    className="hover:bg-zinc-800 focus:bg-zinc-800 text-white"
                  >
                    <StatusIndicator status={c.name} showText={false} className="border-0 bg-transparent p-0 mr-2" />
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Change Priority */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold gap-1.5 rounded-xl cursor-pointer">
                  <Sliders className="size-3.5" />
                  Change priority...
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-950 border border-border text-white rounded-xl">
                {(["Critical", "Highest", "High", "Medium", "Low", "Lowest"] as ItemPriorityClass[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={async () => {
                      await onBulkUpdatePriority(selectedItemIds, p);
                      setSelectedItemIds([]);
                    }}
                    className="hover:bg-zinc-800 focus:bg-zinc-800 text-white"
                  >
                    <PriorityIndicator priority={p} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await onBulkDelete(selectedItemIds);
                setSelectedItemIds([]);
              }}
              className="h-8 rounded-xl font-bold bg-red-950/40 border border-red-900/60 hover:bg-red-900 text-red-200"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>

            {/* Cancel */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItemIds([])}
              className="text-muted-foreground hover:text-white font-bold h-8 rounded-xl"
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Drag Overlay for Row Drag Preview */}
      <DragOverlay>
        {activeDragItem ? (
          <div className="min-w-0 md:min-w-225 border border-primary/25/80 bg-primary/10/20 py-2.5 px-4 grid grid-cols-[32px_1fr_90px] md:grid-cols-[48px_40px_1fr_120px_120px_140px_140px_120px] gap-2 items-center text-xs text-foreground/90 shadow-xl rounded-xl opacity-90 border-l-4 border-l-indigo-600">
            <div className="hidden md:flex justify-center text-primary">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="hidden md:block" />
            <div className="font-semibold text-foreground truncate text-sm">{activeDragItem.title}</div>
            <div className="hidden md:block">
              <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wide ${typeBadges[activeDragItem.type]?.styles || typeBadges.Task.styles}`}>
                {activeDragItem.type}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 font-semibold">
              <span className={`w-2 h-2 rounded-full ${priorityDotColors[activeDragItem.priority]}`} />
              {activeDragItem.priority}
            </div>
            <div className="hidden md:block">
              {activeDragItem.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-extrabold uppercase">
                      {activeDragItem.assignee.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-25 font-semibold">{activeDragItem.assignee}</span>
                </div>
              ) : (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </div>
            <div className="hidden md:block">
              {activeDragItem.dueDate ? (
                <span className="text-xs font-bold flex items-center gap-1 text-zinc-550">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(activeDragItem.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div>
              <Badge variant="secondary" className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-primary/10 text-primary border-primary/25">
                {board.columns.find((c) => c.id === activeDragItem.columnId)?.name || "Unknown"}
              </Badge>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Delete Column Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card text-card-foreground rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">Delete Column</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs mt-1">
              {`Are you sure you want to delete the column "${columnToDelete ? board.columns.find((c) => c.id === columnToDelete)?.name ?? "" : ""
                }"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-650 hover:bg-red-700 text-white rounded-xl"
              onClick={async () => {
                if (columnToDelete && onDeleteColumn) {
                  await onDeleteColumn(columnToDelete);
                }
                setDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure Column Dialog */}
      <Dialog open={activeConfigureColumn !== null} onOpenChange={(open) => !open && setActiveConfigureColumn(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Column Configuration</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Configure settings for the "{activeConfigureColumn?.name}" column.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/90">Column Name</label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g. In Progress"
                className="text-xs rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/90">Status Mapping</label>
              <Input
                value={configStatusMapping}
                onChange={(e) => setConfigStatusMapping(e.target.value)}
                placeholder="e.g. IN_PROGRESS, STARTED"
                className="text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Map backend status values for workflow integrations.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="col-done-toggle-list"
                checked={configIsDone}
                onChange={(e) => setConfigIsDone(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="col-done-toggle-list" className="text-xs font-semibold text-foreground/90 cursor-pointer select-none">
                Mark as Completed Stage
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveConfigureColumn(null)}
              className="text-xs font-semibold text-muted-foreground rounded-lg animate-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveConfig}
              className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

// Droppable column container for empty and target section drop targets
function DroppableSection({ colId, children }: { colId: string; children: React.ReactNode }) {
  const { setNodeRef } = useSortable({
    id: colId,
    data: { type: "column" },
  });

  return (
    <div ref={setNodeRef} className="min-h-10">
      {children}
    </div>
  );
}

/// Sortable table row component
function SortableRow({
  item,
  column,
  board,
  assigneeOptions = [],
  selected,
  onSelect,
  onClick,
  onDelete,
  theme,
  isOverdue,
  emailToNameMap,
}: {
  item: ItemType;
  column: ColumnType;
  board: BoardType;
  assigneeOptions?: string[];
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDelete: () => void;
  theme: any;
  isOverdue: boolean;
  emailToNameMap?: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });

  const [updateItem] = useUpdateItemMutation();
  const [createItem] = useCreateItemMutation();
  const rbac = useRBAC();
  const confirm = useConfirm();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group grid grid-cols-[32px_1fr_90px] md:grid-cols-[48px_40px_1fr_120px_120px_140px_140px_120px] gap-2 items-center border-b border-border/60 hover:bg-primary/10/20 bg-card text-card-foreground transition-all py-2.5 text-xs text-foreground/90 ${theme.border
        } border-l-4 ${isDragging ? "opacity-45 shadow-lg bg-zinc-55" : ""}`}
    >
      {/* Col 1: Drag handle (listener active only here) */}
      <div className="hidden md:flex justify-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-zinc-355 hover:text-muted-foreground hover:bg-muted rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Col 2: Checkbox */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="h-4 w-4 rounded border-zinc-350 text-primary focus:ring-indigo-500 cursor-pointer"
        />
      </div>

      {/* Col 3: Task Title */}
      <div className="min-w-0 pr-4 flex flex-col justify-center">
        <button
          onClick={onClick}
          className="font-semibold text-foreground hover:text-primary truncate transition-colors text-left text-sm cursor-pointer"
        >
          {item.title}
        </button>
        {/* badges/indicators */}
        {(item.comments?.length > 0 || item.checklist?.length > 0) && (
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-bold">
            {item.checklist?.length > 0 && (
              <span className="flex items-center gap-0.5">
                <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                {item.checklist.filter((c) => c.completed).length}/{item.checklist.length}
              </span>
            )}
            {item.comments?.length > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                {item.comments.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Col 4: Type */}
      <div className="hidden md:flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none cursor-pointer flex items-center gap-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wide w-fit hover:opacity-85 transition-opacity flex items-center gap-1.5 ${typeBadges[item.type]?.styles || typeBadges.Task.styles
                  }`}
              >
                {typeIcons[item.type]}
                {item.type}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
            {(["Task", "Bug", "Lead", "Idea", "Issue", "Event"] as ItemTypeClass[]).map((t) => (
              <DropdownMenuItem
                key={t}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await updateItem({ id: item._id, body: { type: t } }).unwrap();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={t === item.type ? 'bg-background font-bold' : ''}
              >
                {typeIcons[t]}
                <span>{t}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Col 5: Priority */}
      <div className="hidden md:flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center rounded cursor-pointer transition-colors focus:outline-none" onClick={(e) => e.stopPropagation()}>
              <PriorityIndicator priority={item.priority} showText={true} className="border-0 bg-transparent p-0 hover:bg-transparent" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
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
                className="hover:bg-zinc-55"
              >
                <PriorityIndicator priority={prio} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Col 6: Assignee */}
      <div className="hidden md:flex items-center min-w-0">
        {item.assignee ? (() => {
          const resolvedName = (emailToNameMap && emailToNameMap[item.assignee.toLowerCase().trim()]) || item.assignee;
          const initials = resolvedName
            .split(" ")
            .map((s: string) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 min-w-0 text-left focus:outline-none cursor-pointer hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                  title={resolvedName}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar className="h-6 w-6 border border-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-indigo-755 text-[9px] font-extrabold uppercase">
                      {initials || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-25 font-semibold">
                    {resolvedName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                <div className="px-3 py-2">
                  <p className="text-xs font-extrabold text-foreground">{resolvedName}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">{item.assignee}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-[9px] font-bold bg-primary/10 text-indigo-750 px-1.5 py-0.5 rounded-full">Member</span>
                  </div>
                </div>
                {assigneeOptions && assigneeOptions.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="px-3">Quick Reassign</DropdownMenuLabel>
                    <div className="max-h-36 overflow-y-auto">
                      {assigneeOptions.map((email) => {
                        const optionName = (emailToNameMap && emailToNameMap[email.toLowerCase().trim()]) || email;
                        return (
                          <DropdownMenuItem
                            key={email}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={email === item.assignee ? 'bg-background text-indigo-755 font-bold' : ''}
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
                  onClick={async (e) => {
                    e.stopPropagation();
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
              <button
                className="focus:outline-none cursor-pointer rounded-full text-zinc-455 hover:text-muted-foreground"
                title="Unassigned"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-zinc-450 italic hover:underline hover:text-muted-foreground text-xs">Unassigned</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel className="px-3">Assign Task</DropdownMenuLabel>
              {assigneeOptions && assigneeOptions.length > 0 ? (
                <div className="max-h-36 overflow-y-auto">
                  {assigneeOptions.map((email) => {
                    const optionName = (emailToNameMap && emailToNameMap[email.toLowerCase().trim()]) || email;
                    return (
                      <DropdownMenuItem
                        key={email}
                        onClick={async (e) => {
                          e.stopPropagation();
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
                <p className="text-[11px] text-muted-foreground px-3 py-1.5 italic">No members available</p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Col 7: Due Date */}
      <div className="hidden md:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : ""}
          onChange={async (e) => {
            const val = e.target.value ? new Date(e.target.value).toISOString() : null;
            try {
              await updateItem({ id: item._id, body: { dueDate: val } }).unwrap();
            } catch (err) {
              console.error(err);
            }
          }}
          className={`text-xs font-semibold bg-transparent hover:bg-muted focus:bg-card text-card-foreground rounded px-1.5 py-0.5 border-none outline-none focus:ring-0 cursor-pointer w-28
            ${isOverdue ? "text-red-650 bg-red-50/50" : "text-zinc-550"}`}
        />
      </div>

      {/* Col 8: Status Badge & Actions dropdown */}
      <div className="flex items-center justify-between group-hover:pr-2">
        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
              <StatusIndicator status={column.name} showText={true} className="border-0 bg-transparent p-0 hover:bg-transparent" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {board.columns.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await updateItem({ id: item._id, body: { columnId: c.id } }).unwrap();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={c.id === column.id ? 'bg-background font-bold' : ''}
              >
                <StatusIndicator status={c.name} showText={false} className="border-0 bg-transparent p-0 mr-2" />
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Meatballs menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
              title="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {rbac.canEditCard() && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                Edit Issue
              </DropdownMenuItem>
            )}
            {rbac.canMoveCard() && board.columns && board.columns.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                  <ArrowRightLeft className="size-3.5 mr-2 text-muted-foreground" />
                  Move Issue
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent onClick={(e) => e.stopPropagation()}>
                  {board.columns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      disabled={col.id === item.columnId}
                      onClick={async (e) => {
                        e.stopPropagation();
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
              onClick={async (e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/workspace/${board.workspace}/board/${board._id}/item/${item._id}`);
              }}
            >
              <Link className="size-3.5 mr-2 text-muted-foreground" />
              Copy Link
            </DropdownMenuItem>
            {rbac.canArchive() && (
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
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
  );
}
