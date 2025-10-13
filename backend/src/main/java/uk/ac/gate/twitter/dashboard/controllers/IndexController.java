package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationBucketToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationNestedBucketsToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.findBucket;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.getTweetFromSource;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.simplifyTweet;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.collections.map.LRUMap;
import org.elasticsearch.action.search.ClearScrollRequest;
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchScrollRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.common.Strings;
import org.elasticsearch.core.TimeValue;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.index.query.RangeQueryBuilder;
import org.elasticsearch.index.query.MultiMatchQueryBuilder.Type;
import org.elasticsearch.search.Scroll;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.aggregations.Aggregation;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation.Bucket;
import org.elasticsearch.search.aggregations.bucket.ParsedSingleBucketAggregation;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilter;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilters;
import org.elasticsearch.search.aggregations.bucket.nested.ParsedNested;
import org.elasticsearch.search.aggregations.bucket.nested.ParsedReverseNested;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedTerms;
import org.elasticsearch.search.aggregations.bucket.terms.Terms;
import org.elasticsearch.search.aggregations.metrics.Cardinality;
import org.elasticsearch.search.aggregations.metrics.ParsedCardinality;
import org.elasticsearch.search.aggregations.metrics.ParsedMax;
import org.elasticsearch.search.aggregations.metrics.ParsedMin;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.search.sort.FieldSortBuilder;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.opencsv.CSVWriter;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.config.Dashboards.User;
import uk.ac.gate.twitter.dashboard.queries.IndexQueries;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;
import uk.ac.gate.twitter.dashboard.utils.Twitter;

@RestController
public class IndexController {

   @Autowired
   private Dashboards indexDetails;

   @Autowired
   private IndexQueries indexQueries;

   @Autowired
   QueryParts queryParts;

   private static Map<Integer,Map<String,Object>> cache =  Collections.synchronizedMap(new LRUMap(1000));

   public int cacheFilter(Map<String,Object> filter) {
      int hashCode = filter.hashCode();

      if (!cache.containsKey(hashCode))
         cache.put(filter.hashCode(),filter);

      return hashCode;
   }

   public Map<String,Object> getCachedFilter(int id) {
      return cache.getOrDefault(id, new HashMap<String,Object>());
   }

   private static Scroll ELASTIC_SCROLL = new Scroll(TimeValue.timeValueMinutes(20L));

   /**
    * Converts a map of dates and counts into the timeseries structure needed by
    * Plotly on the front end
    * 
    * @param data  the raw dates and counts in a map
    * @param name  the name of the timeseries
    * @param color the color of the timeseries
    * @return correctly constructed Plotly timeseries map
    */
   private static Map<String, Object> convertToSeries(Map<String, Long> data, String name, String color, String type,
         LocalDate firstDay, LocalDate lastDay) {

      Map<String, Object> series = new HashMap<String, Object>();

      Iterator<String> it = data.keySet().iterator();
      while (it.hasNext()) {
         String sdate = it.next();
         LocalDate date = LocalDate.parse(sdate, DateTimeFormatter.ISO_DATE);
         if (date.isBefore(firstDay))
            it.remove();
         else if (date.isAfter(lastDay))
            it.remove();
      }

      // note that because we use LinkedHashMap we can get the keys and values and
      // know they are both in the right order and will line up
      series.put("x", new ArrayList<String>(data.keySet()));
      series.put("y", new ArrayList<Long>(data.values()));

      series.put("type", type);
      series.put("label", name);

      Map<String, String> marker = new HashMap<String, String>();

      marker.put("color", color);

      series.put("marker", marker);

      return series;

   }

   @GetMapping("/{dashboard}/tweets/scroll")
   public List<Map<String, Object>> scroll(@RequestParam(value = "id") String id,
         @PathVariable(required = true) String dashboard) throws IOException {

      Dashboards.Config focus = indexDetails.get(dashboard);

      // TODO what happens if the scroll has expired? Can we return a message we can
      // capture

      SearchScrollRequest scrollRequest = new SearchScrollRequest(id);
      scrollRequest.scroll(ELASTIC_SCROLL);
      SearchResponse searchResponse = getClient(focus).scroll(scrollRequest, RequestOptions.DEFAULT);

      if (searchResponse.getHits().getHits().length == 0) {
         // no more hits so clear the scroll

         ClearScrollRequest clearScroll = new ClearScrollRequest();
         clearScroll.addScrollId(id);

         getClient(focus).clearScroll(clearScroll, RequestOptions.DEFAULT);

         return new ArrayList<Map<String, Object>>();
      }

      return scroll(focus, searchResponse.getHits().getHits());
   }

   private List<Map<String, Object>> scroll(Dashboards.Config focus, SearchHit[] hits) {
      List<Map<String, Object>> data = new ArrayList<Map<String, Object>>();

      ZoneId timezone = ZoneId.of(focus.getTimezone());

      for (SearchHit hit : hits) {
         Map<String, Object> sourceMap = hit.getSourceAsMap();
         Map<String, Object> tweet = getTweetFromSource(focus.getTweetPrefix(), sourceMap);

         tweet = simplifyTweet(tweet, sourceMap, timezone);

         tweet.put("sort", hit.getSortValues());
         data.add(tweet);
      }

      return data;
   }

