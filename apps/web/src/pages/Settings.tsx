import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useSearchParams } from 'react-router';
import { Building2, CircleUserRound, DatabaseBackup, KeyRound, MoreHorizontal, Plus, ShieldCheck, SlidersHorizontal, Trash2, UserCheck, UserCog, UserPlus, UserX, Users, History, Bookmark, Syringe, Wifi } from 'lucide-react';
import {
  ADMIN_ONLY_PERMISSIONS,
  ADMIN_ROLE_KEY,
  ALL_PERMISSIONS,
  branchInputSchema,
  CLINIC_PERMISSIONS,
  CORE_PERMISSIONS,
  ipAllowed,
  newStaffSchema,
  parseNetworks,
  ownerDetailsSchema,
  PERMISSION_LABELS,
  resetPasswordSchema,
  type BranchInfo,
  type BranchInput,
  type MeResponse,
  type NewStaffInput,
  type OwnerDetailsInput,
  type Permission,
  type RoleInfo,
  type StaffMember,
} from '@platform/shared';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDelete,
  Dialog,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  NativeSelect,
  PageHeader,
  Skeleton,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  TD,
  TH,
  THead,
  toast,
  TR,
} from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { ME_KEY, useBranch, useCan, useMe, useModuleOn } from '@/state/auth';
import { BranchSettings } from '@/components/BranchSettings';
import { BackupRestore } from '@/components/BackupRestore';
import { AuditLog } from '@/components/AuditLog';
import { BookmarkList } from '@/components/Bookmarks';
import { CourseTemplates } from '@/components/Courses';

