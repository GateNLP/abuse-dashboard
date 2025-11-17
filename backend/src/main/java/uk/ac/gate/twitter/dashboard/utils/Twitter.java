package uk.ac.gate.twitter.dashboard.utils;

import static org.springframework.web.util.HtmlUtils.htmlUnescape;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Holds util methods for dealing with the JSON tweet format. These can be used
 * regardless of the source of the map, i.e. it doesn't need to have anything to
 * do with elasticsearch.
 */
@RestController
public class Twitter {

   @Value("${categories.field}")
   private String CATEGORY_FIELD;
   
   

   // Tue Oct 22 17:56:03 +0000
   private static DateTimeFormatter TWITTER_DATE_FORMAT = DateTimeFormatter.ofPattern("EEE MMM dd HH:mm:ss Z yyyy")
         .withZone(ZoneId.of("Z")).withLocale(Locale.ENGLISH);

   private static DateTimeFormatter DISPLAY_DATE_FORMAT;

   public static DateTimeFormatter DISPLAY_DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("h:mm a' · 'MMM d, yyyy");

   static {
      // https://stackoverflow.com/questions/4011075/how-do-you-format-the-day-of-the-month-to-say-11th-21st-or-23rd-ordinal/50369812#50369812
      Map<Long, String> ordinalNumbers = new HashMap<>(42);
      ordinalNumbers.put(1L, "1st");
      ordinalNumbers.put(2L, "2nd");
      ordinalNumbers.put(3L, "3rd");
      ordinalNumbers.put(21L, "21st");
      ordinalNumbers.put(22L, "22nd");
      ordinalNumbers.put(23L, "23rd");
      ordinalNumbers.put(31L, "31st");
      for (long d = 1; d <= 31; d++) {
         ordinalNumbers.putIfAbsent(d, "" + d + "th");
      }

      DISPLAY_DATE_FORMAT = new DateTimeFormatterBuilder().appendText(ChronoField.DAY_OF_MONTH, ordinalNumbers)
            .appendPattern(" MMMM yyyy").toFormatter(Locale.ENGLISH);
   }

   public static ZonedDateTime getZonedDateTime(String dateTime, ZoneId timezone) {
      ZonedDateTime createdAt = ZonedDateTime.parse(dateTime, TWITTER_DATE_FORMAT);

      createdAt = createdAt.withZoneSameInstant(timezone);

      return createdAt;
   }

   public static String formatZonedDateTime(ZonedDateTime dateTime) {
      return DISPLAY_DATE_FORMAT.format(dateTime);
   }

