import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, code, name, lecturer_id")
    .eq("id", courseId)
    .single();

  if (!course || course.lecturer_id !== userData.user.id) notFound();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("course_id", courseId);

  if (!enrollments?.length) {
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
            <h1 className="text-2xl font-bold">{course.code} — Students</h1>
            <p className="text-sm text-muted-foreground">{course.name}</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Users className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No students enrolled yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("course_id", courseId)
    .order("date", { ascending: false });

  const totalSessions = sessions?.length ?? 0;

  const studentIds = enrollments.map((e) => e.student_id);

  const { data: students } = await supabase
    .from("users")
    .select("id, name, matric_no, email")
    .in("id", studentIds);

  const { data: allAttendance } = await supabase
    .from("attendance")
    .select("student_id, session_id, scanned_at")
    .in("student_id", studentIds)
    .in("session_id", sessions?.map((s) => s.id) ?? []);

  const attendanceByStudent = new Map<
    string,
    { count: number; lastAttended: string | null }
  >();
  for (const record of allAttendance ?? []) {
    const prev = attendanceByStudent.get(record.student_id) ?? {
      count: 0,
      lastAttended: null,
    };
    prev.count++;
    const scanned = record.scanned_at;
    if (!prev.lastAttended || scanned > prev.lastAttended) {
      prev.lastAttended = scanned;
    }
    attendanceByStudent.set(record.student_id, prev);
  }

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
          <h1 className="text-2xl font-bold">{course.code} — Students</h1>
          <p className="text-sm text-muted-foreground">
            {course.name} · {students?.length ?? 0} enrolled
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {students?.map((student) => {
              const stats = attendanceByStudent.get(student.id) ?? {
                count: 0,
                lastAttended: null,
              };
              const rate =
                totalSessions > 0
                  ? Math.round((stats.count / totalSessions) * 100)
                  : 0;
              return (
                <Link
                  key={student.id}
                  href={`/lecturer/courses/${courseId}/students/${student.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-xs font-medium rounded-full size-8 bg-primary/10 text-primary">
                      {student.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.matric_no ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{rate}%</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.count}/{totalSessions} sessions
                      </p>
                    </div>
                    <Badge variant={rate >= 75 ? "default" : "secondary"}>
                      {rate >= 75 ? "Good" : "Low"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
