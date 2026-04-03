package com.wellness.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TriageDTO {
    private String specialist;
    private List<MedicineInfo> medicines;
    @JsonProperty("home_remedies")
    private List<String> homeRemedies;
    private String advice;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicineInfo {
        private String name;
        private String usage;
    }
}
