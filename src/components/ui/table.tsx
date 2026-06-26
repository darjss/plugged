import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

const Table = (props: ComponentProps<"table">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div data-slot="table-container" class="relative w-full overflow-auto border-2 border-ink">
      <table
        data-slot="table"
        class={cn("w-full caption-bottom text-sm border-collapse", local.class)}
        {...others}
      />
    </div>
  );
};

const TableHeader = (props: ComponentProps<"thead">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <thead
      data-slot="table-header"
      class={cn("bg-ink text-newsprint [&_tr]:border-b-2 [&_tr]:border-ink", local.class)}
      {...others}
    />
  );
};

const TableBody = (props: ComponentProps<"tbody">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tbody
      data-slot="table-body"
      class={cn("[&_tr:last-child]:border-0", local.class)}
      {...others}
    />
  );
};

const TableFooter = (props: ComponentProps<"tfoot">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tfoot
      data-slot="table-footer"
      class={cn("bg-newsprint-dark border-t-2 border-ink font-black", local.class)}
      {...others}
    />
  );
};

const TableRow = (props: ComponentProps<"tr">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tr
      data-slot="table-row"
      class={cn(
        "border-b border-ink/30 transition-colors hover:bg-primary/10 data-[state=selected]:bg-accent/30 [&_td]:px-4 [&_td]:py-2.5",
        local.class,
      )}
      {...others}
    />
  );
};

const TableHead = (props: ComponentProps<"th">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <th
      data-slot="table-head"
      class={cn(
        "h-11 px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide align-middle [&:has([role=checkbox])]:pr-0",
        local.class,
      )}
      {...others}
    />
  );
};

const TableCell = (props: ComponentProps<"td">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <td
      data-slot="table-cell"
      class={cn("align-middle font-mono [&:has([role=checkbox])]:pr-0", local.class)}
      {...others}
    />
  );
};

const TableCaption = (props: ComponentProps<"caption">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <caption
      data-slot="table-caption"
      class={cn("mt-4 text-sm text-muted-foreground", local.class)}
      {...others}
    />
  );
};

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
