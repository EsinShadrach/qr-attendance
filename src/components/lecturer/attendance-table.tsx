"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface AttendanceRecord {
  id: string;
  student_id: string;
  scanned_at: string;
  users: {
    name: string;
    matric_no: string | null;
  };
}

interface AttendanceTableProps {
  sessionId: string;
}

export function AttendanceTable({ sessionId }: AttendanceTableProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAttendance() {
      const { data } = await supabase
        .from("attendance")
        .select("id, student_id, scanned_at, users!inner(name, matric_no)")
        .eq("session_id", sessionId)
        .order("scanned_at", { ascending: true });

      if (data) setRecords(data as unknown as AttendanceRecord[]);
      setLoading(false);
    }

    fetchAttendance();
  }, [sessionId, supabase]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading attendance...
        </CardContent>
      </Card>
    );
  }

  if (!records.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <Users className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No attendance recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Attendance ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {record.users.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium">{record.users.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.users.matric_no ?? "—"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {new Date(record.scanned_at).toLocaleTimeString()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
