package uk.ac.gate.twitter.dashboard.utils;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.lucene.search.join.ScoreMode;
import org.elasticsearch.common.Strings;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.ExistsQueryBuilder;
import org.elasticsearch.index.query.MatchQueryBuilder;
import org.elasticsearch.index.query.NestedQueryBuilder;
import org.elasticsearch.index.query.Operator;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.index.query.RangeQueryBuilder;
import org.elasticsearch.index.query.TermQueryBuilder;
import org.elasticsearch.search.sort.FieldSortBuilder;
import org.elasticsearch.search.sort.NestedSortBuilder;
import org.elasticsearch.search.sort.SortMode;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.stereotype.Service;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.config.Dashboards.User;

@Service
public class QueryParts {

   /***********************************************************************
    * Instances of abusive tweets where the target is either addressee or the given
    * handle Note that this method doesn't check who the tweets are in reply to.
    **********************************************************************/
   public QueryBuilder queryTargetIsAddresseeOrHandle(String handle) {
      QueryBuilder targetAddressee = QueryBuilders.nestedQuery("entities.Abuse",
            QueryBuilders.boolQuery()
                .should(QueryBuilders.matchQuery("entities.Abuse.target.keyword", "addressee"))
                .should(QueryBuilders.matchQuery("entities.Abuse.target", handle)),
            ScoreMode.None);

      return targetAddressee;
   }

   public QueryBuilder queryTargetIsAddresseeOrHandle(Dashboards.Config config, List<User> users) {
      BoolQueryBuilder query = QueryBuilders.boolQuery()
            .should(QueryBuilders.matchQuery("entities.Abuse.target.keyword", "addressee"));

      for (User user : users) {
         String handle = user.getHandle();

         if (handle != null && !handle.equals(""))
            query.should(QueryBuilders.matchQuery("entities.Abuse.target", handle));
      }

      QueryBuilder targetAddressee = QueryBuilders.nestedQuery("entities.Abuse", query, ScoreMode.None);

      return targetAddressee;
   }

   /***********************************************************************
    * Instances of abusive tweets where the target is the given value. Note this
    * uses a phrase query so can match a multi-word expression such as a person's
    * name as well as a single term handle etc.
    * 
    **********************************************************************/
   public  QueryBuilder queryTargetIs(String... values) {

      BoolQueryBuilder shouldQuery = new BoolQueryBuilder();
      for (String value : values) {
         shouldQuery.should(QueryBuilders.matchPhraseQuery("entities.Abuse.target", value));
      }

      QueryBuilder targetIs = QueryBuilders.nestedQuery("entities.Abuse",
            shouldQuery, ScoreMode.None);
      return targetIs;
   }

   /***********************************************************************
    * Instances of abusive tweets where the target is addressee and the tweets are
    * in reply to the given handle
    ***********************************************************************/
   public  QueryBuilder queryTargetInReplyToAddressee(Dashboards.Config config, String handle) {

      NestedQueryBuilder targetAddressee = QueryBuilders.nestedQuery("entities.Abuse",
            QueryBuilders.boolQuery()
                .should(QueryBuilders.matchQuery("entities.Abuse.target.keyword", "addressee")),
            ScoreMode.None);

      BoolQueryBuilder inReplyToHandle = QueryBuilders.boolQuery().should(queryInReplyToHandle(config, handle));

      BoolQueryBuilder targetInReplyToHandle = QueryBuilders.boolQuery()
          .filter(targetAddressee)
          .filter(inReplyToHandle);

      return targetInReplyToHandle;
   }
   
   /**
    * Basically the same as inreplytoaddressee but for youtube not twitter
    * @param config
    * @param handle
    * @return
    */
   public  QueryBuilder queryTargetInReplyToQuery(Dashboards.Config config, List<String> names) {

      NestedQueryBuilder targetAddressee = QueryBuilders.nestedQuery("entities.Abuse",
            QueryBuilders.boolQuery()
                .should(QueryBuilders.matchQuery("entities.Abuse.target.keyword", "addressee")),
            ScoreMode.None);

      
      
      BoolQueryBuilder inReplyToQuery = QueryBuilders.boolQuery();
      
      for (String name : names)
         inReplyToQuery.should(QueryBuilders
            .matchQuery(config.getTweetPrefix() + "query.keyword", "\""+name+"\""));

      BoolQueryBuilder targetInReplyToHandle = QueryBuilders.boolQuery()
          .filter(targetAddressee)
          .filter(inReplyToQuery);

      return targetInReplyToHandle;
   }

