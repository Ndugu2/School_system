package com.ndugu.schoolsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "students")
public class Student {

    @Id
    private String id;

    private String user; // Reference to User.id (ObjectId represented as String)

    @Indexed(unique = true)
    private String studentId;

    private String clazz; // 'class' is a reserved keyword in Java; reference to Class.id (represented as String)

    private LocalDate dob;

    private String gender; // 'Male', 'Female'

    @Builder.Default
    private LocalDate enrollmentDate = LocalDate.now();

    private String parentName;

    private String parentPhone;

    private String parentEmail;

    private String parentUser; // Reference to parent User.id (represented as String)

    private String address;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
