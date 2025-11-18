package uk.ac.gate.twitter.dashboard.config;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;

@Component
@ConfigurationProperties
@RestController
@Data
public class Dashboards {

   private Map<String, Config> dashboards;

   private Map<String,String> colours;

   private String rootURL;
   
   public Config get(String id) {

      return dashboards.get(id);
   }

   public Set<String> getIds() {
      return dashboards.keySet();
   }

   @GetMapping("/dashboards")
   public List<Map<String, Object>> getDashboards() {
      List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();

      for (Map.Entry<String, Config> dashboard : dashboards.entrySet()) {
         Config config = dashboard.getValue();
         
         Map<String, Object> data = new HashMap<String, Object>();
         data.put("path", dashboard.getKey());
         data.put("name", config.getTitle());
         data.put("description", config.getDescription());
         data.put("image", config.getImage());
         data.put("hidden", config.getHidden());
         data.put("platforms", config.getPlatforms());
         result.add(data);
      }

      return result;
   }

   @Data
   public static class Config {

      private List<User> users;

      private PartnerInformation partner = null;

      private Boolean alertTriggered;

      public List<User> getUsers(List<Integer> restrictTo) {
         if (restrictTo == null || restrictTo.size() == 0) return users;

         List<User> selected = new ArrayList<User>();
         for (int i : restrictTo) {
            selected.add(users.get(i));
         }

         return selected;
      }
      
      private List<Map<String,Object>> events;

      private Map<String,List<String>> abuseHierarchy;
      
      @Deprecated
      public String getHandle() {
         return users.get(0).getHandle();
      }

      public List<String> getAllHandles() {
         List<String> handles = new ArrayList<String>();
         
         for (User user : users) {
            String handle = user.getHandle();

            if (handle != null && !handle.equals(""))
               handles.add(user.getHandle());
         }

         return handles;
      }
      
      public List<User> getPlatformUsers(String platform) {
         return users.stream().
               filter(u -> platform.equals(u.platform)).
               collect(Collectors.toList());
      }

      public Set<String> getPlatforms() {
         Set<String> platforms = new HashSet<String>();
         for (User u : users) platforms.add(u.platform);
         return platforms;
      }

      // the date range
      private String from, to;

      /**
       * The date fields are usually yyyy-MM-dd format, but this getter handles the
       * special case of the value provided being 'now' by returning the current date
       * (in the same format) respecting the timezone if provided within the
       * configuration
       * 
       * @return the end date of the time period the dashboard is valid for
       */
      public String getTo() {
         if ("now".equals(to)) {
            ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timezone));
            return now.toLocalDate().toString();
         }

         return to;
      }

      public boolean isLiveUpdating() {
         return "now".equals(to);
      }
      
      // default to no offset so that as before everything is UTC
      private String timezone = "UTC";

      // the index pattern
      private String index;

      private String helpResourcesURL = "https://onlineviolenceresponsehub.org/";
      private String helpResourcesName = "Online Violence Response Hub";

      // if true then the tweets were pre-filtered prior to indexing so all tweets are
      // relevant. If false then this is a big index containing tweets about multiple
      // accounts many of which won't be relevant so we need to subset the index
      // before doing any further analysis
      private Boolean dedicatedIndex = Boolean.TRUE;

      // dashboard title (used on the front page)
      private String title;

      // description for the dashboard (used on the front page)
      private String description;

      // image to use on the front page when listing the dashboards
      private String image;

      // config details for the Elasticsearch instance: will include the end point but
      // also possibly basic auth credentials
      private Map<String, String> elastic;
      
      private Map<String, Object> translations;
      
      public boolean hasTranslations() {
         if (translations == null) return false;
         
         return (Boolean)translations.getOrDefault("processed", Boolean.FALSE);
      }

      // config of the compliance details within the index
      private Compliance compliance = new Compliance();

      // these are mostly fixes for where I've screwed up and in odd cases we need to
      // override the defaults
      private String tweetPrefix = "entities.Tweet.";
      private String abuseStringFeature = "normalised_string";
      private String hashtagField = "entities.Hashtag.string.keyword";
      
      private String topicThemeField = "entities.Topic.theme.keyword";

      private Boolean hidden = false;

      //private URI processTranslations = null;

      // has the entities.Tweet.user.desc keyword field been added to the index?
      // This can be added either directly into the app (at ingest time or via
      // field copy) or can be quickly added as a runtime field. For example:
      //
      // POST aristeguionline_only-20220425/_mapping
      // {
      //   "runtime": {
      //     "entities.Tweet.user.desc": {
      //       "type": "keyword",
      //       "script": {
      //         "source": "def bio = params._source.entities.Tweet.get(0).user.description; if (bio != null) { emit(bio.toLowerCase()); }"
      //       }
      //     }
      //   }
      // }
      private Boolean bio = Boolean.FALSE;

      private List<String> sendAlertsTo;
   }

   @Data
   public static class Compliance {

      private String reasonField = "compliance.reason";

      /**
       * If true then a scheduled task will run once a day to update the compliance
       * info from the official Twitter batch compliance endpoint. Note this requires
       * the app to be correctly configued with a v2 API key.
       */
      private Boolean update = Boolean.FALSE;

      /**
       * When true this puts the dashboard into strict compliance mode. This means
       * that data we know to have been removed from Twitter is not passed to the UI.
       * The statistics don't change but the raw tweets are never retruned in the JSON
       * outputs from the backend. This means not only are they not displayed but they
       * can't be viewed if you try accessing the JSON directly. This is different to
       * the UI compliance mode which just hides the data in the front end (currently
       * it blurs out the deleted stuff so you can see it is missing).
       */
      private Boolean strict = Boolean.FALSE;

      /**
       * If true then at least some compliance data is available within the index and
       * so it's worth showing compliance in the UI. If this is false then it
       * (currently) removes the dataset decay tab and the compliance mode setting as
       * they don't do/show anything.
       */
      private Boolean available = Boolean.FALSE;
   }


   @Data
   public static class User {
      // we now allow a person to have multiple names (mostly so we can handle variation like
      // names with and withough accents). Where we only need a label the first name is used.
      private List<String> name;

      // their twitter account handle (be careful to make sure the case is correct)
      private String handle;
      
      private String platform;
      
      private String color;
   }

}