   /**
    * Takes a map structure representing a tweet and simplifies it to return just
    * the bits we are interested in.
    * 
    * @param tweet a Map holding the full tweet info
    * @return a Map containing the simplified tweet representation
    */
   public static Map<String, Object> simplifyTweet(Map<String, Object> tweet, Map<String, Object> source, ZoneId timezone,
         String... fields) {
      // a Map to hold the simplified version (we make sure the JSON version has the
      // keys in the same order to speed up visual inspection of the response during
      // development)
      Map<String, Object> result = new LinkedHashMap<String, Object>();

      ZonedDateTime createdAt = getZonedDateTime((String) tweet.get("created_at"), timezone);

      // we always want the ID, text, creation time, and the user object
      result.put("id", tweet.get("id_str"));
      result.put("text", htmlUnescape((String) source.get("text")));
      result.put("created_at_raw", tweet.get("created_at"));
      result.put("created_at", DISPLAY_DATE_FORMAT.format(createdAt));
      result.put("created_at_time", DISPLAY_DATE_TIME_FORMAT.format(createdAt));
      result.put("conversation_id", tweet.get("conversation_id"));
      result.put("lang", tweet.get("lang"));
      result.put("tweet_kind", source.get("tweet_kind"));
      
      result.put("platform", tweet.getOrDefault("platform","Twitter"));

      putIfExists("text_en", source, "text_en", result);
      putIfExists("compliance", source, "compliance", result);
      
      putIfExists("indicators", source, "indicators", result);

      putIfExists("source", tweet, "source", result);
      putIfExists("source_text", tweet, "source_text", result);

      Set<String> abuseTypes = getAbuseTypes(source);
      if (abuseTypes != null) result.put("abuseTypes", abuseTypes);

      if (result.containsKey("source")) {

         // We should probably NOT do this with a regex, but given the fixed
         // nature of the strings we get from Twitter it's safe to do this way

         Pattern p = Pattern.compile("href=\"(.*?)\"", Pattern.DOTALL);
         Matcher m = p.matcher((String)result.get("source"));

         if (m.find()) {
            String url = m.group(1);
            if (url.length()>0) {
               result.put("source_url", url);
            }
         }
      }

      Map<String,Object> user = simplifyUser((Map<String, Object>) tweet.get("user"),timezone);
      user.put("platform", result.get("platform"));
      
      result.put("user", user);

      // if they exist we also want the two stance labels (conversation and parent)
      // and the ID of the tweet being replied to
      // putIfExists("stance_classification_conversation", tweet,
      // "stance_conversation", result);
      // putIfExists("stance_classification_parent", tweet, "stance_parent", result);
      for (int i = 0; i < fields.length - 1; i = i + 2) {
         putIfExists(fields[i], source, fields[i + 1], result);
      }

      putIfExists("in_reply_to_status_id_str", tweet, "in_reply_to", result);
      putIfExists("in_reply_to_screen_name", tweet, "in_reply_to_screen_name", result);

      // we also add lists with the hashtags, urls, and images entities from the tweet.
      // NOTE: we use entities not extended_entities does this mean we are missing things at the ends of tweets
      result.put("hashtags", entitiesToList(getFromTweet(tweet, "entities", "hashtags"), "text"));
      result.put("urls", entitiesToList(getFromTweet(tweet, "entities", "urls"), "expanded_url"));
      
      result.put("images", entitiesToList(getFromTweet(tweet,"extended_entities","media"), "media_url_https","type","photo"));

      result.put("reply_count", tweet.get("reply_count"));

      // holds favourite, quote, retweet, reply
      long[] counts = new long[] { 0L, 0L, 0L, 0L };

      List<Map> retweets = (List<Map>) source.get("retweet");

      // TODO use a date restriction to calculate these
      for (Map retweet : retweets) {
         counts[0] = Math.max(counts[0], ((Number) retweet.getOrDefault("favorite_count", 0L)).longValue());
         counts[1] = Math.max(counts[1], ((Number) retweet.getOrDefault("quote_count", 0L)).longValue());
         counts[2] = Math.max(counts[2], ((Number) retweet.getOrDefault("retweet_count", 0L)).longValue());
         counts[3] = Math.max(counts[3], ((Number) retweet.getOrDefault("reply_count", 0L)).longValue());
      }

      result.put("favorite_count", counts[0]);
      result.put("quote_count", counts[1]);
      result.put("retweet_count", counts[2]);
      result.put("reply_count", counts[3]);
      
      return result;
   }

   public static Set<String> getAbuseTypes(Map<String,Object> source) {

      List<Map<String,Object>> abuseAnnotations = (List<Map<String,Object>>)((Map<String,Object>)source.get("entities")).get("Abuse");

      if (abuseAnnotations == null) return null;

      Set<String> abuseTypes = new HashSet<String>();

      for (Map<String,Object> annotation : abuseAnnotations) {
         Object at = annotation.get("type");
         if (at != null) 
            abuseTypes.add(at.toString());
      }

      return abuseTypes;
   }

   public static String stripURLs(String value) {
      // this uses the same regex as in the UI, which I think should cover most cases
      return value.replaceAll("http[^\\s]+", "").trim();
   }

   public static Map<String, Object> simplifyUser(Map<String, Object> user, ZoneId timezone) {
      Map<String, Object> result = new LinkedHashMap<String, Object>(user);

      if (result.containsKey("created_at")) {

         ZonedDateTime today = ZonedDateTime.now(timezone);

         ZonedDateTime userCreatedAt = getZonedDateTime((String) result.remove("created_at"), timezone);
         long age = ChronoUnit.DAYS.between(userCreatedAt, today);

         result.put("created_at", DISPLAY_DATE_FORMAT.format(userCreatedAt));
         result.put("account_age", age);

         if (user.containsKey("statuses_count")) {
            float average = ((Number) user.get("statuses_count")).floatValue() / age;
            result.put("tweets_per_day", average);
         }
      }

      return result;
   }

