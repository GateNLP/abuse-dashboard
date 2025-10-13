package uk.ac.gate.twitter.dashboard.queries;

import java.util.Map;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.aggregations.AggregationBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class DatasetDecayQueries {

    @Autowired
    QueryParts queryParts;

    public SearchSourceBuilder generateDecayQuery(Dashboards.Config config, String from, String to, String query,
                                                  Map<String,Object> filter, boolean abusive){

        BoolQueryBuilder tweetsQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to));

        if (query != null && query.length() > 0) {
            tweetsQuery.filter(queryParts.processDashboardSearch(config, query));
        }
        
        tweetsQuery.filter(queryParts.processDashboardFilter(config, filter,false));

        QueryBuilder abusiveQuery = queryParts.queryAbusiveTweets(config,config.getUsers());

        if (abusive) {
            tweetsQuery.filter(abusiveQuery);
        } else {
            tweetsQuery.filter(QueryBuilders.boolQuery().mustNot(abusiveQuery));
        }

        AggregationBuilder geoScrubbedFilter = AggregationBuilders.filter("scrub",
              QueryBuilders.boolQuery().must(QueryBuilders.existsQuery(config.getCompliance().getReasonField()))
                    .mustNot(QueryBuilders.termQuery(config.getCompliance().getReasonField(), "geo_scrubbed")));        
        
        AggregationBuilder complianceAggregation = AggregationBuilders
            .terms("compliance-reason")
            .field(config.getCompliance().getReasonField())
            .size(10000);

        AggregationBuilder accounts = AggregationBuilders.terms("accounts")
              .field(config.getTweetPrefix() + "user.screen_name.keyword").size(100)
              .subAggregation(complianceAggregation);

         geoScrubbedFilter.subAggregation(complianceAggregation);
         geoScrubbedFilter.subAggregation(accounts);         
         
        // track total number of hits to tell us how many organic tweets in index (where someone wrote something new)
        // don't need the document sources at this point as all we are doing is collecting stats
        // in fact we don't even care which documents we matched, so don't bother returning any of them
        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .trackTotalHits(true)
            .fetchSource(false)
            .size(0)
            .query(tweetsQuery)
            .aggregation(geoScrubbedFilter);


        return  sourceBuilder;
    }

}
