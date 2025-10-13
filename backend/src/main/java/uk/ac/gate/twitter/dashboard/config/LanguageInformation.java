package uk.ac.gate.twitter.dashboard.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@ConfigurationProperties(prefix = "languages")
@Data
public class LanguageInformation  extends LinkedHashMap<String, LanguageInformation.Locale>{

     //private String fallback = "en";
     
     //private LinkedHashMap<String, Locale> locales;
     
     @Data
     public static class Locale {
        String name, direction;
     }
}

