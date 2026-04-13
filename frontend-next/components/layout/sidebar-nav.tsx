'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  StickyNote,
  Timer,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; label: string; icon: Icon };

const CORE_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/progress', label: 'Progress', icon: Trophy },
  { href: '/tests', label: 'Tests', icon: ClipboardList },
  { href: '/assignments', label: 'Assignments', icon: FileText },
  { href: '/sessions', label: 'Sessions', icon: Calendar },
  { href: '/attendance', label: 'Attendance', icon: CheckSquare },
  { href: '/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/certificates', label: 'Certificates', icon: ShieldCheck },
  { href: '/learning-paths', label: 'Learning Paths', icon: Route },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/discussions', label: 'Discussions', icon: MessagesSquare },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/time-tracking', label: 'Time Tracking', icon: Clock },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/profile', label: 'Profile', icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Course Management', icon: BookOpen },
  { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/assignments', label: 'Assignments', icon: FileText },
  { href: '/admin/tests', label: 'Tests', icon: ClipboardList },
  { href: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/admin/learning-paths', label: 'Learning Paths', icon: Route },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: Trophy },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: Timer },
  { href: '/admin/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/admin/student-tracking', label: 'Student Tracking', icon: User },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/notifications', label: 'Broadcast', icon: Bell },
  { href: '/admin/discussions', label: 'Discussion Moderation', icon: MessagesSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-2 text-[13px]">
      <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>
      {CORE_NAV.map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}

      {isAdmin ? (
        <>
          <div className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </div>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </>
      ) : null}
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors leading-tight',
        active
          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
          : 'text-foreground/75 hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
