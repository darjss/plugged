/**
 * Type declarations for `@motionone/solid`. The package's `exports`
 * field lacks a `types` condition, so TypeScript with
 * `moduleResolution: "Bundler"` resolves to the ESM JS entry and can't
 * find the .d.ts files under `dist/types`. These declarations mirror
 * the real types from the package.
 */
declare module "@motionone/solid" {
  import type { JSX, ParentProps, FlowComponent, Accessor } from "solid-js";
  import type {
    ValueKeyframesDefinition,
    MotionKeyframesDefinition,
    InViewOptions,
    MotionEvent,
    CustomPointerEvent,
    ViewEvent,
  } from "@motionone/dom";
  import type { AnimationOptions } from "@motionone/types";

  export interface MotionEventHandlers {
    onMotionStart?: (event: MotionEvent) => void;
    onMotionComplete?: (event: MotionEvent) => void;
    onHoverStart?: (event: CustomPointerEvent) => void;
    onHoverEnd?: (event: CustomPointerEvent) => void;
    onPressStart?: (event: CustomPointerEvent) => void;
    onPressEnd?: (event: CustomPointerEvent) => void;
    onViewEnter?: (event: ViewEvent) => void;
    onViewLeave?: (event: ViewEvent) => void;
  }

  export type SolidCSSPropertyKeys = Exclude<
    keyof {
      [K in keyof JSX.CSSProperties as string extends K ? never : K]: never;
    },
    "transition"
  >;

  export type KeyframesDefinition = MotionKeyframesDefinition & {
    [K in SolidCSSPropertyKeys]?: ValueKeyframesDefinition;
  };

  export type Variant = KeyframesDefinition & {
    transition?: AnimationOptionsWithOverrides;
  };

  export type VariantDefinition = string | Variant;

  export type AnimationOptionsWithOverrides = AnimationOptions & {
    [K in keyof KeyframesDefinition]: AnimationOptions;
  };

  export type Options = {
    initial?: false | VariantDefinition;
    animate?: VariantDefinition;
    inView?: VariantDefinition;
    hover?: VariantDefinition;
    press?: VariantDefinition;
    exit?: VariantDefinition;
    variants?: Record<string, Variant>;
    inViewOptions?: InViewOptions;
    transition?: AnimationOptionsWithOverrides;
  };

  export type MotionComponentProps = ParentProps<MotionEventHandlers & Options>;

  export type MotionComponent = {
    (props: JSX.IntrinsicElements["div"] & MotionComponentProps): JSX.Element;
    <T extends keyof JSX.IntrinsicElements>(
      props: JSX.IntrinsicElements[T] & MotionComponentProps & { tag: T },
    ): JSX.Element;
  };

  export type MotionProxyComponent<T> = (props: T & MotionComponentProps) => JSX.Element;

  export type MotionProxy = MotionComponent & {
    [K in keyof JSX.IntrinsicElements]: MotionProxyComponent<JSX.IntrinsicElements[K]>;
  };

  export const Motion: MotionProxy;

  export type PresenceContextState = () => boolean;
  export const PresenceContext: import("solid-js").Context<PresenceContextState>;
  export const Presence: FlowComponent<{
    initial?: boolean;
    exitBeforeEnter?: boolean;
  }>;

  export function createMotion(
    target: Element,
    options: Accessor<Options> | Options,
    presenceState?: PresenceContextState,
  ): unknown;

  export function motion(el: Element, props: Accessor<Options>): void;
}
