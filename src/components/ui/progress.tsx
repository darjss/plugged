import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  Fill,
  Label,
  type ProgressFillProps,
  type ProgressLabelProps,
  type ProgressRootProps,
  type ProgressTrackProps,
  type ProgressValueLabelProps,
  Root,
  Track,
  ValueLabel,
} from "@kobalte/core/progress";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type ProgressProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ProgressRootProps<T>> &
  Pick<ComponentProps<T>, "class" | "children">;

const Progress = <T extends ValidComponent = "div">(props: ProgressProps<T>) => {
  const [local, others] = splitProps(props as ProgressProps, ["class", "children"]);
  return (
    <Root data-slot="progress" class={cn("flex flex-wrap gap-3", local.class)} {...(others as any)}>
      {local.children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Root>
  );
};

const ProgressTrack = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ProgressTrackProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Track
      data-slot="progress-track"
      class={cn(
        "relative flex w-full items-center overflow-x-hidden h-3 bg-newsprint-dark border-2 border-ink",
        local.class,
      )}
      {...(others as any)}
    />
  );
};

const ProgressIndicator = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ProgressFillProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Fill
      data-slot="progress-indicator"
      class={cn("h-full w-(--kb-progress-fill-width) bg-primary transition-all", local.class)}
      {...(others as any)}
    />
  );
};

const ProgressLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, ProgressLabelProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return <Label data-slot="progress-label" class={cn(local.class)} {...(others as any)} />;
};

const ProgressValue = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ProgressValueLabelProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return <ValueLabel data-slot="progress-value" class={cn(local.class)} {...(others as any)} />;
};

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
