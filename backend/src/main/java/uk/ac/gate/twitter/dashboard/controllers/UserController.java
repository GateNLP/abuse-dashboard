package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.getTweetFromSource;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.simplifyTweet;

import java.io.IOException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.elasticsearch.action.search.ClearScrollRequest;
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchScrollRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.common.Strings;
import org.elasticsearch.core.TimeValue;
import org.elasticsearch.search.Scroll;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilter;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedTerms;
import org.elasticsearch.search.aggregations.metrics.ParsedMax;
import org.elasticsearch.search.aggregations.metrics.ParsedMin;
import org.elasticsearch.search.aggregations.metrics.ParsedTopHits;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.UserQueries;
import uk.ac.gate.twitter.dashboard.utils.Twitter;

@RestController
public class UserController {

   private ExecutorService executor = Executors.newCachedThreadPool();

   @Autowired
   private Dashboards dashboards;

   @Autowired
   private UserQueries userQueries;

   @GetMapping("/{dashboard}/user/search")
   public Map<String, Object> search(@PathVariable(required = true) String dashboard,
         @RequestParam(value = "query") String query) throws IOException {

      Dashboards.Config config = dashboards.get(dashboard);

      String minMatch = null;


      if (query.startsWith("@")) {
         String screenName = query.substring(1).split("\\s+")[0];

         SearchSourceBuilder screenNameQuery = userQueries.generateUserQuery(config,screenName,null);

         SearchRequest searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(screenNameQuery);

         // run the request and get the response
         SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         // TODO deal with user that doesn't exist in the index
         
         if (searchResponse.getHits().getTotalHits().value == 0) {
            Map<String,Object> error = new HashMap<String,Object>();

            error.put("flashType","info");
            error.put("flashMessage","Unable to locate requested user within the index");

            return error;
         }


         Map<String, Object> sourceMap = (Map<String, Object>) searchResponse.getHits().getHits()[0].getSourceAsMap();

         Map<String, Object> tweet = (Map<String, Object>) getTweetFromSource(config.getTweetPrefix(), sourceMap);
   
         tweet = simplifyTweet(tweet, sourceMap, ZoneId.of(config.getTimezone()));
   
         Map<String, Object> user = (Map<String, Object>) tweet.get("user");

         query = (String)user.get("description");

         query = query.replaceAll("[^a-zA-Z0-9]+"," ").trim();

         if (query.length() == 0) {
            Map<String,Object> error = new HashMap<String,Object>();

            error.put("flashType","info");
            error.put("flashMessage","User does not have a description we can use as a search query");

            return error;
         }

         minMatch = "25%";
      }


      SearchSourceBuilder sourceBuilder = userQueries.generateUserSearchQuery(config, query, minMatch);

      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // run the request and get the response
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      if (searchResponse.getHits().getTotalHits().value == 0) {
         Map<String,Object> error = new HashMap<String,Object>();

         error.put("flashType","info");
         error.put("flashMessage","Unable to find any matching/similar user descriptions");

         return error;
      }



      List<Map<String, Object>> users = new ArrayList<Map<String, Object>>();

      ZoneId timezone = ZoneId.of(config.getTimezone());

      ZonedDateTime today = ZonedDateTime.now(timezone);

      ((MultiBucketsAggregation) searchResponse.getAggregations().get("screen_name")).getBuckets().forEach(b -> {
         Map<String, Object> singleUser = new LinkedHashMap<String, Object>();

         List<Map<String, Object>> bios = new ArrayList<Map<String, Object>>();
         singleUser.put("bios", bios);

         singleUser.put("screen_name", b.getKeyAsString());

         singleUser.put("hits", (long) b.getDocCount());

         singleUser.put("relevance", ((ParsedTopHits)b.getAggregations().get("bestMatch")).getHits().getMaxScore());

         ZonedDateTime createdAt = Twitter
               .getZonedDateTime(((ParsedMin) b.getAggregations().get("created_at")).getValueAsString(), timezone);

         ZonedDateTime tweetedAt = Twitter
               .getZonedDateTime(((ParsedMax) b.getAggregations().get("tweeted_at")).getValueAsString(), timezone);
         
         MultiBucketsAggregation platforms = (MultiBucketsAggregation)b.getAggregations().get("platform");
         if (platforms.getBuckets().size() > 0) {
            singleUser.put("platform", platforms.getBuckets().get(0).getKeyAsString());
         } else {
            // if there are no platform then assume this is an old twitter index
            singleUser.put("platform", "Twitter");            
         }

         if (config.getBio()) {           
            ParsedTerms ba = b.getAggregations().get("bio");

            ba.getBuckets().forEach(bio -> {
               Map<String, Object> singleBio = new HashMap<String, Object>();

               singleBio.put("description", bio.getKeyAsString());
               singleBio.put("count", bio.getDocCount());

               ZonedDateTime earliest = Twitter.getZonedDateTime(
                     ((ParsedMin) bio.getAggregations().get("earliest")).getValueAsString(), timezone);
               ZonedDateTime latest = Twitter
                     .getZonedDateTime(((ParsedMax) bio.getAggregations().get("latest")).getValueAsString(), timezone);

               singleBio.put("earliest", Twitter.formatZonedDateTime(earliest));
               singleBio.put("latest", Twitter.formatZonedDateTime(latest));

               bios.add(singleBio);
            });
         }

         long age = ChronoUnit.DAYS.between(createdAt, today);

         singleUser.put("created_at", Twitter.formatZonedDateTime(createdAt));
         singleUser.put("age", age);

         singleUser.put("tweeted_at", String.format("%04d-%02d-%02d", tweetedAt.getYear(), tweetedAt.getMonthValue(),
               tweetedAt.getDayOfMonth()));

         users.add(singleUser);

      });

      Map<String, Object> results = new HashMap<String, Object>();

      Map<String, Long> totals = new HashMap<String, Long>();
      totals.put("users", (long) users.size());
      totals.put("tweets", searchResponse.getHits().getTotalHits().value);

      results.put("users", users);
      results.put("totals", totals);

      return results;
   }

