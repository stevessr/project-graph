// @ts-nocheck
import * as React from "react";

import type { SlateElementProps } from "platejs";

import { ChevronRight } from "lucide-react";
import { SlateElement } from "platejs";

export function ToggleElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} className="pl-6">
      <div
        className="text-muted-foreground hover:bg-accent absolute -left-0.5 top-0 size-6 cursor-pointer select-none items-center justify-center rounded-md p-px transition-colors [&_svg]:size-4"
        contentEditable={false}
      >
        <ChevronRight className="rotate-0 transition-transform duration-75" />
      </div>
      {props.children}
    </SlateElement>
  );
}
