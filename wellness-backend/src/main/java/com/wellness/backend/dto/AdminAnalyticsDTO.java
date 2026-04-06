package com.wellness.backend.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AdminAnalyticsDTO {

    // KPI Cards
    private long totalUsers;
    private long totalPractitioners;
    private long totalPatients;
    private long totalSellers;
    private long totalOrders;
    private long totalSessions;
    private BigDecimal totalRevenue;
    private BigDecimal platformEarnings;

    // Trend data for charts
    private List<MonthlyStat> userGrowth;
    private List<MonthlyStat> sessionTrend;
    private List<MonthlyStat> orderTrend;
    private List<MonthlyStat> revenueTrend;

    // Breakdowns for pie/donut charts
    private Map<String, Long> usersByRole;
    private Map<String, Long> sessionsByStatus;
    private Map<String, Long> ordersByStatus;
    private Map<String, Long> ordersByPaymentStatus;

    // Top performers
    private List<TopPractitioner> topPractitioners;

    // --- Inner Classes ---

    public static class MonthlyStat {
        private String month;
        private long count;
        private BigDecimal amount;

        public MonthlyStat() {}

        public MonthlyStat(String month, long count, BigDecimal amount) {
            this.month = month;
            this.count = count;
            this.amount = amount;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    public static class TopPractitioner {
        private String name;
        private String specialization;
        private long completedSessions;
        private BigDecimal totalEarnings;

        public TopPractitioner() {}

        public TopPractitioner(String name, String specialization, long completedSessions, BigDecimal totalEarnings) {
            this.name = name;
            this.specialization = specialization;
            this.completedSessions = completedSessions;
            this.totalEarnings = totalEarnings;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getSpecialization() { return specialization; }
        public void setSpecialization(String specialization) { this.specialization = specialization; }
        public long getCompletedSessions() { return completedSessions; }
        public void setCompletedSessions(long completedSessions) { this.completedSessions = completedSessions; }
        public BigDecimal getTotalEarnings() { return totalEarnings; }
        public void setTotalEarnings(BigDecimal totalEarnings) { this.totalEarnings = totalEarnings; }
    }

    // --- Getters & Setters ---

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalPractitioners() { return totalPractitioners; }
    public void setTotalPractitioners(long totalPractitioners) { this.totalPractitioners = totalPractitioners; }

    public long getTotalPatients() { return totalPatients; }
    public void setTotalPatients(long totalPatients) { this.totalPatients = totalPatients; }

    public long getTotalSellers() { return totalSellers; }
    public void setTotalSellers(long totalSellers) { this.totalSellers = totalSellers; }

    public long getTotalOrders() { return totalOrders; }
    public void setTotalOrders(long totalOrders) { this.totalOrders = totalOrders; }

    public long getTotalSessions() { return totalSessions; }
    public void setTotalSessions(long totalSessions) { this.totalSessions = totalSessions; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getPlatformEarnings() { return platformEarnings; }
    public void setPlatformEarnings(BigDecimal platformEarnings) { this.platformEarnings = platformEarnings; }

    public List<MonthlyStat> getUserGrowth() { return userGrowth; }
    public void setUserGrowth(List<MonthlyStat> userGrowth) { this.userGrowth = userGrowth; }

    public List<MonthlyStat> getSessionTrend() { return sessionTrend; }
    public void setSessionTrend(List<MonthlyStat> sessionTrend) { this.sessionTrend = sessionTrend; }

    public List<MonthlyStat> getOrderTrend() { return orderTrend; }
    public void setOrderTrend(List<MonthlyStat> orderTrend) { this.orderTrend = orderTrend; }

    public List<MonthlyStat> getRevenueTrend() { return revenueTrend; }
    public void setRevenueTrend(List<MonthlyStat> revenueTrend) { this.revenueTrend = revenueTrend; }

    public Map<String, Long> getUsersByRole() { return usersByRole; }
    public void setUsersByRole(Map<String, Long> usersByRole) { this.usersByRole = usersByRole; }

    public Map<String, Long> getSessionsByStatus() { return sessionsByStatus; }
    public void setSessionsByStatus(Map<String, Long> sessionsByStatus) { this.sessionsByStatus = sessionsByStatus; }

    public Map<String, Long> getOrdersByStatus() { return ordersByStatus; }
    public void setOrdersByStatus(Map<String, Long> ordersByStatus) { this.ordersByStatus = ordersByStatus; }

    public Map<String, Long> getOrdersByPaymentStatus() { return ordersByPaymentStatus; }
    public void setOrdersByPaymentStatus(Map<String, Long> ordersByPaymentStatus) { this.ordersByPaymentStatus = ordersByPaymentStatus; }

    public List<TopPractitioner> getTopPractitioners() { return topPractitioners; }
    public void setTopPractitioners(List<TopPractitioner> topPractitioners) { this.topPractitioners = topPractitioners; }
}
