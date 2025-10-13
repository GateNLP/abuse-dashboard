package uk.ac.gate.twitter.dashboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@ConfigurationProperties(prefix = "partner")
@Data
public class PartnerInformation {
   // holds information about a partner organisation that we want to link to from
   // the header area. this allow us to configure the info via application.yml and
   // hence it doesn't need baking into the docker image
   private String url, img;
}
