'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Inbox,
  Flame,
} from 'lucide-react';
import RecentActivityCard from '@/components/RecentActivityCard';
import ActivityDialog from '@/components/ActivityDialog';
import { useGetWorkspaceActivityQuery, useGetWorkspaceMembersQuery } from '@/store/services/api';

// Formatting helpers
function getRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return 'Some time ago';
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateString(str: string) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatActivityAction(activity: any, emailToNameMap: Map<string, string>) {
  const type = activity.actionType;
  const oldVal = activity.oldValue;
  const newVal = activity.newValue;
  const meta = activity.metadata || {};

  switch (type) {
    case 'TASK_CREATED':
      return { action: 'created task', detail: '' };
    case 'TASK_DELETED':
      return { action: 'deleted task', detail: oldVal || '' };
    case 'TASK_UPDATED':
      const resolvedOldField = meta.field === 'assignee' && oldVal ? (emailToNameMap.get(oldVal.toLowerCase().trim()) || oldVal) : oldVal;
      const resolvedNewField = meta.field === 'assignee' && newVal ? (emailToNameMap.get(newVal.toLowerCase().trim()) || newVal) : newVal;
      return { action: `updated ${meta.field || 'task'}`, detail: oldVal && newVal ? `${resolvedOldField} → ${resolvedNewField}` : '' };
    case 'TASK_ASSIGNED':
      const assignedName = newVal ? (emailToNameMap.get(newVal.toLowerCase().trim()) || newVal) : '';
      return { action: 'assigned task', detail: assignedName ? `to ${assignedName}` : '' };
    case 'TASK_UNASSIGNED':
      const unassignedName = oldVal ? (emailToNameMap.get(oldVal.toLowerCase().trim()) || oldVal) : '';
      return { action: 'unassigned task', detail: unassignedName ? `from ${unassignedName}` : '' };
    case 'STATUS_CHANGED':
      return { action: 'changed status', detail: oldVal && newVal ? `${oldVal} → ${newVal}` : newVal || '' };
    case 'PRIORITY_CHANGED':
      return { action: 'changed priority', detail: oldVal && newVal ? `${oldVal} → ${newVal}` : newVal || '' };
    case 'DUE_DATE_CHANGED':
      return { action: 'changed due date', detail: oldVal && newVal ? `${formatDateString(oldVal)} → ${formatDateString(newVal)}` : newVal ? `to ${formatDateString(newVal)}` : 'removed due date' };
    case 'START_DATE_CHANGED':
      return { action: 'changed start date', detail: oldVal && newVal ? `${formatDateString(oldVal)} → ${formatDateString(newVal)}` : newVal ? `to ${formatDateString(newVal)}` : 'removed start date' };
    case 'TITLE_CHANGED':
      return { action: 'renamed task', detail: oldVal && newVal ? `${oldVal} → ${newVal}` : newVal || '' };
    case 'DESCRIPTION_CHANGED':
      return { action: 'updated description', detail: '' };
    case 'COMMENT_ADDED':
      return { action: 'added a comment', detail: newVal };
    case 'COMMENT_UPDATED':
      return { action: 'updated a comment', detail: newVal };
    case 'COMMENT_DELETED':
      return { action: 'deleted a comment', detail: '' };
    case 'ATTACHMENT_ADDED':
      return { action: 'added attachment', detail: newVal };
    case 'ATTACHMENT_REMOVED':
      return { action: 'removed attachment', detail: oldVal };
    case 'LABEL_ADDED':
      return { action: 'added label', detail: newVal };
    case 'LABEL_REMOVED':
      return { action: 'removed label', detail: oldVal };
    case 'MEMBER_ADDED':
      return { action: 'joined the workspace', detail: newVal || '' };
    case 'MEMBER_REMOVED':
      return { action: 'left the workspace', detail: oldVal || '' };
    case 'PROJECT_CREATED':
      return { action: 'created project/board', detail: newVal || '' };
    case 'PROJECT_UPDATED':
      return { action: 'renamed project/board', detail: oldVal && newVal ? `${oldVal} → ${newVal}` : newVal || '' };
    default:
      return { action: type.toLowerCase().replace(/_/g, ' '), detail: newVal || '' };
  }
}

interface JiraSummaryPageProps {
  items: any[];
  board: any;
}


