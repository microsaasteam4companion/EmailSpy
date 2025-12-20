/**
 * Ingestion Tester
 * Run this to simulate an incoming email to your Cloudflare Worker endpoint.
 */

const WORKER_URL = "https://email-spy-ingest.nikitasiddharth11.workers.dev"; // Update this

const testIngestion = async () => {
    const payload = {
        spy_email: "spy+morningbrew_test@entrext.in",
        from_address: "newsletter@morningbrew.com",
        subject: "The Daily Brew - Breaking News",
        body_text: "Here is your morning intelligence report on tech and business...",
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ Simulation Successful! Check your 'received_emails' table in Supabase.");
        } else {
            console.error("❌ Simulation Failed:", await response.text());
        }
    } catch (error) {
        console.error("❌ Network Error:", error);
    }
};

testIngestion();
