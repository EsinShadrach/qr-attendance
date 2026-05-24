import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: courseId, studentId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, code, name, lecturer_id")
    .eq("id", courseId)
    .single();

  if (!course || course.lecturer_id !== userData.user.id) notFound();

  const { data: student } = await supabase
    .from("users")
    .select("id, name, matric_no, email")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("course_id", courseId)
    .order("date", { ascending: false });

  const { data: attendance } = await supabase
    .from("attendance")
    .select("session_id, scanned_at")
    .eq("student_id", studentId)
    .in("session_id", sessions?.map((s) => s.id) ?? []);

  const attendedSessionIds = new Set(attendance?.map((a) => a.session_id));
  const totalSessions = sessions?.length ?? 0;
  const attendedCount = attendance?.length ?? 0;
  const percentage =
    totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/lecturer/courses/${courseId}`} />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.matric_no ?? student.email} · {course.code}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold">{percentage}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions Attended</p>
              <p className="text-2xl font-bold">
                {attendedCount}/{totalSessions}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!sessions?.length ? (
            <div className="flex flex-col items-center py-12 text-center gap-2">
              <CalendarCheck className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No sessions yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => {
                const attended = attendedSessionIds.has(session.id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant={attended ? "default" : "secondary"}>
                      {attended ? "Present" : "Absent"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
