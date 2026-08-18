import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { createEditor, Node, Transforms, Editor, Range } from 'slate';
import type { Descendant, BaseEditor, Operation } from 'slate';
import { Slate, Editable, withReact, ReactEditor, useSlateStatic } from 'slate-react';
import type { RenderLeafProps, RenderElementProps } from 'slate-react';
import { Link2, ExternalLink, Copy, Unlink, Check } from 'lucide-react';
import { toast } from 'sonner';

export type LinkElement = { type: 'link'; url: string; children: CustomText[] };
export type ParagraphElement = { type: 'paragraph'; children: (CustomText | LinkElement)[] };
export type CustomElement = ParagraphElement | LinkElement;
export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  bgColor?: string;
  url?: string;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export interface SlateBlockInputProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: ReactEditor) => void;
}

export const SlateFormat = {
  isMarkActive(editor: Editor, format: keyof CustomText) {
    const marks = Editor.marks(editor) as Record<string, any> | null;
    return marks ? marks[format] === true : false;
  },

  toggleMark(editor: Editor, format: keyof CustomText, value: any = true) {
    const isActive = SlateFormat.isMarkActive(editor, format);
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, value);
    }
  },

  isLinkActive(editor: Editor) {
    const [link] = Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n) && (n as any).type === 'link',
    });
    return !!link;
  },

  unwrapLink(editor: Editor) {
    Transforms.unwrapNodes(editor, {
      match: (n) => !Editor.isEditor(n) && (n as any).type === 'link',
    });
  },

  insertLink(editor: Editor, url: string) {
    if (SlateFormat.isLinkActive(editor)) {
      SlateFormat.unwrapLink(editor);
    }

    let selection: Range | null = editor.selection;

    if (!selection) {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        try {
          selection = ReactEditor.toSlateRange(editor as ReactEditor, domSelection, {
            exactMatch: false,
            suppressThrow: true,
          });
        } catch (e) {
          // DOM selection couldn't be converted
        }
      }
    }

    if (!selection) {
      selection = (editor as any).lastSelection || null;
    }

    if (!selection) {
      selection = {
        anchor: Editor.end(editor, []),
        focus: Editor.end(editor, []),
      };
    }

    try {
      ReactEditor.focus(editor as ReactEditor);
      Transforms.select(editor, selection);
    } catch (e) {
      // Safe fallback
    }

    const isCollapsed = Range.isCollapsed(selection);
    const link: LinkElement = {
      type: 'link',
      url,
      children: isCollapsed ? [{ text: url }] : [],
    };

    if (isCollapsed) {
      Transforms.insertNodes(editor, link, { at: selection });
    } else {
      Transforms.wrapNodes(editor, link, { at: selection, split: true });
      Transforms.collapse(editor, { edge: 'end' });
    }
  },
};

export function htmlToSlateNodes(html: string): Descendant[] {
  if (!html) return [{ type: 'paragraph', children: [{ text: '' }] }];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
    const body = doc.body;

    const parseNode = (node: globalThis.Node, parentMarks: Record<string, any> = {}): (LinkElement | CustomText)[] => {
      if (node.nodeType === globalThis.Node.TEXT_NODE) {
        const text = node.textContent || '';
        return text ? [{ text, ...parentMarks }] : [];
      }

      if (node.nodeType !== globalThis.Node.ELEMENT_NODE) {
        return [];
      }

      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      const marks = { ...parentMarks };
      if (tagName === 'b' || tagName === 'strong') marks.bold = true;
      if (tagName === 'i' || tagName === 'em') marks.italic = true;
      if (tagName === 'u') marks.underline = true;
      if (tagName === 's' || tagName === 'strike' || tagName === 'del') marks.strikethrough = true;
      if (el.style && el.style.backgroundColor) {
        marks.bgColor = el.style.backgroundColor;
      }

      if (tagName === 'a') {
        const url = el.getAttribute('href') || '';
        const linkChildren: CustomText[] = [];
        el.childNodes.forEach((child) => {
          const res = parseNode(child, marks);
          res.forEach((item) => {
            if ('text' in item) {
              linkChildren.push(item as CustomText);
            }
          });
        });
        if (linkChildren.length === 0) {
          linkChildren.push({ text: url || 'link', ...marks });
        }
        return [{ type: 'link', url, children: linkChildren }];
      }

      const results: (LinkElement | CustomText)[] = [];
      el.childNodes.forEach((child) => {
        results.push(...parseNode(child, marks));
      });
      return results;
    };

    const children: (LinkElement | CustomText)[] = [];
    body.childNodes.forEach((child) => {
      children.push(...parseNode(child));
    });

    if (children.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return [{ type: 'paragraph', children }];
  } catch (e) {
    const cleanText = html.replace(/<[^>]*>/g, '');
    return [{ type: 'paragraph', children: [{ text: cleanText }] }];
  }
}

