import React, { useState, useEffect, useRef } from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  FileUp,
  Link2,
  Image as ImageIcon,
} from 'lucide-react';
import type { BlockType } from '@/types/scratch';

export interface CommandItem {
  id: BlockType;
  label: string;
  description: string;
  category: 'Basic' | 'Project' | 'Media';
  icon: any;
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: 'paragraph', label: 'Text', description: 'Just start writing with plain text.', category: 'Basic', icon: Type },
  { id: 'heading1', label: 'Heading 1', description: 'Big section heading.', category: 'Basic', icon: Heading1 },
  { id: 'heading2', label: 'Heading 2', description: 'Medium section heading.', category: 'Basic', icon: Heading2 },
  { id: 'heading3', label: 'Heading 3', description: 'Small section heading.', category: 'Basic', icon: Heading3 },
  { id: 'todo', label: 'Todo List', description: 'Track tasks with a checklist.', category: 'Basic', icon: CheckSquare },
  { id: 'toggle', label: 'Toggle List', description: 'Collapsible section to hide and show sub-content.', category: 'Basic', icon: ChevronRight },
  { id: 'image', label: 'Image', description: 'Upload or embed an image with caption.', category: 'Media', icon: ImageIcon },
  { id: 'file', label: 'File / PDF / DOCX', description: 'Upload a PDF, DOCX or document file with preview.', category: 'Media', icon: FileUp },
  { id: 'bulletList', label: 'Bulleted List', description: 'Create a simple bulleted list.', category: 'Basic', icon: List },
  { id: 'numberedList', label: 'Numbered List', description: 'Create a list with numbering.', category: 'Basic', icon: ListOrdered },
  { id: 'quote', label: 'Quote', description: 'Capture a quote or callout block.', category: 'Basic', icon: Quote },
  { id: 'divider', label: 'Divider', description: 'Visually divide blocks with a horizontal line.', category: 'Basic', icon: Minus },
  { id: 'code', label: 'Code Block', description: 'Display code snippet with syntax container.', category: 'Basic', icon: Code },
  { id: 'kanban', label: 'Kanban', description: 'Insert lightweight Kanban board.', category: 'Project', icon: Kanban },
  { id: 'table', label: 'Table', description: 'Structured tabular data view.', category: 'Project', icon: TableIcon },
  { id: 'taskReference', label: 'Task Link', description: 'Reference an existing DoTheThing task.', category: 'Project', icon: Link2 },
];

interface SlashCommandMenuProps {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCommands = COMMAND_ITEMS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      cmd.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={containerRef}
        style={position ? { top: position.top, left: position.left } : undefined}
        className="z-[120] w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-3 text-xs text-muted-foreground text-center"
      >
        No commands found matching "{query}"
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={position ? { top: position.top, left: position.left } : undefined}
      className="z-[120] w-72 max-h-80 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95 duration-100"
    >
      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Basic Blocks
      </div>
      {filteredCommands.map((cmd, idx) => {
        const Icon = cmd.icon;
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={cmd.id}
            onClick={() => onSelect(cmd.id)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
            }`}
          >
            <div className={`p-1.5 rounded-md shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{cmd.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{cmd.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
