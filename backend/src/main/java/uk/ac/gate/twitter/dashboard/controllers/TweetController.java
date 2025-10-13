package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.getTweetFromSource;
import static uk.ac.gate.twitter.dashboard.utils.Twitter.simplifyTweet;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.indices.GetIndexRequest;
import org.elasticsearch.search.aggregations.Aggregation;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation.Bucket;
import org.elasticsearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

import uk.ac.gate.twitter.dashboard.queries.TweetQueries;
import uk.ac.gate.twitter.dashboard.config.CategoryInformation;
import uk.ac.gate.twitter.dashboard.config.Dashboards;

@RestController
public class TweetController {

   @Autowired
   private CategoryInformation categories;

   @Autowired
   private Dashboards dashboards;

   @Autowired
   private TweetQueries tweetQueries;

   final static private CloseableHttpClient HTTP_CLIENT = HttpClients.createDefault();

   final static private ObjectMapper JACKSON = new ObjectMapper();

   private static DateTimeFormatter TWITTER_DATE_FORMAT = DateTimeFormatter.ofPattern("EEE MMM dd HH:mm:ss Z yyyy")
         .withZone(ZoneId.of("Z")).withLocale(Locale.ENGLISH);

   private static DateTimeFormatter DISPLAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd")
         .withZone(ZoneId.of("Z")).withLocale(Locale.ENGLISH);

