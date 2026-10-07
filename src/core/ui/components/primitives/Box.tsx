import type { ComponentPropsWithRef, ElementType, ReactNode, Ref } from "react";
import { createElement, forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// Box: シンプルな div ラッパー。`as` で要素を切り替え可能にしておくことで再利用性を高める。
export type BoxProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<T>, "className" | "as">;

function BoxInner<T extends ElementType = "div">(
  { as, className, children, ...rest }: BoxProps<T>,
  ref: Ref<unknown>,
) {
  // 目的: Tailwind クラスを渡せるようにして、既存の Chakra `Box` の代替として使えるようにする
  // 意図: 最小限のラッパーで余計な振る舞いを持たせない
  const Comp = as ?? "div";
  return createElement(
    Comp,

    { ref, className: cn(className), ...rest },
    children,
  );
}

export const Box = forwardRef(BoxInner) as <T extends ElementType = "div">(
  props: BoxProps<T> & { ref?: Ref<unknown> },
) => ReactNode;

Object.defineProperty(Box, "displayName", { value: "Box" });
