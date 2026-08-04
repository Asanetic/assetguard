import nodemailer from 'nodemailer';

export async function sendEmailMessage(receiverMail, subject, message)
{   
    // Logic to send email
    const transporter = nodemailer.createTransport({ sendmail: true });

    await transporter.sendMail({
        from: 'info@clearphrases.com',
        to: receiverMail,
        subject,
        text: message,
    });
    
    return {status: 'success', message: 'Email sent successfully to ' + receiverMail};

}


