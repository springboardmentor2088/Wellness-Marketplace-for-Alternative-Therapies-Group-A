package com.wellness.backend.repository;

import com.wellness.backend.model.ProductSellerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ProductSellerRepository extends JpaRepository<ProductSellerProfile, Integer> {
    Optional<ProductSellerProfile> findByUser_Id(Integer userId);
    Optional<ProductSellerProfile> findByDrugLicenseNumber(String drugLicenseNumber);
}
