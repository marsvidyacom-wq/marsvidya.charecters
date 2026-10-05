import Link from "next/link";

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function MarsVidyaHeader() {
  return (
    <header className="site-header">
      <h1 className="wordmark">
        <Link href="/">
          <span aria-hidden="true" className="wordmark__orbit">
            M
          </span>
          <span>MarsVidya</span>
        </Link>
      </h1>
      <Link className="profile-link" href="/profile">
        <ProfileIcon />
        <span>Sign in</span>
      </Link>
    </header>
  );
}
