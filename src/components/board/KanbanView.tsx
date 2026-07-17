// src/components/board/KanbanView.tsx
import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  useDroppable,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  MoreHorizontal,
  CheckSquare,
  Bug,
  Sparkles,
  Users,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Minus,
  CheckCircle2,
  Settings,
  ArrowLeft,
  ArrowRight,
  ChevronsRight,
  Trash2,
  HelpCircle,
  Loader2,
  Sliders,
} from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TaskCard } from "./TaskCard";
import type { BoardType, ItemType, ColumnType } from "@/types/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanViewProps {
  board: BoardType;
  items: ItemType[];
  onCardClick: (item: ItemType) => void;
  onCreateCard: (
    colId: string,
    title: string,
    type?: string,
    priority?: string
  ) => Promise<void>;
  onMoveCard: (itemId: string, targetColId: string, newOrder?: number) => Promise<void>;
  onReorderCard: (itemId: string, colId: string, newOrder: number) => Promise<void>;
  onAddColumn: (name: string, isDone?: boolean) => Promise<void>;
  onRenameColumn: (colId: string, name: string) => Promise<void>;
  onUpdateColumn: (colId: string, updates: Partial<ColumnType>) => Promise<void>;
  onToggleColumnDone: (colId: string, isDone: boolean) => Promise<void>;
  onDeleteColumn: (colId: string) => Promise<void>;
  onShiftColumn: (colId: string, direction: "left" | "right") => Promise<void>;
  onMoveColumnToEnd: (colId: string) => Promise<void>;
  onBulkUpdateStatus: (itemIds: string[], status: string) => Promise<void>;
  onBulkUpdatePriority: (itemIds: string[], priority: string) => Promise<void>;
  onBulkDelete: (itemIds: string[]) => Promise<void>;
  workspaceRole?: string;
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
  generateAIColumns?: (prompt: string) => Promise<void>;
  isGeneratingColumns?: boolean;
}



// --- Sortable Card Wrapper ---
function SortableCard({
  item,
  onClick,
  columnName,
  columns,
  assigneeOptions,
  emailToNameMap,
}: {
  item: ItemType;
  onClick: () => void;
  columnName: string;
  columns?: ColumnType[];
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    // Use Translate (not Transform) to avoid scale side-effects that cause jumpiness
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: isDragging ? 50 : undefined,
    willChange: isDragging ? "transform" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-30 scale-[0.98]" : ""}
    >
      <TaskCard
        item={item}
        onClick={onClick}
        columnName={columnName}
        isDragging={isDragging}
        columns={columns}
        assigneeOptions={assigneeOptions}
        emailToNameMap={emailToNameMap}
      />
    </div>
  );
}

