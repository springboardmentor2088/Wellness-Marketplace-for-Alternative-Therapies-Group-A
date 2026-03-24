ALTER TABLE practitioner_request MODIFY COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE practitioner_request MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE practitioner_availability MODIFY COLUMN day_of_week VARCHAR(20) NOT NULL;
ALTER TABLE therapy_session MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'BOOKED';
ALTER TABLE therapy_session MODIFY COLUMN session_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE';
ALTER TABLE therapy_session MODIFY COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE therapy_session MODIFY COLUMN cancelled_by VARCHAR(20);

-- Data-safe incremental updates for Practitioner Profile
ALTER TABLE practitioner_profile ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION';
ALTER TABLE practitioner_profile ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2);
ALTER TABLE practitioner_profile ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Data-safe incremental updates for Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATETIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_partner VARCHAR(100);



