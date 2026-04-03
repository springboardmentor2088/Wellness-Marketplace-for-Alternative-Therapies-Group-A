package com.wellness.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellness.backend.dto.MedicalAnalysisDTO;
import com.wellness.backend.dto.TriageDTO;
import com.wellness.backend.dto.TriageResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.http.HttpStatusCode;
import reactor.core.publisher.Mono;
import java.util.List;
import java.util.Map;
import java.time.Duration;
import reactor.util.retry.Retry;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;

@Service
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    @Autowired
    private LocalFallbackService localFallback;

    @Value("${google.gemini.api.key:}")
    private String rawApiKey;
    private String apiKey;

    @jakarta.annotation.PostConstruct
    public void init() {
        this.apiKey = (rawApiKey != null) ? rawApiKey.trim() : "";
    }

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String PRIMARY_MODEL = "gemini-2.5-flash";
    private final String FALLBACK_MODEL = "gemini-2.5-flash-lite";

    // Configure durable HttpClient
    private final HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
            .doOnConnected(conn -> conn
                    .addHandlerLast(new ReadTimeoutHandler(30))
                    .addHandlerLast(new WriteTimeoutHandler(30)));

    private final WebClient webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();

    private static final String SYSTEM_PROMPT = """
Role: Prescription Analyst.
Task: Extract medicines and their exact dosages from the provided text or image prescription.
Rules:
1. List every medicine name found exactly as written.
2. Provide the exact dosage and frequency/instructions mentioned.
3. If no dose is found, write "Not specified".
4. If non-health related, return 'I work for medical queries only'
JSON Structure:
{
  "extracted_medicines": [
    {
      "name": "Medicine Name",
      "dose": "Dosage (e.g. 500mg)",
      "instructions": "Timing (e.g. twice a day)",
      "type": "Category (e.g. Antibiotic)",
      "guidelines": "Safety warnings"
    }
  ],
  "advice": "General pharmacist-style advice"
}
""";

    private static final String TRIAGE_PROMPT = """
Role: Medical Triage Expert.
Task: Provide a specialist recommendation AND immediate safe care advice.
Specialists: Gastroenterology, Cardiology, Neurology, Pulmonology, Dermatology, Orthopedics, ENT, Psychiatry, Endocrinology, General Physician.
Rules:
// 1. If input is unrelated to medical health (e.g., general knowledge, math, weather):
//    - Return exactly: {"specialist": null, "medicines": [], "home_remedies": [], "advice": "I work for medical queries only."}
2. Identify exactly ONE specialist.
 Suggest 2-3 safe OTC medicines for temporary relief.
3. Suggest 1-2 home remedies (e.g., rest, hydration).
4. If non-health related, set specialist to null return "I work for medical queries only."
JSON Structure:
{
  "specialist": "Name",
  "medicines": [{"name": "Medicine", "usage": "Usage"}],
  "home_remedies": ["Remedy"],
  "advice": "Short summary advice"
}
""";

    public MedicalAnalysisDTO analyzeMedicalInput(String text, String base64Image, String mimeType) {
        try {
            return executeMedicalAnalysis(text, base64Image, mimeType, PRIMARY_MODEL);
        } catch (WebClientResponseException.TooManyRequests e) {
            logger.warn("Primary Model Quota Exhausted (429). Resource: {}", e.getResponseBodyAsString());
            try { Thread.sleep(500); } catch (InterruptedException ignored) {}
            try {
                return executeMedicalAnalysis(text, base64Image, mimeType, FALLBACK_MODEL);
            } catch (Exception ex) {
                logger.error("AI Analysis fallback failed (Quota): {}", ex.getMessage());
                return null;
            }
        } catch (Exception e) {
            logger.error("AI Analysis critical failure: {}", e.getMessage(), e);
            return null;
        }
    }

    private MedicalAnalysisDTO executeMedicalAnalysis(String text, String base64Image, String mimeType, String model) throws Exception {
        String inputStr = text != null ? text : "Analyze this input.";
        // Adding a clear boundary helps the Free API distinguish instructions from user data
        String combinedPrompt = SYSTEM_PROMPT + "\n\n--- USER QUERY ---\n" + inputStr;
        
        Map<String, Object> partText = Map.of("text", combinedPrompt);
        List<Map<String, Object>> partsList = new java.util.ArrayList<>(List.of(partText));
        if (base64Image != null && mimeType != null) {
            partsList.add(Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64Image)));
        }

        String rawResponse = callGeminiApi(partsList, model);
        return parseGeminiResponse(rawResponse);
    }

    public TriageResult analyzeSymptomsForTriage(String symptoms) {
        try {
            return executeTriageRequest(symptoms, PRIMARY_MODEL);
        } catch (WebClientResponseException.TooManyRequests e) {
            logger.warn("Primary Model Triage Quota (429) Hit. Switching to Fallback...");
            try { Thread.sleep(500); } catch (InterruptedException ignored) {}
            try {
                return executeTriageRequest(symptoms, FALLBACK_MODEL);
            } catch (Exception ex) {
                logger.error("All AI Models failed for triage. Using Local Fallback.");
                return localFallback.getLocalTriage(symptoms);
            }
        } catch (Exception e) {
            logger.error("AI Triage failure: {}. Using Local Fallback.", e.getMessage(), e);
            return localFallback.getLocalTriage(symptoms);
        }
    }

    private TriageResult executeTriageRequest(String symptoms, String model) throws Exception {
        // Adding a clear boundary helps the Free API distinguish instructions from user data
        String combinedPrompt = TRIAGE_PROMPT + "\n\n--- USER QUERY ---\n" + symptoms;
        Map<String, Object> partText = Map.of("text", combinedPrompt);
        String rawResponse = callGeminiApi(List.of(partText), model);
        TriageDTO dto = parseTriageResponse(rawResponse);

        String specialty = dto.getSpecialist(); // Allow null to pass through for MedicalIntelligenceController to handle
        String urgency = "LOW";
        String advice = dto.getAdvice() != null ? dto.getAdvice() : "Based on your symptoms, a specialist is recommended.";

        return new TriageResult(urgency, advice, true, model, specialty, dto);
    }

    private String callGeminiApi(List<Map<String, Object>> parts, String model) throws Exception {
        String uri = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> requestMap = new java.util.HashMap<>();
        requestMap.put("contents", List.of(Map.of("role", "user", "parts", parts)));
        
        // Output formatting config to force Gemini into strict JSON mode.
        // It guarantees valid JSON based on the user's explicit Schema instructions above.
        requestMap.put("generationConfig", Map.of("response_mime_type", "application/json"));

        // Disable Safety Gating to prevent clinical censorship
        List<Map<String, String>> safetySettings = List.of(
            Map.of("category", "HARM_CATEGORY_HARASSMENT", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_HATE_SPEECH", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold", "BLOCK_NONE")
        );
        requestMap.put("safetySettings", safetySettings);

        String requestBody = objectMapper.writeValueAsString(requestMap);

        return webClient.post()
                .uri(uri)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class).flatMap(body -> {
                    logger.error("Gemini API Error ({}): {}", response.statusCode(), body);
                    return Mono.error(new RuntimeException("Gemini API Error: " + body));
                }))
                .bodyToMono(String.class)
                // Add this specific timeout to handle the "Thinking" delay
                .timeout(Duration.ofSeconds(30)) 
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                        .filter(t -> t instanceof org.springframework.web.reactive.function.client.WebClientRequestException || (t.getMessage() != null && t.getMessage().contains("Connection reset"))))
                .block(Duration.ofSeconds(35));
    }

    @SuppressWarnings("unchecked")
    private MedicalAnalysisDTO parseGeminiResponse(String rawResponse) throws Exception {
        Map<String, Object> respMap = objectMapper.readValue(rawResponse, Map.class);
        var candidates = (List<Map<String, Object>>) respMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            logger.warn("Safety Filters triggered. Returning default response.");
            MedicalAnalysisDTO fallback = new MedicalAnalysisDTO();
            fallback.setExtractedMedicines(List.of());
            fallback.setAdvice("I'm sorry, I cannot provide information on this specific topic. Please consult a doctor.");
            return fallback;
        }
        var content = (Map<String, Object>) candidates.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        String jsonText = extractJson((String) parts.get(0).get("text"));
        return objectMapper.readValue(jsonText, MedicalAnalysisDTO.class);
    }

    @SuppressWarnings("unchecked")
    private TriageDTO parseTriageResponse(String rawResponse) throws Exception {
        Map<String, Object> respMap = objectMapper.readValue(rawResponse, Map.class);
        var candidates = (List<Map<String, Object>>) respMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new Exception("Safety Filters blocked clinical triage.");
        }
        var content = (Map<String, Object>) candidates.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        String jsonText = extractJson((String) parts.get(0).get("text"));
        
        com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(jsonText);
        if (root.has("triage")) {
            return objectMapper.treeToValue(root.get("triage"), TriageDTO.class);
        }
        return objectMapper.readValue(jsonText, TriageDTO.class);
    }

    private String extractJson(String text) {
        String extracted = text.trim();
        if (extracted.startsWith("```json")) {
            extracted = extracted.substring(7);
        } else if (extracted.startsWith("```")) {
            extracted = extracted.substring(3);
        }
        if (extracted.endsWith("```")) {
            extracted = extracted.substring(0, extracted.length() - 3);
        }
        return extracted.trim();
    }
}
