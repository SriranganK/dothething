export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'todo'
  | 'toggle'
  | 'quote'
  | 'divider'
  | 'code'
  | 'image'
  | 'file'
  | 'link'
  | 'table'
  | 'kanban'
  | 'taskReference'
  | 'boardReference';

export interface ScratchBlockProperties {
  checked?: boolean;
  dueDate?: string | null;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignee?: string;
  tags?: string[];
  language?: string;
  linkedEntityType?: 'task' | 'board' | null;
  linkedEntityId?: string | null;
  [key: string]: any;
}

export interface ScratchBlock {
  _id: string;
  pageId: string;
  workspace: string;
  type: BlockType;
  content: string;
  properties: ScratchBlockProperties;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScratchPage {
  _id: string;
  workspace: string;
  title: string;
  icon?: string;
  cover?: string;
  parentPageId?: string | null;
  visibility?: 'private' | 'workspace' | 'shared' | 'public';
  isFavorite: boolean;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface CommentReply {
  _id?: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
}

export interface ScratchComment {
  _id: string;
  pageId: string;
  blockId?: string | null;
  content: string;
  author: CommentAuthor;
  resolved: boolean;
  replies: CommentReply[];
  createdAt: string;
  updatedAt: string;
}

export interface ScratchShareToken {
  _id: string;
  pageId: string;
  token: string;
  role: 'viewer' | 'editor';
  expiresAt?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ScratchCollaborator {
  _id?: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  role: 'editor' | 'commenter' | 'viewer';
  addedAt: string;
}

