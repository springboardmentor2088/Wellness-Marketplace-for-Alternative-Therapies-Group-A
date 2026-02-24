package com.wellness.backend.controller;

import com.wellness.backend.dto.UserDTO;
import com.wellness.backend.dto.UserUpdateDTO;
import com.wellness.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ================= GET CURRENT USER =================
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    // ================= GET USER BY ID =================
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    // ================= UPDATE USER =================
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Integer id,
            @Valid @RequestBody UserUpdateDTO updateDTO) {

        return ResponseEntity.ok(userService.updateUser(id, updateDTO));
    }

    // ================= DELETE USER =================
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
