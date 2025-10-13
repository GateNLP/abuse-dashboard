package uk.ac.gate.twitter.dashboard.queries;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.MatchQueryBuilder;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.ac.gate.twitter.dashboard.config.CategoryInformation;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

import java.util.Arrays;

@Service
public class ConversationQueries {

    @Autowired
    private CategoryInformation categories;
    
    @Autowired
    private QueryParts queryParts;


    public SearchSourceBuilder generateConversationQuery(Dashboards.Config config, String conversationId, String stance,
                                                         String contentFilters){

        SearchSourceBuilder sourceBuilder = generateBaseConversationQuery(config,conversationId,stance,contentFilters);

        // TODO need to start using the proper analyser in the gate-hate app to be consistent
        // we want to know the counts of: all the hashtags used in the conversation
        TermsAggregationBuilder hashtagAggregation = AggregationBuilders.terms("hashtags")
                .field("entities.Hashtag.string.keyword").size(25);
                //.field(config.getTweetPrefix() + "entities.hashtags.text.keyword").size(25);

        // all urls in the conversation
        TermsAggregationBuilder urlAggregation = AggregationBuilders.terms("urls")
              .field("entities.URL.string.keyword");
        //    .field(config.getTweetPrefix() + "entities.urls.unwound_url.keyword");

        // all users in the conversation
        TermsAggregationBuilder userAggregation = AggregationBuilders.terms("users")
              .field(config.getTweetPrefix() + "user.screen_name.keyword").subAggregation(
                    AggregationBuilders.terms("platform").field(config.getTweetPrefix() + "platform.keyword"));

        sourceBuilder
            .aggregation(hashtagAggregation)
            .aggregation(urlAggregation)
            .aggregation(userAggregation);

        return sourceBuilder;
    }

    public SearchSourceBuilder generateRepliesQuery(Dashboards.Config config, String conversationId, String stance,
                                                    String contentFilters, String screenName, String hashtag) {

        // This query is almost exactly the same as the conversation one above
        // Except we don't need the aggregations, and we may need to add two new filters
        SearchSourceBuilder sourceBuilder = generateBaseConversationQuery(config, conversationId, stance, contentFilters);
        BoolQueryBuilder queryToUpdate = (BoolQueryBuilder) sourceBuilder.query();

        if (screenName != null) {
            queryToUpdate.filter(new MatchQueryBuilder(config.getTweetPrefix() + "user.screen_name", screenName));
        }

        if (hashtag != null) {
            queryToUpdate.filter(new MatchQueryBuilder("entities.Hashtag.string", hashtag));
        }

        sourceBuilder.query(queryToUpdate);

        return sourceBuilder;
    }

    private SearchSourceBuilder generateBaseConversationQuery(Dashboards.Config config, String conversationId, String stance,
                                                  String contentFilters){

        BoolQueryBuilder tweetReplyQuery = queryParts
            .queryIsReplyToThisTweet(config, conversationId)
            .filter(QueryBuilders.termsQuery(categories.getField(), Arrays.asList(stance.split(","))));

        if (!contentFilters.equals("")) {
            BoolQueryBuilder rq = QueryBuilders.boolQuery();

            for (String typeOfFilter : contentFilters.split(",")) {
                // this uses a should (i.e. OR) as I assume that was the idea so as to allow one or more
                // of the restrictions to match and not to force all of them to match, but.....
                
                if (typeOfFilter.equals("urls"))
                    rq.should(QueryBuilders.existsQuery("entities.URL.string.keyword"));
                else if (typeOfFilter.equals("hashtags"))
                    rq.should(QueryBuilders.existsQuery("entities.Hashtag.string.keyword"));
                else if (typeOfFilter.equals("user_mentions"))
                    rq.should(QueryBuilders.existsQuery("entities.UserID.string.keyword"));

                //rq.should(QueryBuilders.existsQuery(config.getTweetPrefix() + "entities." + typeOfFilter));
            }

            tweetReplyQuery.filter(rq);
        }

        if (config.getCompliance().getStrict()) {
           tweetReplyQuery.filter(queryParts.queryTweetsWithoutCompliance(config));
        }

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .fetchSource(false).trackTotalHits(true).size(0)
            .query(tweetReplyQuery)
            .sort(queryParts.sortByDate(config, SortOrder.ASC))
            .fetchField(categories.getField());

           return sourceBuilder;
    }

}
