CREATE TABLE `brand` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_slug_unique` ON `brand` (`slug`);--> statement-breakpoint
CREATE TABLE `cart` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`anonymous_token` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cart_user_idx` ON `cart` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cart_anonymous_token_unique` ON `cart` (`anonymous_token`);--> statement-breakpoint
CREATE TABLE `cart_item` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_item_variant_unique` ON `cart_item` (`cart_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `cart_item_cart_idx` ON `cart_item` (`cart_id`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE TABLE `iem_spec` (
	`product_id` text PRIMARY KEY NOT NULL,
	`driver_type` text,
	`driver_config` text,
	`impedance_ohms` integer,
	`sensitivity_db` text,
	`frequency_response` text,
	`connector` text,
	`cable` text,
	`mic` integer,
	`shell_material` text,
	`nozzle_material` text,
	`sound_signature` text,
	`fit` text,
	`included_accessories` text,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text,
	`customer_phone` text NOT NULL,
	`customer_name` text,
	`status` text NOT NULL,
	`subtotal_mnt` integer NOT NULL,
	`delivery_fee_mnt` integer NOT NULL,
	`total_mnt` integer NOT NULL,
	`address` text NOT NULL,
	`delivery_provider` text NOT NULL,
	`notes` text,
	`checkout_token` text NOT NULL,
	`ordered_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_number_unique` ON `order` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `order_checkout_token_unique` ON `order` (`checkout_token`);--> statement-breakpoint
CREATE INDEX `order_user_idx` ON `order` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_customer_phone_idx` ON `order` (`customer_phone`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `order_created_at_idx` ON `order` (`created_at`);--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`sku` text NOT NULL,
	`unit_price_mnt` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_mnt` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `order_item_order_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_item_product_idx` ON `order_item` (`product_id`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_number` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`qpay_invoice_id` text,
	`qpay_qr_text` text,
	`qpay_qr_image` text,
	`qpay_urls_json` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_number_unique` ON `payment` (`payment_number`);--> statement-breakpoint
CREATE INDEX `payment_order_idx` ON `payment` (`order_id`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `payment` (`status`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`brand_id` text,
	`name` text NOT NULL,
	`short_description` text,
	`description` text,
	`status` text NOT NULL,
	`base_price_mnt` integer NOT NULL,
	`compare_at_price_mnt` integer,
	`currency` text NOT NULL,
	`featured` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `product_brand_idx` ON `product` (`brand_id`);--> statement-breakpoint
CREATE TABLE `product_category` (
	`product_id` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_category_unique` ON `product_category` (`product_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `product_category_category_idx` ON `product_category` (`category_id`);--> statement-breakpoint
CREATE TABLE `product_image` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`r2_key` text,
	`url` text NOT NULL,
	`alt` text,
	`sort_order` integer NOT NULL,
	`is_primary` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_image_product_idx` ON `product_image` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_image_primary_idx` ON `product_image` (`product_id`,`is_primary`);--> statement-breakpoint
CREATE TABLE `product_variant` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`price_mnt` integer NOT NULL,
	`compare_at_price_mnt` integer,
	`stock_quantity` integer NOT NULL,
	`reserved_quantity` integer NOT NULL,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variant_product_idx` ON `product_variant` (`product_id`);