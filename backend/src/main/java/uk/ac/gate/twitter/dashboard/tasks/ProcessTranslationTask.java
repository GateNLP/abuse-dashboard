package uk.ac.gate.twitter.dashboard.tasks;

import static uk.ac.gate.twitter.dashboard.utils.Elasticsearch.getClient;

import java.net.URI;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.elasticsearch.action.admin.cluster.storedscripts.PutStoredScriptRequest;
import org.elasticsearch.action.bulk.BulkProcessor;
import org.elasticsearch.action.bulk.BulkRequest;
import org.elasticsearch.action.bulk.BulkResponse;
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchScrollRequest;
import org.elasticsearch.action.update.UpdateRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.common.bytes.BytesReference;
import org.elasticsearch.core.TimeValue;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.script.Script;
import org.elasticsearch.script.ScriptType;
import org.elasticsearch.search.Scroll;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.xcontent.XContentBuilder;
import org.elasticsearch.xcontent.XContentFactory;
import org.elasticsearch.xcontent.XContentType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Component
public class ProcessTranslationTask {

   @Autowired
   QueryParts queryParts;

   private static Logger logger = LoggerFactory.getLogger(ProcessTranslationTask.class);

   final static private CloseableHttpClient HTTP_CLIENT = HttpClients.createDefault();

   final static private ObjectMapper JACKSON = new ObjectMapper();

   @Autowired
   private Dashboards indexDetails;

   private static Scroll ELASTIC_SCROLL = new Scroll(TimeValue.timeValueMinutes(60L));

   // this is the set of indexes we've added the stored script to, so we don't need
   // to add it repeatedly. It will add it once each time we start up, which means
   // if we change the script it will get correctly updated
   private static final Set<String> indexes = new HashSet<String>();

   @Scheduled(fixedDelay = 1000 * 60 * 5)
   public void processTranslations() throws Exception {
      // To make processing as quick as we can we batch up the update requests, and
      // use this listener to watch for any errors (not that we do anything with
      // them.... as yet)
      BulkProcessor.Listener listener = new BulkProcessor.Listener() {
         @Override
         public void beforeBulk(long executionId, BulkRequest request) {
            // this happens just before a bulk request, we don't care about this at all
         }

         @Override
         public void afterBulk(long executionId, BulkRequest request, BulkResponse response) {
            // This is called when the bulk request was successful, but may contain error
            // messages for each of the items in the request, so we have to check if there
            // were any failures of individual docs and then log them somehow, although the
            // report will still show them as having been a success.
            if (response.hasFailures()) {
               logger.warn("afterBulk (success)", response.buildFailureMessage());
            }
         }

         @Override
         public void afterBulk(long executionId, BulkRequest request, Throwable failure) {
            // whereas this method is called if the bulk request itself fails for some
            // reason. Ideally we want both to have no failure messages
            logger.error("afterBulk (failure)", failure);
         }
      };

      for (String dashboard_id : indexDetails.getIds()) {
         Dashboards.Config config = indexDetails.get(dashboard_id);

         if (!config.hasTranslations()) continue;
         
         String endpoint = (String)config.getTranslations().getOrDefault("endpoint",null);
         
         if (endpoint == null) continue;
         
         URI endpointURI = new URI(endpoint);

         // and here is the actual bulk processor we will use to access the index
         BulkProcessor bulkProcessor = BulkProcessor.builder(
               (request, bulkListener) -> getClient(config).bulkAsync(request, RequestOptions.DEFAULT, bulkListener),
               listener).build();

         QueryBuilder toCheck = queryParts.queryPostsInNeedOfTranslation(config);

         SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(50)
               .query(toCheck).fetchField("text_en").fetchField("tweet_kind");

         SearchRequest searchRequest = new SearchRequest(config.getIndex());
         searchRequest.source(sourceBuilder);
         searchRequest.scroll(ELASTIC_SCROLL);

         SearchResponse searchResponse = getClient(config).search(searchRequest, RequestOptions.DEFAULT);

         SearchHit[] hits = searchResponse.getHits().getHits();

         while (hits.length > 0) {

            for (SearchHit hit : hits) {
               // process each hit with the GATE app, add the Abuse annotations in the right
               // place and set the translation_processed flag so we don't do the same post
               // twice

               List<Map<Object, Object>> results = process(endpointURI, hit);

               // if results is null then that's from an exception so we don't go further in
               // the hope that on a future pass over the index we'll get 
               // List<Map<Object,Object>> results = gateHate.process(hit);a none null response
               // and can then update the index even if that is no new annotations
               if (results == null)
                  continue;

               addStoredScript(config, hit.getIndex());

               // create an update request remembering that the document ID is the tweet ID
               UpdateRequest request = new UpdateRequest(hit.getIndex(), hit.getId());

               Map<String, Object> params = new HashMap<String, Object>();
               params.put("abuse", results);

               // ensure we use the script to do the actual update
               request.script(new Script(ScriptType.STORED, null, "addTranslatedAbuse", params));
               
               System.out.println(request);

               // now queue the request so it will eventually get processed
               bulkProcessor.add(request);
            }

            SearchScrollRequest scrollRequest = new SearchScrollRequest(searchResponse.getScrollId());
            scrollRequest.scroll(ELASTIC_SCROLL);
            searchResponse = getClient(config).scroll(scrollRequest, RequestOptions.DEFAULT);

            hits = searchResponse.getHits().getHits();
         }

         try {
            bulkProcessor.awaitClose(10, TimeUnit.SECONDS);
         } catch (InterruptedException e) {
            throw new RuntimeException(e);
         }
      }
   }

   private List<Map<Object, Object>> process(URI endpoint, SearchHit hit) {

      try {
         HttpPost httpPost = new HttpPost(endpoint);

         Map<String, String> input = new HashMap<String, String>();
         input.put("text", hit.field("text_en").<String>getValue());
         input.put("type", hit.field("tweet_kind").<String>getValue());

         StringEntity strEntity = new StringEntity(JACKSON.writeValueAsString(input), ContentType.APPLICATION_JSON);
         httpPost.setEntity(strEntity);
         httpPost.setHeader("Content-type", "application/json");

         try (CloseableHttpResponse httpResponse = HTTP_CLIENT.execute(httpPost)) {
            return JACKSON.readValue(httpResponse.getEntity().getContent(), List.class);
         }
      } catch (Exception e) {
         return null;
      }
   }

   private static void addStoredScript(Dashboards.Config config, String index) throws Exception {
      if (indexes.add(index)) {
         XContentBuilder builder = XContentFactory.jsonBuilder();
         builder.startObject();
         {
            builder.startObject("script");
            {
               builder.field("lang", "painless");
               builder.field("source",
                     "ctx._source.entities.Abuse.addAll(params.abuse); ctx._source.translation_processed = true;");
            }
            builder.endObject();
         }
         builder.endObject();

         // create the request to store the script
         PutStoredScriptRequest scriptRequest = new PutStoredScriptRequest();
         scriptRequest.id("addTranslatedAbuse");
         scriptRequest.content(BytesReference.bytes(builder), XContentType.JSON);

         // now push the script into the index
         if (!getClient(config).putScript(scriptRequest, RequestOptions.DEFAULT).isAcknowledged()) {
            // TODO what on earth do we do if we've got to here but can't insert the script
            logger.error("unable to store script in index, we won't be able to add the translated abuse");
         }
      }
   }

}
