package uk.ac.gate.twitter.dashboard.queries;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.MultiMatchQueryBuilder.Type;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.index.query.RangeQueryBuilder;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.PipelineAggregationBuilder;
import org.elasticsearch.search.aggregations.PipelineAggregatorBuilders;
import org.elasticsearch.search.aggregations.bucket.filter.FilterAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import org.elasticsearch.search.aggregations.bucket.nested.NestedAggregationBuilder;
import org.elasticsearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.elasticsearch.search.aggregations.pipeline.ExtendedStatsBucketPipelineAggregationBuilder;
import org.elasticsearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.utils.QueryParts;

@Service
public class AlertsQueries {

      @Autowired
      QueryParts queryParts;

      private void addQueryAggregations(SearchSourceBuilder sourceBuilder, Dashboards.Config config, boolean abusive) {

            TermsAggregationBuilder users = AggregationBuilders.terms("users")
                        .field(config.getTweetPrefix() + "user.id_str.keyword").size(10)
                        .subAggregation(
                                    AggregationBuilders.terms("platform")
                                                .field(config.getTweetPrefix() + "platform.keyword").size(1))
                        .subAggregation(AggregationBuilders.terms("screen_name")
                                    .field(config.getTweetPrefix() + "user.screen_name.keyword").size(1));

            TermsAggregationBuilder hashtags = AggregationBuilders.terms("hashtags")
                        .field(config.getHashtagField()).size(10).minDocCount(2);

            TermsAggregationBuilder countries = AggregationBuilders
                        .terms("countries")
                        .field(config.getTweetPrefix() + "place.country_code.keyword")
                        .size(10);

            TermsAggregationBuilder affilatedWith = AggregationBuilders.terms("affiliatedWith")
                        .field(config.getTweetPrefix() + "user.affiliated_with.url.url.keyword").size(10)
                        .subAggregation(AggregationBuilders.terms("badge")
                                    .field(config.getTweetPrefix() + "user.affiliated_with.badge.url.keyword").size(1))
                        .subAggregation(AggregationBuilders.terms("description")
                                    .field(config.getTweetPrefix() + "user.affiliated_with.description.keyword")
                                    .size(1));

            NestedAggregationBuilder misogynistic = AggregationBuilders.nested("nested", "entities.Abuse")
                        .subAggregation(AggregationBuilders.filter("misogynistic",
                                    QueryBuilders.termsQuery("entities.Abuse.type.keyword", "sexist", "sexual",
                                                "gendered reputation"))
                                    .subAggregation(AggregationBuilders.reverseNested("reverse")));

            sourceBuilder.aggregation(AggregationBuilders
                        .terms("verified_type")
                        .field(config.getTweetPrefix() + "user.verified_type.keyword"))

                        // TODO this should probably use entities.Abuse.threat.keyword instead but this
                        // is
                        // nested to more complex, will probably re-work this at a later date
                        .aggregation(AggregationBuilders.filter("threats",
                                    QueryBuilders.termsQuery("entities.OffensiveLookup.threat.keyword", "death",
                                                "rape")))
                        .aggregation(users)
                        .aggregation(hashtags)
                        .aggregation(countries)
                        .aggregation(misogynistic)
                        .aggregation(affilatedWith);

            // TODO we don't need to do either of these if calculating watched items
            if (abusive) {
                  // TODO add an aggregation that get's only the first abusive reply to posts by the monitored accounts
                  // so we can get the timestamp of each one

                  QueryBuilder inReplyTo = queryParts.queryInReplyToUsers(config, config.getUsers());

                  FilterAggregationBuilder timelineAggregation = AggregationBuilders.filter("in_reply_to", inReplyTo)
                              .subAggregation(AggregationBuilders
                                          .terms("timeline")
                                          .field(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword")
                                          .size(10000)
                                          .subAggregation(AggregationBuilders.min("timeline")
                                                      .field(config.getTweetPrefix() + "created_at")));

                  sourceBuilder.aggregation(timelineAggregation);
      
            } else {
                  // in here we need to get the time of all the posts made by the monitored accounts over the last week
                  QueryBuilder byTarget = queryParts.queryAuthoredByUsers(config, config.getUsers());

                  FilterAggregationBuilder timelineAggregation = AggregationBuilders.filter("by_target", byTarget)
                  .subAggregation(
                      AggregationBuilders.terms("timeline")
                          .field(config.getTweetPrefix() + "id_str.keyword")
                          .size(10000)
                          .subAggregation(AggregationBuilders.min("timeline").field(config.getTweetPrefix() + "created_at"))
                  );

                  sourceBuilder.aggregation(timelineAggregation);
            }

      }

      private void addHistogramQueryAggregations(SearchSourceBuilder sourceBuilder, Dashboards.Config config, boolean abusive,
                  Collection<String> users, Collection<String> hashtags, Collection<String> countries, Collection<String> affilatedWith) {
            FilterAggregationBuilder government = AggregationBuilders.filter("Government",
                        QueryBuilders.termQuery(config.getTweetPrefix() + "user.verified_type.keyword", "Government"));

            FilterAggregationBuilder business = AggregationBuilders.filter("Business",
                        QueryBuilders.termQuery(config.getTweetPrefix() + "user.verified_type.keyword", "Business"));

            // TODO should this be a nested query looking at entities.Abuse.threat.keyword
            // probably. Doing it this way for now to get something into the dashboard
            // will re-wolrk at a later date.
            FilterAggregationBuilder threats = AggregationBuilders.filter("threats",
                        QueryBuilders.termsQuery("entities.OffensiveLookup.threat.keyword", "death", "rape"));

            NestedAggregationBuilder misogynistic = AggregationBuilders.nested("nested", "entities.Abuse")
                        .subAggregation(AggregationBuilders.filter("misogynistic",
                                    QueryBuilders.termsQuery("entities.Abuse.type.keyword", "sexist", "sexual",
                                                "gendered reputation"))
                                    .subAggregation(AggregationBuilders.reverseNested("reverse")));

            DateHistogramAggregationBuilder timeline = AggregationBuilders.dateHistogram("timeline")
                        .field(config.getTweetPrefix() + "created_at").calendarInterval(DateHistogramInterval.WEEK)
                        .timeZone(ZoneId.of(config.getTimezone())).minDocCount(0L).subAggregation(government)
                        .subAggregation(business).subAggregation(threats).subAggregation(misogynistic);

            // TODO we don't need to do either of these if calculating watched items
            if (abusive) {
                  // TODO add an aggregation that get's only the first abusive reply to posts by the monitored accounts
                  // so we can get the timestamp of each one
                  QueryBuilder inReplyTo = queryParts.queryInReplyToUsers(config, config.getUsers());

                  FilterAggregationBuilder timelineAggregation = AggregationBuilders.filter("in_reply_to", inReplyTo)
                              .subAggregation(AggregationBuilders
                                          .terms("timeline")
                                          .field(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword")
                                          .size(10000)
                                          .subAggregation(AggregationBuilders.min("timeline")
                                                      .field(config.getTweetPrefix() + "created_at")));

                  timeline.subAggregation(timelineAggregation);
      
            } else {
                  // in here we need to get the time of all the posts made by the monitored accounts over the last week
                  QueryBuilder byTarget = queryParts.queryAuthoredByUsers(config, config.getUsers());

                  FilterAggregationBuilder timelineAggregation = AggregationBuilders.filter("by_target", byTarget)
                  .subAggregation(
                        AggregationBuilders.terms("timeline")
                              .field(config.getTweetPrefix() + "id_str.keyword")
                              .size(10000)
                              .subAggregation(AggregationBuilders.min("timeline").field(config.getTweetPrefix() + "created_at"))
                  );

                  timeline.subAggregation(timelineAggregation);
            }

            for (String user : users) {
                  timeline.subAggregation(AggregationBuilders.filter(user,
                              QueryBuilders.termQuery(config.getTweetPrefix() + "user.id_str.keyword", user)));
            }

            for (String hashtag : hashtags) {
                  timeline.subAggregation(AggregationBuilders.filter(hashtag,
                              QueryBuilders.termQuery(config.getHashtagField(), hashtag)));
            }

            for (String country : countries) {
                  timeline.subAggregation(AggregationBuilders.filter(country,
                              QueryBuilders.termQuery(config.getTweetPrefix() + "place.country_code.keyword",
                                          country)));
            }

            for (String affiliate : affilatedWith) {
                  timeline.subAggregation(AggregationBuilders.filter(affiliate,
                              QueryBuilders.termQuery(config.getTweetPrefix() + "user.affiliated_with.url.url.keyword",
                                          affiliate)));
            }

            ExtendedStatsBucketPipelineAggregationBuilder statsAll = PipelineAggregatorBuilders.extendedStatsBucket(
                        "stats",
                        "timeline._count");

            ExtendedStatsBucketPipelineAggregationBuilder statsGovernment = PipelineAggregatorBuilders
                        .extendedStatsBucket("Government", "timeline>Government._count");

            ExtendedStatsBucketPipelineAggregationBuilder statsBusiness = PipelineAggregatorBuilders
                        .extendedStatsBucket("Business", "timeline>Business._count");

            ExtendedStatsBucketPipelineAggregationBuilder statsThreats = PipelineAggregatorBuilders
                        .extendedStatsBucket("threats", "timeline>threats._count");

            ExtendedStatsBucketPipelineAggregationBuilder statsMisogynistic = PipelineAggregatorBuilders
                        .extendedStatsBucket("misogynistic", "timeline>nested>misogynistic>reverse._count");

            sourceBuilder.aggregation(timeline).aggregation(statsAll).aggregation(statsGovernment)
                        .aggregation(statsBusiness).aggregation(statsThreats).aggregation(statsMisogynistic);

            for (String user : users) {
                  sourceBuilder.aggregation(PipelineAggregatorBuilders
                              .extendedStatsBucket(user, "timeline>" + user + "._count"));
            }

            for (String hashtag : hashtags) {
                  sourceBuilder.aggregation(PipelineAggregatorBuilders
                              .extendedStatsBucket(hashtag, "timeline>" + hashtag + "._count"));
            }

            for (String country : countries) {
                  sourceBuilder.aggregation(PipelineAggregatorBuilders
                              .extendedStatsBucket(country, "timeline>" + country + "._count"));
            }

            for (String affiliate : affilatedWith) {
                  sourceBuilder.aggregation(PipelineAggregatorBuilders
                              .extendedStatsBucket(affiliate, "timeline>" + affiliate + "._count"));
            }

      }

      public SearchSourceBuilder generateHistogramStatsQuery(Dashboards.Config config, boolean abusive,
                  Collection<String> users, Collection<String> hashtags, Collection<String> countries, Collection<String> affiliatedWith) {

            RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at")
                        .from("now-9w")
                        .to("now-1w").timeZone(config.getTimezone());

            BoolQueryBuilder postsQuery = queryParts.queryEverythingRelevantToDashboard(config).filter(rangeQuery);

            if (abusive) {
                  postsQuery.filter(queryParts.queryAbusiveTweets(config, config.getUsers()));
            }

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false)
                        .size(0)
                        .query(postsQuery);

            addHistogramQueryAggregations(sourceBuilder, config, abusive, users, hashtags, countries, affiliatedWith);

            return sourceBuilder;
      }

      public SearchSourceBuilder generateStatsQuery(Dashboards.Config config, boolean abusive) {
            RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at")
                        .from("now-1w")
                        .to("now").timeZone(config.getTimezone());

            BoolQueryBuilder postsQuery = queryParts.queryEverythingRelevantToDashboard(config).filter(rangeQuery);

            if (abusive) {
                  postsQuery.filter(queryParts.queryAbusiveTweets(config, config.getUsers()));
            }

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder()
                        .trackTotalHits(true).fetchSource(false).size(0).query(postsQuery);

            addQueryAggregations(sourceBuilder, config, abusive);

            return sourceBuilder;
      }

      public SearchSourceBuilder generateWatchedStatsQuery(Dashboards.Config config, Map<String, Object> watched) {
            RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at")
                        .from("now-1w")
                        .to("now").timeZone(config.getTimezone());

            BoolQueryBuilder postsQuery = queryParts.queryEverythingRelevantToDashboard(config).filter(rangeQuery);

            BoolQueryBuilder watchedQuery = QueryBuilders.boolQuery();

            for (String term : (List<String>) watched.getOrDefault("terms", new ArrayList<String>())) {
                  watchedQuery.should(QueryBuilders.multiMatchQuery(term, "text", "text_en").type(Type.PHRASE));
            }

            List<String> whashtags = (List<String>) watched.get("hashtags");
            if (whashtags != null && !whashtags.isEmpty())
                  watchedQuery.should(QueryBuilders.termsQuery(config.getHashtagField(), whashtags));

            postsQuery.filter(watchedQuery);

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false)
                        .size(0)
                        .query(postsQuery);

            addQueryAggregations(sourceBuilder, config, false);

            return sourceBuilder;
      }

