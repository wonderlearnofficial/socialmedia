import {
  Archive,
  Calculator,
  Crown,
  GraduationCap,
  Palette,
  User,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

export interface RoleInfo {
  label: string
  description: string
  category: 'leadership' | 'creative' | 'operations' | 'general'
  icon: LucideIcon
}

export const ROLE_DESCRIPTIONS: Record<string, RoleInfo> = {
  'Founder and Lead': {
    label: 'Founder and Lead',
    description: 'Full workspace administration, strategy, and team leadership.',
    category: 'leadership',
    icon: Crown,
  },
  Accountant: {
    label: 'Accountant',
    description: 'Access to financial tracking, invoices, and expense reports.',
    category: 'operations',
    icon: Calculator,
  },
  'Graphic Designer': {
    label: 'Graphic Designer',
    description: 'Visual assets, graphics production, and creative media.',
    category: 'creative',
    icon: Palette,
  },
  'Art Director': {
    label: 'Art Director',
    description: 'Creative direction, brand identity, and asset approvals.',
    category: 'creative',
    icon: Wand2,
  },
  'Instructional Designer': {
    label: 'Instructional Designer',
    description: 'Educational design, learning frameworks, and instructional media.',
    category: 'creative',
    icon: GraduationCap,
  },
  'Archive Master': {
    label: 'Archive Master',
    description: 'Media archiving, Drive asset organization, and file management.',
    category: 'operations',
    icon: Archive,
  },
  Member: {
    label: 'Member',
    description: 'General team workflows, collaboration, and post assignments.',
    category: 'general',
    icon: User,
  },
}

export function getRoleDescription(role: string): string {
  return ROLE_DESCRIPTIONS[role]?.description ?? 'Team collaborator with standard workspace access.'
}

export function getRoleIcon(role: string): LucideIcon {
  return ROLE_DESCRIPTIONS[role]?.icon ?? User
}
