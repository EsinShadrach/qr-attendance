import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { StudentSidebar } from "@/components/student/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    <SidebarProvider defaultOpen={true}>
      <StudentSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <p className="font-medium">{profile.name}</p>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(profile.name ?? "")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
