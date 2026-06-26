import { useNavigate, useParams } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { toast } from "solid-sonner";
import { api } from "@/lib/api-client";
import { cn, formatDate, formatMnt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orderStatusBadgeVariant, paymentStatusBadgeVariant } from "./order-badges";
import type { orderStatuses, paymentStatuses } from "@/server/db/schema";

/**
 * Eden treaty type inference for parametrized routes (`/admin/orders/:id`)
 * falls back to the error shape — the success body is too complex for
 * Elysia's route-tree inference at this depth. We define the response
 * shape explicitly to match the flat mapping in app.ts and cast at the
 * fetch boundary. This is the documented escape hatch (AGENTS.md:
 * "unless inference cannot express the boundary clearly").
 */
type OrderStatus = (typeof orderStatuses)[number];
type PaymentStatus = (typeof paymentStatuses)[number];

type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string | null;
  status: OrderStatus;
  subtotalMnt: number;
  deliveryFeeMnt: number;
  totalMnt: number;
  address: string;
  deliveryProvider: string;
  notes: string | null;
  orderedAt: Date;
  createdAt: Date;
  cancelledAt: Date | null;
  user: { email: string; name: string; phoneNumber: string | null } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    sku: string;
    unitPriceMnt: number;
    quantity: number;
    lineTotalMnt: number;
    product: {
      slug: string;
      image: { url: string; alt: string | null } | null;
    };
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    provider: string;
    status: PaymentStatus;
    amountMnt: number;
    qpayInvoiceId: string | null;
    paidAt: Date | null;
  }>;
};

type AdminOrderStatusUpdate = {
  id: string;
  status: OrderStatus;
  cancelledAt: Date | null;
  updatedAt: Date;
};

async function fetchOrder(id: string): Promise<AdminOrderDetail> {
  const { data, error } = await api.admin.orders({ id }).get();
  if (error) throw error;
  return data as unknown as AdminOrderDetail;
}

type OrderData = AdminOrderDetail;

export default function OrderDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = createSignal(false);

  const orderQuery = useQuery(() => ({
    queryKey: ["admin", "orders", params.id],
    queryFn: () => fetchOrder(params.id!),
  }));

  const statusMutation = useMutation(() => ({
    mutationFn: async (nextStatus: "shipped" | "delivered" | "cancelled") => {
      const { data, error } = await api.admin
        .orders({ id: params.id! })
        .patch({ status: nextStatus });
      if (error) throw error;
      return data as unknown as AdminOrderStatusUpdate;
    },
    onSuccess: (data) => {
      toast.success(`Order marked as ${data.status}`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err);
      toast.error(message);
    },
  }));

  return (
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          ← Back
        </Button>
      </div>

      <Show when={orderQuery.isLoading}>
        <div class="flex items-center gap-2 border-2 border-ink bg-card p-4 font-mono text-sm">
          <Spinner class="size-4" /> Loading order…
        </div>
      </Show>

      <Show when={orderQuery.error}>
        <div class="border-2 border-destructive bg-destructive/10 p-4 font-mono text-sm text-destructive-foreground">
          Failed to load order: {String(orderQuery.error)}
        </div>
      </Show>

      <Show when={orderQuery.data}>
        {(order) => (
          <>
            <header class="flex flex-col gap-3 border-2 border-ink bg-card p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-col">
                  <h1 class="font-display text-4xl uppercase text-ink">{order().orderNumber}</h1>
                  <p class="font-mono text-xs text-muted-foreground">
                    Placed {formatDate(order().orderedAt)}
                  </p>
                </div>
                <Badge variant={orderStatusBadgeVariant[order().status]} class="text-sm">
                  {order().status}
                </Badge>
              </div>

              <StatusActions
                status={order().status}
                pending={statusMutation.isPending}
                onCancel={() => setCancelOpen(true)}
                onShipped={() => statusMutation.mutate("shipped")}
                onDelivered={() => statusMutation.mutate("delivered")}
              />
            </header>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CustomerCard order={order()} />
              <DeliveryCard order={order()} />
            </div>

            <LineItemsCard order={order()} />

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PaymentCard order={order()} />
              <TotalsCard order={order()} />
            </div>
          </>
        )}
      </Show>

      <CancelDialog
        open={cancelOpen()}
        onOpenChange={setCancelOpen}
        pending={statusMutation.isPending}
        onConfirm={() => {
          statusMutation.mutate("cancelled", {
            onSuccess: () => setCancelOpen(false),
          });
        }}
      />
    </div>
  );
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "value" in err) {
    const value = (err as { value?: { error?: { message?: string } } }).value;
    if (value?.error?.message) return value.error.message;
  }
  return String(err);
}

function StatusActions(props: {
  status: string;
  pending: boolean;
  onShipped: () => void;
  onDelivered: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="flex flex-wrap gap-2">
      <Show when={props.status === "pending"}>
        <Button variant="default" size="sm" disabled={props.pending} onClick={props.onShipped}>
          Mark as Shipped
        </Button>
        <Button variant="destructive" size="sm" disabled={props.pending} onClick={props.onCancel}>
          Cancel Order
        </Button>
      </Show>
      <Show when={props.status === "shipped"}>
        <Button variant="default" size="sm" disabled={props.pending} onClick={props.onDelivered}>
          Mark as Delivered
        </Button>
      </Show>
      <Show when={props.status === "delivered" || props.status === "cancelled"}>
        <p class="font-mono text-xs text-muted-foreground">
          No further status transitions available.
        </p>
      </Show>
    </div>
  );
}

