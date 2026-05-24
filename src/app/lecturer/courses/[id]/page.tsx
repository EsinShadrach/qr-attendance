import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QrCodeDialog } from "@/components/lecturer/qr-code-dialog";
import { AttendanceTable } from "@/components/lecturer/attendance-table";
import { AttendanceChart } from "@/components/lecturer/attendance-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CalendarCheck, Clock, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SessionDataPoint {
  date: string;
  attended: number;
  total: number;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, code, lecturer_id")
    .eq("id", id)
    .single();

  if (!course || course.lecturer_id !== userData.user.id) notFound();

  const { count: studentCount } = await supabase
    .from("enrollments")
    .select("student_id", { count: "exact", head: true })
    .eq("course_id", id);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, qr_token, expires_at, created_at")
    .eq("course_id", id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const totalStudents = studentCount ?? 0;
  const totalSessions = sessions?.length ?? 0;

  const sessionAttendance = new Map<string, number>();
  const chartData: SessionDataPoint[] = [];
  if (sessions?.length) {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    for (const session of sessions) {
      const { count } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id);
      sessionAttendance.set(session.id, count ?? 0);
    }
    for (const session of sorted) {
      chartData.push({
        date: session.date,
        attended: sessionAttendance.get(session.id) ?? 0,
        total: totalStudents,
      });
    }
  }

  const totalAttendance = chartData.reduce((s, d) => s + d.attended, 0);
  const avgAttendance =
    totalSessions > 0
      ? Math.round(
          (totalAttendance / totalSessions / Math.max(totalStudents, 1)) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{course.code}</h1>
            <Badge variant="outline">{course.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Course detail and attendance management
          </p>
        </div>
        <QrCodeDialog courseId={id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-2xl font-bold">{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
              <p className="text-2xl font-bold">{avgAttendance}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Session</p>
              <p className="text-2xl font-bold">
                {totalSessions > 0
                  ? new Date(sessions![0].date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={sessions?.[0]?.id ?? ""}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {sessions?.[0] && (
            <TabsTrigger value={sessions[0].id}>Latest Attendance</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sessions" className="space-y-3">
          {!sessions?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12">
                <CalendarCheck className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No sessions yet. Generate a QR code to start.
                </p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => {
              const count = sessionAttendance.get(session.id) ?? 0;
              const expired = new Date(session.expires_at) < new Date();
              return (
                <Card key={session.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-sm">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {expired ? "Expired" : "Active"} · Created{" "}
                        {new Date(session.created_at).toLocaleTimeString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={count > 0 ? "default" : "secondary"}>
                        {count} attended
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link href={`/lecturer/courses/${id}/students`} />
                        }
                      >
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>

        {sessions?.[0] && (
          <TabsContent value={sessions[0].id}>
            <AttendanceTable sessionId={sessions[0].id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
