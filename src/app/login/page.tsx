"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, GraduationCap, LogIn, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Role = "lecturer" | "student";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("lecturer");
  const [email, setEmail] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let signInEmail = email;

      if (role === "student") {
        const { data: lookupEmail, error: lookupError } = await supabase.rpc(
          "get_email_by_matric_no",
          { p_matric_no: matricNo },
        );

        if (lookupError || !lookupEmail) {
          toast.error("Invalid matric number");
          setLoading(false);
          return;
        }

        signInEmail = lookupEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        toast.error("Login failed");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role === "lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-center mx-auto mb-2 rounded-full size-12 bg-primary">
            <LogIn className="size-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your attendance dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex p-1 mb-6 border rounded-lg bg-muted"
            style={{ touchAction: "manipulation" }}
          >
            <div
              role="button"
              tabIndex={0}
              onPointerDown={() => setRole("lecturer")}
              onKeyDown={(e) => e.key === "Enter" && setRole("lecturer")}
              onClick={() => setRole("lecturer")}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium select-none transition-colors ${
                role === "lecturer"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserRound className="size-4" />
              Lecturer
            </div>
            <div
              role="button"
              tabIndex={0}
              onPointerDown={() => setRole("student")}
              onKeyDown={(e) => e.key === "Enter" && setRole("student")}
              onClick={() => setRole("student")}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium select-none transition-colors ${
                role === "student"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-4" />
              Student
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "lecturer" ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="matricNo">Matric Number</Label>
                <Input
                  id="matricNo"
                  type="text"
                  placeholder="e.g. 2101234567"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-9"
                />
                <Button
                  // type="submit"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  // tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-5!"
              disabled={loading}
              size={"lg"}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
