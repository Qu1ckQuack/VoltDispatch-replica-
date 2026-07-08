import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Wrench,
  CalendarClock,
  BarChart3,
  Settings,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/lib/api/types'

export interface NavLink {
  label: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
}

export const navLinks: NavLink[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [UserRole.HQ, UserRole.DEALER, UserRole.COORDINATOR, UserRole.TECHNICIAN],
  },
  {
    label: 'Queue',
    href: '/queue',
    icon: ClipboardList,
    roles: [UserRole.COORDINATOR],
  },
  {
    label: 'Work Orders',
    href: '/work-orders',
    icon: Wrench,
    roles: [UserRole.HQ, UserRole.DEALER, UserRole.COORDINATOR, UserRole.TECHNICIAN],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
    roles: [UserRole.HQ, UserRole.DEALER],
  },
  {
    label: 'Technicians',
    href: '/technicians',
    icon: Wrench,
    roles: [UserRole.HQ, UserRole.COORDINATOR],
  },
  {
    label: 'Live Map',
    href: '/live-map',
    icon: MapPin,
    roles: [UserRole.HQ, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.CUSTOMER],
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: CalendarClock,
    roles: [UserRole.COORDINATOR, UserRole.TECHNICIAN],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: [UserRole.HQ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.HQ, UserRole.DEALER],
  },
]

export function filterNavLinks(role: string): NavLink[] {
  return navLinks.filter((link) => link.roles.includes(role as UserRole))
}
