"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./TopNav.module.css";

const NAV_ITEMS = [
  { label: "Overview", href: "/overview" },
  { label: "Dossier", href: "/dossier" },
  { label: "Scorecard", href: "/scorecard" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.navLeft}>
        <Link href="/" className={styles.brand} aria-label="BaseRate Home">
          <div className={styles.brandIcon} aria-hidden="true">
            B
          </div>
          <span className={styles.brandText}>BaseRate</span>
        </Link>
        <div className={styles.navLinks}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navPill} ${isActive ? styles.navPillActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.navRight}>
        <div className={styles.searchPill} role="search" aria-label="Quick search">
          <span className={styles.searchText}>Search your desk</span>
          <kbd className={styles.searchKbd} title="CMD/K">⌘K</kbd>
        </div>
        <div className={styles.avatar} aria-label="User avatar: JE">
          JE
        </div>
      </div>
    </nav>
  );
}
