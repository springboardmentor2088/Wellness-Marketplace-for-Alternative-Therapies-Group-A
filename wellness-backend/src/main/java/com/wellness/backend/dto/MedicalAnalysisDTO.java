package com.wellness.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // <--- CRITICAL: Shields the parent
public class MedicalAnalysisDTO {
    
    @JsonProperty("extracted_medicines")
    private List<ExtractedMedicine> extractedMedicines;
    
    private String advice;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true) // <--- CRITICAL: Shields the inner objects
    public static class ExtractedMedicine {
       private String name;
       private String dose;        // Matches the "dose" in your log
       private String instructions; // Matches the "instructions" in your log
       private String type;         // Keep for compatibility
       private String guidelines;
    }
}
