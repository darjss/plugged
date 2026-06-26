import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type SliderFillProps,
  Slider as SliderPrimitive,
  type SliderRootProps,
  type SliderThumbProps,
  type SliderTrackProps,
  useSliderContext,
} from "@kobalte/core/slider";
import {
  type ComponentProps,
  createMemo,
  For,
  mergeProps,
  splitProps,
  untrack,
  type ValidComponent,
} from "solid-js";

import { cn } from "@/lib/utils";

type SliderProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SliderRootProps<T>> &
  Pick<ComponentProps<T>, "class">;

const Slider = <T extends ValidComponent = "div">(rawProps: SliderProps<T>) => {
  const props = mergeProps({ minValue: 0, maxValue: 100 } as SliderProps<T>, rawProps);
  const [local, others] = splitProps(props as SliderProps, ["class", "defaultValue", "value"]);

  const values = createMemo(() => {
    if (Array.isArray(untrack(() => local.value))) return untrack(() => local.value);
    if (Array.isArray(local.defaultValue)) return local.defaultValue;
    return [others.minValue, others.maxValue];
  });

  return (
    <SliderPrimitive
      data-slot="slider"
      defaultValue={local.defaultValue}
      value={local.value}
      class={cn(
        "relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-disabled:opacity-50",
        local.class,
      )}
      {...(others as any)}
    >
      <SliderTrack>
        <SliderFill />
      </SliderTrack>
      <For each={values()}>{() => <SliderThumb />}</For>
    </SliderPrimitive>
  );
};

const SliderTrack = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderTrackProps<T>> & Pick<ComponentProps<T>, "class" | "children">,
) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  const context = useSliderContext();
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      data-orientation={context.state.orientation()}
      class={cn(
        "relative grow select-none overflow-hidden h-2 bg-newsprint-dark border-2 border-ink data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
        local.class,
      )}
      {...(others as any)}
    >
      {local.children}
    </SliderPrimitive.Track>
  );
};

const SliderFill = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderFillProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  const context = useSliderContext();
  return (
    <SliderPrimitive.Fill
      data-slot="slider-range"
      data-orientation={context.state.orientation()}
      class={cn(
        "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
        local.class,
      )}
      {...(others as any)}
    />
  );
};

const SliderThumb = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SliderThumbProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      class={cn(
        "block size-5 shrink-0 select-none border-2 border-ink bg-primary shadow-hard-sm disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring",
        local.class,
      )}
      {...(others as any)}
    >
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};

export { Slider };
