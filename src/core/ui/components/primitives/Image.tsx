import React from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  className?: string;
};

export const Image = ({ className, ...rest }: ImageProps) => (
  <img className={cn(className)} {...rest} />
);

Image.displayName = "Image";
