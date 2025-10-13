package uk.ac.gate.twitter.dashboard.queries;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.index.query.RangeQueryBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class DataWatchdogQueries {
    @Autowired
    QueryParts queryParts;

    public SearchSourceBuilder generateDataWatchdogQuery(Dashboards.Config dashboard) {
        RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(dashboard.getTweetPrefix() + "created_at")
                .from("now-1d")
                .to("now").timeZone(dashboard.getTimezone());

        BoolQueryBuilder postsQuery = queryParts.queryEverythingRelevantToDashboard(dashboard).filter(rangeQuery);

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                .trackTotalHits(true).fetchSource(false).size(0).query(postsQuery);

        sourceBuilder.aggregation(AggregationBuilders
                .terms("platforms")
                .field(dashboard.getTweetPrefix() + "platform.keyword").size(25));

        return sourceBuilder;

    }

}
