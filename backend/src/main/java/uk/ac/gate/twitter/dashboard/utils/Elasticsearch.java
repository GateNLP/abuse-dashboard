package uk.ac.gate.twitter.dashboard.utils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.nio.client.HttpAsyncClientBuilder;
import org.elasticsearch.action.search.ClearScrollRequest;
import org.elasticsearch.action.search.ClearScrollResponse;
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchScrollRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.client.RestHighLevelClientBuilder;
import org.elasticsearch.core.TimeValue;
import org.elasticsearch.index.query.MatchQueryBuilder;
import org.elasticsearch.search.Scroll;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.aggregations.Aggregation;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.ParsedAggregation;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.elasticsearch.search.aggregations.bucket.MultiBucketsAggregation.Bucket;
import org.elasticsearch.search.aggregations.bucket.ParsedSingleBucketAggregation;
import org.elasticsearch.search.aggregations.bucket.filter.ParsedFilters;
import org.elasticsearch.search.aggregations.bucket.terms.ParsedTerms;
import org.elasticsearch.search.aggregations.metrics.ParsedCardinality;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.search.sort.FieldSortBuilder;
import org.elasticsearch.search.sort.SortOrder;

import uk.ac.gate.twitter.dashboard.config.Dashboards;

/**
 * Utility methods for extracting useful information from elasticsarch or it's
 * response objects.
 */
public class Elasticsearch {

   private static Map<Integer, RestHighLevelClient> elasticClients = new HashMap<Integer, RestHighLevelClient>();

   public static RestHighLevelClient getClient(Dashboards.Config focus) {
      return getClient(focus.getElastic());
   }

   public static RestHighLevelClient getClient(Map<String,String> elastic) {

      if (!elasticClients.containsKey(elastic.hashCode())) {
         elasticClients.put(elastic.hashCode(),
               buildClient(elastic.get("host"), elastic.getOrDefault("pathPrefix", null),
                     elastic.getOrDefault("username", null), elastic.getOrDefault("password", null)));
      }

      return elasticClients.get(elastic.hashCode());
   }

   private static RestHighLevelClient buildClient(String host, String pathPrefix, String username, String password) {

      RestClientBuilder clientBuilder = RestClient.builder(HttpHost.create(host))
            .setRequestConfigCallback(new RestClientBuilder.RequestConfigCallback() {
               @Override
               public RequestConfig.Builder customizeRequestConfig(RequestConfig.Builder requestConfigBuilder) {
                  return requestConfigBuilder.setConnectTimeout(5000).setSocketTimeout(120000);
               }

            });

      if (pathPrefix != null)
         clientBuilder.setPathPrefix(pathPrefix);

      if (username != null && password != null) {
         final CredentialsProvider credentialsProvider = new BasicCredentialsProvider();
         credentialsProvider.setCredentials(AuthScope.ANY, new UsernamePasswordCredentials(username, password));

         clientBuilder.setHttpClientConfigCallback(new RestClientBuilder.HttpClientConfigCallback() {
            @Override
            public HttpAsyncClientBuilder customizeHttpClient(HttpAsyncClientBuilder httpClientBuilder) {
               return httpClientBuilder
                     .setSSLContext(null).setDefaultCredentialsProvider(credentialsProvider);
            }
         });
      }

      RestHighLevelClient client = new RestHighLevelClientBuilder(clientBuilder.build())
      .setApiCompatibilityMode(true)
      .build();

      return client;
   }
   
   public static Bucket findBucket(MultiBucketsAggregation a, String name) {
     
      for (Bucket b : a.getBuckets()) {
      
      
         if (b.getKeyAsString().equals(name))
            return b;
      }

      return null;
   }

   public static Map<String, Long> aggregationToMapLC(Aggregation a, String... levels) {

      Map<String, Long> result = new LinkedHashMap<String, Long>();

      ((MultiBucketsAggregation) a).getBuckets().forEach(b -> {

         ParsedSingleBucketAggregation previous = null;

         for (String level : levels) {
            if (previous == null) {
               previous = b.getAggregations().get(level);
            } else {
               previous = previous.getAggregations().get(level);
            }
         }

         if (previous == null)
            result.put(b.getKeyAsString().toLowerCase(),
                  result.getOrDefault(b.getKeyAsString().toLowerCase(), 0L) + (long) b.getDocCount());
         else
            result.put(b.getKeyAsString().toLowerCase(),
                  result.getOrDefault(b.getKeyAsString().toLowerCase(), 0L) + (long) previous.getDocCount());
      });

      return result;
   }

   public static Map<String,Long> compositeAggregationToMap(Aggregation a, String k, String s) {

      Map<String, Long> result = new LinkedHashMap<String, Long>();

      if (a == null) return result;

      ((MultiBucketsAggregation) a).getBuckets().forEach(b -> {

         if (b.getDocCount() > 1 || k.equals("users")) {
            ParsedCardinality users = (ParsedCardinality)b.getAggregations().get(s);
            
            if (users.getValue() > 1) result.put((String)((Map)b.getKey()).get(k), b.getDocCount());
         }
      });

      return result;
   }

   public static Map<String, Long> aggregationToMap(Aggregation a, String... levels) {

      Map<String, Long> result = new LinkedHashMap<String, Long>();

      ((MultiBucketsAggregation) a).getBuckets().forEach(b -> {

         ParsedSingleBucketAggregation previous = null;

         for (String level : levels) {
            if (previous == null) {
               previous = b.getAggregations().get(level);
            } else {
               previous = previous.getAggregations().get(level);
            }
         }
         
         String key = b.getKeyAsString();
         
         if (key.equals("")) key = "{UNKNOWN}";
         
         try {
            int k = Integer.parseInt(key);
            key = "_"+key;
         }catch (Exception e) {
            
            //do nothing
         }
         
         if (previous == null)
            result.put(key, (long) b.getDocCount());
         else
            result.put(key, (long) previous.getDocCount());
      });

      return result;
   }

