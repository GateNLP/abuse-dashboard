package uk.ac.gate.twitter.dashboard.controllers;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.aggregationToMap;
import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilter;
import org.elasticsearch.search.aggregations.bucket.histogram.ParsedDateHistogram;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedStringTerms;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedTerms;
import org.elasticsearch.search.aggregations.metrics.ParsedMin;
import org.elasticsearch.search.aggregations.bucket.nested.ParsedNested;
import org.elasticsearch.search.aggregations.bucket.nested.ParsedReverseNested;
import org.elasticsearch.search.aggregations.pipeline.ExtendedStatsBucket;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.queries.AlertsQueries;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@RestController
public class AlertsController {

   @Autowired
   private Dashboards dashboards;

   @Autowired
   QueryParts queryParts;

   @Autowired
   private AlertsQueries alertQueries;

   private static final String[] VERIFIED_TYPES = new String[] { "Government", "Business" };

   private Map<String, Object> alert(Dashboards.Config config, boolean abusive, Map<String,Object> watched, Map<String,Long> tweetTimes) throws Exception {
      Map<String, Object> result = new LinkedHashMap<String, Object>();

      SearchRequest searchRequest = new SearchRequest(config.getIndex());

      // do the search for the last week
      
      if (watched != null) 
         searchRequest.source(alertQueries.generateWatchedStatsQuery(config, watched));
      else
         searchRequest.source(alertQueries.generateStatsQuery(config, abusive));
      
      SearchResponse weekResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      

      Map<String,Object> times = new LinkedHashMap();

      if (tweetTimes != null) {
         if (!abusive) {
             ((MultiBucketsAggregation) ((ParsedFilter) weekResponse.getAggregations().get("by_target")).getAggregations()
            .get("timeline")).getBuckets().forEach(b -> {
               ParsedMin min = (ParsedMin) b.getAggregations().get("timeline");
               tweetTimes.put(b.getKeyAsString(), ((Double) min.getValue()).longValue());
               //ZonedDateTime
               //      .ofInstant(Instant.ofEpochMilli(((Double) min.getValue()).longValue()), ZoneId.of("UTC")));
            });
         } else {

            long[] minutes = new long[60];
            
            ((MultiBucketsAggregation) ((ParsedFilter) weekResponse.getAggregations().get("in_reply_to")).getAggregations()
            .get("timeline")).getBuckets().forEach(b -> {
               

               Long orig = tweetTimes.get(b.getKeyAsString());

               if (orig != null) {
                  long time = ((Double)((ParsedMin) b.getAggregations().get("timeline")).getValue()).longValue();

                  long diff = ((time-orig)/1000/60);

                  if (diff < 60) {
                     minutes[(int)diff] = minutes[(int)diff]+1;
                     
                  }

               }
            });

            int peak = 0;
            long total = 0;

            for (int i = 1 ; i < minutes.length ; ++i) {
               peak = minutes[i] > minutes[peak] ? i : peak;
               total += minutes[i];
            }

            // if the peak value is zero then there are no posts within the
            // first hour so there is nothing to report. Set the peak to -1
            // to signify this
            if (minutes[peak] == 0) peak = -1;

            times.put("week",peak);
            times.put("total", total);

            result.put("time",times);
         }
      } 

      Map<String, Map> users = new LinkedHashMap<String, Map>();

      ((ParsedStringTerms) weekResponse.getAggregations().get("users")).getBuckets().forEach(b -> {

         Map<String, Object> u = new LinkedHashMap();

         String id = b.getKeyAsString();

         u.put("id_str", id);
         u.put("week", b.getDocCount());

         u.put("platform", ((ParsedTerms) b.getAggregations().get("platform")).getBuckets().get(0).getKeyAsString());
         u.put("screen_name",
               ((ParsedTerms) b.getAggregations().get("screen_name")).getBuckets().get(0).getKeyAsString());

         users.put(id, u);

      });

      Map<String,Map> hashtags = new LinkedHashMap<String,Map>();
      
      ((ParsedStringTerms) weekResponse.getAggregations().get("hashtags")).getBuckets().forEach(b -> {
         Map<String,Object> h = new LinkedHashMap();

         h.put("hashtag",b.getKeyAsString());
         h.put("week", b.getDocCount());

         hashtags.put(b.getKeyAsString(), h);
      });

      Map<String, Map> countries = new LinkedHashMap<String, Map>();

      ((ParsedStringTerms) weekResponse.getAggregations().get("countries")).getBuckets().forEach(b -> {
         Map<String,Object> c = new LinkedHashMap();

         c.put("country",b.getKeyAsString());
         c.put("week", b.getDocCount());

         countries.put(b.getKeyAsString(), c);
      });

      Map<String, Map> affiliatedWith = new LinkedHashMap<String, Map>();

      ((ParsedStringTerms) weekResponse.getAggregations().get("affiliatedWith")).getBuckets().forEach(b -> {
         Map<String,Object> a = new LinkedHashMap();

         a.put("account", b.getKeyAsString());
         a.put("week", b.getDocCount());


         a.put("badge",((ParsedStringTerms)b.getAggregations().get("badge")).getBuckets().get(0).getKeyAsString());
         a.put("description",((ParsedStringTerms)b.getAggregations().get("description")).getBuckets().get(0).getKeyAsString());

         affiliatedWith.put(b.getKeyAsString(),a);
      });

      

      // do the search/aggregations for the 8 week background period

      

      if (watched != null)
         searchRequest.source(alertQueries.generateWatchedHistogramStatsQuery(config, watched, users.keySet(),
               hashtags.keySet(), countries.keySet(), affiliatedWith.keySet()));
      else
         searchRequest.source(alertQueries.generateHistogramStatsQuery(config, abusive, users.keySet(),
               hashtags.keySet(), countries.keySet(), affiliatedWith.keySet()));
      
      SearchResponse monthResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

      if (tweetTimes != null) {
         if (!abusive) {
            ((ParsedDateHistogram) monthResponse.getAggregations().get("timeline")).getBuckets().forEach(ob -> {
               // System.out.println(Strings.toString((ParsedFilter)b.getAggregations().get("by_target")));
               ((MultiBucketsAggregation) ((ParsedFilter) ob.getAggregations().get("by_target")).getAggregations()
                     .get("timeline")).getBuckets().forEach(b -> {
                        ParsedMin min = (ParsedMin) b.getAggregations().get("timeline");
                        tweetTimes.put(b.getKeyAsString(), ((Double) min.getValue()).longValue());
                        // ZonedDateTime
                        // .ofInstant(Instant.ofEpochMilli(((Double) min.getValue()).longValue()),
                        // ZoneId.of("UTC")));
                     });
            });
         } else {


            List<Integer> peaks = new ArrayList<Integer>();

            ((ParsedDateHistogram) monthResponse.getAggregations().get("timeline")).getBuckets().forEach(ob -> {

               long[] minutes = new long[60];


               ((MultiBucketsAggregation) ((ParsedFilter) weekResponse.getAggregations().get("in_reply_to")).getAggregations()
               .get("timeline")).getBuckets().forEach(b -> {
                  

                  Long orig = tweetTimes.get(b.getKeyAsString());

                  if (orig != null) {
                     long time = ((Double)((ParsedMin) b.getAggregations().get("timeline")).getValue()).longValue();

                     long diff = ((time-orig)/1000/60);

                     if (diff < 60) minutes[(int)diff] = minutes[(int)diff]+1;

                  }
                  
               });

               int peak = 0;

               for (int i = 1 ; i < minutes.length ; ++i) {
                  peak = minutes[i] > minutes[peak] ? i : peak;
               }

               if (minutes[peak] != 0) peaks.add(peak);

            });

            // if the number of buckets isn't the size of the peaks then we have missing data
            // which we might want to note in the UI
            times.put("valid", peaks.size() == ((ParsedDateHistogram) monthResponse.getAggregations().get("timeline")).getBuckets().size());

            if (peaks.size() > 0) {
               double avg = 0;
               for (Integer i : peaks) avg += i;
               avg = avg/peaks.size();

               double deviation = 0;
               for (Integer i : peaks) deviation += Math.pow(((double)i)-avg, 2);
               deviation = Math.sqrt(deviation/peaks.size());

               times.put("std_deviation", deviation);
               times.put("mean", avg);

               // I'm fliping the sign of the z score because here a bigger value (hence a longer time)
               // is better than a lower value.
               double z = -1.0 * (((int)times.get("week") - avg) / deviation);
               times.put("z_score", z);
            }
         }
      }     


      ExtendedStatsBucket stats = (ExtendedStatsBucket) monthResponse.getAggregations().get("stats");

      result.put("everything", getStatsResults(stats, weekResponse.getHits().getTotalHits().value));

      Map<String, Long> typeCounts = aggregationToMap(weekResponse.getAggregations().get("verified_type"));

      result.put("threats", getStatsResults(monthResponse.getAggregations().get("threats"),
            ((ParsedFilter) weekResponse.getAggregations().get("threats")).getDocCount()));

      result.put("misogynistic", getStatsResults(monthResponse.getAggregations().get("misogynistic"),
            ((ParsedReverseNested) ((ParsedFilter) ((ParsedNested) weekResponse.getAggregations().get("nested"))
                  .getAggregations().get("misogynistic")).getAggregations().get("reverse")).getDocCount()));

      for (String type : VERIFIED_TYPES) {
         stats = (ExtendedStatsBucket) monthResponse.getAggregations().get(type);

         result.put(type.toLowerCase(), getStatsResults(stats, typeCounts.getOrDefault(type, 0L)));
      }

      for (Map.Entry<String, Map> entry : users.entrySet()) {
         entry.getValue().putAll(getStatsResults(monthResponse.getAggregations().get(entry.getKey()),
               (long) entry.getValue().get("week")));
      }
      
      result.put("users", users.values());

      for (Map.Entry<String,Map> entry : hashtags.entrySet()) {
         entry.getValue().putAll(getStatsResults(monthResponse.getAggregations().get(entry.getKey()), (long)entry.getValue().get("week")));
      }

      result.put("hashtags", hashtags.values());

      for (Map.Entry<String,Map> entry : countries.entrySet()) {
         entry.getValue().putAll(getStatsResults(monthResponse.getAggregations().get(entry.getKey()), (long)entry.getValue().get("week")));
      }

      result.put("countries", countries.values());


      for (Map.Entry<String,Map> entry : affiliatedWith.entrySet()) {
         entry.getValue().putAll(getStatsResults(monthResponse.getAggregations().get(entry.getKey()), (long)entry.getValue().get("week")));
      }

      result.put("affiliatedWith", affiliatedWith.values());

      if (watched != null) {
         result.put("watched", watched);
      }

      return result;
   }

