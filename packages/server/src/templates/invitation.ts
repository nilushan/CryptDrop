interface InvitationData {
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  inviteUrl: string;
}

export function invitationEmailHtml(data: InvitationData): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <div style="background:#1c1917;padding:24px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">CryptDrop</h1>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;color:#1c1917;line-height:1.6;margin:0 0 16px">
      <strong>${esc(data.senderName)}</strong> (${esc(data.senderEmail)}) wants to send you an encrypted file using CryptDrop.
    </p>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px">
      To receive encrypted files, you need to set up your own encryption keys. It only takes a minute.
    </p>
    <a href="${esc(data.inviteUrl)}" style="display:block;text-align:center;background:#1c1917;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
      Set Up Your Keys
    </a>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;line-height:1.5">
      Your keys are generated entirely in your browser. CryptDrop never sees your private key.
    </p>
  </div>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