export function slateNodesToHtml(nodes: Descendant[]): string {
  return nodes
    .map((node) => {
      if ('type' in node && node.type === 'paragraph') {
        return (node.children || []).map(serializeChild).join('');
      }
      return serializeChild(node);
    })
    .join('');
}

function serializeChild(node: any): string {
  if (!node) return '';

  if (node.type === 'link') {
    const linkText = (node.children || []).map(serializeChild).join('');
    const safeUrl = escapeHtml(node.url || '#');
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:opacity-80 transition-opacity cursor-pointer font-medium inline-flex items-center gap-0.5">${linkText}</a>`;
  }

  if (typeof node.text === 'string') {
    let html = escapeHtml(node.text);
    if (node.bold) html = `<strong>${html}</strong>`;
    if (node.italic) html = `<em>${html}</em>`;
    if (node.underline) html = `<u>${html}</u>`;
    if (node.strikethrough) html = `<s>${html}</s>`;
    if (node.bgColor) {
      html = `<span style="background-color: ${node.bgColor}" class="px-0.5 rounded">${html}</span>`;
    }
    if (node.url) {
      html = `<a href="${escapeHtml(node.url)}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:opacity-80 transition-opacity cursor-pointer font-medium">${html}</a>`;
    }
    return html;
  }

  return '';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const LinkElementComponent: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  const editor = useSlateStatic();
  const url = (element as any).url || '#';
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    SlateFormat.unwrapLink(editor);
  };

  return (
    <span {...attributes} className="relative group/link inline-block">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:opacity-80 transition-opacity cursor-pointer font-medium inline-flex items-center gap-0.5 px-0.5 rounded hover:bg-primary/10"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            window.open(url, '_blank');
          }
        }}
      >
        {children}
        <ExternalLink className="h-3 w-3 inline-block opacity-60 group-hover/link:opacity-100 transition-opacity ml-0.5" />
      </a>

      {/* Hover Floating Link Preview Card */}
      <span
        contentEditable={false}
        className="absolute left-0 top-full mt-1 z-[110] hidden group-hover/link:flex items-center gap-2 px-3 py-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl text-xs font-normal animate-in fade-in-50 zoom-in-95 duration-100 select-none whitespace-nowrap"
      >
        <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-mono text-[11px] max-w-[180px] truncate text-muted-foreground" title={url}>
          {url}
        </span>

        <div className="flex items-center gap-0.5 border-l border-border pl-1.5 ml-0.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-muted rounded text-primary hover:text-primary transition-colors cursor-pointer"
            title="Open link in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Copy URL"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleUnlink}
            className="p-1 hover:bg-muted rounded text-destructive hover:text-destructive transition-colors cursor-pointer"
            title="Remove link"
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
        </div>
      </span>
    </span>
  );
};

export const SlateBlockInput: React.FC<SlateBlockInputProps> = ({
  content,
  onChange,
  onKeyDown,
  placeholder = '',
  autoFocus = false,
  className = '',
  onFocus,
  onBlur,
  onEditorReady,
}) => {
  const editor = useMemo(() => {
    const e = withReact(createEditor());
    const { isInline } = e;
    e.isInline = (element) => ((element as any).type === 'link' ? true : isInline(element));
    return e;
  }, []);

  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const initialValue = useMemo(() => htmlToSlateNodes(content), []);
  const isEditingRef = useRef(false);

  // Sync external content changes into Slate if not actively editing
  useEffect(() => {
    if (isEditingRef.current) return;
    const currentHtml = slateNodesToHtml(editor.children);
    if (currentHtml !== content) {
      const newNodes = htmlToSlateNodes(content);
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
      if (editor.selection) {
        (editor as any).lastSelection = editor.selection;
      }
      const isAstChange = editor.operations.some((op: Operation) => 'type' in op && op.type !== 'set_selection');
      if (isAstChange) {
        const htmlValue = slateNodesToHtml(value);
        onChange(htmlValue);
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
    if (leaf.bgColor) {
      children = (
        <span style={{ backgroundColor: leaf.bgColor }} className="px-0.5 rounded">
          {children}
        </span>
      );
    }
    if (leaf.url) {
      children = (
        <a
          href={leaf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80 transition-opacity cursor-pointer font-medium"
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              window.open(leaf.url, '_blank');
            }
          }}
        >
          {children}
        </a>
      );
    }
    return <span {...attributes}>{children}</span>;
  }, []);

  const renderElement = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props;
    if ((element as any).type === 'link') {
      return <LinkElementComponent attributes={attributes} children={children} element={element} />;
    }
    return <p {...attributes}>{children}</p>;
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
