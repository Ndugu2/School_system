package com.ndugu.schoolsystem.controller;

import com.ndugu.schoolsystem.config.JwtUtils;
import com.ndugu.schoolsystem.model.User;
import com.ndugu.schoolsystem.repository.UserRepository;
import com.ndugu.schoolsystem.service.UserDetailsImpl;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        if (loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("Please provide email and password"));
        }

        User user = userRepository.findByEmail(loginRequest.getEmail().toLowerCase().trim()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createErrorResponse("Invalid email or password"));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorResponse("Your account has been deactivated"));
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail().toLowerCase().trim(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(user.getEmail(), user.getRole());
        String refreshToken = jwtUtils.generateJwtToken(user.getEmail(), user.getRole()); // simplify refresh token using JWT too

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("avatar", user.getAvatar());
        response.put("token", jwt);
        response.put("refreshToken", refreshToken);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest signUpRequest) {
        if (signUpRequest.getEmail() == null || signUpRequest.getPassword() == null || signUpRequest.getName() == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("Name, email, and password are required"));
        }

        String email = signUpRequest.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(createErrorResponse("User already exists with this email"));
        }

        long userCount = userRepository.count();
        String userRole = signUpRequest.getRole() != null ? signUpRequest.getRole() : "student";

        if (userCount == 0) {
            userRole = "super-admin";
        } else {
            // Require admin authentication for additional accounts
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("Authentication required to register additional accounts"));
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
            User requestor = userRepository.findById(userDetails.getId()).orElse(null);
            if (requestor == null || (!requestor.getRole().equals("super-admin") && !requestor.getRole().equals("admin"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(createErrorResponse("Only administrators can register new accounts"));
            }
        }

        User user = User.builder()
                .name(signUpRequest.getName().trim())
                .email(email)
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(userRole)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        String jwt = jwtUtils.generateJwtToken(user.getEmail(), user.getRole());

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("token", jwt);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createErrorResponse("Unauthorized"));
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse("User not found"));
        }

        return ResponseEntity.ok(user);
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> errorBody = new HashMap<>();
        Map<String, Object> errorMsg = new HashMap<>();
        errorMsg.put("message", message);
        errorBody.put("error", errorMsg);
        return errorBody;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String name;
        private String email;
        private String password;
        private String role;
    }
}