   /**
    * Added as a way of getting the translations out so we can push them back in.
    * Should be removed eventually as it's just a stop gap to doing things the
    * right way around
    * @param dashboard
    * @return
    * @throws Exception
    */
   @GetMapping("/{dashboard}/translations.csv")
   public ResponseEntity<StreamingResponseBody> translationCSV(
         @PathVariable(required = true) String dashboard)
         throws Exception {

      
      Dashboards.Config config = indexDetails.get(dashboard);

      

      StreamingResponseBody stream = out -> {
         try (CSVWriter csv = new CSVWriter(new OutputStreamWriter(out, "UTF-8"));) {

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                  .fetchSource(true)
                  .trackTotalHits(true)
                  .size(100)
                  .query(QueryBuilders.existsQuery("text_en"));
            
            SearchRequest searchRequest = new SearchRequest(config.getIndex());
            searchRequest.source(sourceBuilder);
            searchRequest.scroll(ELASTIC_SCROLL);

            // do the actual search
            SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

            SearchHit[] hits = searchResponse.getHits().getHits();

            long count = 0;

            // write the header row
            csv.writeNext(new String[] { "id_str", "text_en" }, false);

            allTweets: while (hits != null && hits.length > 0) {
               for (SearchHit hit : hits) {
                  Map source = hit.getSourceAsMap();
                  
                  String idStr = hit.getId();

                  String text_en = (String)source.get("text_en");

                  // write the data for this tweet
                  csv.writeNext(
                        new String[] { idStr, text_en},
                        false);

                  ++count;

                  
               }

               // didn't think we'd need this, but without it it seems to take forever before
               // any data is sent and I'm worried it will time out
               csv.flush();

               SearchScrollRequest scrollRequest = new SearchScrollRequest(searchResponse.getScrollId());
               scrollRequest.scroll(ELASTIC_SCROLL);
               searchResponse = getClient(config).scroll(scrollRequest, RequestOptions.DEFAULT);

               hits = searchResponse.getHits().getHits();
            }

            ClearScrollRequest clearScroll = new ClearScrollRequest();
            clearScroll.addScrollId(searchResponse.getScrollId());

            getClient(config).clearScroll(clearScroll, RequestOptions.DEFAULT);

         } catch (Exception e) {
            throw new RuntimeException(e);
         }
      };

      HttpHeaders headers = new HttpHeaders();
      headers.add("Content-Type", "text/csv;charset=UTF-8");

      return new ResponseEntity<StreamingResponseBody>(stream, headers, HttpStatus.OK);
   }
   
   @GetMapping("/{dashboard}/tweets.csv")
   public ResponseEntity<StreamingResponseBody> tweetsCSV(
         @RequestParam(value = "abusive", defaultValue = "false") boolean abusive,
         @RequestParam(value = "query", required = false) String query,
         @RequestParam(value = "from", defaultValue = "") String from,
         @RequestParam(value = "to", defaultValue = "") String to,
         @RequestParam(value = "sort", defaultValue = "0") String sort,
         @RequestParam(value = "total", defaultValue = "0") long total,
         @PathVariable(required = true) String dashboard,
         @RequestParam(value = "filterID") int filterID)
         throws Exception {

      Map<String,Object> filter = getCachedFilter(filterID);

      Map<String,Object> watched = (Map<String,Object>)filter.getOrDefault("watched", null);

      Dashboards.Config focus = indexDetails.get(dashboard);

      ZoneId timezone = ZoneId.of(focus.getTimezone());

      StreamingResponseBody stream = out -> {
         try (CSVWriter csv = new CSVWriter(new OutputStreamWriter(out, "UTF-8"));) {

			SearchResponse searchResponse = null;

			if (watched != null) {
            System.out.println("looking for alerts");
				searchResponse = searchForWatchedPosts(focus, watched, query, filter, sort, "asc");
			} else {
				searchResponse = searchForTweets(focus, abusive, query, filter, from, to, sort, "asc");
			}

         System.out.println(searchResponse.getHits().getTotalHits().value);

			// SearchResponse searchResponse = searchForTweets(focus, abusive, query,
			// filter, from, to, sort, "desc");
			SearchHit[] hits = searchResponse.getHits().getHits();

            long count = 0;

            // write the header row
            csv.writeNext(new String[] { "url", "screen_name", "id_str", "platform", "post_kind", "created_at", "lang", "fulltext",
                   }, false);

            allTweets: while (hits != null && hits.length > 0) {
               for (SearchHit hit : hits) {
                  Map source = hit.getSourceAsMap();
                  Map<String, Object> tweet = Twitter.simplifyTweet(getTweetFromSource(focus.getTweetPrefix(), source),
                        source, timezone);

                  String screenName = ((Map) tweet.get("user")).get("screen_name").toString();
                  String idStr = hit.getId();

                  String link = null;
                  String platform = (String)tweet.get("platform");

                  if (platform.equals("Twitter"))
                     link = "https://twitter.com/" + screenName + "/status/" + idStr;

                 if (platform.equals("Telegram")) {
                     String[] ids = idStr.split("_");
                     link = "https://t.me/"+screenName+"/"+ids[1];
                  }

                 if (platform.equals("YouTube")) {

                     if (!tweet.containsKey("in_reply_to"))
                         link = "https://youtube.com/watch?v="+idStr;
                     else
                        link = "https://youtube.com/watch?v="+tweet.get("conversation_id")+"&lc="+idStr;
                 }

                  // write the data for this tweet
                  csv.writeNext(
                        new String[] {link , screenName, idStr,
                              (String) tweet.get("platform"), (String) tweet.get("tweet_kind"), (String) tweet.get("created_at_raw"),
                              tweet.get("lang").toString(), tweet.get("text").toString().trim()},
                        false);

                  ++count;

                  if (total > 0 && total == count)
                     break allTweets;
               }

               // didn't think we'd need this, but without it it seems to take forever before
               // any data is sent and I'm worried it will time out
               csv.flush();

               SearchScrollRequest scrollRequest = new SearchScrollRequest(searchResponse.getScrollId());
               scrollRequest.scroll(ELASTIC_SCROLL);
               searchResponse = getClient(focus).scroll(scrollRequest, RequestOptions.DEFAULT);

               hits = searchResponse.getHits().getHits();
            }

            ClearScrollRequest clearScroll = new ClearScrollRequest();
            clearScroll.addScrollId(searchResponse.getScrollId());

            getClient(focus).clearScroll(clearScroll, RequestOptions.DEFAULT);

         } catch (Exception e) {
            throw new RuntimeException(e);
         }
      };

      HttpHeaders headers = new HttpHeaders();
      headers.add("Content-Type", "text/csv;charset=UTF-8");

      return new ResponseEntity<StreamingResponseBody>(stream, headers, HttpStatus.OK);
   }

