import { useState } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import { useAppDispatch } from "@/store/hooks";
import { setActiveView } from "@/store/slices/uiSlice";
import {
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
} from "@/store/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  Search,
  Target,
  Trash2,
  Edit2,
  CalendarDays,
} from "lucide-react";
import type { WorkspaceType } from "@/types/workspace";

interface MilestonesProps {
  workspace: WorkspaceType | null;
}

export function Milestones({ workspace }: MilestonesProps) {
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const workspaceId = workspace?._id || "";

  // Queries
  const { data: milestonesData, isLoading } = useGetMilestonesQuery(workspaceId, {
    skip: !workspaceId,
  });
  const milestones = milestonesData?.milestones || [];

  // Mutations
  const [createMilestone] = useCreateMilestoneMutation();
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [deleteMilestone] = useDeleteMilestoneMutation();

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Planned");

  const colors = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#64748b", // Slate
  ];

  const handleOpenCreate = () => {
    setName("");
    setDescription("");
    setColor("#3b82f6");
    setStartDate("");
    setDueDate("");
    setStatus("Planned");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (m: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMilestone(m);
    setName(m.name);
    setDescription(m.description || "");
    setColor(m.color || "#3b82f6");
    setStartDate(m.start_date ? new Date(m.start_date).toISOString().split("T")[0] : "");
    setDueDate(m.due_date ? new Date(m.due_date).toISOString().split("T")[0] : "");
    setStatus(m.status || "Planned");
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createMilestone({
        workspaceId,
        name: name.trim(),
        description,
        color,
        start_date: startDate || null,
        due_date: dueDate || null,
        status,
      }).unwrap();
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to create milestone:", err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMilestone || !name.trim()) return;
    try {
      await updateMilestone({
        id: selectedMilestone._id,
        body: {
          name: name.trim(),
          description,
          color,
          start_date: startDate || null,
          due_date: dueDate || null,
          status,
        },
      }).unwrap();
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update milestone:", err);
    }
  };

  const handleDelete = async (milestoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete Milestone",
      description: "Are you sure you want to delete this milestone? Linked tasks will be unassigned from it.",
      confirmText: "Delete Milestone",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteMilestone(milestoneId).unwrap();
    } catch (err) {
      console.error("Failed to delete milestone:", err);
    }
  };

  const filteredMilestones = milestones.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "All" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProgressBar = (progress: number) => {
    // Generates Unicode progress bars: ████████░░ 80%
    const filledCount = Math.round(progress / 10);
    const emptyCount = 10 - filledCount;
    return `${"█".repeat(filledCount)}${"░".repeat(emptyCount)} ${progress}%`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Archived":
        return "bg-muted text-muted-foreground border-border";
      default: // Planned
        return "bg-purple-50 text-purple-700 border-purple-100";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Top Header */}
      <div className="bg-card text-card-foreground border-b border-border px-8 py-5 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <span>Milestones</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your releases, feature targets, and delivery milestones.
            </p>
          </div>

          {workspace?.role !== "GUEST" && (
            <Button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-indigo-750 text-white rounded-xl shadow-sm px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Milestone
            </Button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-border focus-visible:ring-ring rounded-xl bg-background"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto select-none bg-muted/45 p-1 rounded-xl shrink-0">
            {["All", "Planned", "Active", "Completed", "Archived"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
                  ${statusFilter === st
                    ? "bg-card text-card-foreground text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones Content List */}
      <div className="flex-1 p-8 min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-muted-foreground text-sm font-semibold">Loading milestones...</span>
          </div>
        ) : filteredMilestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-250 bg-card text-card-foreground rounded-2xl p-8">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Milestones</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Use milestones to track deliverables, feature releases, and project deadlines.
            </p>
            {workspace?.role !== "GUEST" && (
              <Button
                onClick={handleOpenCreate}
                className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold px-4 h-9"
              >
                Create your first milestone
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMilestones.map((m) => {
              const total = m.stats?.total || 0;
              const completed = m.stats?.completed || 0;
              const progress = m.stats?.progress || 0;
              const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== "Completed";

              return (
                <div
                  key={m._id}
                  onClick={() => dispatch(setActiveView({ type: "milestone-details", milestoneId: m._id }))}
                  className="bg-card text-card-foreground border border-border hover:border-border hover:shadow-lg rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col group relative overflow-hidden"
                >
                  {/* Left color bar */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: m.color }}
                  />

                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-2 pl-2">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {m.name}
                    </h3>
                    <Badge variant="outline" className={`font-semibold text-[10px] shrink-0 px-2 py-0.5 rounded-full ${getStatusStyles(m.status)}`}>
                      {m.status}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-xs line-clamp-2 min-h-8 mb-4 pl-2">
                    {m.description || "No description provided."}
                  </p>

                  {/* Dates */}
                  <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground pl-2 mb-5">
                    {m.start_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                        <span>Starts: {new Date(m.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {m.due_date && (
                      <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? "text-red-500 font-bold" : ""}`}>
                        <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                        <span>Due: {new Date(m.due_date).toLocaleDateString()} {isOverdue && "(Overdue)"}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Section */}
                  <div className="mt-auto pl-2 pt-3 border-t border-border flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-550">
                      <span>Tasks Progress</span>
                      <span>{completed}/{total} tasks</span>
                    </div>

                    <div className="font-mono text-xs text-indigo-755 font-bold tracking-tight mt-1 select-none">
                      {getProgressBar(progress)}
                    </div>
                  </div>

                  {/* Action Controls */}
                  {workspace?.role !== "GUEST" && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card text-card-foreground pl-2">
                      <button
                        onClick={(e) => handleOpenEdit(m, e)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors cursor-pointer"
                        title="Edit milestone"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(m._id, e)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-red-650 rounded-lg transition-colors cursor-pointer"
                        title="Delete milestone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground rounded-2xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">New Workspace Milestone</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Establish a project delivery goal or release deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-foreground/90 font-bold">Milestone Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Version 1.0 Launch"
                className="h-10 border-border focus-visible:ring-ring rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-foreground/90 font-bold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the release objectives..."
                className="resize-none h-20 border-border focus-visible:ring-ring rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 border-border focus-visible:ring-ring rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 border-border focus-visible:ring-indigo-655 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 border border-border px-3 rounded-xl bg-card text-card-foreground focus-visible:ring-ring text-xs font-semibold focus:outline-none"
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Indicator Color</Label>
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${color === c ? "scale-115 border-zinc-650 ring-1 ring-zinc-200" : "border-transparent"
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 text-xs font-semibold cursor-pointer"
            >
              Create Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground rounded-2xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-955">Edit Milestone</DialogTitle>
            <DialogDescription className="text-zinc-505 text-xs">
              Update details or mark the milestone status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-foreground/90 font-bold">Milestone Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Version 1.0 Launch"
                className="h-10 border-border focus-visible:ring-ring rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-foreground/90 font-bold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none h-20 border-border focus-visible:ring-indigo-655 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 border-border focus-visible:ring-ring rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 border-border focus-visible:ring-ring rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 border border-border px-3 rounded-xl bg-card text-card-foreground focus-visible:ring-ring text-xs font-semibold focus:outline-none"
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-foreground/90 font-bold">Indicator Color</Label>
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${color === c ? "scale-115 border-zinc-650 ring-1 ring-zinc-200" : "border-transparent"
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!name.trim()}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 text-xs font-semibold cursor-pointer"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
