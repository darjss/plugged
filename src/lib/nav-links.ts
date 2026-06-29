/**
 * Primary storefront nav links — shared by the desktop header
 * (server-rendered Astro) and the mobile menu (SolidJS island).
 */
export const NAV_LINKS = [
  { label: "IEMs", href: "/products?category=iems" },
  { label: "DAC amps", href: "/products?category=dac-amps" },
  { label: "Wireless", href: "/products?category=wireless" },
  { label: "All products", href: "/products" },
] as const;