   /***********************************************************************
    * Instances of tweets which are in reply to one of the accounts the
    * dashboard is monitoring, but are not by the account
    ***********************************************************************/
   public QueryBuilder queryInReplyToUsers(Dashboards.Config config, List<User> users) {
      BoolQueryBuilder query = QueryBuilders.boolQuery();

      for (User user : users) {
         String handle = user.getHandle();

         if (handle != null && !handle.equals("")) {
            query.should(queryInReplyToHandle(config, handle));
            query.mustNot(queryAuthoredByHandle(config,handle));
         }
      }

      return query;
   }

   /***********************************************************************
    * Instances of tweets in reply to the handle
    **********************************************************************/
   public  QueryBuilder queryInReplyToHandle(Dashboards.Config config, String handle) {
      QueryBuilder inReplyToHandle = QueryBuilders
            .matchQuery(config.getTweetPrefix() + "in_reply_to_screen_name.keyword", handle);
      return inReplyToHandle;
   }

   /***********************************************************************
    * Instances of tweets authored by one of the accounts the dashboard
    * is monitoring
    **********************************************************************/
   public QueryBuilder queryAuthoredByUsers(Dashboards.Config config, List<User> users) {
      BoolQueryBuilder query = QueryBuilders.boolQuery();

      for (User user : users) {
         String handle = user.getHandle();

         if (handle != null && !handle.equals(""))
            query.should(queryAuthoredByHandle(config, handle));
      }

      return query;
   }

   /***********************************************************************
    * Instances of tweets by handle
    **********************************************************************/
   public  QueryBuilder queryAuthoredByHandle(Dashboards.Config config, String handle) {
      QueryBuilder byHandle = QueryBuilders.matchQuery(config.getTweetPrefix() + "user.screen_name.keyword", handle);
      return byHandle;
   }

   /***********************************************************************
    * Instances of tweets which quote a tweet by handle
    **********************************************************************/
   public  QueryBuilder queryQuotesHandle(Dashboards.Config config, String handle) {
      QueryBuilder quotesHandle = QueryBuilders
            .matchQuery(config.getTweetPrefix() + "quoted_status.user.screen_name.keyword", handle);
      return quotesHandle;
   }

   /***********************************************************************
    * Select tweets that we would get from using the follow option in the
    * Twitter-Scripts filter.groovy. This is similar to following a handle in the
    * Twitter streaming API and will select tweets by the handle, in reply to the
    * handle, which quote a tweet by the handle.
    ***********************************************************************/
   public  QueryBuilder queryFollowHandle(Dashboards.Config config, String handle) {
      BoolQueryBuilder followHandle = QueryBuilders.boolQuery().should(queryAuthoredByHandle(config, handle))
            .should(queryInReplyToHandle(config, handle)).should(queryQuotesHandle(config, handle));
      return followHandle;
   }

   /***********************************************************************
    * Instances of tweet replies to another tweet
    **********************************************************************/
   public  QueryBuilder queryIsReplyToAnyTweet(Dashboards.Config config) {
      ExistsQueryBuilder inReplyToTweet = QueryBuilders
            .existsQuery(config.getTweetPrefix() + "in_reply_to_status_id_str");
      return inReplyToTweet;
   }

   /***********************************************************************
    * Instances of tweet replies to a specific tweet
    **********************************************************************/
   public  BoolQueryBuilder queryIsReplyToThisTweet(Dashboards.Config config, String id) {
      return QueryBuilders.boolQuery()
          .must(new MatchQueryBuilder(config.getTweetPrefix() + "in_reply_to_status_id_str.keyword", id));
   }

