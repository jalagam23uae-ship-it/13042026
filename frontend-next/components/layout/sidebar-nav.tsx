'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; key: string; icon: Icon };

const CORE_NAV: NavItem[] = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/courses', key: 'courses', icon: BookOpen },
  { href: '/progress', key: 'progress', icon: Trophy },
  { href: '/tests', key: 'tests', icon: ClipboardList },
  { href: '/assignments', key: 'assignments', icon: FileText },
  { href: '/sessions', key: 'sessions', icon: Calendar },
  { href: '/attendance', key: 'attendance', icon: CheckSquare },
  { href: '/enrollments', key: 'enrollments', icon: GraduationCap },
  { href: '/certificates', key: 'certificates', icon: ShieldCheck },
  { href: '/learning-paths', key: 'learningPaths', icon: Route },
  { href: '/calendar', key: 'calendar', icon: Calendar },
  { href: '/discussions', key: 'discussions', icon: MessagesSquare },
  { href: '/notes', key: 'notes', icon: StickyNote },
  { href: '/reviews', key: 'reviews', icon: Star },
  { href: '/time-tracking', key: 'timeTracking', icon: Clock },
  { href: '/notifications', key: 'notifications', icon: Bell },
  { href: '/wishlist', key: 'wishlist', icon: Heart },
  { href: '/announcements', key: 'announcements', icon: Megaphone },
  { href: '/feedback', key: 'feedback', icon: MessageSquare },
  { href: '/search', key: 'search', icon: Search },
  { href: '/ai-assistant', key: 'aiAssistant', icon: Sparkles },
  { href: '/profile', key: 'profile', icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/reports', key: 'reports', icon: FileText },
  { href: '/admin/analytics', key: 'analytics', icon: Trophy },
  { href: '/admin/audit-logs', key: 'auditLogs', icon: Timer },
  { href: '/admin/approvals', key: 'approvals', icon: CheckSquare },
  { href: '/admin/student-tracking', key: 'studentTracking', icon: User },
  { href: '/admin/notifications', key: 'broadcast', icon: Bell },
  { href: '/admin/discussions', key: 'discussionModeration', icon: MessagesSquare },
  { href: '/admin/settings', key: 'settings', icon: Settings },
];

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      <div className="snav-label px-2 pt-1 pb-1.5">{t('workspace')}</div>
      {CORE_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          label={t(item.key as Parameters<typeof t>[0])}
          active={
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(`${item.href}/`))
          }
        />
      ))}

      {isAdmin ? (
        <>
          <div className="snav-label px-2 pt-3 pb-1.5">{t('admin')}</div>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.key as Parameters<typeof t>[0])}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </>
      ) : null}
    </nav>
  );
}

function NavLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={active ? 'snav-item snav-item-active' : 'snav-item'}
    >
      <Icon width={14} height={14} style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </Link>
  );
}
