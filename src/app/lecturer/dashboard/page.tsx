import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/lecturer/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Users, CalendarCheck, GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function LecturerDashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code")
    .eq("lecturer_id", userData.user.id);

  const courseIds = courses?.map((c) => c.id) ?? [];

  const { data: enrollments } = courseIds.length
    ? await supabase
        .from("enrollments")
        .select("course_id, student_id")
        .in("course_id", courseIds)
    : { data: [] };

  const { data: sessions } = courseIds.length
    ? await supabase
        .from("sessions")
        .select("id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const { data: attendance } = sessions?.length
    ? await supabase
        .from("attendance")
        .select("id, session_id")
        .in(
          "session_id",
          sessions.map((s) => s.id),
        )
    : { data: [] };

  const totalCourses = courses?.length ?? 0;
  const totalStudents = new Set(enrollments?.map((e) => e.student_id)).size;
  const totalSessions = sessions?.length ?? 0;
  const totalAttendance = attendance?.length ?? 0;

  const sessionsByCourse = new Map<string, number>();
  sessions?.forEach((s) => {
    sessionsByCourse.set(
      s.course_id,
      (sessionsByCourse.get(s.course_id) ?? 0) + 1,
    );
  });

  const attendanceByCourse = new Map<string, number>();
  attendance?.forEach((a) => {
    attendanceByCourse.set(
      a.session_id,
      (attendanceByCourse.get(a.session_id) ?? 0) + 1,
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your courses and attendance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Courses"
          value={totalCourses}
          icon={<BookOpen className="size-5" />}
        />
        <StatCard
          title="Enrolled Students"
          value={totalStudents}
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Sessions Held"
          value={totalSessions}
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          title="Attendance Records"
          value={totalAttendance}
          icon={<GraduationCap className="size-5" />}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Courses</h2>
        {!courses?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 gap-2">
              <BookOpen className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No courses assigned yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const sessionCount = sessionsByCourse.get(course.id) ?? 0;
              return (
                <Link key={course.id} href={`/lecturer/courses/${course.id}`}>
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardHeader>
                      <CardTitle>{course.code}</CardTitle>
                      <CardDescription>{course.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
