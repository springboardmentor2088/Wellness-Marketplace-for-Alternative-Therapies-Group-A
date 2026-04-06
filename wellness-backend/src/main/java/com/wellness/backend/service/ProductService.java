package com.wellness.backend.service;

import com.wellness.backend.dto.ProductDTO;
import com.wellness.backend.enums.ProductModerationStatus;
import com.wellness.backend.model.Product;
import com.wellness.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    // ================= GET ALL ACTIVE PRODUCTS =================
    @Transactional(readOnly = true)
    public List<ProductDTO> getAllProducts() {
        return productRepository.findByModerationStatus(ProductModerationStatus.ACTIVE)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET PRODUCT BY ID =================
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return mapToDTO(product);
    }

    // ================= GET PRODUCTS BY CATEGORY =================
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByCategory(String category) {
        return productRepository.findByCategory(category)
                .stream()
                .filter(p -> p.getModerationStatus() == ProductModerationStatus.ACTIVE)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= SEARCH PRODUCTS =================
    @Transactional(readOnly = true)
    public List<ProductDTO> searchProducts(String query) {
        return productRepository.searchByName(query)
                .stream()
                .filter(p -> p.getModerationStatus() == ProductModerationStatus.ACTIVE)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= SEARCH BY GENERIC SYNONYMS =================
    @Transactional(readOnly = true)
    public List<ProductDTO> findGenericMatches(List<String> synonyms, String primaryQuery) {
        return productRepository.findBySynonyms(synonyms, primaryQuery)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET AVAILABLE PRODUCTS =================
    @Transactional(readOnly = true)
    public List<ProductDTO> getAvailableProducts() {
        return productRepository.findByStockGreaterThan(0)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= CREATE PRODUCT (Admin only) =================
    @Transactional
    public ProductDTO createProduct(ProductDTO dto) {
        Product product = new Product();
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setCategory(dto.getCategory());
        product.setStock(dto.getStock());
        product.setImageUrl(dto.getImageUrl());
        product.setImageUrl2(dto.getImageUrl2());
        product.setActiveIngredient(dto.getActiveIngredient());
        product.setModerationStatus(ProductModerationStatus.ACTIVE);

        Product saved = productRepository.save(product);
        return mapToDTO(saved);
    }

    // ================= UPDATE PRODUCT (Admin only) =================
    @Transactional
    public ProductDTO updateProduct(Integer id, ProductDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getCategory() != null) product.setCategory(dto.getCategory());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getImageUrl() != null) product.setImageUrl(dto.getImageUrl());
        if (dto.getImageUrl2() != null) product.setImageUrl2(dto.getImageUrl2());
        if (dto.getActiveIngredient() != null) product.setActiveIngredient(dto.getActiveIngredient());
        product.setModerationStatus(ProductModerationStatus.ACTIVE);

        Product updated = productRepository.save(product);
        return mapToDTO(updated);
    }

    // ================= DELETE PRODUCT (Admin only) =================
    @Transactional
    public void deleteProduct(Integer id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found");
        }
        productRepository.deleteById(id);
    }

    // ================= MAP TO DTO =================
    private ProductDTO mapToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setCategory(product.getCategory());
        dto.setStock(product.getStock());
        dto.setAvailable(product.getStock() > 0);
        dto.setImageUrl(product.getImageUrl());
        dto.setImageUrl2(product.getImageUrl2());
        dto.setActiveIngredient(product.getActiveIngredient());
        dto.setModerationStatus(product.getModerationStatus() != null ? product.getModerationStatus().name() : null);
        if (product.getSeller() != null) {
            dto.setSellerId(product.getSeller().getId());
        }
        return dto;
    }
}
