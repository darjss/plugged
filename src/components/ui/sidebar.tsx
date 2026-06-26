import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Menu } from "lucide-solid";
import {
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
  type Accessor,
  type Component,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./sheet";

/**
 * Minimal grunge-styled sidebar primitives for the admin shell.
 *
 * Surgical subset of the Zaidan sidebar API — only the pieces the admin
 * shell uses (Provider, Sidebar, Header, Content, Footer, Group, Menu,
 * MenuItem, MenuButton, Inset, Trigger). The full Zaidan sidebar pulls in
 * tooltip/skeleton/rail/sub-menu primitives and a pile of `--sidebar-*`
 * CSS tokens that don't exist in the grunge theme; porting them wholesale
 * would be overcomplication for a 5-link admin nav. Styling reuses the
 * existing grunge tokens (ink/newsprint/orange) and hard-shadow utilities.
 */

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: Accessor<"expanded" | "collapsed">;
  open: Accessor<boolean>;
  setOpen: (open: boolean) => void;
  openMobile: Accessor<boolean>;
  setOpenMobile: (open: boolean) => void;
  isMobile: Accessor<boolean>;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  onMount(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobile(window.innerWidth < breakpoint);
    update();
    window.addEventListener("resize", update);
    onCleanup(() => window.removeEventListener("resize", update));
  });

  return isMobile;
}

type SidebarProviderProps = ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SidebarProvider = (props: SidebarProviderProps) => {
  const mergedProps = mergePropsDefaults({ defaultOpen: true }, props);
  const [local, others] = splitProps(mergedProps, [
    "defaultOpen",
    "open",
    "onOpenChange",
    "class",
    "style",
    "children",
  ]);

  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = createSignal(false);
  const [_open, _setOpen] = createSignal(local.defaultOpen);
  const open = () => local.open ?? _open();
  const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
    if (local.onOpenChange) {
      return local.onOpenChange?.(typeof value === "function" ? value(open()) : value);
    }
    _setOpen(value);
  };

  const toggleSidebar = () => (isMobile() ? setOpenMobile((o) => !o) : setOpen((o) => !o));

  createEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  const state = () => (open() ? "expanded" : "collapsed");

  const contextValue: SidebarContextProps = {
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...(local.style as JSX.CSSProperties),
        }}
        class={cn("flex min-h-svh w-full", local.class)}
        {...others}
      >
        {local.children}
      </div>
    </SidebarContext.Provider>
  );
};

type SidebarProps = ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
};

const Sidebar: Component<SidebarProps> = (props) => {
  const mergedProps = mergeProps(
    { side: "left", variant: "sidebar", collapsible: "offcanvas" },
    props,
  ) as SidebarProps;
  const [local, others] = splitProps(mergedProps, [
    "side",
    "variant",
    "collapsible",
    "class",
    "children",
  ]);

  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  return (
    <Show
      when={isMobile()}
      fallback={
        <div
          class={cn("group peer hidden text-newsprint md:block", local.class)}
          data-state={state()}
          data-collapsible={state() === "collapsed" ? local.collapsible : ""}
          data-variant={local.variant}
          data-side={local.side}
          data-slot="sidebar"
        >
          <div
            data-slot="sidebar-gap"
            class={cn(
              "relative w-(--sidebar-width) bg-transparent",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              local.variant === "floating" || local.variant === "inset"
                ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
                : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
            )}
          />
          <div
            data-slot="sidebar-container"
            class={cn(
              "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) border-r-2 border-ink bg-ink transition-[left,right,width] duration-200 ease-linear md:flex",
              local.side === "left"
                ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
            )}
            {...others}
          >
            <div data-sidebar="sidebar" data-slot="sidebar-inner" class="flex size-full flex-col">
              {local.children}
            </div>
          </div>
        </div>
      }
    >
      <Sheet onOpenChange={setOpenMobile} open={openMobile()} {...others}>
        <SheetContent
          class="w-(--sidebar-width) border-r-2 border-ink bg-ink p-0 text-newsprint [&>button]:hidden"
          data-mobile="true"
          data-sidebar="sidebar"
          data-slot="sidebar"
          side={local.side}
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
        >
          <SheetHeader class="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Admin navigation</SheetDescription>
          </SheetHeader>
          <div class="flex size-full flex-col">{local.children}</div>
        </SheetContent>
      </Sheet>
    </Show>
  );
};

type SidebarTriggerProps = ButtonProps & {
  class?: string | undefined;
  onClick?: (event: MouseEvent) => void;
};

const SidebarTrigger = (props: SidebarTriggerProps) => {
  const [local, others] = splitProps(props, ["class", "onClick"]);
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="outline"
      size="icon-sm"
      class={cn(local.class)}
      onClick={(event: MouseEvent) => {
        local.onClick?.(event);
        toggleSidebar();
      }}
      {...others}
    >
      <Menu />
      <span class="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

const SidebarInset = (props: ComponentProps<"main">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <main
      data-slot="sidebar-inset"
      class={cn("relative flex w-full flex-1 flex-col", local.class)}
      {...others}
    />
  );
};

const SidebarHeader = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class={cn("flex flex-col", local.class)}
      {...others}
    />
  );
};

const SidebarFooter = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class={cn("flex flex-col", local.class)}
      {...others}
    />
  );
};

const SidebarContent = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class={cn(
        "flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        local.class,
      )}
      {...others}
    />
  );
};

const SidebarGroup = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class={cn("relative flex w-full min-w-0 flex-col", local.class)}
      {...others}
    />
  );
};

const SidebarGroupContent = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class={cn("w-full", local.class)}
      {...others}
    />
  );
};

const SidebarMenu = (props: ComponentProps<"ul">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class={cn("flex w-full min-w-0 flex-col gap-1", local.class)}
      {...others}
    />
  );
};

const SidebarMenuItem = (props: ComponentProps<"li">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class={cn("group/menu-item relative", local.class)}
      {...others}
    />
  );
};

type SidebarMenuButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ComponentProps<T>
> & {
  isActive?: boolean;
  class?: string | undefined;
  children?: JSX.Element;
};

const SidebarMenuButton = <T extends ValidComponent = "button">(
  rawProps: SidebarMenuButtonProps<T>,
) => {
  const props = mergeProps({ isActive: false }, rawProps) as SidebarMenuButtonProps<T>;
  const [local, others] = splitProps(props, ["isActive", "class", "children"]);
  return (
    <button
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-active={local.isActive}
      class={cn(
        "flex w-full items-center gap-3 border-2 border-transparent px-3 py-2.5 text-left font-heading text-sm uppercase tracking-wide text-newsprint/80 transition-all",
        "hover:border-orange hover:bg-orange hover:text-ink hover:shadow-hard-sm hover:translate-x-[1px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        local.isActive && ["border-orange bg-orange text-ink shadow-hard-sm"],
        "[&_svg]:size-5 [&_svg]:shrink-0",
        local.class,
      )}
      {...(others as any)}
    >
      {local.children}
    </button>
  );
};

// Local helper — mergeProps with typed defaults, kept private to this module.
function mergePropsDefaults<T extends object, D extends Partial<T>>(defaults: D, props: T): T & D {
  return mergeProps(defaults, props) as T & D;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
