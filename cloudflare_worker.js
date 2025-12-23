/**
 * Cloudflare Worker: Email to Webhook
 * This worker captures incoming emails and sends them to your Supabase Edge Function or Backend.
 */

export default {
    async email(message, env, ctx) {
        // Simple internal parsing to avoid 'postal-mime' dependency errors in Dashboard
        const raw = await new Response(message.raw).text();

        let subject = "No Subject";
        try {
            const subjectMatch = raw.match(/^Subject: (.+)$/m);
            if (subjectMatch) subject = subjectMatch[1];
        } catch (e) { }

        let body_text = "Content parsing failed";
        try {
            // Basic body extraction (splits headers from body)
            const parts = raw.split(/\r\n\r\n|\n\n/);
            if (parts.length > 1) body_text = parts.slice(1).join("\n\n").substring(0, 2000);
        } catch (e) { }

        return this.handleIngestion({
            spy_email: message.to,
            from_address: message.from,
            subject: subject,
            body_text: body_text,
            body_html: ""
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
        const compResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/competitors?spy_email=eq.${encodeURIComponent(spy_email)}&select=id`, {
            headers: {
                "apikey": env.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
            }
        });
        const competitors = await compResponse.json();

        if (!competitors || competitors.length === 0) {
            return new Response(JSON.stringify({ error: "Competitor not found", email: spy_email }), { status: 404, headers: { "Content-Type": "application/json" } });
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
                body_html: body_html || "",
                received_at: new Date().toISOString()
            })
        });

        if (!insertResponse.ok) {
            const errText = await insertResponse.text();
            return new Response(JSON.stringify({ error: "Insert failed", details: errText }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, competitor_id }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
}
