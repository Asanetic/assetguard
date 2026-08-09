// app/api/apiUtils/notify/send-sms.js
// SMS sending via the Asanetic SMS API.
const SMS_API_URL = process.env.SMS_API_URL || "https://asanetic.com/sms/sendsms";

/**
 * Send an SMS.
 * @param {string} phone   recipient phone number
 * @param {string} message message body
 * @returns {Promise<{status:'success'|'error', message:string, data:object|null}>}
 */
export async function mosySendSMS(phone, message) {
  try {
    const requestBody = new URLSearchParams({
      pushsms: "",
      recp: phone,
      body: message,
    }).toString();

    console.log(`[SMS] Sending to ${phone}`);
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: requestBody,
    });

    if (!res.ok) {
      console.error(`[SMS ERROR] HTTP ${res.status}`);
      return { status: "error", message: `SMS API error: ${res.status}`, data: null };
    }

    console.log(`[SMS SUCCESS] Message sent to ${phone}`);
    return {
      status: "success",
      message: "SMS sent successfully",
      data: { recipient: phone },
    };
  } catch (err) {
    console.error(`[SMS ERROR] ${err.message}`);
    return { status: "error", message: "Failed to send SMS", data: null };
  }
}

// alias
export const sendSMS = mosySendSMS;
