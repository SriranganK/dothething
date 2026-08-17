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
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  content,
  onChange,
  onKeyDown,
  placeholder = "Type '/' for commands or start writing...",
  autoFocus = false,
  onFocus,
  onBlur,
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
      className="w-full bg-transparent text-foreground outline-none border-none py-1 text-sm leading-relaxed font-normal min-h-[28px] cursor-text"
    />
  );
};

