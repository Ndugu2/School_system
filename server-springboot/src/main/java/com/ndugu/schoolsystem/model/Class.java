package com.ndugu.schoolsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "classes")
public class Class {

    @Id
    private String id;

    private String name;

    private String level; // 'Nursery', 'P1', etc.

    private String classTeacher; // Reference to User.id (represented as String)

    @Builder.Default
    private int academicYear = java.time.Year.now().getValue();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
