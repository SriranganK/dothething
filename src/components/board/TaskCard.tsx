import { useState, useEffect } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

import { useRBAC } from "@/hooks/useRBAC"
import {
  AlertTriangle,
  Bug,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Equal,
  Lightbulb,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  CircleDot,
  RefreshCcw,
  Pencil,
  Copy,
  Link,
  Archive,
  Trash2,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
} from "lucide-react";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";

import type {
  ItemPriorityClass,
  ItemType,
  ItemTypeClass,
  ColumnType,
} from "@/types/workspace";

import {
  useDeleteItemMutation,
  useCreateItemMutation,
  useUpdateItemMutation,
  useGetBoardQuery,
  useGetWorkspacesQuery,
} from "@/store/services/api";


interface TaskCardProps {
  item: ItemType;
  onClick: () => void;
  isDragging?: boolean;
  columnName?: string;
  compact?: boolean;
  columns?: ColumnType[];
  assigneeOptions?: string[];
  emailToNameMap?: Record<string, string>;
}

export const typeIcons: Record<ItemTypeClass, React.ReactNode> = {
  Task: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  Bug: <Bug className="h-3.5 w-3.5 text-red-500" />,
  Lead: <CircleDot className="h-3.5 w-3.5 text-emerald-500" />,
  Idea: <Lightbulb className="h-3.5 w-3.5 text-purple-500" />,
  Issue: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  Event: <Calendar className="h-3.5 w-3.5 text-indigo-500" />,
};

