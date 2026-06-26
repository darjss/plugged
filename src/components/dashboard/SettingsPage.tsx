import { createMutation, createQuery } from "@tanstack/solid-query";
import { createSignal, createMemo, For, Show } from "solid-js";
import { toast } from "solid-sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SettingsStatus = {
  deliveryFee: number;
  qpayConfigured: boolean;
  smsConfigured: boolean;
  posthogConfigured: boolean;
  aiSearchConfigured: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phoneNumber: string | null;
};

const fmtMnt = (value: number) => new Intl.NumberFormat("mn-MN").format(value);

function StatusBadge(props: { configured: boolean }) {
  return (
    <Badge variant={props.configured ? "success" : "warning"}>
      {props.configured ? "Configured" : "Not configured"}
    </Badge>
  );
}

function SettingsSection() {
  const settings = createQuery(() => ({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await api.admin.settings.get();
      if (error) throw error;
      return data as SettingsStatus;
    },
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store configuration</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <Show
          when={settings.data}
          fallback={
            <div class="font-mono text-sm text-muted-foreground">Loading configuration…</div>
          }
        >
          {(status) => (
            <>
              <div class="flex items-center justify-between gap-4 border-b border-ink/20 pb-3">
                <div class="flex flex-col">
                  <span class="font-heading text-sm uppercase tracking-wide text-ink">
                    Delivery fee
                  </span>
                  <span class="font-mono text-xs text-muted-foreground">
                    Flat rate, read-only for now
                  </span>
                </div>
                <div class="font-mono text-lg font-black text-ink">
                  {fmtMnt(status().deliveryFee)} ₮
                </div>
              </div>
              <ConfigRow label="QPay" status={status().qpayConfigured} />
              <ConfigRow label="SMS gateway" status={status().smsConfigured} />
              <ConfigRow label="PostHog" status={status().posthogConfigured} />
              <ConfigRow label="AI Search" status={status().aiSearchConfigured} />
            </>
          )}
        </Show>
      </CardContent>
    </Card>
  );
}

function ConfigRow(props: { label: string; status: boolean }) {
  return (
    <div class="flex items-center justify-between gap-4 border-b border-ink/20 pb-3 last:border-0 last:pb-0">
      <span class="font-heading text-sm uppercase tracking-wide text-ink">{props.label}</span>
      <StatusBadge configured={props.status} />
    </div>
  );
}

function AdminUsersSection(props: { currentUser: SessionUser | null }) {
  const [search, setSearch] = createSignal("");

  const users = createQuery(() => ({
    queryKey: ["admin", "users", { search: search() }],
    queryFn: async () => {
      const query = search() ? { search: search() } : undefined;
      const { data, error } = await api.admin.users.get({ query });
      if (error) throw error;
      return (data as { users: AdminUser[] }).users;
    },
  }));

  const toggleMutation = createMutation(() => ({
    mutationFn: async (args: { id: string; next: boolean }) => {
      const { data, error } = await api.admin.users({ id: args.id }).patch({
        body: { isAdmin: args.next },
      });
      if (error) throw error;
      return data as unknown as AdminUser;
    },
    onSuccess: (updated) => {
      toast.success(`${updated.email} admin ${updated.isAdmin ? "granted" : "revoked"}`);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to update admin flag";
      toast.error(message);
    },
    onSettled: () => {
      void users.refetch();
    },
  }));

  const isSelf = (id: string) => props.currentUser?.id === id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin access</CardTitle>
        <div class="flex flex-col gap-2 pt-1">
          <label for="admin-user-search" class="font-mono text-xs uppercase text-muted-foreground">
            Search users by email
          </label>
          <Input
            id="admin-user-search"
            placeholder="email@example.com"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
          <Show when={search()}>
            <Button variant="outline" size="sm" class="self-start" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </Show>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <Show
          when={users.data}
          fallback={<div class="p-6 font-mono text-sm text-muted-foreground">Loading users…</div>}
        >
          {(rows) => (
            <Show
              when={rows().length > 0}
              fallback={
                <div class="p-6 font-mono text-sm text-muted-foreground">
                  No users match “{search()}”.
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead class="text-right">Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={rows()}>
                    {(user) => {
                      const self = createMemo(() => isSelf(user.id));
                      const pending = createMemo(
                        () => toggleMutation.isPending && toggleMutation.variables?.id === user.id,
                      );
                      return (
                        <TableRow>
                          <TableCell class="font-mono">{user.email}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "success" : "outline"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell class="text-right">
                            <Show
                              when={self()}
                              fallback={
                                <Switch
                                  checked={user.isAdmin}
                                  disabled={pending()}
                                  onChange={(checked) =>
                                    toggleMutation.mutate({
                                      id: user.id,
                                      next: checked,
                                    })
                                  }
                                />
                              }
                            >
                              <Tooltip>
                                <TooltipTrigger
                                  as={Switch}
                                  checked
                                  disabled
                                  aria-label="Cannot remove your own admin flag"
                                />
                                <TooltipContent>Cannot remove your own admin flag</TooltipContent>
                              </Tooltip>
                            </Show>
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  </For>
                </TableBody>
              </Table>
            </Show>
          )}
        </Show>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const session = createQuery(() => ({
    queryKey: ["dashboard", "session"],
    queryFn: async () => {
      const { data, error } = await api.dashboard.session.get();
      if (error) throw error;
      return data as { user: SessionUser } | null;
    },
  }));

  return (
    <div class={cn("mx-auto flex max-w-4xl flex-col gap-6")}>
      <SettingsSection />
      <AdminUsersSection currentUser={session.data?.user ?? null} />
    </div>
  );
}