   /***********************************************************************
    * Instances of tweets between the given range
    **********************************************************************/
   public  QueryBuilder queryTweetsInRange(Dashboards.Config config, String fromDate, String toDate) {
      RangeQueryBuilder rangeQuery = QueryBuilders.rangeQuery(config.getTweetPrefix() + "created_at")
            .format("strict_date_optional_time")
            .from(fromDate + (fromDate.indexOf("now") == -1 ? "T00:00:00.000" : "")).to(toDate)
            .timeZone(config.getTimezone());
      return rangeQuery;
   }

   public  FieldSortBuilder sortByDate(Dashboards.Config config, SortOrder sortOrder) {
      FieldSortBuilder sortByDate = new FieldSortBuilder(config.getTweetPrefix() + "created_at").order(sortOrder);

      return sortByDate;
   }

   public QueryBuilder queryAbusiveTweets(Dashboards.Config config, List<User> users) {

      BoolQueryBuilder abusiveQuery = QueryBuilders.boolQuery();

      for (User user : users) {
         abusiveQuery.should(queryAbusiveTweets(config, user.getHandle(), user.getName()));
      }

      return abusiveQuery;
   }

   public  QueryBuilder queryAbusiveTweets(Dashboards.Config config, String handle, List<String> name) {

      // the query breaks down into three parts....
      BoolQueryBuilder abusiveQuery = QueryBuilders.boolQuery();

      if (handle != null && !handle.equals("")) {

         // 1. firstly we want to look for abuse targeted at the addressee where that is
         // the config of the index
         QueryBuilder targetInReplyToHandle = queryTargetInReplyToAddressee(config, handle);
         abusiveQuery.should(targetInReplyToHandle);
         
         // 2. where the abuse is targeted at the handle of the index config
         QueryBuilder targetHandle = queryTargetIs(handle);
         abusiveQuery.should(targetHandle);
      }

      if (name != null && name.size() > 0) {
         // 3. where the target of the abuse is the name of the index config
         QueryBuilder targetName = queryTargetIs(name.toArray(new String[]{}));
         abusiveQuery.should(targetName);
         
         QueryBuilder targetInRepltoQuery = queryTargetInReplyToQuery(config, name);
         abusiveQuery.should(targetInRepltoQuery);
      }

      return abusiveQuery;
   }
   
   public BoolQueryBuilder queryTweetsRelevantToUser(Dashboards.Config config, User user) {

      BoolQueryBuilder query = QueryBuilders.boolQuery();

      String handle = user.getHandle();

      if (handle != null) {
         query.should(queryFollowHandle(config, handle));

         query.should(QueryBuilders.matchQuery("text", handle));
         query.should(QueryBuilders.termQuery("entities.UserID.user.keyword", handle));
      }

      for (String name : user.getName())
         query.should(QueryBuilders.matchPhraseQuery("text", name));

      return QueryBuilders.boolQuery().filter(query);
   }

   public BoolQueryBuilder queryFacebookRelevantToUser(Dashboards.Config config, User user) {
      BoolQueryBuilder query = QueryBuilders.boolQuery();

      String handle = user.getHandle();

      query.should(QueryBuilders.termQuery(config.getTweetPrefix()+"in_reply_to_screen_name.keyword", handle));

      return QueryBuilders.boolQuery().filter(query); 
   }
   
   public QueryBuilder queryYouTubeRelevantToUser(Dashboards.Config config, User user) {

      String name = user.getName().get(0);
      BoolQueryBuilder query = QueryBuilders.boolQuery();

      query.should(QueryBuilders.termsQuery(config.getTweetPrefix()+"query.keyword", new String[]{"\""+name+"\"",name, "\""+name+",\""}));
      
      return QueryBuilders.boolQuery().filter(query); 
   }
   
   public QueryBuilder queryOtherRelevantToUser(Dashboards.Config config, User user) {

      //String name = user.getName();
      BoolQueryBuilder query = QueryBuilders.boolQuery();

      query.should(QueryBuilders.termsQuery("related_to.keyword", new String[]{user.getHandle()}));
      
      return QueryBuilders.boolQuery().filter(query); 
   }

