package uk.ac.gate.twitter.dashboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@ConfigurationProperties(prefix = "categories")
@Data
public class CategoryInformation {
   private String field;
}
