import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

const Card = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "border-4 border-ink bg-card text-card-foreground shadow-hard-xl transition-all",
        local.class,
      )}
      {...others}
    />
  );
};

const CardHeader = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class={cn("flex flex-col gap-2 p-6 border-b-4 border-ink", local.class)} {...others} />
  );
};

const CardTitle = (props: ComponentProps<"h3">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <h3
      class={cn("text-xl font-black uppercase tracking-tight text-foreground", local.class)}
      {...others}
    />
  );
};

const CardDescription = (props: ComponentProps<"p">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <p class={cn("text-sm text-muted-foreground", local.class)} {...others} />;
};

const CardContent = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("p-6 pt-0", local.class)} {...others} />;
};

const CardFooter = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("flex items-center p-6 pt-0", local.class)} {...others} />;
};

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
