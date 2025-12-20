/**
 * Cloudflare Worker: Email to Webhook
 * This worker captures incoming emails and sends them to your Supabase Edge Function or Backend.
 */

export default {
    async email(message, env, ctx) {
        // Use PostalMime to extract full text/html body
        const { default: PostalMime } = await import("postal-mime");
        const parsed = await PostalMime.parse(message.raw);

        return this.handleIngestion({
            spy_email: message.to,
            from_address: message.from,
            subject: parsed.subject || "No Subject",
            body_text: parsed.text || "No text content found",
            body_html: parsed.html || ""
        }, env);
    },

    async fetch(request, env) {
        if (request.method === "POST") {
            const data = await request.json();
            await this.handleIngestion(data, env);
            return new Response("OK", { status: 200 });
        }
        return new Response("Email Spy Worker Active", { status: 200 });
    },

    async handleIngestion(data, env) {
        const { spy_email, from_address, subject, body_text, body_html } = data;

        // 1. Get Competitor ID from spy_email
        const compResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/competitors?spy_email=eq.${spy_email}&select=id`, {
            headers: {
                "apikey": env.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
            }
        });
        const competitors = await compResponse.json();

        if (!competitors || competitors.length === 0) {
            console.error("Competitor not found for email:", spy_email);
            return;
        }

        const competitor_id = competitors[0].id;

        // 2. Insert into received_emails
        const insertResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/received_emails`, {
            method: "POST",
            headers: {
                "apikey": env.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({
                competitor_id,
                from_address,
                subject,
                body_text,
                body_html,
                received_at: new Date().toISOString()
            })
        });

        if (!insertResponse.ok) {
            console.error("Failed to insert email:", await insertResponse.text());
        }
    }
}
