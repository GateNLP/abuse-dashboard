package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.getTweetFromSource;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.simplifyTweet;

import java.io.IOException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchScrollRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.common.document.DocumentField;
import org.elasticsearch.core.TimeValue;
import org.elasticsearch.search.Scroll;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.aggregations.Aggregation;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;

import uk.ac.gate.twitter.dashboard.config.CategoryInformation;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.ConversationQueries;

@RestController
public class ConversationController {

   @Autowired
   private CategoryInformation categories;

   @Autowired
   private Dashboards dashboards;

   @Autowired
   private ConversationQueries conversationQueries;

   private static Scroll ELASTIC_SCROLL = new Scroll(TimeValue.timeValueMinutes(20L));

   @GetMapping("/{dashboard}/replies/scroll")
   public List<Map<String, Object>> scroll(@RequestParam(value = "id") String id,
         @PathVariable(required = true) String dashboard) throws IOException {

      Dashboards.Config dashboardConfig = dashboards.get(dashboard);
      
      // TODO what happens if the scroll has expired? Can we return a message we can capture
      SearchScrollRequest scrollRequest = new SearchScrollRequest(id);
      scrollRequest.scroll(ELASTIC_SCROLL);
      SearchResponse searchResponse = getClient(dashboardConfig).scroll(scrollRequest, RequestOptions.DEFAULT);
      
      List<Map<String, Object>> response = scroll(dashboardConfig, searchResponse.getHits().getHits());
      
      if (response.size() == 0 && searchResponse.getHits().getHits().length > 0) {
         response = scroll(id,dashboard);
      }
      
      return response;
   }

   private List<Map<String, Object>> scroll(Dashboards.Config dashboardConfig, SearchHit[] hits) {
      List<Map<String, Object>> data = new ArrayList<Map<String, Object>>();
      
      ZoneId timezone = ZoneId.of(dashboardConfig.getTimezone());

      for (SearchHit hit : hits) {
         Map<String, Object> sourceMap = hit.getSourceAsMap();
         
         //if (dashboardConfig.getCompliance().getStrict() && sourceMap.containsKey("compliance")) continue;
            
         Map<String, Object> tweet = getTweetFromSource(dashboardConfig.getTweetPrefix(), sourceMap);

         tweet = simplifyTweet(tweet, sourceMap, timezone, categories.getField(), "category");

         if (!tweet.containsKey("category")) {
            DocumentField df = hit.getFields().get(categories.getField());
            // if the field is null then we don't have any category info at all
            if (df != null)
               tweet.put("category", df.getValue().toString());
         }

         tweet.put("color", categories.getColor((String) tweet.get("category")));

         data.add(tweet);
      }

      return data;
   }

   @GetMapping("/{dashboard}/conversation")
   public Map<String, Object> conversation(@RequestParam(value = "id") String id,
         @RequestParam(value = "categories") String stance, @RequestParam(value = "restrict") String restrict,
         @PathVariable(required = true) String dashboard) throws Exception {
      
      Dashboards.Config config = dashboards.get(dashboard);

      // build a map to hold the final JSON response (probably doesn't need to be
      // ordered but this makes quickly glancing at them for debug purposes easier)
      Map<String, Object> data = new LinkedHashMap<String, Object>();

      if (stance.equals("")) {
         // if stance is the empty string than someone has stupidly unchecked all
         // four stance types so there is nothing for us to match against
         data.put("number_of_replies", 0);
         data.put("hashtags", new HashMap());
         data.put("users", new HashMap());
         data.put("urls", new HashMap());
         return data;
      }

      SearchSourceBuilder sourceBuilder = conversationQueries.generateConversationQuery(config, id, stance, restrict);

      // build the request
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // run the request and get the response
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      // how many tweets are there in total
      long numberReplies = searchResponse.getHits().getTotalHits().value;

      data.put("scroll_id", searchResponse.getScrollId());

      // store the number of replies within the conversation (this is the size of the
      // conversation minus the original tweet)
      data.put("number_of_replies", numberReplies);

      // now copy the aggregations into the top level response
      Map<String, Aggregation> aggregations = searchResponse.getAggregations().asMap();

      data.put("hashtags", aggregationToMap(aggregations.get("hashtags")));
      data.put("urls", aggregationToMap(aggregations.get("urls")));

      Map<String,Map> users = new LinkedHashMap<String,Map>();

      ((MultiBucketsAggregation) aggregations.get("users")).getBuckets().forEach(b -> {
        Map<String,Object> ud = new HashMap<String,Object>();

        ud.put("posts", (long) b.getDocCount());

        MultiBucketsAggregation platforms = (MultiBucketsAggregation)b.getAggregations().get("platform");
         if (platforms.getBuckets().size() > 0) {
            ud.put("platform", platforms.getBuckets().get(0).getKeyAsString());
         } else {
            // if there are no platform then assume this is an old twitter index
            ud.put("platform", "Twitter");
         }

         users.put( b.getKeyAsString(),ud);
      });

      data.put("users",users);

      // return the final JSON response
      return data;
   }

   @GetMapping("/{dashboard}/replies")
   public Map<String, Object> replies(@RequestParam(value = "id") String id,
         @RequestParam(value = "categories", required = false, defaultValue = "") String stance,
         @RequestParam(value = "restrict", required = false, defaultValue = "") String restrict,
         @RequestParam(value = "screen_name", required = false) String screenName,
         @RequestParam(value = "hashtag", required = false) String hashtag,
         @PathVariable(required = true) String dashboard) throws IOException {

      Dashboards.Config config = dashboards.get(dashboard);

      // build a map to hold the final JSON response (probably doesn't need to be
      // ordered but this makes quickly glancing at them for debug purposes easier)

      Map<String, Object> data = new LinkedHashMap<String, Object>();

      if (stance.equals("")) {
         // if stance is the empty string than someone has stupidly unchecked all
         // four stance types so there is nothing for us to match against
         data.put("total", 0);
         data.put("replies", new ArrayList());
         return data;
      }

      SearchSourceBuilder sourceBuilder = conversationQueries.generateRepliesQuery(config, id, stance, restrict, screenName, hashtag);
      sourceBuilder.fetchSource(true);
      sourceBuilder.size(10);

      // build the request
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);
      searchRequest.scroll(ELASTIC_SCROLL);

      // run the request and get the response
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      // how many tweets are there in total
      long numberReplies = searchResponse.getHits().getTotalHits().value;

      data.put("scroll_id", searchResponse.getScrollId());

      // store the number of replies within the conversation (this is the size of the
      // conversation minus the original tweet)
      data.put("total", numberReplies);

      data.put("replies", scroll(config, searchResponse.getHits().getHits()));

      // return the final JSON response
      return data;
   }

}
