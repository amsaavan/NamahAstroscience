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



// ─── Customer Confirmation Email ────────────────────────────────────────────

export async function sendBookingConfirmation(
  booking: BookingRecord,
  isRescheduled: boolean = false
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "smtp_not_configured" };
  }



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
            <h2 style="margin:0 0 8px;font-size:22px;color:#f4c430;">${isRescheduled ? "Schedule Confirmed" : "Booking Confirmed"} ✦</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;">Hi <strong style="color:#e2e8f0;">${booking.fullName}</strong>, your consultation ${isRescheduled ? "schedule has been confirmed" : "has been successfully booked"}.</p>

            <!-- Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #1e2a45;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Date</span><br>
                        <span style="font-size:16px;color:#f4c430;font-weight:600;">${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` &middot; ${booking.slot.replace(/-\\d+$/, "")}` : ""}</span>
                      </td>
                    </tr>

                    ${booking.notes ? `
                    <tr>
                      <td style="padding:10px 0;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Your Notes</span><br>
                        <span style="font-size:15px;color:#e2e8f0;">${booking.notes}</span>
                      </td>
                    </tr>` : ""}
                    ${booking.birthDate ? `
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid #1e2a45;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Birth Details</span><br>
                        <span style="font-size:14px;color:#e2e8f0;">${booking.birthDate}${booking.birthTime ? " at " + booking.birthTime : ""}${booking.birthPlace ? " · " + booking.birthPlace : ""}</span>
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

            <p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 28px;">
              Thank you for choosing Namah Astroscience. We look forward to guiding you.
            </p>

            <!-- Review Request -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(244,196,48,0.07),rgba(122,0,0,0.08));border-radius:14px;border:1px solid rgba(244,196,48,0.25);margin-bottom:8px;overflow:hidden;">
              <tr>
                <td style="padding:22px 28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:18px;">⭐⭐⭐⭐⭐</p>
                  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f4c430;letter-spacing:0.5px;">Please give us your valuable review after consultation</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;line-height:1.6;">Your honest words inspire us and help fellow seekers find clarity through Vedic guidance. It takes just a minute — and it means the world to us.</p>
                  <a href="https://namahastroscience.com/#reviews" style="display:inline-block;background:#f4c430;color:#0d1526;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:12px 28px;border-radius:50px;text-decoration:none;">Leave a Review ✦</a>
                </td>
              </tr>
            </table>
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
    isRescheduled ? "Your consultation schedule has been confirmed." : "Your consultation has been booked successfully.",
    `Date: ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""}`,
    booking.notes ? `Notes: ${booking.notes}` : "",
    "",
    "Jinesh will reach out on WhatsApp to confirm.",
    "WhatsApp: +91 79849 60585",
    "Email: namahastroscience@gmail.com",
    "",
    "--- Please give us your valuable review after consultation ---",
    "Your honest feedback helps us serve you and others better.",
    "Leave a review at: https://namahastroscience.com/#reviews",
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
      subject: isRescheduled ? "Your consultation schedule is confirmed — Namah Astroscience" : "Your consultation is confirmed — Namah Astroscience",
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
  booking: BookingRecord,
  isRescheduled: boolean = false
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "smtp_not_configured" };
  }
  if (!hasAdminEmailConfig()) {
    return { sent: false, reason: "admin_email_not_configured" };
  }



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
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#f4c430;letter-spacing:2px;">${isRescheduled ? "Schedule Set" : "New Booking Received"}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;">${isRescheduled ? "An appointment schedule has been set." : "A new consultation has been booked."} Details below:</p>

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
                    <td style="font-size:15px;color:#f4c430;font-weight:600;padding:6px 0;">${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` &middot; ${booking.slot.replace(/-\\d+$/, "")}` : ""}</td>
                  </tr>

                   ${booking.notes ? `
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;vertical-align:top;">Notes</td>
                    <td style="font-size:14px;color:#e2e8f0;padding:6px 0;">${booking.notes}</td>
                  </tr>` : ""}
                  ${booking.birthDate ? `
                  <tr>
                    <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding:6px 0;vertical-align:top;">Birth Details</td>
                    <td style="font-size:14px;color:#a78bfa;font-weight:600;padding:6px 0;">${booking.birthDate}${booking.birthTime ? " at " + booking.birthTime : ""}${booking.birthPlace ? " · " + booking.birthPlace : ""}</td>
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
    isRescheduled ? "Schedule Set —" : "New Booking —",
    `Name: ${booking.fullName}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Date: ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""}`,
    `Notes: ${booking.notes || "-"}`,
    `Booked At: ${booking.createdAt}`,
  ].join("\n");

  try {
    const transporter = await getTransporter();
    console.log("[email] Sending admin notification to:", process.env.ADMIN_NOTIFY_EMAIL);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: isRescheduled ? `📅 Schedule Set — ${booking.fullName} · ${booking.date}` : `🔔 New Booking — ${booking.fullName} · ${booking.date}`,
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

// ─── Admin OTP Email ─────────────────────────────────────────────────────────

export async function sendAdminOtp(otp: string): Promise<SendOutcome> {
  if (!hasSmtpConfig()) return { sent: false, reason: "smtp_not_configured" };
  if (!hasAdminEmailConfig()) return { sent: false, reason: "admin_email_not_configured" };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B1A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060B1A;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0d1526;border-radius:16px;border:1px solid #1e2a45;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#7A0000,#4a0000);padding:28px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:3px;color:#f4c430;text-transform:uppercase;">Admin Access</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#f4c430;letter-spacing:2px;">Namah Astroscience</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:14px;color:#9ca3af;">Your one-time login code is:</p>
            <p style="margin:16px auto;font-size:42px;font-weight:800;letter-spacing:10px;color:#f4c430;background:#111a2e;border-radius:12px;padding:18px 32px;border:1px solid #1e2a45;">${otp}</p>
            <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">Expires in <strong style="color:#e2e8f0;">10 minutes</strong>. Single-use only.</p>
            <p style="margin:8px 0 0;font-size:12px;color:#4b5563;">If you did not request this, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#070b1a;padding:16px 40px;text-align:center;border-top:1px solid #1e2a45;">
            <p style="margin:0;font-size:11px;color:#4b5563;letter-spacing:2px;text-transform:uppercase;">Namah Astroscience · Admin System</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: `${otp} — Namah Astroscience Admin OTP`,
      text: `Your admin OTP is: ${otp}\n\nExpires in 10 minutes. Single-use.\nIgnore if you did not request this.`,
      html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] sendAdminOtp failed:", message);
    return { sent: false, reason: message };
  }
}

