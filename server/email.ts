import { Resend } from "resend";

const FROM_EMAIL = "noreply@drgladysz.com";
const APP_NAME = "Opus";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable must be set");
  }
  return new Resend(apiKey);
}

function getAppDomain(): string {
  // Custom domain takes priority
  if (process.env.APP_DOMAIN) {
    return process.env.APP_DOMAIN;
  }
  // Railway auto-generated domain
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return "https://logbook-api.drgladysz.com";
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  userName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient();
    const resetUrl = `${getAppDomain()}/reset-password?token=${token}`;

    const greeting = userName ? `Hi ${userName}` : "Hi";

    const { error } = await client.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: "Reset Your Password — Opus",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f7fa;">
          <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #007AFF 0%, #0056D2 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${APP_NAME}</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                ${greeting},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #007AFF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #007AFF; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent by ${APP_NAME}<br>
                Privacy-first surgical logbook
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${greeting},

We received a request to reset your password for ${APP_NAME}.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

- The ${APP_NAME} Team`,
    });

    if (error) {
      console.error(
        "Resend error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return { success: false, error: error.message };
    }

    console.log("Password reset email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient();

    const { error } = await client.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Welcome to ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f7fa;">
          <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #007AFF 0%, #0056D2 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${APP_NAME}</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hi ${userName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Welcome to ${APP_NAME}! Your account has been created successfully.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                ${APP_NAME} is a local-first surgical logbook designed for microsurgery and reconstruction procedures. Core patient records and media stay encrypted on your device, while your account and profile details are stored securely on our servers.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions, feel free to reach out to us.
              </p>
            </div>
            <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent by ${APP_NAME}<br>
                Privacy-first surgical logbook
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${userName},

Welcome to ${APP_NAME}! Your account has been created successfully.

${APP_NAME} is a local-first surgical logbook designed for microsurgery and reconstruction procedures. Core patient records and media stay encrypted on your device, while your account and profile details are stored securely on our servers.

If you have any questions, feel free to reach out to us.

- The ${APP_NAME} Team`,
    });

    if (error) {
      console.error(
        "Resend error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return { success: false, error: error.message };
    }

    console.log("Welcome email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: message };
  }
}

export async function sendInvitationEmail(
  recipientEmail: string,
  senderName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient();
    const appStoreUrl =
      "https://apps.apple.com/app/opus-logbook/id6759992788";

    const { error } = await client.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Dr ${senderName} invited you to ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f7fa;">
          <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #E5A00D 0%, #B47E00 100%); padding: 32px; text-align: center;">
              <h1 style="color: #0C0F14; margin: 0; font-size: 24px; font-weight: 600;">${APP_NAME}</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hi,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Dr ${senderName} has invited you to join <strong>${APP_NAME}</strong> — a privacy-first surgical case logbook for documenting procedures, tracking outcomes, and sharing case experience with your operative team.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appStoreUrl}" style="display: inline-block; background: #E5A00D; color: #0C0F14; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Download ${APP_NAME}
                </a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                Once you sign up, Dr ${senderName} will be able to share operative cases with you for team documentation and assessment.
              </p>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                All patient data is end-to-end encrypted — even the ${APP_NAME} server cannot read shared case records.
              </p>
            </div>
            <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent by ${APP_NAME}<br>
                Privacy-first surgical logbook
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi,

Dr ${senderName} has invited you to join ${APP_NAME} — a privacy-first surgical case logbook for documenting procedures, tracking outcomes, and sharing case experience with your operative team.

Download ${APP_NAME}: ${appStoreUrl}

Once you sign up, Dr ${senderName} will be able to share operative cases with you for team documentation and assessment.

All patient data is end-to-end encrypted — even the ${APP_NAME} server cannot read shared case records.

- The ${APP_NAME} Team`,
    });

    if (error) {
      console.error(
        "Resend error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return { success: false, error: error.message };
    }

    console.log("Invitation email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: message };
  }
}
