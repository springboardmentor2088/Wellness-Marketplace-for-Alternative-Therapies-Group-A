package com.wellness.backend.controller;

import com.wellness.backend.enums.ProductModerationStatus;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.ProductSellerProfile;
import com.wellness.backend.service.ProductSellerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/admin/moderation")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModerationController {

    @Autowired
    private ProductSellerService sellerService;

    @GetMapping("/sellers/pending")
    public ResponseEntity<List<ProductSellerProfile>> getPendingSellers() {
        return ResponseEntity.ok(sellerService.getPendingSellers());
    }

    @PutMapping("/sellers/{id}/approve")
    public ResponseEntity<ProductSellerProfile> approveSeller(@PathVariable Integer id) {
        return ResponseEntity.ok(sellerService.approveSeller(id));
    }

    @GetMapping("/products/pending")
    public ResponseEntity<List<Product>> getPendingProducts() {
        return ResponseEntity.ok(sellerService.getPendingProducts());
    }

    @PutMapping("/products/{id}/status")
    public ResponseEntity<Product> moderateProduct(
            @PathVariable Integer id, 
            @RequestParam ProductModerationStatus status) {
        return ResponseEntity.ok(sellerService.moderateProduct(id, status));
    }

    @PutMapping("/products/{id}/stock")
    public ResponseEntity<Product> updateStock(@PathVariable Integer id, @RequestParam Integer stock) {
        return ResponseEntity.ok(sellerService.updateProductStock(id, stock));
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam String path) throws IOException {
        Path filePath = Paths.get(path);
        Resource resource = new UrlResource(filePath.toUri());
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
            .body(resource);
    }
}
