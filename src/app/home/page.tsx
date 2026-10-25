import Link from "next/link";

const characterNames = ["Ved Vyasa", "Krishna", "Arjuna", "Shiva"];

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path d="M4 13v6M9 8v16M14 4v24M19 10v12M24 7v18M29 13v6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

export default function MainPage() {
  return (
    <main className="home-screen">
      <div aria-hidden="true" className="home-screen__shade" />
      <header className="home-header">
        <Link aria-label="MarsVidya home" className="home-brand" href="/home">
          <span className="home-brand__mark">M</span><span>MarsVidya</span>
        </Link>
        <Link aria-label="Sign out and return to sign in" className="home-profile" href="/">
          <ProfileIcon />
        </Link>
      </header>

      <section aria-labelledby="home-title" className="home-copy">
        <p className="home-copy__eyebrow">YOUR STORY STARTS HERE</p>
        <h1 id="home-title">Talk with your favourite characters</h1>
        <p>Explore. Learn. Grow. Anytime.</p>
      </section>

      <aside aria-label="Characters to explore" className="home-characters">
        {characterNames.map((name, index) => (
          <div className={`home-character home-character--${index + 1}`} key={name}>
            <span aria-hidden="true" className="home-character__portrait" />
            <span className="home-character__name">{name}</span>
          </div>
        ))}
        <span aria-hidden="true" className="home-character home-character--add">+</span>
      </aside>

      <div className="home-action">
        <Link aria-label="Start speaking with Krishna" className="home-mic" href="/practice">
          <SoundIcon />
        </Link>
        <Link className="home-action__label" href="/practice">Start speaking</Link>
      </div>
    </main>
  );
}