   @PostMapping("{dashboard}/tweets")
   public Map<String, Object> tweets(@RequestParam(value = "abusive", defaultValue = "false") boolean abusive,
         @RequestParam(value = "query", required = false) String query,
         @RequestParam(value = "from", defaultValue = "") String from,
         @RequestParam(value = "to", defaultValue = "") String to,
         @RequestParam(value = "sort", defaultValue = "0") String sort,
         @RequestParam(value = "order", defaultValue = "desc") String order,
         @PathVariable(required = true) String dashboard,
         @RequestBody(required = false) Map<String,Object> filter)
         throws Exception {

      Dashboards.Config focus = indexDetails.get(dashboard);
      
      SearchResponse searchResponse = null;

      Map<String,Object> watched = (Map<String,Object>)filter.getOrDefault("watched", null);
      
      if (watched != null) {
        searchResponse = searchForWatchedPosts(focus, watched, query, filter, sort, order);
      } else {
         searchResponse = searchForTweets(focus, abusive, query, filter, from, to, sort, order);
      }

      Map<String, Object> data = new LinkedHashMap<String, Object>();

      data.put("scroll_id", searchResponse.getScrollId());

      // store the number of replies within the conversation (this is the size of the
      // conversation minus the original tweet)
      data.put("total", searchResponse.getHits().getTotalHits().value);

      data.put("tweets", scroll(focus, searchResponse.getHits().getHits()));

      return data;

   }
   
