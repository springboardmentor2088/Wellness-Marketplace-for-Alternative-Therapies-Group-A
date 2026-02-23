package com.wellness.backend.service;

import com.wellness.backend.dto.UserDTO;
import com.wellness.backend.dto.UserUpdateDTO;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ================= GET CURRENT USER =================
    @Transactional(readOnly = true)
    public UserDTO getCurrentUser() {
        return mapToDTO(getCurrentAuthenticatedUser());
    }

    // ================= GET USER BY ID =================
    @Transactional(readOnly = true)
    public UserDTO getUserById(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return mapToDTO(user);
    }

    // ================= UPDATE USER =================
    @Transactional
    public UserDTO updateUser(Integer id, UserUpdateDTO updateDTO) {

        User currentUser = getCurrentAuthenticatedUser();
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        // Allow self update OR ADMIN
        if (!currentUser.getId().equals(id)
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to update this profile");
        }

        if (updateDTO.getName() != null) {
            targetUser.setName(updateDTO.getName());
        }

        if (updateDTO.getEmail() != null &&
                !updateDTO.getEmail().equals(targetUser.getEmail())) {

            if (userRepository.existsByEmail(updateDTO.getEmail())) {
                throw new RuntimeException("Email already in use");
            }

            targetUser.setEmail(updateDTO.getEmail());
        }

        if (updateDTO.getBio() != null) {
            targetUser.setBio(updateDTO.getBio());
        }

        if (updateDTO.getPhone() != null) {
            targetUser.setPhone(updateDTO.getPhone());
        }

        if (updateDTO.getDateOfBirth() != null) {
            targetUser.setDateOfBirth(updateDTO.getDateOfBirth());
        }

        if (updateDTO.getAddress() != null) {
            targetUser.setAddress(updateDTO.getAddress());
        }

        return mapToDTO(userRepository.save(targetUser));
    }

    // ================= DELETE USER =================
    @Transactional
    public void deleteUser(Integer id) {

        User currentUser = getCurrentAuthenticatedUser();

        // Allow self delete OR ADMIN
        if (!currentUser.getId().equals(id)
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to delete this account");
        }

        userRepository.deleteById(id);
    }

    // ================= AUTH USER HELPER =================
    @Transactional(readOnly = true)
    public User getCurrentAuthenticatedUser() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();
        String email;

        // ✅ FIXED: Handle UserDetails interface (not concrete class)
        if (principal instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) principal;
            email = userDetails.getUsername(); // This returns email in your case
        } else if (principal instanceof String) {
            email = (String) principal;
        } else {
            throw new RuntimeException("Unknown principal type: " + principal.getClass().getName());
        }

        // Load fresh user from database using email
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    // ================= ENTITY → DTO =================
    public UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setBio(user.getBio());
        dto.setPhone(user.getPhone());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setAddress(user.getAddress());
        dto.setRole(user.getRole());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}