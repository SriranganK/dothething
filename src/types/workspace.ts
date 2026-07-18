// src/types/workspace.ts

export interface WorkspaceType {
  _id: string;
  name: string;
  type: string;
  teamSize: string;
  industry: string;
  owner: string | { _id: string; name: string; email: string };
  members: string[];
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  description?: string;
  ssoEnabled?: boolean;
  mfaEnforced?: boolean;
  createdAt?: string;
}

export interface ColumnType {
  id: string;
  name: string;
  order: number;
  isDone?: boolean;
  items?: any[]; // optional items array for column
  itemCount?: number; // optional count of items if provided separately
  statusMapping?: string;
}

export interface BoardType {
  _id: string;
  name: string;
  workspace: string;
  columns: ColumnType[];
  owner: string | { _id: string; name: string; email: string };
  members?: { userId: string; role: string; name?: string }[]; // added members with role
  visibility?: 'WORKSPACE' | 'PRIVATE';
  currentUserRole?: string;
  sourceDocuments?: { fileName: string; uploadedAt: string }[];
  createdAt: string;
}

export interface CommentType {
  _id?: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface ChecklistItemType {
  id: string;
  text: string;
  completed: boolean;
}

export type ItemTypeClass = 'Task' | 'Bug' | 'Lead' | 'Idea' | 'Issue' | 'Event' | 'Feature' | 'Research' | 'Documentation';
export type ItemPriorityClass = 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest' | 'Critical';
export type ViewMode = "kanban" | "list" | "calendar" | "timeline" | "summary";

export interface ItemType {
  _id: string;
  board: string;
  columnId: string;
  title: string;
  description: string;
  type: ItemTypeClass;
  priority: ItemPriorityClass;
  assignee: string;
  startDate: string | null;
  dueDate: string | null;
  attachments: AttachmentType[];
  checklist: ChecklistItemType[];
  comments: CommentType[];
  order: number;
  createdAt: string;
  labels?: any[];
  milestone_id?: string | null;
  milestone?: { _id: string; name: string; color: string; status: string; due_date?: string } | null;
  status?: string;
  storyPoints?: number;
  watchers?: string[];
  epic?: string;
  sprint?: string;
  reporter?: string;
  archived?: boolean;
  linkedRepo?: string;
  githubBranchName?: string;
  gitlabBranchName?: string;
  source?: string;
}

export interface AttachmentType {
  _id: string;
  id: string;
  issueId: string;
  type: 'file' | 'link';
  fileName: string;
  originalName: string;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  publicUrl: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}
