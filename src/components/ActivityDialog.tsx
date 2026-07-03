import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";

import { ScrollArea } from "@/components/ui/scroll-area";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Activity {
  id: string;
  user: string;
  action: string;
  issue: string;
  title: string;
  detail?: string;
  time: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
}

export default function ActivityDialog({
  open,
  onOpenChange,
  activities,
}: Props) {
  const [selectedUser, setSelectedUser] =
    useState("all");

  const [search, setSearch] = useState("");

  const users = [
    ...new Set(activities.map((a) => a.user)),
  ];

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesUser =
        selectedUser === "all" ||
        activity.user === selectedUser;

      const matchesSearch =
        activity.user
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        activity.issue
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        activity.title
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesUser && matchesSearch;
    });
  }, [activities, selectedUser, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            Activity Timeline
          </DialogTitle>

          <DialogDescription>
            Complete activity history for this board
          </DialogDescription>
        </DialogHeader>

        {/* FILTERS */}
        <div className="flex gap-3 py-4">
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <Select
            value={selectedUser}
            onValueChange={setSelectedUser}
          >
            <SelectTrigger className="w-55">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Users
              </SelectItem>

              {users.map((user) => (
                <SelectItem
                  key={user}
                  value={user}
                >
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* TIMELINE */}
        <ScrollArea className="h-150">
          <div className="space-y-3 pr-4">
            {filteredActivities.map(
              (activity) => (
                <div
                  key={activity.id}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    p-4
                    transition-all
                    duration-300
                    hover:bg-slate-50
                    hover:border-blue-200
                  "
                >
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {activity.user
                          ?.slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div>
                        <span className="font-semibold">
                          {activity.user}
                        </span>{" "}
                        <span className="text-slate-500">
                          {activity.action}
                        </span>{" "}
                        <span className="font-medium text-blue-600">
                          {activity.issue}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {activity.title}
                      </p>

                      {activity.detail && (
                        <p className="mt-2 text-xs text-slate-500">
                          {activity.detail}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}