import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatTimestamp24h } from "@/lib/datetime";

/**
 * Fire-and-forget email to every ADMIN when a user's account signs in from a
 * device it hasn't seen before. Never throws — a notification failure must
 * never block the login it's reporting on. Skips silently if RESEND_API_KEY
 * isn't set yet (see .env.local).
 */
export async function notifyAdminsOfNewDevice(params: {
  userName: string;
  userEmail: string;
  deviceLabel: string;
  deviceType: string;
  location: string | null;
  ipAddress: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("notifyAdminsOfNewDevice: RESEND_API_KEY or RESEND_FROM_EMAIL not set, skipping email");
    return;
  }

  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const resend = new Resend(apiKey);
    const when = formatTimestamp24h(new Date().toISOString());

    await resend.emails.send({
      from,
      to: admins.map((a) => a.email),
      subject: `New device login — ${params.userName}`,
      text: [
        `${params.userName} (${params.userEmail}) signed in from a new device.`,
        ``,
        `Device: ${params.deviceLabel} (${params.deviceType})`,
        `Location: ${params.location ?? "Unknown"}`,
        `IP: ${params.ipAddress ?? "Unknown"}`,
        `Time: ${when} (Asia/Manila)`,
        ``,
        `Review or kick this device in Admin > Users > Device Logins.`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("notifyAdminsOfNewDevice failed:", error);
  }
}