// ─── Invoice & Payment Reminder Emails ───────────────────────────────────────

export async function sendInvoiceEmail(
  booking: BookingRecord,
  amount: string,
  currency: string = "₹",
  note: string = ""
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) return { sent: false, reason: "smtp_not_configured" };

  const noteBlock = note.trim() ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1829;border-radius:12px;border:1px solid #1e2a45;margin-bottom:28px;overflow:hidden;">
              <tr><td style="padding:14px 24px;border-bottom:1px solid #1e2a45;">
                <span style="font-size:11px;color:#f4c430;text-transform:uppercase;letter-spacing:2px;font-weight:700;">✦ A note from Namahastroscience team</span>
              </td></tr>
              <tr><td style="padding:20px 24px;">
                <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.75;white-space:pre-wrap;">${note.trim()}</p>
              </td></tr>
            </table>` : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B1A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060B1A;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d1526;border-radius:16px;border:1px solid #1e2a45;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#7A0000,#4a0000);padding:36px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;letter-spacing:4px;color:#f4c430;text-transform:uppercase;">॥ Shree Ganeshay Namah ॥</p>
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#f4c430;letter-spacing:2px;">Namah Astroscience</h1>
            <p style="margin:8px 0 0;font-size:12px;color:#e2c97e;letter-spacing:3px;text-transform:uppercase;">Invoice for Consultation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#f4c430;">Consultation Completed ✦</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
              Hi <strong style="color:#e2e8f0;">${booking.fullName}</strong>, thank you for your consultation on ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""}. 
              Please find the billing details for your session below.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #1e2a45;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Service</span><br>
                        <span style="font-size:16px;color:#f4c430;">Vedic Astrology Consultation</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:15px 0;">
                        <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Amount Due</span><br>
                        <span style="font-size:28px;color:#f4c430;font-weight:800;">${currency} ${amount}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${noteBlock}

            <div style="background:rgba(244,196,48,0.05);border-radius:12px;padding:24px;border:1px dashed #f4c430;margin-bottom:28px;">
              <p style="margin:0 0 12px;font-size:14px;color:#e2e8f0;font-weight:600;">Payment Instructions:</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Please complete the payment via UPI or Bank Transfer. You can scan the QR code shared on WhatsApp or use our registered mobile number: 
                <strong style="color:#25D366;">+91 79849 60585</strong>.
              </p>
            </div>

            <p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 28px;">
              Once paid, kindly share a screenshot on WhatsApp for our records.
            </p>

            <!-- Review Request -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(244,196,48,0.07),rgba(122,0,0,0.08));border-radius:14px;border:1px solid rgba(244,196,48,0.25);overflow:hidden;">
              <tr>
                <td style="padding:22px 28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:18px;">⭐⭐⭐⭐⭐</p>
                  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f4c430;letter-spacing:0.5px;">Please share your review with us</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;line-height:1.6;">We hope the consultation brought you clarity and direction. Your experience — shared in your own words — helps other seekers trust their journey with Vedic wisdom. We would be truly honoured to hear from you.</p>
                  <a href="https://namahastroscience.com/#reviews" style="display:inline-block;background:#f4c430;color:#0d1526;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:12px 28px;border-radius:50px;text-decoration:none;">Share Your Experience ✦</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#070b1a;padding:20px 40px;text-align:center;border-top:1px solid #1e2a45;">
            <p style="margin:0;font-size:11px;color:#4b5563;letter-spacing:2px;text-transform:uppercase;">© 2026 Namah Astroscience · Vedic Guidance Studio</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const noteText = note.trim() ? `\n\nA note from Namahastroscience team:\n${note.trim()}` : "";

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: booking.email,
      subject: `Invoice for your consultation — Namah Astroscience`,
      text: `Hi ${booking.fullName},\n\nYour consultation on ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""} is completed. Amount due: ${currency} ${amount}.${noteText}\n\nPlease complete the payment via WhatsApp: +91 79849 60585.\n\nPlease share your review with us — your words help us guide others on their journey:\nhttps://namahastroscience.com/#reviews\n\nThank you,\nNamah Astroscience`,
      html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: String(err) };
  }
}

