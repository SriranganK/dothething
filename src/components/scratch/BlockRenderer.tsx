import React, { useState, useRef } from 'react';
import { Plus, GripVertical, Trash2, Copy, RefreshCw, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import type { ScratchBlock, BlockType, ScratchBlockProperties } from '@/types/scratch';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TodoBlock } from './blocks/TodoBlock';
import { ListBlock } from './blocks/ListBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { TableBlock } from './blocks/TableBlock';
import { SlashCommandMenu } from './SlashCommandMenu';
import { FormattingToolbar } from './FormattingToolbar';

interface BlockRendererProps {
  block: ScratchBlock;
  blockIndex: number;
  onUpdateContent: (blockId: string, content: string) => void;
  onUpdateProperties: (blockId: string, properties: ScratchBlockProperties) => void;
  onChangeType: (blockId: string, type: BlockType) => void;
  onDeleteBlock: (blockId: string) => void;
  onCreateBlockBelow: (afterBlockId: string, type?: BlockType) => void;
  onDuplicateBlock: (block: ScratchBlock) => void;
  onAddComment?: (blockId: string) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  commentCount?: { total: number; open: number };
  isActiveCommentTarget?: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  blockIndex,
  onUpdateContent,
  onUpdateProperties,
  onChangeType,
  onDeleteBlock,
  onCreateBlockBelow,
  onDuplicateBlock,
  onAddComment,
  isFocused,
  onFocus,
  commentCount,
  isActiveCommentTarget,
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const blockContainerRef = useRef<HTMLDivElement>(null);

  const handleTextChange = (value: string) => {
    if (value.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashQuery(value.slice(1));
    } else if (showSlashMenu) {
      if (value.includes('/')) {
        const parts = value.split('/');
        setSlashQuery(parts[parts.length - 1]);
      } else {
        setShowSlashMenu(false);
        setSlashQuery('');
      }
    }
    onUpdateContent(block._id, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    // Keyboard shortcuts for formatting
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleFormatText('bold');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleFormatText('italic');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      handleFormatText('underline');
      return;
    }

    if (showSlashMenu) {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setSlashQuery('');
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault();
      const nextType =
        block.type === 'todo' || block.type === 'bulletList' || block.type === 'numberedList'
          ? block.type
          : 'paragraph';
      onCreateBlockBelow(block._id, nextType);
    } else if (e.key === 'Backspace' && (block.content === '' || block.content === '<br>')) {
      if (block.type !== 'paragraph') {
        e.preventDefault();
        onChangeType(block._id, 'paragraph');
      } else {
        e.preventDefault();
        onDeleteBlock(block._id);
      }
    }
  };

  const handleSelectCommand = (newType: BlockType) => {
    setShowSlashMenu(false);
    setSlashQuery('');
    const cleanContent = block.content.replace(/^\/[^\s]*/, '');
    onUpdateContent(block._id, cleanContent);
    onChangeType(block._id, newType);
  };

  const handleFormatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editable = blockContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLDivElement | null;
    if (editable) {
      onUpdateContent(block._id, editable.innerHTML);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading1':
        return (
          <HeadingBlock
            level={1}
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'heading2':
        return (
          <HeadingBlock
            level={2}
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'heading3':
        return (
          <HeadingBlock
            level={3}
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'todo':
        return (
          <TodoBlock
            content={block.content}
            properties={block.properties}
            onChangeContent={handleTextChange}
            onChangeProperties={(props) => onUpdateProperties(block._id, props)}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'bulletList':
        return (
          <ListBlock
            type="bulletList"
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'numberedList':
        return (
          <ListBlock
            type="numberedList"
            content={block.content}
            index={blockIndex + 1}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'quote':
        return (
          <QuoteBlock
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'code':
        return (
          <CodeBlock
            content={block.content}
            properties={block.properties}
            onChangeContent={(val) => onUpdateContent(block._id, val)}
            onChangeProperties={(props) => onUpdateProperties(block._id, props)}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'table':
        return (
          <TableBlock
            content={block.content}
            properties={block.properties}
            onChangeProperties={(props) => onUpdateProperties(block._id, props)}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'divider':
        return <DividerBlock />;
      case 'paragraph':
      default:
        return (
          <ParagraphBlock
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
    }
  };

  // Only show floating toolbar on the single actively focused block
  const showToolbar = isFocused && block.type !== 'divider' && block.type !== 'code' && block.type !== 'table';

  const hasComments = commentCount && commentCount.total > 0;

  return (
    <div
      id={block._id}
      ref={blockContainerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => {
        onFocus?.();
      }}
      className={`relative group/block flex items-start gap-1 py-0.5 min-h-[32px] transition-colors rounded-md ${
        isActiveCommentTarget
          ? 'bg-primary/10 border-l-2 border-primary pl-2'
          : hasComments && commentCount.open > 0
          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500/80 pl-2'
          : ''
      }`}
    >
      {/* Left Block Controls (Plus & Drag Handle) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity pt-1 shrink-0 select-none">
        <button
          onClick={() => onCreateBlockBelow(block._id)}
          className="p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
          title="Click to add a block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded transition-colors cursor-grab"
              title="Click for options"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-popover border-border">
            <DropdownMenuItem
              onClick={() => onAddComment?.(block._id)}
              className="cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 mr-2 text-primary" />
              Comment on Line
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteBlock(block._id)}
              className="text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Block
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicateBlock(block)}
              className="cursor-pointer"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <RefreshCw className="h-4 w-4 mr-2" />
                Turn into...
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40 bg-popover border-border">
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'paragraph')}>Text</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'heading1')}>Heading 1</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'heading2')}>Heading 2</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'heading3')}>Heading 3</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'todo')}>Todo List</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'bulletList')}>Bulleted List</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'numberedList')}>Numbered List</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'quote')}>Quote</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'code')}>Code Block</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'table')}>Table</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Block Content & Formatting Toolbar */}
      <div className="flex-1 min-w-0 relative">
        {showToolbar && (
          <div className="absolute -top-8 right-0 z-30 shadow-md">
            <FormattingToolbar
              currentType={block.type}
              onChangeType={(newType) => onChangeType(block._id, newType)}
              onFormatText={handleFormatText}
              onAddComment={onAddComment ? () => onAddComment(block._id) : undefined}
            />
          </div>
        )}

        {renderBlockContent()}

        {/* Slash Command Popup */}
        {showSlashMenu && (
          <div className="absolute left-0 top-full mt-1">
            <SlashCommandMenu
              query={slashQuery}
              onSelect={handleSelectCommand}
              onClose={() => setShowSlashMenu(false)}
            />
          </div>
        )}
      </div>

      {/* Right-side Comment Badge / Action */}
      <div className="flex items-center gap-1 shrink-0 pt-1 select-none">
        {hasComments && (
          <button
            onClick={() => onAddComment?.(block._id)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all cursor-pointer ${
              commentCount.open > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-500/30 shadow-sm border border-amber-500/30'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted font-normal'
            }`}
            title={`${commentCount.open} open comment(s) on this line`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>{commentCount.total}</span>
          </button>
        )}
      </div>
    </div>
  );
};
