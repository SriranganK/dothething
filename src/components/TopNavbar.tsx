// src/components/TopNavbar.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalSearchModal } from "./GlobalSearchModal";

interface TopNavbarProps {
  onProfileClick?: () => void;
  onUserProfileClick?: () => void;
}

export function TopNavbar({ onProfileClick, onUserProfileClick }: TopNavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Color per user deterministically
  const colors = [
    "from-indigo-500 to-violet-600",
    "from-rose-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
  ];
  const colorIdx = user?.name ? user.name.charCodeAt(0) % colors.length : 0;
  const gradient = colors[colorIdx];

  return (
    <nav className="h-14 bg-card border-b border-border text-card-foreground px-4 shrink-0 z-40">
      <div className="flex items-center justify-between h-full gap-4">

        {/* Logo */}
        <div className="flex items-center shrink-0">
          <img
            src={resolvedTheme === "dark" ? "/src/assets/logo_dark.png" : "/src/assets/logo.png"}
            alt="Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 justify-center px-4 max-w-xl mx-auto">
          {/* Desktop search bar */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full text-left flex items-center justify-between pl-9 pr-3 h-9 bg-muted border border-border hover:bg-muted/80 hover:border-border-hover focus-visible:outline-hidden text-muted-foreground text-sm rounded-xl cursor-pointer transition-all select-none group"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="truncate">Search tasks, boards, people...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-extrabold text-muted-foreground border border-border bg-card px-1.5 py-0.5 rounded-lg select-none">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Global Search Modal */}
        <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />


        {/* Right: Notifications + User */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Mobile search icon button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden flex items-center justify-center h-9 w-9 bg-muted border border-border hover:bg-muted/80 rounded-xl cursor-pointer shrink-0 mr-1.5"
            title="Search"
          >
            <Search className="h-4.5 w-4.5 text-muted-foreground" />
          </button>

          {/* Notifications bell dropdown */}
          <NotificationCenter />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 ml-1 pl-1.5 pr-3 py-1 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-lg bg-linear-to-br ${gradient} flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0`}>
                  {initials}
                </div>
                {/* Name */}
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-bold text-foreground max-w-25 truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground font-medium max-w-25 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5">
              {/* User info header */}
              <div className="px-3 py-2.5 mb-1">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{user?.name || "User"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 bg-border" />

              <DropdownMenuItem
                onClick={onUserProfileClick}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-foreground hover:bg-primary/15 hover:text-foreground focus:bg-primary/15 focus:text-foreground"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onProfileClick}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-foreground hover:bg-muted focus:bg-muted"
              >
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Workspace Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-border" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-destructive hover:bg-destructive/15 focus:bg-destructive/15"
              >
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <LogOut className="h-3.5 w-3.5 text-destructive" />
                </div>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
