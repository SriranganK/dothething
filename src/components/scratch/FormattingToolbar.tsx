import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  Type,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Palette,
  MessageSquarePlus,
  Check,
} from 'lucide-react';
import type { BlockType } from '@/types/scratch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface FormattingToolbarProps {
  currentType: BlockType;
  onChangeType: (type: BlockType) => void;
  onFormatText: (command: string, value?: string) => void;
  onAddComment?: () => void;
  onOpenStateChange?: (isOpen: boolean) => void;
  position?: { top: number; left: number };
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#fef08a' }, // yellow-200
  { name: 'Green', color: '#bbf7d0' },  // green-200
  { name: 'Blue', color: '#bfdbfe' },   // blue-200
  { name: 'Red', color: '#fecaca' },    // red-200
  { name: 'Purple', color: '#e9d5ff' }, // purple-200
];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  currentType,
  onChangeType,
  onFormatText,
  onAddComment,
  onOpenStateChange,
  position,
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    onOpenStateChange?.(linkPopoverOpen);
    if (linkPopoverOpen) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    }
  }, [linkPopoverOpen, onOpenStateChange]);

  const handleSaveSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const handleApplyLink = () => {
    if (linkUrl.trim()) {
      let finalUrl = linkUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
        finalUrl = `https://${finalUrl}`;
      }

      // Restore saved DOM selection before applying link
      const sel = window.getSelection();
      if (sel && savedRangeRef.current) {
        try {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        } catch (err) {
          // Range might be stale if selection DOM changed
        }
      }

      onFormatText('createLink', finalUrl);
      setLinkUrl('');
      setLinkPopoverOpen(false);
    }
  };

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number } | undefined>(position);

  useEffect(() => {
    if (!position || !toolbarRef.current) return;
    const rect = toolbarRef.current.getBoundingClientRect();
    const margin = 12;
    let newTop = position.top;
    let newLeft = position.left;

    // Viewport width check
    if (newLeft + rect.width > window.innerWidth - margin) {
      newLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (newLeft < margin) {
      newLeft = margin;
    }

    // Viewport height check (flip to below if top overflow)
    if (newTop < margin) {
      newTop = position.top + 45; // move below selection
    }

    setAdjustedPos({ top: newTop, left: newLeft });
  }, [position]);

  return (
    <div
      ref={toolbarRef}
      style={adjustedPos ? { top: adjustedPos.top, left: adjustedPos.left } : undefined}
      className="z-[100] flex items-center gap-0.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1 animate-in fade-in-50 zoom-in-95 duration-100 select-none backdrop-blur-md"
    >
      {/* Block Type Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 hover:bg-muted rounded-lg text-foreground cursor-pointer"
          >
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="capitalize">{currentType.replace(/([A-Z])/g, ' $1')}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 bg-popover border-border">
          <DropdownMenuItem onClick={() => onChangeType('paragraph')}>
            <Type className="h-3.5 w-3.5 mr-2" /> Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('heading1')}>
            <Heading1 className="h-3.5 w-3.5 mr-2" /> Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('heading2')}>
            <Heading2 className="h-3.5 w-3.5 mr-2" /> Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('heading3')}>
            <Heading3 className="h-3.5 w-3.5 mr-2" /> Heading 3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('todo')}>
            <CheckSquare className="h-3.5 w-3.5 mr-2" /> Todo List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('bulletList')}>
            <List className="h-3.5 w-3.5 mr-2" /> Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('quote')}>
            <Quote className="h-3.5 w-3.5 mr-2" /> Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('code')}>
            <Code className="h-3.5 w-3.5 mr-2" /> Code Block
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeType('table')}>
            <TableIcon className="h-3.5 w-3.5 mr-2" /> Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-[1px] h-4 bg-border mx-1" />

      {/* Bold */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatText('bold')}
        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* Italic */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatText('italic')}
        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* Underline */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatText('underline')}
        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* Strikethrough */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatText('strikeThrough')}
        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* Link Popover */}
      <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onMouseDown={handleSaveSelection}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title="Add Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-64 p-2 bg-popover border-border z-50 shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Insert Link URL</p>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyLink()}
              placeholder="https://example.com"
              className="flex-1 px-2.5 py-1 text-xs bg-muted border border-border rounded-md text-foreground focus:outline-none"
            />
            <Button size="sm" onClick={handleApplyLink} className="h-7 px-2 text-xs">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Color Highlight Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title="Text Highlight Color"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36 bg-popover border-border p-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase">Highlight</p>
          {HIGHLIGHT_COLORS.map((c) => (
            <DropdownMenuItem
              key={c.name}
              onClick={() => onFormatText('hiliteColor', c.color)}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => onFormatText('removeFormat')} className="text-xs text-muted-foreground cursor-pointer">
            Clear Formatting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Comment */}
      {onAddComment && (
        <>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAddComment}
            className="p-1.5 hover:bg-muted rounded-lg text-primary hover:text-primary cursor-pointer"
            title="Add Comment to this line"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
