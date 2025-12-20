/**
 * Cerebras AI Analysis Logic
 * This script will fetch un-analyzed emails and generate a summary.
 */

const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY;

export const analyzeEmails = async (emails, mode = 'general') => {
    const emailContent = emails.map(e => `Subject: ${e.subject}\nBody: ${e.body_text}`).join('\n\n---\n\n');

    let systemPrompt = "You are an elite marketing spy agent. Analyze the provided competitor emails.";

    if (mode === 'trends') {
        systemPrompt += " Focused on LONG-TERM TRENDS: Identify shifts in discount strategy, frequency patterns, and keyword changes over the last few months. How are they evolving?";
    } else if (mode === 'benchmarking') {
        systemPrompt += " Focused on BENCHMARKING: Compare these strategies to industry standards (e.g., 20% open rates, Tuesday morning sends). Give actionable advice on how to beat them.";
    } else {
        systemPrompt += " Generate a 3-bullet executive summary: 1. Primary Hook 2. Sending Frequency 3. Key Keywords/Offers.";
    }

    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CEREBRAS_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3.3-70b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze these emails:\n\n${emailContent}` }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Cerebras analysis failed:", error);
        return null;
    }
};