const priorityIcons: Record<ItemPriorityClass, React.ReactNode> = {
  Lowest: <ChevronDown className="h-4 w-4 text-muted-foreground" />,
  Low: <ChevronDown className="h-4 w-4 text-blue-500" />,
  Medium: <Equal className="h-4 w-4 text-amber-500" />,
  High: <ChevronUp className="h-4 w-4 text-orange-500" />,
  Highest: <ChevronUp className="h-4 w-4 text-red-500 font-bold" />,
  Critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

export const priorityBorderColors: Record<ItemPriorityClass, string> = {
  Lowest: "border-l-4 border-l-slate-300",
  Low: "border-l-4 border-l-blue-400",
  Medium: "border-l-4 border-l-amber-400",
  High: "border-l-4 border-l-orange-400",
  Highest: "border-l-4 border-l-red-400",
  Critical: "border-l-4 border-l-red-650 shadow-sm shadow-red-600/5",
};

export const typeBadges: Record<ItemTypeClass, { text: string; styles: string }> = { Task: { text: "Task", styles: "bg-muted text-foreground/90 border-border" }, Bug: { text: "Bug", styles: "bg-red-50 text-red-650 border-red-100" }, Lead: { text: "Lead", styles: "bg-emerald-50 text-emerald-700 border-emerald-100" }, Idea: { text: "Idea", styles: "bg-purple-50 text-purple-700 border-purple-100" }, Issue: { text: "Issue", styles: "bg-amber-50 text-amber-700 border-amber-100" }, Event: { text: "Event", styles: "bg-primary/10 text-primary border-primary/20" }, };

export const priorityDotColors: Record<ItemPriorityClass, string> = {
  Lowest: "bg-muted-foreground/20",
  Low: "bg-blue-400",
  Medium: "bg-amber-400",
  High: "bg-orange-400",
  Highest: "bg-red-400",
  Critical: "bg-red-500",
};

export function TaskCard({
  item,
  onClick,
  isDragging = false,
  columnName,
  compact = false,
  columns = [],
  assigneeOptions = [],
  emailToNameMap = {},
}: TaskCardProps) {
  const confirm = useConfirm();
  const [deleteItem, { isLoading: isDeletingItem }] = useDeleteItemMutation();
  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation();
  const [updateItem, { isLoading: isUpdatingItem }] = useUpdateItemMutation();
  const { data: boardData } = useGetBoardQuery(item?.board || "", { skip: !item?.board });
  const board = boardData?.board;

  const { data: workspacesData } = useGetWorkspacesQuery();
  const workspace = workspacesData?.workspaces.find((w) => w._id === board?.workspace) || null;
  const isSyncing = isUpdatingItem || isCreatingItem || isDeletingItem;
  // Single RBAC hook instance to maintain stable hook order
  const rbac = useRBAC();


  const [localPriority, setLocalPriority] = useState<ItemPriorityClass>(item.priority);
  const [localAssignee, setLocalAssignee] = useState<string>(item.assignee);

  useEffect(() => {
    setLocalPriority(item.priority);
  }, [item.priority]);

  useEffect(() => {
    setLocalAssignee(item.assignee);
  }, [item.assignee]);

  const hasChecklist = item.checklist?.length > 0;

  const completedChecklist = hasChecklist
    ? item.checklist.filter((c) => c.completed).length
    : 0;

  const issueKey = `${item.type.toUpperCase()}-${item._id.slice(-5).toUpperCase()}`;

  const isOverdue =
    item.dueDate &&
    new Date(item.dueDate) < new Date() &&
    !(columnName || "").toLowerCase().includes("done");

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          w-full
          h-full
          text-left
          px-2
          py-1.5
          rounded
          text-xs
          hover:bg-background
          border
          border-transparent
          hover:border-border
          transition-all
          ${isDragging ? "opacity-50" : ""}
        `}
      >
        <div className="flex items-center gap-2">
          {typeIcons[item.type]}
          <span className="truncate">{item.title}</span>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        group
        bg-card text-card-foreground
        border
        border-border
        rounded-md
        p-3
        cursor-pointer
        transition-all
        hover:border-blue-400
        hover:bg-background
        select-none
        ${isDragging ? "opacity-60 scale-[0.98] shadow-lg" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {typeIcons[item.type]}

          <a
            href={`/items/${issueKey}`}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
                e.preventDefault();
                e.stopPropagation();
                onClick();
              } else {
                e.stopPropagation();
              }
            }}
            className="text-[11px] text-primary hover:text-primary font-bold hover:underline"
          >
            {issueKey}
          </a>
        </div>

        {/* Sync indicator */}
        {isSyncing && (
          <RefreshCcw className="h-4 w-4 text-green-500 animate-spin ml-2" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="
                h-6
                w-6
                rounded
                flex
                items-center
                justify-center
                opacity-0
                group-hover:opacity-100
                hover:bg-muted
                transition
                cursor-pointer
              "
            >
              <MoreHorizontal className="h-4 w-4" />
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
            {rbac.canMoveCard() && columns && columns.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                  <ArrowRightLeft className="size-3.5 mr-2 text-muted-foreground" />
                  Move Issue
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent onClick={(e) => e.stopPropagation()}>
                  {columns.map((col) => (
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
                navigator.clipboard.writeText(`${window.location.origin}/workspace/${workspace?._id}/board/${board?._id}/item/${item._id}`);
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
                    description: `Are you sure you want to archive ${issueKey}?`,
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
                onClick={async (e) => {
                  e.stopPropagation();

                  try {
                    await deleteItem(item._id).unwrap();
                  } catch (err) {
                    console.error(err);
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

      {/* Title */}
      <h4
        className="
          text-sm
          font-medium
          text-foreground
          leading-5
          mb-3
          break-words
        "
      >
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p
          className="
            text-xs
            text-muted-foreground
            line-clamp-2
            mb-3
          "
        >
          {item.description}
        </p>
      )}

      {/* Footer Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="hover:bg-muted p-0.5 rounded cursor-pointer transition-colors focus:outline-none flex items-center justify-center"
                title={`Priority: ${localPriority}`}
              >
                <PriorityIndicator priority={localPriority} showText={false} className="border-0 bg-transparent p-0 hover:bg-transparent" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              {(['Critical', 'Highest', 'High', 'Medium', 'Low', 'Lowest'] as ItemPriorityClass[]).map((prio) => (
                <DropdownMenuItem
                  key={prio}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const prevPriority = localPriority;
                    setLocalPriority(prio);
                    try {
                      await updateItem({
                        id: item._id,
                        body: { priority: prio }
                      }).unwrap();
                    } catch (err) {
                      console.error(err);
                      setLocalPriority(prevPriority);
                    }
                  }}
                  className="p-1 hover:bg-zinc-55"
                >
                  <PriorityIndicator priority={prio} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Due Date */}
          {item.dueDate && (
            <Badge
              variant="outline"
              className={`
                h-5
                px-1.5
                text-[10px]
                font-medium
                ${isOverdue
                  ? "border-red-300 text-red-600 bg-red-50"
                  : ""
                }
              `}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(item.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Badge>
          )}

          {/* Checklist */}
          {hasChecklist && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5" />
              {completedChecklist}/{item.checklist.length}
            </div>
          )}

          {/* Comments */}
          {item.comments?.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {item.comments.length}
            </div>
          )}

          {/* Attachments */}
          {item.attachments?.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {item.attachments.length}
            </div>
          )}
        </div>

        {/* Assignee Avatar with Dropdown info + quick reassign */}
        <div className="flex items-center">
          {localAssignee ? (() => {
            const resolvedName = emailToNameMap[localAssignee.toLowerCase().trim()] || localAssignee;
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
                    onClick={(e) => e.stopPropagation()}
                    className="focus:outline-none cursor-pointer rounded-full"
                  >
                    <Avatar className="h-6 w-6 border hover:scale-105 transition-transform" title={resolvedName}>
                      <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                        {initials || "??"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <div className="px-3 py-2">
                    <p className="text-xs font-extrabold text-foreground">{resolvedName}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{localAssignee}</p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[9px] font-bold bg-primary/10 text-indigo-755 px-1.5 py-0.5 rounded-full">Member</span>
                    </div>
                  </div>
                  {assigneeOptions && assigneeOptions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-3">Quick Reassign</DropdownMenuLabel>
                      <div className="max-h-36 overflow-y-auto">
                        {assigneeOptions.map((email) => {
                          const optionName = emailToNameMap[email.toLowerCase().trim()] || email;
                          return (
                            <DropdownMenuItem
                              key={email}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const prevAssignee = localAssignee;
                                setLocalAssignee(email);
                                try {
                                  await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                                } catch (err) {
                                  console.error(err);
                                  setLocalAssignee(prevAssignee);
                                }
                              }}
                              className={email === localAssignee ? 'bg-background text-indigo-755 font-bold' : ''}
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
                      const prevAssignee = localAssignee;
                      setLocalAssignee("");
                      try {
                        await updateItem({ id: item._id, body: { assignee: "" } }).unwrap();
                      } catch (err) {
                        console.error(err);
                        setLocalAssignee(prevAssignee);
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
                  onClick={(e) => e.stopPropagation()}
                  className="focus:outline-none cursor-pointer rounded-full text-zinc-450 hover:text-muted-foreground"
                  title="Unassigned"
                >
                  <Avatar className="h-6 w-6 border border-dashed border-border bg-muted/50 hover:bg-background">
                    <AvatarFallback className="text-[9px] font-bold text-muted-foreground">+</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="px-3">Assign Task</DropdownMenuLabel>
                {assigneeOptions && assigneeOptions.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto">
                    {assigneeOptions.map((email) => {
                      const optionName = emailToNameMap[email.toLowerCase().trim()] || email;
                      return (
                        <DropdownMenuItem
                          key={email}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setLocalAssignee(email);
                            try {
                              await updateItem({ id: item._id, body: { assignee: email } }).unwrap();
                            } catch (err) {
                              console.error(err);
                              setLocalAssignee("");
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
      </div>
    </div>
  );
}