export function Settings() {
  const { data: me } = useMe();
  const canStaff = useCan('users.manage');
  const canHeader = useCan('settings.manage');
  const coursesOn = useModuleOn('courses');
  const canAudit = useCan('audit.view');
  const canPrescribe = useCan('prescription.write');
  const current = useBranch();
  const isOwner = !!me?.user.isOwner;
  const first = canStaff ? 'staff' : canHeader ? 'print' : isOwner ? 'branches' : 'none';
  // ?tab=print#ready-made-charges (a link from elsewhere): that tab, scrolled to that box.
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div>
      <PageHeader title="Settings" description="Staff, branches and what each role is allowed to do." />
      {first === 'none' ? (
        <Card>
          <EmptyState icon={ShieldCheck} title="Nothing to manage here" description="Your role doesn't include staff management." />
        </Card>
      ) : (
        <Tabs value={params.get('tab') ?? first} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
          <TabsList className="mb-4 h-auto max-w-full flex-wrap">
            {canStaff && (
              <TabsTrigger value="staff">
                <Users className="size-4" /> Staff
              </TabsTrigger>
            )}
            {canHeader && (
              <TabsTrigger value="print">
                <SlidersHorizontal className="size-4" /> Branch settings
              </TabsTrigger>
            )}
            {canHeader && canPrescribe && (
              <TabsTrigger value="bookmarks">
                <Bookmark className="size-4" /> Bookmarks
              </TabsTrigger>
            )}
            {canHeader && coursesOn && (
              <TabsTrigger value="course-templates">
                <Syringe className="size-4" /> Course templates
              </TabsTrigger>
            )}
            {canHeader && (
              <TabsTrigger value="backup">
                <DatabaseBackup className="size-4" /> Backup
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="branches">
                <Building2 className="size-4" /> Branches
              </TabsTrigger>
            )}
            {(isOwner || canStaff) && (
              <TabsTrigger value="roles">
                <ShieldCheck className="size-4" /> Permissions
              </TabsTrigger>
            )}
            {canAudit && (
              <TabsTrigger value="log">
                <History className="size-4" /> Activity log
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="owner">
                <CircleUserRound className="size-4" /> Owner
              </TabsTrigger>
            )}
          </TabsList>
          {canStaff && (
            <TabsContent value="staff">
              <StaffTab />
            </TabsContent>
          )}
          {canHeader && current && (
            <TabsContent value="print">
              <BranchSettings branch={current.slug} branchName={current.name} />
            </TabsContent>
          )}
          {canHeader && canPrescribe && current && (
            <TabsContent value="bookmarks">
              <BookmarkList branch={current.slug} />
            </TabsContent>
          )}
          {canHeader && coursesOn && current && (
            <TabsContent value="course-templates">
              <CourseTemplates branch={current.slug} />
            </TabsContent>
          )}
          {canHeader && current && (
            <TabsContent value="backup">
              <BackupRestore branch={current.slug} />
            </TabsContent>
          )}
          {isOwner && (
            <TabsContent value="branches">
              <BranchesTab />
            </TabsContent>
          )}
          {(isOwner || canStaff) && (
            <TabsContent value="roles">
              <RolesTab />
            </TabsContent>
          )}
          {canAudit && current && (
            <TabsContent value="log">
              <AuditLog branch={current.slug} />
            </TabsContent>
          )}
          {isOwner && me && (
            <TabsContent value="owner">
              <OwnerTab me={me} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff of this branch
// ---------------------------------------------------------------------------

function useRoles(branch: string) {
  return useQuery({ queryKey: ['roles', branch], queryFn: () => api.get<{ roles: RoleInfo[] }>(`/b/${branch}/roles`) });
}

function StaffTab() {
  const { branch } = useParams();
  const current = useBranch();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [roleFor, setRoleFor] = useState<StaffMember | null>(null);
  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [removeFor, setRemoveFor] = useState<StaffMember | null>(null);
  const [deactivateFor, setDeactivateFor] = useState<StaffMember | null>(null);

  const staff = useQuery({ queryKey: ['staff', branch], queryFn: () => api.get<{ staff: StaffMember[] }>(`/b/${branch}/staff`) });
  const roles = useRoles(branch!);
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff', branch] });

  const setActive = useMutation({
    mutationFn: ({ s, active }: { s: StaffMember; active: boolean }) => api.post(`/b/${branch}/staff/${s.userId}/${active ? 'activate' : 'deactivate'}`),
    onSuccess: (_d, { s, active }) => {
      refresh();
      setDeactivateFor(null);
      toast.success(active ? `${s.name} can sign in again` : `${s.name} deactivated`, { description: active ? undefined : 'Signed out everywhere and cannot sign in.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (s: StaffMember) => api.delete(`/b/${branch}/staff/${s.userId}`),
    onSuccess: (_d, s) => {
      refresh();
      setRemoveFor(null);
      toast.success(`${s.name} removed from ${current?.name}`);
    },
  });

  return (
    <Card>
      <CardHeader
        title={`Staff at ${current?.name}`}
        description="People who can sign in to this branch, and their role here."
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus /> Add staff
          </Button>
        }
      />
      {staff.isLoading ? (
        <div className="space-y-3 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : staff.error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(staff.error)}</p>
      ) : !staff.data?.staff.length ? (
        <EmptyState icon={Users} title="No staff yet" description="Add the doctors, front desk and others who work at this branch." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Role</TH>
              <TH className="hidden sm:table-cell">Added</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {staff.data.staff.map((s) => {
              const self = s.userId === me?.user.id;
              return (
                <TR key={s.userId} className={s.isActive ? '' : 'opacity-60'}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {s.name} {self && <span className="text-xs font-normal text-muted">(you)</span>}
                        </div>
                        <div className="text-xs text-muted tabular-nums">{s.mobile.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')}</div>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={s.roleKey === 'doctor' ? 'brand' : s.roleKey === 'branch_admin' ? 'violet' : 'neutral'}>{s.roleName}</Badge>
                      {!s.isActive && <Badge tone="critical" dot>Inactive</Badge>}
                    </div>
                  </TD>
                  <TD className="hidden text-muted sm:table-cell">{new Date(s.addedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</TD>
                  <TD className="text-right">
                    {!self && (
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${s.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </MenuTrigger>
                        <MenuContent align="end">
                          <MenuItem onSelect={() => setRoleFor(s)}>
                            <UserCog /> Change role
                          </MenuItem>
                          <MenuItem onSelect={() => setResetFor(s)}>
                            <KeyRound /> Reset password
                          </MenuItem>
                          {s.isActive ? (
                            <MenuItem onSelect={() => setDeactivateFor(s)}>
                              <UserX /> Deactivate
                            </MenuItem>
                          ) : (
                            <MenuItem onSelect={() => setActive.mutate({ s, active: true })}>
                              <UserCheck /> Activate
                            </MenuItem>
                          )}
                          <MenuItem destructive onSelect={() => setRemoveFor(s)}>
                            <Trash2 /> Remove from branch
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <Dialog open={adding} onOpenChange={setAdding} title="Add staff" description={`They sign in to ${current?.name} with their mobile number and this password.`}>
        <AddStaffForm
          roles={roles.data?.roles ?? []}
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await api.post(`/b/${branch}/staff`, v);
            refresh();
            setAdding(false);
            toast.success(`${v.name} added`, { description: `They sign in with ${v.mobile} — share the password with them in person.` });
          }}
        />
      </Dialog>

      <Dialog open={!!roleFor} onOpenChange={(o) => !o && setRoleFor(null)} title={`Change role · ${roleFor?.name ?? ''}`} description="Takes effect immediately.">
        {roleFor && (
          <ChangeRoleForm
            member={roleFor}
            roles={roles.data?.roles ?? []}
            onCancel={() => setRoleFor(null)}
            onSubmit={async (roleId) => {
              await api.patch(`/b/${branch}/staff/${roleFor.userId}`, { roleId });
              refresh();
              toast.success(`${roleFor.name} is now ${roles.data?.roles.find((r) => r.id === roleId)?.name}`);
              setRoleFor(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)} title={`Reset password · ${resetFor?.name ?? ''}`} description="They will be signed out everywhere and must use the new password.">
        {resetFor && (
          <ResetPasswordForm
            onCancel={() => setResetFor(null)}
            onSubmit={async (password) => {
              await api.post(`/b/${branch}/staff/${resetFor.userId}/reset-password`, { password });
              toast.success(`Password reset for ${resetFor.name}`);
              setResetFor(null);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={!!deactivateFor}
        onOpenChange={(o) => !o && setDeactivateFor(null)}
        title={`Deactivate ${deactivateFor?.name ?? ''}?`}
        description="They are signed out everywhere and can't sign in until activated again. Their records stay."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeactivateFor(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={setActive.isPending} onClick={() => deactivateFor && setActive.mutate({ s: deactivateFor, active: false })}>
            <UserX /> Deactivate
          </Button>
        </div>
      </Dialog>
      <ConfirmDelete
        open={!!removeFor}
        onOpenChange={(o) => !o && setRemoveFor(null)}
        title={`Remove ${removeFor?.name ?? ''} from ${current?.name}?`}
        description="They can no longer open this branch. Their account and their work in the records stay."
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => removeFor && remove.mutate(removeFor)}
      />
    </Card>
  );
}

/** Put server field errors on the right inputs, everything else at the bottom. */
function applyServerError(err: unknown, setError: (name: never, e: { message: string }) => void) {
  if (err instanceof ApiError && err.fields) {
    for (const [field, msgs] of Object.entries(err.fields)) setError(field as never, { message: msgs[0]! });
  } else {
    setError('root' as never, { message: errorMessage(err) });
  }
}

function FormButtons({ onCancel, submitting, label }: { onCancel: () => void; submitting: boolean; label: string }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : label}
      </Button>
    </div>
  );
}

function AddStaffForm({ roles, onSubmit, onCancel }: { roles: RoleInfo[]; onSubmit: (v: NewStaffInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewStaffInput>({ resolver: zodResolver(newStaffSchema) });
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => onSubmit(v).catch((e) => applyServerError(e, setError as never)))}>
      <Field required label="Full name" htmlFor="staff-name" error={errors.name?.message} className="sm:col-span-2">
        <Input id="staff-name" autoFocus placeholder="e.g. Dr. Priya Sharma" {...register('name')} />
      </Field>
      <Field required label="Mobile number" htmlFor="staff-mobile" error={errors.mobile?.message} hint="Their own number — used to sign in">
        <Input id="staff-mobile" type="tel" inputMode="tel" placeholder="98765 43210" {...register('mobile')} />
      </Field>
      <Field required label="Role" htmlFor="staff-role" error={errors.roleId?.message}>
        <NativeSelect id="staff-role" defaultValue="" {...register('roleId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}>
          <option value="" disabled>
            Choose a role
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field required label="Temporary password" htmlFor="staff-password" error={errors.password?.message} hint="At least 8 characters. They can change it after signing in." className="sm:col-span-2">
        <Input id="staff-password" type="text" autoComplete="off" {...register('password')} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="sm:col-span-2">
        <FormButtons onCancel={onCancel} submitting={isSubmitting} label="Add staff" />
      </div>
    </form>
  );
}

function ChangeRoleForm({ member, roles, onSubmit, onCancel }: { member: StaffMember; roles: RoleInfo[]; onSubmit: (roleId: number) => Promise<void>; onCancel: () => void }) {
  const [roleId, setRoleId] = useState(member.roleId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        await onSubmit(roleId).catch((err) => setError(errorMessage(err)));
        setPending(false);
      }}
    >
      <Field required label="Role" htmlFor="change-role">
        <NativeSelect id="change-role" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {error && <p className="text-sm text-critical">{error}</p>}
      <FormButtons onCancel={onCancel} submitting={pending} label="Save role" />
    </form>
  );
}

function ResetPasswordForm({ onSubmit, onCancel }: { onSubmit: (password: string) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ resolver: zodResolver(resetPasswordSchema) });
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit((v) => onSubmit(v.password).catch((e) => applyServerError(e, setError as never)))}>
      <Field required label="New password" htmlFor="reset-password" error={errors.password?.message} hint="At least 8 characters. Tell them in person.">
        <Input id="reset-password" type="text" autoComplete="off" autoFocus {...register('password')} />
      </Field>
      {errors.root && <p className="text-sm text-critical">{errors.root.message}</p>}
      <FormButtons onCancel={onCancel} submitting={isSubmitting} label="Reset password" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Branches (owner)
// ---------------------------------------------------------------------------

function BranchesTab() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BranchInfo | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['org-branches'], queryFn: () => api.get<{ branches: BranchInfo[] }>('/org/branches') });
  // The platform admin's limit: at it, the button gives way to "contact support" (the server refuses anyway).
  const maxBranches = useMe().data?.organization.maxBranches ?? null;
  const atLimit = maxBranches != null && (data?.branches ?? []).filter((b) => b.isActive).length >= maxBranches;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['org-branches'] });
    qc.invalidateQueries({ queryKey: ['me'] }); // the branch switcher picks up new names/branches
  };

  return (
    <Card>
      <CardHeader
        title="Branches"
        description="Every branch keeps its own patients, visits and records."
        action={
          atLimit ? (
            <span className="text-right text-xs text-muted">
              Your plan has {maxBranches} branch{maxBranches === 1 ? '' : 'es'}.
              <br />
              Need more? Please contact support.
            </span>
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add branch
            </Button>
          )
        }
      />
      {isLoading ? (
        <div className="space-y-3 p-4">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Branch</TH>
              <TH className="hidden md:table-cell">Contact</TH>
              <TH>Staff</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {data!.branches.map((b) => (
              <TR key={b.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg border border-border text-sm font-semibold">{b.name.charAt(0)}</span>
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="font-mono text-xs text-muted">/{b.slug}</div>
                    </div>
                  </div>
                </TD>
                <TD className="hidden text-muted md:table-cell">
                  <div className="truncate">{b.address ?? '—'}</div>
                  <div className="text-xs">{b.phone ?? ''}</div>
                </TD>
                <TD className="tabular-nums">
                  {b.staffCount}
                  {b.allowedNetworks && (
                    <Badge tone="brand" className="ml-2">
                      <Wifi className="size-3" /> Network lock
                    </Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                    Edit
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={adding} onOpenChange={setAdding} title="Add branch" description="You can open it right away from the branch switcher.">
        <BranchForm
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await api.post('/org/branches', v);
            refresh();
            setAdding(false);
            toast.success(`${v.name} added`);
          }}
        />
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={`Edit ${editing?.name ?? ''}`}>
        {editing && (
          <BranchForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async ({ name, address, phone }) => {
              await api.patch(`/org/branches/${editing.id}`, { name, address, phone });
              refresh();
              setEditing(null);
              toast.success('Branch saved');
            }}
          />
        )}
        {editing && <NetworkLock key={editing.id} branch={editing} onSaved={refresh} />}
      </Dialog>
    </Card>
  );
}

/**
 * Network lock of one branch (owner only): its pages open only on the hospital's own Wi-Fi / LAN. The owner and
 * branch admins are never locked; other roles only with "Work from outside the hospital network".
 */
function NetworkLock({ branch, onSaved }: { branch: BranchInfo; onSaved: () => void }) {
  const mine = useQuery({ queryKey: ['my-network'], queryFn: () => api.get<{ ip: string | null; suggestion: string | null }>('/org/my-network'), staleTime: 0 });
  const [on, setOn] = useState(!!branch.allowedNetworks);
  const [text, setText] = useState(branch.allowedNetworks ?? '');
  const { list, bad } = parseNetworks(text);
  const here = mine.data?.ip ?? null;
  const hereOk = here ? ipAllowed(here, list) : null;
  const save = useMutation({
    mutationFn: () => api.patch(`/org/branches/${branch.id}`, { allowedNetworks: on ? text : null }),
    onSuccess: () => {
      onSaved();
      toast.success(on ? `Network lock on for ${branch.name}` : `Network lock off for ${branch.name}`, { description: on ? 'Staff outside these networks are stopped at once.' : 'Staff can work from anywhere again.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const changed = on !== !!branch.allowedNetworks || (on && list.join('\n') !== (branch.allowedNetworks ?? ''));
  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Wifi className="size-4" /> Network lock
          </div>
          <p className="mt-0.5 text-sm text-muted">Staff can open this branch only on the hospital's own Wi-Fi or network. You and branch admins are never locked. To let someone else work from outside, tick “{PERMISSION_LABELS['access.anywhere']}” for their role on the Permissions page.</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" role="switch" className="size-5 accent-[var(--color-primary)]" checked={on} onChange={(e) => { setOn(e.target.checked); if (e.target.checked && !text && mine.data?.suggestion) setText(mine.data.suggestion); }} />
          {on ? 'On' : 'Off'}
        </label>
      </div>
      {on && (
        <div className="mt-3 space-y-2">
          <Field label="Allowed networks" htmlFor="networks" hint="One per line, like 192.168.1.0/24 (the whole Wi-Fi) or 192.168.1.20 (one computer)." error={bad.length ? `Not a network: ${bad.join(', ')}` : undefined}>
            <textarea id="networks" rows={3} className="w-full rounded-lg border border-border bg-background p-2 font-mono text-sm outline-none focus-visible:border-ring" value={text} onChange={(e) => setText(e.target.value)} placeholder="192.168.1.0/24" />
          </Field>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {here && (
              <span className={hereOk ? 'text-positive' : 'text-warning'}>
                This computer is {here}: {hereOk ? 'inside the allowed networks' : 'not inside them (you are never locked, your staff here would be)'}
              </span>
            )}
            {mine.data?.suggestion && !list.includes(mine.data.suggestion) && (
              <Button type="button" size="sm" variant="outline" onClick={() => setText([...list, mine.data!.suggestion!].join('\n'))}>
                Add this computer's network ({mine.data.suggestion})
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="button" variant={changed ? 'default' : 'outline'} disabled={!changed || save.isPending || (on && (!list.length || bad.length > 0))} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save network lock'}
        </Button>
      </div>
    </div>
  );
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/branch/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

function BranchForm({ initial, onSubmit, onCancel }: { initial?: BranchInfo; onSubmit: (v: BranchInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchInputSchema),
    defaultValues: { name: initial?.name ?? '', slug: initial?.slug ?? '', address: initial?.address ?? '', phone: initial?.phone ?? '' },
  });
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => onSubmit(v).catch((e) => applyServerError(e, setError as never)))}>
      <Field required label="Branch name" htmlFor="branch-name" error={errors.name?.message}>
        <Input
          id="branch-name"
          autoFocus
          placeholder="e.g. Tiruppur branch"
          {...register('name', {
            onChange: (e) => {
              if (!initial && !getFieldState('slug').isDirty) setValue('slug', slugify(e.target.value));
            },
          })}
        />
      </Field>
      <Field required label="Web address" htmlFor="branch-slug" error={errors.slug?.message} hint={initial ? "Can't be changed later" : 'Short name used in links'}>
        <Input id="branch-slug" disabled={!!initial} className="font-mono" {...register('slug')} />
      </Field>
      <Field label="Address" htmlFor="branch-address" error={errors.address?.message} className="sm:col-span-2">
        <Input id="branch-address" {...register('address')} />
      </Field>
      <Field label="Phone" htmlFor="branch-phone" error={errors.phone?.message}>
        <Input id="branch-phone" inputMode="tel" {...register('phone')} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="sm:col-span-2">
        <FormButtons onCancel={onCancel} submitting={isSubmitting} label={initial ? 'Save branch' : 'Add branch'} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Roles & permissions (owner)
// ---------------------------------------------------------------------------

const GROUPS: { title: string; permissions: readonly Permission[] }[] = [
  { title: 'Clinic', permissions: CLINIC_PERMISSIONS },
  { title: 'Administration', permissions: CORE_PERMISSIONS },
];

/**
 * What each role may do. The owner: "All branches" (one list every branch follows) or one branch (that branch
 * only). A branch admin: their own branch, every role except the Branch admin role.
 * A mistake: "Discard" before saving; after saving, "Undo last save" puts back what was there.
 */
function RolesTab() {
  const qc = useQueryClient();
  const current = useBranch();
  const { data: me } = useMe();
  const isOwner = !!me?.user.isOwner;
  const branches = useQuery({ queryKey: ['org-branches'], queryFn: () => api.get<{ branches: BranchInfo[] }>('/org/branches'), enabled: isOwner });
  // 'all' = every branch (owner); else a branch id. A branch admin is always on their own branch.
  const [scope, setScope] = useState<'all' | number | null>(null);
  // The owner starts on the common list for every branch.
  const sel: 'all' | number | 'mine' = !isOwner ? 'mine' : (scope ?? 'all');
  const scopeName = sel === 'all' ? 'all branches' : sel === 'mine' ? (current?.name ?? 'this branch') : (branches.data?.branches.find((b) => b.id === sel)?.name ?? '');
  const url = sel === 'all' ? '/org/roles' : sel === 'mine' ? `/b/${current?.slug}/roles` : `/org/branches/${sel}/roles`;
  const { data, isLoading, error } = useQuery({ queryKey: ['org-roles', sel], queryFn: () => api.get<{ roles: RoleInfo[] }>(url), enabled: !!current && (!isOwner || !branches.isLoading) });
  const [draft, setDraft] = useState<Record<number, Set<Permission>>>({});
  // What was there before the last save, to put it back.
  const [before, setBefore] = useState<{ sel: typeof sel; roles: RoleInfo[] } | null>(null);
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.roles.map((r) => [r.id, new Set(r.permissions)])));
  }, [data]);
  const locked = (r: RoleInfo) => !isOwner && r.key === ADMIN_ROLE_KEY; // a branch admin cannot change their own role

  const changed = useMemo(
    () => (data?.roles ?? []).filter((r) => {
      const d = draft[r.id];
      return d && !locked(r) && (d.size !== r.permissions.length || r.permissions.some((p) => !d.has(p)));
    }),
    [data, draft],
  );
  const put = (s: typeof sel, roleId: number, body: unknown) =>
    api.put(s === 'all' ? `/org/roles/${roleId}/permissions` : s === 'mine' ? `/b/${current!.slug}/roles/${roleId}/permissions` : `/org/branches/${s}/roles/${roleId}/permissions`, body);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['org-roles'] });
    qc.invalidateQueries({ queryKey: ['roles'] });
    qc.invalidateQueries({ queryKey: ['me'] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const prev = { sel, roles: changed.map((r) => ({ ...r })) };
      await Promise.all(changed.map((r) => put(sel, r.id, sel === 'all' ? { permissions: [...draft[r.id]!], allBranches: true } : { permissions: [...draft[r.id]!] })));
      return prev;
    },
    onSuccess: (prev) => {
      setBefore(prev);
      refresh();
      toast.success(`Permissions saved · ${scopeName}`, { description: sel === 'all' ? 'Every branch follows this list now.' : 'Only this branch changes. Staff get it on their next page load.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const undo = useMutation({
    mutationFn: () => Promise.all(before!.roles.map((r) => (before!.sel !== 'all' && !r.custom ? put(before!.sel, r.id, { reset: true }) : put(before!.sel, r.id, before!.sel === 'all' ? { permissions: r.permissions } : { permissions: r.permissions })))),
    onSuccess: () => (setBefore(null), refresh(), toast.success('Put back as it was before the last save')),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reset = useMutation({
    mutationFn: (r: RoleInfo) => put(sel, r.id, { reset: true }),
    onSuccess: (_d, r) => (setBefore({ sel, roles: [{ ...r }] }), refresh(), toast.success(`${r.name}: back to the usual permissions`)),
    onError: (e) => toast.error(errorMessage(e)),
  });

  function toggle(roleId: number, p: Permission) {
    setDraft((d) => {
      const next = new Set(d[roleId]);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return { ...d, [roleId]: next };
    });
  }

  if (isLoading || branches.isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;

  return (
    <Card>
      <CardHeader
        title={`Permissions · ${scopeName[0]!.toUpperCase()}${scopeName.slice(1)}`}
        description={
          sel === 'all'
            ? 'One list for every branch. Saving here makes every branch follow it (a branch’s own changes for that role go).'
            : 'What each role may do in this branch only. The owner always has everything.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <NativeSelect aria-label="Which branches" className="h-9 w-auto min-w-44" value={String(sel)} disabled={changed.length > 0} title={changed.length ? 'Save or discard first' : undefined} onChange={(e) => (setBefore(null), setScope(e.target.value === 'all' ? 'all' : Number(e.target.value)))}>
                <option value="all">All branches</option>
                {(branches.data?.branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    Only {b.name}
                  </option>
                ))}
              </NativeSelect>
            )}
            {changed.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setDraft(Object.fromEntries(data.roles.map((r) => [r.id, new Set(r.permissions)])))}>
                Discard changes
              </Button>
            )}
            <Button size="sm" disabled={!changed.length || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Saving…' : changed.length ? `Save ${changed.length} role${changed.length > 1 ? 's' : ''}` : 'Saved'}
            </Button>
          </div>
        }
      />
      {before && before.sel === sel && changed.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-warning-soft/50 px-4 py-2 text-sm">
          <span>Saved. Clicked something by mistake?</span>
          <Button size="sm" variant="outline" disabled={undo.isPending} onClick={() => undo.mutate()}>
            Undo last save
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle/60">
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-subtle px-4 py-2.5 text-left text-xs font-medium text-muted">Permission</th>
              {data.roles.map((r) => (
                <th key={r.id} className="px-3 py-2 text-center text-xs font-medium whitespace-nowrap">
                  <div>{r.name}</div>
                  {sel === 'all' ? null : locked(r) ? (
                    <div className="mt-0.5 text-[11px] font-normal text-muted">Owner sets this</div>
                  ) : r.custom ? (
                    <button type="button" className="mt-0.5 text-[11px] font-normal text-brand hover:underline" disabled={reset.isPending} onClick={() => reset.mutate(r)} title="This branch has its own list for this role. Reset = the usual list.">
                      This branch only · Reset
                    </button>
                  ) : (
                    <div className="mt-0.5 text-[11px] font-normal text-muted">Usual</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => [
              <tr key={g.title} className="border-b border-border">
                <td colSpan={data.roles.length + 1} className="px-4 pt-4 pb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                  {g.title}
                </td>
              </tr>,
              ...g.permissions.map((p) => (
                <tr key={p} className="border-b border-border hover:bg-subtle/40">
                  <td className="sticky left-0 bg-surface px-4 py-2.5 whitespace-nowrap">{PERMISSION_LABELS[p]}</td>
                  {data.roles.map((r) => (
                    <td key={r.id} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        disabled={locked(r) || (r.key !== ADMIN_ROLE_KEY && (ADMIN_ONLY_PERMISSIONS as readonly string[]).includes(p))}
                        title={r.key !== ADMIN_ROLE_KEY && (ADMIN_ONLY_PERMISSIONS as readonly string[]).includes(p) ? 'Only the Branch admin role (and the owner) can manage staff and roles' : undefined}
                        aria-label={`${r.name}: ${PERMISSION_LABELS[p]}`}
                        className="size-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                        checked={draft[r.id]?.has(p) ?? false}
                        onChange={() => toggle(r.id, p)}
                      />
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted">{ALL_PERMISSIONS.length} permissions · {sel === 'all' ? 'changes apply to the staff of every branch' : `changes apply to the staff of ${scopeName} only`}.</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Owner details (owner)
// ---------------------------------------------------------------------------

const ownerValues = (me: MeResponse): OwnerDetailsInput => ({
  organizationName: me.organization.name,
  name: me.user.name,
  mobile: me.user.mobile.replace(/^\+91(\d{5})(\d{5})$/, '$1 $2'),
});

function OwnerTab({ me }: { me: MeResponse }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OwnerDetailsInput>({ resolver: zodResolver(ownerDetailsSchema), defaultValues: ownerValues(me) });

  async function save(v: OwnerDetailsInput) {
    const saved = await api.patch<MeResponse>('/org/owner', v);
    qc.setQueryData(ME_KEY, saved); // sidebar, organization name and user menu update at once
    reset(ownerValues(saved));
    toast.success('Owner details saved');
  }

  return (
    <Card>
      <CardHeader title="Owner details" description="Your own name and sign-in number, and the name of your organization." />
      <form noValidate className="grid gap-4 p-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save(v).catch((e) => applyServerError(e, setError as never)))}>
        <Field required label="Organization name" htmlFor="owner-org" error={errors.organizationName?.message} className="sm:col-span-2">
          <Input id="owner-org" {...register('organizationName')} />
        </Field>
        <Field required label="Your name" htmlFor="owner-name" error={errors.name?.message}>
          <Input id="owner-name" autoComplete="name" {...register('name')} />
        </Field>
        <Field required label="Mobile number (login)" htmlFor="owner-mobile" error={errors.mobile?.message} hint="This is the number you use to sign in">
          <Input id="owner-mobile" type="tel" inputMode="tel" placeholder="98765 43210" {...register('mobile')} />
        </Field>
        {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
