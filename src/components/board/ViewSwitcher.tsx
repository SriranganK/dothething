// src/components/board/ViewSwitcher.tsx
import { List, Kanban, CalendarDays, GanttChart } from "lucide-react";
import type { ViewMode } from "@/types/workspace";

interface ViewSwitcherProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const views: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "list", label: "List", icon: List },
  { key: "kanban", label: "Kanban", icon: Kanban },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "timeline", label: "Timeline", icon: GanttChart },
];

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border-b border-transparent">
      {views.map(({ key, label, icon: Icon }) => {
        const isActive = activeView === key;
        return (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={`flex items-center justify-center p-2 rounded-lg transition-all relative cursor-pointer border-b-2 -mb-px
              ${isActive
                ? "border-indigo-600 text-primary"
                : "border-transparent text-zinc-550 hover:text-foreground hover:border-border"
              }`}
            title={label}
          >
            <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          </button>
        );
      })}
    </div>
  );
}
