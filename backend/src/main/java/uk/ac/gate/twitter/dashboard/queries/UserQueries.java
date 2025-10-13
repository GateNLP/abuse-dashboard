package uk.ac.gate.twitter.dashboard.queries;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.Operator;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.index.query.QueryStringQueryBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.BucketOrder;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.search.sort.FieldSortBuilder;
import org.elasticsearch.search.sort.SortMode;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class UserQueries {

   @Autowired
   QueryParts queryParts;

   public SearchSourceBuilder generateUserQuery(Dashboards.Config config, String screenName, String date) {

      // We want the latest tweet by the user, so time period isn't too important
      BoolQueryBuilder query = QueryBuilders.boolQuery().must(queryParts.queryAuthoredByHandle(config, screenName));
      if (date != null && date.length() > 0) {
         query.filter(queryParts.queryTweetsInRange(config, config.getFrom(), date));
      }

      // fetchSource: yes, we want the user data from it
      // trackTotalHits: true, so that we can check to see if all the tweets have been
      // deleted (i.e. is deleted in the status aggregation the same as total hits)
      // size: 1, we just wanted the latest tweet so we can get the latest user data
      // (hence sort order)
      SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().fetchSource(true).trackTotalHits(true).size(1)
            .query(query).sort(queryParts.sortByDate(config, SortOrder.DESC))
            .aggregation(AggregationBuilders.terms("status").field(config.getCompliance().getReasonField()));

      if (config.getBio()) {
         sourceBuilder.aggregation(generateUserBioAggregation(config));
      }

      return sourceBuilder;
   }

   private AggregationBuilder generateUserBioAggregation(Dashboards.Config config) {
      return AggregationBuilders.terms("bio").field(config.getTweetPrefix() + "user.desc").size(10000)
            .order(BucketOrder.aggregation("earliest", true))
            .subAggregation(AggregationBuilders.min("earliest").field(config.getTweetPrefix() + "created_at"))
            .subAggregation(AggregationBuilders.max("latest").field(config.getTweetPrefix() + "created_at"));
   }

   public SearchSourceBuilder generateUserSearchQuery(Dashboards.Config config, String queryString, String minMatch) {
      QueryStringQueryBuilder queryStringBuilder = QueryBuilders.queryStringQuery(queryString)
            .defaultField(config.getTweetPrefix() + "user.description").defaultOperator(Operator.OR);

      if (minMatch != null) queryStringBuilder.minimumShouldMatch(minMatch);
      
      BoolQueryBuilder query = QueryBuilders.boolQuery().must(queryStringBuilder);

      if (config.getCompliance().getStrict()) {
         query.filter(queryParts.queryTweetsWithoutCompliance(config));
      }

      AggregationBuilder screenNameAggregation = AggregationBuilders.terms("screen_name")
            .field(config.getTweetPrefix() + "user.screen_name.keyword").size(10000)
            .subAggregation(AggregationBuilders.min("created_at").field(config.getTweetPrefix() + "user.created_at"))
            .subAggregation(AggregationBuilders.max("tweeted_at").field(config.getTweetPrefix() + "created_at"))
            .subAggregation(AggregationBuilders.terms("platform").field(config.getTweetPrefix() + "platform.keyword"))
            .subAggregation(AggregationBuilders.topHits("bestMatch").size(1).sort("_score", SortOrder.DESC));

      if (config.getBio()) {
         screenNameAggregation.subAggregation(generateUserBioAggregation(config));
      }

      SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().fetchSource(false).trackTotalHits(true).size(0)
            .query(query).aggregation(screenNameAggregation);

      return sourceBuilder;
   }
}
