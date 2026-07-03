// src/lib/BoardTemplates.ts

export interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
  category: 'Personal' | 'Team' | 'Business';
  columns: string[];
  icon: string; // we can map these to Lucide icons dynamically
}

export const BOARD_TEMPLATES: TemplateDefinition[] = [
  // Personal
  {
    key: 'daily-planner',
    name: 'Daily Planner',
    description: 'Structure your day with simple to-dos, ongoing actions, and completed items.',
    category: 'Personal',
    columns: ['To Do', 'In Progress', 'Done'],
    icon: 'CalendarDays'
  },
  {
    key: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Track daily habits, check completed streaks, and maintain consistency.',
    category: 'Personal',
    columns: ['Habits to Build', 'Completed Today', 'Weekly Streak'],
    icon: 'Activity'
  },
  {
    key: 'weekly-planner',
    name: 'Weekly Planner',
    description: 'Plan key projects, events, and focus items grouped by weekdays.',
    category: 'Personal',
    columns: ['Mon / Tue', 'Wed / Thu', 'Fri / Sat', 'Sunday Routine'],
    icon: 'CalendarRange'
  },
  // Team
  {
    key: 'scrum-sprint',
    name: 'Scrum Sprint',
    description: 'Manage sprint deliverables, code reviews, and verify items in active sprints.',
    category: 'Team',
    columns: ['Sprint Backlog', 'In Progress', 'Code Review', 'Done'],
    icon: 'Layers'
  },
  {
    key: 'kanban',
    name: 'Kanban Board',
    description: 'Classic flexible Kanban board to visualize tasks flowing through standard stages.',
    category: 'Team',
    columns: ['To Do', 'In Progress', 'In Review', 'Done'],
    icon: 'Kanban'
  },
  {
    key: 'product-roadmap',
    name: 'Product Roadmap',
    description: 'Map quarterly releases, feature initiatives, and upcoming ideas.',
    category: 'Team',
    columns: ['Idea Pipeline', 'Q1 Planning', 'Q2 Execution', 'Released / Done'],
    icon: 'Compass'
  },
  // Business
  {
    key: 'crm',
    name: 'CRM Sales',
    description: 'Track deal stages, lead qualifications, proposals sent, and wins.',
    category: 'Business',
    columns: ['New Leads', 'Contacted', 'Proposal Sent', 'Won / Lost'],
    icon: 'Briefcase'
  },
  {
    key: 'marketing-pipeline',
    name: 'Marketing Calendar',
    description: 'Organize content pipelines, content drafting, marketing QA, and published posts.',
    category: 'Business',
    columns: ['Brainstorming', 'Content Draft', 'Review / QA', 'Published'],
    icon: 'Megaphone'
  },
  {
    key: 'hiring-pipeline',
    name: 'Hiring Pipeline',
    description: 'Source candidates, manage phone screens, track interviews, and dispatch offers.',
    category: 'Business',
    columns: ['Sourced Candidates', 'Phone Screen', 'Technical Interview', 'Offer / Hired'],
    icon: 'UserPlus'
  }
];
