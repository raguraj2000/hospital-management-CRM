import { useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { Check, ChevronRight, ChevronsUpDown, KeyRound, LogOut, Moon, MoreHorizontal, Search, Sun, SunMoon } from 'lucide-react';
import { Avatar, cn, ErrorBoundary, Menu, MenuCheckItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@platform/ui';
import { NAV, NAV_GROUPS, type NavItem } from '@/nav';
import { useLogout, useMe } from '@/state/auth';
import { useTheme, type Theme } from '@/state/theme';
import { ChangePasswordDialog } from './ChangePassword';

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'auto', label: 'Auto (day light, night dark)', icon: SunMoon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function AppShell() {
  const { data: me } = useMe();
  const logout = useLogout();
  const { branch } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.user.isPlatformAdmin) return <Navigate to="/platform" replace />;
  const current = me.branches.find((b) => b.slug === branch);
  // A branch you can't open: go to your first branch, never show anything of it.
  if (!current) return me.branches[0] ? <Navigate to={`/${me.branches[0].slug}`} replace /> : <NoBranches />;

  const items = NAV.filter((n) => current.permissions.includes(n.permission));
  const to = (path: string) => `/${current.slug}${path ? `/${path}` : ''}`;
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

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (current!.permissions.includes('patient.view')) navigate(`${to('patients')}?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
  }

  const branchBlock = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        {current.name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">{current.name}</span>
        <span className="block truncate text-xs text-muted">{me.organization.name}</span>
      </span>
    </>
  );
  // Only one branch to open: plain label, nothing to switch to.
  const branchSwitcher = me.branches.length <= 1 ? (
    <div className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left">{branchBlock}</div>
  ) : (
    <Menu>
      <MenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-subtle data-[state=open]:bg-subtle">
          {branchBlock}
          <ChevronsUpDown className="size-4 shrink-0 text-muted" />
        </button>
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuLabel>Branches</MenuLabel>
        {me.branches.map((b) => (
          <MenuItem key={b.slug} onSelect={() => switchBranch(b.slug)}>
            <span className="flex size-6 items-center justify-center rounded-md border border-border text-xs font-medium">{b.name.charAt(0)}</span>
            <span className="flex-1 truncate">{b.name}</span>
            {b.slug === current.slug && <Check className="!text-ink" />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );

  const userMenu = (side: 'top' | 'bottom') => (
    <MenuContent side={side} align={side === 'top' ? 'start' : 'end'} className="w-56">
      <MenuLabel>
        <div className="text-sm font-medium text-ink">{me.user.name}</div>
        <div className="font-normal">
          {me.user.mobile?.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')} · {current.roleName}
        </div>
      </MenuLabel>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      {THEMES.map((t) => (
        <MenuCheckItem key={t.value} checked={theme === t.value} onSelect={() => setTheme(t.value)}>
          <t.icon className="size-4 text-muted" /> {t.label}
        </MenuCheckItem>
      ))}
      <MenuSeparator />
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
          isActive ? 'bg-subtle font-medium text-ink' : 'text-muted hover:bg-subtle hover:text-ink',
        )
      }
    >
      <n.icon className="size-4" />
      <span className="flex-1">{n.label}</span>
      {n.soon && <span className="rounded border border-border px-1 text-[10px] text-muted">Soon</span>}
    </NavLink>
  );

  const primary = items.filter((n) => n.primary).slice(0, 4);
  const rest = items.filter((n) => !primary.includes(n));

  return (
    <div className="min-h-dvh md:flex">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="p-3">{branchSwitcher}</div>
        <form onSubmit={onSearch} className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute top-2.5 left-5.5 size-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients…"
            className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted/70 focus-visible:border-ring"
          />
        </form>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((g) => {
            const groupItems = items.filter((n) => n.group === g);
            if (!groupItems.length) return null;
            return (
              <div key={g} className="mb-4">
                <div className="px-2 pb-1.5 text-xs font-medium text-muted">{g}</div>
                <div className="flex flex-col gap-0.5">{groupItems.map((n) => navLink(n))}</div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Menu>
            <MenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-subtle data-[state=open]:bg-subtle">
                <Avatar name={me.user.name} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium">{me.user.name}</span>
                  <span className="block truncate text-xs text-muted">{current.roleName}</span>
                </span>
                <MoreHorizontal className="size-4 text-muted" />
              </button>
            </MenuTrigger>
            {userMenu('top')}
          </Menu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Top bar: breadcrumb on desktop, branch + user on phones ---------- */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-8">
          <div className="min-w-0 flex-1 md:hidden">{branchSwitcher}</div>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted md:flex">
            <Link to={to('')} className="hover:text-ink">
              {current.name}
            </Link>
            {activeItem && activeItem.path !== '' && (
              <>
                <ChevronRight className="size-3.5" />
                <Link to={to(activeItem.path)} className={cn('hover:text-ink', location.pathname.split('/').length <= 3 && 'font-medium text-ink')}>
                  {activeItem.label}
                </Link>
              </>
            )}
            {location.pathname.split('/').length > 3 && (
              <>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-ink">Details</span>
              </>
            )}
          </nav>
          <div className="md:hidden">
            <Menu>
              <MenuTrigger asChild>
                <button aria-label="Account" className="rounded-full">
                  <Avatar name={me.user.name} />
                </button>
              </MenuTrigger>
              {userMenu('bottom')}
            </Menu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* ---------- Phone bottom bar ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${primary.length + (rest.length ? 1 : 0)}, 1fr)` }}>
        {primary.map((n) => (
          <NavLink
            key={n.label}
            to={to(n.path)}
            end={n.path === ''}
            className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2 text-[11px] font-medium', isActive ? 'text-ink' : 'text-muted')}
          >
            <n.icon className="size-5" />
            {n.label}
          </NavLink>
        ))}
        {rest.length > 0 && (
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted">
            <MoreHorizontal className="size-5" />
            More
          </button>
        )}
      </nav>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />

      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <nav className="flex flex-col gap-0.5">{rest.map((n) => navLink(n, () => setMoreOpen(false)))}</nav>
          </div>
        </div>
      )}
    </div>
  );
}

function NoBranches() {
  const logout = useLogout();
  return (
    <div className="mx-auto mt-24 max-w-sm p-4 text-center">
      <h1 className="text-lg font-semibold">No branch assigned</h1>
      <p className="mt-1 text-sm text-muted">Your account isn't added to any branch yet. Ask the owner to add you.</p>
      <button onClick={() => logout.mutate()} className="mt-4 text-sm text-brand">
        Sign out
      </button>
    </div>
  );
}
