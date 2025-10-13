package uk.ac.gate.twitter.dashboard.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@ConfigurationProperties(prefix = "categories")
@Data
public class CategoryInformation {

   private String field;

   private String description;

   private LinkedHashMap<String, Map<String, String>> labels;

   public String getColor(String label) {

      Map<String, String> data = labels.get(label);

      if (data == null)
         return "rgb(0,0,0)";

      return data.getOrDefault("color", "rgb(0,0,0)");
   }
}
