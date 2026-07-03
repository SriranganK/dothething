import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface Activity {
  id: string;
  user: string;
  action: string;
  issue: string;
  taskId?: string;
  title: string;
  detail?: string;
  time: string;
}

interface Props {
  recentActivity: Activity[];
  onViewAll: () => void;
}

export default function RecentActivityCard({
  recentActivity,
  onViewAll,
}: Props) {
  const lastFiveActivities = recentActivity.slice(0, 5);

  const activitiesLast24Hours = recentActivity.length;

  const activeUsers = new Set(
    recentActivity.map((a) => a.user)
  ).size;

  const completedToday = recentActivity.filter((a) =>
    a.action?.toLowerCase().includes("done")
  ).length;

  return (
    <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Recent Activity
        </CardTitle>

        <CardDescription>
          What happened on this board in the last 24 hours
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* KPI CARDS */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-3xl font-bold text-blue-700">
              {activitiesLast24Hours}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-blue-600">
              Updates Today
            </p>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-3xl font-bold text-violet-700">
              {activeUsers}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-violet-600">
              Contributors
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-3xl font-bold text-emerald-700">
              {completedToday}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-emerald-600">
              Completed
            </p>
          </div>
        </div>

        {/* TOP ACTIVITIES */}
        <div className="space-y-3">
          {lastFiveActivities.map((activity) => (
            <div
              key={activity.id}
              className="
                group
                rounded-xl
                border
                border-slate-200
                p-4
                transition-all
                duration-300
                hover:-translate-y-1
                hover:border-blue-200
                hover:shadow-lg
              "
            >
              <div className="flex gap-4">
                <Avatar>
                  <AvatarFallback>
                    {activity.user?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-900">
                      {activity.user}
                    </span>{" "}
                    <span className="text-slate-500">
                      {activity.action}
                    </span>{" "}
                    {activity.taskId ? (
                      <Link
                        to={`/item/${activity.taskId}`}
                        className="font-medium text-blue-600 hover:text-blue-800 underline decoration-blue-300 dark:decoration-blue-700 decoration-1 underline-offset-2 hover:decoration-blue-500"
                      >
                        {activity.issue}
                      </Link>
                    ) : (
                      <span className="font-medium text-blue-600">
                        {activity.issue}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {activity.title}
                  </p>

                  {activity.detail && (
                    <Badge
                      variant="outline"
                      className="mt-2"
                    >
                      {activity.detail}
                    </Badge>
                  )}

                  <p className="mt-2 text-xs text-slate-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={onViewAll}
            className="
              rounded-full
              px-6
              hover:bg-blue-50
              hover:border-blue-200
            "
          >
            View All Activity →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}