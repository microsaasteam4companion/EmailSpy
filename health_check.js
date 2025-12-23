
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// 1. Load Environment Variables
const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value) env[key.trim()] = value.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const WORKER_URL = "https://email-spy-ingest.nikitasiddharth11.workers.dev"

async function runHealthCheck() {
    console.log("🏥 Starting System Health Check...")

    // 1. Verify Database Connection
    const { data: comps, error: dbError } = await supabase.from('competitors').select('spy_email').limit(1)
    if (dbError) {
        console.error("❌ Database Error:", dbError.message)
        return
    }
    if (!comps.length) {
        console.error("❌ No competitors found. Please add one in the dashboard first.")
        return
    }
    console.log("✅ Database Connected")

    // 2. Simulate Ingestion via Worker
    const validSpyEmail = comps[0].spy_email
    console.log(`Testing Ingestion for: ${validSpyEmail}`)

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                spy_email: validSpyEmail,
                from_address: "health-check@system.com",
                subject: "System Health Verified ✅",
                body_text: "Your EmailSpy system is fully operational. This confirming that Cloudflare, Supabase, and your Dashboard are talking to each other correctly.",
                timestamp: new Date().toISOString()
            })
        })

        if (response.ok) {
            console.log("✅ Cloudflare Worker Connected (Status: 200)")
            console.log("✅ Ingestion Successful!")
            console.log("👉 Go refresh your dashboard. You should see 'System Health Verified'.")
        } else {
            console.error("❌ Worker Failed:", await response.text())
        }
    } catch (err) {
        console.error("❌ Network Error:", err.message)
    }
}

runHealthCheck()
