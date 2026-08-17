import React, { useRef, useEffect } from 'react';

interface HeadingBlockProps {
  level: 1 | 2 | 3;
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  level,
  content,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus = false,
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== content) {
      divRef.current.innerHTML = content || '';
    }
  }, [content]);

  useEffect(() => {
    if (autoFocus && divRef.current) {
      divRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

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
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder || defaultPlaceholders[level]}
      className={`w-full bg-transparent outline-none border-none py-0.5 leading-snug min-h-[32px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 cursor-text ${levelStyles[level]}`}
    />
  );
};
