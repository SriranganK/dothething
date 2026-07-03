// src/components/ChatSidebar.tsx
import { Badge } from "@/components/ui/badge";

export function ChatSidebar() {
  return (
    <div className="w-80 border-l border-zinc-200 bg-white flex flex-col shrink-0">
      <div className="p-4 border-b border-zinc-250 flex items-center justify-between">
        <h3 className="font-semibold text-lg text-zinc-800">Team Chat</h3>
        <Badge variant="secondary">12 online</Badge>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <p className="text-center text-zinc-400 text-sm mt-10">Chat interface coming soon...</p>
      </div>
    </div>
  );
}
