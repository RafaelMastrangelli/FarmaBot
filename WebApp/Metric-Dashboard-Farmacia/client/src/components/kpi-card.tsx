import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  testId: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-sky-500/10 dark:bg-sky-400/10", text: "text-sky-600 dark:text-sky-400" },
  ocean: { bg: "bg-primary/10", text: "text-primary" },
  teal: { bg: "bg-teal-500/10 dark:bg-teal-400/10", text: "text-teal-600 dark:text-teal-400" },
  navy: { bg: "bg-blue-900/10 dark:bg-blue-400/10", text: "text-blue-900 dark:text-blue-400" },
  green: { bg: "bg-teal-500/10 dark:bg-teal-400/10", text: "text-teal-600 dark:text-teal-400" },
  darkgreen: { bg: "bg-blue-900/10 dark:bg-blue-400/10", text: "text-blue-900 dark:text-blue-400" },
  gold: { bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-600 dark:text-amber-400" },
  orange: { bg: "bg-orange-500/10 dark:bg-orange-400/10", text: "text-orange-600 dark:text-orange-400" },
  purple: { bg: "bg-purple-500/10 dark:bg-purple-400/10", text: "text-purple-600 dark:text-purple-400" },
  red: { bg: "bg-red-500/10 dark:bg-red-400/10", text: "text-red-600 dark:text-red-400" },
};

export function KpiCard({ title, value, icon: Icon, color, testId }: KpiCardProps) {
  const colors = colorMap[color] ?? colorMap.blue;

  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold mt-1 truncate" data-testid={`${testId}-value`}>
              {value}
            </p>
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-md shrink-0 ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
