import { useState, useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setActiveView } from "@/store/slices/uiSlice";
import { useGetMilestoneAnalyticsQuery } from "@/store/services/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ListTodo,
  TrendingUp,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ItemDetailContent } from "@/components/ItemDetailContent";

interface MilestoneDetailsProps {
  milestoneId: string;
}

export function MilestoneDetails({ milestoneId }: MilestoneDetailsProps) {
  const dispatch = useAppDispatch();

  // Queries
  const { data: analyticsData, isLoading, refetch } = useGetMilestoneAnalyticsQuery(milestoneId, {
    skip: !milestoneId,
  });

  const milestoneName = analyticsData?.milestone || "Milestone Details";
  const stats = analyticsData?.stats || { total: 0, completed: 0, open: 0, overdue: 0, progress: 0 };
  const tasks = analyticsData?.tasks || [];
  const workload = analyticsData?.workload || {};

  // Local state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All"); // 'All' | 'Open' | 'Done'
  const [assigneeFilter, setAssigneeFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("dueDate"); // 'dueDate' | 'priority'
  const [searchTerm, setSearchTerm] = useState("");

  const assigneeOptions = useMemo(() => {
    const list = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee) list.add(t.assignee);
    });
    return Array.from(list);
  }, [tasks]);

  const priorityOrder = { Critical: 6, Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Done" && t.status === "Done") ||
        (statusFilter === "Open" && t.status === "Open");
      const matchesAssignee =
        assigneeFilter === "All" || t.assignee === assigneeFilter;
      return matchesSearch && matchesStatus && matchesAssignee;
    });

    result.sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        const valA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const valB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return valB - valA; // highest priority first
      }
    });

    return result;
  }, [tasks, searchTerm, statusFilter, assigneeFilter, sortBy]);

  const getProgressBar = (progress: number) => {
    const filledCount = Math.round(progress / 10);
    const emptyCount = 10 - filledCount;
    return `${"█".repeat(filledCount)}${"░".repeat(emptyCount)} ${progress}%`;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "Critical":
      case "Highest":
        return "bg-red-50 text-red-700 border-red-150";
      case "High":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "Medium":
        return "bg-yellow-50 text-yellow-750 border-yellow-100";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 bg-background">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-muted-foreground text-sm font-semibold">Loading milestone details...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Top Header */}
      <div className="bg-card text-card-foreground border-b border-border px-8 py-5 shrink-0 select-none">
        <button
          onClick={() => dispatch(setActiveView({ type: "milestones" }))}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-3 cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Milestones</span>
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>Milestone:</span>
          <span className="text-primary">{milestoneName}</span>
        </h1>
      </div>

      {/* Main Details Panel */}
      <div className="p-8 space-y-8 flex-1 min-h-0">

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Progress */}
          <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Progress</span>
              <div className="font-mono text-sm font-bold text-foreground tracking-tight mt-0.5">
                {getProgressBar(stats.progress)}
              </div>
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Total Tasks</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{stats.total}</p>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Completed</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{stats.completed}</p>
            </div>
          </div>

          {/* Overdue */}
          <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.overdue > 0 ? "bg-red-50 text-red-650" : "bg-muted/45 text-muted-foreground"}`}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Overdue Tasks</span>
              <p className={`text-lg font-bold mt-0.5 ${stats.overdue > 0 ? "text-red-600 font-extrabold" : "text-foreground"}`}>
                {stats.overdue}
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Team Contribution breakdown */}
        {Object.keys(workload).length > 0 && (
          <div className="bg-card text-card-foreground rounded-2xl border border-border p-6">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-muted-foreground" />
              <span>Assigned Workload</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.keys(workload).map((assignee) => {
                const u = workload[assignee];
                // get name from email

                const initials = assignee.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={assignee} className="p-3 border border-border rounded-xl flex flex-col items-center bg-background text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary mb-2">
                      {initials}
                    </div>
                    <span className="text-[11px] font-bold text-foreground truncate w-full" title={assignee}>
                      {assignee}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 font-semibold">
                      {u.completed}/{u.total} Done
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linked Tasks List */}
        <div className="bg-card text-card-foreground rounded-2xl border border-border overflow-hidden flex flex-col">

          {/* List Toolbar Filters */}
          <div className="p-5 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-background/20">
            <div className="relative w-full md:max-w-80">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 border-border focus-visible:ring-indigo-605 rounded-xl bg-card text-card-foreground text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto text-xs font-semibold text-muted-foreground">
              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 border border-border px-2 rounded-lg bg-card text-card-foreground focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Assignee */}
              {assigneeOptions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span>Assignee:</span>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="h-8 border border-border px-2 rounded-lg bg-card text-card-foreground focus:outline-none max-w-40"
                  >
                    <option value="All">All Assignees</option>
                    {assigneeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <span>Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8 border border-border px-2 rounded-lg bg-card text-card-foreground focus:outline-none"
                >
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table list */}
          {filteredAndSortedTasks.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground text-xs italic bg-card text-card-foreground">
              No tasks linked to this milestone match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-foreground/90">
                <thead>
                  <tr className="bg-background border-b font-extrabold uppercase text-[10px] tracking-wider text-muted-foreground select-none">
                    <th className="p-4 pl-6">Task Title</th>
                    <th className="p-4">Board Context</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-card text-card-foreground">
                  {filteredAndSortedTasks.map((t) => {
                    const isTaskOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Done";
                    return (
                      <tr
                        key={t._id}
                        onClick={() => setSelectedTaskId(t._id)}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="p-4 pl-6 font-bold text-foreground max-w-md truncate">{t.title}</td>
                        <td className="p-4 text-muted-foreground font-semibold">{t.boardName}</td>
                        <td className="p-4">
                          {t.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-700">
                                {t.assignee.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-28 font-medium">{t.assignee}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`font-semibold rounded px-1.5 py-0.5 text-[9px] ${getPriorityBadge(t.priority)}`}>
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {t.dueDate ? (
                            <span className={`flex items-center gap-1 font-semibold ${isTaskOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                              <Calendar className="h-3 w-3 opacity-60" />
                              {new Date(t.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            className={`font-extrabold uppercase rounded-full text-[9px] px-2 py-0.5 ${t.status === "Done"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-muted text-muted-foreground hover:bg-muted"
                              }`}
                          >
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Task detail modal dialog */}
      <Dialog open={selectedTaskId !== null} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent showCloseButton={false} className="max-w-[90vw] sm:max-w-[1200px]! w-full! h-[85vh] p-0 border-none shadow-2xl bg-card text-card-foreground rounded-xl overflow-hidden focus:outline-none">
          <DialogTitle className="sr-only">Task Details</DialogTitle>
          <DialogDescription className="sr-only">Detailed view and actions for the selected task</DialogDescription>
          {selectedTaskId && (
            <ItemDetailContent
              itemId={selectedTaskId}
              isModal
              onClose={() => {
                setSelectedTaskId(null);
                refetch(); // Refetch analytics to show correct updated data
              }}
              onItemUpdated={() => {
                refetch();
              }}
              onItemDeleted={() => {
                setSelectedTaskId(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