export default function JiraSummaryPage({ items = [], board }: JiraSummaryPageProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const statusMap = useMemo(() => {
    return new Map(board?.columns?.map((col: any) => [col.id, col.name]) || []);
  }, [board]);

  const columnsList = useMemo(() => {
    return board?.columns || [];
  }, [board]);

  const totalIssues = items.length;

  // Status Distribution
  const statusCounts = useMemo(() => {
    return items.reduce((acc: any, item: any) => {
      const statusName = (statusMap.get(item.columnId) || 'Unknown') as string;
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {} as any);
  }, [items, statusMap]);

  const statusData = useMemo(() => {
    return columnsList.map((col: any) => ({
      name: col.name,
      value: statusCounts[col.name] || 0,
      color: getStatusColor(col.name),
    }));
  }, [columnsList, statusCounts]);

  // Project Health Calculation (percentage of issues in Done/Closed status)
  const completedColumnIds = useMemo(() => {
    let completedCols = columnsList.filter((col: any) => col.isDone);
    if (completedCols.length === 0) {
      completedCols = columnsList.filter((col: any) =>
        ['done', 'closed', 'completed', 'resolved', 'complete'].some(s => col.name.toLowerCase().includes(s))
      );
    }
    return completedCols.length > 0 
      ? completedCols.map((col: any) => col.id)
      : (columnsList.length > 0 ? [columnsList[columnsList.length - 1].id] : []);
  }, [columnsList]);

  const completedIssuesCount = useMemo(() => {
    return items.filter((item: any) => completedColumnIds.includes(item.columnId)).length;
  }, [items, completedColumnIds]);

  const completionRate = totalIssues > 0 ? Math.round((completedIssuesCount / totalIssues) * 100) : 0;

  // Unassigned issues
  const unassignedCount = useMemo(() => {
    return items.filter((item: any) => !item.assignee || item.assignee === 'Unassigned').length;
  }, [items]);

  // High/Critical Priority issues
  const highPriorityCount = useMemo(() => {
    return items.filter((item: any) => ['High', 'Critical', 'Highest'].includes(item.priority)).length;
  }, [items]);

  // Priority Breakdown
  const priorityCounts = useMemo(() => {
    return items.reduce((acc: any, item: any) => {
      const prio = (item.priority || 'Medium') as string;
      acc[prio] = (acc[prio] || 0) + 1;
      return acc;
    }, {} as any);
  }, [items]);

  const priorityData = useMemo(() => {
    const order = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
    return Object.entries(priorityCounts)
      .map(([name, count]) => ({
        name,
        count: count as number,
        color: getPriorityColor(name),
      }))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [priorityCounts]);

  // Types of Work
  const typeCounts = useMemo(() => {
    return items.reduce((acc: any, item: any) => {
      const type = (item.type || 'Task') as string;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as any);
  }, [items]);

  const typeData = useMemo(() => {
    return Object.entries(typeCounts).map(([name, count], index) => ({
      name,
      count: count as number,
      color: COLORS[index % COLORS.length],
    }));
  }, [typeCounts, COLORS]);

  const { data: membersData } = useGetWorkspaceMembersQuery(
    board?.workspace || '',
    { skip: !board?.workspace }
  );

  const emailToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (membersData?.members) {
      membersData.members.forEach((m: any) => {
        if (m.userId && m.userId.email && m.userId.name) {
          map.set(m.userId.email.toLowerCase().trim(), m.userId.name);
        }
      });
    }
    return map;
  }, [membersData]);

  // Team Workload calculation - dynamically by column
  const teamWorkload = useMemo(() => {
    const teamWorkloadRaw = items.reduce((acc: any, item: any) => {
      const assignee = (item.assignee || 'Unassigned') as string;
      if (!acc[assignee]) {
        acc[assignee] = {
          assigned: 0,
          columns: {}
        };
        // Initialize columns
        columnsList.forEach((col: any) => {
          acc[assignee].columns[col.name as string] = 0;
        });
      }
      acc[assignee].assigned++;
      const colName = (statusMap.get(item.columnId) || 'Unknown') as string;
      acc[assignee].columns[colName] = (acc[assignee].columns[colName] || 0) + 1;
      return acc;
    }, {} as any);

    return Object.entries(teamWorkloadRaw)
      .map(([name, data]: any) => {
        const percentage = totalIssues > 0 ? Math.round((data.assigned / totalIssues) * 100) : 0;
        const resolvedName = name === 'Unassigned'
          ? 'Unassigned'
          : (emailToNameMap.get(name.toLowerCase().trim()) || name);
        return {
          name: resolvedName,
          assigned: data.assigned,
          percentage,
          columns: data.columns,
        };
      })
      .sort((a, b) => b.assigned - a.assigned)
      .slice(0, 20); // Support larger teams
  }, [items, columnsList, statusMap, totalIssues, emailToNameMap]);

  // Recharts workload data
  const workloadChartData = useMemo(() => {
    return teamWorkload.map((member: any) => {
      // Simplify email assignee names for readability in chart axes
      const cleanName = member.name === 'Unassigned'
        ? 'Unassigned'
        : (member.name.includes('@') ? member.name.split('@')[0] : member.name);
      const row: any = { name: cleanName };
      columnsList.forEach((col: any) => {
        row[col.name] = member.columns[col.name] || 0;
      });
      return row;
    });
  }, [teamWorkload, columnsList]);

  // Avg load per person (excluding unassigned)
  const assigneesCount = teamWorkload.filter(m => m.name !== 'Unassigned').length || 1;
  const avgLoad = Math.round((items.filter(i => i.assignee && i.assignee !== 'Unassigned').length / assigneesCount) * 10) / 10;

  // Fetch real workspace activities
  const { data: activityResponse } = useGetWorkspaceActivityQuery(
    { workspaceId: board?.workspace || '' },
    { skip: !board?.workspace }
  );

  const recentActivity = useMemo(() => {
    if (!activityResponse?.activities) return [];
    return activityResponse.activities.map((act: any) => {
      const { action, detail } = formatActivityAction(act, emailToNameMap);
      const issueKey = act.metadata?.taskKey || (act.taskId ? `TASK-${String(act.taskId).slice(-5).toUpperCase()}` : '');
      const title = act.metadata?.taskTitle || act.metadata?.projectName || '';
      const userName = act.actorId?.name || act.actorId?.email || 'System';
      return {
        id: act._id,
        user: userName,
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(userName)}`,
        action,
        issue: issueKey,
        taskId: act.taskId,
        title,
        detail,
        time: getRelativeTime(act.createdAt),
      };
    });
  }, [activityResponse, emailToNameMap]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8 text-foreground">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {board?.name || 'Project'} Summary
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Comprehensive workload analytics and project health dashboard
            </p>
          </div>

          <Badge variant="outline" className="px-4 py-2 text-xs font-semibold bg-card shadow-sm border-border shrink-0 self-start sm:self-center flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Real-time Sync
          </Badge>
        </div>


        {/* Top KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {/* Total Issues */}
          <Card className="border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Tickets
              </CardTitle>
              <Inbox className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {totalIssues}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in board backlog
              </p>
            </CardContent>
          </Card>

          {/* Project Health */}
          <Card className="border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Project Health
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {completionRate}%
                </span>
                <span className="text-xs font-semibold text-emerald-600">Done</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${completionRate}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Unassigned Issues */}
          <Card className="border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Unassigned
              </CardTitle>
              <AlertTriangle className={`w-4 h-4 ${unassignedCount > 0 ? 'text-amber-500 animate-bounce' : 'text-zinc-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-extrabold tracking-tight ${unassignedCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                {unassignedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Require triage / owner
              </p>
            </CardContent>
          </Card>

          {/* High Priority Bottlenecks */}
          <Card className="border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Bottlenecks
              </CardTitle>
              <Flame className={`w-4 h-4 ${highPriorityCount > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-extrabold tracking-tight ${highPriorityCount > 0 ? 'text-red-500' : 'text-foreground'}`}>
                {highPriorityCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                High / Critical priority
              </p>
            </CardContent>
          </Card>

          {/* Avg. Load per Member */}
          <Card className="border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Avg Load / Person
              </CardTitle>
              <Users className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {avgLoad}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Issues / assigned member
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Small Status Ribbon */}
        <div className="flex flex-wrap gap-3 bg-muted/60 border border-border p-3 rounded-2xl text-foreground">
          <span className="text-xs font-bold text-muted-foreground flex items-center px-2">Statuses:</span>
          {statusData.map((status: any) => (
            <div 
              key={status.name} 
              className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-xl shadow-xs text-xs"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="font-semibold text-muted-foreground">{status.name}:</span>
              <span className="font-bold text-foreground">{status.value}</span>
            </div>
          ))}
        </div>

        {/* Middle Panels: Stacked Dynamic Rows */}
        <div className="space-y-6">
          
          {/* Row 1: Status Distribution (Left) & Work Types (Right) - Same Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Status Distribution */}
            <Card className="border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg font-bold text-foreground">Status Distribution</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Issues grouped by board workflow columns
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        color: 'var(--popover-foreground)',
                        borderRadius: '0.75rem',
                      }}
                      itemStyle={{ color: 'var(--foreground)' }}
                      labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Types of Work Pie Chart */}
            <Card className="border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold text-foreground">Work Types</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Proportion of different task types
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-4 flex flex-col justify-center">
                {typeData.length > 0 ? (
                  <div className="h-full w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="count"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            borderColor: 'var(--border)',
                            color: 'var(--popover-foreground)',
                            borderRadius: '0.75rem',
                          }}
                          itemStyle={{ color: 'var(--foreground)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center">No type data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Workload Breakdown Chart (Left) & Priority Breakdown Chart (Right) - Same Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Visual Team Workload Stacked Chart */}
            <Card className="border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold text-foreground">Workload Breakdown</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Visual stage distribution per assignee
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-4 flex items-center justify-center">
                {workloadChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={workloadChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderColor: 'var(--border)',
                          color: 'var(--popover-foreground)',
                          borderRadius: '0.75rem',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 'bold' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: 'var(--foreground)' }} 
                      />
                      {columnsList.map((col: any, index: number) => (
                        <Bar
                          key={col.id}
                          dataKey={col.name}
                          stackId="a"
                          fill={COLORS[index % COLORS.length]}
                          name={col.name}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-muted-foreground">No chart data available</div>
                )}
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            <Card className="border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold text-foreground">Priority Profile</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Distribution of issues by priority level
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-4 flex items-center justify-center">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderColor: 'var(--border)',
                          color: 'var(--popover-foreground)',
                          borderRadius: '0.75rem',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={20}>
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-muted-foreground text-center">No priority data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Team Workload (Full Width for dynamic stages support) */}
          <div className="w-full">
            <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
              <CardHeader className="border-b border-border pb-5 bg-muted/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">
                      Team Workload Overview
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Dynamically tracked tickets per workflow stage sorted by workload share
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 border border-primary/25 text-foreground px-3 py-1 rounded-xl text-xs font-semibold self-start sm:self-center">
                    {totalIssues} Total Tickets
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-5">
                  {teamWorkload.length > 0 ? (
                    teamWorkload.map((member: any, index: number) => (
                      <div
                        key={index}
                        className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:border-primary/50 hover:shadow-md text-foreground"
                      >
                        {/* Decorative side accent */}
                        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/80" />

                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                          {/* Assignee Details */}
                          <div className="flex items-center gap-4 lg:w-72 shrink-0">
                            <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 font-bold text-red-600 uppercase">
                                {member.name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-foreground truncate" title={member.name}>
                                {member.name}
                              </h3>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-extrabold text-foreground leading-none">
                                  {member.assigned}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">tickets</span>
                              </div>
                            </div>
                          </div>

                          {/* Workload Share Progress Bar */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-muted-foreground">Project Workload Share</span>
                              <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                {member.percentage}%
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                                style={{ width: `${member.percentage}%` }}
                              />
                            </div>
                          </div>

                          {/* DYNAMIC COLUMNS BREAKDOWN */}
                          <div className="flex flex-wrap gap-2 lg:w-[480px] shrink-0">
                            {columnsList.map((col: any) => {
                              const count = member.columns[col.name] || 0;
                              const badgeColor = getStatusColor(col.name);
                              return (
                                <div
                                  key={col.id}
                                  className={`rounded-xl border p-2 text-center flex-1 min-w-[76px] max-w-[120px] transition-all ${
                                    count > 0 
                                      ? 'bg-muted/80 border-border shadow-xs' 
                                      : 'bg-transparent border-border/50 opacity-30'
                                  }`}
                                >
                                  <div className="text-sm font-extrabold text-foreground leading-none">
                                    {count}
                                  </div>
                                  <div
                                    className="mt-1 text-[8.5px] font-extrabold uppercase tracking-wider truncate"
                                    style={{ color: badgeColor }}
                                    title={col.name}
                                  >
                                    {col.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground font-semibold">No workload data available</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Assign tickets in the workspace to see statistics.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Recent Activity (Full Width) */}
          <div className="w-full">
            <RecentActivityCard
              recentActivity={recentActivity}
              onViewAll={() => setActivityDialogOpen(true)}
            />
          </div>

        </div>

        {/* Dialog for details */}
        <ActivityDialog
          open={activityDialogOpen}
          onOpenChange={setActivityDialogOpen}
          activities={recentActivity}
        />
      </div>
    </div>
  );
}

// Helper Functions
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'To Do': '#6b7280',
    Backlog: '#8b5cf6',
    Open: '#3b82f6',
    'In Progress': '#f59e0b',
    Review: '#06b6d4',
    Testing: '#ec4899',
    Done: '#10b981',
    Closed: '#10b981',
    Complete: '#10b981',
    Resolved: '#10b981',
  };
  
  // Custom case-insensitive lookup
  const match = Object.keys(colors).find(key => key.toLowerCase() === status.toLowerCase());
  return match ? colors[match] : '#6b7280';
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Highest: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#10b981',
    Lowest: '#6b7280',
  };
  return colors[priority] || '#6b7280';
}

// Removed getStatusIcon