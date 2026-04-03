package com.wellness.backend.controller;

import com.wellness.backend.dto.UserDTO;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<UserDTO>> getUsers(
            @RequestParam(required = false) User.Role role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<User> users;
        if (role != null) {
            users = userRepository.findByRole(role, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        } else {
            users = userRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        }
        
        return ResponseEntity.ok(users.map(this::mapToDTO));
    }

    @PutMapping("/{id}/block")
    public ResponseEntity<?> blockUser(@PathVariable Integer id, @RequestParam String reason) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setBlocked(true);
        user.setBlockingReason(reason);
        userRepository.save(user);
        
        // Simulating sending email
        System.out.println("NOTIFICATION: User " + user.getEmail() + " blocked. Reason: " + reason);
        
        return ResponseEntity.ok("User blocked successfully");
    }

    @PutMapping("/{id}/unblock")
    public ResponseEntity<?> unblockUser(@PathVariable Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setBlocked(false);
        user.setBlockingReason(null);
        userRepository.save(user);
        
        return ResponseEntity.ok("User unblocked successfully");
    }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPhone(user.getPhone());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setBlocked(user.isBlocked());
        dto.setBlockingReason(user.getBlockingReason());
        return dto;
    }
}
