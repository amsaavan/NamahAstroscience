import nodemailer from "nodemailer";
import { BookingRecord } from "@/lib/booking";

type SendOutcome = {
  sent: boolean;
  reason?: string;
};

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

function hasAdminEmailConfig() {
  return Boolean(process.env.ADMIN_NOTIFY_EMAIL);
}

async function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatSlot(slot: string) {
  const [hStr, mStr] = slot.split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Customer Confirmation Email ────────────────────────────────────────────

export async function sendBookingConfirmation(
  booking: BookingRecord
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const timeLabel = formatSlot(booking.slot);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B1A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060B1A;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d1526;border-radius:16px;border:1px solid #1e2a45;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7A0000,#4a0000);padding:36px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;letter-spacing:4px;color:#f4c430;text-transform:uppercase;">॥ Shree Ganeshay Namah ॥</p>
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#f4c430;letter-spacing:2px;">Namah Astroscience</h1>
            <p style="margin:8px 0 0;font-size:12px;color:#e2c97e;letter-spacing:3px;text-transform:uppercase;">Vedic Guidance Studio</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#f4c430;">Booking Confirmed ✦</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;">Hi <strong style="color:#e2e8f0;">${booking.fullName}</strong>, your consultation has been successfully booked.</p>

            <!-- Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #1e2a45;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Date</span><br>
                        <span style="font-size:16px;color:#f4c430;font-weight:600;">${booking.date}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #1e2a45;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Time</span><br>
                        <span style="font-size:16px;color:#f4c430;font-weight:600;">${timeLabel}</span>
                      </td>
                    </tr>
                    ${booking.notes ? `
                    <tr>
                      <td style="padding:10px 0;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Your Notes</span><br>
                        <span style="font-size:15px;color:#e2e8f0;">${booking.notes}</span>
                      </td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#9ca3af;line-height:1.7;margin:0 0 24px;">
              Jinesh Shah will reach out to you on your WhatsApp number
              (<strong style="color:#e2e8f0;">${booking.whatsapp}</strong>) to confirm the session details.
              If you have any questions in the meantime, feel free to email us.
            </p>

            <!-- Contact -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 28px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Contact</p>
                  <p style="margin:0;font-size:14px;color:#e2e8f0;">📱 WhatsApp: <a href="https://wa.me/917984960585" style="color:#25D366;">+91 79849 60585</a></p>
                  <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;">📧 Email: <a href="mailto:namahastroscience@gmail.com" style="color:#f4c430;">namahastroscience@gmail.com</a></p>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
              Thank you for choosing Namah Astroscience. We look forward to guiding you.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#070b1a;padding:20px 40px;text-align:center;border-top:1px solid #1e2a45;">
            <p style="margin:0;font-size:11px;color:#4b5563;letter-spacing:2px;text-transform:uppercase;">© 2026 Namah Astroscience · All rights reserved</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${booking.fullName},`,
    "",
    "Your consultation has been booked successfully.",
    `Date: ${booking.date}`,
    `Time: ${timeLabel}`,
    booking.notes ? `Notes: ${booking.notes}` : "",
    "",
    "Jinesh will reach out on WhatsApp to confirm.",
    "WhatsApp: +91 79849 60585",
    "Email: namahastroscience@gmail.com",
    "",
    "Thank you,",
    "Namah Astroscience",
  ].filter(Boolean).join("\n");

  try {
    const transporter = await getTransporter();
    console.log("[email] Sending customer confirmation to:", booking.email);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: booking.email,
      subject: "Your consultation is confirmed — Namah Astroscience",
      text,
      html,
    });
    console.log("[email] Customer email sent, messageId:", info.messageId);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] sendBookingConfirmation failed:", message);
    return { sent: false, reason: message };
  }
}

// ─── Admin Notification Email ────────────────────────────────────────────────

export async function sendAdminBookingNotification(
  booking: BookingRecord
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "smtp_not_configured" };
  }
  if (!hasAdminEmailConfig()) {
    return { sent: false, reason: "admin_email_not_configured" };
  }

  const timeLabel = formatSlot(booking.slot);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B1A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060B1A;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d1526;border-radius:16px;border:1px solid #1e2a45;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7A0000,#4a0000);padding:28px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:3px;color:#f4c430;text-transform:uppercase;">Admin Notification</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#f4c430;letter-spacing:2px;">New Booking Received</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;">A new consultation has been booked. Details below:</p>

            <!-- Client Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;background:#0f1829;border-bottom:1px solid #1e2a45;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Client Information</span>
              </td></tr>
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="8">
                  <tr>
                    <td style="width:130px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Name</td>
                    <td style="font-size:15px;color:#e2e8f0;font-weight:600;padding:6px 0;">${booking.fullName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Email</td>
                    <td style="padding:6px 0;"><a href="mailto:${booking.email}" style="font-size:15px;color:#f4c430;">${booking.email}</a></td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">WhatsApp</td>
                    <td style="padding:6px 0;"><a href="https://wa.me/${booking.whatsapp.replace(/\D/g, "")}" style="font-size:15px;color:#25D366;">${booking.whatsapp}</a></td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Booking Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;background:#0f1829;border-bottom:1px solid #1e2a45;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Appointment Details</span>
              </td></tr>
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="8">
                  <tr>
                    <td style="width:130px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Date</td>
                    <td style="font-size:15px;color:#f4c430;font-weight:600;padding:6px 0;">${booking.date}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Time</td>
                    <td style="font-size:15px;color:#f4c430;font-weight:600;padding:6px 0;">${timeLabel}</td>
                  </tr>
                  ${booking.notes ? `
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;vertical-align:top;">Notes</td>
                    <td style="font-size:14px;color:#e2e8f0;padding:6px 0;">${booking.notes}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Booked At</td>
                    <td style="font-size:13px;color:#9ca3af;padding:6px 0;">${booking.createdAt}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
              Log in to the admin dashboard to manage this booking.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#070b1a;padding:18px 40px;text-align:center;border-top:1px solid #1e2a45;">
            <p style="margin:0;font-size:11px;color:#4b5563;letter-spacing:2px;text-transform:uppercase;">Namah Astroscience · Admin System</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "New Booking —",
    `Name: ${booking.fullName}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Date: ${booking.date}`,
    `Time: ${timeLabel}`,
    `Notes: ${booking.notes || "-"}`,
    `Booked At: ${booking.createdAt}`,
  ].join("\n");

  try {
    const transporter = await getTransporter();
    console.log("[email] Sending admin notification to:", process.env.ADMIN_NOTIFY_EMAIL);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: `🔔 New Booking — ${booking.fullName} · ${booking.date} at ${timeLabel}`,
      text,
      html,
    });
    console.log("[email] Admin email sent, messageId:", info.messageId);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] sendAdminBookingNotification failed:", message);
    return { sent: false, reason: message };
  }
}
