import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { SoundService } from "../core/service/feedbackService/SoundService";
import { cn } from "../utils/cn";
import Box from "./Box";

export default function Button({
  children,
  className = "",
  onClick = () => {},
  disabled = false, // Keep disabled for internal logic and styling
  ...props // Spread the rest of the props, which might include 'disabled' if passed by parent
}: React.PropsWithChildren<{
  className?: string;
  onClick?: (e: React.MouseEvent) => void | Promise<void>;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean; // This prop controls the button's behavior and appearance
  [key: string]: any;
}>) {
  const [loading, setLoading] = useState(false);

  return (
    <Box
      as="button"
      className={cn(
        "el-button flex items-center justify-center gap-1 px-3 py-2",
        {
          "hover:cursor-pointer hover:opacity-80 active:scale-90": !disabled,
          "cursor-not-allowed opacity-50": disabled,
        },
        className,
      )}
      onMouseEnter={() => {
        SoundService.play.mouseEnterButton();
      }}
      onClick={(e: React.MouseEvent) => {
        if (disabled || loading) return;
        const maybePromise = onClick(e);
        if (maybePromise && "then" in maybePromise) {
          setLoading(true);
          maybePromise
            .then(() => setLoading(false))
            .catch((e) => {
              console.error(e);
              setLoading(false);
            });
        }
      }}
      onMouseDown={() => {
        SoundService.play.mouseClickButton();
      }}
      disabled={disabled} // Explicitly pass the disabled prop to the Box component
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : children}
    </Box>
  );
}
