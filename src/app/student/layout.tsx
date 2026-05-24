import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "student") {
    redirect(profile?.role === "lecturer" ? "/lecturer/dashboard" : "/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <GraduationCap className="size-5 text-primary" />
            AttendanceIQ
          </Link>
          <div className="ml-auto text-sm text-muted-foreground">
            {profile.name}
          </div>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
