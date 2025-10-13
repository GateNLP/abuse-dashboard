package uk.ac.gate.twitter.dashboard.queries;

import java.util.Map;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class CoordinationQueries {

    @Autowired
    QueryParts queryParts;

    public BoolQueryBuilder generateBaseQuery(Dashboards.Config config, String from, String to,
                                                     String query, Map<String,Object> filter){
     BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to));

        if (query != null && query.length() > 0) {
            indexQuery.filter(queryParts.processDashboardSearch(config, query));
        }

        indexQuery.filter(queryParts.processDashboardFilter(config, filter, false));

        return indexQuery;

    }
}
