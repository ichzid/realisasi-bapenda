"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();

      // Format time: HH:MM:SS
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setTime(`${h}:${m}:${s}`);

      // Format date: Hari, DD Bulan YYYY
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      setDate(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null; // avoid hydration mismatch

  return (
    <div className="text-text-secondary text-right" style={{ marginTop: "0.3vh" }}>
      <div className="font-mono font-medium text-text-primary" style={{ fontSize: "clamp(0.8rem, 1vw, 1.1rem)" }}>
        {time}
      </div>
      <div style={{ fontSize: "clamp(0.55rem, 0.65vw, 0.75rem)" }}>{date}</div>
    </div>
  );
}
