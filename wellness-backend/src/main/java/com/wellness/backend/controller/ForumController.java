package com.wellness.backend.controller;

import com.wellness.backend.dto.forum.*;
import com.wellness.backend.model.User;
import com.wellness.backend.service.ForumService;
import com.wellness.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/forum")
public class ForumController {

    @Autowired
    private ForumService forumService;

    @Autowired
    private UserRepository userRepository;

    // Helper to get current user ID
    private Integer getCurrentUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    // --- Create and Read Threads ---
    @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER') or hasRole('ADMIN')")
    @PostMapping("/threads")
    public ResponseEntity<ThreadDTO> createThread(@Valid @RequestBody CreateThreadDTO dto, Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return new ResponseEntity<>(forumService.createThread(dto, userId), HttpStatus.CREATED);
    }

    @GetMapping("/threads")
    public ResponseEntity<Page<ThreadDTO>> getAllThreads(
            @RequestParam(required = false) String category,
            Pageable pageable) {
        return ResponseEntity.ok(forumService.getAllThreads(category, pageable));
    }

    @GetMapping("/threads/{id}")
    public ResponseEntity<ThreadDTO> getThreadById(@PathVariable Integer id, Authentication authentication) {
        Integer userId = (authentication != null) ? getCurrentUserId(authentication) : null;
        return ResponseEntity.ok(forumService.getThreadById(id, userId));
    }

    // --- Answers ---
    @PreAuthorize("hasRole('PRACTITIONER') or hasRole('ADMIN')")
    @PostMapping("/threads/{threadId}/answers")
    public ResponseEntity<AnswerDTO> addAnswer(
            @PathVariable Integer threadId,
            @Valid @RequestBody CreateAnswerDTO dto,
            Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return new ResponseEntity<>(forumService.addAnswer(threadId, dto, userId), HttpStatus.CREATED);
    }

    // --- Answer Interactions (Like & Accept) ---
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/answers/{id}/like")
    public ResponseEntity<AnswerDTO> likeAnswer(@PathVariable Integer id, Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(forumService.likeAnswer(id, userId));
    }

    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/answers/{id}/like")
    public ResponseEntity<AnswerDTO> unlikeAnswer(@PathVariable Integer id, Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(forumService.unlikeAnswer(id, userId));
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/answers/{id}/accept")
    public ResponseEntity<AnswerDTO> acceptSolution(@PathVariable Integer id, Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(forumService.acceptSolution(id, userId));
    }

    // --- Comments ---
    @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER') or hasRole('ADMIN')")
    @PostMapping("/answers/{answerId}/comments")
    public ResponseEntity<CommentDTO> addComment(
            @PathVariable Integer answerId,
            @Valid @RequestBody CreateCommentDTO dto,
            Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return new ResponseEntity<>(forumService.addComment(answerId, dto, userId), HttpStatus.CREATED);
    }

    // --- Moderation (Deletion) ---
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/threads/{id}")
    public ResponseEntity<Void> deleteThread(@PathVariable Integer id, Authentication authentication) {
        forumService.deleteThread(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/answers/{id}")
    public ResponseEntity<Void> deleteAnswer(@PathVariable Integer id, Authentication authentication) {
        forumService.deleteAnswer(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }


    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/answers/{id}/reconcile")
    public ResponseEntity<Void> reconcileLikes(@PathVariable Integer id) {
        forumService.reconcileLikes(id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Integer id) {
        forumService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }

    // --- Report Endpoints ---
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/answers/{id}/report")
    public ResponseEntity<AnswerReportDTO> reportAnswer(
            @PathVariable Integer id,
            @Valid @RequestBody CreateReportDTO dto,
            Authentication authentication) {
        Integer userId = getCurrentUserId(authentication);
        return new ResponseEntity<>(forumService.reportAnswer(id, dto.getReason(), userId), HttpStatus.CREATED);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reports")
    public ResponseEntity<java.util.List<AnswerReportDTO>> getAllReports() {
        return ResponseEntity.ok(forumService.getAllReports());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/reports/{id}/resolve")
    public ResponseEntity<AnswerReportDTO> resolveReport(@PathVariable Integer id, Authentication authentication) {
        return ResponseEntity.ok(forumService.resolveReport(id, authentication.getName()));
    }

    // --- My Threads & Search ---
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/threads/my")
    public ResponseEntity<Page<ThreadDTO>> getMyThreads(Authentication authentication, Pageable pageable) {
        Integer userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(forumService.getMyThreads(userId, pageable));
    }

    @GetMapping("/threads/search")
    public ResponseEntity<Page<ThreadDTO>> searchThreads(@RequestParam String q, Pageable pageable) {
        return ResponseEntity.ok(forumService.searchThreads(q, pageable));
    }
}
