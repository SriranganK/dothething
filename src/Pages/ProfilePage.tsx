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
  ArrowLeft
} from 'lucide-react';
import type { WorkspaceType, BoardType } from '@/types/workspace';
import { useGetWorkspaceActivityQuery } from '@/store/services/api';
import { Link } from 'react-router-dom';

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

type NavSection = 'overview' | 'general' | 'members' | 'billing' | 'security';

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
            { id: 'security', label: 'Security & SSO', icon: Lock, desc: 'Audits and authentication' }
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

        </div>
      </main>
    </div>
  );
}