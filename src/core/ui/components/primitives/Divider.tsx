import React from "react";

type DividerProps = React.HTMLAttributes<HTMLHRElement> & {
  className?: string;
};

export const Divider = ({ className, ...rest }: DividerProps) => (
  <hr className={className} {...rest} />
);

Divider.displayName = "Divider";
