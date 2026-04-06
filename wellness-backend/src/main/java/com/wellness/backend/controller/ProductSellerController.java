package com.wellness.backend.controller;

import com.wellness.backend.dto.SellerApplicationDTO;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.ProductSellerProfile;
import com.wellness.backend.service.ProductSellerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/sellers")
public class ProductSellerController {

    @Autowired
    private ProductSellerService sellerService;

    @PostMapping("/onboarding")
    public ResponseEntity<ProductSellerProfile> applyForSellerRole(
            @RequestPart("data") SellerApplicationDTO dto,
            @RequestPart(value = "gmp", required = false) MultipartFile gmp,
            @RequestPart(value = "copp", required = false) MultipartFile copp,
            @RequestPart(value = "smf", required = false) MultipartFile smf,
            Authentication authentication) throws IOException {
        
        String userEmail = authentication.getName();
        ProductSellerProfile profile = sellerService.applyForSellerRole(dto, gmp, copp, smf, userEmail);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/products")
    public ResponseEntity<Product> addProduct(
            @RequestPart("product") String productJson,
            @RequestPart(value = "img1", required = false) MultipartFile img1,
            @RequestPart(value = "img2", required = false) MultipartFile img2,
            Authentication authentication) throws IOException {
        
        ObjectMapper mapper = new ObjectMapper();
        Product product = mapper.readValue(productJson, Product.class);
        String userEmail = authentication.getName();
        
        return ResponseEntity.ok(sellerService.addProduct(product, img1, img2, userEmail));
    }

    @GetMapping("/my-products")
    public ResponseEntity<List<Product>> getMyProducts(Authentication authentication) {
        return ResponseEntity.ok(sellerService.getSellerProducts(authentication.getName()));
    }
}