// --- Main Kanban ---
export function KanbanView({
  board,
  items,
  onCardClick,
  onCreateCard,
  onMoveCard,
  onReorderCard,
  onAddColumn,
  onRenameColumn,
  onUpdateColumn,
  onDeleteColumn,
  onShiftColumn,
  onMoveColumnToEnd,
  onBulkUpdateStatus: _onBulkUpdateStatus,
  onBulkUpdatePriority: _onBulkUpdatePriority,
  onBulkDelete: _onBulkDelete,
  workspaceRole,
  assigneeOptions,
  emailToNameMap,
  generateAIColumns,
  isGeneratingColumns,
}: KanbanViewProps) {
  const [activeItem, setActiveItem] = useState<ItemType | null>(null);
  // Optimistic local order — updated during drag so cards shift in real-time
  const [localItems, setLocalItems] = useState<ItemType[]>(items);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnIsDone, setNewColumnIsDone] = useState(false);
  const [aiColumnsPrompt, setAiColumnsPrompt] = useState("");
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [newCardData, setNewCardData] = useState({
    title: "",
    type: "Task",
    priority: "Medium",
  });

  const [activeConfigureColumn, setActiveConfigureColumn] = useState<ColumnType | null>(null);
  const [configName, setConfigName] = useState("");
  const [configStatusMapping, setConfigStatusMapping] = useState("");
  const [configIsDone, setConfigIsDone] = useState(false);

  const handleOpenConfigure = (col: ColumnType) => {
    setActiveConfigureColumn(col);
    setConfigName(col.name);
    setConfigStatusMapping(col.statusMapping || "");
    setConfigIsDone(!!col.isDone);
  };

  const handleSaveConfig = async () => {
    if (!activeConfigureColumn) return;
    await onUpdateColumn(activeConfigureColumn.id, {
      name: configName.trim(),
      statusMapping: configStatusMapping.trim(),
      isDone: configIsDone,
    });
    setActiveConfigureColumn(null);
  };

  // Keep localItems in sync when external items prop changes (e.g. after RTK Query refetch)
  // We compare a stable key so we only re-sync when actual data changes, not on every render.
  const stableItemsKey = JSON.stringify(items.map(i => ({
    id: i._id,
    columnId: i.columnId,
    order: i.order,
    title: i.title,
    description: i.description,
    priority: i.priority,
    type: i.type,
    assignee: i.assignee,
    dueDate: i.dueDate,
    checklist: i.checklist,
    comments: i.comments,
    attachments: i.attachments
  })));
  useEffect(() => {
    setLocalItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableItemsKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Custom collision detection strategy
  const customCollisionDetection: CollisionDetection = (args) => {
    // 1. Start by finding pointer collisions
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
      // Prioritize item collisions over column collisions
      const itemCollision = pointerCollisions.find((c) =>
        localItems.some((it) => it._id === c.id)
      );
      if (itemCollision) {
        return [itemCollision];
      }
      return pointerCollisions;
    }

    // 2. Fallback to closestCenter
    return closestCenter(args);
  };

  // Smooth drop animation config
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.3" } },
    }),
    duration: 200,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const columnName = columnToDelete ? board.columns.find(c => c.id === columnToDelete)?.name ?? "" : "";

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);

  // Get items for a column from localItems (optimistic) preserving current order
  const getColumnItems = (colId: string) =>
    localItems.filter((it) => it.columnId === colId);

  // --- DnD Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const item = localItems.find((it) => it._id === event.active.id);
    if (item) setActiveItem(item);
  };

  // Optimistically reorder localItems during drag so cards animate in real-time
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setLocalItems((prev) => {
      const draggedItem = prev.find((it) => it._id === activeId);
      if (!draggedItem) return prev;

      // Determine target column
      const overItem = prev.find((it) => it._id === overId);
      const targetColId = overItem ? overItem.columnId : overId;

      // Cross-column move: reassign columnId, insert before overItem
      if (draggedItem.columnId !== targetColId) {
        const withoutDragged = prev.filter((it) => it._id !== activeId);
        const overIndex = withoutDragged.findIndex((it) => it._id === overId);
        const insertAt = overIndex >= 0 ? overIndex : withoutDragged.length;
        const updated: ItemType[] = [
          ...withoutDragged.slice(0, insertAt),
          { ...draggedItem, columnId: targetColId },
          ...withoutDragged.slice(insertAt),
        ];
        return updated;
      }

      // Same-column reorder
      const colItems = prev.filter((it) => it.columnId === targetColId);
      const oldIndex = colItems.findIndex((it) => it._id === activeId);
      const newIndex = colItems.findIndex((it) => it._id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;

      const reordered = arrayMove(colItems, oldIndex, newIndex);
      const others = prev.filter((it) => it.columnId !== targetColId);
      return [...others, ...reordered];
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) {
      // Cancelled — revert to server state
      setLocalItems(items);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Use localItems to read the optimistic state after handleDragOver ran
    const draggedItem = localItems.find((it) => it._id === activeId);
    if (!draggedItem) return;

    const overItem = localItems.find((it) => it._id === overId);
    const targetColId = overItem ? overItem.columnId : overId;

    // Original item from server state
    const originalItem = items.find((it) => it._id === activeId);
    if (!originalItem) return;

    if (originalItem.columnId !== targetColId) {
      // Cross-column move
      const targetColItems = localItems.filter((it) => it.columnId === targetColId);
      const newIndex = targetColItems.findIndex((it) => it._id === activeId);
      await onMoveCard(activeId, targetColId, newIndex >= 0 ? newIndex : 0);
    } else {
      // Same-column reorder
      const targetColItems = localItems.filter((it) => it.columnId === targetColId);
      const newIndex = targetColItems.findIndex((it) => it._id === activeId);
      const originalColItems = items.filter((it) => it.columnId === targetColId);
      const oldIndex = originalColItems.findIndex((it) => it._id === activeId);

      if (newIndex !== -1 && oldIndex !== -1 && oldIndex !== newIndex) {
        await onReorderCard(activeId, targetColId, newIndex);
      }
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await onAddColumn(newColumnName.trim(), newColumnIsDone);
    setNewColumnName("");
    setNewColumnIsDone(false);
    setIsAddingColumn(false);
  };

  const handleRenameColumn = async (colId: string) => {
    if (!editColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    await onRenameColumn(colId, editColumnName.trim());
    setEditingColumnId(null);
    setEditColumnName("");
  };

  const handleCreateCard = async (colId: string) => {
    if (!newCardData.title.trim()) return;

    await onCreateCard(
      colId,
      newCardData.title.trim(),
      newCardData.type,
      newCardData.priority
    );

    setQuickAddColumnId(null);

    setNewCardData({
      title: "",
      type: "Task",
      priority: "Medium",
    });
  };

  return (<>

    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 min-h-full p-4 md:p-6 flex gap-4 overflow-x-auto select-none snap-x snap-mandatory scrollbar-none">
        {sortedColumns.map((column, colIdx) => {
          const colItems = getColumnItems(column.id);
          const itemIds = colItems.map((it) => it._id);

          return (
            <div
              key={column.id}
              onMouseEnter={() => setHoveredColumn(column.id)}
              onMouseLeave={() => setHoveredColumn(null)}
              className={`w-[calc(100vw-3rem)] sm:w-80 flex flex-col rounded-2xl p-4 shrink-0 snap-center transition-all duration-200 border ${hoveredColumn === column.id || quickAddColumnId === column.id
                ? "bg-muted/70 border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                : "bg-muted/30 border-border/40"
                }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex-1 mr-2 min-w-0">
                  {editingColumnId === column.id ? (
                    <input
                      type="text"
                      value={editColumnName}
                      onChange={(e) => setEditColumnName(e.target.value)}
                      onBlur={() => handleRenameColumn(column.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameColumn(column.id)}
                      className="text-sm font-bold text-zinc-955 bg-card text-card-foreground border border-border px-2 py-0.5 rounded-lg w-full focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3
                        onDoubleClick={() => {
                          setEditingColumnId(column.id);
                          setEditColumnName(column.name);
                        }}
                        className="text-sm font-bold text-foreground truncate cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-all"
                      >
                        {column.name}
                      </h3>
                      {column.isDone && (
                        <span title="Completed Stage">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-1" />
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full shrink-0">
                        {colItems.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Column controls */}
                <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenConfigure(column)}>
                        <Settings className="size-3.5 mr-2 text-muted-foreground" />
                        Configure Column
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onShiftColumn(column.id, "left")}
                        disabled={colIdx === 0}
                      >
                        <ArrowLeft className="size-3.5 mr-2 text-muted-foreground" />
                        Move Left
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onShiftColumn(column.id, "right")}
                        disabled={colIdx === sortedColumns.length - 1}
                      >
                        <ArrowRight className="size-3.5 mr-2 text-muted-foreground" />
                        Move Right
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onMoveColumnToEnd(column.id)}>
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
              </div>

              {/* Cards List with Sortable Context */}
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <DroppableColumn
                  colId={column.id}
                  className="flex-1 flex flex-col space-y-2.5 mb-3 pr-1 min-h-[150px]"
                >
                  {colItems.length === 0 ? (
                    <div className="h-full border border-dashed border-border/85 rounded-xl flex flex-col items-center justify-center p-6 text-center text-muted-foreground/80 bg-background/20 min-h-[120px]">
                      <FileText className="h-6 w-6 stroke-1 mb-1.5 opacity-60" />
                      <span className="text-[11px] font-medium">Drop items here</span>
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <SortableCard
                        key={item._id}
                        item={item}
                        onClick={() => onCardClick(item)}
                        columnName={column.name}
                        columns={board.columns}
                        assigneeOptions={assigneeOptions}
                        emailToNameMap={emailToNameMap}
                      />
                    ))
                  )}

                  <div className="mt-1 shrink-0">
                {quickAddColumnId === column.id ? (
                  <div className="space-y-3.5 rounded-xl border border-border bg-card text-card-foreground p-3.5 shadow-md border-l-4 border-l-primary animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <textarea
                      placeholder="What needs to be done?"
                      value={newCardData.title}
                      onChange={(e) =>
                        setNewCardData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full min-h-16 resize-none border-0 bg-transparent text-xs placeholder:text-muted-foreground text-foreground font-medium focus:ring-0 focus:outline-none p-0"
                      autoFocus
                    />

                    {/* Metadata Dropdowns Row */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Type Select */}
                      <Select
                        value={newCardData.type}
                        onValueChange={(value) =>
                          setNewCardData((prev) => ({
                            ...prev,
                            type: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-border bg-muted/50 hover:bg-background text-[10px] font-bold rounded-lg px-2.5 shadow-none focus:ring-0 focus:outline-none transition-colors">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="min-w-32.5 rounded-xl border-border p-1 shadow-lg bg-card text-card-foreground">
                          <SelectItem value="Task" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>Task</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Bug" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <Bug className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span>Bug</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Idea" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                              <span>Idea</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Lead" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>Lead</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Issue" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>Issue</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Event" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span>Event</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Priority Select */}
                      <Select
                        value={newCardData.priority}
                        onValueChange={(value) =>
                          setNewCardData((prev) => ({
                            ...prev,
                            priority: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-border bg-muted/50 hover:bg-background text-[10px] font-bold rounded-lg px-2.5 shadow-none focus:ring-0 focus:outline-none transition-colors">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="min-w-30 rounded-xl border-border p-1 shadow-lg bg-card text-card-foreground">
                          <SelectItem value="Low" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <ChevronDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>Low</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Medium" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <Minus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="High" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <ChevronUp className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                              <span>High</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Critical" className="text-[11px] rounded-lg cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <ChevronsUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span>Critical</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions Row */}
                    <div className="flex justify-between items-center mt-5">
                      <div className="text-xs text-muted-foreground">
                        Press <kbd className="px-1 py-0.5 border rounded">Enter</kbd> to create
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQuickAddColumnId(null);
                            setNewCardData({
                              title: "",
                              type: "Task",
                              priority: "Medium",
                            });
                          }}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleCreateCard(column.id)}
                          className="rounded-xl bg-primary hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Task
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Conditional rendering based on workspace role
                  workspaceRole !== 'GUEST' && (
                    <button
                      onClick={() => {
                        setQuickAddColumnId(column.id);
                        setNewCardData({
                          title: "",
                          type: "Task",
                          priority: "Medium",
                        });
                      }}
                      className={`w-full py-2 flex items-center justify-center gap-1.5 border border-dashed border-border/85 hover:border-primary/60 hover:bg-card text-card-foreground text-zinc-550 hover:text-primary rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-none hover:shadow-sm ${hoveredColumn === column.id ? "opacity-100 transform translate-y-0" : "opacity-0 pointer-events-none translate-y-1"
                        }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create card
                    </button>
                  )
                )}
                  </div>
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}

        {/* Add Column Box */}

        {workspaceRole !== 'GUEST' && (
          <div className="w-80 shrink-0">
            <button
              onClick={() => {
                setIsAddingColumn(true);
                setNewColumnName("");
                setNewColumnIsDone(false);
                setAiColumnsPrompt("");
              }}
              className="w-full py-3 flex items-center justify-center gap-1.5 border border-dashed border-border hover:border-primary/60 hover:bg-primary/10/20 text-muted-foreground hover:text-primary rounded-2xl text-xs font-bold transition-all cursor-pointer bg-card text-card-foreground shadow-sm animate-all"
            >
              <Plus className="h-4 w-4" />
              Add Column
            </button>
          </div>
        )}
      </div>

      {/* Drag Overlay — ghost card that follows the cursor smoothly */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="w-80 self-stretch rotate-1 scale-105 drop-shadow-2xl">
            <TaskCard
              item={activeItem}
              onClick={() => { }}
              isDragging
              columns={board.columns}
              assigneeOptions={assigneeOptions}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Column</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to delete the column "${columnName}"? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (columnToDelete) {
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
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-foreground/90">Mark as Done</label>
              <p className="text-[10px] text-muted-foreground">Tickets in this column represent completed work.</p>
            </div>
            <input
              type="checkbox"
              checked={configIsDone}
              onChange={(e) => setConfigIsDone(e.target.checked)}
              className="h-4 w-4 text-primary border-border rounded focus:ring-indigo-500"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setActiveConfigureColumn(null)}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfig}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Add Column Dialog with AI workflow option */}
      <Dialog open={isAddingColumn} onOpenChange={(open) => !open && setIsAddingColumn(false)}>
        <DialogContent className="max-w-md bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add New Column</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Create a standard workflow column or let AI configure multiple columns for your board.
            </DialogDescription>
          </DialogHeader>

          {/* Standard Add Column Form */}
          <form onSubmit={handleAddColumn} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="col-name-input" className="text-xs font-bold text-foreground">Column Name</label>
              <Input
                id="col-name-input"
                placeholder="e.g. In Review, QA, Blocked"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="h-10 rounded-xl text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 select-none py-1">
              <input
                type="checkbox"
                id="new-column-is-done-dialog"
                checked={newColumnIsDone}
                onChange={(e) => setNewColumnIsDone(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="new-column-is-done-dialog" className="text-xs font-semibold text-foreground/80 cursor-pointer">
                Mark as Completed Stage (Task completes when moved here)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-b border-border/60 pb-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingColumn(false);
                  setNewColumnIsDone(false);
                }}
                className="rounded-xl h-9 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newColumnName.trim()}
                className="rounded-xl h-9 text-xs bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold cursor-pointer"
              >
                Add Column
              </Button>
            </div>
          </form>

          {/* AI Workflow Suggestion */}
          {generateAIColumns && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-1.5 select-none">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse animate-duration-1000" />
                <h4 className="text-xs font-bold text-foreground">Configure workflow with AI</h4>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Enter your project goals or custom stages and the AI will auto-generate appropriate workflow columns.
              </p>
              <textarea
                placeholder="E.g., marketing content timeline. Include brainstorm, writing, graphics, proofreading, scheduled, and published columns."
                value={aiColumnsPrompt}
                onChange={(e) => setAiColumnsPrompt(e.target.value)}
                className="w-full min-h-[80px] p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground resize-none"
                disabled={isGeneratingColumns}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-[9px] text-muted-foreground flex items-center gap-0.5 select-none">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Groq / Grok Suggestion
                </div>
                <Button
                  onClick={async () => {
                    if (!aiColumnsPrompt.trim()) return;
                    await generateAIColumns(aiColumnsPrompt.trim());
                    setIsAddingColumn(false);
                  }}
                  disabled={isGeneratingColumns || !aiColumnsPrompt.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl h-8 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingColumns ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span>Generate with AI</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
  </>);
}

// --- Droppable Column for empty/persistent columns ---
function DroppableColumn({
  colId,
  children,
  className,
}: {
  colId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({
    id: colId,
    data: { type: "column" },
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}
