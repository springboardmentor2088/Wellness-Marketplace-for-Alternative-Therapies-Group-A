package com.wellness.backend.repository;

import com.wellness.backend.model.SellerEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SellerEarningRepository extends JpaRepository<SellerEarning, Integer> {
    
    List<SellerEarning> findBySeller_Id(Integer sellerId);
    
    @Query("SELECT COALESCE(SUM(e.platformFee), 0) FROM SellerEarning e")
    BigDecimal sumTotalPlatformFees();

    List<SellerEarning> findByOrder_Id(Integer orderId);
}
