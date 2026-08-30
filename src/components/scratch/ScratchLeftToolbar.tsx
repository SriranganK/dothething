import React from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  ChevronRight,
  FileUp,
  CheckSquare,
  List,
  ListOrdered,
  Table as TableIcon,
  Code,
  Quote,
  Minus,
  Plus,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  MessageSquarePlus,
  Palette,
} from 'lucide-react';
import type { BlockType } from '@/types/scratch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ScratchLeftToolbarProps {
  onInsertBlock: (type: BlockType) => void;
}

export const ScratchLeftToolbar: React.FC<ScratchLeftToolbarProps> = ({ onInsertBlock }) => {
  const ICON_ITEMS: {
    id: BlockType;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
    shortcut?: string;
  }[] = [
    { id: 'paragraph', label: 'Text Paragraph', icon: Type, color: 'text-foreground', bgColor: 'hover:bg-muted' },
    { id: 'heading1', label: 'Heading 1', icon: Heading1, color: 'text-primary', bgColor: 'hover:bg-primary/10' },
    { id: 'heading2', label: 'Heading 2', icon: Heading2, color: 'text-primary/90', bgColor: 'hover:bg-primary/10' },
    { id: 'heading3', label: 'Heading 3', icon: Heading3, color: 'text-primary/80', bgColor: 'hover:bg-primary/10' },
    { id: 'toggle', label: 'Toggle List', icon: ChevronRight, color: 'text-amber-500', bgColor: 'hover:bg-amber-500/10' },
    { id: 'image', label: 'Image', icon: ImageIcon, color: 'text-emerald-500', bgColor: 'hover:bg-emerald-500/10' },
    { id: 'file', label: 'File / PDF Attachment', icon: FileUp, color: 'text-blue-500', bgColor: 'hover:bg-blue-500/10' },
    { id: 'todo', label: 'Todo Checklist', icon: CheckSquare, color: 'text-emerald-500', bgColor: 'hover:bg-emerald-500/10' },
    { id: 'bulletList', label: 'Bulleted List', icon: List, color: 'text-cyan-500', bgColor: 'hover:bg-cyan-500/10' },
    { id: 'numberedList', label: 'Numbered List', icon: ListOrdered, color: 'text-indigo-500', bgColor: 'hover:bg-indigo-500/10' },
    { id: 'table', label: 'Table Block', icon: TableIcon, color: 'text-purple-500', bgColor: 'hover:bg-purple-500/10' },
    { id: 'code', label: 'Code Snippet', icon: Code, color: 'text-pink-500', bgColor: 'hover:bg-pink-500/10' },
    { id: 'quote', label: 'Quote / Callout', icon: Quote, color: 'text-rose-500', bgColor: 'hover:bg-rose-500/10' },
    { id: 'divider', label: 'Divider Line', icon: Minus, color: 'text-muted-foreground', bgColor: 'hover:bg-muted' },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="my-auto ml-3 shrink-0 z-30 select-none">
        {/* Apple Glassmorphic Floating Tool Rail */}
        <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-card/80 dark:bg-zinc-900/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10">
          
          {/* Quick Add Catalog Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold text-xs bg-popover text-popover-foreground border border-border shadow-xl">
                Insert Element Catalog
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent side="right" align="start" className="w-52 bg-popover/95 backdrop-blur-md border-border p-1.5 shadow-2xl rounded-xl">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Apple Scratch Elements
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInsertBlock('file')} className="cursor-pointer">
                <FileUp className="h-4 w-4 mr-2.5 text-blue-500" /> File / PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('toggle')} className="cursor-pointer">
                <ChevronRight className="h-4 w-4 mr-2.5 text-amber-500" /> Toggle List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('todo')} className="cursor-pointer">
                <CheckSquare className="h-4 w-4 mr-2.5 text-emerald-500" /> Todo Checklist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('table')} className="cursor-pointer">
                <TableIcon className="h-4 w-4 mr-2.5 text-purple-500" /> Table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('code')} className="cursor-pointer">
                <Code className="h-4 w-4 mr-2.5 text-pink-500" /> Code Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('quote')} className="cursor-pointer">
                <Quote className="h-4 w-4 mr-2.5 text-rose-500" /> Quote / Callout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('bulletList')} className="cursor-pointer">
                <List className="h-4 w-4 mr-2.5 text-cyan-500" /> Bulleted List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertBlock('divider')} className="cursor-pointer">
                <Minus className="h-4 w-4 mr-2.5 text-muted-foreground" /> Divider Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-5 h-[1px] bg-border/60 my-0.5" />

          {/* Quick Icon Tools Rail */}
          {ICON_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onInsertBlock(item.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${item.bgColor} hover:scale-105 active:scale-95 group`}
                  >
                    <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${item.color}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="font-semibold text-xs bg-popover/95 backdrop-blur-md text-popover-foreground border border-border shadow-xl px-2.5 py-1.5 rounded-lg flex items-center gap-2"
                >
                  <span>{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
};
