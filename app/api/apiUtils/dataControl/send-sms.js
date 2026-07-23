/**
 * ════════════════════════════════════════════════════════════════
 * FILE: send-sms.js
 * PURPOSE: SMS sending utility using Asanetic SMS API
 * AUTO-GENERATED: 2026-01-24
 * ════════════════════════════════════════════════════════════════
 */

const SMS_API_URL = "https://asanetic.com/sms/sendsms";

/**
 * Send SMS using Asanetic SMS API
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} - Response object { status, message, data }
 */
export async function mosySendSMS(phone, message) {
    try {
        // Build request body
        const requestBody = new URLSearchParams({
            pushsms: '',
            recp: phone,
            body: message
        }).toString();

        console.log(`[SMS] Sending to ${phone}`);

        // Send SMS request
        const res = await fetch(SMS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: requestBody
        });

        // Handle response
        if (!res.ok) {
            console.error(`[SMS ERROR] HTTP ${res.status}`);
            return {
                status: 'error',
                message: `SMS API error: ${res.status}`,
                data: null
            };
        }

        console.log(`[SMS SUCCESS] Message sent to ${phone}`);

        return {
            status: 'success',
            message: 'SMS sent successfully',
            data: {
                recipient: phone,
                timestamp: new Date().toISOString()
            }
        };

    } catch (err) {
        console.error(`[SMS ERROR] ${err.message}`);
        return {
            status: 'error',
            message: 'Failed to send SMS',
            data: null
        };
    }
}