   private Map<String, Object> getStatsResults(ExtendedStatsBucket stats, long week) {
      Map<String, Object> result = new LinkedHashMap<String, Object>();

      result.put("std_deviation", stats.getStdDeviation());
      result.put("mean", stats.getAvg());
      result.put("week", week);

      double z = (week - stats.getAvg()) / stats.getStdDeviation();

      result.put("z_score", z);

      return result;
   }

   @PostMapping("/{dashboard}/alerts")
   public Map<String, Object> alert(@PathVariable(required = true) String dashboard,
         @RequestBody(required=false) Map<String,Object> watched) throws Exception {   
      
      Dashboards.Config config = dashboards.get(dashboard);
      
      Map<String, Object> result = new LinkedHashMap<String, Object>();

      if (!config.isLiveUpdating())
         return result;

      Map<String,Long> tweetTimes = new HashMap<String,Long>();

      result.put("all", alert(config, false, null, tweetTimes));

      Map<String,Object> abusive = alert(config, true, null, tweetTimes);
      result.put("abusive", abusive);

      if (watched != null)
         result.put("watched", alert(config, false, watched, null));

      
      result.put("status", getAlertStatus(abusive));

      return result;
   }

   private Map<String,Object> getAlertStatus(Map<String,Object> abusive) {
      Map<String,Object> status = new HashMap<String,Object>();

      Map<String, Object> everything = (Map<String, Object>) abusive.get("everything");

      double z_score = (double) everything.get("z_score");

      status.put("triggered", z_score >= 2d);

      return status;
   }
}
