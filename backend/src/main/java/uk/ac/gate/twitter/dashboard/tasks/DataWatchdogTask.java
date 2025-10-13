package uk.ac.gate.twitter.dashboard.tasks;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.DataWatchdogQueries;
import uk.ac.gate.twitter.dashboard.services.EmailServiceImpl;

@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host")
public class DataWatchdogTask {

    @Autowired
    DataWatchdogQueries queries;

    @Autowired(required = false)
    private EmailServiceImpl emailService;

    @Autowired
    private Dashboards dashboards;

    @Value("classpath:/mail-templates/images/UoS_Crest.png")
    private Resource universityLogo;

    @Value("classpath:/mail-templates/images/logo48.png")
    private Resource dashboardLogo;

    // this essentially leaves a gap of 6 hours after one run finihses before the next
    // one starts again.
    @Scheduled(fixedDelay = 1000 * 60 * 60 * 6)
    public void checkDataVolume() throws Exception {

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

            SearchSourceBuilder sourceBuilder = queries.generateDataWatchdogQuery(dashboard);

            SearchRequest searchRequest = new SearchRequest(dashboard.getIndex());
            searchRequest.source(sourceBuilder);

            SearchResponse searchResponse = getClient(dashboard).search(searchRequest, RequestOptions.DEFAULT);

            // this gets us a map from platform to the number of posts within the last day
            Map<String, Long> platformCounts = aggregationToMap(searchResponse.getAggregations().get("platforms"));

            // this gets the set of platforms we are monitoring accounts on
            Set<String> platforms = dashboard.getPlatforms();
            
            // if we take one from the other we get left with the platforms we are monitoring
            // for which we've no ingested any new posts in the last day
            platforms.removeAll(platformCounts.keySet());

            // and if that set isn't empty then we need to send an email to alert someone
            boolean tripped = !platforms.isEmpty();

            if (tripped) {

                Map<String, Object> data = new HashMap<String, Object>();
                data.put("platforms", String.join(", ", platforms));
                data.put("dashboardURL", dashboards.getRootURL()+id+"/");
                data.put("dashboardTitle", dashboard.getTitle());

                Map<String, Resource> images = new HashMap<String, Resource>();
                images.put("UoS_Crest.png", universityLogo);
                images.put("dashboard-logo.png", dashboardLogo);

                // we only send this type of warning to the first address registered for the
                // dashbaord
                emailService.sendMessage(sendAlertsTo.subList(0, 1), "Social Media Abuse Dashboard", "watchdog.html",
                        data,
                        images);
            }
        }
    }
}
