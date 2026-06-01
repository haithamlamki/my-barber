const MAILPIT_BASE = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitListItem {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

/** Removes all messages so a test reads only the OTP it just triggered. */
export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILPIT_BASE}/api/v1/messages`, { method: "DELETE" });
}

/**
 * Polls Mailpit for the newest message addressed to `email` and extracts the
 * 6-digit OTP. The code may sit in the subject or only in the body, so we read
 * the full message and scan subject + text + html.
 */
export async function waitForOtp(email: string, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_BASE}/api/v1/messages`);
    if (res.ok) {
      const body = (await res.json()) as { messages?: MailpitListItem[] };
      const match = body.messages?.find((m) =>
        m.To.some((t) => t.Address.toLowerCase() === email.toLowerCase()),
      );
      if (match) {
        const detailRes = await fetch(`${MAILPIT_BASE}/api/v1/message/${match.ID}`);
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as { Text?: string; HTML?: string };
          const haystack = `${match.Subject}\n${detail.Text ?? ""}\n${detail.HTML ?? ""}`;
          const code = haystack.match(/\b(\d{6})\b/)?.[1];
          if (code) return code;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No OTP email for ${email} within ${timeoutMs}ms`);
}
