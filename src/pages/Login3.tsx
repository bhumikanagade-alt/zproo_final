import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login3.css";
import {
  isValidEmail,
  isValidMobile,
  isValidOtp,
  MOBILE_ERROR,
  EMAIL_ERROR,
  OTP_ERROR,
  OTP_NOT_SENT_ERROR,
} from "../utils/validation";

type LoginMethod = "email" | "phone";

export default function Login3() {
  const navigate = useNavigate();

  const [method, setMethod] = useState<LoginMethod>("phone");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  /* =========================================================
     PASSWORD CHARACTER
  ========================================================= */

  const isPasswordBeingEntered = password.length > 0 && !showPassword;
  /* =========================================================
     EMAIL VALIDATION
  ========================================================= */


  /* =========================================================
     METHOD CHANGE
  ========================================================= */

  const handleMethodChange = (newMethod: LoginMethod) => {
    setMethod(newMethod);

    setEmail("");
    setPhone("");
    setOtp("");

    setMessage("");
    setError("");

    setOtpSent(false);
  };

  /* =========================================================
     SEND OTP
  ========================================================= */

  const handleSendOtp = () => {
    setError("");
    setMessage("");

    if (method === "phone") {
      if (!isValidMobile(phone)) {
        setError(MOBILE_ERROR);
        return;
      }
    }

    if (method === "email") {
      if (!isValidEmail(email)) {
        setError(EMAIL_ERROR);
        return;
      }
    }

    setOtpSent(true);

    setMessage(
      "OTP sent successfully. Use 123456 for demo login."
    );
  };

  /* =========================================================
     LOGIN
  ========================================================= */

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setMessage("");

    /* PHONE */

    if (method === "phone") {
      if (!isValidMobile(phone)) {
        setError(MOBILE_ERROR);
        return;
      }
    }

    /* EMAIL */

    if (method === "email") {
      if (!isValidEmail(email)) {
        setError(EMAIL_ERROR);
        return;
      }
    }

    /* OTP */

    if (!otpSent) {
      setError(OTP_NOT_SENT_ERROR);
      return;
    }

    if (!isValidOtp(otp)) {
      setError(OTP_ERROR);
      return;
    }

    /* PASSWORD */

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    /* LOADING */

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      setMessage(
        "Login successful. Welcome back to Zproo Bus."
      );

      setTimeout(() => {
        navigate("/");
      }, 1200);
    }, 1200);
  };

  /* =========================================================
     PHONE CHANGE
  ========================================================= */

  const handlePhoneChange = (value: string) => {
    const numbersOnly = value
      .replace(/\D/g, "")
      .slice(0, 10);

    setPhone(numbersOnly);
    setOtpSent(false);
    setOtp("");

    setError("");
    setMessage("");
  };

  /* =========================================================
     OTP CHANGE
  ========================================================= */

  const handleOtpChange = (value: string) => {
    const numbersOnly = value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(numbersOnly);

    setError("");
    setMessage("");
  };

  /* =========================================================
     PASSWORD CHANGE
  ========================================================= */

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    setError("");
    setMessage("");
  };

  return (
    <div className="login3-page">

      {/* =====================================
          BACKGROUND DECORATION
      ====================================== */}

      <div className="login3-shape shape-one"></div>
      <div className="login3-shape shape-two"></div>
      <div className="login3-shape shape-three"></div>

      <div className="login3-floating floating-one">
        +
      </div>

      <div className="login3-floating floating-two">
        ○
      </div>

      <div className="login3-floating floating-three">
        +
      </div>


      {/* =====================================
          MAIN WRAPPER
      ====================================== */}

      <main className="login3-wrapper">

        {/* =====================================
            LEFT SECTION
        ====================================== */}

        <section className="login3-left">

          {/* BRAND */}

          <div className="login3-brand">

            <div className="login3-logo">
              Z
            </div>

            <div>
              <h1>
                Zproo<span>Bus</span>
              </h1>

              <p>
                TRAVEL MADE SIMPLE
              </p>
            </div>

          </div>


          {/* HERO CONTENT */}

          <div className="login3-left-content">

            <span className="login3-tag">
              SMART • FAST • EASY
            </span>

            <h2>
              One account.
              <br />
              <span>Every journey.</span>
            </h2>

            <p>
              Login with your email or phone number,
              secure your account with OTP and get
              moving with Zproo Bus.
            </p>


            {/* =====================================
                BUS SCENE
            ====================================== */}

            <div className="login3-bus-card">

              <div className="login3-sky">

                {/* SUN */}

                <div className="login3-sun"></div>


                {/* CLOUDS */}

                <div className="login3-cloud cloud-one"></div>

                <div className="login3-cloud cloud-two"></div>


                {/* HILLS */}

                <div className="login3-hill hill-one"></div>

                <div className="login3-hill hill-two"></div>


                {/* ROAD */}

                <div className="login3-road">

                  <div className="road-mark road-mark-one"></div>

                  <div className="road-mark road-mark-two"></div>

                  <div className="road-mark road-mark-three"></div>

                  <div className="road-mark road-mark-four"></div>

                </div>


                {/* =================================
                    BUS
                ================================== */}

                <div className="login3-bus">

                  {/* BUS REAR */}

                  <div className="bus-rear"></div>


                  {/* BUS ROOF */}

                  <div className="bus-roof"></div>


                  {/* DESTINATION DISPLAY */}

                  <div className="bus-display">
                    ZPROO BUS
                  </div>


                  {/* WINDSHIELD */}

                  <div className="bus-windshield">

                    <div className="windshield-reflection"></div>

                  </div>


                  {/* SIDE WINDOWS */}

                  <div className="bus-side-windows">

                    <div className="bus-window">
                      <span></span>
                    </div>

                    <div className="bus-window">
                      <span></span>
                    </div>

                    <div className="bus-window">
                      <span></span>
                    </div>

                    <div className="bus-window">
                      <span></span>
                    </div>

                  </div>


                  {/* DOOR */}

                  <div className="bus-door">

                    <div className="door-window"></div>

                    <div className="door-line"></div>

                    <div className="door-handle"></div>

                  </div>


                  {/* LOWER BODY */}

                  <div className="bus-lower-line"></div>


                  {/* FRONT BUMPER */}

                  <div className="bus-front-bumper"></div>


                  {/* HEADLIGHT */}

                  <div className="bus-headlight"></div>


                  {/* REAR LIGHT */}

                  <div className="bus-rear-light"></div>


                  {/* MIRROR */}

                  <div className="bus-mirror"></div>


                  {/* WHEELS */}

                  <div className="login3-wheel wheel-left">
                    <div className="wheel-hub"></div>
                  </div>

                  <div className="login3-wheel wheel-right">
                    <div className="wheel-hub"></div>
                  </div>

                </div>

              </div>

            </div>


            {/* =====================================
                FEATURES
            ====================================== */}

            <div className="login3-features">

              <div>
                <strong>01</strong>
                <span>Easy login</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Secure OTP</span>
              </div>

              <div>
                <strong>03</strong>
                <span>Fast booking</span>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================
            RIGHT LOGIN SECTION
        ====================================== */}

        <section className="login3-right">

          <div className="login3-card">

            {/* HEADER */}

            <div className="login3-card-header">

              <div className="login3-mini-icon">
                →
              </div>

              <div>

                <span>
                  WELCOME BACK
                </span>

                <h3>
                  Sign in
                </h3>

              </div>

            </div>


            <p className="login3-subtitle">
              Choose how you want to continue.
            </p>


            {/* =====================================
                LOGIN METHOD
            ====================================== */}

            <div className="login3-method">

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


            {/* SUCCESS MESSAGE */}

            {message && (
              <div className="login3-message success">

                <span className="message-icon">
                  ✓
                </span>

                <span>
                  {message}
                </span>

              </div>
            )}


            {/* ERROR MESSAGE */}

            {error && (
              <div className="login3-message error">

                <span className="message-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}


            {/* =====================================
                FORM
            ====================================== */}

            <form onSubmit={handleSubmit}>

              {/* EMAIL */}

              {method === "email" && (
                <div className="login3-field">

                  <label>
                    Email address
                  </label>

                  <div className="login3-input">

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
                        setError("");
                        setMessage("");
                      }}
                      placeholder="Enter your email address"
                      autoComplete="email"
                    />

                  </div>

                </div>
              )}


              {/* PHONE */}

              {method === "phone" && (
                <div className="login3-field">

                  <label>
                    Phone number
                  </label>

                  <div className="login3-input">

                    <span className="login3-country">
                      +91
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        handlePhoneChange(
                          event.target.value
                        )
                      }
                      placeholder="10 digit mobile number"
                      inputMode="numeric"
                      autoComplete="tel"
                    />

                  </div>

                </div>
              )}


              {/* OTP */}

              <div className="login3-field">

                <div className="login3-label-row">

                  <label>
                    One-time password
                  </label>

                  <button
                    type="button"
                    className="login3-resend"
                    onClick={handleSendOtp}
                  >
                    {otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </button>

                </div>


                <div className="login3-input">

                  <span className="input-icon otp-icon">
                    OTP
                  </span>

                  <input
                    type="text"
                    value={otp}
                    onChange={(event) =>
                      handleOtpChange(
                        event.target.value
                      )
                    }
                    placeholder="Enter 6 digit OTP"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />

                  {otp.length === 6 && (
                    <span className="otp-check">
                      ✓
                    </span>
                  )}

                </div>

              </div>


              {/* =====================================
                  PASSWORD MASCOT
              ====================================== */}

              <div
                className={`login3-password-character ${
                  isPasswordBeingEntered
                    ? "password-active"
                    : ""
                }`}
              >

                <div className="mascot">

                  {/* EARS */}

                  <div className="mascot-ear ear-left"></div>

                  <div className="mascot-ear ear-right"></div>


                  {/* HEAD */}

                  <div className="mascot-head">

                    {/* OPEN EYES */}

                    <div
                      className={`mascot-eye eye-left ${
                        isPasswordBeingEntered
                          ? "eye-hidden"
                          : ""
                      }`}
                    >
                      <span className="pupil"></span>
                    </div>


                    <div
                      className={`mascot-eye eye-right ${
                        isPasswordBeingEntered
                          ? "eye-hidden"
                          : ""
                      }`}
                    >
                      <span className="pupil"></span>
                    </div>


                    {/* CLOSED EYES */}

                    <div
                      className={`closed-eye closed-left ${
                        isPasswordBeingEntered
                          ? "show-closed"
                          : ""
                      }`}
                    ></div>


                    <div
                      className={`closed-eye closed-right ${
                        isPasswordBeingEntered
                          ? "show-closed"
                          : ""
                      }`}
                    ></div>


                    {/* MOUTH */}

                    <div
                      className={`mascot-mouth ${
                        isPasswordBeingEntered
                          ? "mouth-smile"
                          : ""
                      }`}
                    ></div>

                  </div>


                  {/* BODY */}

                  <div className="mascot-body">

                    <div className="mascot-badge">
                      Z
                    </div>

                  </div>

                </div>


                {/* CHARACTER TEXT */}

                <div className="password-character-text">

                  <strong>
                    {isPasswordBeingEntered
                      ? "Privacy mode"
                      : "I'm watching your password"}
                  </strong>

                  <span>
                    {isPasswordBeingEntered
                      ? "I'm not looking at your password."
                      : "Enter your password below."}
                  </span>

                </div>

              </div>


              {/* =====================================
                  PASSWORD
              ====================================== */}

              <div className="login3-field">

                <div className="login3-label-row">

                  <label>
                    Password
                  </label>

                  <button
                    type="button"
                    className="login3-forgot"
                    onClick={() =>
                      setMessage(
                        "Password reset will be available soon."
                      )
                    }
                  >
                    Forgot password?
                  </button>

                </div>


                <div className="login3-input password-input">

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
                    onChange={(event) =>
                      handlePasswordChange(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />


                  <button
                    type="button"
                    className={`password-eye ${
                      showPassword
                        ? "eye-visible"
                        : ""
                    }`}
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    <span className="eye-icon">
                      <span className="eye-icon-pupil"></span>
                    </span>

                  </button>

                </div>

              </div>


              {/* =====================================
                  SUBMIT
              ====================================== */}

              <button
                type="submit"
                className="login3-submit"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="login3-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue

                    <span className="submit-arrow">
                      →
                    </span>
                  </>
                )}

              </button>

            </form>


            {/* =====================================
                REGISTER
            ====================================== */}

            <div className="login3-register">

              <span>
                New to Zproo Bus?
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/register3")
                }
              >
                Create account
              </button>

            </div>


            {/* =====================================
                SECURITY
            ====================================== */}

            <div className="login3-security">

              <span className="security-lock">
                LOCKED
              </span>

              Secure login

              <span className="security-dot">
                •
              </span>

              Your details are protected

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}