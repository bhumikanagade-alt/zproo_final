import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Register3.css";
import {
  getNameError,
  isValidEmail,
  isValidMobile,
  isValidOtp,
  isValidPassword,
  MOBILE_ERROR,
  EMAIL_ERROR,
  OTP_ERROR,
  PASSWORD_ERROR,
} from "../utils/validation";

type RegisterMethod = "email" | "phone";
type ActivePasswordField = "password" | "confirm" | null;

export default function Register3() {
  const navigate = useNavigate();

  const [method, setMethod] = useState<RegisterMethod>("email");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [activePasswordField, setActivePasswordField] =
    useState<ActivePasswordField>(null);

  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    =====================================================
    PASSWORD MASCOT STATE
    =====================================================
  */

  const isPasswordBeingEntered =
    activePasswordField === "password" &&
    password.length > 0 &&
    !showPassword;

  const isConfirmPasswordBeingEntered =
    activePasswordField === "confirm" &&
    confirmPassword.length > 0 &&
    !showConfirmPassword;

  const mascotActive =
    isPasswordBeingEntered ||
    isConfirmPasswordBeingEntered;

  /*
    =====================================================
    EMAIL VALIDATION
    =====================================================
  */


  /*
    =====================================================
    METHOD CHANGE
    =====================================================
  */

  const handleMethodChange = (
    selectedMethod: RegisterMethod
  ) => {
    setMethod(selectedMethod);
    setEmail("");
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setMessage("");
    setError("");
  };

  /*
    =====================================================
    SEND OTP
    =====================================================
  */

  const handleSendOtp = () => {
    setError("");
    setMessage("");

    if (method === "phone") {
      if (!isValidMobile(phone)) {
        setError(MOBILE_ERROR);
        return;
      }
    } else {
      if (!isValidEmail(email)) {
        setError(EMAIL_ERROR);
        return;
      }
    }

    setOtpSent(true);

    setMessage(
      "OTP sent successfully. Use 123456 for testing."
    );
  };

  /*
    =====================================================
    REGISTER
    =====================================================
  */

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const nameError = getNameError(fullName, "Full name");

    if (nameError) {
      setError(nameError);
      return;
    }

    if (method === "phone") {
      if (!isValidMobile(phone)) {
        setError(MOBILE_ERROR);
        return;
      }
    } else {
      if (!isValidEmail(email)) {
        setError(EMAIL_ERROR);
        return;
      }
    }

    if (!otpSent) {
      setError(
        "Please verify your email or phone with OTP."
      );
      return;
    }

    if (!isValidOtp(otp)) {
      setError(OTP_ERROR);
      return;
    }

    if (otp !== "123456") {
      setError(
        "Invalid OTP. Use 123456 for testing."
      );
      return;
    }

    if (!isValidPassword(password)) {
      setError(PASSWORD_ERROR);
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    if (!terms) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      setMessage(
        "Account created successfully! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login3");
      }, 1200);
    }, 1200);
  };

  /*
    =====================================================
    JSX
    =====================================================
  */

  return (
    <div className="register3-page">

      {/* BACKGROUND DECORATION */}

      <div className="register3-shape shape-one" />
      <div className="register3-shape shape-two" />
      <div className="register3-shape shape-three" />

      <div className="register3-floating floating-one">
        +
      </div>

      <div className="register3-floating floating-two">
        +
      </div>

      <div className="register3-floating floating-three">
        +
      </div>

      <div className="register3-wrapper">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <section className="register3-left">

          {/* BRAND */}

          <div className="register3-brand">

            <div className="register3-logo">
              Z
            </div>

            <div>
              <h1>
                Zproo <span>Bus</span>
              </h1>

              <p>
                TRAVEL SMART • TRAVEL EASY
              </p>
            </div>

          </div>

          {/* HERO */}

          <div className="register3-left-content">

            <span className="register3-tag">
              START YOUR JOURNEY
            </span>

            <h2>
              Create account.
              <br />
              <span>Start travelling.</span>
            </h2>

            <p>
              Join Zproo Bus and make your intercity
              journeys simple, secure and comfortable.
            </p>

            {/* BUS SCENE */}

            <div className="register3-bus-card">

              <div className="register3-sky">

                <div className="register3-sun" />

                <div className="register3-cloud cloud-one" />
                <div className="register3-cloud cloud-two" />

                <div className="register3-hill hill-one" />
                <div className="register3-hill hill-two" />

                {/* BUS */}

                <div className="register3-bus">

                  <div className="bus-roof" />

                  <div className="bus-display">
                    ZPROO BUS
                  </div>

                  <div className="bus-side-windows">

                    <div className="bus-window">
                      <span />
                    </div>

                    <div className="bus-window">
                      <span />
                    </div>

                    <div className="bus-window">
                      <span />
                    </div>

                  </div>

                  <div className="bus-windshield">
                    <div className="windshield-reflection" />
                  </div>

                  <div className="bus-door">
                    <div className="door-window" />
                    <div className="door-line" />
                    <div className="door-handle" />
                  </div>

                  <div className="bus-lower-line" />

                  <div className="bus-front-bumper" />

                  <div className="bus-headlight" />

                  <div className="bus-rear-light" />

                  <div className="bus-mirror" />

                  <div className="login3-wheel wheel-left">
                    <div className="wheel-hub" />
                  </div>

                  <div className="login3-wheel wheel-right">
                    <div className="wheel-hub" />
                  </div>

                </div>

                {/* ONE ROAD */}

                <div className="register3-road" />

              </div>

            </div>

            {/* BENEFITS */}

            <div className="register3-features">

              <div>
                <strong>✓</strong>
                Secure booking
              </div>

              <div>
                <strong>✓</strong>
                Easy payments
              </div>

              <div>
                <strong>✓</strong>
                Quick tickets
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <section className="register3-right">

          <div className="register3-card">

            {/* CARD HEADER */}

            <div className="register3-card-header">

              <div className="register3-mini-icon">
                +
              </div>

              <div>

                <span>
                  JOIN ZPROO BUS
                </span>

                <h3>
                  Create Account
                </h3>

              </div>

            </div>

            <p className="register3-subtitle">
              Create your account and start your journey.
            </p>

            {/* MESSAGE */}

            {message && (
              <div className="register3-message success">

                <span className="message-icon">
                  ✓
                </span>

                <span>
                  {message}
                </span>

              </div>
            )}

            {error && (
              <div className="register3-message error">

                <span className="message-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              {/* FULL NAME */}

              <div className="register3-field">

                <label>
                  Full Name
                </label>

                <div className="register3-input">

                  <span className="input-icon">
                    ID
                  </span>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />

                </div>

              </div>

              {/* METHOD */}

              <div className="register3-method">

                <button
                  type="button"
                  className={
                    method === "email"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    handleMethodChange("email")
                  }
                >
                  <span className="method-icon">
                    @
                  </span>

                  Email
                </button>

                <button
                  type="button"
                  className={
                    method === "phone"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    handleMethodChange("phone")
                  }
                >
                  <span className="method-icon">
                    TEL
                  </span>

                  Phone
                </button>

              </div>

              {/* EMAIL */}

              {method === "email" && (
                <div className="register3-field">

                  <label>
                    Email Address
                  </label>

                  <div className="register3-input">

                    <span className="input-icon">
                      @
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setOtpSent(false);
                        setOtp("");
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />

                  </div>

                </div>
              )}

              {/* PHONE */}

              {method === "phone" && (
                <div className="register3-field">

                  <label>
                    Phone Number
                  </label>

                  <div className="register3-input">

                    <span className="register3-country">
                      +91
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10)
                        );
                        setOtpSent(false);
                        setOtp("");
                      }}
                      placeholder="10 digit mobile number"
                      inputMode="numeric"
                      autoComplete="tel"
                    />

                  </div>

                </div>
              )}

              {/* OTP */}

              <div className="register3-field">

                <div className="register3-label-row">

                  <label>
                    Verification OTP
                  </label>

                  <button
                    type="button"
                    className="register3-resend"
                    onClick={handleSendOtp}
                  >
                    {otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </button>

                </div>

                <div className="register3-input">

                  <span className="input-icon otp-icon">
                    OTP
                  </span>

                  <input
                    type="text"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit OTP"
                    inputMode="numeric"
                  />

                  {otpSent && (
                    <span className="otp-check">
                      ✓
                    </span>
                  )}

                </div>

              </div>

              {/* PASSWORD MASCOT */}

              <div
                className={
                  mascotActive
                    ? "register3-password-character password-active"
                    : "register3-password-character"
                }
              >

                <div className="mascot">

                  <div className="mascot-ear ear-left" />
                  <div className="mascot-ear ear-right" />

                  <div className="mascot-head">

                    <div className="mascot-eye eye-left">
                      <span className="pupil" />
                    </div>

                    <div className="mascot-eye eye-right">
                      <span className="pupil" />
                    </div>

                    <div className="closed-eye closed-left" />
                    <div className="closed-eye closed-right" />

                    <div className="mascot-mouth" />

                  </div>

                  <div className="mascot-body">

                    <div className="mascot-badge">
                      Z
                    </div>

                  </div>

                </div>

                <div className="password-character-text">

                  <strong>
                    {mascotActive
                      ? "Privacy mode!"
                      : "Create a secure password"}
                  </strong>

                  <span>
                    Use at least 6 characters.
                  </span>

                </div>

              </div>

              {/* PASSWORD */}

              <div className="register3-field">

                <label>
                  Password
                </label>

                <div className="register3-input password-input">

                  <span className="input-icon password-icon">
                    •••
                  </span>

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onFocus={() =>
                      setActivePasswordField("password")
                    }
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Create password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className={
                      showPassword
                        ? "password-eye eye-visible"
                        : "password-eye"
                    }
                    onClick={() => {
                      setShowPassword(
                        !showPassword
                      );
                      setActivePasswordField(
                        "password"
                      );
                    }}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    <span className="eye-icon">
                      <span className="eye-icon-pupil" />
                    </span>
                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              <div className="register3-field">

                <label>
                  Confirm Password
                </label>

                <div className="register3-input password-input">

                  <span className="input-icon password-icon">
                    •••
                  </span>

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onFocus={() =>
                      setActivePasswordField("confirm")
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className={
                      showConfirmPassword
                        ? "password-eye eye-visible"
                        : "password-eye"
                    }
                    onClick={() => {
                      setShowConfirmPassword(
                        !showConfirmPassword
                      );
                      setActivePasswordField(
                        "confirm"
                      );
                    }}
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    <span className="eye-icon">
                      <span className="eye-icon-pupil" />
                    </span>
                  </button>

                </div>

              </div>

              {/* TERMS */}

              <label className="register3-terms">

                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(event) =>
                    setTerms(event.target.checked)
                  }
                />

                <span>

                  I agree to the

                  <button
                    type="button"
                    onClick={() => {}}
                  >
                    Terms & Conditions
                  </button>

                  and Privacy Policy.

                </span>

              </label>

              {/* SUBMIT */}

              <button
                type="submit"
                className="register3-submit"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="register3-spinner" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account

                    <span className="submit-arrow">
                      →
                    </span>
                  </>
                )}

              </button>

            </form>

            {/* LOGIN */}

            <div className="register3-login">

              <span>
                Already have an account?
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/login3")
                }
              >
                Login
              </button>

            </div>

            {/* SECURITY */}

            <div className="register3-security">

              <span className="security-lock">
                SECURE
              </span>

              Your information is protected

              <span className="security-dot">
                •
              </span>

              Zproo Bus

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}