export async function sendPaymentReminderEmail(
  booking: BookingRecord,
  amount: string,
  currency: string = "₹"
): Promise<SendOutcome> {
  if (!hasSmtpConfig()) return { sent: false, reason: "smtp_not_configured" };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B1A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060B1A;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d1526;border-radius:16px;border:1px solid #1e2a45;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#7A0000,#4a0000);padding:30px 40px;text-align:center;">
             <h1 style="margin:0;font-size:24px;font-weight:700;color:#f4c430;letter-spacing:2px;">Payment Reminder</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
              Hi <strong style="color:#e2e8f0;">${booking.fullName}</strong>, this is a friendly reminder regarding the pending payment for your consultation held on ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""}.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111a2e;border-radius:12px;border:1px solid #1e2a45;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Outstanding Balance</span><br>
                  <span style="font-size:28px;color:#f4c430;font-weight:800;">${currency} ${amount}</span>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#9ca3af;line-height:1.7;margin:0 0 24px;">
              If you have already made the payment, please disregard this email. Otherwise, kindly complete the transaction at your earliest convenience.
            </p>

            <p style="margin:0 0 28px;font-size:14px;color:#e2e8f0;text-align:center;">
              📱 WhatsApp support: <a href="https://wa.me/917984960585" style="color:#25D366;">+91 79849 60585</a>
            </p>

            <!-- Review Request -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(244,196,48,0.07),rgba(122,0,0,0.08));border-radius:14px;border:1px solid rgba(244,196,48,0.25);overflow:hidden;">
              <tr>
                <td style="padding:22px 28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:18px;">⭐⭐⭐⭐⭐</p>
                  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f4c430;letter-spacing:0.5px;">Please share your review with us</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;line-height:1.6;">Every consultation is a step on a larger journey. If our guidance resonated with you, a short review from your heart goes a long way — for us, and for everyone who seeks clarity through the stars.</p>
                  <a href="https://namahastroscience.com/#reviews" style="display:inline-block;background:#f4c430;color:#0d1526;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:12px 28px;border-radius:50px;text-decoration:none;">Share Your Experience ✦</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: booking.email,
      subject: `Friendly Payment Reminder — Namah Astroscience`,
      text: `Hi ${booking.fullName},\n\nThis is a friendly reminder for the pending payment of ${currency} ${amount} for your session on ${booking.date}${booking.slot && !booking.slot.startsWith("Standard") ? ` at ${booking.slot.replace(/-\\d+$/, "")}` : ""}.\n\nWhatsApp: +91 79849 60585.\n\nAlso, if you'd like to share your experience with us, we'd love to hear from you:\nhttps://namahastroscience.com/#reviews\n\nThank you,\nNamah Astroscience`,
      html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: String(err) };
  }
}
