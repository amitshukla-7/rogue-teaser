/**
 * Production Error Alerting & Logging Utility.
 * Sends real-time error pings to a Discord/Slack webhook if configured in .env.
 */
export async function sendErrorAlert(title: string, errorDetails: any, context?: Record<string, any>) {
  const errorMessage = errorDetails?.message || String(errorDetails);
  console.error(`🚨 [PRODUCTION ERROR] ${title}:`, errorDetails, context ? JSON.stringify(context) : '');

  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `🚨 Rogue Teaser Alert: ${title}`,
            description: `\`\`\`${errorMessage.slice(0, 1000)}\`\`\``,
            color: 16711680, // Red
            fields: [
              { name: 'Environment', value: process.env.NODE_ENV || 'production', inline: true },
              { name: 'Timestamp', value: new Date().toLocaleString(), inline: true },
              ...(context
                ? Object.entries(context).slice(0, 4).map(([k, v]) => ({ name: k, value: String(v).slice(0, 200), inline: true }))
                : [])
            ]
          }
        ]
      })
    });
  } catch (alertErr) {
    console.error('Failed to send error webhook alert:', alertErr);
  }
}
