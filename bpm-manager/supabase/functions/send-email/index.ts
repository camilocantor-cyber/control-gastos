import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { from, to, cc, subject, body, smtp } = await req.json();

        console.log(`📧 Sending email from ${from || smtp.user} to ${to} (Subject: ${subject})`);

        // If the user is using Resend API via SMTP configs
        if (smtp.host?.includes('resend') || smtp.user === 'resend') {
            console.log("🚀 Using Resend API...");

            // Priority: passed 'from' field > smtp.user (if email) > onboarding default
            const fromAddress = from || (smtp.user?.includes('@') ? smtp.user : "onboarding@resend.dev");

            // Split comma-separated emails into arrays
            const toArray = typeof to === 'string' ? to.split(',').map(e => e.trim()).filter(Boolean) : (Array.isArray(to) ? to : [to]);
            const ccArray = cc ? (typeof cc === 'string' ? cc.split(',').map(e => e.trim()).filter(Boolean) : (Array.isArray(cc) ? cc : [cc])) : undefined;

            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${smtp.pass}`
                },
                body: JSON.stringify({
                    from: `BPM Manager <${fromAddress}>`,
                    to: toArray,
                    ...(ccArray && ccArray.length > 0 ? { cc: ccArray } : {}),
                    subject: subject || "BPM Notification",
                    html: body || "<p>Notificación del sistema BPM.</p>"
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(`Resend Error: ${JSON.stringify(data)}`);
            }

            return new Response(JSON.stringify({ success: true, message: "Email sent via Resend", data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        else {
            console.log("🌐 Using Generic SMTP Provider...");

            try {
                // Dynamic import to avoid loading SMTP client if we are just using Resend API
                const { SmtpClient } = await import("https://deno.land/x/smtp/mod.ts");
                const client = new SmtpClient();

                // Clean the port or fallback
                const port = smtp.port ? parseInt(smtp.port, 10) : 465;

                await client.connectTLS({
                    hostname: smtp.host,
                    port: port,
                    username: smtp.user,
                    password: smtp.pass,
                });

                await client.send({
                    from: from || smtp.user,
                    to: to,
                    cc: cc || undefined,
                    subject: subject || "BPM Notification",
                    content: "auto",
                    html: body || "<p>Notificación del sistema BPM.</p>"
                });

                await client.close();

                return new Response(JSON.stringify({ success: true, message: "Email sent via SMTP Provider" }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (smtpError: any) {
                console.error("❌ SMTP Client Error: ", smtpError);
                throw new Error(`Fallo conectando al servidor SMTP: ${smtpError.message}`);
            }
        }
    } catch (error: any) {
        console.error('❌ Email Error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