   public BoolQueryBuilder queryEverythingRelevantToDashboard(Dashboards.Config config) {

      if (config.getDedicatedIndex())
         return QueryBuilders.boolQuery();

      BoolQueryBuilder query = QueryBuilders.boolQuery();

      for (User user : config.getUsers()) {

         switch (user.getPlatform()) {
            case "Twitter":
            case "Mastodon":
               query.should(queryTweetsRelevantToUser(config, user));
               break;
            case "YouTube":
               query.should(queryYouTubeRelevantToUser(config, user));
               break;
            case "Facebook":
               query.should(queryFacebookRelevantToUser(config, user));
               break;
            default:
               // this makes sure we get the same behaviour as before on things
               // we don't have a method for as yet
               query.should(queryTweetsRelevantToUser(config, user));
         }
      }

      return QueryBuilders.boolQuery().filter(query);
   }

   public QueryBuilder queryTweetsWithCompliance(Dashboards.Config config) {
      return QueryBuilders.existsQuery(config.getCompliance().getReasonField());
   }

   public QueryBuilder queryTweetsWithoutCompliance(Dashboards.Config config) {
      return QueryBuilders.boolQuery().mustNot(queryTweetsWithCompliance(config));
   }

   public QueryBuilder queryYouTubeCommentsWithoutDate(Dashboards.Config config) {
      return QueryBuilders.boolQuery().mustNot(QueryBuilders.existsQuery(config.getTweetPrefix() + "created_at"))
            .filter(QueryBuilders.termQuery("tweet_kind.keyword", "reply"))
            .filter(QueryBuilders.termQuery(config.getTweetPrefix() + "platform.keyword", "YouTube"));
   }

   public QueryBuilder queryYouTubeVideosWithoutDate(Dashboards.Config config) {
      return QueryBuilders.boolQuery().mustNot(QueryBuilders.existsQuery(config.getTweetPrefix() + "created_at"))
            .filter(QueryBuilders.termQuery("tweet_kind.keyword", "original"))
            .filter(QueryBuilders.termQuery(config.getTweetPrefix() + "platform.keyword", "YouTube"));
   }
   
   public QueryBuilder queryPostsInNeedOfTranslation(Dashboards.Config config) {
      return QueryBuilders.boolQuery().mustNot(QueryBuilders.existsQuery("translation_processed")).
            must(QueryBuilders.existsQuery("text_en"));
   }

