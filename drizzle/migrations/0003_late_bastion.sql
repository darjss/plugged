ALTER TABLE `iem_spec` ADD `squiglink_file` text;--> statement-breakpoint
ALTER TABLE `product` ADD `old_slugs` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `user` SET `is_admin` = 1 WHERE `id` IN (SELECT `user_id` FROM `account` WHERE `provider_id` = 'google' AND `account_id` = '118271302696111351988');