// src/components/MainSidebar.tsx
import { Briefcase, Settings } from "lucide-react";


interface MainSidebarProps {
  activeTab: "workspaces";
  onTabChange: (tab: "workspaces") => void;
  onSettingsClick?: () => void;
}

export function MainSidebar({ activeTab, onTabChange, onSettingsClick }: MainSidebarProps) {

  const sidebarItems = [
    {
      id: "workspaces",
      label: "Workspaces",
      icon: Briefcase,
      tooltip: "Active Workspaces",
      badge: undefined as string | undefined,
    },
  ];

  return (
    <div className="hidden md:flex w-16 bg-card border-r border-border text-card-foreground flex-col items-center justify-between py-4 shrink-0 relative z-20">
      {/* Top Icons */}
      <div className="flex flex-col items-center gap-4 w-full">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              className="relative group flex items-center justify-center w-full"
            >
              {/* Active bar on the left */}
              <div
                className={`absolute left-0 w-1 bg-primary rounded-r-md transition-all duration-300
                  ${isActive ? "h-8" : "h-0 group-hover:h-4"}`}
              />

              {/* Icon Container */}
              <button
                onClick={() => onTabChange(item.id as any)}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer relative
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:rounded-xl"
                  }`}
              >
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90 border border-card">
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-16 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 border border-border translate-x-2 group-hover:translate-x-0 z-50">
                {item.tooltip}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center w-full">
        <div
          className="relative group flex items-center justify-center w-full"
        >
          {/* Icon Container */}
          <button
            onClick={onSettingsClick}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:rounded-xl transition-all duration-300 cursor-pointer"
          >
            <Settings className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
          </button>

          {/* Tooltip */}
          <div className="absolute left-16 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 border border-border translate-x-2 group-hover:translate-x-0 z-50">
            Settings
          </div>
        </div>
      </div>
    </div>
  );
}