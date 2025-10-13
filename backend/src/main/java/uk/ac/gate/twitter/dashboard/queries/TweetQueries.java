package uk.ac.gate.twitter.dashboard.queries;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.IdsQueryBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.elasticsearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.ac.gate.twitter.dashboard.config.CategoryInformation;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

import java.time.ZoneId;


@Service
public class TweetQueries {

    @Autowired
    private CategoryInformation categories;

    @Autowired
    QueryParts queryParts;

    public SearchSourceBuilder generateTweetQuery(String id) {

        // the query is easy as we just want to retrieve a single document by its ID
        // (which is also the tweet status ID)
        IdsQueryBuilder tweetIdQuery = new IdsQueryBuilder().addIds(id);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .fetchSource(true)
            .trackTotalHits(true)
            .query(tweetIdQuery);

        return sourceBuilder;
    }

    public SearchSourceBuilder generateTweetReplyStanceAggregations(Dashboards.Config config, String id){

        BoolQueryBuilder tweetReplyQuery = queryParts.queryIsReplyToThisTweet(config, id);

        // build a histogram of the stance labels on a per day basis
        // https://www.programmersought.com/article/3221264853/
        DateHistogramAggregationBuilder dailyReplyAggregation =  AggregationBuilders.dateHistogram("timeline")
            .field(config.getTweetPrefix() + "created_at")
            .fixedInterval(DateHistogramInterval.DAY)
            .format("yyyy-MM-dd")
            .timeZone(ZoneId.of(config.getTimezone()))
            .minDocCount(0L)
            .subAggregation(AggregationBuilders.terms("category").field(categories.getField()));

        TermsAggregationBuilder categoryAggregation =  AggregationBuilders.terms("category").field(categories.getField());

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .fetchSource(false)
            .trackTotalHits(true)
            .query(tweetReplyQuery)
            .aggregation(dailyReplyAggregation)
            .aggregation(categoryAggregation)
            .size(0);

        return sourceBuilder;
    }
}
