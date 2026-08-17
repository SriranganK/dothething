import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { createEditor, Node, Transforms, Editor } from 'slate';
import type { Descendant, BaseEditor, Operation } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import type { RenderLeafProps, RenderElementProps } from 'slate-react';

type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface SlateBlockInputProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

function stringToSlateNodes(str: string): Descendant[] {
  if (!str) return [{ type: 'paragraph', children: [{ text: '' }] }];
  const text = str.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  return [{ type: 'paragraph', children: [{ text }] }];
}

function slateNodesToString(nodes: Descendant[]): string {
  return nodes.map((n) => Node.string(n)).join('\n');
}

export const SlateBlockInput: React.FC<SlateBlockInputProps> = ({
  content,
  onChange,
  onKeyDown,
  placeholder = '',
  autoFocus = false,
  className = '',
  onFocus,
  onBlur,
}) => {
  const editor = useMemo(() => withReact(createEditor()), []);
  const initialValue = useMemo(() => stringToSlateNodes(content), []);
  const isEditingRef = useRef(false);

  // Sync external content changes into Slate if not actively editing
  useEffect(() => {
    if (isEditingRef.current) return;
    const currentText = slateNodesToString(editor.children);
    if (currentText !== content) {
      const newNodes = stringToSlateNodes(content);
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, []),
          focus: Editor.end(editor, []),
        },
      });
      Transforms.insertNodes(editor, newNodes, { at: [0] });
    }
  }, [content, editor]);

  // Handle autoFocus
  useEffect(() => {
    if (autoFocus) {
      try {
        ReactEditor.focus(editor);
        Transforms.select(editor, Editor.end(editor, []));
      } catch (err) {
        // Safe catch if DOM not ready
      }
    }
  }, [autoFocus, editor]);

  const handleChange = useCallback(
    (value: Descendant[]) => {
      const isAstChange = editor.operations.some((op: Operation) => 'type' in op && op.type !== 'set_selection');
      if (isAstChange) {
        const textValue = slateNodesToString(value);
        onChange(textValue);
      }
    },
    [editor, onChange]
  );

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    let { attributes, children, leaf } = props;
    if (leaf.bold) children = <strong>{children}</strong>;
    if (leaf.italic) children = <em>{children}</em>;
    if (leaf.underline) children = <u>{children}</u>;
    if (leaf.strikethrough) children = <s>{children}</s>;
    return <span {...attributes}>{children}</span>;
  }, []);

  const renderElement = useCallback((props: RenderElementProps) => {
    return <p {...props.attributes}>{props.children}</p>;
  }, []);

  return (
    <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          isEditingRef.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          isEditingRef.current = false;
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (onKeyDown) {
            onKeyDown(e);
          }
        }}
      />
    </Slate>
  );
};
