package uk.ac.gate.twitter.dashboard.controllers;

import java.util.HashMap;
import java.util.Map;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.elasticsearch.common.Strings;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.databind.ObjectMapper;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.CoordinationQueries;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@RestController
public class CoordinationController {

    @Value("${coordination.endpoint}")
    private String ENDPOINT;

    @Autowired
    private Dashboards indexDetails;

    @Autowired
    private CoordinationQueries coordinationQueries;

    @Autowired
    QueryParts queryParts;

    final static private ObjectMapper JACKSON = new ObjectMapper();

    final static private CloseableHttpClient HTTP_CLIENT = HttpClients.createDefault();

    @GetMapping("/{dashboard}/coordination/{job}/status")
    public Map<String, Object> getStatus(@PathVariable(required = true) String dashboard,
            @PathVariable(required = true) String job) throws Exception {

        HttpGet httpGet = new HttpGet(ENDPOINT + "/job/" + job);
        httpGet.setHeader("Accept", "application/json");

        try (CloseableHttpResponse httpResponse = HTTP_CLIENT.execute(httpGet)) {
            return JACKSON.readValue(httpResponse.getEntity().getContent(), Map.class);
        }

    }

    @GetMapping("/{dashboard}/coordination/{job}/graph")
    public Map<String, Object> getGraph(@PathVariable(required = true) String dashboard,
            @PathVariable(required = true) String job) throws Exception {

        HttpGet httpGet = new HttpGet(ENDPOINT + "/graph/" + job);
        httpGet.setHeader("Accept", "application/json");

        try (CloseableHttpResponse httpResponse = HTTP_CLIENT.execute(httpGet)) {
            return JACKSON.readValue(httpResponse.getEntity().getContent(), Map.class);
        }

    }

    @PostMapping("/{dashboard}/coordination/process")
    public Map<String, Object> process(@RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "from", defaultValue = "") String from,
            @RequestParam(value = "to", defaultValue = "") String to,
            @PathVariable(required = true) String dashboard,
            @RequestBody Map<String,Object> filter) throws Exception {

        Dashboards.Config config = indexDetails.get(dashboard);

        BoolQueryBuilder baseQuery = coordinationQueries.generateBaseQuery(config,
                from == null || from.equals("") ? config.getFrom() : from,
                to == null || to.equals("") ? config.getTo() : to, query,
                filter);

        // NOTE: this is a bit of an efficiency hack in that we further filter the
        // docs to only those that contain a hashtag so that when we process in the
        // coordination tool we don't pull docs from the index that don't contain
        // a hashtag
        baseQuery.filter(QueryBuilders.existsQuery(config.getHashtagField()));

        Map<String, Object> request = new HashMap<String, Object>();

        //request.put("hosts", new String[]{config.getElastic().get("host")});
        //request.put("index", config.getIndex());

        request.put("query", JACKSON.readValue(Strings.toString(baseQuery), Map.class));
        request.put("ignore", new String[0]);

        request.put("elasticsearch","gs10");
        request.put("index",dashboard);
        request.put("link_type","hashtag");

        /*Map<String,String> mapping = new HashMap<String,String>();
        mapping.put("user_id",config.getTweetPrefix()+"user.id_str");
        mapping.put("screen_name",config.getTweetPrefix()+"user.screen_name");
        mapping.put("post_id",config.getTweetPrefix()+"id_str");
        mapping.put("timestamp",config.getTweetPrefix()+"created_at");
        mapping.put("text","text");*/

        //request.put("mapping",mapping);


        HttpPost httpPost = new HttpPost(ENDPOINT+"/process");
        StringEntity entity = new StringEntity(JACKSON.writeValueAsString(request));

        httpPost.setEntity(entity);
        httpPost.setHeader("Accept", "application/json");
        httpPost.setHeader("Content-type", "application/json");

        try (CloseableHttpResponse httpResponse = HTTP_CLIENT.execute(httpPost)) {
            return JACKSON.readValue(httpResponse.getEntity().getContent(), Map.class);
        }
    }
}