   private SearchResponse searchForWatchedPosts(Dashboards.Config config, Map<String,Object> watched, String query, Map<String, Object> filter, String sort, String order) throws Exception {

      SearchSourceBuilder sourceBuilder = indexQueries.generateTweetsQuery(config, "now-1w", "now", query, filter, false, sort, order);

      /*RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at").from("now-1w")
            .to("now").timeZone(config.getTimezone());

      BoolQueryBuilder postsQuery = queryParts.queryTweetsRelevantToDashboard(config).filter(rangeQuery);*/

      BoolQueryBuilder watchedQuery = QueryBuilders.boolQuery();

      for (String term : (List<String>)watched.getOrDefault("terms", new ArrayList<String>())) {
         watchedQuery.should(QueryBuilders.multiMatchQuery(term, "text", "text_en").type(Type.PHRASE));
         //watchedQuery.should(QueryBuilders.matchPhraseQuery("text", term));
      }
      
      List<String> hashtags = (List<String>)watched.get("terms");
      if (hashtags != null && !hashtags.isEmpty())
         watchedQuery.should(QueryBuilders.termsQuery(config.getHashtagField(), hashtags));

      //postsQuery.filter(watchedQuery);
      
      //SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(true).size(10)
      //      .query(postsQuery);
      
      //SortOrder sortOrder = SortOrder.fromString(order);
      
      //FieldSortBuilder sortByDate = queryParts.sortByDate(config, sortOrder);
     
      
      //sourceBuilder.sort(sortByDate);

      sourceBuilder.postFilter(watchedQuery);
      
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);
      searchRequest.scroll(ELASTIC_SCROLL);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      return searchResponse;
   }

   private SearchResponse searchForTweets(Dashboards.Config config, boolean abusive, String query, Map<String, Object> filter, String from,
         String to, String sort, String order) throws Exception {

      if (from == null || from.equals(""))
         from = config.getFrom();
      if (to == null || to.equals(""))
         to = config.getTo();


      SearchSourceBuilder sourceBuilder = indexQueries.generateTweetsQuery(config, from, to, query, filter, abusive, sort, order);
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);
      searchRequest.scroll(ELASTIC_SCROLL);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      return searchResponse;
   }

   @PostMapping("/{dashboard}/triggers")
   public Map<String, Object> triggers(@RequestParam(value = "query", required = false) String query,
         @RequestParam(value = "from", defaultValue = "") String from,
         @RequestParam(value = "to", defaultValue = "") String to,
         @RequestParam(value = "replyThreshold", defaultValue = "5") long replyThreshold,
         @PathVariable(required = true) String dashboard,
         @RequestBody(required = false) Map<String,Object> filter) throws Exception {

      Dashboards.Config config = indexDetails.get(dashboard);

      if (from == null || from.equals(""))
         from = config.getFrom();
      if (to == null || to.equals(""))
         to = config.getTo();


      // this is where we assemble information about what we are interested in
      SearchSourceBuilder sourceBuilder = indexQueries.generateTriggerCountAndTimeQueries(config, from, to, filter);

      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      Map<String, Long> replyCounts = new HashMap<String, Long>();
      Map<String, String> replyPlatforms = new HashMap<String,String>();
      Map<String, String> replyScreenNames = new HashMap<String,String>();
      Map<String,String> replyToConversation = new HashMap<String,String>();
      ((ParsedStringTerms) ((ParsedFilter) searchResponse.getAggregations().get("in_reply_to")).getAggregations()
            .get("triggers")).getBuckets().forEach(b -> {
               
               replyCounts.put(b.getKeyAsString(), b.getDocCount());
               
               try {
                  String platform = ((ParsedTerms)b.getAggregations().get("platform")).getBuckets().get(0).getKeyAsString();
                  replyPlatforms.put(b.getKeyAsString(), platform);
               } catch (Exception e) {
                  // this means an index without any platform info. We'll fix this
                  // later by assuming everything is from Twitter
               }
               
               String screen_name = ((ParsedTerms)b.getAggregations().get("user")).getBuckets().get(0).getKeyAsString();
               replyScreenNames.put(b.getKeyAsString(), screen_name);
               
               
               List<? extends Terms.Bucket> buckets = ((ParsedTerms)b.getAggregations().get("conversation")).getBuckets();
               if (buckets.size() > 0) {
                  replyToConversation.put(b.getKeyAsString(), buckets.get(0).getKeyAsString());
               }
               
            });

      Map<String, Long> tweetTimes = new HashMap<String, Long>();
      ((MultiBucketsAggregation) ((ParsedFilter) searchResponse.getAggregations().get("by_target")).getAggregations()
            .get("timeline")).getBuckets().forEach(b -> {
               ParsedMin min = (ParsedMin) b.getAggregations().get("timeline");
               tweetTimes.put(b.getKeyAsString(), ((Double) min.getValue()).longValue());
            });


      BoolQueryBuilder originalQuery = (BoolQueryBuilder) sourceBuilder.query();
      
      // todo: really a potential todo. see https://github.com/GateNLP/project-fcdo-dashboard/pull/32
      if (query != null && query.length() > 0) {
         originalQuery.filter(queryParts.processDashboardSearch(config, query));
      }

      sourceBuilder.query(originalQuery.filter(queryParts.processDashboardFilter(config, filter, true)));
      
      searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);
      long allReplies = ((ParsedFilter) searchResponse.getAggregations().get("in_reply_to")).getDocCount();

      sourceBuilder = indexQueries.generateTriggersQuery(config, from, to, replyThreshold, query, filter);
      // build the request (i.e. pair what we've built with the right index)
      searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // do the actual search
      searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      Map<String, Long> firstAbusiveReply = new HashMap<String, Long>();
      ((MultiBucketsAggregation) searchResponse.getAggregations().get("timeline")).getBuckets().forEach(b -> {
         ParsedMin min = (ParsedMin) b.getAggregations().get("timeline");
         firstAbusiveReply.put(b.getKeyAsString(), ((Double) min.getValue()).longValue());
      });

      // work through the results of the trigger aggregation to build a list of map
      // objects where each map represents the information about a tweet from the
      // index focus with the number of replies/appearances etc.
      List<Map<String, Object>> tweetTriggers = new ArrayList<Map<String, Object>>();
      ((ParsedStringTerms) searchResponse.getAggregations().get("triggers")).getBuckets().forEach(b -> {
         Map<String,Object> tweet = new LinkedHashMap<String, Object>();

         // note we aren't converting these to the timezone specified in the config as we
         // only care about the difference between the two. If at some future point we
         // actually want to display the times then we would need to convert them.
         // Question is should we do this now so as not to forget later, or do we remove
         // them from the returned JSON so they can't be used? Currently opted to remove
         // them from the JSON for safety.
         Long createdAt = tweetTimes.get(b.getKeyAsString());
         Long firstAbuse = firstAbusiveReply.get(b.getKeyAsString());

         tweet.put("id_str", b.getKeyAsString());
         // tweet.put("created_at", createdAt);
         tweet.put("unique", b.getDocCount());
         tweet.put("total", replyCounts.get(b.getKeyAsString()));
         
         tweet.put("platform", replyPlatforms.getOrDefault(b.getKeyAsString(),"Twitter"));
         tweet.put("screen_name", replyScreenNames.get(b.getKeyAsString()));
         
         tweet.put("conversation_id", replyToConversation.getOrDefault(b.getKeyAsString(), ""));

         tweet.put("createdAt", createdAt != null ? createdAt : "");

         tweet.put("accounts", ((Cardinality)b.getAggregations().get("accounts")).getValue());
         
         // tweet.put("firstAbusive", firstAbuse);

         if (createdAt == null || firstAbuse == null)
            tweet.put("timeToAbuse", -1);
         else
            tweet.put("timeToAbuse", (firstAbuse-createdAt)/1000);

         tweetTriggers.add(tweet);
      });

      // build the final result object ready to return to the caller
      Map<String, Object> data = new LinkedHashMap<String, Object>();

      data.put("originals", replyCounts.size());
      data.put("abusive_replies", searchResponse.getHits().getTotalHits().value);
      data.put("all_replies", allReplies);

      // store the triggering tweets
      data.put("tweets", tweetTriggers);

      //Map<String, Long> authors = aggregationToMap(searchResponse.getAggregations().get("authors"));

      Map<String, Map<String, Object>> authorCounts = new LinkedHashMap<String, Map<String, Object>>();

      ((MultiBucketsAggregation) searchResponse.getAggregations().get("authors")).getBuckets().forEach(b -> {

         Map<String, Object> details = new LinkedHashMap<String, Object>();

         details.put("abusive", (long) b.getDocCount());
         details.put("tweets",
               (long) ((MultiBucketsAggregation) b.getAggregations().get("triggers")).getBuckets().size());
         
         MultiBucketsAggregation platforms = (MultiBucketsAggregation)b.getAggregations().get("platform");
         if (platforms.getBuckets().size() > 0) {
            details.put("platform", platforms.getBuckets().get(0).getKeyAsString());
         } else {
            // if there are no platform then assume this is an old twitter index
            details.put("platform", "Twitter");
         }

         authorCounts.put(b.getKeyAsString(), details);
      });

      // the abusive authors is a simple count across the aggregation
      data.put("authors", authorCounts);

      data.put("from", from);
      data.put("to", to);
      data.put("replyThreshold", replyThreshold);

      return data;
   }

   public static long sumAggregation(Aggregation a, String field) {
      final AtomicLong result = new AtomicLong(0);

      ((MultiBucketsAggregation) a).getBuckets().forEach(b1 -> {

         ((MultiBucketsAggregation) b1.getAggregations().get("tweets")).getBuckets().forEach(b2 -> {

            Aggregation agg = b2.getAggregations().get(field);

            while (true) {
               if (agg instanceof ParsedSingleBucketAggregation) {
                  agg = ((ParsedSingleBucketAggregation) agg).getAggregations().get(field);
               } else {
                  result.addAndGet((long) ((ParsedMax) agg).value());
                  break;
               }
            }
         });

      });

      return result.longValue();
   }

   @PostMapping("/{dashboard}/overview")
   public Map<String, Object> overview(@RequestParam(value = "abusive", defaultValue = "false") boolean abusive,
         @RequestParam(value = "query", required = false) String query,
         @RequestParam(value = "from", defaultValue = "") String from,
         @RequestParam(value = "to", defaultValue = "") String to, @PathVariable(required = true) String dashboard,
         @RequestBody Map<String,Object> filter) throws Exception {

      Dashboards.Config config = indexDetails.get(dashboard);

      if (from == null || from.equals(""))
         from = config.getFrom();
      if (to == null || to.equals(""))
         to = config.getTo();

      Map<String, Object> data = new LinkedHashMap<String, Object>();
      Map<String, Object> allPlatforms = new LinkedHashMap<String, Object>();
      
      List<User> otherUsers = config.getPlatformUsers("other");
      
      data.put("all", allPlatforms);
      
      data.put("events", config.getEvents());

      // this is where we assemble information about what we are interested in
      SearchSourceBuilder sourceBuilder = indexQueries.generateOverviewQuery(config, from, to, abusive, query, filter);
      
      if (otherUsers.size() > 0) {
         sourceBuilder.aggregation(AggregationBuilders.terms("other_indicators").field("indicators").size(30));//.minDocCount(1).interval(1));
      }

      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      LocalDate firstDay = LocalDate.parse(from, DateTimeFormatter.ISO_DATE);
      LocalDate lastDay = LocalDate.parse(to, DateTimeFormatter.ISO_DATE);
      
      List<Object> platformTimeline = new ArrayList<Object>();
      
      MultiBucketsAggregation agg = searchResponse.getAggregations().get("unique_platforms");
      
      Map<String,Long> platforms = aggregationToMap(agg);
      
      Map<String,Map<String,Long>> posters = new LinkedHashMap<String,Map<String,Long>>();

      Map<String,String> colours = indexDetails.getColours();
      for (String platform : platforms.keySet()) {
         platformTimeline.add(convertToSeries(
               aggregationToMap(findBucket(agg,platform).getAggregations().get("platform_timeline")), platform,
               colours.get(platform), "bar", firstDay, lastDay));
         
         posters.put(platform,
               aggregationToMap(findBucket(agg,platform).getAggregations().get("users")));
      }

      data.put("title", config.getTitle());
      data.put("dashboard_id", dashboard);
      data.put("dashboard_img", config.getImage());
      data.put("dashboard_desc", config.getDescription());
      data.put("users", config.getUsers());

      data.put("from", from);
      data.put("to", to);
      data.put("timezone", config.getTimezone());
      data.put("timeline", platformTimeline);

      data.put("minDate", config.getFrom());
      data.put("maxDate", config.getTo());

      List<Map<String,Object>> organicSources = new ArrayList<Map<String,Object>>();

      Pattern hrefPattern = Pattern.compile("href=\"(.*?)\"", Pattern.DOTALL);

      for (Map.Entry<String,Long> entry : aggregationToMap(searchResponse.getAggregations().get("unique_sources")).entrySet()) {
         try {
            String full = entry.getKey();
         
            String text = full.substring(full.indexOf(">")+1, full.lastIndexOf("<"));
            String url = null;         
            
            Matcher m = hrefPattern.matcher(full);

            if (m.find()) {
               if ( m.group(1).length()>0) {
                  url = m.group(1);
               }
            }

            Map<String,Object> source = new HashMap<String,Object>();
            source.put("text",text);
            source.put("url", url);
            source.put("orig", full);
            source.put("count", entry.getValue());

            organicSources.add(source);
         } catch (Exception e) {
            e.printStackTrace();
         }
      }

      allPlatforms.put("count", searchResponse.getHits().getTotalHits().value);
      allPlatforms.put("hashtags", aggregationToMap(searchResponse.getAggregations().get("unique_hashtags")));
      allPlatforms.put("languages", aggregationToMap(searchResponse.getAggregations().get("unique_languages")));
      
      allPlatforms.put("sources", organicSources);
      allPlatforms.put("mastodon_servers", aggregationToMap(searchResponse.getAggregations().get("unique_mastodon_servers")));
      allPlatforms.put("platforms", platforms);
      allPlatforms.put("posters", posters);
      
      allPlatforms.put("offensive_slur_terms", aggregationToMap(searchResponse.getAggregations().get("offensive_slur_terms")));      
      allPlatforms.put("significant_terms",aggregationToMap(searchResponse.getAggregations().get("significant_term_candidates")));
      allPlatforms.put("significant_words",aggregationToMap(searchResponse.getAggregations().get("significant_content_words")));

      // TODO: if we don't need to go into a sub aggregation can we merge these
      Map<String,Long> twitterCountries = aggregationToMap(searchResponse.getAggregations().get("twitter_countries"), "unique");
      Map<String,Long> tiktokCountries = aggregationToMap(searchResponse.getAggregations().get("tiktok_countries"), "unique");

      // This, and the same below for all, is a nasty hack to remove cases where
      // Topic.theme is the empty string. It essentially gets 21 results, removes
      // the empty one, and then if necessary removes the last one (keys are ordered
      // as the Map is a LinkedHashMap) to get back down to 20 entries. urgh!
      Map<String, Long> topics = aggregationToMap(searchResponse.getAggregations().get("unique_topics"));
      topics.remove("");

      allPlatforms.put("topics", topics);

      allPlatforms.put("tweet_authors",
            ((ParsedCardinality)searchResponse.getAggregations().get("tweet_authors")).getValue());

      List<Map<String,Object>> allSources = new ArrayList<Map<String,Object>>();

      for (Map.Entry<String,Long> entry : aggregationToMap(searchResponse.getAggregations().get("unique_sources")).entrySet()) {
         String full = entry.getKey();
         try {
            
            String text = full.substring(full.indexOf(">")+1, full.lastIndexOf("<"));
            String url = null;         
            
            Matcher m = hrefPattern.matcher(full);

            if (m.find()) {
               if ( m.group(1).length()>0) {
                  url = m.group(1);
               }
            }

            Map<String,Object> source = new HashMap<String,Object>();
            source.put("text",text);
            source.put("url", url);
            source.put("orig", full);
            source.put("count", entry.getValue());

            allSources.add(source);
         } catch (Exception e) {
            System.out.println("\n\n"+full+"\n\n");
            e.printStackTrace();
         }
      }

      if (abusive) {

         Map<String, String> string2Type = new HashMap<String, String>();

         ParsedStringTerms strings = ((ParsedFilter) ((ParsedNested) searchResponse.getAggregations().get("abuse"))
               .getAggregations().get("AbuseSource")).getAggregations().get("string");
         ((MultiBucketsAggregation) strings).getBuckets().forEach(b -> {

            List<? extends Bucket> buckets = ((MultiBucketsAggregation) b.getAggregations().get("type")).getBuckets();

            if (buckets.size() > 0)
               string2Type.put(b.getKeyAsString(), buckets.get(0).getKeyAsString());
            else
               string2Type.put(b.getKeyAsString(), "general");
         });

         

         Map<String, Long> abuseStrings = aggregationToMap(
            ((ParsedFilter) ((ParsedNested) searchResponse.getAggregations().get("unique_abuse_strings"))
         .getAggregations().get("AbuseSource")).getAggregations().get("nested"),
               "reverse");
         allPlatforms.put("abuse_strings", abuseStrings);

         Map<String, String> abuseStringTypes = new LinkedHashMap<String, String>();
         for (String string : abuseStrings.keySet()) {
            abuseStringTypes.put(string, string2Type.getOrDefault(string, "general"));
         }
         allPlatforms.put("abuse_string_types", abuseStringTypes);
         
         ParsedTerms typesAggregation = (ParsedTerms) ((ParsedFilter) ((ParsedNested) searchResponse.getAggregations()
         .get("unique_abuse_types")).getAggregations().get("AbuseSource")).getAggregations().get("nested");;


         System.out.println(Strings.toString(typesAggregation));

         Map<String, Long> abuseTypes = aggregationToMap(
            typesAggregation,
               "reverse");
         //allPlatforms.put("abuse_types", abuseTypes);
         allPlatforms.put("abuse_types_sunburst", buildSunburstData(abuseTypes));
         allPlatforms.put("abuse_types_intersection", buildIntersectionData(typesAggregation));


         allPlatforms.put("abuse_topics",
               aggregationNestedBucketsToMap(
                     ((ParsedFilter) ((ParsedNested) searchResponse.getAggregations().get("unique_abuse_topics"))
                           .getAggregations().get("AbuseSource")).getAggregations().get("nested"),
                     true, "reverse", "unique_topics"));
      } else {

         Map<String, Long> focus = aggregationToMap(
               ((ParsedFilter) searchResponse.getAggregations().get("by_focus_unique")).getAggregations()
                     .get("tweet_kind"));

         if (!focus.containsKey("original"))
            focus.put("original", 0L);
         if (!focus.containsKey("reply"))
            focus.put("reply", 0L);

         data.put("focus", focus);
      }

      Map<String, Long> tweetKinds = aggregationToMap(searchResponse.getAggregations().get("tweet_kind"));

      if (!tweetKinds.containsKey("original"))
         tweetKinds.put("original", 0L);
      if (!tweetKinds.containsKey("reply"))
         tweetKinds.put("reply", 0L);

      data.put("tweet_kind", tweetKinds);

      data.put("filter", cacheFilter(filter));
      
      Map<String,Object> other = new HashMap<String,Object>();
      if (otherUsers.size() > 0) {
         other.put("indicators", aggregationToMap(searchResponse.getAggregations().get("other_indicators")));
      }
      
      // TODO something similar for all the platforms
      Map<String,Object> twitter = new HashMap<String,Object>();
      
      List<User> twitterUsers = config.getPlatformUsers("Twitter");
      
      List<Object> relevantTwitter = new ArrayList<Object>();

      for (User user : twitterUsers) {
                  
         sourceBuilder = indexQueries.generateTweetsRelevantToQuery(config, from, to, abusive, query, filter, user);
         
         searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);

         // do the actual search
         searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);
         
         if (searchResponse.getHits().getTotalHits().value > 0) {
            relevantTwitter.add(convertToSeries(aggregationToMap(searchResponse.getAggregations().get("organic_timeline")),
               user.getHandle(), user.getColor(), "bar", firstDay, lastDay));
         }
      }
      
      Map<String,Object> youtube = new HashMap<String,Object>();
      
      List<User> youtubeUsers = config.getPlatformUsers("YouTube");
      
      List<Object> relevantYouTube = new ArrayList<Object>();

      for (User user : youtubeUsers) {
                  
         sourceBuilder = indexQueries.generateYouTubeRelevantToQuery(config, from, to, abusive, query, filter, user);

         searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);

         // do the actual search
         searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         if (searchResponse.getHits().getTotalHits().value > 0) {
            relevantYouTube.add(convertToSeries(aggregationToMap(searchResponse.getAggregations().get("organic_timeline")),
                  user.getName(), user.getColor(), "bar", firstDay, lastDay));
         }
      }

      Map<String,Object> mastodon = new HashMap<String,Object>();
      List<User> mastodonUsers = config.getPlatformUsers("Mastodon");
      List<Object> relevantMastodon = new ArrayList<Object>();

      for (User user : mastodonUsers) {
         sourceBuilder = indexQueries.generateMastodonRelevantToQuery(config, from, to, abusive, query, filter, user);

         searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);

         // do the actual search
         searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         relevantMastodon.add(convertToSeries(aggregationToMap(searchResponse.getAggregations().get("organic_timeline")),
               user.getHandle(), user.getColor(), "bar", firstDay, lastDay));
      }
      
      Map<String,Object> facebook = new HashMap<String,Object>();
      List<User> facebookUsers = config.getPlatformUsers("Facebook");
      List<Object> relevantFacebook = new ArrayList<Object>();

      for (User user : facebookUsers) {
         sourceBuilder = indexQueries.generateFacebookRelevantToQuery(config, from, to, abusive, query, filter, user);

         searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);

         // do the actual search
         searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         relevantFacebook.add(convertToSeries(aggregationToMap(searchResponse.getAggregations().get("organic_timeline")),
               user.getHandle(), user.getColor(), "bar", firstDay, lastDay));
      }

      
      List<Object> relevantOther = new ArrayList<Object>();

      for (User user : otherUsers) {
         sourceBuilder = indexQueries.generateOtherRelevantToQuery(config, from, to, abusive, query, filter, user);

         searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);

         // do the actual search
         searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         relevantOther.add(convertToSeries(aggregationToMap(searchResponse.getAggregations().get("organic_timeline")),
               user.getName(), user.getColor(), "bar", firstDay, lastDay));
      }

      Map<String,Object> tiktok = new HashMap<String,Object>();
      List<User> tiktokUsers = config.getPlatformUsers("TikTok");


      twitter.put("count", twitterUsers.size());
      twitter.put("users", twitterUsers);
      twitter.put("timeline", relevantTwitter);
      twitter.put("countries", twitterCountries);
      
      youtube.put("count", youtubeUsers.size());
      youtube.put("users", youtubeUsers);
      youtube.put("timeline", relevantYouTube);
      
      mastodon.put("count", mastodonUsers.size());
      mastodon.put("users", mastodonUsers);
      mastodon.put("timeline", relevantMastodon);
      
      other.put("count", otherUsers.size());
      other.put("users", otherUsers);
      other.put("timeline", relevantOther);

      tiktok.put("count", tiktokUsers.size());
      tiktok.put("users", tiktokUsers);
      tiktok.put("countries", tiktokCountries);

      facebook.put("count", facebookUsers.size());
      facebook.put("users", facebookUsers);
      facebook.put("timeline", relevantFacebook);

      data.put("twitter", twitter);
      data.put("youtube", youtube);
      data.put("mastodon", mastodon);
      data.put("other", other);
      data.put("tiktok", tiktok);
      data.put("facebook", facebook);
      
      return data;
   }

   public Map<String,Object> buildIntersectionData(ParsedTerms aggregation) {

      Map<String, Map<String, Long>> data = new TreeMap<String, Map<String, Long>>();

      aggregation.getBuckets().forEach(b -> {

         ParsedReverseNested unnest = ((ParsedReverseNested) b.getAggregations().get("unnest"));
         ParsedNested allAbuseTerms = (ParsedNested) unnest.getAggregations().get("all_abuse_types");
         ParsedTerms nested = allAbuseTerms.getAggregations().get("nested");

         Map<String, Long> intersection = aggregationToMap(nested, "reverse");
         intersection.remove(b.getKeyAsString());

         for (Map.Entry<String, Long> entry : intersection.entrySet()) {
            List<String> keys = Arrays.asList(new String[] { b.getKeyAsString(), entry.getKey() });
            keys.sort(null);
            
            for (int i = 0; i < 1; ++i) {
               Map<String, Long> inner = data.getOrDefault(keys.get(0), new TreeMap<String, Long>());

               inner.put(keys.get(1), entry.getValue());

               data.put(keys.get(0), inner);
               Collections.reverse(keys);
            }
         }
      });

      List<List<Long>> z = new ArrayList<List<Long>>();

      data.remove("general");
      data.remove("sexual");
      
      for (Map.Entry<String, Map<String,Long>> entry : data.entrySet()) {
         Map<String,Long> values = entry.getValue();
         
         Long val = values.remove("sexual");
         if (val != null) values.put("sexist", values.getOrDefault("sexist", 0L) + val);
         
         if (entry.getKey().equals("sexist"))  values.remove("sexist");
         
         
      } 

      long total = 0;

      for (String key1 : data.keySet()) {
         for (String key2 : data.keySet()) {


            total += data.get(key1).getOrDefault(key2, 0L);

            data.get(key2).put(key1, data.get(key1).getOrDefault(key2, 0L));
         }
      }

      if (total == 0) return new HashMap<String,Object>();
      
      for (String key1 : data.keySet()) {
         List<Long> row = new ArrayList<Long>();
         for (String key2 : data.keySet()) {
            row.add(data.get(key1).getOrDefault(key2, 0L));
         }
         z.add(row);
      }
      
      List<String> labels = new ArrayList<String>(data.keySet());
      if (labels.contains("sexist"))
         labels.set(labels.indexOf("sexist"), "sexist and explicit");

      Map<String,Object> json = new HashMap<String,Object>();
      json.put("type", "heatmap");
      json.put("x", labels);
      json.put("y", labels);
      json.put("z", z);
      json.put("colorscale", "RdOrYl");
      return json;
   }

   public Map<String, List> buildSunburstData(Map<String, Long> types) {
      List<String> ids = new ArrayList<String>();
      List<String> labels = new ArrayList<String>();
      List<Long> values = new ArrayList<Long>();
      List<String> parents = new ArrayList<String>();

      // TODO should we think about leaving out leaf nodes if they are only a tiny
      // percentage and hence difficult to see? They would still be counted on the
      // inner ring so we wouldn't loose date

      // the root elements, we calculate it's value at the end
      ids.add("root");
      labels.add("all types of abuse");
      values.add(0L);
      parents.add("");

      // TODO should we break this down on the outer ring?
      // attacks on credibility = reputation + gendered reputation
      ids.add("reputation");
      labels.add("attacks on credibility");
      values.add(types.getOrDefault("reputation", 0L) + types.getOrDefault("gendered reputation", 0L));
      parents.add("root");

      // This is new as we didn't have this as a separate category before
      ids.add("gendered reputation");
      labels.add("gender based");
      values.add(types.getOrDefault("gendered reputation", 0L));
      parents.add("reputation");

      // personal attack
      ids.add("personal");
      labels.add("personal attack");
      values.add(types.getOrDefault("sexist", 0L) + types.getOrDefault("sexual", 0L)
            + types.getOrDefault("homophobic", 0L) + types.getOrDefault("racist", 0L)
            + types.getOrDefault("general", 0L) + types.getOrDefault("personal", 0L));
      parents.add("root");

      // personal attack => sexist, misogynistic, and explicit = sexist + sexual
      ids.add("sexist");
      labels.add("sexist, misogynistic, and explicit");
      values.add(types.getOrDefault("sexist", 0L) + types.getOrDefault("sexual", 0L));
      parents.add("personal");

      // personal attack => homophobic = homophobic
      ids.add("homophobic");
      labels.add("homophobic");
      values.add(types.getOrDefault("homophobic", 0L));
      parents.add("personal");

      // personal attack => racist = racist
      ids.add("racist");
      labels.add("racist");
      values.add(types.getOrDefault("racist", 0L));
      parents.add("personal");

      // personal attack => racist = racist
      ids.add("general");
      labels.add("general");
      values.add(types.getOrDefault("general", 0L) + types.getOrDefault("personal", 0L));
      parents.add("personal");

      ids.add("belief");
      labels.add("belief");
      values.add(types.getOrDefault("religious", 0L) + types.getOrDefault("political", 0L));
      parents.add("root");

      // belief => religious = religious
      ids.add("religious");
      labels.add("religious");
      values.add(types.getOrDefault("religious", 0L));
      parents.add("belief");

      // belief => political = political
      ids.add("political");
      labels.add("political");
      values.add(types.getOrDefault("political", 0L));
      parents.add("belief");

      // personal attack => other = general + personal
      // NOTE: we've not previously had personal but I've just lumped it in with other
      /*
       * ids.add("other"); labels.add("other");
       * values.add(types.getOrDefault("general", 0L)+types.getOrDefault("personal",
       * 0L)); parents.add("personal");
       */

      for (int i = 1; i < parents.size(); ++i) {
         if (parents.get(i).equals("root"))
            values.set(0, values.get(0) + values.get(i));
      }

      Map<String, List> data = new LinkedHashMap<String, List>();

      data.put("ids", ids);
      data.put("values", values);
      data.put("parents", parents);

      return data;
   }
   
   
   @GetMapping("/{dashboard}/spike.csv")
   public ResponseEntity<StreamingResponseBody> spikeCSV(
         @RequestParam(value = "abusive", defaultValue = "false") boolean abusive,
         @RequestParam(value = "date", required = false) String date,
         @PathVariable(required = true) String dashboard)
         throws Exception {

      Dashboards.Config config = indexDetails.get(dashboard);

      ZoneId timezone = ZoneId.of(config.getTimezone());

      StreamingResponseBody stream = out -> {
         try (CSVWriter csv = new CSVWriter(new OutputStreamWriter(out, "UTF-8"));) {

            // selects all unique tweets within the specified time range
            BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config).filter(
                  QueryBuilders.boolQuery().should(queryParts.queryTweetsInRange(config, date, date)));

            if (abusive) {
                // if we want an overview of just the abusive replies to the config of the index
                // then build that horrible bit of query and add it as a filter
                indexQuery.filter(queryParts.queryAbusiveTweets(config, config.getUsers()));
            } else {
               // if we want everything that isn't an abusive reply
               indexQuery.mustNot(queryParts.queryAbusiveTweets(config, config.getUsers()));
            }

         // this is where we assemble information about what we are interested in
            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .fetchSource(true)
                .trackTotalHits(true)
                .size(10)
                .query(indexQuery);

            FieldSortBuilder sortByDate = queryParts.sortByDate(config, SortOrder.ASC);
            

            sourceBuilder.sort(sortByDate);

            SearchRequest searchRequest = new SearchRequest(config.getIndex());
            searchRequest.source(sourceBuilder);
            searchRequest.scroll(ELASTIC_SCROLL);

            // do the actual search
            SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

            SearchHit[] hits = searchResponse.getHits().getHits();

            // write the header row
            csv.writeNext(new String[] { "url", "screen_name", "id_str", "tweet_kind", "created_at", "lang", "fulltext",
                  }, false);

            allTweets: while (hits != null && hits.length > 0) {
               for (SearchHit hit : hits) {
                  Map source = hit.getSourceAsMap();
                  Map<String, Object> tweet = Twitter.simplifyTweet(getTweetFromSource(config.getTweetPrefix(), source),
                        source, timezone);

                  String screenName = ((Map) tweet.get("user")).get("screen_name").toString();
                  String idStr = hit.getId();

                 

                  // write the data for this tweet
                  csv.writeNext(
                        new String[] { "https://twitter.com/" + screenName + "/status/" + idStr, screenName, idStr,
                              (String) tweet.get("tweet_kind"), (String) tweet.get("created_at_raw"),
                              tweet.get("lang").toString(), tweet.get("text").toString().trim() },
                        false);
               }

               // didn't think we'd need this, but without it it seems to take forever before
               // any data is sent and I'm worried it will time out
               csv.flush();

               SearchScrollRequest scrollRequest = new SearchScrollRequest(searchResponse.getScrollId());
               scrollRequest.scroll(ELASTIC_SCROLL);
               searchResponse = getClient(config).scroll(scrollRequest, RequestOptions.DEFAULT);

               hits = searchResponse.getHits().getHits();
            }

            ClearScrollRequest clearScroll = new ClearScrollRequest();
            clearScroll.addScrollId(searchResponse.getScrollId());

            getClient(config).clearScroll(clearScroll, RequestOptions.DEFAULT);

         } catch (Exception e) {
            throw new RuntimeException(e);
         }
      };

      HttpHeaders headers = new HttpHeaders();
      headers.add("Content-Type", "text/csv;charset=UTF-8");

      return new ResponseEntity<StreamingResponseBody>(stream, headers, HttpStatus.OK);
   }

   @PostMapping("/{dashboard}/accounts")
   public List<Object> accounts(
   @RequestParam(value = "query", required = false) String query,
   @RequestParam(value = "from", defaultValue = "") String from,
   @RequestParam(value = "to", defaultValue = "") String to, @PathVariable(required = true) String dashboard,
   @RequestBody Map<String,Object> filter) throws Exception {

      System.out.println("\n\ngetting summary\n\n");

      // clear out any restrictedTo settings
      List<Integer> users = (List<Integer>)filter.get("users");

      if (users == null) {
         users = new ArrayList<Integer>();
         filter.put("users", users);
      }

      // cycle through each account in the config
      Dashboards.Config config = indexDetails.get(dashboard);

      List<Object> result = new ArrayList<Object>();

      for (int i = 0 ; i < config.getUsers().size() ; ++i) {
         users.clear();
         users.add(i);

         Map<String,Object> summary = new HashMap<String,Object>();

         summary.put("overview", overview(false, query, from, to, dashboard, filter));
         summary.put("abusive",overview(true, query, from, to, dashboard, filter));
         summary.put("triggers", triggers(query, from, to, 5, dashboard, filter));

         result.add(summary);

      }

      
      return result;
   }
}
