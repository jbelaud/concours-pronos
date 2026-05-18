import { BrevoClient } from "@getbrevo/brevo"

const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "noreply@concourspronos.fr"
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "ConcoursPronos"
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

interface SendInviteParams {
  to: { email: string; firstName: string; lastName: string }
  token: string
  contestName?: string
}

export async function sendInvitationEmail({
  to,
  token,
  contestName,
}: SendInviteParams): Promise<void> {
  const inviteUrl = `${APP_URL}/invitation/${token}`

  await client.transactionalEmails.sendTransacEmail({
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to.email, name: `${to.firstName} ${to.lastName}` }],
    subject: `${to.firstName}, tu es invité(e) à rejoindre ConcoursPronos ! ⚽`,
    htmlContent: buildInviteHtml({ firstName: to.firstName, inviteUrl, contestName }),
    textContent: buildInviteText({ firstName: to.firstName, inviteUrl, contestName }),
  })
}

function buildInviteHtml({
  firstName,
  inviteUrl,
  contestName,
}: {
  firstName: string
  inviteUrl: string
  contestName?: string
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0B1020;font-family:Inter,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1020;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#00D1FF,#7C3AED);border-radius:16px;padding:12px 24px;">
              <span style="color:#fff;font-size:22px;font-weight:700;">⚽ ConcoursPronos</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#131A2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
            <h1 style="color:#F0F4FF;font-size:24px;font-weight:700;margin:0 0 8px;">Salut ${firstName} 👋</h1>
            <p style="color:rgba(240,244,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px;">
              Tu es invité(e) à rejoindre${contestName ? ` le concours <strong style="color:#00D1FF">${contestName}</strong>` : ""} sur <strong style="color:#F0F4FF">ConcoursPronos</strong>.
            </p>
            <p style="color:rgba(240,244,255,0.6);font-size:15px;line-height:1.6;margin:0 0 32px;">
              Pronostique les matchs, suis le classement en temps réel et défie tes amis sur chaque tournoi ! 🏆
            </p>
            <div style="text-align:center;margin-bottom:32px;">
              <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#00D1FF,#7C3AED);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:9999px;">
                Créer mon compte →
              </a>
            </div>
            <p style="color:rgba(240,244,255,0.4);font-size:13px;text-align:center;margin:0;">
              Ce lien est valable 7 jours.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:24px;">
            <p style="color:rgba(240,244,255,0.3);font-size:12px;margin:0;">ConcoursPronos · Plateforme privée de pronostics football</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

function buildInviteText({
  firstName,
  inviteUrl,
  contestName,
}: {
  firstName: string
  inviteUrl: string
  contestName?: string
}): string {
  return `Salut ${firstName},\n\nTu es invité(e) à rejoindre${contestName ? ` le concours "${contestName}"` : ""} sur ConcoursPronos.\n\nClique sur ce lien pour créer ton compte :\n${inviteUrl}\n\nCe lien est valable 7 jours.\n\n— L'équipe ConcoursPronos`
}