      public SearchSourceBuilder generateWatchedHistogramStatsQuery(Dashboards.Config config,
                  Map<String, Object> watched, Collection<String> users, Collection<String> hashtags,
                  Collection<String> countries, Collection<String> affiliatedWith) {

            RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at")
                        .from("now-9w")
                        .to("now-1w").timeZone(config.getTimezone());

            BoolQueryBuilder postsQuery = queryParts.queryEverythingRelevantToDashboard(config).filter(rangeQuery);

            BoolQueryBuilder watchedQuery = QueryBuilders.boolQuery();

            for (String term : (List<String>) watched.getOrDefault("terms", new ArrayList<String>())) {
                  watchedQuery.should(QueryBuilders.multiMatchQuery(term, "text", "text_en").type(Type.PHRASE));
            }

            List<String> whashtags = (List<String>) watched.get("hashtags");
            if (whashtags != null && !whashtags.isEmpty())
                  watchedQuery.should(QueryBuilders.termsQuery(config.getHashtagField(), whashtags));

            postsQuery.filter(watchedQuery);

            SearchSourceBuilder sourceBuilder = new SearchSourceBuilder().trackTotalHits(true).fetchSource(false)
                        .size(0)
                        .query(postsQuery);

            addHistogramQueryAggregations(sourceBuilder, config, false, users, hashtags, countries, affiliatedWith);

            return sourceBuilder;
      }
}
