package com.wellness.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Service for sending HTML emails via Gmail SMTP.
 * Handles welcome emails, practitioner registration confirmations,
 * and practitioner verification notifications.
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    @Value("${app.support.email}")
    private String supportEmail;

    @Value("${app.login.url}")
    private String loginUrl;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ================= USER WELCOME EMAIL =================

    /**
     * Sends a welcome email when a new PATIENT registers.
     */
    public void sendUserWelcomeEmail(String name, String email) {
        String subject = "Welcome to " + appName + "! 🎉";
        String htmlContent = buildUserWelcomeTemplate(name, email);
        sendHtmlEmail(email, subject, htmlContent);
    }

    // ================= PRACTITIONER REGISTRATION EMAIL =================

    /**
     * Sends a confirmation email when a new PRACTITIONER registers.
     * Informs them their account is pending verification.
     */
    public void sendPractitionerRegistrationEmail(String name, String email) {
        String subject = appName + " — Registration Received";
        String htmlContent = buildPractitionerRegistrationTemplate(name, email);
        sendHtmlEmail(email, subject, htmlContent);
    }

    // ================= PRACTITIONER VERIFIED EMAIL =================

    /**
     * Sends an approval email when an ADMIN verifies a practitioner.
     */
    public void sendPractitionerVerifiedEmail(String name, String email) {
        String subject = "Congratulations! Your " + appName + " Account is Approved ✅";
        String htmlContent = buildPractitionerVerifiedTemplate(name);
        sendHtmlEmail(email, subject, htmlContent);
    }

    // ================= PASSWORD RESET EMAIL =================

    /**
     * Sends a password reset email with a secure reset link.
     * Link expires after 30 minutes and is single-use.
     */
    public void sendPasswordResetEmail(String email, String name, String resetLink) {
        String subject = "Reset Your " + appName + " Password";
        String htmlContent = buildPasswordResetTemplate(name, resetLink);
        sendHtmlEmail(email, subject, htmlContent);
    }

    // ================= CORE SEND METHOD =================

    /**
     * Sends an HTML email. Catches exceptions gracefully so that
     * email failures do not break registration/verification flows.
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(message);
            logger.info("Email sent successfully to {}", to);

        } catch (MessagingException | MailException e) {
            logger.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    // ================= HTML TEMPLATES =================

    private String buildUserWelcomeTemplate(String name, String email) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        .header { background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 26px; }
                        .body { padding: 30px; color: #333333; line-height: 1.7; }
                        .body h2 { color: #2E7D32; }
                        .details { background: #f0f9f0; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
                        .details p { margin: 6px 0; }
                        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; }
                        .footer a { color: #4CAF50; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to %s!</h1>
                        </div>
                        <div class="body">
                            <h2>Hello, %s! 👋</h2>
                            <p>Thank you for joining <strong>%s</strong>. We're thrilled to have you on board!</p>
                            <p>Your account has been created successfully. Here are your account details:</p>
                            <div class="details">
                                <p><strong>Name:</strong> %s</p>
                                <p><strong>Email:</strong> %s</p>
                                <p><strong>Role:</strong> Patient</p>
                            </div>
                            <p>You can now explore our wellness services, book appointments with verified practitioners, and take charge of your well-being.</p>
                            <p>If you have any questions, feel free to reach out to our support team.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 %s. All rights reserved.</p>
                            <p>Need help? Contact us at <a href="mailto:%s">%s</a></p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(appName, name, appName, name, email, appName, supportEmail, supportEmail);
    }

    private String buildPractitionerRegistrationTemplate(String name, String email) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        .header { background: linear-gradient(135deg, #1976D2, #0D47A1); padding: 30px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 26px; }
                        .body { padding: 30px; color: #333333; line-height: 1.7; }
                        .body h2 { color: #1976D2; }
                        .status { background: #FFF8E1; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFC107; text-align: center; }
                        .status .badge { display: inline-block; background: #FFC107; color: #333; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; }
                        .details { background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976D2; }
                        .details p { margin: 6px 0; }
                        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; }
                        .footer a { color: #1976D2; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>%s — Practitioner Registration</h1>
                        </div>
                        <div class="body">
                            <h2>Hello, %s! 👋</h2>
                            <p>Thank you for registering as a <strong>Practitioner</strong> on <strong>%s</strong>.</p>
                            <p>We have received your registration request. Our admin team will review your profile and credentials shortly.</p>
                            <div class="status">
                                <p>Your current account status:</p>
                                <span class="badge">⏳ Pending Verification</span>
                            </div>
                            <div class="details">
                                <p><strong>Name:</strong> %s</p>
                                <p><strong>Email:</strong> %s</p>
                                <p><strong>Role:</strong> Practitioner</p>
                            </div>
                            <p>You will receive another email once your account has been verified and approved. This usually takes 1–2 business days.</p>
                            <p>In the meantime, if you have any questions, please contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 %s. All rights reserved.</p>
                            <p>Need help? Contact us at <a href="mailto:%s">%s</a></p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(appName, name, appName, name, email, appName, supportEmail, supportEmail);
    }

    private String buildPractitionerVerifiedTemplate(String name) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        .header { background: linear-gradient(135deg, #4CAF50, #1B5E20); padding: 30px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 26px; }
                        .body { padding: 30px; color: #333333; line-height: 1.7; }
                        .body h2 { color: #2E7D32; }
                        .status { background: #E8F5E9; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; text-align: center; }
                        .status .badge { display: inline-block; background: #4CAF50; color: #fff; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; }
                        .cta { text-align: center; margin: 30px 0; }
                        .cta a { display: inline-block; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
                        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; }
                        .footer a { color: #4CAF50; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Account Approved! 🎉</h1>
                        </div>
                        <div class="body">
                            <h2>Congratulations, %s! 🎊</h2>
                            <p>Great news! Your practitioner account on <strong>%s</strong> has been reviewed and <strong>approved</strong> by our admin team.</p>
                            <div class="status">
                                <p>Your account status:</p>
                                <span class="badge">✅ Verified</span>
                            </div>
                            <p>You can now log in and start offering your wellness services to our community of patients.</p>
                            <div class="cta">
                                <a href="%s">Log In to Your Account →</a>
                            </div>
                            <p>We're excited to have you as part of our practitioner network. If you need any assistance getting started, don't hesitate to reach out.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 %s. All rights reserved.</p>
                            <p>Need help? Contact us at <a href="mailto:%s">%s</a></p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(name, appName, loginUrl, appName, supportEmail, supportEmail);
    }

    private String buildPasswordResetTemplate(String name, String resetLink) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        .header { background: linear-gradient(135deg, #F57C00, #E65100); padding: 30px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 26px; }
                        .body { padding: 30px; color: #333333; line-height: 1.7; }
                        .body h2 { color: #E65100; }
                        .warning { background: #FFF3E0; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F57C00; }
                        .warning p { margin: 6px 0; }
                        .warning strong { color: #E65100; }
                        .cta { text-align: center; margin: 30px 0; }
                        .cta a { display: inline-block; background: linear-gradient(135deg, #F57C00, #E65100); color: #ffffff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
                        .cta a:hover { opacity: 0.9; }
                        .expiry { background: #FFEBEE; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C62828; text-align: center; }
                        .expiry p { margin: 0; color: #B71C1C; font-weight: bold; }
                        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; }
                        .footer a { color: #F57C00; text-decoration: none; }
                        .divider { border-top: 1px solid #eee; margin: 20px 0; }
                        code { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="body">
                            <h2>Hello, %s! 🔐</h2>
                            <p>We received a request to reset your password for your <strong>%s</strong> account.</p>
                            
                            <div class="warning">
                                <p><strong>⚠️ Important:</strong> This link is <strong>secure</strong> and can only be used once.</p>
                                <p>If you did not request a password reset, please ignore this email. Your account is safe.</p>
                            </div>

                            <p>Click the button below to securely reset your password:</p>
                            
                            <div class="cta">
                                <a href="%s">Reset Your Password →</a>
                            </div>

                            <div class="divider"></div>

                            <p><strong>Or copy and paste this link in your browser:</strong></p>
                            <p><code style="word-break: break-all;">%s</code></p>

                            <div class="divider"></div>

                            <div class="expiry">
                                <p>⏰ This link will expire in <strong>30 minutes</strong></p>
                            </div>

                            <p>Once you reset your password, you'll be able to log in with your new credentials.</p>
                            <p><strong>Your password is never shared via email.</strong> We only send secure reset links.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 %s. All rights reserved.</p>
                            <p>Need help? Contact us at <a href="mailto:%s">%s</a></p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(name, appName, resetLink, resetLink, appName, supportEmail, supportEmail);
    }
}
