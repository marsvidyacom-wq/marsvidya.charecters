"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const demoOtp = "1234";

export function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [message, setMessage] = useState("");

  function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phone.length !== 10) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }
    setMessage("");
    setOtp("");
    setStage("otp");
  }

  function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp !== demoOtp) {
      setMessage("That code is not correct. Try the demo OTP shown above.");
      return;
    }
    window.localStorage.setItem("marsvidya-demo-login", "verified");
    router.push("/home");
  }

  return (
    <main className="login-page">
      <div aria-hidden="true" className="login-page__shade" />
      <section aria-labelledby="login-title" className="login-card">
        <Link aria-label="MarsVidya home" className="login-brand" href="/">
          <span aria-hidden="true" className="login-brand__mark">M</span>
          <span>MarsVidya</span>
        </Link>

        <div className="login-copy">
          <p className="login-copy__eyebrow">LEARN THROUGH STORIES</p>
          <h1 id="login-title">Talk with your favourite characters</h1>
          <p className="login-copy__subtitle">Explore. Learn. Grow. Anytime.</p>
        </div>

        {stage === "phone" ? (
          <form className="login-form" onSubmit={requestOtp}>
            <label className="sr-only" htmlFor="mobile-number">Mobile number</label>
            <div className="login-phone-field">
              <span aria-label="Country code India, plus 91" className="login-phone-field__code">🇮🇳 <span>+91</span></span>
              <input
                autoComplete="tel-national"
                id="mobile-number"
                inputMode="numeric"
                maxLength={10}
                name="phone"
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                  setMessage("");
                }}
                pattern="[0-9]{10}"
                placeholder="Enter your mobile number"
                type="tel"
                value={phone}
              />
            </div>
            <button className="login-continue" type="submit">
              <span>Continue</span><span aria-hidden="true" className="login-continue__arrow">→</span>
            </button>
            <p aria-live="polite" className="login-message" role="status">{message}</p>
          </form>
        ) : (
          <form className="login-form login-form--otp" onSubmit={verifyOtp}>
            <div className="otp-heading">
              <button className="otp-edit-number" onClick={() => { setStage("phone"); setMessage(""); }} type="button">← Change number</button>
              <p>Enter the 4-digit code for <strong>+91 {phone}</strong></p>
            </div>
            <div className="demo-otp"><span>Demo OTP</span><strong>{demoOtp}</strong></div>
            <label className="sr-only" htmlFor="demo-otp-entry">Enter 4-digit OTP</label>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="otp-entry"
              id="demo-otp-entry"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 4));
                setMessage("");
              }}
              pattern="[0-9]{4}"
              placeholder="— — — —"
              value={otp}
            />
            <button className="login-continue" type="submit">
              <span>Verify &amp; continue</span><span aria-hidden="true" className="login-continue__arrow">→</span>
            </button>
            <p aria-live="polite" className="login-message" role="status">{message}</p>
          </form>
        )}

        <p className="login-legal">
          By continuing, you agree to our<br />
          <span>Terms of Service</span> and <span>Privacy Policy</span>.
        </p>
      </section>
    </main>
  );
}
