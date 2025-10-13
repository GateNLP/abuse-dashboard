package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;

import java.util.List;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilter;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.DatasetDecayQueries;

@RestController
public class DatasetDecayController {

   @Autowired
   private Dashboards dashboards;

   @Autowired
   private DatasetDecayQueries decayQueries;

   @PostMapping("/{dashboard}/decay")
   public Map<String, Object> decay(@PathVariable(required = true) String dashboard,
         @RequestParam(value = "query", required = false) String query,
         @RequestParam(value = "from", defaultValue = "") String from,
         @RequestParam(value = "to", defaultValue = "") String to,
         @RequestBody(required = false) Map<String,Object> filter) throws Exception {

      Map<String, Object> result = new LinkedHashMap<String, Object>();

      Dashboards.Config dashboardConfig = dashboards.get(dashboard);

      result.put("abusive", decay(dashboardConfig, from, to, query, filter, true));
      result.put("notAbusive", decay(dashboardConfig, from, to, query, filter, false));

      return result;
   }

   private Map<String, Object> decay(Dashboards.Config config, String from, String to, String query, Map<String,Object> filter, boolean abusive)
         throws IOException {

      if (from == null || from.equals(""))
         from = config.getFrom();
      if (to == null || to.equals(""))
         to = config.getTo();

      SearchSourceBuilder sourceBuilder = decayQueries.generateDecayQuery(config, from, to, query, filter, abusive);
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);
      
      ParsedFilter scrubbed = (ParsedFilter)searchResponse.getAggregations().get("scrub");
      
      Map<String, Long> reason = aggregationToMap(scrubbed.getAggregations().get("compliance-reason"));
      
      Map<String, Object> result = new LinkedHashMap<String, Object>();

      result.put("total", searchResponse.getHits().getTotalHits().value);
      result.put("removed", reason.values().stream().reduce(0L, Long::sum));
      result.put("reasons", reason);
      
      List accounts = new ArrayList();
      
      ((ParsedStringTerms)scrubbed.getAggregations().get("accounts")).getBuckets().forEach(b -> {
         Map data = aggregationToMap(b.getAggregations().get("compliance-reason"));
         data.put("total", ((Map<String,Long>)data).values().stream().reduce(0L, Long::sum));
         data.put("screen_name",b.getKeyAsString());
         accounts.add(data);
      });
      
      result.put("accounts", accounts);

      return result;
   }
}
