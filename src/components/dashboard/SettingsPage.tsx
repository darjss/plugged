import { createMutation, createQuery } from "@tanstack/solid-query";
import { createSignal, createMemo, For, Show, onCleanup } from "solid-js";
import { toast } from "solid-sonner";
import { api, queryErrorMessage, unwrap } from "@/lib/api-client";
import type { AdminSessionUser as SessionUser } from "@/lib/admin-api";
import { cn, formatMnt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
    queryFn: () => unwrap(api.admin.settings.get()),
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
                  {formatMnt(status().deliveryFee)}
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
  // `search` is the immediate input value (updates on every keystroke
  // for responsive UI). `debouncedSearch` is the value actually sent to
  // the API — it lags 300ms behind the last keystroke so we don't fire
  // a query per character.
  const [search, setSearch] = createSignal("");
  const [debouncedSearch, setDebouncedSearch] = createSignal("");

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const updateSearch = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setDebouncedSearch(value), 300);
  };
  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  const users = createQuery(() => ({
    queryKey: ["admin", "users", { search: debouncedSearch() }],
    queryFn: async () => {
      const query = debouncedSearch() ? { search: debouncedSearch() } : undefined;
      const data = await unwrap(api.admin.users.get({ query }));
      return data.users;
    },
  }));

  // Pending grant/revoke awaiting confirmation. The Switch is controlled
  // by server data (`user.isAdmin`), so cancelling simply discards the
  // request and the toggle stays in its original visual state.
  const [pendingToggle, setPendingToggle] = createSignal<{
    id: string;
    email: string;
    next: boolean;
  } | null>(null);

  const toggleMutation = createMutation(() => ({
    mutationFn: (args: { id: string; next: boolean }) =>
      unwrap(api.admin.users({ id: args.id }).patch({ isAdmin: args.next })),
    onSuccess: (updated) => {
      toast.success(`${updated.email} admin ${updated.isAdmin ? "granted" : "revoked"}`);
    },
    onError: (err: unknown) => {
      toast.error(queryErrorMessage(err, "Failed to update admin flag"));
    },
    onSettled: () => {
      setPendingToggle(null);
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
            onInput={(e) => updateSearch(e.currentTarget.value)}
          />
          <Show when={search()}>
            <Button
              variant="outline"
              size="sm"
              class="self-start"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                if (debounceTimer) clearTimeout(debounceTimer);
              }}
            >
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
                  No users match “{debouncedSearch()}”.
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
                                    setPendingToggle({
                                      id: user.id,
                                      email: user.email,
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

      <ConfirmAdminToggleDialog
        request={pendingToggle()}
        pending={toggleMutation.isPending}
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => {
          const request = pendingToggle();
          if (request) toggleMutation.mutate({ id: request.id, next: request.next });
        }}
      />
    </Card>
  );
}

function ConfirmAdminToggleDialog(props: {
  request: { id: string; email: string; next: boolean } | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={Boolean(props.request)}
      onOpenChange={(open) => {
        if (!open && !props.pending) props.onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {props.request?.next ? "Grant admin access?" : "Revoke admin access?"}
          </DialogTitle>
          <DialogDescription>
            {props.request?.next
              ? `${props.request.email} will get full access to the dashboard, including orders, products, and admin management.`
              : `${props.request?.email} will immediately lose access to the dashboard.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel} disabled={props.pending}>
            Cancel
          </Button>
          <Button
            variant={props.request?.next ? "default" : "destructive"}
            disabled={props.pending}
            onClick={props.onConfirm}
          >
            <Show
              when={props.pending}
              fallback={props.request?.next ? "Grant admin" : "Revoke admin"}
            >
              <Spinner class="size-4" /> Saving…
            </Show>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const session = createQuery(() => ({
    queryKey: ["dashboard", "session"],
    queryFn: () => unwrap(api.dashboard.session.get()),
  }));

  return (
    <div class={cn("mx-auto flex max-w-4xl flex-col gap-6")}>
      <SettingsSection />
      <AdminUsersSection currentUser={session.data?.user ?? null} />
    </div>
  );
}
