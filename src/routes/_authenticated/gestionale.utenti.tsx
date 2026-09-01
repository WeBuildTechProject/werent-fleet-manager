import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { branchesQuery, logAudit, myRolesQuery, roleLabels, type AppRole } from "@/lib/gestionale";
import { hasCapability, highestRole, rolePriority } from "@/lib/roles";
import { listStaffMembers, updateStaffProfile, type StaffMemberRow } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/gestionale/utenti")({
  component: UsersPage,
});

const ALL = "__all__";
const NO_BRANCH = "__none__";

const staffQuery = {
  queryKey: ["gestionale", "staff"] as const,
  queryFn: async (): Promise<StaffMemberRow[]> => listStaffMembers({ data: undefined }),
};

function UsersPage() {
  const queryClient = useQueryClient();
  const staff = useQuery(staffQuery);
  const branches = useQuery(branchesQuery);
  const { data: myRoles } = useQuery(myRolesQuery);
  const canManage = hasCapability(myRoles, "manage_roles");
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const saveProfile = useServerFn(updateStaffProfile);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: staffQuery.queryKey });
    queryClient.invalidateQueries({ queryKey: myRolesQuery.queryKey });
  };

  const toggleRole = useMutation({
    mutationFn: async ({ member, role }: { member: StaffMemberRow; role: AppRole }) => {
      const has = member.roles.includes(role);
      if (has) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", member.id)
          .eq("role", role);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: member.id, role });
        if (error) throw new Error(error.message);
      }
      await logAudit(has ? "role_revoke" : "role_grant", "user_roles", member.id);
      return !has;
    },
    onSuccess: (granted) => {
      invalidate();
      toast.success(granted ? "Ruolo assegnato" : "Ruolo revocato");
    },
    onError: (e: Error) => toast.error("Modifica non riuscita", { description: e.message }),
  });

  const updateProfile = useMutation({
    mutationFn: (input: { userId: string; assignedBranchId?: string | null; active?: boolean }) =>
      saveProfile({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Profilo aggiornato");
    },
    onError: (e: Error) => toast.error("Aggiornamento non riuscito", { description: e.message }),
  });

  const term = q.trim().toLowerCase();
  const rows = (staff.data ?? []).filter((m) => {
    if (term && !m.full_name.toLowerCase().includes(term) && !m.email.toLowerCase().includes(term))
      return false;
    if (branchFilter === NO_BRANCH && m.assigned_branch_id) return false;
    if (branchFilter !== ALL && branchFilter !== NO_BRANCH && m.assigned_branch_id !== branchFilter)
      return false;
    if (statusFilter === "active" && !m.active) return false;
    if (statusFilter === "disabled" && m.active) return false;
    return true;
  });

  return (
    <AdminShell
      section="utenti"
      title="Utenti e ruoli"
      subtitle="Ruoli, sede assegnata e stato degli account operatore"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-52" aria-label="Filtra per sede">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutte le sedi (filtro)</SelectItem>
              <SelectItem value={NO_BRANCH}>Senza restrizione</SelectItem>
              {(branches.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="Filtra per stato">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti gli stati</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="disabled">Disattivati</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome o email"
            className="w-56"
            aria-label="Cerca utente"
          />
        </div>
      }
    >
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operatore</TableHead>
              <TableHead>Sede assegnata</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Ruolo principale</TableHead>
              <TableHead>Ruoli assegnati</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const top = highestRole(m.roles);
              const unrestrictedByRole =
                m.roles.includes("admin") || m.roles.includes("super_admin");
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-semibold">{m.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.assigned_branch_id ?? ALL}
                      disabled={!canManage || updateProfile.isPending}
                      onValueChange={(value) =>
                        updateProfile.mutate({
                          userId: m.id,
                          assignedBranchId: value === ALL ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="w-52" aria-label="Sede assegnata">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Tutte le sedi</SelectItem>
                        {(branches.data ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {unrestrictedByRole ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ruolo di supervisione: vede sempre tutte le sedi.
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={m.active}
                        disabled={!canManage || updateProfile.isPending}
                        onCheckedChange={(value) =>
                          updateProfile.mutate({ userId: m.id, active: value })
                        }
                        aria-label="Account attivo"
                      />
                      <span className="text-sm text-muted-foreground">
                        {m.active ? "Attivo" : "Disattivato"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {top ? <Badge variant="secondary">{roleLabels[top]}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {rolePriority.map((role) => {
                        const active = m.roles.includes(role);
                        return (
                          <Button
                            key={role}
                            size="sm"
                            variant={active ? "default" : "outline"}
                            disabled={!canManage || toggleRole.isPending}
                            onClick={() => toggleRole.mutate({ member: m, role })}
                          >
                            {roleLabels[role]}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nessun operatore trovato.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        La sede assegnata è facoltativa: se impostata su «Tutte le sedi» l&apos;operatore vede
        l&apos;intera attività. Admin e Super Admin non sono mai ristretti. Solo Admin e Super Admin
        possono modificare ruoli, sede e stato; ogni modifica è tracciata nel registro attività.
      </p>
    </AdminShell>
  );
}
