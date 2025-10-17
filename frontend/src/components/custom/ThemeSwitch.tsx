import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSwitchProps {
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon";
}

export default function ThemeSwitch({ className, showLabel = false, variant = "ghost", size = "icon" }: ThemeSwitchProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn("gap-2 transition", showLabel && "px-4 py-2 text-sm font-medium", className)}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {showLabel ? (theme === "light" ? "Dark mode" : "Light mode") : null}
    </Button>
  );
}
