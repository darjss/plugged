import { useNavigate } from "@solidjs/router";
import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import { createSignal, For, Show, createMemo } from "solid-js";
import { api } from "@/lib/api-client";
import { cn, formatDate, formatMnt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orderStatuses, paymentStatuses } from "@/server/db/schema";
import { orderStatusBadgeVariant, paymentStatusBadgeVariant } from "@/lib/order-badges";

const PAGE_SIZE = 25;
const STATUS_FILTER_VALUES = ["", ...orderStatuses] as const;
const PAYMENT_FILTER_VALUES = ["", ...paymentStatuses] as const;

const labelFor = (value: string) => (value ? value.replace(/_/g, " ") : "All");

type ListFilters = {
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit: number;
  offset: number;
};

export default function OrdersList() {
  const navigate = useNavigate();

  const [status, setStatus] = createSignal<string>("");
  const [paymentStatus, setPaymentStatus] = createSignal<string>("");
  const [dateFrom, setDateFrom] = createSignal<string>("");
  const [dateTo, setDateTo] = createSignal<string>("");
  const [search, setSearch] = createSignal<string>("");
  const [page, setPage] = createSignal(0);

  const filters = createMemo<ListFilters>(() => {
    const f: ListFilters = { limit: PAGE_SIZE, offset: page() * PAGE_SIZE };
    const s = status();
    if (s) f.status = s;
    const ps = paymentStatus();
    if (ps) f.paymentStatus = ps;
    const df = dateFrom();
    if (df) f.dateFrom = df;
    const dt = dateTo();
    if (dt) f.dateTo = dt;
    const q = search().trim();
    if (q) f.search = q;
    return f;
  });

  const query = useQuery(() => ({
    queryKey: ["admin", "orders", filters()],
    queryFn: async () => {
      const { data, error } = await api.admin.orders.get({ query: filters() });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  }));

  const totalPages = createMemo(() =>
    query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1,
  );

  const resetPage = () => setPage(0);

  return (
    <div class="flex flex-col gap-4">
      <header class="flex flex-col gap-1">
        <h1 class="font-display text-4xl uppercase text-ink">Orders</h1>
        <p class="font-mono text-xs text-muted-foreground">
          Manage customer orders, track payments, update fulfilment status.
        </p>
      </header>

      <FiltersBar
        status={status()}
        paymentStatus={paymentStatus()}
        dateFrom={dateFrom()}
        dateTo={dateTo()}
        search={search()}
        onStatus={(v) => {
          setStatus(v);
          resetPage();
        }}
        onPaymentStatus={(v) => {
          setPaymentStatus(v);
          resetPage();
        }}
        onDateFrom={(v) => {
          setDateFrom(v);
          resetPage();
        }}
        onDateTo={(v) => {
          setDateTo(v);
          resetPage();
        }}
        onSearch={(v) => {
          setSearch(v);
          resetPage();
        }}
      />

      <Show when={query.isLoading}>
        <div class="flex items-center gap-2 border-2 border-ink bg-card p-4 font-mono text-sm">
          <Spinner class="size-4" /> Loading orders…
        </div>
      </Show>

      <Show when={query.error}>
        <div class="border-2 border-destructive bg-destructive/10 p-4 font-mono text-sm text-destructive-foreground">
          Failed to load orders: {String(query.error)}
        </div>
      </Show>

      <Show when={!query.isLoading && query.data && query.data.orders.length === 0}>
        <div class="border-2 border-ink bg-card p-8 text-center font-mono text-sm text-muted-foreground">
          No orders match these filters.
        </div>
      </Show>

      <Show when={query.data && query.data.orders.length > 0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead class="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={query.data!.orders}>
              {(row) => (
                <TableRow class="cursor-pointer" onClick={() => navigate(`/orders/${row.id}`)}>
                  <TableCell class="font-black uppercase">{row.orderNumber}</TableCell>
                  <TableCell>
                    <Show
                      when={row.items.length > 0}
                      fallback={<span class="font-mono text-xs text-muted-foreground">—</span>}
                    >
                      <div class="flex flex-wrap items-center gap-1">
                        <For each={row.items}>
                          {(item) => (
                            <div
                              class="group/img relative flex size-8 items-center justify-center border-2 border-ink bg-muted"
                              title={item.productName}
                            >
                              <Show
                                when={item.product.image}
                                fallback={
                                  <span class="font-mono text-[10px] uppercase text-muted-foreground">
                                    {item.productName.slice(0, 2)}
                                  </span>
                                }
                              >
                                {(img) => (
                                  <img
                                    src={img().url}
                                    alt={img().alt ?? item.productName}
                                    class="size-full object-cover"
                                  />
                                )}
                              </Show>
                            </div>
                          )}
                        </For>
                        <Show when={row.items.length >= 3}>
                          <span class="font-mono text-[10px] uppercase text-muted-foreground">
                            +more
                          </span>
                        </Show>
                      </div>
                    </Show>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-mono text-sm">{row.customerPhone}</span>
                      <Show when={row.customerName}>
                        <span class="font-mono text-xs text-muted-foreground">
                          {row.customerName}
                        </span>
                      </Show>
                    </div>
                  </TableCell>
                  <TableCell class="text-xs">{formatDate(row.orderedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={orderStatusBadgeVariant[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Show
                      when={row.payment}
                      fallback={<span class="text-xs text-muted-foreground">—</span>}
                    >
                      {(p) => (
                        <Badge variant={paymentStatusBadgeVariant[p().status]}>
                          {p().status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </Show>
                  </TableCell>
                  <TableCell class="text-right font-black">{formatMnt(row.totalMnt)}</TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>

        <div class="flex items-center justify-between gap-4">
          <p class="font-mono text-xs text-muted-foreground">
            Showing {query.data!.offset + 1}–
            {Math.min(query.data!.offset + query.data!.orders.length, query.data!.total)} of{" "}
            {query.data!.total}
          </p>
          <Pagination class="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  class={cn(page() === 0 && "pointer-events-none opacity-40")}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                />
              </PaginationItem>
              <PaginationItem>
                <span class="px-3 font-mono text-xs">
                  {page() + 1} / {totalPages()}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  class={cn(page() >= totalPages() - 1 && "pointer-events-none opacity-40")}
                  onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Show>
    </div>
  );
}

type FiltersBarProps = {
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  onStatus: (v: string) => void;
  onPaymentStatus: (v: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onSearch: (v: string) => void;
};

function FiltersBar(props: FiltersBarProps) {
  return (
    <div class="grid grid-cols-1 gap-3 border-2 border-ink bg-card p-4 md:grid-cols-2 lg:grid-cols-6">
      <Input
        placeholder="Search order # or phone"
        value={props.search}
        onInput={(e) => props.onSearch(e.currentTarget.value)}
      />
      <Select
        value={props.status}
        onChange={(v) => props.onStatus(v ?? "")}
        options={[...STATUS_FILTER_VALUES]}
        placeholder="All statuses"
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{labelFor(itemProps.item.rawValue)}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<string>>
            {(state) =>
              state.selectedOption() ? labelFor(state.selectedOption()!) : "All statuses"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>

      <Select
        value={props.paymentStatus}
        onChange={(v) => props.onPaymentStatus(v ?? "")}
        options={[...PAYMENT_FILTER_VALUES]}
        placeholder="All payments"
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{labelFor(itemProps.item.rawValue)}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<string>>
            {(state) =>
              state.selectedOption() ? labelFor(state.selectedOption()!) : "All payments"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>

      <Input
        type="date"
        value={props.dateFrom}
        onInput={(e) => props.onDateFrom(e.currentTarget.value)}
        aria-label="Date from"
      />
      <Input
        type="date"
        value={props.dateTo}
        onInput={(e) => props.onDateTo(e.currentTarget.value)}
        aria-label="Date to"
      />
      <Button
        variant="outline"
        class="lg:col-span-1"
        onClick={() => {
          props.onStatus("");
          props.onPaymentStatus("");
          props.onDateFrom("");
          props.onDateTo("");
          props.onSearch("");
        }}
      >
        Clear
      </Button>
    </div>
  );
}
