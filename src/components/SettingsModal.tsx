import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setShowSettingsModal, updateSettings } from "@/store/slices/uiSlice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Palette, 
  Bell, 
  Clock, 
  Sun, 
  Moon, 
  Laptop, 
  Sparkles, 
  Check, 
  Volume2
} from "lucide-react";

type SettingsTab = "appearance" | "notifications";

export function SettingsModal() {
  const dispatch = useAppDispatch();
  
  // Select settings from Redux
  const {
    showSettingsModal,
    settingsTheme,
    autoMode,
    lightStartHour,
    darkStartHour,
    notifyEmail,
  } = useAppSelector((state) => state.ui);

  // Local tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  // Local editing states
  const [editTheme, setEditTheme] = useState<"light" | "dark" | "auto">("light");
  const [editAutoMode, setEditAutoMode] = useState<"time" | "system">("time");
  const [editLightStart, setEditLightStart] = useState(6);
  const [editDarkStart, setEditDarkStart] = useState(18);
  const [editNotify, setEditNotify] = useState(true);
  
  // Extra premium mock settings to enrich the interface
  const [editSoundEffects, setEditSoundEffects] = useState(true);
  const [editDesktopNotify, setEditDesktopNotify] = useState(false);

  // Sync with store when modal opens
  useEffect(() => {
    if (showSettingsModal) {
      setEditTheme(settingsTheme);
      setEditAutoMode(autoMode);
      setEditLightStart(lightStartHour);
      setEditDarkStart(darkStartHour);
      setEditNotify(notifyEmail);
    }
  }, [showSettingsModal, settingsTheme, autoMode, lightStartHour, darkStartHour, notifyEmail]);

  const handleSave = () => {
    dispatch(
      updateSettings({
        theme: editTheme,
        autoMode: editAutoMode,
        lightStartHour: editLightStart,
        darkStartHour: editDarkStart,
        notifyEmail: editNotify,
      })
    );
    dispatch(setShowSettingsModal(false));
  };

  return (
    <Dialog open={showSettingsModal} onOpenChange={(open) => dispatch(setShowSettingsModal(open))}>
      <DialogContent className="w-[95vw] sm:max-w-4xl h-[85vh] sm:h-[550px] p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-card text-card-foreground backdrop-blur-md flex flex-col">
        
        {/* Main Content Layout with sidebar and right panel */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 w-full">
          
          {/* Settings Sidebar Tabs */}
          <div className="w-full sm:w-52 border-b sm:border-b-0 sm:border-r border-border/60 bg-muted/20 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-3 sm:space-y-6 w-full">
              <div className="hidden sm:block">
                <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Settings</h3>
              </div>
              
              <nav className="flex flex-row sm:flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("appearance")}
                  className={`flex-1 sm:w-full flex items-center justify-center sm:justify-start gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer
                    ${activeTab === "appearance"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Palette className="h-4 w-4 shrink-0" />
                  <span>Appearance</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setActiveTab("notifications")}
                  className={`flex-1 sm:w-full flex items-center justify-center sm:justify-start gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer
                    ${activeTab === "notifications"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Bell className="h-4 w-4 shrink-0" />
                  <span>Preferences</span>
                </button>
              </nav>
            </div>
            
 
          </div>

          {/* Right Configuration Panel */}
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            
            {/* Tab Contents */}
            <div className="space-y-6 flex-1">
              
              {activeTab === "appearance" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Appearance Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Customize the look and feel of your workspace.</p>
                  </div>

                  {/* Theme Grid */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-foreground">Theme Selection</Label>
                    <div className="grid grid-cols-3 gap-3">
                      
                      {/* Light Theme Card */}
                      <button
                        type="button"
                        onClick={() => setEditTheme("light")}
                        className={`group relative flex flex-col p-1.5 rounded-xl border text-left transition-all duration-300 cursor-pointer overflow-hidden
                          ${editTheme === "light"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border bg-card hover:bg-muted/40"
                          }`}
                      >
                        {/* Visual Mock Preview */}
                        <div className="h-20 w-full rounded-lg bg-zinc-50 border border-zinc-200/60 p-2 flex flex-col justify-between transition-transform group-hover:scale-[1.02] duration-300">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                            <div className="w-10 h-1.5 rounded-full bg-zinc-200" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded bg-primary/20" />
                            <div className="w-3/4 h-2 rounded bg-zinc-200" />
                          </div>
                        </div>
                        <div className="mt-2.5 px-1.5 pb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Sun className="h-3.5 w-3.5 text-amber-500" /> Light
                          </span>
                          {editTheme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>

                      {/* Dark Theme Card */}
                      <button
                        type="button"
                        onClick={() => setEditTheme("dark")}
                        className={`group relative flex flex-col p-1.5 rounded-xl border text-left transition-all duration-300 cursor-pointer overflow-hidden
                          ${editTheme === "dark"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border bg-card hover:bg-muted/40"
                          }`}
                      >
                        {/* Visual Mock Preview */}
                        <div className="h-20 w-full rounded-lg bg-zinc-950 border border-zinc-800/80 p-2 flex flex-col justify-between transition-transform group-hover:scale-[1.02] duration-300">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                            <div className="w-10 h-1.5 rounded-full bg-zinc-800" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded bg-primary/40" />
                            <div className="w-3/4 h-2 rounded bg-zinc-800" />
                          </div>
                        </div>
                        <div className="mt-2.5 px-1.5 pb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Moon className="h-3.5 w-3.5 text-indigo-400" /> Dark
                          </span>
                          {editTheme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>

                      {/* Automatic Theme Card */}
                      <button
                        type="button"
                        onClick={() => setEditTheme("auto")}
                        className={`group relative flex flex-col p-1.5 rounded-xl border text-left transition-all duration-300 cursor-pointer overflow-hidden
                          ${editTheme === "auto"
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border bg-card hover:bg-muted/40"
                          }`}
                      >
                        {/* Visual Mock Preview */}
                        <div className="h-20 w-full rounded-lg bg-linear-to-r from-zinc-50 to-zinc-900 border border-zinc-300/40 p-2 flex flex-col justify-between transition-transform group-hover:scale-[1.02] duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                              <div className="w-8 h-1.5 rounded-full bg-zinc-400" />
                            </div>
                            <Clock className="h-3 w-3 text-zinc-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded bg-primary/30" />
                            <div className="w-2/3 h-2 rounded bg-zinc-400/50" />
                          </div>
                        </div>
                        <div className="mt-2.5 px-1.5 pb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Laptop className="h-3.5 w-3.5 text-emerald-500" /> Auto
                          </span>
                          {editTheme === "auto" && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>

                    </div>
                  </div>

                  {/* Automatic Configuration Sub-Panel */}
                  {editTheme === "auto" && (
                    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">Automatic Mode Options</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "system", label: "Sync with OS Theme", desc: "Follow system preference" },
                          { value: "time", label: "Time Schedule", desc: "Toggle based on hours" }
                        ].map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => setEditAutoMode(mode.value as any)}
                            className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer
                              ${editAutoMode === mode.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }`}
                          >
                            <p className="text-xs font-bold text-foreground">{mode.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{mode.desc}</p>
                          </button>
                        ))}
                      </div>

                      {/* Time-Based Hour Inputs */}
                      {editAutoMode === "time" && (
                        <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-border/60 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <Label htmlFor="light-start" className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">☀️ Light Mode Starts</Label>
                            <div className="relative flex items-center">
                              <Input
                                id="light-start"
                                type="number"
                                min={0}
                                max={23}
                                value={editLightStart}
                                onChange={(e) => setEditLightStart(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                className="h-9 pr-8 text-xs rounded-xl border-border bg-background text-foreground font-semibold"
                              />
                              <span className="absolute right-3 text-[10px] font-bold text-muted-foreground">O'clock</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="dark-start" className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">🌙 Dark Mode Starts</Label>
                            <div className="relative flex items-center">
                              <Input
                                id="dark-start"
                                type="number"
                                min={0}
                                max={23}
                                value={editDarkStart}
                                onChange={(e) => setEditDarkStart(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                className="h-9 pr-8 text-xs rounded-xl border-border bg-background text-foreground font-semibold"
                              />
                              <span className="absolute right-3 text-[10px] font-bold text-muted-foreground">O'clock</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Notification Preferences</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage when and how you receive updates.</p>
                  </div>

                  <div className="space-y-3">
                    
                    {/* Email Toggles */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          Email Notifications
                        </p>
                        <p className="text-xs text-muted-foreground leading-normal max-w-sm">Receive a daily digest and activity reports on your active projects.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editNotify}
                          onChange={(e) => setEditNotify(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* Extra Visual Switch - Sound effects */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors opacity-95">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                          Auditory Sounds
                        </p>
                        <p className="text-xs text-muted-foreground leading-normal max-w-sm">Play subtle audio alerts when cards are moved or completed.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSoundEffects}
                          onChange={(e) => setEditSoundEffects(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* Extra Visual Switch - Desktop Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors opacity-95">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">Push Notifications</p>
                        <p className="text-xs text-muted-foreground leading-normal max-w-sm">Show system popups for urgent board updates and status changes.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editDesktopNotify}
                          onChange={(e) => setEditDesktopNotify(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Save and Close Footer */}
            <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-border/80">
              <Button
                variant="outline"
                onClick={() => dispatch(setShowSettingsModal(false))}
                className="rounded-xl h-10 px-4 text-xs font-bold border-border bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl h-10 px-5 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer transition-all hover:scale-[1.01]"
              >
                Save Changes
              </Button>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