   /**
    * Simple method that copies an entry from one map to another if it exists,
    * renaming the key in the process
    */
   public static void putIfExists(String key, Map<String, Object> from, String newKey, Map<String, Object> to) {

      // horrible hack needed to deal with dynamic mapping
      if (key.endsWith(".keyword"))
         key = key.substring(0, key.length() - 8);

      if (from.containsKey(key))
         to.put(newKey, from.get(key));
   }

   /**
    * Converts a list of maps into a list by taking the value of one key from each
    * map
    */
   public static <E> List<E> entitiesToList(List<Map> entities, String key) {
      List<E> result = new ArrayList<E>();

      if (entities != null)
         entities.forEach(entity -> result.add((E) entity.get(key)));

      return result;
   }

   /**
    * Converts a list of maps into a list by taking the value of one key from each
    * map
    */
   public static <E> List<E> entitiesToList(List<Map> entities, String key, String test, String value) {
      List<E> result = new ArrayList<E>();

      if (entities != null)
         entities.forEach(entity -> {
            if (value.equals(entity.get(test)))
               result.add((E) entity.get(key));
         });
      return result;
   }
   

   /**
    * Gets a particular field out of the nested map structures, casting it
    * appropriately.
    */
   public static <T> T getFromTweet(Object tweet, String... fields) {
      for (String field : fields) {
         tweet = ((Map<String, Object>) tweet).getOrDefault(field, null);

         if (tweet == null)
            return null;
      }

      return (T) tweet;
   }

   public static Map<String, Object> getTweetFromSource(String prefix, Map<String, Object> source) {

      if (prefix.endsWith(".")) {
         prefix = prefix.substring(0, prefix.length() - 1);
      }

      if (prefix.equals(""))
         return source;

      if (prefix.indexOf('.') == -1) {
         Object obj = source.get(prefix);

         if (obj instanceof List)
            return (Map) ((List) obj).get(0);

         return (Map) obj;
      }

      String first = prefix.substring(0, prefix.indexOf('.'));
      String rest = prefix.substring(prefix.indexOf('.') + 1);

      Map next = (Map) source.get(first);

      return getTweetFromSource(rest, next);
   }

   private static final int NODE_ID_BITS = 10;
   private static final int SEQUENCE_BITS = 12;
   private static final int TIMESTAMP_BITS = NODE_ID_BITS + SEQUENCE_BITS;
   private static final long TWITTER_EPOCH = 1288834974657L;

   @GetMapping("/{dashboard}/tweetTime")
   public static Map<String, Object> tweetTime(@RequestParam(value = "id") long id) {

      Map<String, Object> decoded = new HashMap<String, Object>();

      long maskNodeId = ((1L << NODE_ID_BITS) - 1) << SEQUENCE_BITS;
      long maskSequence = (1L << SEQUENCE_BITS) - 1;

      long timestamp = getTweetTimeMillis(id);

      decoded.put("id", id);
      decoded.put("timestamp", timestamp);
      decoded.put("nodeId", (id & maskNodeId) >> SEQUENCE_BITS);
      decoded.put("sequence", id & maskSequence);

      decoded.put("created_at", ZonedDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneOffset.UTC));
      return decoded;
   }

   @GetMapping("/{dashboard}/tweetGap")
   public static Map<String, Object> snowflakeGap(@RequestParam(value = "id1") long id1,
         @RequestParam(value = "id2") long id2) {

      Map<String, Object> result = new HashMap<String, Object>();

      Map<String, Object> t1 = tweetTime(id1);
      Map<String, Object> t2 = tweetTime(id2);

      result.put("timeBetween", getTimeBetweenTweetsMillis(id1, id2));
      result.put("tweets", new Map[] { t1, t2 });

      return result;
   }

   /**
    * Determine the time of a tweet using only it's ID. This relies on the Twitter
    * snowflake algorithm which means the time the tweet was sent can be recovered
    * by a simple bit shift and then adding on the Twitter Eposch time
    */
   public static long getTweetTimeMillis(long id) {
      return (id >> TIMESTAMP_BITS) + TWITTER_EPOCH;
   }

   /**
    * This calculates the time between two tweets just using the IDs. This should
    * be faster than calculating the time for each tweet and then taking one from
    * the other as it doesn't need to use the Twitter epoch value.
    */
   public static long getTimeBetweenTweetsMillis(long id1, long id2) {

      long t1 = id1 >> TIMESTAMP_BITS;
      long t2 = id2 >> TIMESTAMP_BITS;

      return Math.abs(t1 - t2);
   }
}