   @GetMapping("/{dashboard}/user")
   public Map<String, Object> user(@RequestParam(value = "screen_name") String screenName,
         @RequestParam(value = "date", defaultValue = "") String date, @PathVariable(required = true) String dashboard)
         throws IOException {

      Dashboards.Config config = dashboards.get(dashboard);

      SearchSourceBuilder sourceBuilder = userQueries.generateUserQuery(config, screenName, date);

      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // run the request and get the response
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      // TODO handle the case of no results

      if (searchResponse.getHits().getHits().length == 0) {
         Map<String, Object> data = new LinkedHashMap<String, Object>();
         data.put("screen_name", screenName);
         data.put("error", "No information about this user is available within our index");

         return data;
      }

      Map<String, Long> status = aggregationToMap(searchResponse.getAggregations().get("status"));

      Map<String, Object> sourceMap = (Map<String, Object>) searchResponse.getHits().getHits()[0].getSourceAsMap();

      Map<String, Object> tweet = (Map<String, Object>) getTweetFromSource(config.getTweetPrefix(), sourceMap);

      tweet = simplifyTweet(tweet, sourceMap, ZoneId.of(config.getTimezone()));

      Map<String, Object> user = (Map<String, Object>) tweet.get("user");

      if (status.getOrDefault("suspended", 0L) > 0) {
         user.put("account_status", "suspended");
         // be careful if there are no deleted tweets and no tweets at all we don't
         // want to claim the account is deleted. Mind you if we handle no hits properly
         // further up then this will never occur
      } else if (status.getOrDefault("deleted", 0L).equals(searchResponse.getHits().getTotalHits().value)) {
         user.put("account_status", "deleted");
      } else {
         user.put("account_status", "active");
      }

      user.put("platform",tweet.getOrDefault("platform", "Twitter"));

      user.put("tweet_date", tweet.get("created_at_time"));

      if (config.getBio()) {
         List<Map<String, Object>> bios = new ArrayList<Map<String, Object>>();

         ZoneId timezone = ZoneId.of(config.getTimezone());
         ParsedTerms ba = searchResponse.getAggregations().get("bio");

         ba.getBuckets().forEach(bio -> {
            Map<String, Object> singleBio = new HashMap<String, Object>();

            singleBio.put("description", bio.getKeyAsString());
            singleBio.put("count", bio.getDocCount());

            ZonedDateTime earliest = Twitter
                  .getZonedDateTime(((ParsedMin) bio.getAggregations().get("earliest")).getValueAsString(), timezone);
            ZonedDateTime latest = Twitter
                  .getZonedDateTime(((ParsedMax) bio.getAggregations().get("latest")).getValueAsString(), timezone);

            singleBio.put("earliest", Twitter.formatZonedDateTime(earliest));
            singleBio.put("latest", Twitter.formatZonedDateTime(latest));

            bios.add(singleBio);
         });

         user.put("bios", bios);
      }

      return user;
   }

}
