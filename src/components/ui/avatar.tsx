import * as ImagePrimitive from "@kobalte/core/image";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AvatarRootProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageRootProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {
    size?: "sm" | "default" | "lg";
  };

const Avatar = <T extends ValidComponent = "span">(props: AvatarRootProps<T>) => {
  const mergedProps = mergeProps({ size: "default" }, props);
  const [local, others] = splitProps(mergedProps as AvatarRootProps, ["class", "size"]);
  return (
    <ImagePrimitive.Root
      class={cn(
        "relative flex shrink-0 select-none border-2 border-ink overflow-hidden",
        "data-[size=sm]:size-8 data-[size=default]:size-10 data-[size=lg]:size-14",
        local.class,
      )}
      data-size={local.size}
      data-slot="avatar"
      {...(others as any)}
    />
  );
};

type AvatarImageProps<T extends ValidComponent = "img"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageImgProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const AvatarImage = <T extends ValidComponent = "img">(props: AvatarImageProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ImagePrimitive.Img
      class={cn("aspect-square size-full object-cover", local.class)}
      data-slot="avatar-image"
      {...(others as any)}
    />
  );
};

type AvatarFallbackProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageFallbackProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const AvatarFallback = <T extends ValidComponent = "span">(props: AvatarFallbackProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ImagePrimitive.Fallback
      class={cn(
        "flex size-full items-center justify-center bg-newsprint-dark text-sm font-black uppercase text-foreground",
        local.class,
      )}
      data-slot="avatar-fallback"
      {...(others as any)}
    />
  );
};

export { Avatar, AvatarFallback, AvatarImage };
