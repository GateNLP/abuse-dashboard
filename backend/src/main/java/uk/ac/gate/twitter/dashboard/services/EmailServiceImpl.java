package uk.ac.gate.twitter.dashboard.services;

import java.util.List;
import java.util.Map;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring5.SpringTemplateEngine;

@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host")
public class EmailServiceImpl {

    @Autowired
    private JavaMailSender emailSender;

    @Autowired
    private SpringTemplateEngine thymeleafTemplateEngine;

    public void sendMessage(List<String> to, String subject, String html, Map<String,Resource> images) {

        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to.toArray(new String[0]));
            helper.setSubject(subject);
            helper.setText(html, true);

            if (images != null) {
                for (Map.Entry<String,Resource> image : images.entrySet()) {
                    helper.addInline(image.getKey(), image.getValue());
                }
            }

            emailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void sendMessage(List<String> to, String subject, String template, Map<String, Object> templateModel, Map<String,Resource> images)
            throws MessagingException {

        Context thymeleafContext = new Context();
        thymeleafContext.setVariables(templateModel);
        String htmlBody = thymeleafTemplateEngine.process(template, thymeleafContext);

        sendMessage(to, subject, htmlBody, images);
    }
}