package uk.ac.gate.twitter.dashboard.queries;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.apache.lucene.search.join.ScoreMode;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.BucketOrder;
import org.elasticsearch.search.aggregations.bucket.filter.FilterAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.filter.FiltersAggregator;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.elasticsearch.search.aggregations.bucket.histogram.LongBounds;
import org.elasticsearch.search.aggregations.bucket.nested.NestedAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.terms.IncludeExclude;
import org.elasticsearch.search.aggregations.bucket.terms.SignificantTermsAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.elasticsearch.search.aggregations.metrics.CardinalityAggregationBuilder;
import org.elasticsearch.search.aggregations.metrics.MaxAggregationBuilder;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.elasticsearch.search.sort.FieldSortBuilder;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.config.Dashboards.User;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class IndexQueries {

    @Autowired
    QueryParts queryParts;
    
    public SearchSourceBuilder generateTweetsQuery(Dashboards.Config config, String from, String to, String query,
                                                   Map<String,Object> filter, boolean abusive, String sortField, String order){

        // selects all unique tweets within the specified time range
        BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to));

        if (abusive) {
            // if we want an overview of just the abusive replies to the config of the index
            // then build that horrible bit of query and add it as a filter
            List<Integer> restrictTo = (List<Integer>)filter.getOrDefault("users", null);
            indexQuery.filter(queryParts.queryAbusiveTweets(config, config.getUsers(restrictTo)));
        }

        if (query != null && query.length() > 0) {
            indexQuery.filter(queryParts.processDashboardSearch(config, query));
        }

        indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));
        
        if (config.getCompliance().getStrict()) {
           indexQuery.filter(queryParts.queryTweetsWithoutCompliance(config));
        }
        
        SortOrder sortOrder = SortOrder.fromString(order);
        
        FieldSortBuilder sortByDate = queryParts.sortByDate(config, sortOrder);
        
        // this is where we assemble information about what we are interested in
        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .fetchSource(true)
            .trackTotalHits(true)
            .size(10)
            .query(indexQuery);
        
        
        Integer sort = null;
        
        try {
           sort = Integer.parseInt(sortField);
        } catch (Exception e) {
           //skip this as it just means we've been passed a field to sort on instead of one of our four constants
        }
        
        if (sort != null) {
           // do NOT change order of parameters! see method for details.
           if (sort == 0) {
                sourceBuilder.sort(sortByDate);
           }
        } else {
           
           // we've been given a field to sort on so we need to set that up now
           FieldSortBuilder fieldSort = new FieldSortBuilder(sortField).order(sortOrder);
           
           sourceBuilder.sort(fieldSort);
        }

        return sourceBuilder;
    }

    public SearchSourceBuilder generateTriggerCountAndTimeQueries(Dashboards.Config config, String from, String to, Map<String,Object> filter){

        List<User> users = filter == null ? null : config.getUsers((List<Integer>)filter.getOrDefault("users", null));

        QueryBuilder inReplyToHandle = queryParts.queryInReplyToUsers(config, users);
        QueryBuilder byTarget = queryParts.queryAuthoredByUsers(config, users);

        BoolQueryBuilder fullIndexRange = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to));

        FilterAggregationBuilder triggersAggregation =  AggregationBuilders.filter("in_reply_to", inReplyToHandle)
            .subAggregation(
                AggregationBuilders.terms("triggers")
                    .field(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword")
                    .size(65536)
                    .subAggregation(AggregationBuilders.terms("platform")
                          .field(config.getTweetPrefix()+"platform.keyword")
                          .size(1))
                    .subAggregation(AggregationBuilders.terms("user")
                          .field(config.getTweetPrefix()+"in_reply_to_screen_name.keyword")
                          .size(1))
                    .subAggregation(AggregationBuilders.terms("conversation")
                          .field(config.getTweetPrefix()+"conversation_id.keyword")
                          .size(1)));


        FilterAggregationBuilder timelineAggregation = AggregationBuilders.filter("by_target", byTarget)
            .subAggregation(
                AggregationBuilders.terms("timeline")
                    .field(config.getTweetPrefix() + "id_str.keyword")
                    .size(65536)
                    .subAggregation(AggregationBuilders.min("timeline").field(config.getTweetPrefix() + "created_at"))
            );


        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .trackTotalHits(true)
            .fetchSource(false)
            .size(0)
            .query(fullIndexRange)
            .aggregation(triggersAggregation)
            .aggregation(timelineAggregation);

        return sourceBuilder;
    }

    public SearchSourceBuilder generateTriggersQuery(Dashboards.Config config, String from, String to,
                                                     long replyThreshold, String query, Map<String,Object> filter){

        List<User> users = config.getUsers((List<Integer>)filter.getOrDefault("users", null));

        BoolQueryBuilder filteredIndexRangeQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to))
            .filter(
                QueryBuilders.boolQuery()
                    .filter(queryParts.queryTargetIsAddresseeOrHandle(config, users))
                    .filter(queryParts.queryInReplyToUsers(config, users))
                    .filter(queryParts.queryAbusiveTweets(config, users)) // this is new
                    .filter(queryParts.queryIsReplyToAnyTweet(config))
            );

        // THIS IS THE ONE THAT DETERMINES THE NUMBER OF RESULTS RETURNED
        TermsAggregationBuilder triggersAggregation = AggregationBuilders
            .terms("triggers")
            .field(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword")
            .size(65536)
            .subAggregation(AggregationBuilders.cardinality("accounts").field(config.getTweetPrefix()+"user.screen_name.keyword"));

        // this one is a simple count of tweet authors within the abusive replies set
        TermsAggregationBuilder authorsAggregation = AggregationBuilders
            .terms("authors")
            .field(config.getTweetPrefix() + "user.screen_name.keyword")
            .size(10)
            //.minDocCount(replyThreshold)
            .order(BucketOrder.count(false))
            .subAggregation(triggersAggregation)
            .subAggregation(AggregationBuilders.terms("platform").field(config.getTweetPrefix() + "platform.keyword"));

        TermsAggregationBuilder timelineAggregation = AggregationBuilders
            .terms("timeline")
            .field(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword")
            .size(65536)
            .subAggregation(AggregationBuilders.min("timeline").field(config.getTweetPrefix() + "created_at"));

        SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
            .trackTotalHits(true)
            .fetchSource(false)
            .size(0)
            .query(filteredIndexRangeQuery)
            .aggregation(triggersAggregation)
            .aggregation(timelineAggregation)
            .aggregation(authorsAggregation);


        return sourceBuilder;

    }

    public SearchSourceBuilder generateOverviewQuery(Dashboards.Config config, String from, String to,
                                                     boolean abusive, String query, Map<String,Object> filter){

        String topicFeature = config.getTopicThemeField();
        
        BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to));

        if (query != null && query.length() > 0) {
            indexQuery.filter(queryParts.processDashboardSearch(config, query));
        }

        indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));
        
        List<Dashboards.User> users = config.getUsers((List<Integer>)filter.getOrDefault("users", null));
        if (users == null) users = config.getUsers();


        FilterAggregationBuilder toMonitoredAccount = AggregationBuilders.filter("to_monitored",
            QueryBuilders.boolQuery()
                    .filter(queryParts.queryInReplyToUsers(config, users))
                    .filter(queryParts.queryIsReplyToAnyTweet(config)));


        // The second part of this should be an or to check if it is Twitter or that the field does not exist
        // so that on old indexes with just tweets we correctly pull the right set of data
        FilterAggregationBuilder uniqueTweetsAggreation = AggregationBuilders.filter("unique",
            QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "Twitter"));

        FilterAggregationBuilder uniqueTikTokAggreation = AggregationBuilders.filter("unique",
            QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "TikTok"));

        TermsAggregationBuilder hashtagAggregation = AggregationBuilders
            .terms("unique_hashtags")
            .field(config.getHashtagField())
            .size(25);

        DateHistogramAggregationBuilder platformTimeline = AggregationBuilders.dateHistogram("platform_timeline")
              .field(config.getTweetPrefix() + "created_at")
              .fixedInterval(DateHistogramInterval.DAY)
              .format("yyyy-MM-dd")
              .timeZone(ZoneId.of(config.getTimezone()))
              .minDocCount(0L)
              .extendedBounds(new LongBounds(from, to));
        
        TermsAggregationBuilder uniquePlatformAggregation = AggregationBuilders.terms("unique_platforms")
              .field(config.getTweetPrefix() + "platform.keyword").size(10000)
                    .subAggregation(platformTimeline).subAggregation(AggregationBuilders.terms("users")
                          .field(config.getTweetPrefix() + "user.screen_name.keyword"));
                   
        TermsAggregationBuilder languageAggregation = AggregationBuilders
            .terms("unique_languages")
            .field(config.getTweetPrefix() + "lang.keyword")
            .size(1000);
        
        TermsAggregationBuilder countriesTwitterAggregation = AggregationBuilders
              .terms("twitter_countries")
              .field(config.getTweetPrefix() + "place.country_code.keyword")
              .size(10000).order(BucketOrder.aggregation("unique", false))
              .subAggregation(uniqueTweetsAggreation);

        TermsAggregationBuilder countriesTikTokAggregation = AggregationBuilders
              .terms("tiktok_countries")
              .field(config.getTweetPrefix() + "place.country_code.keyword")
              .size(10000).order(BucketOrder.aggregation("unique", false))
              .subAggregation(uniqueTikTokAggreation);

        TermsAggregationBuilder sourcesAggregation = AggregationBuilders
              .terms("unique_sources")
              .field(config.getTweetPrefix() + "source.keyword")
              .size(1000);

        TermsAggregationBuilder mastodonAggregation = AggregationBuilders
              .terms("unique_mastodon_servers")
              .field(config.getTweetPrefix() + "mastodon_server.keyword")
              .size(1000);

        TermsAggregationBuilder topicAggregation = AggregationBuilders
            .terms("unique_topics")
            .field(topicFeature)
            .size(10000);

        TermsAggregationBuilder tweetKindAggregation = AggregationBuilders
            .terms("tweet_kind")
            .field("tweet_kind.keyword")
            .size(5);
        
        CardinalityAggregationBuilder tweetAuthorAggregation = 
                    AggregationBuilders.cardinality("tweet_authors")
                          .field(config.getTweetPrefix() + "user.screen_name.keyword");
        
        TermsAggregationBuilder offensiveSlurTerms = AggregationBuilders.terms("offensive_slur_terms")
              .field("entities.OffensiveSlurLookup.string")
              .size(20);
        
        SignificantTermsAggregationBuilder significantTerms = AggregationBuilders.significantTerms("significant_term_candidates")
              .field("entities.TermCandidate.canonical")
              .size(100)
              .includeExclude(new IncludeExclude(null, new String[] {"dig"}));
        
        SignificantTermsAggregationBuilder significantWords = AggregationBuilders.significantTerms("significant_content_words")
              .field("entities.ContentWord.string")
              .size(100)
              .includeExclude(new IncludeExclude(null, new String[] {"be","has","was","says","is","were","what","when","how","where"}));
        
        SearchSourceBuilder sourceBuilder =  new SearchSourceBuilder()
            .trackTotalHits(true).fetchSource(false).size(0)
            .query(indexQuery)
            .aggregation(hashtagAggregation)
            .aggregation(languageAggregation)
            .aggregation(topicAggregation)
            .aggregation(tweetKindAggregation)
            .aggregation(tweetAuthorAggregation)
            .aggregation(uniquePlatformAggregation)
            .aggregation(countriesTwitterAggregation)
            .aggregation(countriesTikTokAggregation)
            .aggregation(mastodonAggregation)
            .aggregation(offensiveSlurTerms)
            .aggregation(significantTerms)
            .aggregation(significantWords)
            .aggregation(sourcesAggregation)
            .aggregation(toMonitoredAccount);
        
        if (abusive) {
            // if we want an overview of just the abusive replies to the focus of the index
            // then build that horrible bit of query and add it as a filter
            List<Integer> restrictTo = (List<Integer>)filter.getOrDefault("users", null);

            indexQuery.filter(queryParts.queryAbusiveTweets(config,config.getUsers(restrictTo)));
            
            addAbusiveAggregations(sourceBuilder, config, from, to, filter);
        } else {
            addOverviewAggregations(config, sourceBuilder, from, to);
        }

        return  sourceBuilder;
    }
    
    public SearchSourceBuilder generateYouTubeRelevantToQuery(Dashboards.Config config, String from, String to,
          boolean abusive, String query, Map<String, Object> filter, User user) {

       BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
            .filter(queryParts.queryTweetsInRange(config, from, to))
            .filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "YouTube"));

       if (query != null && query.length() > 0) {
          indexQuery.filter(queryParts.processDashboardSearch(config, query));
       }

       indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));

       indexQuery.filter(queryParts.queryYouTubeRelevantToUser(config, user));

       if (abusive) {
          // if we want an overview of just the abusive replies to the focus of the index
          // then build that horrible bit of query and add it as a filter
          indexQuery.filter(queryParts.queryAbusiveTweets(config, Arrays.asList(user)));
       }

       FilterAggregationBuilder uniqueAggregation = AggregationBuilders.filter("unique",
             queryParts.queryTweetsInRange(config, from, to));
       
       DateHistogramAggregationBuilder organicTimeline = AggregationBuilders.dateHistogram("organic_timeline")
             .field(config.getTweetPrefix() + "created_at")
             .fixedInterval(DateHistogramInterval.DAY)
             .format("yyyy-MM-dd")
             .timeZone(ZoneId.of(config.getTimezone()))
             .minDocCount(0L)
             .extendedBounds(new LongBounds(from, to))
             .subAggregation(uniqueAggregation);

       SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(0)
             .query(indexQuery).aggregation(organicTimeline);

       return sourceBuilder;
    }
    
    public SearchSourceBuilder generateTweetsRelevantToQuery(Dashboards.Config config, String from, String to,
          boolean abusive, String query, Map<String, Object> filter, User user) {

       BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
             .filter(queryParts.queryTweetsInRange(config, from, to))
             .filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "Twitter"));

       if (query != null && query.length() > 0) {
          indexQuery.filter(queryParts.processDashboardSearch(config, query));
       }

       indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));

       indexQuery.filter(queryParts.queryTweetsRelevantToUser(config, user));

       if (abusive) {
          // if we want an overview of just the abusive replies to the focus of the index
          // then build that horrible bit of query and add it as a filter
          indexQuery.filter(queryParts.queryAbusiveTweets(config, Arrays.asList(user)));
       }
       
       DateHistogramAggregationBuilder organicTimeline = AggregationBuilders.dateHistogram("organic_timeline")
             .field(config.getTweetPrefix() + "created_at")
             .fixedInterval(DateHistogramInterval.DAY)
             .format("yyyy-MM-dd")
             .timeZone(ZoneId.of(config.getTimezone()))
             .minDocCount(0L)
             .extendedBounds(new LongBounds(from, to));

       SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(0)
             .query(indexQuery).aggregation(organicTimeline);

       return sourceBuilder;
    }
    
    public SearchSourceBuilder generateMastodonRelevantToQuery(Dashboards.Config config, String from, String to,
          boolean abusive, String query, Map<String, Object> filter, User user) {

       BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
             .filter(queryParts.queryTweetsInRange(config, from, to))
             .filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "Mastodon"));

       if (query != null && query.length() > 0) {
          indexQuery.filter(queryParts.processDashboardSearch(config, query));
       }

       indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));

       indexQuery.filter(queryParts.queryTweetsRelevantToUser(config, user));

       if (abusive) {
          // if we want an overview of just the abusive replies to the focus of the index
          // then build that horrible bit of query and add it as a filter
          indexQuery.filter(queryParts.queryAbusiveTweets(config, Arrays.asList(user)));
       }
       
       DateHistogramAggregationBuilder organicTimeline = AggregationBuilders.dateHistogram("organic_timeline")
             .field(config.getTweetPrefix() + "created_at")
             .fixedInterval(DateHistogramInterval.DAY)
             .format("yyyy-MM-dd")
             .timeZone(ZoneId.of(config.getTimezone()))
             .minDocCount(0L)
             .extendedBounds(new LongBounds(from, to));

       SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(0)
             .query(indexQuery).aggregation(organicTimeline);

       return sourceBuilder;
    }

    public SearchSourceBuilder generateFacebookRelevantToQuery(Dashboards.Config config, String from, String to,
          boolean abusive, String query, Map<String, Object> filter, User user) {

       BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
             .filter(queryParts.queryTweetsInRange(config, from, to))
             .filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "Facebook"));

       if (query != null && query.length() > 0) {
          indexQuery.filter(queryParts.processDashboardSearch(config, query));
       }

       indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));

       indexQuery.filter(queryParts.queryFacebookRelevantToUser(config, user));

       if (abusive) {
          // if we want an overview of just the abusive replies to the focus of the index
          // then build that horrible bit of query and add it as a filter
          indexQuery.filter(queryParts.queryAbusiveTweets(config, Arrays.asList(user)));
       }
       
       DateHistogramAggregationBuilder organicTimeline = AggregationBuilders.dateHistogram("organic_timeline")
             .field(config.getTweetPrefix() + "created_at")
             .fixedInterval(DateHistogramInterval.DAY)
             .format("yyyy-MM-dd")
             .timeZone(ZoneId.of(config.getTimezone()))
             .minDocCount(0L)
             .extendedBounds(new LongBounds(from, to));

       SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(0)
             .query(indexQuery).aggregation(organicTimeline);

       return sourceBuilder;
    }

    public SearchSourceBuilder generateOtherRelevantToQuery(Dashboards.Config config, String from, String to,
          boolean abusive, String query, Map<String, Object> filter, User user) {

       BoolQueryBuilder indexQuery = queryParts.queryEverythingRelevantToDashboard(config)
             .filter(queryParts.queryTweetsInRange(config, from, to))
             .filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", "other"));

       if (query != null && query.length() > 0) {
          indexQuery.filter(queryParts.processDashboardSearch(config, query));
       }

       indexQuery.filter(queryParts.processDashboardFilter(config, filter, abusive));

       indexQuery.filter(queryParts.queryOtherRelevantToUser(config, user));

       if (abusive) {
          // if we want an overview of just the abusive replies to the focus of the index
          // then build that horrible bit of query and add it as a filter
          indexQuery.filter(queryParts.queryAbusiveTweets(config, Arrays.asList(user)));
       }
       
       DateHistogramAggregationBuilder organicTimeline = AggregationBuilders.dateHistogram("organic_timeline")
             .field(config.getTweetPrefix() + "created_at")
             .fixedInterval(DateHistogramInterval.DAY)
             .format("yyyy-MM-dd")
             .timeZone(ZoneId.of(config.getTimezone()))
             .minDocCount(0L)
             .extendedBounds(new LongBounds(from, to));

       SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false).size(0)
             .query(indexQuery).aggregation(organicTimeline);

       return sourceBuilder;
    }
    
    private void addAbusiveAggregations(SearchSourceBuilder sourceBuilder, Dashboards.Config config,
                                                       String from, String to,
                                                       Map<String,Object> filter){

       NestedAggregationBuilder uniqueAbuseStringsAggregation = AggregationBuilders
             .nested("unique_abuse_strings", "entities.Abuse")
             .subAggregation(AggregationBuilders.filter("AbuseSource", queryParts.filterAbuseSource(filter))
                   .subAggregation(AggregationBuilders.terms("nested")
                         .field("entities.Abuse." + config.getAbuseStringFeature() + ".keyword").size(100)
                         .order(BucketOrder.aggregation("reverse", false)).subAggregation(
                               AggregationBuilders.reverseNested("reverse"))));

       NestedAggregationBuilder uniqueAbuseTypes = AggregationBuilders.nested("unique_abuse_types", "entities.Abuse")
             .subAggregation(AggregationBuilders.filter("AbuseSource", queryParts.filterAbuseSource(filter))
                   .subAggregation(AggregationBuilders.terms("nested").field("entities.Abuse.type.keyword").size(100)
                         .order(BucketOrder.aggregation("reverse", false)).subAggregation(
                               AggregationBuilders.reverseNested("reverse"))
                               
                               .subAggregation(AggregationBuilders.reverseNested("unnest").subAggregation(AggregationBuilders
                               .nested("all_abuse_types", "entities.Abuse")

                               .subAggregation(AggregationBuilders.terms("nested").field("entities.Abuse.type.keyword")
                                     .size(100).order(BucketOrder.aggregation("reverse", false))
                                     .subAggregation(AggregationBuilders.reverseNested("reverse")))))));

       // may need to do a separate query for these and just focus on the terms we've
       // found to save having to do such a huge aggregation
       NestedAggregationBuilder allAbuse = AggregationBuilders.nested("abuse", "entities.Abuse")
             .subAggregation(AggregationBuilders.filter("AbuseSource", queryParts.filterAbuseSource(filter))
                   .subAggregation(AggregationBuilders.terms("string")
                         .field("entities.Abuse." + config.getAbuseStringFeature() + ".keyword").size(1000)
                         .subAggregation(AggregationBuilders.terms("type").field("entities.Abuse.type.keyword"))));

       NestedAggregationBuilder uniqueAbuseTopics = AggregationBuilders.nested("unique_abuse_topics", "entities.Abuse")
             .subAggregation(AggregationBuilders.filter("AbuseSource", queryParts.filterAbuseSource(filter))
                   .subAggregation(AggregationBuilders.terms("nested")
                         .field("entities.Abuse." + config.getAbuseStringFeature() + ".keyword").size(20)
                         .order(BucketOrder.aggregation("reverse", false))
                         .subAggregation(AggregationBuilders.reverseNested("reverse")
                               .subAggregation(AggregationBuilders
                                     .terms("unique_topics").field(config.getTopicThemeField()).size(5)))));
        sourceBuilder
            .aggregation(uniqueAbuseStringsAggregation)
            .aggregation(uniqueAbuseTypes)
            .aggregation(allAbuse)
            .aggregation(uniqueAbuseTopics);
    }

    private void addOverviewAggregations(Dashboards.Config config, SearchSourceBuilder sourceBuilder,
                                         String from, String to){

        FilterAggregationBuilder tweetsByJournalist = (AggregationBuilders
            .filter("by_focus_unique", queryParts.queryAuthoredByUsers(config, config.getUsers()))
            .subAggregation(
                AggregationBuilders
                    .terms("tweet_kind")
                    .field("tweet_kind.keyword")
            )
        );

        sourceBuilder
            .aggregation(tweetsByJournalist);

    }

    private SearchSourceBuilder generateSortOrder(SearchSourceBuilder existingSearch,
                                                  FieldSortBuilder first, FieldSortBuilder second,
                                                  FieldSortBuilder third, FieldSortBuilder fourth){

        // the order is a bit weird but we basically ensure that (ignoring the date
        // field) each sort is either first (when that's what we are sorting on) or in a
        // fixed slot. For example, amplification is always in array position 1, if it's
        // not what we are sorting on. Same for replies (position 2) and favorites
        // (position 3). This makes getting the right sort value for display in the UI
        // nice and trivial.
        existingSearch.sort(first).sort(second).sort(third).sort(fourth);
        return  existingSearch;
    }
}
