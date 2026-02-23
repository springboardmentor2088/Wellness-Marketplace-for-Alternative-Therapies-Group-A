CREATE DATABASE IF NOT EXISTS wellness_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wellness_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1️⃣ USERS (Parent Table)

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('PATIENT','PRACTITIONER','ADMIN') NOT NULL,
  bio TEXT,
  phone VARCHAR(20) UNIQUE,
  date_of_birth DATE,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB;


-- 2️⃣ PRODUCT (Independent)

DROP TABLE IF EXISTS product;
CREATE TABLE product (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100) NOT NULL,
  stock INT NOT NULL CHECK (stock >= 0),
  PRIMARY KEY (id)
) ENGINE=InnoDB;


-- 3️⃣ PRACTITIONER PROFILE

DROP TABLE IF EXISTS practitioner_profile;
CREATE TABLE practitioner_profile (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  specialization VARCHAR(150) NOT NULL,
  verified TINYINT(1) DEFAULT 0,
  rating FLOAT DEFAULT 0,
  qualifications TEXT,
  experience VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id),
  CONSTRAINT fk_practitioner_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 4️⃣ QUESTION

DROP TABLE IF EXISTS question;
CREATE TABLE question (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_question_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 5️⃣ ORDERS

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('placed','shipped','delivered','cancelled') DEFAULT 'placed',
  PRIMARY KEY (id),
  CONSTRAINT fk_order_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 6️⃣ THERAPY SESSION

DROP TABLE IF EXISTS therapy_session;
CREATE TABLE therapy_session (
  id INT NOT NULL AUTO_INCREMENT,
  practitioner_id INT NOT NULL,
  user_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  session_type ENUM('ONLINE','OFFLINE') DEFAULT 'ONLINE',
  meeting_link VARCHAR(500),
  status ENUM('BOOKED','CONFIRMED','COMPLETED','CANCELLED','RESCHEDULED') DEFAULT 'BOOKED',
  payment_status ENUM('PENDING','PAID','REFUNDED') DEFAULT 'PENDING',
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by ENUM('USER','PRACTITIONER','ADMIN'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_session_practitioner
    FOREIGN KEY (practitioner_id) REFERENCES practitioner_profile(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 6️⃣b PRACTITIONER AVAILABILITY

DROP TABLE IF EXISTS practitioner_availability;
CREATE TABLE practitioner_availability (
  id INT NOT NULL AUTO_INCREMENT,
  practitioner_id INT NOT NULL,
  day_of_week ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT NOT NULL DEFAULT 60,
  is_available TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY unique_practitioner_day (practitioner_id, day_of_week),
  CONSTRAINT fk_avail_practitioner
    FOREIGN KEY (practitioner_id) REFERENCES practitioner_profile(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 7️⃣ RECOMMENDATION

DROP TABLE IF EXISTS recommendation;
CREATE TABLE recommendation (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  symptom TEXT NOT NULL,
  suggested_therapy VARCHAR(255) NOT NULL,
  source_api VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_recommendation_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 8️⃣ NOTIFICATION

DROP TABLE IF EXISTS notification;
CREATE TABLE notification (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('read','unread') DEFAULT 'unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 9️⃣ ORDER ITEM

DROP TABLE IF EXISTS order_item;
CREATE TABLE order_item (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_item_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_item_product
    FOREIGN KEY (product_id) REFERENCES product(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 🔟 REVIEW

DROP TABLE IF EXISTS review;
CREATE TABLE review (
  id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  practitioner_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_session_review (session_id),
  CONSTRAINT fk_review_session
    FOREIGN KEY (session_id) REFERENCES therapy_session(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_review_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_review_practitioner
    FOREIGN KEY (practitioner_id) REFERENCES practitioner_profile(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 1️⃣1️⃣ ANSWER (Last because depends on question & practitioner)

DROP TABLE IF EXISTS answer;
CREATE TABLE answer (
  id INT NOT NULL AUTO_INCREMENT,
  question_id INT NOT NULL,
  practitioner_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_answer_question
    FOREIGN KEY (question_id) REFERENCES question(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_answer_practitioner
    FOREIGN KEY (practitioner_id) REFERENCES practitioner_profile(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 1️⃣2️⃣ PRACTITIONER REQUEST (Requests from patients to practitioners)

DROP TABLE IF EXISTS practitioner_request;
CREATE TABLE practitioner_request (
  id INT NOT NULL AUTO_INCREMENT,
  practitioner_id INT NOT NULL,
  user_id INT NOT NULL,
  description TEXT,
  status ENUM('pending','accepted','rejected','completed','cancelled') DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_request_practitioner
    FOREIGN KEY (practitioner_id) REFERENCES practitioner_profile(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_request_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
