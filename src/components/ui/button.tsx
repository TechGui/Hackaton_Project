import React from "react";

export function Button({ children, className, ...props }: any) {
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
