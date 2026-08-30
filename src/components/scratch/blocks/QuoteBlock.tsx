import React from 'react';
import { SlateBlockInput } from './SlateBlockInput';

interface QuoteBlockProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: any) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  content,
  onChange,
  onKeyDown,
  autoFocus = false,
  onFocus,
  onBlur,
  onEditorReady,
  onPaste,
}) => {
  return (
    <div className="border-l-3 border-primary/70 pl-3 my-1">
      <SlateBlockInput
        content={content}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Empty quote..."
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        onEditorReady={onEditorReady}
        onPaste={onPaste}
        className="w-full bg-transparent text-foreground italic outline-none border-none py-1 text-sm leading-relaxed min-h-[28px] cursor-text"
      />
    </div>
  );
};

