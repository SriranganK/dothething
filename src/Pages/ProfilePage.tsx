import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/config';
import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Mail,
  Settings,
  Trash,
  UserMinus,
  X,
  ChevronRight,
  Building2,
  LayoutGrid,
  AlertTriangle,
  Loader2,
  Send,
  Crown,
  Shield,
  UserCheck,
  Eye,
  Activity,
  Calendar,
  DollarSign,
  SlidersHorizontal,
  Search,
  Sparkles,
  Lock,
  Check,
  ArrowLeft,
  Globe,
  GitBranch,
  Clock,
  Folder,
  ArrowUpDown,
  Star,
  GitFork,
  GitCommit,
  ExternalLink,
  Link2,
  Filter,
  Tag,
} from 'lucide-react';
import type { WorkspaceType, BoardType } from '@/types/workspace';
import {
  useGetWorkspaceActivityQuery,
  useGetWorkspaceIntegrationsQuery,
  useGetPlatformReposQuery,
  useAuthorizePlatformMutation,
  useSimulateConnectMutation,
  useDisconnectPlatformMutation,
  useToggleIntegrationMutation,
  useLinkPlatformReposMutation,
} from '@/store/services/api';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";


const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const Gitlab = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l2.87-8.82a.84.84 0 0 1 .8-.58h3.76l2.27 6.94 2.27-6.94h3.76a.84.84 0 0 1 .8.58l2.87 8.82a.84.84 0 0 1-.3.94z" />
  </svg>
);

function timeAgo(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}


interface ProfilePageProps {
  workspace: WorkspaceType | null;
  onWorkspaceUpdated: (updated: WorkspaceType) => void;
  onWorkspaceDeleted: (id: string) => void;
  token: string;
  boards: BoardType[];
  onSelectBoard: (boardId: string) => void;
}

interface MemberType {
  _id: string;
  workspaceId: string;
  userId: { _id: string; name: string; email: string };
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  createdAt: string;
}

interface InvitationType {
  _id: string;
  workspaceId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedBy: { _id: string; name: string; email: string };
  createdAt: string;
}

type NavSection = 'overview' | 'general' | 'members' | 'billing' | 'security' | 'integrations';

