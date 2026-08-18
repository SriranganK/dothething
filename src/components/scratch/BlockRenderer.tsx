import React, { useState, useRef } from 'react';
import { Plus, GripVertical, Trash2, Copy, RefreshCw, MessageSquare, FolderOutput } from 'lucide-react';
import { Editor } from 'slate';
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
import { FileBlock } from './blocks/FileBlock';
import { ToggleBlock } from './blocks/ToggleBlock';
import { SlateFormat, slateNodesToHtml } from './blocks/SlateBlockInput';
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
  onMoveBlock?: (draggedId: string, targetId: string) => void;
  onMoveToPage?: (blockId: string) => void;
  isFocused?: boolean;
  hasAnyFocusedBlock?: boolean;
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
  onMoveBlock,
  onMoveToPage,
  isFocused,
  hasAnyFocusedBlock,
  onFocus,
  commentCount,
  isActiveCommentTarget,
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const blockContainerRef = useRef<HTMLDivElement>(null);
  const activeEditorRef = useRef<any>(null);

  const [openUpward, setOpenUpward] = useState(false);

  const handleTextChange = (value: string) => {
    if (value.startsWith('/')) {
      if (blockContainerRef.current) {
        const rect = blockContainerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 330);
      }
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const url = window.prompt('Enter link URL (e.g. https://example.com):', 'https://');
      if (url && url.trim()) {
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
          finalUrl = `https://${finalUrl}`;
        }
        handleFormatText('createLink', finalUrl);
      }
      return;
    }

    if (showSlashMenu) {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setSlashQuery('');
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code' && block.type !== 'file') {
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
    const editor = activeEditorRef.current;
    if (editor) {
      if (command === 'bold') SlateFormat.toggleMark(editor, 'bold');
      else if (command === 'italic') SlateFormat.toggleMark(editor, 'italic');
      else if (command === 'underline') SlateFormat.toggleMark(editor, 'underline');
      else if (command === 'strikeThrough') SlateFormat.toggleMark(editor, 'strikethrough');
      else if (command === 'hiliteColor' && value) SlateFormat.toggleMark(editor, 'bgColor', value);
      else if (command === 'createLink' && value) SlateFormat.insertLink(editor, value);
      else if (command === 'removeFormat') {
        Editor.removeMark(editor, 'bold');
        Editor.removeMark(editor, 'italic');
        Editor.removeMark(editor, 'underline');
        Editor.removeMark(editor, 'strikethrough');
        Editor.removeMark(editor, 'bgColor');
        SlateFormat.unwrapLink(editor);
      }
      const updatedHtml = slateNodesToHtml(editor.children);
      onUpdateContent(block._id, updatedHtml);
      return;
    }

    if (command === 'createLink' && value) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed) {
        const linkHtml = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
      } else {
        document.execCommand(command, false, value);
      }
    } else {
      document.execCommand(command, false, value);
    }

    const editable = blockContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLDivElement | null;
    if (editable) {
      onUpdateContent(block._id, editable.innerHTML);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', block._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const draggedBlockId = e.dataTransfer.getData('text/plain');
    if (draggedBlockId && draggedBlockId !== block._id && onMoveBlock) {
      onMoveBlock(draggedBlockId, block._id);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'file':
        return (
          <FileBlock
            properties={block.properties}
            onChangeProperties={(props) => onUpdateProperties(block._id, props)}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
          />
        );
      case 'toggle':
        return (
          <ToggleBlock
            content={block.content}
            properties={block.properties}
            onChangeContent={handleTextChange}
            onChangeProperties={(props) => onUpdateProperties(block._id, props)}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
            onEditorReady={(e) => (activeEditorRef.current = e)}
          />
        );
      case 'heading1':
        return (
          <HeadingBlock
            level={1}
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
          />
        );
      case 'quote':
        return (
          <QuoteBlock
            content={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus={isFocused}
            onEditorReady={(e) => (activeEditorRef.current = e)}
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
            onEditorReady={(e) => (activeEditorRef.current = e)}
          />
        );
    }
  };

  // Show floating formatting toolbar on actively focused, hovered (only when no block is focused), or menu-open text block
  const shouldShowHover = isHovered && !hasAnyFocusedBlock;
  const showToolbar = (isFocused || shouldShowHover || isMenuOpen) && block.type !== 'divider' && block.type !== 'code' && block.type !== 'table';

  const hasComments = commentCount && commentCount.total > 0;

  return (
    <div
      id={block._id}
      ref={blockContainerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFocus={() => {
        onFocus?.();
      }}
      className={`relative group/block flex items-start gap-1 py-0.5 min-h-[32px] transition-colors rounded-md ${
        showSlashMenu || isFocused || isMenuOpen || showToolbar ? 'z-40' : 'z-0'
      } ${
        isDragOver ? 'border-t-2 border-primary bg-primary/5 pt-1' : ''
      } ${
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
              draggable
              onDragStart={handleDragStart}
              className="p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reorder or click for options"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-popover border-border">
            <DropdownMenuItem
              onClick={() => onAddComment?.(block._id)}
              className="cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 mr-2 text-primary" />
              Comment on Line
            </DropdownMenuItem>
            {onMoveToPage && (
              <DropdownMenuItem
                onClick={() => onMoveToPage(block._id)}
                className="cursor-pointer"
              >
                <FolderOutput className="h-4 w-4 mr-2 text-blue-500" />
                Move to Page...
              </DropdownMenuItem>
            )}
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
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'toggle')}>Toggle List</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeType(block._id, 'file')}>File / PDF</DropdownMenuItem>
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
          <div className="absolute -top-10 left-0 z-40 shadow-xl">
            <FormattingToolbar
              currentType={block.type}
              onChangeType={(newType) => onChangeType(block._id, newType)}
              onFormatText={handleFormatText}
              onAddComment={onAddComment ? () => onAddComment(block._id) : undefined}
              onOpenStateChange={setIsMenuOpen}
            />
          </div>
        )}

        {renderBlockContent()}

        {/* Slash Command Popup */}
        {showSlashMenu && (
          <div
            className={`absolute left-0 z-[120] ${
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
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
