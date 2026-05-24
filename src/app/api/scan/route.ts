import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { qr_token } = await request.json();
  if (!qr_token || typeof qr_token !== "string") {
    return NextResponse.json({ error: "Missing qr_token" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, course_id, expires_at")
    .eq("qr_token", qr_token)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "Session has expired" }, { status: 410 });
  }

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("session_id", session.id)
    .eq("student_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Already marked present" },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase.from("attendance").insert({
    session_id: session.id,
    student_id: userData.user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    session_id: session.id,
    course_id: session.course_id,
  });
}