   public QueryBuilder processDashboardFilter(Dashboards.Config config, Map<String, Object> filter, boolean abusive) {

      BoolQueryBuilder filterQuery = QueryBuilders.boolQuery();

      List<String> hashtags = (List<String>) filter.getOrDefault("hashtags", null);
      if (hashtags != null && hashtags.size() > 0) {
         // TODO We need to ensure they are all lowercase and starting with a #
         // we do the first part on the frontend currently
         filterQuery.filter(QueryBuilders.termsQuery(config.getHashtagField(), hashtags));
      }

      List<String> authors = (List<String>) filter.getOrDefault("authors", null);
      if (authors != null && authors.size() > 0) {

         // if the entry starts with a @ we have to strip it off
         for (int i = 0 ; i < authors.size(); ++i) {
            String author = authors.get(i);
            if (author.charAt(0) == '@') {
               authors.set(i, author.substring(1));
            }
         }

         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix() + "user.screen_name.keyword", authors));
      }

      List<String> inReplyTo = (List<String>) filter.getOrDefault("inReplyTo", null);
      if (inReplyTo != null && inReplyTo.size() > 0) {

         // if the entry starts with a @ we have to strip it off
         for (int i = 0 ; i < inReplyTo.size(); ++i) {
            String account = inReplyTo.get(i);
            if (account.charAt(0) == '@') {
               inReplyTo.set(i, account.substring(1));
            }
         }

         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix() + "in_reply_to_screen_name.keyword", inReplyTo));
      }

      List<String> languages = (List<String>)filter.getOrDefault("languages", null);
      if (languages != null && languages.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix()+"lang.keyword", languages));
      }

      List<String> countries = (List<String>)filter.getOrDefault("countries", null);
      if (countries != null && countries.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix() + "place.country_code.keyword", countries));
      }

      List<String> accountTypes = (List<String>)filter.getOrDefault("accountTypes", null);
      if (accountTypes != null && accountTypes.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix() + "user.verified_type.keyword", accountTypes));
      }
      
      Map<String,Object> abuseTypes =
        (Map<String,Object>)filter.getOrDefault("abuseTypes", null);
      if(abuseTypes != null) {
         
         List<String> abuseTerms = (List<String>)abuseTypes.getOrDefault("terms", null);

         if (abuseTerms != null && abuseTerms.size() > 0) {

            String mode = (String)abuseTypes.getOrDefault("mode", "any");

            if ("any".equals(mode)) {
               // this is a hack to deal with the fact we want only sexist or sexual, but the app still
               // contains a few of both.
            
               if (abuseTerms.contains("sexist")) abuseTerms.add("sexual");

                  

               filterQuery.filter(QueryBuilders.nestedQuery("entities.Abuse",
                  QueryBuilders.termsQuery("entities.Abuse.type.keyword", abuseTerms),
                  ScoreMode.None));
            } else if ("all".equals(mode)) {

               for (String type : abuseTerms) {
                  if (type.equals("sexist")) {
                     // this is the hacky bit
                     filterQuery.filter(QueryBuilders.nestedQuery("entities.Abuse",
                        QueryBuilders.termsQuery("entities.Abuse.type.keyword", new String[]{"sexist", "sexual"}),
                        ScoreMode.None));
                  } else {
                     // this is the normal bit

                     filterQuery.filter(QueryBuilders.nestedQuery("entities.Abuse",
                        QueryBuilders.termQuery("entities.Abuse.type.keyword", type),
                        ScoreMode.None));
                  }

               }
            }
         }
      }

      List<String> topics = (List<String>)filter.getOrDefault("topics", null);
      if (topics != null && topics.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTopicThemeField(), topics));
      }

      List<String> mentions = (List<String>) filter.getOrDefault("mentions", null);
      if (mentions != null && mentions.size() > 0) {

         // if the entry starts with a @ we have to strip it off
         for (int i = 0 ; i < mentions.size(); ++i) {
            String mention = mentions.get(i);
            if (mention.charAt(0) == '@') {
               mentions.set(i, mention.substring(1));
            }
         }

         // we could use entities.Tweet.entities.user_mentions.screen_name here instead
         // but that would only get us the mentions in the original tweet and not any
         // quote tweet we've appended to the end.

         // normally we match against the keyword field, but in this case we don't as we lower
         // case the usernames in the UI. This is because we see lots of examples of the username
         // being in a non-canonical case within the body of a post and this means we match them
         // all. This is less of an issue when matching authors as that field is always correct
         // although it does mean the case has to be correct in the UI when searching authors
         // but not when searching mentions which is a little odd.
         filterQuery.filter(QueryBuilders.termsQuery("entities.UserID.string", mentions));
      }
      
      List<String> platforms = (List<String>)filter.getOrDefault("platforms", null);
      if (platforms != null && platforms.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix()+"platform.keyword", platforms));
      }
      
      List<Integer> restrictTo = (List<Integer>)filter.getOrDefault("users", null);
      if (restrictTo != null && restrictTo.size() > 0) {

         BoolQueryBuilder usersQuery = QueryBuilders.boolQuery();

         for (int i : restrictTo) {
            User user = config.getUsers().get(i);

            BoolQueryBuilder userQuery = QueryBuilders.boolQuery();

            userQuery.filter(QueryBuilders.termQuery(config.getTweetPrefix()+"platform.keyword", user.getPlatform()));

            if (user.getPlatform().equals("Twitter")) {
               userQuery.filter(queryTweetsRelevantToUser(config, user));
            } else if (user.getPlatform().equals("YouTube")) {
               userQuery.filter(queryYouTubeRelevantToUser(config, user));
            } else if (user.getPlatform().equals("Mastodon")) {
               // this is the same as the twitter one but will have the different platform restriction
               userQuery.filter(queryTweetsRelevantToUser(config, user));
            } else if (user.getPlatform().equals("Facebook")) {
               userQuery.filter(queryFacebookRelevantToUser(config, user));
            }

            usersQuery.should(userQuery);
         }

         filterQuery.filter(usersQuery);
      }

      List<String> sources = (List<String>)filter.getOrDefault("sources", null);
      if (sources != null && sources.size() > 0) {
         filterQuery.filter(QueryBuilders.termsQuery(config.getTweetPrefix()+"source.keyword", sources));

      }

      if (abusive) {
         String abuseFrom = (String) filter.getOrDefault("abuseFrom", "both");
         if (!abuseFrom.equals("both")) {

            QueryBuilder termQuery = QueryBuilders.termQuery("entities.Abuse.from.keyword", abuseFrom);

            if (abuseFrom.equals("translation")) {
               filterQuery.filter(QueryBuilders.nestedQuery("entities.Abuse", termQuery, ScoreMode.None));
            } else {
               BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
               boolQuery.should(QueryBuilders.boolQuery().mustNot(QueryBuilders.existsQuery("entities.Abuse.from.keyword")));
               boolQuery.should(termQuery);

               filterQuery.filter(QueryBuilders.nestedQuery("entities.Abuse", boolQuery, ScoreMode.None));
            }
         }
      }

      return filterQuery;
   }
   
   public QueryBuilder filterAbuseSource(Map<String,Object> filter) {
      String abuseFrom = (String) filter.getOrDefault("abuseFrom", "both");

      if (abuseFrom.equals("both"))
            return QueryBuilders.matchAllQuery();

      TermQueryBuilder termQuery = QueryBuilders.termQuery("entities.Abuse.from.keyword", abuseFrom);

      if (abuseFrom.equals("translation"))
         return termQuery;

      BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
      boolQuery.should(QueryBuilders.boolQuery().mustNot(QueryBuilders.existsQuery("entities.Abuse.from.keyword")));
      boolQuery.should(termQuery);

      return boolQuery;
   }

   public  QueryBuilder processDashboardSearch(Dashboards.Config config, String query) {

      Set<String> types = new HashSet<String>();

      Pattern p = Pattern.compile("abuse:([a-z_]+)");
      Matcher m = p.matcher(query);
      StringBuffer sb = new StringBuffer();
      while (m.find()) {
         m.appendReplacement(sb, "");
         types.add(m.group(1));
      }
      m.appendTail(sb);

      query = sb.toString().trim();

      if (config.getHashtagField().indexOf(':') != -1)
         // this is a nasty hack for the Arabic dashboard where things come from multiple
         // annotation sets. Not sure where I couldn't managed to do this correctly via
         // the config settings though
         query = query.replaceAll("#", "entities.original\\\\:Hashtag.string.keyword:#");
      else
         query = query.replaceAll("#", config.getHashtagField() + ":#");

      query = query.replaceAll("author:", config.getTweetPrefix() + "user.screen_name:");
      query = query.replaceAll("replyTo:", config.getTweetPrefix() + "in_reply_to_screen_name:");

      QueryBuilder fullQuery = null;

      if (query.length() > 0) {
         fullQuery = QueryBuilders.queryStringQuery(query).defaultField("text").defaultOperator(Operator.OR);
      }

      if (types.size() > 0) {
         // build the nested query

         String typeQuery = Strings.collectionToDelimitedString(types, " ");

         NestedQueryBuilder abuseQuery = QueryBuilders.nestedQuery("entities.Abuse", QueryBuilders
               .queryStringQuery(typeQuery).defaultField("entities.Abuse.type").defaultOperator(Operator.OR),
               ScoreMode.None);

         if (fullQuery == null)
            // if fullQuery is null then use nested query
            fullQuery = abuseQuery;
         else {
            // else build an OR between the two parts and use that
            fullQuery = QueryBuilders.boolQuery().should(abuseQuery).should(fullQuery);
         }

      }

      return fullQuery;

   }
}