   public static Map<String, Map<String, Long>> aggregationNestedBucketsToMap(Aggregation a, boolean other,
         String... levels) {
      Map<String, Map<String, Long>> result = new LinkedHashMap<String, Map<String, Long>>();

      ((MultiBucketsAggregation) a).getBuckets().forEach(b -> {
         ParsedAggregation previous = null;

         for (String level : levels) {
            if (previous == null) {
               previous = b.getAggregations().get(level);
            } else {
               previous = ((ParsedSingleBucketAggregation) previous).getAggregations().get(level);
            }
         }

         Map<String, Long> inner = new LinkedHashMap<String, Long>();

         ((MultiBucketsAggregation) previous).getBuckets().forEach(bin -> {
            inner.put(bin.getKeyAsString(), bin.getDocCount());
         });

         if (other && previous instanceof ParsedTerms) {
            
            long ov = ((ParsedTerms) previous).getSumOfOtherDocCounts();
            if (ov > 0) inner.put("other", ((ParsedTerms) previous).getSumOfOtherDocCounts());
         }

         result.put(b.getKeyAsString(), inner);
      });

      return result;
   }

   public static Map<String, Long> aggregationBucketToMap(Aggregation a, String filter, String bucket) {

      Map<String, Long> result = new LinkedHashMap<String, Long>();

      ((MultiBucketsAggregation) a).getBuckets().forEach(b -> {
         result.put(b.getKeyAsString(),
               (long) ((ParsedFilters) b.getAggregations().get(filter)).getBucketByKey(bucket).getDocCount());
      });

      return result;
   }

   /**
    * Retrieve a Map structure summarising the direct replies to a given tweet ID
    */
   public static Map<String, Object> getDirectReplies(RestHighLevelClient client, String index, String id)
         throws IOException {

      SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();

      // lets batch up the results into groups of 500
      sourceBuilder.size(500);

      // we don't need the source as we are just interested in the tweet IDs and
      // aggregations
      sourceBuilder.fetchSource(false);

      // we do want the total numbers to be accurate though
      sourceBuilder.trackTotalHits(true);

      // sort the results by the creation date so that the list of IDs is in order
      sourceBuilder.sort(new FieldSortBuilder("created_at").order(SortOrder.ASC));

      // now we want three aggregations for the stance to the parent, hashtags, and
      // URLs
      // Note these only return the top 10 values, need to use the size method to get
      // more
      sourceBuilder.aggregation(AggregationBuilders.terms("stance").field("stance_classification_parent.keyword"));
      sourceBuilder.aggregation(AggregationBuilders.terms("hashtags").field("entities.hashtags.text.keyword"));
      sourceBuilder.aggregation(AggregationBuilders.terms("urls").field("entities.urls.expanded_url.keyword"));

      // and the query is just to select all tweets that are direct replies to the
      // given ID
      sourceBuilder.query(new MatchQueryBuilder("in_reply_to_status_id_str.keyword", id));

      // now we have no idea how many tweets there are so use a scroll so we can
      // quickly work through them all
      final Scroll scroll = new Scroll(TimeValue.timeValueMinutes(1L));

      // build the search request (including the scroll info)
      SearchRequest searchRequest = new SearchRequest(index);
      searchRequest.source(sourceBuilder);
      searchRequest.scroll(scroll);

      // run the query and get the response
      SearchResponse searchResponse = client.search(searchRequest, RequestOptions.DEFAULT);

      // a map to hold the final JSON response
      Map<String, Object> data = new LinkedHashMap<String, Object>();

      // copy the aggregations into the JSON response map
      Map<String, Aggregation> aggregations = searchResponse.getAggregations().asMap();
      aggregations.entrySet().forEach(aggregation -> {
         data.put(aggregation.getKey(), aggregationToMap(aggregation.getValue()));
      });

      // get the ID of the scroll so we can use it to go through the results
      String scrollId = searchResponse.getScrollId();

      // get the first batch of results
      SearchHit[] searchHits = searchResponse.getHits().getHits();

      // a list to hold the IDs of the direct replies
      List<String> replies = new ArrayList<String>();

      while (searchHits != null && searchHits.length > 0) {
         // while there are more hits to process

         for (SearchHit sh : searchHits) {
            // loop through each hit in the batch and...
            String id_str = sh.getId();

            // ... store it's ID in the list
            replies.add(id_str);
         }

         // use the scroll to get the next batch of tweets that match the query
         SearchScrollRequest scrollRequest = new SearchScrollRequest(scrollId);
         scrollRequest.scroll(scroll);
         searchResponse = client.scroll(scrollRequest, RequestOptions.DEFAULT);
         scrollId = searchResponse.getScrollId();
         searchHits = searchResponse.getHits().getHits();
      }

      // when we've finished clear up the scroll
      ClearScrollRequest clearScrollRequest = new ClearScrollRequest();
      clearScrollRequest.addScrollId(scrollId);
      ClearScrollResponse clearScrollResponse = client.clearScroll(clearScrollRequest, RequestOptions.DEFAULT);

      // TODO should we flag this somewhere?
      boolean succeeded = clearScrollResponse.isSucceeded();

      // put the list of IDs into the main response map
      data.put("ids", replies);

      // return all the data to whoever asked for it
      return data;
   }
}
