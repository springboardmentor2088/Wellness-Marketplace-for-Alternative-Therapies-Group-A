package com.wellness.backend.service;

import com.wellness.backend.dto.forum.*;
import com.wellness.backend.model.*;
import com.wellness.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ForumService {

    @Autowired
    private ForumThreadRepository threadRepository;

    @Autowired
    private ForumAnswerRepository answerRepository;

    @Autowired
    private ForumCommentRepository commentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnswerLikeRepository likeRepository;

    @Autowired
    private AnswerReportRepository reportRepository;

    @Transactional
    public ThreadDTO createThread(CreateThreadDTO dto, Integer authorId) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ForumThread thread = new ForumThread();
        thread.setTitle(dto.getTitle());
        thread.setContent(dto.getContent());
        thread.setCategory(dto.getCategory());
        thread.setAuthor(author);

        thread = threadRepository.save(thread);
        return mapToThreadDTO(thread, false, null);
    }

    @Transactional(readOnly = true)
    public Page<ThreadDTO> getAllThreads(String category, Pageable pageable) {
        Page<ForumThread> threads;
        if (category != null && !category.isEmpty()) {
            threads = threadRepository.findByCategoryAndIsDeletedFalse(category, pageable);
        } else {
            threads = threadRepository.findByIsDeletedFalse(pageable);
        }
        return threads.map(t -> mapToThreadDTO(t, false, null));
    }

    @Transactional(readOnly = true)
    public ThreadDTO getThreadById(Integer id, Integer currentUserId) {
        ForumThread thread = threadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thread not found"));
        
        if (thread.isDeleted()) {
            throw new RuntimeException("Thread not found or deleted");
        }
        
        ThreadDTO dto = mapToThreadDTO(thread, false, currentUserId);
        
        // Fetch only IDs and Scores with DB-calculated ranking
        List<AnswerRankingProjection> idScoreResults = answerRepository.findAnswerIdsWithRanking(id);
        
        // Map all thread answers into a lookup map for rapid access
        java.util.Map<Integer, ForumAnswer> answerMap = thread.getAnswers().stream()
                .collect(Collectors.toMap(ForumAnswer::getId, a -> a));

        List<AnswerDTO> answerDTOs = idScoreResults.stream()
                .map(result -> {
                    Integer ansId = result.getId();
                    Double score = result.getCalculatedScore();
                    return mapToAnswerDTOWithScore(answerMap.get(ansId), currentUserId, score);
                })
                .collect(Collectors.toList());
        
        dto.setAnswers(answerDTOs);
        return dto;
    }

    @Transactional
    public AnswerDTO addAnswer(Integer threadId, CreateAnswerDTO dto, Integer authorId) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"PRACTITIONER".equals(author.getRole().name()) && !"ADMIN".equals(author.getRole().name())) {
            throw new RuntimeException("Only Practitioners can answer threads.");
        }

        ForumThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new RuntimeException("Thread not found"));

        ForumAnswer answer = new ForumAnswer();
        answer.setContent(dto.getContent());
        answer.setThread(thread);
        answer.setAuthor(author);

        answer = answerRepository.save(answer);
        return mapToAnswerDTO(answer, authorId);
    }

    @Transactional
    public CommentDTO addComment(Integer answerId, CreateCommentDTO dto, Integer authorId) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        ForumComment comment = new ForumComment();
        comment.setContent(dto.getContent());
        comment.setAnswer(answer);
        comment.setAuthor(author);

        comment = commentRepository.save(comment);
        return mapToCommentDTO(comment);
    }

    @Transactional
    public AnswerDTO likeAnswer(Integer answerId, Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        if (answer.getAuthor().getId().equals(userId)) {
            throw new RuntimeException("You cannot like your own answer.");
        }

        if (likeRepository.existsByAnswerIdAndUserId(answerId, userId)) {
            return mapToAnswerDTO(answer, userId); // Idempotent
        }

        AnswerLike like = new AnswerLike();
        like.setUser(user);
        like.setAnswer(answer);
        likeRepository.save(like);

        // Atomic update in DB
        answerRepository.incrementLikesCount(answerId);
        
        // Update Author Reputation
        User author = answer.getAuthor();
        author.setReputationScore(author.getReputationScore() + 10);
        userRepository.save(author);

        // Refresh answer to get updated likesCount for DTO
        answer = answerRepository.findById(answerId).get();
        return mapToAnswerDTO(answer, userId);
    }

    @Transactional
    public AnswerDTO unlikeAnswer(Integer answerId, Integer userId) {
        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        if (!likeRepository.existsByAnswerIdAndUserId(answerId, userId)) {
            return mapToAnswerDTO(answer, userId); // Idempotent
        }

        likeRepository.deleteByAnswerIdAndUserId(answerId, userId);

        // Atomic update in DB
        answerRepository.decrementLikesCount(answerId);

        // Update Author Reputation
        User author = answer.getAuthor();
        author.setReputationScore(Math.max(0, author.getReputationScore() - 10));
        userRepository.save(author);

        // Refresh answer
        answer = answerRepository.findById(answerId).get();
        return mapToAnswerDTO(answer, userId);
    }

    @Transactional
    public AnswerDTO acceptSolution(Integer answerId, Integer userId) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Fetch answer to get threadId
        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));
        Integer threadId = answer.getThread().getId();

        // Scope lock to Thread level
        ForumThread thread = threadRepository.findByIdWithLock(threadId)
                .orElseThrow(() -> new RuntimeException("Thread not found"));

        // Security check: Only thread owner or Admin
        boolean isAdmin = "ADMIN".equals(currentUser.getRole().name());
        boolean isOwner = thread.getAuthor().getId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Unauthorized: Only thread owner or admin can accept solutions.");
        }

        if (answer.isAccepted()) {
            return mapToAnswerDTO(answer, userId);
        }

        // Unmark previous accepted answer if any
        for (ForumAnswer other : thread.getAnswers()) {
            if (other.isAccepted()) {
                other.setAccepted(false);
                other.setAcceptedAt(null);
                other.setAcceptedBy(null);
                answerRepository.save(other);

                // Deduct reputation from previous author
                User previousAuthor = other.getAuthor();
                previousAuthor.setReputationScore(Math.max(0, previousAuthor.getReputationScore() - 50));
                userRepository.save(previousAuthor);
            }
        }

        // Mark current as accepted
        answer.setAccepted(true);
        answer.setAcceptedAt(LocalDateTime.now());
        answer.setAcceptedBy(currentUser.getName());
        answerRepository.save(answer);

        // Award reputation to author
        User author = answer.getAuthor();
        author.setReputationScore(author.getReputationScore() + 50);
        userRepository.save(author);

        return mapToAnswerDTO(answer, userId);
    }

    @Transactional
    public void reconcileLikes(Integer answerId) {
        long actualCount = likeRepository.countByAnswerId(answerId);
        answerRepository.syncLikesCount(answerId, actualCount);
    }

    @Transactional
    public void deleteThread(Integer threadId, String userEmail) {
        ForumThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new RuntimeException("Thread not found"));
        
        thread.setDeleted(true);
        thread.setDeletedAt(LocalDateTime.now());
        thread.setDeletedBy(userEmail);
        threadRepository.save(thread);
    }

    @Transactional
    public void deleteAnswer(Integer answerId, String userEmail) {
        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));
        
        answer.setDeleted(true);
        answer.setDeletedAt(LocalDateTime.now());
        answer.setDeletedBy(userEmail);
        answerRepository.save(answer);
    }

    @Transactional
    public void deleteComment(Integer commentId) {
        if (!commentRepository.existsById(commentId)) {
            throw new RuntimeException("Comment not found");
        }
        commentRepository.deleteById(commentId);
    }

    private ThreadDTO mapToThreadDTO(ForumThread thread, boolean includeAnswers, Integer currentUserId) {
        ThreadDTO dto = new ThreadDTO();
        dto.setId(thread.getId());
        dto.setTitle(thread.getTitle());
        dto.setContent(thread.getContent());
        dto.setCategory(thread.getCategory());
        dto.setAuthorName(thread.getAuthor().getName());
        dto.setAuthorId(thread.getAuthor().getId());
        dto.setAuthorRole(thread.getAuthor().getRole().name());
        dto.setCreatedAt(thread.getCreatedAt());
        dto.setUpdatedAt(thread.getUpdatedAt());
        dto.setDeleted(thread.isDeleted());

        int count = thread.getAnswers() != null ? 
            (int) thread.getAnswers().stream().filter(a -> !a.isDeleted()).count() : 0;
        dto.setAnswersCount(count);

        if (includeAnswers && thread.getAnswers() != null) {
            // This is now handled by getThreadById using native query for better performance/ranking
            List<AnswerDTO> answerDTOs = thread.getAnswers().stream()
                    .filter(a -> !a.isDeleted())
                    .map(a -> mapToAnswerDTO(a, currentUserId))
                    .collect(Collectors.toList());
            dto.setAnswers(answerDTOs);
        }
        return dto;
    }

    private AnswerDTO mapToAnswerDTO(ForumAnswer answer, Integer currentUserId) {
        return mapToAnswerDTOWithScore(answer, currentUserId, null);
    }

    private AnswerDTO mapToAnswerDTOWithScore(ForumAnswer answer, Integer currentUserId, Double rankingScore) {
        AnswerDTO dto = new AnswerDTO();
        dto.setId(answer.getId());
        dto.setThreadId(answer.getThread().getId());
        dto.setContent(answer.getContent());
        dto.setAuthorName(answer.getAuthor().getName());
        dto.setAuthorId(answer.getAuthor().getId());
        dto.setAuthorRole(answer.getAuthor().getRole().name());
        dto.setCreatedAt(answer.getCreatedAt());
        dto.setUpdatedAt(answer.getUpdatedAt());
        dto.setLikesCount(answer.getLikesCount());
        dto.setAccepted(answer.isAccepted());
        dto.setAcceptedAt(answer.getAcceptedAt());
        dto.setAcceptedBy(answer.getAcceptedBy());
        dto.setAuthorReputation(answer.getAuthor().getReputationScore());

        if (currentUserId != null) {
            dto.setUserHasLiked(likeRepository.existsByAnswerIdAndUserId(answer.getId(), currentUserId));
        }

        if (rankingScore != null) {
            dto.setRankingScore(rankingScore);
        } else {
            // Fallback for single additions or non-paged view
            double roleWeight = "PRACTITIONER".equals(answer.getAuthor().getRole().name()) ? 20.0 : 0.0;
            double recencyScore = GREATEST_JAVA(0, 5 - (java.time.Duration.between(answer.getCreatedAt(), LocalDateTime.now()).toHours() / 24.0));
            dto.setRankingScore((answer.getLikesCount() * 2.0) + roleWeight + recencyScore);
        }

        if (answer.getComments() != null) {
            dto.setComments(answer.getComments().stream()
                    .map(this::mapToCommentDTO)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    private double GREATEST_JAVA(double a, double b) {
        return Math.max(a, b);
    }

    // --- Report Methods ---
    @Transactional
    public AnswerReportDTO reportAnswer(Integer answerId, String reason, Integer reporterId) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ForumAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        if (reportRepository.existsByAnswerIdAndReporterId(answerId, reporterId)) {
            throw new RuntimeException("You have already reported this answer.");
        }

        AnswerReport report = new AnswerReport();
        report.setAnswer(answer);
        report.setReporter(reporter);
        report.setReason(reason);
        report = reportRepository.save(report);
        return mapToReportDTO(report);
    }

    @Transactional(readOnly = true)
    public java.util.List<AnswerReportDTO> getAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToReportDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AnswerReportDTO resolveReport(Integer reportId, String adminEmail) {
        AnswerReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));
        report.setResolved(true);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolvedBy(adminEmail);
        report = reportRepository.save(report);
        return mapToReportDTO(report);
    }

    private AnswerReportDTO mapToReportDTO(AnswerReport report) {
        AnswerReportDTO dto = new AnswerReportDTO();
        dto.setId(report.getId());
        dto.setAnswerId(report.getAnswer().getId());
        dto.setThreadId(report.getAnswer().getThread().getId());
        dto.setAnswerContent(report.getAnswer().getContent());
        dto.setAnswerAuthorName(report.getAnswer().getAuthor().getName());
        dto.setReporterName(report.getReporter().getName());
        dto.setReason(report.getReason());
        dto.setCreatedAt(report.getCreatedAt());
        dto.setResolved(report.isResolved());
        dto.setResolvedAt(report.getResolvedAt());
        dto.setResolvedBy(report.getResolvedBy());
        return dto;
    }

    // --- My Threads & Search ---
    @Transactional(readOnly = true)
    public Page<ThreadDTO> getMyThreads(Integer authorId, Pageable pageable) {
        return threadRepository.findByAuthorIdAndIsDeletedFalse(authorId, pageable)
                .map(t -> mapToThreadDTO(t, false, authorId));
    }

    @Transactional(readOnly = true)
    public Page<ThreadDTO> searchThreads(String keyword, Pageable pageable) {
        return threadRepository.searchByKeyword(keyword, pageable)
                .map(t -> mapToThreadDTO(t, false, null));
    }

    private CommentDTO mapToCommentDTO(ForumComment comment) {
        CommentDTO dto = new CommentDTO();
        dto.setId(comment.getId());
        dto.setAnswerId(comment.getAnswer().getId());
        dto.setContent(comment.getContent());
        dto.setAuthorName(comment.getAuthor().getName());
        dto.setAuthorId(comment.getAuthor().getId());
        dto.setAuthorRole(comment.getAuthor().getRole().name());
        dto.setCreatedAt(comment.getCreatedAt());
        return dto;
    }
}

