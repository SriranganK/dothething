import React from 'react';
import { SlateBlockInput } from './SlateBlockInput';

interface HeadingBlockProps {
  level: 1 | 2 | 3;
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: any) => void;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  level,
  content,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus = false,
  onFocus,
  onBlur,
  onEditorReady,
}) => {
  const levelStyles = {
    1: 'text-2xl font-bold text-foreground mt-4 mb-1 tracking-tight',
    2: 'text-xl font-bold text-foreground mt-3 mb-1 tracking-tight',
    3: 'text-lg font-semibold text-foreground mt-2 mb-1 tracking-tight',
  };

  const defaultPlaceholders = {
    1: 'Heading 1',
    2: 'Heading 2',
    3: 'Heading 3',
  };

  return (
    <SlateBlockInput
      content={content}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder || defaultPlaceholders[level]}
      autoFocus={autoFocus}
      onFocus={onFocus}
      onBlur={onBlur}
      onEditorReady={onEditorReady}
      className={`w-full bg-transparent outline-none border-none py-0.5 leading-snug min-h-[32px] cursor-text ${levelStyles[level]}`}
    />
  );
};

