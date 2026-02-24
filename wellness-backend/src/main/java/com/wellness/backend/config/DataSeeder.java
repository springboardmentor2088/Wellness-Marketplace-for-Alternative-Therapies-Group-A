package com.wellness.backend.config;

import com.wellness.backend.model.User;
import com.wellness.backend.model.Product;
import com.wellness.backend.repository.UserRepository;
import com.wellness.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Seeds initial data (like admin user and products) on application startup
 */
@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        createAdminUserIfNotExists();
        createSampleProductsIfNotExists();
    }

    private void createAdminUserIfNotExists() {
        // Check if admin user already exists
        if (userRepository.existsByEmail("admin@wellness.com")) {
            System.out.println("Admin user already exists");
            return;
        }

        // Create admin user
        User adminUser = new User();
        adminUser.setName("Admin");
        adminUser.setEmail("admin@wellness.com");
        adminUser.setPassword(passwordEncoder.encode("admin123"));
        adminUser.setRole(User.Role.ADMIN);
        adminUser.setBio("System Administrator");

        userRepository.save(adminUser);
        System.out.println("✓ Admin user created successfully!");
        System.out.println("  Email: admin@wellness.com");
        System.out.println("  Password: admin123");
    }

    private void createSampleProductsIfNotExists() {
        // Check if products already exist
        long productCount = productRepository.count();
        if (productCount > 0) {
            System.out.println("Products already exist in database");
            return;
        }

        // Create sample products
        Product[] products = {
            // Ayurvedic
            new Product("Ashwagandha Powder", "100% pure ashwagandha root powder for stress relief and immunity", new BigDecimal("299"), "Ayurvedic", 50),
            new Product("Brahmi Oil", "Organic brahmi oil for hair and scalp health", new BigDecimal("399"), "Ayurvedic", 30),
            new Product("Triphala Tablets", "Traditional mix of three fruits for digestive health", new BigDecimal("199"), "Ayurvedic", 100),
            new Product("Neem Leaves", "Dried neem leaves for detoxification", new BigDecimal("149"), "Ayurvedic", 75),

            // Herbal
            new Product("Green Tea Extract", "Antioxidant-rich green tea supplement", new BigDecimal("349"), "Herbal", 40),
            new Product("Ginger Root Tea", "Organic ginger root for immunity and digestion", new BigDecimal("179"), "Herbal", 60),
            new Product("Turmeric Curcumin", "High potency turmeric with curcumin", new BigDecimal("449"), "Herbal", 35),
            new Product("Holy Basil (Tulsi)", "Organic tulsi leaves for respiratory health", new BigDecimal("229"), "Herbal", 50),

            // Supplements
            new Product("Vitamin D3 Capsules", "1000 IU Vitamin D3 for bone health", new BigDecimal("299"), "Supplements", 100),
            new Product("Vitamin B12 Complex", "Complete B-complex vitamin supplement", new BigDecimal("349"), "Supplements", 80),
            new Product("Omega-3 Fish Oil", "Premium fish oil for heart health", new BigDecimal("449"), "Supplements", 45),
            new Product("Probiotic Yogurt", "Live probiotic cultures for gut health", new BigDecimal("129"), "Supplements", 120),

            // Massage Oils
            new Product("Coconut Oil - Organic", "Pure organic coconut oil for massage and cooking", new BigDecimal("199"), "Massage Oils", 70),
            new Product("Sesame Oil - Unrefined", "Cold-pressed sesame oil for warming massage", new BigDecimal("249"), "Massage Oils", 55),
            new Product("Eucalyptus Oil", "Pure eucalyptus essential oil for pain relief", new BigDecimal("349"), "Massage Oils", 40),
            new Product("Lavender Oil", "Calming lavender oil for relaxation massage", new BigDecimal("299"), "Massage Oils", 50),

            // Yoga & Fitness
            new Product("Yoga Mat - Premium", "Non-slip yoga mat with carrying strap", new BigDecimal("1499"), "Yoga & Fitness", 25),
            new Product("Meditation Cushion", "Ergonomic meditation cushion for comfort", new BigDecimal("799"), "Yoga & Fitness", 20),
            new Product("Foam Roller", "Deep tissue massage foam roller", new BigDecimal("699"), "Yoga & Fitness", 35),
            new Product("Resistance Bands Set", "Set of 5 resistance bands for strength training", new BigDecimal("399"), "Yoga & Fitness", 45)
        };

        for (Product product : products) {
            productRepository.save(product);
        }

        System.out.println("✓ " + products.length + " sample products created successfully!");
    }
}