function CustomerCard(props: { order: OrderData }) {
  const o = props.order;
  return (
    <section class="border-2 border-ink bg-card p-5">
      <h2 class="font-display text-xl uppercase text-ink">Customer</h2>
      <dl class="mt-3 grid grid-cols-1 gap-2 font-mono text-sm">
        <Field label="Phone" value={o.customerPhone} />
        <Field label="Name" value={o.customerName ?? "—"} />
        <Show when={o.user}>
          {(user) => (
            <>
              <Field label="Account email" value={user().email} />
              <Field label="Account phone" value={user().phoneNumber ?? "—"} />
            </>
          )}
        </Show>
      </dl>
    </section>
  );
}

function DeliveryCard(props: { order: OrderData }) {
  const o = props.order;
  return (
    <section class="border-2 border-ink bg-card p-5">
      <h2 class="font-display text-xl uppercase text-ink">Delivery</h2>
      <dl class="mt-3 grid grid-cols-1 gap-2 font-mono text-sm">
        <Field label="Address" value={o.address} />
        <Field label="Provider" value={o.deliveryProvider} />
        <Field label="Fee" value={formatMnt(o.deliveryFeeMnt)} />
        <Field label="Notes" value={o.notes ?? "—"} />
      </dl>
    </section>
  );
}

function LineItemsCard(props: { order: OrderData }) {
  const o = props.order;
  return (
    <section class="border-2 border-ink bg-card p-5">
      <h2 class="font-display text-xl uppercase text-ink">Line items</h2>
      <Table class="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead class="text-right">Qty</TableHead>
            <TableHead class="text-right">Unit price</TableHead>
            <TableHead class="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={o.items}>
            {(item) => (
              <TableRow>
                <TableCell>
                  <div class="flex items-center gap-3">
                    <Show when={item.product.image}>
                      {(img) => (
                        <img
                          src={img().url}
                          alt={img().alt ?? item.productName}
                          class="size-12 border-2 border-ink object-cover"
                        />
                      )}
                    </Show>
                    <span class="font-mono text-sm">{item.productName}</span>
                  </div>
                </TableCell>
                <TableCell class="font-mono text-xs">
                  {item.variantName}
                  <span class="block text-muted-foreground">{item.sku}</span>
                </TableCell>
                <TableCell class="text-right">{item.quantity}</TableCell>
                <TableCell class="text-right">{formatMnt(item.unitPriceMnt)}</TableCell>
                <TableCell class="text-right font-black">{formatMnt(item.lineTotalMnt)}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </section>
  );
}

function PaymentCard(props: { order: OrderData }) {
  const o = props.order;
  const primary = o.payments[0];
  return (
    <section class="border-2 border-ink bg-card p-5">
      <h2 class="font-display text-xl uppercase text-ink">Payment</h2>
      <Show
        when={primary}
        fallback={<p class="mt-3 font-mono text-sm text-muted-foreground">No payment records.</p>}
      >
        {(p) => (
          <dl class="mt-3 grid grid-cols-1 gap-2 font-mono text-sm">
            <Field label="Provider" value={p().provider} />
            <div class="flex items-center justify-between gap-2">
              <dt class="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={paymentStatusBadgeVariant[p().status]}>
                  {p().status.replace(/_/g, " ")}
                </Badge>
              </dd>
            </div>
            <Field label="Payment #" value={p().paymentNumber} />
            <Show when={p().qpayInvoiceId}>
              <Field label="QPay invoice" value={p().qpayInvoiceId ?? ""} />
            </Show>
            <Field label="Amount" value={formatMnt(p().amountMnt)} />
            <Show when={p().paidAt}>
              <Field label="Paid at" value={formatDate(p().paidAt ?? "")} />
            </Show>
          </dl>
        )}
      </Show>
    </section>
  );
}

function TotalsCard(props: { order: OrderData }) {
  const o = props.order;
  return (
    <section class="border-2 border-ink bg-newsprint-dark p-5">
      <h2 class="font-display text-xl uppercase text-ink">Totals</h2>
      <dl class="mt-3 flex flex-col gap-2 font-mono text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-muted-foreground">Items subtotal</dt>
          <dd>{formatMnt(o.subtotalMnt)}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-muted-foreground">Delivery fee</dt>
          <dd>{formatMnt(o.deliveryFeeMnt)}</dd>
        </div>
        <div
          class={cn(
            "mt-1 flex items-center justify-between border-t-2 border-ink pt-2",
            "font-display text-2xl uppercase",
          )}
        >
          <dt>Total</dt>
          <dd>{formatMnt(o.totalMnt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-2">
      <dt class="text-muted-foreground">{props.label}</dt>
      <dd class="text-right">{props.value}</dd>
    </div>
  );
}

function CancelDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>
            This marks the order as cancelled and records the cancellation time. The customer will
            no longer be able to track fulfilment progress.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => props.onOpenChange(false)}
            disabled={props.pending}
          >
            Keep order
          </Button>
          <Button variant="destructive" disabled={props.pending} onClick={props.onConfirm}>
            <Show when={props.pending} fallback="Confirm cancel">
              <Spinner class="size-4" /> Cancelling…
            </Show>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
