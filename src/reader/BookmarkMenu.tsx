import Link from "next/link";
import { ThemeProvider } from "@/components/site/ThemeProvider";

export function BookmarkMenu() {
  return (
    <>
      <ThemeProvider />
      <nav className="bookmark-menu">
        <ul className="menu-list">
          <li>
            <Link href="/bookmarks">My Books</Link>
          </li>
          <li>
            <Link href="/saved">Saved</Link>
          </li>
          <li>
            <Link href="/unread">Unread</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