   @GetMapping("/{dashboard}/tweet")
   public Map<String, Object> tweet(@RequestParam(value = "id") String id,
         @PathVariable(required = true) String dashboard) throws IOException {
      
      Dashboards.Config config = dashboards.get(dashboard);

      ZoneId timezone = ZoneId.of(config.getTimezone());

      boolean indexExists = getClient(config).indices().exists(new GetIndexRequest(config.getIndex()), RequestOptions.DEFAULT);

      if (!indexExists) {
         // if (TWITTER_ENABLED)
         // TwitterAPITask.put(new Task("tweet", id));
         Map<String, Object> data = new HashMap<String, Object>();
         data.put("flashType", "error");
         data.put("flashMessage", "Service is currently unavailable (Elasticsearch index does not exist)");
         data.put("flashRefresh", false);

         return data;
      }

      SearchSourceBuilder sourceBuilder = tweetQueries.generateTweetQuery(id);

      // build the request using the search options against the correct index
      SearchRequest searchRequest = new SearchRequest(config.getIndex());
      searchRequest.source(sourceBuilder);

      // do the actual search
      SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      // how many replies did we get
      long numberReplies = searchResponse.getHits().getTotalHits().value;

      if (numberReplies != 1) {
         // there should only ever be one result with the tweet ID so we will return an
         // error

         Map<String, Object> data = new HashMap<String, Object>();

         if (numberReplies == 0) {
            data.put("flashType", "error");
            data.put("flashMessage", "The requested tweet is not available within the index");
            data.put("flashRefresh", false);
         } else {
            data.put("flashType", "error");
            data.put("flashMessage", "Our index appears to be corrupt as we have more than one tweet (" + numberReplies
                  + ") with this ID");
            data.put("flashRefresh", false);
         }
         // return the error response
         return data;
      }

      Map<String, Object> sourceMap = searchResponse.getHits().getHits()[0].getSourceAsMap();
      Map<String, Object> tweet = getTweetFromSource(config.getTweetPrefix(), sourceMap);

      // simplify the source map to just keep the bits we need
      Map<String, Object> data = simplifyTweet(tweet, sourceMap, timezone, categories.getField(), "category");

      if (config.getCompliance().getStrict() && data.containsKey("compliance")) {
         data.clear();
         data.put("flashType", "error");
         data.put("flashMessage", "The requested tweet is not available within the index");
         data.put("flashRefresh", false);

         return data;
      }

      // if (TWITTER_ENABLED)
      // TwitterAPITask.put(new Task("conversation", (String)
      // data.get("conversation_id")));


      sourceBuilder = tweetQueries.generateTweetReplyStanceAggregations(config, id);

      searchRequest.source(sourceBuilder);
      searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      // how many tweets are there in total
      numberReplies = searchResponse.getHits().getTotalHits().value;

      // store the number of replies within the conversation (this is the size of the
      // conversation minus the original tweet)
      data.put("number_of_replies", numberReplies);

      if ((Long) data.get("reply_count") > 0 && numberReplies == 0) {
         data.put("flashType", "info");
         data.put("flashMessage", "Unfortunately none of the replies to this tweet are contained within our index.");
         data.put("flashRefresh", false);
      }

      // a map to hold the stance timeline data
      Map<String, Object> timeline = new HashMap<String, Object>();

      ParsedDateHistogram histogram = (ParsedDateHistogram) searchResponse.getAggregations().get("timeline");
      // TODO check if range covers all replies. if it does than set it to null so
      // in the UI we can not bother showing the range selector
      ZonedDateTime createdAt = ZonedDateTime.parse(tweet.get("created_at").toString(), TWITTER_DATE_FORMAT);
      createdAt = createdAt.withZoneSameInstant(timezone);
      LocalDate lastTweet = createdAt.toLocalDate();


      for (MultiBucketsAggregation.Bucket bucket : histogram.getBuckets()) {
         // and for each bucket (i.e. day) get the stance aggregation
         Aggregation stance = bucket.getAggregations().get("category");

         // ((MultiBucketsAggregation) stance).getBuckets().forEach(b -> {
         for (Bucket b : ((MultiBucketsAggregation) stance).getBuckets()) {

            // and for each stance label....

            // get the series data for this stance label out of the result map
            Map<String, Object> series = (Map<String, Object>) timeline.get(b.getKeyAsString());

            if (series == null) {
               // if we haven't seen this stance label before then create an empty
               // data series so we have somewhere to put the data
               series = new HashMap<String, Object>();
               series.put("x", new ArrayList<String>());
               series.put("y", new ArrayList<Long>());
               series.put("type", "bar");
               series.put("name", b.getKeyAsString());

               Map<String, String> marker = new HashMap<String, String>();

               marker.put("color", categories.getColor(b.getKeyAsString()));

               series.put("marker", marker);

               timeline.put(b.getKeyAsString(), series);
            }

            // As we are just parsing a yyyy-MM-dd string I don't think this needs to use a
            // specific timezone as it won't have any effect
            LocalDate date = LocalDate.parse(bucket.getKeyAsString(), DISPLAY_DATE_FORMAT);

            if (date.isAfter(lastTweet))
               lastTweet = date;

            // put the x and y values on the end of the series data
            ((List<String>) series.get("x")).add(bucket.getKeyAsString());
            ((List<Long>) series.get("y")).add(b.getDocCount());
         } // );
      }

      List timelineValues = new ArrayList();

      for (String category : categories.getLabels().keySet()) {
         if (timeline.containsKey(category))
            timelineValues.add(0, timeline.get(category));
      }

      List<String> firstTwoWeeks = new ArrayList<String>();
      firstTwoWeeks.add(DISPLAY_DATE_FORMAT.format(createdAt.minusDays(1)));
      firstTwoWeeks.add(DISPLAY_DATE_FORMAT.format(createdAt.plusDays(6)));
      data.put("range", firstTwoWeeks);

      // TODO this is broken when the tweets are less than 24 hours apart but on
      // different days
      long daysBetween = Duration.between(createdAt, lastTweet.atStartOfDay(ZoneId.of("Z"))).toDays();

      data.put("rangeSlider", daysBetween > 7);

      Map<String, Long> stance = aggregationToMap(searchResponse.getAggregations().get("category"));

      data.put("categories", stance);

      data.put("replies_processed", stance.values().stream().reduce(0L, Long::sum));

      data.put("reply_count", data.get("number_of_replies"));

      // if (daysBetween > 1)
      data.put("timeline", timelineValues);

      Map labelSubset = new LinkedHashMap(categories.getLabels());
      labelSubset.keySet().retainAll(stance.keySet());

      data.put("category_labels", labelSubset);
      data.put("category_description", categories.getDescription());

      // finally return the JSON response
      return data;
   }

   @GetMapping("/{dashboard}/embed")
   public Map<String, Object> embed(@RequestParam(value = "lang", defaultValue = "en") String lang,
         @RequestParam(value = "screen_name") String screen_name, @RequestParam(value = "status_id") String status_id,
         @PathVariable(required = true) String dashboard) throws IOException, URISyntaxException {

      HttpGet httpGet = new HttpGet("https://publish.twitter.com/oembed");

      URI uri = new URIBuilder(httpGet.getURI()).addParameter("omit_script", "true").addParameter("maxwidth", "550")
            .addParameter("align", "center").addParameter("hide_thread", "true").addParameter("dnt", "true")
            .addParameter("lang", lang)
            .addParameter("url", "https://twitter.com/" + screen_name + "/status/" + status_id).build();

      ((HttpRequestBase) httpGet).setURI(uri);

      try (CloseableHttpResponse httpResponse = HTTP_CLIENT.execute(httpGet)) {
         return JACKSON.readValue(httpResponse.getEntity().getContent(), Map.class);
      }
   }
}
