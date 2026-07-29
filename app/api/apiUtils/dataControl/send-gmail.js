/**
 * ════════════════════════════════════════════════════════════════
 * FILE: send-gmail.js
 * PURPOSE: Email sending utility using Gmail via Nodemailer
 * AUTO-GENERATED: 2026-01-24
 * ════════════════════════════════════════════════════════════════
 */

import nodemailer from 'nodemailer';

/**
 * Send email using Gmail via Nodemailer
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} message - Email message content
 * @returns {Promise<Object>} - Response object { status, message, data }
 */
export async function mosySendEmail(email, subject, message) {
    const emailpassword = `ksff wxtm mqfd ngww`
    const emailAccount  =`symphonygpske@gmail.com`;

    try {
        // Configure Gmail transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: `${emailAccount}`,
                pass: `${emailpassword}`, // Gmail App Password
            },
        });

        console.log(`[EMAIL] Sending to ${email}`);

        // Send email
        const info = await transporter.sendMail({
            from: `Symphony <${emailAccount}>`,
            to: email,
            subject: subject,
            text: message, // Plain text version
            html: `<p>${message.replace(/\n/g, '<br/>')}</p>`, // HTML version
        });

        console.log(`[EMAIL SUCCESS] Message sent to ${email} - ID: ${info.messageId}`);

        return {
            status: 'success',
            message: 'Email sent successfully',
            data: {
                recipient: email,
                messageId: info.messageId,
                timestamp: new Date().toISOString()
            }
        };

    } catch (err) {
        console.error(`[EMAIL ERROR] ${err.message}`);
        return {
            status: 'error',
            message: 'Failed to send email',
            data: null
        };
    }
}
