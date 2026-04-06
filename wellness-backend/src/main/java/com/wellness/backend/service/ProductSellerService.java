package com.wellness.backend.service;

import com.wellness.backend.dto.ProductDTO;
import com.wellness.backend.dto.SellerApplicationDTO;
import com.wellness.backend.enums.ProductModerationStatus;
import com.wellness.backend.enums.SellerVerificationStatus;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.ProductSellerProfile;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.ProductRepository;
import com.wellness.backend.repository.ProductSellerRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductSellerService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductSellerRepository sellerRepository;

    @Autowired
    private UserRepository userRepository;

    private final String UPLOAD_DIR = "uploads/seller_docs/";
    private final String PRODUCT_IMG_DIR = "uploads/products/";

    @Transactional
    public ProductSellerProfile applyForSellerRole(SellerApplicationDTO dto, 
                                                MultipartFile gmp, 
                                                MultipartFile copp, 
                                                MultipartFile smf, 
                                                String userEmail) throws IOException {
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProductSellerProfile profile = sellerRepository.findByUser_Id(user.getId())
                .orElse(new ProductSellerProfile());

        profile.setUser(user);
        profile.setOrganizationName(dto.getOrganizationName());
        profile.setDrugLicenseNumber(dto.getDrugLicenseNumber());
        profile.setPharmacistName(dto.getPharmacistName());
        profile.setPharmacistRegNum(dto.getPharmacistRegNum());
        profile.setGstTaxId(dto.getGstTaxId());
        profile.setIecCode(dto.getIecCode());
        profile.setVerificationStatus(SellerVerificationStatus.PENDING_VERIFICATION);

        if (gmp != null && !gmp.isEmpty()) profile.setGmpCertificationUrl(saveFile(gmp));
        if (copp != null && !copp.isEmpty()) profile.setCoppUrl(saveFile(copp));
        if (smf != null && !smf.isEmpty()) profile.setSmfUrl(saveFile(smf));

        return sellerRepository.save(profile);
    }

    @Transactional
    public Product addProduct(Product product, MultipartFile img1, MultipartFile img2, String userEmail) throws IOException {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ProductSellerProfile seller = sellerRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Seller profile not found"));

        product.setSeller(seller);
        product.setModerationStatus(ProductModerationStatus.PENDING_REVIEW);

        if (img1 != null && !img1.isEmpty()) product.setImageUrl(saveProductImage(img1));
        if (img2 != null && !img2.isEmpty()) product.setImageUrl2(saveProductImage(img2));

        return productRepository.save(product);
    }

    public List<Product> getSellerProducts(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ProductSellerProfile seller = sellerRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Seller profile not found"));
        
        return productRepository.findBySeller_Id(seller.getId());
    }

    private String saveProductImage(MultipartFile file) throws IOException {
        Files.createDirectories(Paths.get(PRODUCT_IMG_DIR));
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path path = Paths.get(PRODUCT_IMG_DIR + fileName);
        Files.copy(file.getInputStream(), path);
        return path.toString();
    }

    private String saveFile(MultipartFile file) throws IOException {
        Files.createDirectories(Paths.get(UPLOAD_DIR));
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + fileName);
        Files.copy(file.getInputStream(), path);
        return path.toString();
    }

    @Transactional
    public ProductSellerProfile approveSeller(Integer profileId) {
        ProductSellerProfile profile = sellerRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        profile.setVerificationStatus(SellerVerificationStatus.APPROVED);
        profile.setVerified(true);
        
        User user = profile.getUser();
        user.setRole(User.Role.PRODUCT_SELLER);
        userRepository.save(user);

        return sellerRepository.save(profile);
    }

    public List<ProductSellerProfile> getPendingSellers() {
        return sellerRepository.findAll().stream()
                .filter(s -> s.getVerificationStatus() == SellerVerificationStatus.PENDING_VERIFICATION)
                .collect(Collectors.toList());
    }

    public List<Product> getPendingProducts() {
        return productRepository.findByModerationStatus(ProductModerationStatus.PENDING_REVIEW);
    }

    @Transactional
    public Product moderateProduct(Integer productId, ProductModerationStatus status) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        product.setModerationStatus(status);
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProductStock(Integer productId, Integer stock) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        product.setStock(stock);
        return productRepository.save(product);
    }
}
