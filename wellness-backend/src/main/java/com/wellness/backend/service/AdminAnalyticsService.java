package com.wellness.backend.service;

import com.wellness.backend.dto.AdminAnalyticsDTO;
import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.Order;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminAnalyticsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TherapySessionRepository sessionRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DoctorEarningRepository earningRepository;

    @Autowired
    private com.wellness.backend.repository.SellerEarningRepository sellerEarningRepository;

    public AdminAnalyticsDTO getDashboardAnalytics() {
        AdminAnalyticsDTO dto = new AdminAnalyticsDTO();

        // --- KPI Cards ---
        dto.setTotalUsers(userRepository.count());
        dto.setTotalPatients(userRepository.countByRole(User.Role.PATIENT));
        dto.setTotalPractitioners(userRepository.countByRole(User.Role.PRACTITIONER));
        dto.setTotalSellers(userRepository.countByRole(User.Role.PRODUCT_SELLER));
        dto.setTotalSessions(sessionRepository.count());
        dto.setTotalOrders(orderRepository.count());

        BigDecimal sessionRevenue = sessionRepository.sumPaidSessionRevenue();
        BigDecimal orderRevenue = orderRepository.sumPaidOrderRevenue();
        dto.setTotalRevenue((sessionRevenue != null ? sessionRevenue : BigDecimal.ZERO)
                .add(orderRevenue != null ? orderRevenue : BigDecimal.ZERO));

        BigDecimal sessionPlatformFees = earningRepository.sumTotalPlatformFees();
        BigDecimal productPlatformFees = sellerEarningRepository.sumTotalPlatformFees();
        
        BigDecimal totalPlatformFees = (sessionPlatformFees != null ? sessionPlatformFees : BigDecimal.ZERO)
                .add(productPlatformFees != null ? productPlatformFees : BigDecimal.ZERO);
                
        dto.setPlatformEarnings(totalPlatformFees);

        // --- Monthly Trends ---
        dto.setUserGrowth(toMonthlyStats(userRepository.countUsersGroupedByMonth()));
        dto.setSessionTrend(toMonthlyStats(sessionRepository.countSessionsGroupedByMonth()));
        dto.setOrderTrend(toMonthlyStats(orderRepository.countOrdersGroupedByMonth()));
        dto.setRevenueTrend(toMonthlyStatsWithAmount(orderRepository.sumRevenueGroupedByMonth()));

        // --- Breakdowns ---
        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (User.Role role : User.Role.values()) {
            usersByRole.put(role.name(), userRepository.countByRole(role));
        }
        dto.setUsersByRole(usersByRole);

        Map<String, Long> sessionsByStatus = new LinkedHashMap<>();
        for (SessionStatus status : SessionStatus.values()) {
            sessionsByStatus.put(status.name(), sessionRepository.countByStatus(status));
        }
        dto.setSessionsByStatus(sessionsByStatus);

        Map<String, Long> ordersByStatus = new LinkedHashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            ordersByStatus.put(status.name(), orderRepository.countByStatus(status));
        }
        dto.setOrdersByStatus(ordersByStatus);

        Map<String, Long> ordersByPayment = new LinkedHashMap<>();
        for (PaymentStatus status : PaymentStatus.values()) {
            ordersByPayment.put(status.name(), orderRepository.countByPaymentStatus(status));
        }
        dto.setOrdersByPaymentStatus(ordersByPayment);

        // --- Top Practitioners ---
        List<Object[]> topRows = earningRepository.findTopEarningPractitioners(PageRequest.of(0, 5));
        List<AdminAnalyticsDTO.TopPractitioner> topList = topRows.stream().map(row -> {
            AdminAnalyticsDTO.TopPractitioner tp = new AdminAnalyticsDTO.TopPractitioner();
            tp.setName(row[1] != null ? row[1].toString() : "Unknown");
            tp.setSpecialization(row[2] != null ? row[2].toString() : "N/A");
            tp.setCompletedSessions(((Number) row[3]).longValue());
            tp.setTotalEarnings(row[4] != null ? new BigDecimal(row[4].toString()) : BigDecimal.ZERO);
            return tp;
        }).collect(Collectors.toList());
        dto.setTopPractitioners(topList);

        return dto;
    }

    private List<AdminAnalyticsDTO.MonthlyStat> toMonthlyStats(List<Object[]> rows) {
        return rows.stream().map(row -> new AdminAnalyticsDTO.MonthlyStat(
                row[0].toString(),
                ((Number) row[1]).longValue(),
                null
        )).collect(Collectors.toList());
    }

    private List<AdminAnalyticsDTO.MonthlyStat> toMonthlyStatsWithAmount(List<Object[]> rows) {
        return rows.stream().map(row -> new AdminAnalyticsDTO.MonthlyStat(
                row[0].toString(),
                0,
                row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO
        )).collect(Collectors.toList());
    }
}
