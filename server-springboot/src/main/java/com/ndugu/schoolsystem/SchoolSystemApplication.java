package com.ndugu.schoolsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SchoolSystemApplication {

	public static void main(String[] eloquenceArgs) {
		SpringApplication.run(SchoolSystemApplication.class, eloquenceArgs);
	}
}
