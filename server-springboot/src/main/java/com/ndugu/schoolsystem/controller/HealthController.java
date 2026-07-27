package com.ndugu.schoolsystem.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<?> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "OK");
        health.put("message", "Ndugu Academy API is healthy");
        health.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(health);
    }
}
