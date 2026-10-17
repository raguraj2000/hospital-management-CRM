import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Keyboard,
  KeyRound,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Sun,
  SunMoon,
} from 'lucide-react';
import {
  Avatar,
  cn,
  ErrorBoundary,
  Menu,
  MenuCheckItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@platform/ui';
import { MENU_COUNTS } from '@platform/shared';
import { NAV, NAV_GROUPS, type NavItem } from '@/nav';
import { useLogout, useMe } from '@/state/auth';
import { useTheme, type Theme } from '@/state/theme';
import { ChangePasswordDialog } from './ChangePassword';
import { useBranchLogo } from './BranchLogo';
import { NEW_OP_EVENT, QuickOp } from './QuickOp';
import type { NewChoice } from './NewMenu';
import { DirectLab } from './DirectLab';
import { setSkipUndo } from './undo';
import { Shortcuts } from './Shortcuts';

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'auto', label: 'Auto (same as this computer)', icon: SunMoon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/** What the number next to a page of the side menu counts. */
const WAITING_TITLE: Record<string, string> = Object.fromEntries(MENU_COUNTS.map((c) => [c.key, `${c.name}: ${c.meaning.toLowerCase()}`]));

/** Lists that reload only when asked (the nurse's Refresh / Auto refresh), and the change watch itself. */
const MANUAL_REFRESH = new Set(['changes', 'treatments', 'treatments-due']);

export function AppShell() {
  const { data: me } = useMe();
  const logout = useLogout();
  const { branch } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [shortcutHelp, setShortcutHelp] = useState(false);
  const branchLogo = useBranchLogo(branch);
  const navCounts = useQuery({ queryKey: ['nav-counts', branch], queryFn: () => api.get<{ enabled?: boolean; counts: Record<string, number> }>(`/b/${branch}/nav-counts`),
    enabled: !!branch && !!me,
    // Switched off in Settings: asked once, then left alone (switching it on again refreshes this).
    // Reloaded when something changed (see the watch below), not on a clock.
    refetchOnWindowFocus: (q) => q.state.data?.enabled !== false,
    staleTime: 10_000,
  });
  // Every 15 s one tiny question: "has anything changed in this branch?". Only when the answer moves, the lists on
  // screen reload (OP visits, billing, lab, pharmacy, the side-menu numbers). The nurse's page keeps its own Refresh.
  const queryClient = useQueryClient();
  const changes = useQuery({ queryKey: ['changes', branch], queryFn: () => api.get<{ version: string }>(`/b/${branch}/changes`), enabled: !!branch && !!me, refetchInterval: 15_000, refetchOnWindowFocus: true, staleTime: 0 });
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const v = changes.data?.version;
    if (!v) return;
    if (seen.current && seen.current !== v) {
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[1] === branch && !MANUAL_REFRESH.has(String(q.queryKey[0])) });
    }
    seen.current = v;
  }, [changes.data?.version, branch, queryClient]);
  const waiting: Record<string, number> = navCounts.data?.counts ?? {};
  const [quickOp, setQuickOp] = useState(false);
  const [direct, setDirect] = useState<'lab' | 'bill' | null>(null);
  // A page asks for the new-OP-visit window (the button on OP visits).
  useEffect(() => {
    const open = () => setQuickOp(true);
    window.addEventListener(NEW_OP_EVENT, open);
    return () => window.removeEventListener(NEW_OP_EVENT, open);
  }, []);

  if (!me)
    return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  if (me.user.isPlatformAdmin) return <Navigate to='/platform' replace />;
  const current = me.branches.find((b) => b.slug === branch);
  // A branch you can't open: go to your first branch, never show anything of it.
  if (!current)
    return me.branches[0] ? (
      <Navigate to={`/${me.branches[0].slug}`} replace />
    ) : (
      <NoBranches />
    );

  // The menu: what the role may open, less the pages that are a tab of another page for them.
  const items = NAV.filter((n) => current.permissions.includes(n.permission) && !(n.foldedWith && current.permissions.includes(n.foldedWith)));
  const to = (path: string) => `/${current.slug}${path ? `/${path}` : ''}`;
  const can = (p: string) => current.permissions.includes(p as never);
  setSkipUndo(can('undo.skip'));
  // Ctrl+K / "New": what this role can start. Only one thing: it opens straight away.
  const newChoices: NewChoice[] = [
    ...(can('patient.create') ? (['op'] as const) : []),
    ...(can('lab.view') || can('patient.create') ? (['lab'] as const) : []),
    ...(can('billing.receive') ? (['bill'] as const) : []),
    ...(can('pharmacy.sell') ? (['sale'] as const) : []),
  ];
  // One window at a time: a tab on top of it switches to another.
  const pickNew = (c: NewChoice) => {
    setQuickOp(c === 'op');
    setDirect(c === 'lab' || c === 'bill' ? c : null);
    if (c === 'sale') navigate(`${to('pharmacy')}?tab=direct`);
  };
  // Ctrl+K / New: "New OP visit" straight away (or the first thing this role can start).
  const openNew = () => newChoices[0] && pickNew(newChoices[0]);
  const newTabs = { allowed: newChoices, onPick: pickNew };
  const section = location.pathname.split('/')[2] ?? '';
  const activeItem = items.find((n) => n.path === section);
  // Browser tab: "Patients · Main branch"
  document.title = `${activeItem && activeItem.path ? `${activeItem.label} · ` : ''}${current.name}`;

  function switchBranch(slug: string) {
    // Same section in the other branch (records belong to one branch only).
    navigate(`/${slug}${section ? `/${section}` : ''}`);
  }

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined);
    navigate('/login', { replace: true });
  }

  // The branch's own logo (Settings > Branch settings); the first letter until one is uploaded.
  const logo = branchLogo.data?.header.logo ?? null;
  const branchBlock = (
    <>
      {logo ? (
        <img src={logo} alt='' className='size-8 shrink-0 rounded-lg border border-border bg-white object-contain' />
      ) : (
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground'>
          {current.name.charAt(0)}
        </span>
      )}
      <span className='min-w-0 flex-1 leading-tight'>
        <span className='block truncate text-sm font-semibold'>
          {current.name}
        </span>
        <span className='block truncate text-xs text-muted'>
          {me.organization.name}
        </span>
      </span>
    </>
  );
  // Only one branch to open: plain label, nothing to switch to.
  const branchSwitcher =
    me.branches.length <= 1 ? (
      <div className='flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left'>
        {branchBlock}
      </div>
    ) : (
      <Menu>
        <MenuTrigger asChild>
          <button className='flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-subtle data-[state=open]:bg-subtle'>
            {branchBlock}
            <ChevronsUpDown className='size-4 shrink-0 text-muted' />
          </button>
        </MenuTrigger>
        <MenuContent className='w-60'>
          <MenuLabel>Branches</MenuLabel>
          {me.branches.map((b) => (
            <MenuItem key={b.slug} onSelect={() => switchBranch(b.slug)}>
              <span className='flex size-6 items-center justify-center rounded-md border border-border text-xs font-medium'>
                {b.name.charAt(0)}
              </span>
              <span className='flex-1 truncate'>{b.name}</span>
              {b.slug === current.slug && <Check className='!text-ink' />}
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    );

  const userMenu = (side: 'top' | 'bottom') => (
    <MenuContent
      side={side}
      align={side === 'top' ? 'start' : 'end'}
      className='w-56'
    >
      <MenuLabel>
        <div className='text-sm font-medium text-ink'>{me.user.name}</div>
        <div className='font-normal'>
          {me.user.mobile?.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')} ·{' '}
          {current.roleName}
        </div>
      </MenuLabel>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      {THEMES.map((t) => (
        <MenuCheckItem
          key={t.value}
          checked={theme === t.value}
          onSelect={() => setTheme(t.value)}
        >
          <t.icon className='size-4 text-muted' /> {t.label}
        </MenuCheckItem>
      ))}
      <MenuSeparator />
      <MenuItem onSelect={() => setShortcutHelp(true)}>
        <Keyboard /> Keyboard shortcuts
      </MenuItem>
      <MenuItem onSelect={() => setChangingPassword(true)}>
        <KeyRound /> Change password
      </MenuItem>
      <MenuItem onSelect={signOut} destructive>
        <LogOut /> Sign out
      </MenuItem>
    </MenuContent>
  );

  const navLink = (n: NavItem, onClick?: () => void) => (
    <NavLink
      key={n.label}
      to={to(n.path)}
      end={n.path === ''}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
          isActive
            ? 'bg-subtle font-medium text-ink'
            : 'text-muted hover:bg-subtle hover:text-ink',
        )
      }
    >
      <n.icon className='size-4' />
      <span className='flex-1'>{n.label}</span>
      {n.soon && (
        <span className='rounded border border-border px-1 text-[10px] text-muted'>
          Soon
        </span>
      )}
      {/* Alt + this number opens the page. */}
      {/* How many are waiting on that page right now (the shortcut keys are in the "?" list). */}
      {!!waiting[n.path] && (
        <span
          className='rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground tabular-nums'
          title={WAITING_TITLE[n.path]}
        >
          {waiting[n.path]}
        </span>
      )}
    </NavLink>
  );

  const primary = items.filter((n) => n.primary).slice(0, 4);

  const rest = items.filter((n) => !primary.includes(n));

  return (
    <div className='min-h-dvh md:flex'>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className='sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex'>
        <div className='p-3'>{branchSwitcher}</div>
        <nav className='flex-1 overflow-y-auto px-3 py-2'>
          {NAV_GROUPS.map((g) => {
            const groupItems = items.filter((n) => n.group === g);
            if (!groupItems.length) return null;
            return (
              <div key={g} className='mb-4'>
                <div className='px-2 pb-1.5 text-xs font-medium text-muted'>
                  {g}
                </div>
                <div className='flex flex-col gap-0.5'>
                  {groupItems.map((n) => navLink(n))}
                </div>
              </div>
            );
          })}
        </nav>
        {newChoices.length > 0 && (
          <div className='px-3 pb-3'>
            <button
              onClick={openNew}
              className='flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
            >
              <Plus className='size-4' /> New
              <kbd className='rounded border border-primary-foreground/30 px-1 text-[10px] font-normal'>Ctrl K</kbd>
            </button>
          </div>
        )}
        <div className='border-t border-border p-3'>
          <Menu>
            <MenuTrigger asChild>
              <button className='flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-subtle data-[state=open]:bg-subtle'>
                <Avatar name={me.user.name} />
                <span className='min-w-0 flex-1 leading-tight'>
                  <span className='block truncate text-sm font-medium'>
                    {me.user.name}
                  </span>
                  <span className='block truncate text-xs text-muted'>
                    {current.roleName}
                  </span>
                </span>
                <MoreHorizontal className='size-4 text-muted' />
              </button>
            </MenuTrigger>
            {userMenu('top')}
          </Menu>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        {/* ---------- Top bar: breadcrumb on desktop, branch + user on phones ---------- */}
        <header className='sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-8'>
          <div className='min-w-0 flex-1 md:hidden'>{branchSwitcher}</div>
          <nav
            aria-label='Breadcrumb'
            className='hidden items-center gap-1.5 text-sm text-muted md:flex'
          >
            <Link to={to('')} className='hover:text-ink'>
              {current.name}
            </Link>
            {activeItem && activeItem.path !== '' && (
              <>
                <ChevronRight className='size-3.5' />
                <Link
                  to={to(activeItem.path)}
                  className={cn(
                    'hover:text-ink',
                    location.pathname.split('/').length <= 3 &&
                      'font-medium text-ink',
                  )}
                >
                  {activeItem.label}
                </Link>
              </>
            )}
            {location.pathname.split('/').length > 3 && (
              <>
                <ChevronRight className='size-3.5' />
                <span className='font-medium text-ink'>Details</span>
              </>
            )}
          </nav>
          <div className='md:hidden'>
            <Menu>
              <MenuTrigger asChild>
                <button aria-label='Account' className='rounded-full'>
                  <Avatar name={me.user.name} />
                </button>
              </MenuTrigger>
              {userMenu('bottom')}
            </Menu>
          </div>
        </header>

        <main className='mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10'>
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* ---------- Phone bottom bar ---------- */}
      <nav
        className='fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden'
        style={{
          gridTemplateColumns: `repeat(${primary.length + (rest.length ? 1 : 0)}, 1fr)`,
        }}
      >
        {primary.map((n) => (
          <NavLink
            key={n.label}
            to={to(n.path)}
            end={n.path === ''}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
                isActive ? 'text-ink' : 'text-muted',
              )
            }
          >
            <n.icon className='size-5' />
            {n.label}
          </NavLink>
        ))}
        {rest.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className='flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted'
          >
            <MoreHorizontal className='size-5' />
            More
          </button>
        )}
      </nav>

      <ChangePasswordDialog
        open={changingPassword}
        onOpenChange={setChangingPassword}
      />
      {current.permissions.includes('patient.create') && (
        <QuickOp branch={current.slug} open={quickOp} onClose={() => setQuickOp(false)} tabs={newTabs} />
      )}
      {direct && <DirectLab key={direct} mode={direct} branch={current.slug} open onClose={() => setDirect(null)} tabs={newTabs} />}
      <Shortcuts
        onQuickOp={newChoices.length ? openNew : undefined}
        pages={items.map((n) => to(n.path))}
        keys={{
          ...(current.permissions.includes('billing.receive') ? { F2: to('billing') } : {}),
          ...(current.permissions.includes('pharmacy.sell') ? { F3: to('pharmacy') } : {}),
        }}
        newPatientPath={
          current.permissions.includes('patient.create')
            ? `${to('patients')}?add=1`
            : undefined
        }
        help={shortcutHelp}
        onHelp={setShortcutHelp}
      />

      {moreOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 md:hidden'
          onClick={() => setMoreOpen(false)}
        >
          <div
            className='absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='mx-auto mb-3 h-1 w-10 rounded-full bg-border' />
            <nav className='flex flex-col gap-0.5'>
              {rest.map((n) => navLink(n, () => setMoreOpen(false)))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function NoBranches() {
  const logout = useLogout();
  return (
    <div className='mx-auto mt-24 max-w-sm p-4 text-center'>
      <h1 className='text-lg font-semibold'>No branch assigned</h1>
      <p className='mt-1 text-sm text-muted'>
        Your account isn't added to any branch yet. Ask the owner to add you.
      </p>
      <button
        onClick={() => logout.mutate()}
        className='mt-4 text-sm text-brand'
      >
        Sign out
      </button>
    </div>
  );
}
