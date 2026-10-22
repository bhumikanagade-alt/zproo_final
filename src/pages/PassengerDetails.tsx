import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PassengerDetails.css";
import {
  getAgeError,
  getEmailError,
  getMobileError,
  getNameError,
} from "../utils/validation";

type Gender = "" | "Male" | "Female" | "Other";

interface Passenger {
  id: number;
  fullName: string;
  age: string;
  gender: Gender;
}

interface FormData {
  fullName: string;
  age: string;
  gender: Gender;
  phone: string;
  email: string;
  emergencyName: string;
  emergencyPhone: string;
}

interface FormErrors {
  fullName?: string;
  age?: string;
  gender?: string;
  phone?: string;
  email?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}

interface PassengerErrors {
  fullName?: string;
  age?: string;
  gender?: string;
}

const PassengerDetails = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    emergencyName: "",
    emergencyPhone: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [passengerErrors, setPassengerErrors] = useState<
    Record<number, PassengerErrors>
  >({});

  const [showPassengerForm, setShowPassengerForm] =
    useState(false);

  const [loading, setLoading] = useState(false);

  /* =========================================================
     VALIDATION HELPERS
  ========================================================= */


  /* =========================================================
     MAIN FORM CHANGE
  ========================================================= */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    if (name === "phone" || name === "emergencyPhone") {
      const numericValue = value
        .replace(/\D/g, "")
        .slice(0, 10);

      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));

      return;
    }

    if (name === "age") {
      const numericValue = value
        .replace(/\D/g, "")
        .slice(0, 3);

      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     GENDER
  ========================================================= */

  const handleGenderChange = (gender: Gender) => {
    setFormData((prev) => ({
      ...prev,
      gender,
    }));
  };

  /* =========================================================
     MAIN FORM VALIDATION
  ========================================================= */

  const validateForm = () => {
    const newErrors: FormErrors = {};

    const fullNameError = getNameError(formData.fullName, "Full name");
    if (fullNameError) newErrors.fullName = fullNameError;

    const ageError = getAgeError(formData.age);
    if (ageError) newErrors.age = ageError;

    if (!formData.gender) {
      newErrors.gender = "Please select gender";
    }

    const phoneError = getMobileError(formData.phone, "Phone number");
    if (phoneError) newErrors.phone = phoneError;

    const emailError = getEmailError(formData.email);
    if (emailError) newErrors.email = emailError;

    const emergencyNameError = getNameError(
      formData.emergencyName,
      "Emergency contact name"
    );
    if (emergencyNameError) newErrors.emergencyName = emergencyNameError;

    const emergencyPhoneError = getMobileError(
      formData.emergencyPhone,
      "Emergency phone"
    );
    if (emergencyPhoneError) {
      newErrors.emergencyPhone = emergencyPhoneError;
    } else if (formData.emergencyPhone === formData.phone) {
      newErrors.emergencyPhone =
        "Emergency phone must be different from your phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* =========================================================
     ADD PASSENGER
  ========================================================= */

  const handleAddPassenger = () => {
    if (passengers.length >= 5) {
      return;
    }

    const newPassenger: Passenger = {
      id: Date.now(),
      fullName: "",
      age: "",
      gender: "",
    };

    setPassengers((prev) => [
      ...prev,
      newPassenger,
    ]);

    setShowPassengerForm(true);
  };

  /* =========================================================
     PASSENGER CHANGE
  ========================================================= */

  const handlePassengerChange = (
    id: number,
    field: keyof Passenger,
    value: string
  ) => {
    setPassengers((prev) =>
      prev.map((passenger) => {
        if (passenger.id !== id) {
          return passenger;
        }

        if (field === "age") {
          return {
            ...passenger,
            age: value
              .replace(/\D/g, "")
              .slice(0, 3),
          };
        }

        return {
          ...passenger,
          [field]: value,
        };
      })
    );

    setPassengerErrors((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: undefined,
      },
    }));
  };

  /* =========================================================
     PASSENGER VALIDATION
  ========================================================= */

  const validatePassenger = (
    passenger: Passenger
  ) => {
    const newErrors: PassengerErrors = {};

    const nameError = getNameError(passenger.fullName, "Full name");
    if (nameError) newErrors.fullName = nameError;

    const ageError = getAgeError(passenger.age);
    if (ageError) newErrors.age = ageError;

    if (!passenger.gender) {
      newErrors.gender = "Please select gender";
    }

    return newErrors;
  };

  /* =========================================================
     REMOVE PASSENGER
  ========================================================= */

  const handleRemovePassenger = (id: number) => {
    setPassengers((prev) =>
      prev.filter(
        (passenger) => passenger.id !== id
      )
    );

    setPassengerErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    if (passengers.length === 1) {
      setShowPassengerForm(false);
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const mainFormValid = validateForm();

    let allPassengersValid = true;

    const allPassengerErrors: Record<
      number,
      PassengerErrors
    > = {};

    passengers.forEach((passenger) => {
      const passengerError =
        validatePassenger(passenger);

      if (Object.keys(passengerError).length > 0) {
        allPassengersValid = false;

        allPassengerErrors[passenger.id] =
          passengerError;
      }
    });

    setPassengerErrors(allPassengerErrors);

    if (!mainFormValid || !allPassengersValid) {
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      navigate("/checkout");
    }, 1000);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="passenger-page">

      {/* BACKGROUND */}
      <div className="passenger-bg-circle passenger-circle-one" />
      <div className="passenger-bg-circle passenger-circle-two" />
      <div className="passenger-bg-glow" />

      {/* HEADER */}
      <header className="passenger-header">

        <div className="passenger-brand">
          <div className="passenger-brand-icon">
            Z
          </div>

          <div className="passenger-brand-text">
            <strong>Zproo Bus</strong>
            <span>TRAVEL SMART</span>
          </div>
        </div>

        <div className="passenger-step">
          <span className="step-active">1</span>

          <span className="step-line" />

          <span>2</span>

          <span className="step-line" />

          <span>3</span>
        </div>

        <div className="passenger-header-secure">
          <span>✓</span>
          Secure Booking
        </div>

      </header>

      {/* MAIN */}
      <main className="passenger-main">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <section className="passenger-intro">

          <div className="passenger-breadcrumb">

            <button
              type="button"
              onClick={() => navigate(-1)}
            >
              ←
            </button>

            Booking / Passenger Details

          </div>

          <div className="passenger-eyebrow">
            STEP 01 / PASSENGERS
          </div>

          <div className="passenger-heading">

            <h1>
              Who's
              <br />
              <span>travelling?</span>
            </h1>

            <p>
              Add passenger details to continue
              with your Zproo Bus journey.
              Make sure all information is correct.
            </p>

          </div>

          {/* JOURNEY CARD */}

          <div className="journey-card">

            <div className="journey-card-top">

              <span>YOUR JOURNEY</span>

              <span className="journey-status">
                ● CONFIRMED
              </span>

            </div>

            <div className="journey-route">

              <div className="journey-city">

                <strong>PUNE</strong>

                <span>08:30 AM</span>

              </div>

              <div className="journey-line">

                <span className="journey-dot" />

                <span className="journey-bus">
                  🚌
                </span>

                <span className="journey-dot" />

              </div>

              <div className="journey-city journey-city-right">

                <strong>MUMBAI</strong>

                <span>12:30 PM</span>

              </div>

            </div>

            <div className="journey-info">

              <div>
                <span>DATE</span>
                <strong>25 SEP 2026</strong>
              </div>

              <div>
                <span>BUS</span>
                <strong>ZPROO EXPRESS</strong>
              </div>

              <div>
                <span>SEAT</span>
                <strong>A1</strong>
              </div>

            </div>

          </div>

          {/* BENEFITS */}

          <div className="passenger-benefits">

            <div className="benefit">

              <span>✓</span>

              <p>
                <strong>Secure booking</strong>
                <small>Your data is protected</small>
              </p>

            </div>

            <div className="benefit">

              <span>✓</span>

              <p>
                <strong>Easy cancellation</strong>
                <small>Simple refund process</small>
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            RIGHT SIDE FORM
        ================================================= */}

        <section className="passenger-form-section">

          <form
            className="passenger-card"
            onSubmit={handleSubmit}
          >

            {/* FORM HEADER */}

            <div className="passenger-card-header">

              <div className="passenger-card-icon">
                👤
              </div>

              <div>
                <h2>Passenger Details</h2>

                <p>
                  Enter details for your journey
                </p>
              </div>

            </div>

            {/* =============================================
                PRIMARY PASSENGER
            ============================================= */}

            <div className="form-section-title">

              <span>01</span>

              Primary Passenger

            </div>

            {/* FULL NAME */}

            <div
              className={`passenger-field ${
                errors.fullName
                  ? "field-error"
                  : ""
              }`}
            >

              <label>
                Full Name
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter passenger full name"
                  autoComplete="name"
                />

              </div>

              {errors.fullName && (
                <span className="error-text">
                  {errors.fullName}
                </span>
              )}

            </div>

            {/* AGE + GENDER */}

            <div className="form-row">

              <div
                className={`passenger-field ${
                  errors.age
                    ? "field-error"
                    : ""
                }`}
              >

                <label>
                  Age
                  <span>*</span>
                </label>

                <div className="input-wrapper">

                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Age"
                    inputMode="numeric"
                  />

                </div>

                {errors.age && (
                  <span className="error-text">
                    {errors.age}
                  </span>
                )}

              </div>

              <div
                className={`passenger-field ${
                  errors.gender
                    ? "field-error"
                    : ""
                }`}
              >

                <label>
                  Gender
                  <span>*</span>
                </label>

                <div className="gender-options">

                  {(
                    [
                      "Male",
                      "Female",
                      "Other",
                    ] as const
                  ).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      className={`gender-option ${
                        formData.gender === gender
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleGenderChange(
                          gender
                        )
                      }
                    >
                      {gender}
                    </button>
                  ))}

                </div>

                {errors.gender && (
                  <span className="error-text">
                    {errors.gender}
                  </span>
                )}

              </div>

            </div>

            {/* =============================================
                ADDITIONAL PASSENGERS
            ============================================= */}

            <div className="additional-passenger-header">

              <div className="form-section-title">
                <span>02</span>
                Additional Passengers
              </div>

              <span className="passenger-count">
                {passengers.length + 1}/5
              </span>

            </div>

            <button
              type="button"
              className="add-passenger-btn"
              onClick={handleAddPassenger}
              disabled={passengers.length >= 5}
            >
              <span className="add-passenger-icon">
                +
              </span>

              <span>
                Add Passenger
              </span>

              <small>
                Full Name · Age · Gender
              </small>
            </button>

            {/* ADDITIONAL PASSENGER CARDS */}

            {showPassengerForm &&
              passengers.map(
                (passenger, index) => {
                  const passengerError =
                    passengerErrors[
                      passenger.id
                    ] || {};

                  return (
                    <div
                      className="additional-passenger-card"
                      key={passenger.id}
                    >

                      <div className="additional-passenger-top">

                        <div>
                          <strong>
                            Passenger{" "}
                            {index + 2}
                          </strong>

                          <span>
                            Additional traveller
                          </span>
                        </div>

                        <button
                          type="button"
                          className="remove-passenger"
                          onClick={() =>
                            handleRemovePassenger(
                              passenger.id
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                      {/* NAME */}

                      <div
                        className={`passenger-field ${
                          passengerError.fullName
                            ? "field-error"
                            : ""
                        }`}
                      >

                        <label>
                          Full Name
                          <span>*</span>
                        </label>

                        <div className="input-wrapper">

                          <input
                            type="text"
                            value={
                              passenger.fullName
                            }
                            onChange={(event) =>
                              handlePassengerChange(
                                passenger.id,
                                "fullName",
                                event.target.value
                              )
                            }
                            placeholder="Enter full name"
                          />

                        </div>

                        {passengerError.fullName && (
                          <span className="error-text">
                            {
                              passengerError.fullName
                            }
                          </span>
                        )}

                      </div>

                      {/* AGE + GENDER */}

                      <div className="form-row">

                        <div
                          className={`passenger-field ${
                            passengerError.age
                              ? "field-error"
                              : ""
                          }`}
                        >

                          <label>
                            Age
                            <span>*</span>
                          </label>

                          <div className="input-wrapper">

                            <input
                              type="text"
                              value={
                                passenger.age
                              }
                              onChange={(event) =>
                                handlePassengerChange(
                                  passenger.id,
                                  "age",
                                  event.target.value
                                )
                              }
                              placeholder="Age"
                              inputMode="numeric"
                            />

                          </div>

                          {passengerError.age && (
                            <span className="error-text">
                              {
                                passengerError.age
                              }
                            </span>
                          )}

                        </div>

                        <div
                          className={`passenger-field ${
                            passengerError.gender
                              ? "field-error"
                              : ""
                          }`}
                        >

                          <label>
                            Gender
                            <span>*</span>
                          </label>

                          <div className="gender-options">

                            {(
                              [
                                "Male",
                                "Female",
                                "Other",
                              ] as const
                            ).map((gender) => (
                              <button
                                key={gender}
                                type="button"
                                className={`gender-option ${
                                  passenger.gender ===
                                  gender
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  handlePassengerChange(
                                    passenger.id,
                                    "gender",
                                    gender
                                  )
                                }
                              >
                                {gender}
                              </button>
                            ))}

                          </div>

                          {passengerError.gender && (
                            <span className="error-text">
                              {
                                passengerError.gender
                              }
                            </span>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            {/* =============================================
                CONTACT
            ============================================= */}

            <div className="form-section-title contact-title">

              <span>03</span>

              Contact Information

            </div>

            {/* PHONE */}

            <div
              className={`passenger-field ${
                errors.phone
                  ? "field-error"
                  : ""
              }`}
            >

              <label>
                Mobile Number
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <span className="country-code">
                  +91
                </span>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                />

              </div>

              {errors.phone && (
                <span className="error-text">
                  {errors.phone}
                </span>
              )}

            </div>

            {/* EMAIL */}

            <div
              className={`passenger-field ${
                errors.email
                  ? "field-error"
                  : ""
              }`}
            >

              <label>
                Email Address
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  autoComplete="email"
                />

              </div>

              {errors.email && (
                <span className="error-text">
                  {errors.email}
                </span>
              )}

            </div>

            {/* =============================================
                EMERGENCY CONTACT
            ============================================= */}

            <div className="form-section-title contact-title">

              <span>04</span>

              Emergency Contact

            </div>

            <div className="emergency-note">
              We'll only use this contact in case
              of an emergency during your journey.
            </div>

            {/* EMERGENCY NAME */}

            <div
              className={`passenger-field ${
                errors.emergencyName
                  ? "field-error"
                  : ""
              }`}
            >

              <label>
                Contact Name
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <input
                  type="text"
                  name="emergencyName"
                  value={
                    formData.emergencyName
                  }
                  onChange={handleChange}
                  placeholder="Emergency contact name"
                />

              </div>

              {errors.emergencyName && (
                <span className="error-text">
                  {errors.emergencyName}
                </span>
              )}

            </div>

            {/* EMERGENCY PHONE */}

            <div
              className={`passenger-field ${
                errors.emergencyPhone
                  ? "field-error"
                  : ""
              }`}
            >

              <label>
                Contact Number
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <span className="country-code">
                  +91
                </span>

                <input
                  type="text"
                  name="emergencyPhone"
                  value={
                    formData.emergencyPhone
                  }
                  onChange={handleChange}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                />

              </div>

              {errors.emergencyPhone && (
                <span className="error-text">
                  {errors.emergencyPhone}
                </span>
              )}

            </div>

            {/* SECURITY */}

            <div className="passenger-security">

              <span className="security-lock">
                SECURE
              </span>

              Your information is protected

              <span className="security-dot">
                •
              </span>

              <strong>Zproo Bus</strong>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="passenger-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="button-spinner" />
                  Saving Details...
                </>
              ) : (
                <>
                  Continue to Seat Selection
                  <span className="button-arrow">
                    →
                  </span>
                </>
              )}

            </button>

            <p className="required-note">
              * All fields marked with an asterisk
              are required
            </p>

          </form>

        </section>

      </main>
    </div>
  );
};

export default PassengerDetails;