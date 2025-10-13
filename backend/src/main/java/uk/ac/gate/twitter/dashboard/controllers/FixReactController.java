package uk.ac.gate.twitter.dashboard.controllers;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import uk.ac.gate.twitter.dashboard.config.Dashboards;
import uk.ac.gate.twitter.dashboard.config.LanguageInformation;
import uk.ac.gate.twitter.dashboard.config.PartnerInformation;

@RestController
public class FixReactController {

   @Autowired
   private PartnerInformation partner;

   @Autowired
   private Dashboards dashboards;
   
   @Autowired
   private LanguageInformation languages;

   @RequestMapping("/{dashboard}/")
   public ModelAndView fixReactIndexHTML(ModelMap model) {
      return new ModelAndView("forward:/", model);
   }

   @RequestMapping("/{dashboard}/static/{type}/{file}")
   public ModelAndView fixReactStaticResources(ModelMap model, @PathVariable(required = false, value = "") String type,
         @PathVariable(required = false, value = "") String file) {
      return new ModelAndView("forward:/static/" + type + "/" + file, model);
   }

   @GetMapping(value = { "/locate", "/{dashboard}/locate" })
   public Map<String, Object> getPathPrefix(HttpServletRequest servletRequest,
         @RequestParam(value = "path") String path, @PathVariable(required = false) String dashboard) {

      // start to get the path prefix by first removing "locate" from the end of the
      // request URI. This will get us the URI of the page we think is calling us
      String suffix = servletRequest.getRequestURI();
      suffix = suffix.substring(0, suffix.length() - 6);

      // now we get the path prefix but taking what we think the path is off the end
      // of what we were passed as the path parameter which is where the browser
      // thinks it is loaded from
      String prefix = path.substring(0, path.length() - suffix.length());

      // stick all those bits in a map (we really only need prefix but for debugging
      // purposes lets have everything
      Map<String, Object> result = new LinkedHashMap<String, Object>();
      result.put("path", path);
      result.put("request", servletRequest.getRequestURI());
      result.put("prefix", prefix);
      result.put("suffix", suffix);

      PartnerInformation partnerOverride = null;

      if (dashboard != null) {
         Dashboards.Config dashboardConfig = dashboards.get(dashboard);

         partnerOverride = dashboardConfig.getPartner();

         result.put("strict", dashboardConfig.getCompliance().getStrict());
         result.put("decay", dashboardConfig.getCompliance().getAvailable());
         result.put("translations", dashboardConfig.hasTranslations());
         result.put("live", dashboardConfig.isLiveUpdating());
         result.put("users", dashboardConfig.getUsers());
         result.put("helpResourcesURL", dashboardConfig.getHelpResourcesURL());
         result.put("helpResourcesName", dashboardConfig.getHelpResourcesName());
      }

      String img = partnerOverride != null ? partnerOverride.getImg() : partner.getImg();
      String url = partnerOverride != null ? partnerOverride.getUrl() : partner.getUrl();
      

      if (img == null || img.startsWith("http")) {
         // just use a fully specififed URL as is
         result.put("partner", partner);
      } else {
         // for a partial URL we need to add the prefix we've worked out so that we load
         // the image from the static files location
         Map<String, String> copy = new HashMap<String, String>();
         copy.put("url", url);
         copy.put("img", prefix + "/" + img);

         result.put("partner", copy);
      }

      result.put("languages",languages);
      result.put("colors", dashboards.getColours());
      
      // return the result
      return result;
   }
}
