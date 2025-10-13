package uk.ac.gate.twitter.dashboard.tasks;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.controllers.AlertsController;
import uk.ac.gate.twitter.dashboard.services.EmailServiceImpl;

@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host")
public class AlertsEmailTask {

    @Autowired(required = false)
    private EmailServiceImpl emailService;

    @Autowired
    private Dashboards dashboards;

    @Autowired
    private AlertsController alertsController;

    @Value("classpath:/mail-templates/images/UoS_Crest.png")
    private Resource universityLogo;

    @Value("classpath:/mail-templates/images/logo48.png")
    private Resource dashboardLogo;

    // this essentially leaves a gap of 15 minutes after one run finishes before the
    // next one starts
    @Scheduled(fixedDelay = 1000 * 60 * 15)
    public void checkAlertStatus() throws Exception {

        // if the email service hasn't been correctly configured then just quit now
        // this should never happen due to the conditional annotation on the class
        // but better this null check than hitting an NPE later on
        if (emailService == null)
            return;

        for (String id : dashboards.getIds()) {
            Dashboards.Config dashboard = dashboards.get(id);

            List<String> sendAlertsTo = dashboard.getSendAlertsTo();

            // this dashboard doesn't have an email address configured so no
            // point doing any work to see if we should send an email or not
            if (sendAlertsTo == null || sendAlertsTo.isEmpty())
                continue;

            Map<String, Object> data = alertsController.alert(id, null);
            Map<String, Object> status = (Map<String, Object>) data.get("status");

            System.out.println(status);

            boolean trigger = (boolean)status.get("triggered");
            
            Boolean previous = dashboard.getAlertTriggered();

            Map<String,Object> everything = (Map<String,Object>)((Map<String,Object>)data.get("abusive")).get("everything");

            System.out.println(id+"/"+trigger+"/"+previous+"/"+everything.get("z_score"));

            Boolean tripped = trigger && previous != null && !previous;
            
            if (tripped) {

                everything.put("dashboardURL", dashboards.getRootURL()+id+"/");
                everything.put("dashboardTitle", dashboard.getTitle());
                everything.put("triggered",trigger);
                everything.put("previous",previous);
                everything.put("tripped", tripped);

                Map<String,Resource> images = new HashMap<String,Resource>();
                images.put("UoS_Crest.png", universityLogo);
                images.put("dashboard-logo.png", dashboardLogo);

                emailService.sendMessage(sendAlertsTo, "Social Media Abuse Dashboard", "alert.html", everything, images);
            }

            dashboard.setAlertTriggered(trigger);
        }
    }
}