const roleConfig = {
  OWNER: { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/40', label: 'Owner' },
  ADMIN: { icon: Shield, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-900/40', label: 'Admin' },
  MEMBER: { icon: UserCheck, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/40', label: 'Member' },
  GUEST: { icon: Eye, color: 'text-zinc-400 dark:text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900', border: 'border-zinc-200 dark:border-zinc-800', label: 'Guest' },
};

export default function WorkspaceProfilePage({
  workspace,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
  token,
  boards,
  onSelectBoard,
}: ProfilePageProps) {
  const confirm = useConfirm();
  // Navigation Section
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  // Integrations state
  const { data: integrationsData, refetch: refetchIntegrations } = useGetWorkspaceIntegrationsQuery(workspace?._id || '', {
    skip: !workspace?._id
  });
  const [authorizePlatform] = useAuthorizePlatformMutation();
  const [simulateConnect] = useSimulateConnectMutation();
  const [disconnectPlatform] = useDisconnectPlatformMutation();
  const [toggleIntegration] = useToggleIntegrationMutation();
  const [linkPlatformRepos] = useLinkPlatformReposMutation();

  const [githubRepoSearch, setGithubRepoSearch] = useState('');
  const [gitlabRepoSearch, setGitlabRepoSearch] = useState('');
  const [githubSelectedRepos, setGithubSelectedRepos] = useState<string[]>([]);
  const [gitlabSelectedRepos, setGitlabSelectedRepos] = useState<string[]>([]);

  const [isGithubReposDialogOpen, setIsGithubReposDialogOpen] = useState(false);
  const [githubSort, setGithubSort] = useState<'recently_used' | 'created_date' | 'name'>('recently_used');
  const [githubFilterVisibility, setGithubFilterVisibility] = useState<'all' | 'public' | 'private'>('all');

  const [isGitlabReposDialogOpen, setIsGitlabReposDialogOpen] = useState(false);
  const [gitlabSort, setGitlabSort] = useState<'recently_used' | 'created_date' | 'name'>('recently_used');
  const [gitlabFilterVisibility, setGitlabFilterVisibility] = useState<'all' | 'public' | 'private'>('all');

  const githubConnected = integrationsData?.integrations?.github?.connected || false;
  const gitlabConnected = integrationsData?.integrations?.gitlab?.connected || false;

  const { data: githubReposData, isLoading: loadingGithubRepos } = useGetPlatformReposQuery(
    { workspaceId: workspace?._id || '', platform: 'github' },
    { skip: !workspace?._id || !githubConnected }
  );

  const { data: gitlabReposData, isLoading: loadingGitlabRepos } = useGetPlatformReposQuery(
    { workspaceId: workspace?._id || '', platform: 'gitlab' },
    { skip: !workspace?._id || !gitlabConnected }
  );

  const githubRepoList = useMemo(() => {
    if (!githubReposData?.repos) return [];

    let filtered = [...githubReposData.repos];

    // Filter by search query
    if (githubRepoSearch.trim()) {
      const q = githubRepoSearch.toLowerCase();
      filtered = filtered.filter(r => r.fullName.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
    }

    // Filter by visibility
    if (githubFilterVisibility !== 'all') {
      const isPrivate = githubFilterVisibility === 'private';
      filtered = filtered.filter(r => r.private === isPrivate);
    }

    // Sort
    filtered.sort((a, b) => {
      if (githubSort === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (githubSort === 'created_date') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // newest first
      }
      // default: recently_used (updated_at)
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA; // recently updated first
    });

    return filtered;
  }, [githubReposData, githubRepoSearch, githubSort, githubFilterVisibility]);

  const gitlabRepoList = useMemo(() => {
    if (!gitlabReposData?.repos) return [];

    let filtered = [...gitlabReposData.repos];

    // Filter by search query
    if (gitlabRepoSearch.trim()) {
      const q = gitlabRepoSearch.toLowerCase();
      filtered = filtered.filter(r => r.fullName.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
    }

    // Filter by visibility
    if (gitlabFilterVisibility !== 'all') {
      const isPrivate = gitlabFilterVisibility === 'private';
      filtered = filtered.filter(r => r.private === isPrivate);
    }

    // Sort
    filtered.sort((a, b) => {
      if (gitlabSort === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (gitlabSort === 'created_date') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // newest first
      }
      // default: recently_used (updated_at)
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA; // recently updated first
    });

    return filtered;
  }, [gitlabReposData, gitlabRepoSearch, gitlabSort, gitlabFilterVisibility]);

  // Handle setting initial checked repos on data load
  useEffect(() => {
    if (integrationsData?.integrations) {
      if (integrationsData.integrations.github?.linkedRepos) {
        setGithubSelectedRepos(integrationsData.integrations.github.linkedRepos);
      }
      if (integrationsData.integrations.gitlab?.linkedRepos) {
        setGitlabSelectedRepos(integrationsData.integrations.gitlab.linkedRepos);
      }
    }
  }, [integrationsData]);

  // Auto-save github linked repos with debounce
  const [githubAutoSaving, setGithubAutoSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const githubAutoSaveRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isGithubReposDialogOpen || !workspace?._id) return;
    // Skip on initial load — only fire when user actually changes selection
    if (githubAutoSaveRef.current) clearTimeout(githubAutoSaveRef.current);
    setGithubAutoSaving('saving');
    githubAutoSaveRef.current = setTimeout(async () => {
      try {
        await linkPlatformRepos({ workspaceId: workspace._id, platform: 'github', repos: githubSelectedRepos }).unwrap();
        refetchIntegrations();
        setGithubAutoSaving('saved');
        setTimeout(() => setGithubAutoSaving('idle'), 2000);
      } catch {
        setGithubAutoSaving('idle');
      }
    }, 800);
    return () => { if (githubAutoSaveRef.current) clearTimeout(githubAutoSaveRef.current); };
  }, [githubSelectedRepos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for popup window message redirecting on callback success
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        const platform = event.data.platform;
        toast.success(`Connected to ${platform} successfully!`);
        refetchIntegrations();
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [refetchIntegrations]);

  // Members & Invites State
  const [members, setMembers] = useState<MemberType[]>([]);
  const [invitations, setInvitations] = useState<InvitationType[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'GUEST'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // General Settings inputs
  const [wsName, setWsName] = useState('');
  const [wsType, setWsType] = useState('Team');
  const [wsTeamSize, setWsTeamSize] = useState('2–10');
  const [wsIndustry, setWsIndustry] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Search & Filters in directory
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // MOCK Billing Tier State
  const [billingTier, setBillingTier] = useState<'free' | 'pro' | 'enterprise'>('pro');

  // SSO & MFA states
  const [ssoEnabled, setSsoEnabled] = useState(workspace?.ssoEnabled || false);
  const [mfaEnforced, setMfaEnforced] = useState(workspace?.mfaEnforced || false);

  useEffect(() => {
    if (workspace) {
      setSsoEnabled(workspace.ssoEnabled || false);
      setMfaEnforced(workspace.mfaEnforced || false);
    }
  }, [workspace]);

  const handleToggleSSO = async () => {
    if (!workspace) return;
    const newVal = !ssoEnabled;
    setSsoEnabled(newVal);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ssoEnabled: newVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update SSO status');
      onWorkspaceUpdated(data.workspace);
    } catch (err: any) {
      toast.error(err.message);
      setSsoEnabled(!newVal); // Revert
    }
  };

  const handleToggleMFA = async () => {
    if (!workspace) return;
    const newVal = !mfaEnforced;
    setMfaEnforced(newVal);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mfaEnforced: newVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update MFA status');
      onWorkspaceUpdated(data.workspace);
    } catch (err: any) {
      toast.error(err.message);
      setMfaEnforced(!newVal); // Revert
    }
  };

  // Connect activities log query
  const { data: activityResponse, isLoading: loadingActivity } = useGetWorkspaceActivityQuery(
    { workspaceId: workspace?._id || '', limit: 15 },
    { skip: !workspace?._id }
  );

  useEffect(() => {
    if (workspace) {
      setWsName(workspace.name);
      setWsType(workspace.type);
      setWsTeamSize(workspace.teamSize || '2–10');
      setWsIndustry(workspace.industry || '');
      setWsDesc(workspace.description || '');
      fetchMembersAndInvites();
    }
  }, [workspace]);

  const fetchMembersAndInvites = async () => {
    if (!workspace) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch workspace members');
      const data = await res.json();
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send invitation');
      setInviteSuccess(data.message || 'Collaborator invited successfully!');
      setInviteEmail('');
      fetchMembersAndInvites();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!workspace) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
      fetchMembersAndInvites();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!workspace) return;
    const ok = await confirm({
      title: "Remove Member",
      description: `Are you sure you want to remove ${memberEmail} from this workspace?`,
      confirmText: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
      fetchMembersAndInvites();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!workspace) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
      fetchMembersAndInvites();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setUpdatingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: wsName, type: wsType, teamSize: wsTeamSize, industry: wsIndustry, description: wsDesc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onWorkspaceUpdated(data.workspace);
      toast.success('Workspace configurations updated successfully!');
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdatingSettings(false); }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace) return;
    const confirmName = await confirm({
      title: "Delete Workspace",
      description: `Type "${workspace.name}" to confirm permanent deletion of this workspace:`,
      confirmText: "Delete Permanently",
      variant: "destructive",
      isPrompt: true,
      promptPlaceholder: workspace.name,
    });
    if (confirmName !== workspace.name) { toast.error('Name mismatch. Deletion cancelled.'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspace._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
      onWorkspaceDeleted(workspace._id);
    } catch (err: any) { toast.error(err.message); }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = member.userId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.userId.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/40">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center mx-auto">
            <LayoutGrid className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Select a workspace to view profile details</p>
        </div>
      </div>
    );
  }

  const userRole = workspace.role || 'GUEST';
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';
  const isPrivileged = isOwner || isAdmin;
  const initials = workspace.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const RoleIcon = roleConfig[userRole]?.icon || Eye;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/80 transition-colors">

      {/* ── Settings Left Navigation Sidebar ── */}
      <aside className={`w-full md:w-64 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200/60 dark:border-zinc-800/80 overflow-y-auto ${showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>
        {/* Workspace Card Header Identity */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-600 flex items-center justify-center text-white text-base font-black shadow-md shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-sm truncate leading-snug">{workspace.name}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{workspace.type} Workspace</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${roleConfig[userRole]?.bg} ${roleConfig[userRole]?.border}`}>
            <RoleIcon className={`h-4 w-4 ${roleConfig[userRole]?.color}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${roleConfig[userRole]?.color}`}>
              {roleConfig[userRole]?.label} Access
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3.5 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid, desc: 'Health & KPI stats' },
            { id: 'general', label: 'General Configurations', icon: Settings, desc: 'Workspace details & info' },
            { id: 'members', label: 'Members & Roles', icon: Users, desc: 'Manage access levels' },
            { id: 'billing', label: 'Billing & Plans', icon: DollarSign, desc: 'Subscription details' },
            { id: 'security', label: 'Security & SSO', icon: Lock, desc: 'Audits and authentication' },
            { id: 'integrations', label: 'Integrations', icon: Globe, desc: 'GitHub & GitLab connections' }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as NavSection);
                  setShowSidebarOnMobile(false);
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all group cursor-pointer ${isActive
                    ? 'bg-indigo-550/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-none">{item.label}</p>
                  <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-1 leading-none">{item.desc}</p>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto text-indigo-600/80 dark:text-indigo-400/80" />}
              </button>
            );
          })}
        </nav>

        {/* Workspace metadata footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/30 text-[10px] font-bold text-zinc-400 space-y-1.5">
          {workspace.industry && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-350" />
              <span>{workspace.industry}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-350" />
            <span>Created {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}</span>
          </div>
        </div>
      </aside>

      {/* ── Main Workspace Profile Dashboard Display Content ── */}
      <main className={`flex-1 overflow-y-auto ${showSidebarOnMobile ? 'hidden md:block' : 'block'}`}>
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          <button
            className="md:hidden flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-2 cursor-pointer"
            onClick={() => setShowSidebarOnMobile(true)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings Menu
          </button>

          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-150 tracking-tight capitalize">
                {activeSection === 'general' ? 'General Settings' : activeSection}
              </h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                Configure and analyze metrics for {workspace.name} Workspace
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-650 dark:text-zinc-350 font-bold text-[10px] px-2.5 py-1">
                {boards.length} Boards
              </Badge>
              <Badge className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] px-2.5 py-1">
                {members.length} Members
              </Badge>
            </div>
          </div>

          {/* ── OVERVIEW TAB (WORKSPACE HEALTH KPI DASHBOARD) ── */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Monday.com style KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Active Members', value: members.length, text: '+2 this month', icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
                  { label: 'Project Boards', value: boards.length, text: 'Active projects', icon: LayoutGrid, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
                  { label: 'Productivity Index', value: '94%', text: 'Excellent score', icon: Sparkles, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
                  { label: 'Activity Rate', value: '88/100', text: 'Highly collaborative', icon: Activity, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
                ].map((kpi, idx) => {
                  const KpiIcon = kpi.icon;
                  return (
                    <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{kpi.value}</p>
                        <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 leading-none pt-1">{kpi.text}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                        <KpiIcon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Boards Directory list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">Active Project Boards</CardTitle>
                    <CardDescription className="text-xs">Quick index list of all columns boards</CardDescription>
                  </CardHeader>
                  <CardContent className="py-5">
                    {boards.length === 0 ? (
                      <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 italic text-xs">No active boards found.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {boards.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => onSelectBoard(b._id)}
                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-7 rounded-full bg-indigo-500" />
                              <div>
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{b.name}</p>
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold">{b.columns?.length || 0} Columns • Created {new Date(b.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-wider">{b.visibility}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Workspace Activity feed */}
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                      <Activity className="h-4.5 w-4.5 text-indigo-500" />
                      Workspace Changes log
                    </CardTitle>
                    <CardDescription className="text-xs">Real-time audit history of items and members updates</CardDescription>
                  </CardHeader>
                  <CardContent className="py-5">
                    {loadingActivity ? (
                      <div className="flex items-center justify-center py-6 text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-xs font-semibold">Loading feed...</span>
                      </div>
                    ) : !activityResponse?.activities || activityResponse.activities.length === 0 ? (
                      <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 italic text-xs">No updates recorded in this workspace.</div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {activityResponse.activities.slice(0, 8).map((act) => {
                          const actionDesc = act.actionType.toLowerCase().replace(/_/g, ' ');
                          const timeStr = new Date(act.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={act._id} className="flex gap-3 text-xs items-start border-b border-zinc-100/50 dark:border-zinc-800/40 pb-2.5 last:border-0 last:pb-0">
                              <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[9px] text-zinc-650 dark:text-zinc-350 shrink-0">
                                {act.actorId?.name?.slice(0, 2).toUpperCase() || 'US'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{act.actorId?.name || 'Someone'}</span>
                                  {` ${actionDesc} `}
                                  {act.metadata?.taskKey && (
                                    act.taskId ? (
                                      <Link
                                        to={`/item/${act.taskId}`}
                                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline decoration-indigo-300 dark:decoration-indigo-700 decoration-1 underline-offset-2 hover:decoration-indigo-500"
                                      >
                                        {act.metadata.taskKey}
                                      </Link>
                                    ) : (
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{act.metadata.taskKey}</span>
                                    )
                                  )}
                                </p>
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">{timeStr} • {new Date(act.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── GENERAL CONFIGURATION SETTINGS ── */}
          {activeSection === 'general' && (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">General configurations</CardTitle>
                <CardDescription className="text-xs">Update workspace name, industry focus, and description settings</CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveSettings}>
                <CardContent className="py-6 space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-input-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Workspace Name</Label>
                    <Input
                      id="ws-input-name"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      disabled={!isPrivileged}
                      className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-xs focus-visible:ring-indigo-500 focus-visible:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ws-input-desc" className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Workspace Description</Label>
                    <textarea
                      id="ws-input-desc"
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      disabled={!isPrivileged}
                      rows={3}
                      placeholder="Add a workspace description..."
                      className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-xs focus-visible:ring-indigo-500 focus-visible:bg-white focus:outline-hidden focus:ring-1 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Workspace Type</Label>
                      <Select value={wsType} onValueChange={setWsType} disabled={!isPrivileged}>
                        <SelectTrigger className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personal">Personal</SelectItem>
                          <SelectItem value="Team">Team</SelectItem>
                          <SelectItem value="Company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Workspace Team Size</Label>
                      <Select value={wsTeamSize} onValueChange={setWsTeamSize} disabled={!isPrivileged}>
                        <SelectTrigger className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Just me">Just me</SelectItem>
                          <SelectItem value="2–10">2–10</SelectItem>
                          <SelectItem value="11–50">11–50</SelectItem>
                          <SelectItem value="50+">50+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ws-input-ind" className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Industry Vertical</Label>
                    <Input
                      id="ws-input-ind"
                      value={wsIndustry}
                      onChange={(e) => setWsIndustry(e.target.value)}
                      disabled={!isPrivileged}
                      className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-xs focus-visible:ring-indigo-500 focus-visible:bg-white"
                    />
                  </div>
                </CardContent>
                {isPrivileged && (
                  <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/80 justify-end py-4">
                    <Button
                      type="submit"
                      disabled={updatingSettings}
                      className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {updatingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </form>
            </Card>
          )}

          {/* ── MEMBERS AND ACCESS CONTROL TAB ── */}
          {activeSection === 'members' && (
            <div className="space-y-6">

              {/* Invite Form Card */}
              {isPrivileged && (
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                      <Send className="h-4.5 w-4.5 text-indigo-500" />
                      Invite collaborators
                    </CardTitle>
                    <CardDescription className="text-xs">Invite colleagues to access this workspace and projects boards</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleInvite}>
                    <CardContent className="py-5">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs focus-visible:ring-indigo-500 focus-visible:bg-white"
                          required
                        />
                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                          <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="GUEST">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="submit"
                          disabled={inviting}
                          className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invitation'}
                        </Button>
                      </div>

                      {inviteError && (
                        <p className="text-xs font-semibold text-red-500 mt-3 flex items-center gap-1.5">
                          <X className="h-3.5 w-3.5" /> {inviteError}
                        </p>
                      )}
                      {inviteSuccess && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1">
                          ✓ {inviteSuccess}
                        </p>
                      )}
                    </CardContent>
                  </form>
                </Card>
              )}

              {/* Members Table */}
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                      <Users className="h-4.5 w-4.5 text-indigo-500" />
                      Workspace Directory
                    </CardTitle>
                    <CardDescription className="text-xs">Manage active users and roles access permissions</CardDescription>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full">
                    {members.length} total users
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Search and Filters panel */}
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/30 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        placeholder="Search by name or email address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 pl-9 pr-4 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-900 focus-visible:ring-indigo-550"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-zinc-400 shrink-0" />
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[120px] h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-900">
                          <SelectValue placeholder="Role Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Roles</SelectItem>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="GUEST">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-12 text-zinc-400">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm font-medium">Loading user index...</span>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 italic text-xs">No workspace members found matching parameters.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {filteredMembers.map((member) => {
                        const isTargetOwner = member.role === 'OWNER';
                        const canEdit = isPrivileged && !isTargetOwner;
                        const MemberRoleIcon = roleConfig[member.role]?.icon || Eye;

                        return (
                          <div key={member._id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-zinc-800 dark:to-zinc-800 flex items-center justify-center text-xs font-black text-indigo-700 dark:text-zinc-300 uppercase shrink-0 border border-indigo-200/20 dark:border-zinc-700/20">
                                {member.userId?.name?.slice(0, 2).toUpperCase() || 'US'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200 truncate leading-snug">{member.userId.name}</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate leading-none mt-1">{member.userId.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {canEdit ? (
                                <Select value={member.role} onValueChange={(v) => handleRoleChange(member._id, v)}>
                                  <SelectTrigger className="w-[110px] h-8.5 rounded-lg border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-900">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isOwner && <SelectItem value="ADMIN">Admin</SelectItem>}
                                    <SelectItem value="MEMBER">Member</SelectItem>
                                    <SelectItem value="GUEST">Guest</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${roleConfig[member.role]?.bg} ${roleConfig[member.role]?.border} ${roleConfig[member.role]?.color}`}>
                                  <MemberRoleIcon className="h-3 w-3" />
                                  {roleConfig[member.role]?.label}
                                </div>
                              )}

                              {isPrivileged && canEdit && (
                                <button
                                  onClick={() => handleRemoveMember(member._id, member.userId.email)}
                                  className="w-8.5 h-8.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200/10 transition-colors cursor-pointer"
                                  title="Remove collaborator"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Invitations list */}
              {invitations.length > 0 && (
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs overflow-hidden">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">Pending email invitations</CardTitle>
                    <CardDescription className="text-xs">Review pending requests and invitations status</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {invitations.map((invite) => (
                        <div key={invite._id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/30">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/40 dark:border-amber-900/30 flex items-center justify-center">
                              <Mail className="h-4.5 w-4.5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{invite.email}</p>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
                                Invited by {invite.invitedBy?.name || 'Admin'} · Role {invite.role}
                              </p>
                            </div>
                          </div>
                          {isPrivileged && (
                            <button
                              onClick={() => handleCancelInvite(invite._id)}
                              className="w-8.5 h-8.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200/15 transition-colors cursor-pointer"
                              title="Revoke invitation"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'billing' && (
            <div className="relative">
              {/* Premium Glassmorphic Blur Overlay */}
              <div className="absolute inset-0 bg-white/40 dark:bg-zinc-950/45 backdrop-blur-[6px] z-10 flex items-center justify-center p-6 rounded-2xl">
                <Card className="max-w-md w-full border border-zinc-200/80 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-4 border border-indigo-150 dark:border-indigo-900/30">
                    <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <CardTitle className="text-lg font-black text-zinc-900 dark:text-zinc-150">Subscription Billing Portal</CardTitle>
                  <CardDescription className="text-xs mt-2 leading-relaxed text-zinc-400 dark:text-zinc-500 font-sans">
                    Subscription plans, invoices, and billing methods are locked. Upgrade requests can be processed via Stripe.
                  </CardDescription>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button className="h-10 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs">
                      Configure via Stripe
                    </Button>
                    <Button variant="outline" className="h-10 px-5 rounded-xl text-xs font-bold border-zinc-200 cursor-pointer">
                      Contact Administrator
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Blurred Billing Details */}
              <div className="space-y-6 select-none pointer-events-none opacity-40">
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">Active Subscription plan</CardTitle>
                    <CardDescription className="text-xs">Manage workspace seats plan tiers and payment settings</CardDescription>
                  </CardHeader>
                  <CardContent className="py-6 space-y-6">
                    {/* Current plan card */}
                    <div className="p-5 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Plan Active</p>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 capitalize">{billingTier} Enterprise Developer</h3>
                        <p className="text-xs text-zinc-400 dark:text-zinc-400 leading-snug">
                          Collaborative dashboard for up to {wsTeamSize} users. Charged monthly.
                        </p>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                          {billingTier === 'free' ? '$0' : billingTier === 'pro' ? `$${members.length * 15}` : `$${members.length * 29}`}
                          <span className="text-xs font-bold text-zinc-400">/mo</span>
                        </p>
                        <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/35 text-[9px] font-bold uppercase">Active Tier</Badge>
                      </div>
                    </div>

                    {/* Plan Grid */}
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-4">Select Plan Tier</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'free', name: 'Starter Free', price: '$0', desc: 'Core boards and up to 3 collaborators.' },
                          { key: 'pro', name: 'Business Pro', price: '$15', desc: 'Unlimited boards, milestones logs, and custom roles.' },
                          { key: 'enterprise', name: 'Enterprise Power', price: '$29', desc: 'Includes SSO audits, advanced stats dashboard, and high priority APIs.' }
                        ].map((plan) => (
                          <div
                            key={plan.key}
                            onClick={() => setBillingTier(plan.key as any)}
                            className={`p-4 border rounded-2xl cursor-pointer hover:shadow-2xs transition-all ${billingTier === plan.key
                                ? 'border-indigo-600 dark:border-indigo-455 bg-indigo-50/10 dark:bg-indigo-950/20'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">{plan.name}</span>
                              {billingTier === plan.key && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                            </div>
                            <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-3">{plan.price}<span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">/seat/mo</span></p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal mt-2.5">{plan.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice Lists */}
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">Receipt invoices history</CardTitle>
                    <CardDescription className="text-xs">Download payment statements and statement audits</CardDescription>
                  </CardHeader>
                  <CardContent className="py-5 space-y-3">
                    {[
                      { date: 'Jun 15, 2026', inv: 'INV-02941', amount: '$75.00', status: 'Paid' },
                      { date: 'May 15, 2026', inv: 'INV-01824', amount: '$75.00', status: 'Paid' },
                    ].map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/40 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{invoice.inv}</p>
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold">{invoice.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-200">{invoice.amount}</span>
                          <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/35 text-[9px] font-bold">{invoice.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── SECURITY AND DANGER ZONE TAB ── */}
          {activeSection === 'security' && (
            <div className="space-y-6">

              {/* Security parameters */}
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-200">Authentication Policies</CardTitle>
                  <CardDescription className="text-xs">Manage identity credentials and multi-factor logins</CardDescription>
                </CardHeader>
                <CardContent className="py-5 space-y-4">
                  {/* SSO POLICY */}
                  <div className="flex items-center justify-between gap-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-sans">Single Sign-On (SSO)</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-md">Enforce Microsoft Active Directory or Google Workspace credentials at portal login.</p>
                    </div>
                    <button
                      onClick={handleToggleSSO}
                      disabled={!isPrivileged}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${ssoEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'
                        } ${!isPrivileged ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${ssoEnabled ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  {/* MFA POLICY */}
                  <div className="flex items-center justify-between gap-6">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-sans">Enforce Multi-Factor Login</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-md">Require all members in this workspace to configure 2FA tokens.</p>
                    </div>
                    <button
                      onClick={handleToggleMFA}
                      disabled={!isPrivileged}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${mfaEnforced ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'
                        } ${!isPrivileged ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${mfaEnforced ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              {isOwner && (
                <Card className="border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden shadow-2xs">
                  <CardHeader className="bg-red-50/50 dark:bg-red-950/20 border-b border-red-105 dark:border-red-900/30 py-4 flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
                    <CardTitle className="text-sm font-black text-red-800 dark:text-red-400 leading-none">Workspace Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="bg-white dark:bg-zinc-900 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1 max-w-md">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Permanently delete this workspace</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                        All board milestones, tasks lists, comments directories, and invitations will be erased permanently. This actions cannot be undone.
                      </p>
                    </div>
                    <Button
                      onClick={handleDeleteWorkspace}
                      variant="destructive"
                      className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shrink-0 border-0 cursor-pointer"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Workspace
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── INTEGRATIONS TAB ── */}
          {activeSection === 'integrations' && (
            <div className="space-y-5 animate-in fade-in duration-300">

              {/* Header */}
              <div className="space-y-1 pb-1">
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Developer Integrations</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Connect your source control platforms to link branches, commits, and pull requests directly inside issues.</p>
              </div>

              {/* Integration Cards – stacked full-width for premium feel */}
              <div className="space-y-4">

                {/* ── GITHUB CARD ── */}
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  githubConnected
                    ? 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-900/5 dark:shadow-black/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                }`}>
                  {/* Top gradient strip */}
                  <div className={`h-0.5 w-full ${githubConnected ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' : 'bg-gradient-to-r from-zinc-300 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800'}`} />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Icon + Text */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          githubConnected
                            ? 'bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700'
                            : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                        }`}>
                          <Github className={`h-6 w-6 ${githubConnected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">GitHub</span>
                            {githubConnected && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                integrationsData?.integrations?.github?.enabled
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${integrationsData?.integrations?.github?.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                {integrationsData?.integrations?.github?.enabled ? 'Active' : 'Paused'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-none">
                            {githubConnected
                              ? `Connected as @${integrationsData?.integrations?.github?.username}`
                              : 'Link repositories, track commits & pull requests'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {githubConnected && (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle */}
                          <button
                            onClick={async () => {
                              const newVal = !integrationsData.integrations.github.enabled;
                              try {
                                await toggleIntegration({ workspaceId: workspace._id, platform: 'github', enabled: newVal }).unwrap();
                                toast.success(`GitHub integration ${newVal ? 'enabled' : 'disabled'}`);
                                refetchIntegrations();
                              } catch (err: any) {
                                toast.error(err.message);
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              integrationsData.integrations.github.enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                              integrationsData.integrations.github.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                          {/* Disconnect */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (window.confirm('Disconnect GitHub integration?')) {
                                try {
                                  await disconnectPlatform({ workspaceId: workspace._id, platform: 'github' }).unwrap();
                                  toast.success('Disconnected GitHub');
                                  refetchIntegrations();
                                } catch (err: any) { toast.error(err.message); }
                              }
                            }}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Connected state body */}
                    {githubConnected ? (
                      <div className="mt-5 space-y-4">
                        {/* Avatar + stats row */}
                        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/60">
                          <img
                            src={integrationsData.integrations.github.avatarUrl || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"}
                            alt="GitHub Avatar"
                            className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              <a href={integrationsData.integrations.github.profileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                @{integrationsData.integrations.github.username}
                              </a>
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-semibold">
                              {integrationsData.integrations.github.linkedRepos.length === 0
                                ? 'No repositories linked yet'
                                : `${integrationsData.integrations.github.linkedRepos.length} repositor${integrationsData.integrations.github.linkedRepos.length === 1 ? 'y' : 'ies'} linked`}
                            </div>
                          </div>
                          {/* Linked repo pills */}
                          {integrationsData.integrations.github.linkedRepos.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[160px]">
                              {integrationsData.integrations.github.linkedRepos.slice(0, 2).map((r: string) => (
                                <span key={r} className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-700 truncate max-w-[100px]">
                                  {r.split('/').pop()}
                                </span>
                              ))}
                              {integrationsData.integrations.github.linkedRepos.length > 2 && (
                                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">+{integrationsData.integrations.github.linkedRepos.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* View repos CTA */}
                        <Button
                          onClick={() => {
                            setGithubRepoSearch('');
                            setGithubSelectedRepos(integrationsData?.integrations?.github?.linkedRepos || []);
                            setIsGithubReposDialogOpen(true);
                          }}
                          className="w-full h-10 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white border-0 shadow-sm transition-all duration-150"
                        >
                          <Folder className="h-4 w-4" />
                          Manage Linked Repositories
                          <span className="ml-auto text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full">{integrationsData.integrations.github.linkedRepos.length}</span>
                        </Button>
                      </div>
                    ) : (
                      /* Not connected state */
                      <div className="mt-5 space-y-4">
                        {/* Feature highlights */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { icon: GitBranch, label: 'Branch creation', desc: 'from issues' },
                            { icon: Clock, label: 'Commit history', desc: 'per task' },
                            { icon: ArrowUpDown, label: 'Pull requests', desc: 'status tracking' },
                          ].map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/60 text-center">
                              <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 mx-auto" />
                              <div className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 leading-tight">{label}</div>
                              <div className="text-[9px] text-zinc-400 dark:text-zinc-500">{desc}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2.5">
                          <Button
                            onClick={async () => {
                              try {
                                const res = await authorizePlatform({ workspaceId: workspace._id, platform: 'github' }).unwrap();
                                if (res.authUrl) {
                                  const width = 600, height = 650;
                                  const left = window.screenX + (window.innerWidth - width) / 2;
                                  const top = window.screenY + (window.innerHeight - height) / 2;
                                  window.open(res.authUrl, 'oauth', `width=${width},height=${height},left=${left},top=${top}`);
                                }
                              } catch (err: any) { toast.error('Failed to authorize: ' + err.message); }
                            }}
                            className="flex-1 h-10 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer border-0 shadow-sm"
                          >
                            <Github className="h-4 w-4" />
                            Authorize with GitHub
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await simulateConnect({ workspaceId: workspace._id, platform: 'github' }).unwrap();
                                toast.success('Simulated GitHub connection active!');
                                refetchIntegrations();
                              } catch (err: any) { toast.error(err.message); }
                            }}
                            className="h-10 px-4 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            Demo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                  {/* Repository Management Dialog — Premium Redesign */}
                  <Dialog open={isGithubReposDialogOpen} onOpenChange={setIsGithubReposDialogOpen}>
                    <DialogContent className="!w-[96vw] !max-w-[96vw] h-[88vh] max-h-[88vh] p-0 gap-0 border-0 bg-transparent rounded-2xl shadow-none z-50 overflow-hidden">
                      <div className="flex h-full w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-background">

                        {/* ── LEFT SIDEBAR ── */}
                        <div className="w-72 shrink-0 flex flex-col border-r border-border bg-card">
                          {/* Sidebar Header */}
                          <div className="px-5 pt-5 pb-4 border-b border-border">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                <Github className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <DialogTitle className="text-[13px] font-black text-foreground leading-none">GitHub</DialogTitle>
                                <DialogDescription className="text-[10px] text-zinc-500 mt-0.5 leading-none">Repository Manager</DialogDescription>
                              </div>
                            </div>
                          </div>

                          {/* Linked Repos Section */}
                          <div className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
                            <div className="flex items-center gap-2 px-2 mb-3">
                              <Link2 className="h-3.5 w-3.5 text-primary" />
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Linked Repos</span>
                              <span className="ml-auto text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full">{githubSelectedRepos.length}</span>
                            </div>
                            {githubSelectedRepos.length === 0 ? (
                              <div className="mx-2 px-3 py-4 rounded-xl border border-dashed border-border text-center">
                                <p className="text-[10px] text-muted-foreground">No repos linked yet</p>
                                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Select from the right →</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {githubSelectedRepos.map((repoName) => (
                                  <div
                                    key={repoName}
                                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/8 border border-primary/15 hover:border-primary/30 transition-all duration-150 cursor-default"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                      <Folder className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-foreground/80 truncate flex-1 leading-tight">{repoName.split('/').pop()}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setGithubSelectedRepos(prev => prev.filter(r => r !== repoName)); }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-destructive/80 flex items-center justify-center shrink-0"
                                    >
                                      <X className="h-2.5 w-2.5 text-white" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Divider */}
                            <div className="mt-5 mb-4 border-t border-border" />

                            {/* Filter Options in Sidebar */}
                            <div className="flex items-center gap-2 px-2 mb-2">
                              <Filter className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Visibility</span>
                            </div>
                            <div className="space-y-0.5 px-1">
                              {(['all', 'public', 'private'] as const).map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setGithubFilterVisibility(v)}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-150 ${
                                    githubFilterVisibility === v
                                      ? 'bg-accent text-foreground border border-border'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    v === 'all' ? 'bg-zinc-400' : v === 'public' ? 'bg-emerald-400' : 'bg-amber-400'
                                  }`} />
                                  <span className="capitalize">{v}</span>
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 mb-2">
                              <div className="flex items-center gap-2 px-2 mb-2">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sort By</span>
                              </div>
                              <div className="space-y-0.5 px-1">
                                {([['recently_used', 'Recently Updated'], ['created_date', 'Created Date'], ['name', 'Name A–Z']] as const).map(([val, label]) => (
                                  <button
                                    key={val}
                                    onClick={() => setGithubSort(val)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-150 ${
                                      githubSort === val
                                        ? 'bg-white/8 text-white border border-white/10'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/4'
                                    }`}
                                  >
                                    {githubSort === val && <Check className="h-3 w-3 text-primary shrink-0" />}
                                    {githubSort !== val && <span className="w-3 shrink-0" />}
                                    <span>{label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Sidebar Footer — Auto-save status */}
                          <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">Changes saved automatically</span>
                            <div className={`flex items-center gap-1.5 text-[10px] font-semibold transition-all duration-300 ${
                              githubAutoSaving === 'saving' ? 'text-primary' :
                              githubAutoSaving === 'saved' ? 'text-emerald-500 dark:text-emerald-400' :
                              'text-muted-foreground/40'
                            }`}>
                              {githubAutoSaving === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {githubAutoSaving === 'saved' && <Check className="h-3 w-3" />}
                              {githubAutoSaving === 'saving' ? 'Saving…' : githubAutoSaving === 'saved' ? 'Saved' : 'Auto-save'}
                            </div>
                          </div>
                        </div>

                        {/* ── RIGHT MAIN PANEL ── */}
                        <div className="flex-1 flex flex-col min-w-0 bg-background">
                          {/* Top Navbar: Search + Quick Filters */}
                          <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search repositories by name or description..."
                                value={githubRepoSearch}
                                onChange={(e) => setGithubRepoSearch(e.target.value)}
                                className="w-full h-9 pl-9 pr-4 rounded-xl bg-muted border border-input text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                              />
                              {githubRepoSearch && (
                                <button
                                  onClick={() => setGithubRepoSearch('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            {/* Quick filter pills */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {(['all', 'public', 'private'] as const).map(v => (
                                <button
                                  key={v}
                                  onClick={() => setGithubFilterVisibility(v)}
                                  className={`h-8 px-3 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                                    githubFilterVisibility === v
                                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
                                  }`}
                                >
                                  {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                              ))}
                            </div>
                            {/* Repo count badge */}
                            <div className="shrink-0 text-[11px] font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
                              {githubRepoList.length} repo{githubRepoList.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Repo Cards Grid */}
                          <div className="flex-1 overflow-y-auto px-5 py-4">
                            {loadingGithubRepos ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                  <div key={idx} className="p-5 border border-zinc-800/60 rounded-2xl space-y-3 bg-white/2 animate-pulse">
                                    <div className="flex items-center justify-between">
                                      <Skeleton className="h-4 w-32 bg-zinc-800" />
                                      <Skeleton className="h-5 w-14 rounded-full bg-zinc-800" />
                                    </div>
                                    <Skeleton className="h-3 w-48 bg-zinc-800" />
                                    <div className="flex items-center gap-4">
                                      <Skeleton className="h-3 w-16 bg-zinc-800" />
                                      <Skeleton className="h-3 w-16 bg-zinc-800" />
                                      <Skeleton className="h-3 w-16 bg-zinc-800" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : githubRepoList.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-5">
                                  <Folder className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-bold text-muted-foreground">No repositories found</p>
                                <p className="text-xs text-muted-foreground/60 mt-1.5">Try adjusting your search or filters</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {githubRepoList.map((repo) => {
                                  const isSelected = githubSelectedRepos.includes(repo.fullName);
                                  const getLangColor = (lang: string) => {
                                    if (!lang) return '#71717a';
                                    const colors: Record<string, string> = {
                                      javascript: '#f59e0b', typescript: '#3b82f6',
                                      go: '#06b6d4', python: '#2563eb',
                                      html: '#f97316', css: '#a855f7',
                                      rust: '#ea580c', java: '#ef4444', shell: '#22c55e',
                                      ruby: '#f43f5e', 'c#': '#6366f1', swift: '#f97316',
                                      kotlin: '#8b5cf6', dart: '#06b6d4',
                                    };
                                    return colors[lang.toLowerCase()] || '#71717a';
                                  };
                                  // Simulate realistic GitHub stats from repo data
                                  const starsCount = repo.starsCount ?? repo.stargazersCount ?? Math.floor(Math.random() * 500);
                                  const forksCount = repo.forksCount ?? Math.floor(starsCount * 0.3);
                                  const branchesCount = repo.branchesCount ?? Math.max(1, Math.floor(Math.random() * 8) + 1);
                                  const commitsCount = repo.commitsCount ?? Math.floor(Math.random() * 300) + 10;
                                  const openIssues = repo.openIssues ?? repo.openIssuesCount ?? Math.floor(Math.random() * 20);
                                  const repoUrl = repo.htmlUrl ?? `https://github.com/${repo.fullName}`;
                                  return (
                                    <div
                                      key={repo.id}
                                      onClick={() => {
                                        setGithubSelectedRepos(prev =>
                                          isSelected ? prev.filter(r => r !== repo.fullName) : [...prev, repo.fullName]
                                        );
                                      }}
                                      className={`group relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                                        isSelected
                                          ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/30'
                                          : 'border-border bg-card hover:border-border/80 hover:bg-accent/30'
                                      }`}
                                    >
                                      {/* Gradient top accent */}
                                      {isSelected && (
                                        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary/70 to-primary" />
                                      )}

                                      <div className="p-4 flex flex-col gap-3 flex-1">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                              <Github className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                              <span className="text-[10px] text-muted-foreground font-medium truncate">{repo.fullName.split('/')[0]}/</span>
                                            </div>
                                            <h4 className="text-[13px] font-bold text-foreground truncate leading-tight">
                                              {repo.fullName.split('/').pop()}
                                            </h4>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                              repo.private
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                              {repo.private ? 'Private' : 'Public'}
                                            </span>
                                            {/* External link button */}
                                            <a
                                              href={repoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-6 h-6 rounded-lg bg-muted hover:bg-primary/20 border border-border hover:border-primary/40 flex items-center justify-center transition-all duration-150 group/ext"
                                              title={`Open ${repo.fullName} on GitHub`}
                                            >
                                              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/ext:text-primary transition-colors" />
                                            </a>
                                          </div>
                                        </div>

                                        {/* Description */}
                                        {repo.description ? (
                                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{repo.description}</p>
                                        ) : (
                                          <p className="text-[11px] text-muted-foreground/50 italic">No description provided</p>
                                        )}

                                        {/* Stats row */}
                                        <div className="flex items-center gap-3 pt-2.5 border-t border-border">
                                          {/* Language */}
                                          {repo.language && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getLangColor(repo.language) }} />
                                              <span className="text-[10px] font-semibold text-muted-foreground">{repo.language}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Star className="h-3 w-3" />
                                            <span className="text-[10px] font-semibold">{starsCount > 999 ? `${(starsCount/1000).toFixed(1)}k` : starsCount}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <GitFork className="h-3 w-3" />
                                            <span className="text-[10px] font-semibold">{forksCount}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <GitBranch className="h-3 w-3" />
                                            <span className="text-[10px] font-semibold">{branchesCount}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <GitCommit className="h-3 w-3" />
                                            <span className="text-[10px] font-semibold">{commitsCount}</span>
                                          </div>
                                          {/* Updated at */}
                                          {repo.updatedAt && (
                                            <div className="ml-auto flex items-center gap-1 text-muted-foreground/70">
                                              <Clock className="h-3 w-3" />
                                              <span className="text-[10px]">{timeAgo(repo.updatedAt)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Selected checkmark badge */}
                                      {isSelected && (
                                        <div className="absolute top-3 left-3 w-5 h-5 bg-indigo-600 rounded-full border-2 border-background flex items-center justify-center shadow-lg shadow-primary/40">
                                          <Check className="h-3 w-3 text-white stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                {/* ── GITLAB CARD ── */}
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  gitlabConnected
                    ? 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-900/5 dark:shadow-black/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                }`}>
                  {/* Top gradient strip */}
                  <div className={`h-0.5 w-full ${gitlabConnected ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-400' : 'bg-gradient-to-r from-zinc-300 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800'}`} />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Icon + Text */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          gitlabConnected
                            ? 'bg-orange-550 border border-orange-600/30'
                            : 'bg-orange-50 dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700'
                        }`}>
                          <Gitlab className={`h-6 w-6 ${gitlabConnected ? 'text-white' : 'text-orange-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">GitLab</span>
                            {gitlabConnected && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                integrationsData?.integrations?.gitlab?.enabled
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${integrationsData?.integrations?.gitlab?.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                {integrationsData?.integrations?.gitlab?.enabled ? 'Active' : 'Paused'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-none">
                            {gitlabConnected
                              ? `Connected as @${integrationsData?.integrations?.gitlab?.username}`
                              : 'Link projects, track pipelines & MRs'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {gitlabConnected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              const newVal = !integrationsData.integrations.gitlab.enabled;
                              try {
                                await toggleIntegration({ workspaceId: workspace._id, platform: 'gitlab', enabled: newVal }).unwrap();
                                toast.success(`GitLab integration ${newVal ? 'enabled' : 'disabled'}`);
                                refetchIntegrations();
                              } catch (err: any) { toast.error(err.message); }
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              integrationsData.integrations.gitlab.enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                              integrationsData.integrations.gitlab.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (window.confirm('Disconnect GitLab integration?')) {
                                try {
                                  await disconnectPlatform({ workspaceId: workspace._id, platform: 'gitlab' }).unwrap();
                                  toast.success('Disconnected GitLab');
                                  refetchIntegrations();
                                } catch (err: any) { toast.error(err.message); }
                              }
                            }}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
   </div>
                    {/* Connected state body */}
                    {gitlabConnected ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/60">
                          <img
                            src={integrationsData.integrations.gitlab.avatarUrl || "https://assets.gitlab-static.net/uploads/-/system/user/avatar/2939/avatar.png"}
                            alt="GitLab Avatar"
                            className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              <a href={integrationsData.integrations.gitlab.profileUrl} target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline">
                                @{integrationsData.integrations.gitlab.username}
                              </a>
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-semibold">
                              {integrationsData.integrations.gitlab.linkedRepos.length === 0
                                ? 'No projects linked yet'
                                : `${integrationsData.integrations.gitlab.linkedRepos.length} project${integrationsData.integrations.gitlab.linkedRepos.length === 1 ? '' : 's'} linked`}
                            </div>
                          </div>
                          {integrationsData.integrations.gitlab.linkedRepos.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[160px]">
                              {integrationsData.integrations.gitlab.linkedRepos.slice(0, 2).map((r: string) => (
                                <span key={r} className="text-[9px] font-bold bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-800/30 truncate max-w-[100px]">
                                  {r.split('/').pop()}
                                </span>
                              ))}
                              {integrationsData.integrations.gitlab.linkedRepos.length > 2 && (
                                <span className="text-[9px] font-bold text-zinc-400">+{integrationsData.integrations.gitlab.linkedRepos.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            setGitlabRepoSearch('');
                            setGitlabSelectedRepos(integrationsData?.integrations?.gitlab?.linkedRepos || []);
                            setIsGitlabReposDialogOpen(true);
                          }}
                          className="w-full h-10 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 bg-orange-550 hover:bg-orange-600 text-white border-0 shadow-sm transition-all duration-150"
                        >
                          <Folder className="h-4 w-4" />
                          Manage Linked Projects
                          <span className="ml-auto text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">{integrationsData.integrations.gitlab.linkedRepos.length}</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { icon: GitBranch, label: 'MR tracking', desc: 'merge requests' },
                            { icon: Clock, label: 'Pipelines', desc: 'CI/CD runs' },
                            { icon: ArrowUpDown, label: 'Environments', desc: 'deploy status' },
                          ].map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl bg-orange-50/50 dark:bg-zinc-800/40 border border-orange-100/60 dark:border-zinc-700/60 text-center">
                              <Icon className="h-4 w-4 text-orange-400 mx-auto" />
                              <div className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 leading-tight">{label}</div>
                              <div className="text-[9px] text-zinc-400 dark:text-zinc-500">{desc}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2.5">
                          <Button
                            onClick={async () => {
                              try {
                                const res = await authorizePlatform({ workspaceId: workspace._id, platform: 'gitlab' }).unwrap();
                                if (res.authUrl) {
                                  const width = 600, height = 650;
                                  const left = window.screenX + (window.innerWidth - width) / 2;
                                  const top = window.screenY + (window.innerHeight - height) / 2;
                                  window.open(res.authUrl, 'oauth', `width=${width},height=${height},left=${left},top=${top}`);
                                }
                              } catch (err: any) { toast.error('Failed to authorize: ' + err.message); }
                            }}
                            className="flex-1 h-10 bg-orange-550 hover:bg-orange-600 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer border-0 shadow-sm"
                          >
                            <Gitlab className="h-4 w-4" />
                            Authorize with GitLab
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await simulateConnect({ workspaceId: workspace._id, platform: 'gitlab' }).unwrap();
                                toast.success('Simulated GitLab connection active!');
                                refetchIntegrations();
                              } catch (err: any) { toast.error(err.message); }
                            }}
                            className="h-10 px-4 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            Demo
                          </Button>
                                {/* GitLab Repository Management Dialog */}
                  <Dialog open={isGitlabReposDialogOpen} onOpenChange={setIsGitlabReposDialogOpen}>
                    <DialogContent className="max-w-5xl w-full h-[90vh] max-h-[90vh] p-0 gap-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-550 flex items-center justify-center border border-orange-600/20">
                            <Gitlab className="h-4.5 w-4.5 text-white" />
                          </div>
                          <div>
                            <DialogTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100 leading-none">Manage Linked Projects</DialogTitle>
                            <DialogDescription className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-none">
                              {gitlabSelectedRepos.length > 0 ? `${gitlabSelectedRepos.length} selected` : 'Click to select projects'}
                            </DialogDescription>
                          </div>
                        </div>
                        <div className="h-0.5 hidden" />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 px-6 pt-4 pb-3 shrink-0 border-b border-zinc-100/60 dark:border-zinc-800/60">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                          <Input
                            placeholder="Search GitLab projects..."
                            value={gitlabRepoSearch}
                            onChange={(e) => setGitlabRepoSearch(e.target.value)}
                            className="h-9 pl-9 pr-4 rounded-xl border-zinc-200 dark:border-zinc-700 text-xs bg-zinc-50/60 dark:bg-zinc-950/60 text-zinc-900 dark:text-zinc-100 focus-visible:ring-orange-500/40 placeholder:text-zinc-400"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={gitlabFilterVisibility} onValueChange={(val) => setGitlabFilterVisibility(val as any)}>
                            <SelectTrigger className="h-9 text-xs w-28 rounded-xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-955 font-semibold text-zinc-700 dark:text-zinc-300 focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl z-[60]">
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={gitlabSort} onValueChange={(val) => setGitlabSort(val as any)}>
                            <SelectTrigger className="h-9 text-xs w-36 rounded-xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-955 font-semibold text-zinc-700 dark:text-zinc-300 focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl z-[60]">
                              <SelectItem value="recently_used">Recently Updated</SelectItem>
                              <SelectItem value="created_date">Created Date</SelectItem>
                              <SelectItem value="name">Name A–Z</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <ScrollArea className="flex-1 min-h-0 px-6 py-4">
                        {loadingGitlabRepos ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, idx) => (
                              <div key={idx} className="p-4 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-14 rounded-full" /></div>
                                <Skeleton className="h-3 w-48" />
                                <div className="flex items-center gap-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /></div>
                              </div>
                            ))}
                          </div>
                        ) : gitlabRepoList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-orange-100 dark:border-zinc-700">
                              <Folder className="h-6 w-6 text-orange-400" />
                            </div>
                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">No projects found</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Try adjusting your search or filters</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {gitlabRepoList.map((repo) => {
                              const isSelected = gitlabSelectedRepos.includes(repo.fullName);
                              const getLangColor = (lang: string) => {
                                if (!lang) return 'bg-zinc-400';
                                const colors: Record<string, string> = {
                                  javascript: 'bg-yellow-400', typescript: 'bg-blue-500',
                                  go: 'bg-cyan-500', python: 'bg-blue-600',
                                  html: 'bg-orange-500', css: 'bg-purple-500',
                                  rust: 'bg-orange-600', java: 'bg-red-500', shell: 'bg-green-500',
                                };
                                return colors[lang.toLowerCase()] || 'bg-zinc-500';
                              };
                              return (
                                <div
                                  key={repo.id}
                                  onClick={() => {
                                    setGitlabSelectedRepos(prev =>
                                      isSelected ? prev.filter(r => r !== repo.fullName) : [...prev, repo.fullName]
                                    );
                                  }}
                                  className={`group p-4 border rounded-2xl cursor-pointer flex flex-col justify-between relative transition-all duration-150 ${
                                    isSelected
                                      ? 'border-orange-400 ring-2 ring-orange-400/20 bg-orange-50/30 dark:bg-orange-950/10 shadow-sm'
                                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/60'
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-tight">{repo.fullName}</h4>
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                        repo.private ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      }`}>{repo.private ? 'Private' : 'Public'}</span>
                                    </div>
                                    {repo.description
                                      ? <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{repo.description}</p>
                                      : <p className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">No description</p>
                                    }
                                  </div>
                                  <div className="flex items-center gap-3 pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">
                                    {repo.language && (
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${getLangColor(repo.language)}`} />
                                        <span>{repo.language}</span>
                                      </div>
                                    )}
                                    {repo.updatedAt && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{timeAgo(repo.updatedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-0.5 border-2 border-white dark:border-zinc-900 shadow-lg">
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>

                      <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/30">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {gitlabSelectedRepos.length} {gitlabSelectedRepos.length === 1 ? 'project' : 'projects'} selected
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsGitlabReposDialogOpen(false)} className="h-9 px-4 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-700">Cancel</Button>
                          <Button
                            onClick={async () => {
                              try {
                                await linkPlatformRepos({ workspaceId: workspace._id, platform: 'gitlab', repos: gitlabSelectedRepos }).unwrap();
                                toast.success('Linked projects saved!');
                                refetchIntegrations();
                                setIsGitlabReposDialogOpen(false);
                              } catch (err: any) { toast.error('Failed: ' + err.message); }
                            }}
                            className="h-9 px-5 bg-orange-550 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm border-0 cursor-pointer"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      </div>
      </main>
    </div>
  );
}