package com.wellness.backend;

import com.wellness.backend.model.User;
import com.wellness.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

@Component
public class TestRunner implements CommandLineRunner {
    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        try {
            java.io.FileWriter fw = new java.io.FileWriter("users.txt");
            java.io.PrintWriter pw = new java.io.PrintWriter(fw);
            pw.println("====== TEST RUNNER ======");
            userRepository.findAll().forEach(u -> {
                pw.println("USER: " + u.getEmail() + " | ROLE: " + u.getRole());
            });
            pw.println("=========================");
            pw.close();
        } catch (Exception e) {}
    }
}
