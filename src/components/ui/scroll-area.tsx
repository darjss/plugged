import {
  type Accessor,
  type ComponentProps,
  createContext,
  createSignal,
  type JSX,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";

type ScrollAreaContextValue = {
  viewportRef: Accessor<HTMLDivElement | undefined>;
  contentRef: Accessor<HTMLDivElement | undefined>;
  hovered: Accessor<boolean>;
};

const ScrollAreaContext = createContext<ScrollAreaContextValue | null>(null);

const useScrollArea = () => {
  const context = useContext(ScrollAreaContext);
  if (!context) {
    throw new Error("useScrollArea must be used within a <ScrollArea />");
  }
  return context;
};

type ScrollAreaProps = ComponentProps<"div"> & {
  children?: JSX.Element;
};

const ScrollArea = (props: ScrollAreaProps) => {
  const [local, others] = splitProps(props, ["class", "children", "onMouseEnter", "onMouseLeave"]);

  let viewportRef: HTMLDivElement | undefined;
  const [hovered, setHovered] = createSignal(false);

  return (
    <ScrollAreaContext.Provider
      value={{
        viewportRef: () => viewportRef,
        contentRef: () => viewportRef,
        hovered,
      }}
    >
      <div
        class={cn("relative overflow-clip", local.class)}
        data-slot="scroll-area"
        onMouseEnter={(e) => {
          setHovered(true);
          if (typeof local.onMouseEnter === "function") local.onMouseEnter(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          if (typeof local.onMouseLeave === "function") local.onMouseLeave(e);
        }}
        {...others}
      >
        <div
          class="size-full overflow-auto outline-none [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
          data-slot="scroll-area-viewport"
          ref={viewportRef}
        >
          {local.children}
        </div>
        <ScrollBar />
        <div data-slot="scroll-area-corner" />
      </div>
    </ScrollAreaContext.Provider>
  );
};

type ScrollBarProps = ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal";
};

const ScrollBar = (rawProps: ScrollBarProps) => {
  const props = mergeProps({ orientation: "vertical" as const }, rawProps);
  const [local, others] = splitProps(props, ["class", "orientation"]);

  const context = useScrollArea();
  const [thumbSize, setThumbSize] = createSignal(0);
  const [thumbPosition, setThumbPosition] = createSignal(0);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal(0);
  const [visible, setVisible] = createSignal(false);

  let scrollbarRef: HTMLDivElement | undefined;
  let thumbRef: HTMLDivElement | undefined;

  const isVertical = () => local.orientation === "vertical";

  const updateScrollbar = () => {
    const viewport = context.viewportRef();
    if (!viewport) return;

    if (isVertical()) {
      const ratio = viewport.clientHeight / viewport.scrollHeight;
      const size = Math.max(ratio * 100, 10);
      setThumbSize(size);
      setVisible(ratio < 1);
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
      const scrollRatio = maxScrollTop > 0 ? viewport.scrollTop / maxScrollTop : 0;
      const maxThumbPosition = 100 - size;
      setThumbPosition(Math.min(scrollRatio * maxThumbPosition, maxThumbPosition));
    } else {
      const ratio = viewport.clientWidth / viewport.scrollWidth;
      const size = Math.max(ratio * 100, 10);
      setThumbSize(size);
      setVisible(ratio < 1);
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      const scrollRatio = maxScrollLeft > 0 ? viewport.scrollLeft / maxScrollLeft : 0;
      const maxThumbPosition = 100 - size;
      setThumbPosition(Math.min(scrollRatio * maxThumbPosition, maxThumbPosition));
    }
  };

  const handleScroll = () => {
    if (!isDragging()) updateScrollbar();
  };

  const handleThumbMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const viewport = context.viewportRef();
    if (!viewport || !scrollbarRef || !thumbRef) return;
    setIsDragging(true);
    const thumbRect = thumbRef.getBoundingClientRect();
    if (isVertical()) {
      setDragOffset(e.clientY - thumbRect.top);
    } else {
      setDragOffset(e.clientX - thumbRect.left);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    e.preventDefault();
    const viewport = context.viewportRef();
    if (!viewport || !scrollbarRef) return;

    if (isVertical()) {
      const scrollbarRect = scrollbarRef.getBoundingClientRect();
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
      if (maxScrollTop <= 0) return;
      const mousePositionInTrack = e.clientY - scrollbarRect.top - dragOffset();
      const ratio = viewport.clientHeight / viewport.scrollHeight;
      const computedThumbSize = Math.max(ratio * 100, 10);
      const maxThumbPosition = 100 - computedThumbSize;
      const thumbPositionPercent = Math.max(
        0,
        Math.min((mousePositionInTrack / scrollbarRect.height) * 100, maxThumbPosition),
      );
      const scrollRatio = maxThumbPosition > 0 ? thumbPositionPercent / maxThumbPosition : 0;
      viewport.scrollTop = scrollRatio * maxScrollTop;
      setThumbPosition(thumbPositionPercent);
    } else {
      const scrollbarRect = scrollbarRef.getBoundingClientRect();
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      if (maxScrollLeft <= 0) return;
      const mousePositionInTrack = e.clientX - scrollbarRect.left - dragOffset();
      const ratio = viewport.clientWidth / viewport.scrollWidth;
      const computedThumbSize = Math.max(ratio * 100, 10);
      const maxThumbPosition = 100 - computedThumbSize;
      const thumbPositionPercent = Math.max(
        0,
        Math.min((mousePositionInTrack / scrollbarRect.width) * 100, maxThumbPosition),
      );
      const scrollRatio = maxThumbPosition > 0 ? thumbPositionPercent / maxThumbPosition : 0;
      viewport.scrollLeft = scrollRatio * maxScrollLeft;
      setThumbPosition(thumbPositionPercent);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTrackClick = (e: MouseEvent) => {
    if (!scrollbarRef || !thumbRef) return;
    const viewport = context.viewportRef();
    if (!viewport) return;
    const rect = scrollbarRef.getBoundingClientRect();
    const thumbRect = thumbRef.getBoundingClientRect();
    if (isVertical()) {
      const clickY = e.clientY - rect.top;
      const thumbY = thumbRect.top - rect.top;
      const thumbHeight = thumbRect.height;
      if (clickY < thumbY) viewport.scrollTop -= viewport.clientHeight;
      else if (clickY > thumbY + thumbHeight) viewport.scrollTop += viewport.clientHeight;
    } else {
      const clickX = e.clientX - rect.left;
      const thumbX = thumbRect.left - rect.left;
      const thumbWidth = thumbRect.width;
      if (clickX < thumbX) viewport.scrollLeft -= viewport.clientWidth;
      else if (clickX > thumbX + thumbWidth) viewport.scrollLeft += viewport.clientWidth;
    }
  };

  onMount(() => {
    const viewport = context.viewportRef();
    if (!viewport) return;
    updateScrollbar();
    viewport.addEventListener("scroll", handleScroll);
    const resizeObserver = new ResizeObserver(() => updateScrollbar());
    const content = context.contentRef();
    if (content) resizeObserver.observe(content);
    resizeObserver.observe(viewport);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    onCleanup(() => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    });
  });

  return (
    <Show when={visible()}>
      <div
        ref={scrollbarRef}
        data-slot="scroll-area-scrollbar"
        data-orientation={local.orientation}
        class={cn(
          "absolute flex touch-none select-none transition-opacity",
          isVertical()
            ? "right-0.5 top-0.5 h-[calc(100%-1rem)] w-2"
            : "bottom-0.5 left-0.5 h-2 w-[calc(100%-1rem)]",
          context.hovered() || isDragging() ? "opacity-100" : "opacity-0",
          local.class,
        )}
        onmousedown={handleTrackClick}
        {...others}
      >
        <div
          ref={thumbRef}
          data-slot="scroll-area-thumb"
          class="relative flex-1 bg-ink/40"
          style={
            isVertical()
              ? { height: `${thumbSize()}%`, transform: `translateY(${thumbPosition()}%)` }
              : { width: `${thumbSize()}%`, transform: `translateX(${thumbPosition()}%)` }
          }
          onmousedown={handleThumbMouseDown}
        />
      </div>
    </Show>
  );
};

export { ScrollArea, ScrollBar };
