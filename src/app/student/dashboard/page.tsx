"use client";

import { useEffect, useState, useRef, startTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle, Clock, BookOpen } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

type ScanState = "idle" | "scanning" | "success" | "error";

interface AttendanceRecord {
  id: string;
  scanned_at: string;
  sessions: {
    date: string;
    courses: {
      code: string;
      name: string;
    };
  };
}

const SCANNER_ID = "qr-scanner";

export default function StudentDashboard() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [cameraStarted, setCameraStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const supabase = createClient();

  async function fetchHistory() {
    const { data } = await supabase
      .from("attendance")
      .select("id, scanned_at, sessions!inner(date, courses!inner(code, name))")
      .order("scanned_at", { ascending: false })
      .limit(20);

    if (data) {
      setRecords(data as unknown as AttendanceRecord[]);
    }
  }

  useEffect(() => {
    startTransition(() => {
      supabase
        .from("attendance")
        .select(
          "id, scanned_at, sessions!inner(date, courses!inner(code, name))",
        )
        .order("scanned_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) setRecords(data as unknown as AttendanceRecord[]);
        });
    });
  }, []);

  const handleScan = async (decodedText: string) => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      scanner.pause();
      setScanState("scanning");
      setScanMessage("Verifying...");

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: decodedText }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setScanState("success");
        setScanMessage("Attendance marked!");
        toast.success("Attendance recorded successfully");
        fetchHistory();
      } else {
        setScanState("error");
        setScanMessage(data.error ?? "Failed to record attendance");
        toast.error(data.error ?? "Failed to record attendance");
      }
    } catch {
      setScanState("error");
      setScanMessage("Network error. Please try again.");
      toast.error("Network error");
    }

    setTimeout(async () => {
      setScanState("idle");
      setScanMessage("");
      try {
        await scanner.resume();
      } catch {
        // scanner might have been stopped
      }
    }, 3000);
  };

  const handleScanRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    handleScanRef.current = handleScan;
  });

  useEffect(() => {
    let scanner: Html5Qrcode;

    async function startCamera() {
      try {
        scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (text) => void handleScanRef.current(text),
          () => {},
        );

        setCameraStarted(true);
      } catch (err) {
        console.error("Camera error:", err);
        toast.error("Could not access camera");
      }
    }

    startCamera();

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
        try {
          scanner.clear();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scan Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Point your camera at the QR code to mark attendance
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative w-full overflow-hidden rounded-lg aspect-square bg-muted">
            <div id={SCANNER_ID} className="w-full h-full" />

            {!cameraStarted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Camera className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Requesting camera access...
                </p>
              </div>
            )}

            {scanState !== "idle" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                {scanState === "scanning" && (
                  <Clock className="size-12 animate-pulse text-primary" />
                )}
                {scanState === "success" && (
                  <CheckCircle2 className="text-green-500 size-12" />
                )}
                {scanState === "error" && (
                  <XCircle className="size-12 text-destructive" />
                )}
                <p className="mt-2 text-sm font-medium">{scanMessage}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!records.length ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No attendance records yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 size-4" />
                    <div>
                      <p className="text-sm font-medium">
                        {record.sessions.courses.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.sessions.courses.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">
                    <p>{new Date(record.sessions.date).toLocaleDateString()}</p>
                    <p>
                      {new Date(record.scanned_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
