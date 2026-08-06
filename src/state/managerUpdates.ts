import { atlas } from '../data/atlas';

export type ManagerSubmissionStatus = 'draft' | 'submitted';
export type ManagerChartType = 'bar' | 'line';

export interface ProjectAssignment {
  userId: string;
  departmentId: string;
  projectIds: string[];
}

export interface ManagerUpdateSections {
  highlights: string;
  ongoingActivities: string;
  risks: string;
  plansForWeek: string;
}

export interface GeneratedChart {
  id: string;
  type: ManagerChartType;
  title: string;
  values: { label: string; value: number }[];
  generatedAt: string;
}

export interface ManagerAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploaded' | 'error';
  error?: string;
}

export interface ManagerWeeklyUpdate {
  id: string;
  creatorId: string;
  departmentId: string;
  projectId: string;
  reportingPeriodId: string;
  reportingDeadline: string;
  sections: ManagerUpdateSections;
  chart: GeneratedChart | null;
  attachments: ManagerAttachment[];
  status: ManagerSubmissionStatus;
  savedAt: string;
  submittedAt: string | null;
  visibleToRoles: ('commercial_manager' | 'ceo' | 'cfo')[];
}

export interface ManagerUpdatesState {
  version: 1;
  updates: ManagerWeeklyUpdate[];
  lastError: string | null;
}

export type ManagerUpdatesAction =
  | { type: 'UPSERT_UPDATE'; update: ManagerWeeklyUpdate }
  | { type: 'RESET' }
  | { type: 'CLEAR_ERROR' };

export const managerUpdatesStorageKey = 'atlas.manager-updates.v1';

export const projectAssignments: ProjectAssignment[] = [
  {
    userId: 'usr_operations',
    departmentId: 'dept_operations',
    projectIds: ['prj_compressor', 'prj_wellwork'],
  },
  {
    userId: 'usr_finance',
    departmentId: 'dept_finance',
    projectIds: ['prj_compressor', 'prj_metering'],
  },
  {
    userId: 'usr_hse',
    departmentId: 'dept_hse',
    projectIds: ['prj_compressor', 'prj_integrity'],
  },
  {
    userId: 'usr_legal',
    departmentId: 'dept_legal',
    projectIds: ['prj_integrity', 'prj_compressor'],
  },
  {
    userId: 'usr_projects',
    departmentId: 'dept_projects',
    projectIds: atlas.projects.map((project) => project.id),
  },
  {
    userId: 'usr_supply_chain',
    departmentId: 'dept_supply_chain',
    projectIds: ['prj_compressor', 'prj_metering'],
  },
  {
    userId: 'usr_community',
    departmentId: 'dept_community',
    projectIds: ['prj_integrity', 'prj_wellwork'],
  },
  {
    userId: 'usr_commercial',
    departmentId: 'dept_commercial',
    projectIds: atlas.projects.map((project) => project.id),
  },
];

function initialUpdates(): ManagerWeeklyUpdate[] {
  return [
    {
      id: 'manager_update_projects_integrity_w30',
      creatorId: 'usr_projects',
      departmentId: 'dept_projects',
      projectId: 'prj_integrity',
      reportingPeriodId: 'cycle_2026_w30',
      reportingDeadline: atlas.reportingCycles.find((cycle) => cycle.id === 'cycle_2026_w30')!
        .dueDate,
      sections: {
        highlights:
          'Inspection coverage reached 54% against 70% plan; 16 kilometres of line were verified.',
        ongoingActivities:
          'ROW access coordination and ultrasonic inspection continue on the western segment.',
        risks:
          'Community access restrictions may move the remaining inspection window by seven days.',
        plansForWeek:
          'Close the access agreement and complete inspection of the remaining priority segments.',
      },
      chart: {
        id: 'chart_projects_integrity_w30',
        type: 'bar',
        title: 'Highlights chart',
        values: [
          { label: 'Value 1', value: 54 },
          { label: 'Value 2', value: 70 },
          { label: 'Value 3', value: 16 },
        ],
        generatedAt: '2026-07-28T11:10:00+01:00',
      },
      attachments: [
        {
          id: 'attachment_projects_integrity_w30',
          name: 'Ughelli_Integrity_Progress.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 286_000,
          status: 'uploaded',
        },
      ],
      status: 'submitted',
      savedAt: '2026-07-28T11:10:00+01:00',
      submittedAt: '2026-07-28T11:10:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
    },
  ];
}

export function createInitialManagerUpdatesState(): ManagerUpdatesState {
  return { version: 1, updates: initialUpdates(), lastError: null };
}

export function loadManagerUpdatesState(): ManagerUpdatesState {
  if (typeof window === 'undefined') return createInitialManagerUpdatesState();
  try {
    const stored = window.localStorage.getItem(managerUpdatesStorageKey);
    if (!stored) return createInitialManagerUpdatesState();
    const parsed = JSON.parse(stored) as ManagerUpdatesState;
    return parsed.version === 1 ? parsed : createInitialManagerUpdatesState();
  } catch {
    return createInitialManagerUpdatesState();
  }
}

export function managerUpdatesReducer(
  state: ManagerUpdatesState,
  action: ManagerUpdatesAction,
): ManagerUpdatesState {
  if (action.type === 'RESET') return createInitialManagerUpdatesState();
  if (action.type === 'CLEAR_ERROR') return { ...state, lastError: null };
  const duplicate = state.updates.find(
    (update) =>
      update.creatorId === action.update.creatorId &&
      update.projectId === action.update.projectId &&
      update.reportingPeriodId === action.update.reportingPeriodId &&
      update.id !== action.update.id,
  );
  if (duplicate) {
    return {
      ...state,
      lastError: 'An update already exists for this project and reporting period.',
    };
  }
  const exists = state.updates.some((update) => update.id === action.update.id);
  return {
    ...state,
    updates: exists
      ? state.updates.map((update) => (update.id === action.update.id ? action.update : update))
      : [...state.updates, action.update],
    lastError: null,
  };
}

export function selectAssignedProjectIds(userId: string) {
  return projectAssignments.find((assignment) => assignment.userId === userId)?.projectIds ?? [];
}

export function selectManagerUpdates(state: ManagerUpdatesState, creatorId: string) {
  return state.updates
    .filter((update) => update.creatorId === creatorId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function selectVisibleSubmittedUpdates(
  state: ManagerUpdatesState,
  role: 'commercial_manager' | 'ceo' | 'cfo',
) {
  return state.updates
    .filter((update) => update.status === 'submitted' && update.visibleToRoles.includes(role))
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
}

export function extractChartValues(highlights: string) {
  return (highlights.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).slice(0, 6).map((value, index) => ({
    label: `Value ${index + 1}`,
    value: Number(value.replaceAll(',', '')),
  }));
}
