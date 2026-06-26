import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const productStatuses = ["draft", "active", "archived"] as const;
export const orderStatuses = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export const paymentProviders = ["qpay", "transfer", "cash"] as const;
export const paymentStatuses = ["pending", "customer_claimed_paid", "success", "failed"] as const;
export const deliveryProviders = ["tu-delivery", "self", "avidaa", "pick-up"] as const;
export const deliveryFeeMnt = 6000;

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: integer("phone_number_verified", { mode: "boolean" }),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const brand = sqliteTable(
  "brand",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    websiteUrl: text("website_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("brand_slug_unique").on(table.slug)],
);

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("category_slug_unique").on(table.slug)],
);

export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    brandId: text("brand_id").references(() => brand.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    status: text("status", { enum: productStatuses }).notNull(),
    basePriceMnt: integer("base_price_mnt").notNull(),
    compareAtPriceMnt: integer("compare_at_price_mnt"),
    currency: text("currency").notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull(),
    oldSlugs: text("old_slugs"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("product_slug_unique").on(table.slug),
    index("product_status_idx").on(table.status),
    index("product_brand_idx").on(table.brandId),
  ],
);

export const productCategory = sqliteTable(
  "product_category",
  {
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("product_category_unique").on(table.productId, table.categoryId),
    index("product_category_category_idx").on(table.categoryId),
  ],
);

export const productImage = sqliteTable(
  "product_image",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    r2Key: text("r2_key"),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("product_image_product_idx").on(table.productId),
    index("product_image_primary_idx").on(table.productId, table.isPrimary),
  ],
);

export const productVariant = sqliteTable(
  "product_variant",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    priceMnt: integer("price_mnt").notNull(),
    compareAtPriceMnt: integer("compare_at_price_mnt"),
    stockQuantity: integer("stock_quantity").notNull(),
    reservedQuantity: integer("reserved_quantity").notNull(),
    active: integer("active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("product_variant_sku_unique").on(table.sku),
    index("product_variant_product_idx").on(table.productId),
  ],
);

export const iemSpec = sqliteTable("iem_spec", {
  productId: text("product_id")
    .primaryKey()
    .references(() => product.id, { onDelete: "cascade" }),
  driverType: text("driver_type"),
  driverConfig: text("driver_config"),
  impedanceOhms: integer("impedance_ohms"),
  sensitivityDb: text("sensitivity_db"),
  frequencyResponse: text("frequency_response"),
  connector: text("connector"),
  cable: text("cable"),
  mic: integer("mic", { mode: "boolean" }),
  shellMaterial: text("shell_material"),
  nozzleMaterial: text("nozzle_material"),
  soundSignature: text("sound_signature"),
  fit: text("fit"),
  includedAccessories: text("included_accessories"),
  squiglinkFile: text("squiglink_file"),
});

export const cart = sqliteTable(
  "cart",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    anonymousToken: text("anonymous_token"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
  },
  (table) => [
    index("cart_user_idx").on(table.userId),
    uniqueIndex("cart_anonymous_token_unique").on(table.anonymousToken),
  ],
);

export const cartItem = sqliteTable(
  "cart_item",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("cart_item_variant_unique").on(table.cartId, table.variantId),
    index("cart_item_cart_idx").on(table.cartId),
  ],
);

export const order = sqliteTable(
  "order",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    customerPhone: text("customer_phone").notNull(),
    customerName: text("customer_name"),
    status: text("status", { enum: orderStatuses }).notNull(),
    subtotalMnt: integer("subtotal_mnt").notNull(),
    deliveryFeeMnt: integer("delivery_fee_mnt").notNull(),
    totalMnt: integer("total_mnt").notNull(),
    address: text("address").notNull(),
    deliveryProvider: text("delivery_provider", { enum: deliveryProviders }).notNull(),
    notes: text("notes"),
    checkoutToken: text("checkout_token").notNull(),
    orderedAt: integer("ordered_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("order_number_unique").on(table.orderNumber),
    uniqueIndex("order_checkout_token_unique").on(table.checkoutToken),
    index("order_user_idx").on(table.userId),
    index("order_customer_phone_idx").on(table.customerPhone),
    index("order_status_idx").on(table.status),
    index("order_created_at_idx").on(table.createdAt),
  ],
);

export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    sku: text("sku").notNull(),
    unitPriceMnt: integer("unit_price_mnt").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMnt: integer("line_total_mnt").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("order_item_order_idx").on(table.orderId),
    index("order_item_product_idx").on(table.productId),
  ],
);

export const payment = sqliteTable(
  "payment",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    paymentNumber: text("payment_number").notNull(),
    provider: text("provider", { enum: paymentProviders }).notNull(),
    status: text("status", { enum: paymentStatuses }).notNull(),
    amountMnt: integer("amount_mnt").notNull(),
    qpayInvoiceId: text("qpay_invoice_id"),
    qpayQrText: text("qpay_qr_text"),
    qpayQrImage: text("qpay_qr_image"),
    qpayUrlsJson: text("qpay_urls_json"),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("payment_number_unique").on(table.paymentNumber),
    index("payment_order_idx").on(table.orderId),
    index("payment_status_idx").on(table.status),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  carts: many(cart),
  orders: many(order),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const brandRelations = relations(brand, ({ many }) => ({
  products: many(product),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  productCategories: many(productCategory),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  brand: one(brand, {
    fields: [product.brandId],
    references: [brand.id],
  }),
  categories: many(productCategory),
  images: many(productImage),
  variants: many(productVariant),
  iemSpec: one(iemSpec, {
    fields: [product.id],
    references: [iemSpec.productId],
  }),
  cartItems: many(cartItem),
  orderItems: many(orderItem),
}));

export const productCategoryRelations = relations(productCategory, ({ one }) => ({
  product: one(product, {
    fields: [productCategory.productId],
    references: [product.id],
  }),
  category: one(category, {
    fields: [productCategory.categoryId],
    references: [category.id],
  }),
}));

export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id],
  }),
}));

export const productVariantRelations = relations(productVariant, ({ one, many }) => ({
  product: one(product, {
    fields: [productVariant.productId],
    references: [product.id],
  }),
  cartItems: many(cartItem),
  orderItems: many(orderItem),
}));

export const iemSpecRelations = relations(iemSpec, ({ one }) => ({
  product: one(product, {
    fields: [iemSpec.productId],
    references: [product.id],
  }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(user, {
    fields: [cart.userId],
    references: [user.id],
  }),
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id],
  }),
  product: one(product, {
    fields: [cartItem.productId],
    references: [product.id],
  }),
  variant: one(productVariant, {
    fields: [cartItem.variantId],
    references: [productVariant.id],
  }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  items: many(orderItem),
  payments: many(payment),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
  variant: one(productVariant, {
    fields: [orderItem.variantId],
    references: [productVariant.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  order: one(order, {
    fields: [payment.orderId],
    references: [order.id],
  }),
}));
