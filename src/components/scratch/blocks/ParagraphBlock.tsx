import React from 'react';
import { SlateBlockInput } from './SlateBlockInput';

interface ParagraphBlockProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: any) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  content,
  onChange,
  onKeyDown,
  placeholder = "Type '/' for commands or start writing...",
  autoFocus = false,
  onFocus,
  onBlur,
  onEditorReady,
  onPaste,
}) => {
  return (
    <SlateBlockInput
      content={content}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onFocus={onFocus}
      onBlur={onBlur}
      onEditorReady={onEditorReady}
      onPaste={onPaste}
      className="w-full bg-transparent text-foreground outline-none border-none py-1 text-sm leading-relaxed font-normal min-h-[28px] cursor-text"
    />
  );
};

