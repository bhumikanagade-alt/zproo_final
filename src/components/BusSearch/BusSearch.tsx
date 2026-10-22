import { useEffect, useRef, useState } from "react";
import {
    MapPin,
    ArrowRightLeft,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Sparkles,
} from "lucide-react";

import "./BusSearch.css";

interface City {
    city: string;
    state: string;
}

const cities: City[] = [
    { city: "Pune", state: "Maharashtra" },
    { city: "Mumbai", state: "Maharashtra" },
    { city: "Nashik", state: "Maharashtra" },
    { city: "Nagpur", state: "Maharashtra" },
    { city: "Aurangabad", state: "Maharashtra" },
    { city: "Kolhapur", state: "Maharashtra" },
    { city: "Satara", state: "Maharashtra" },
    { city: "Solapur", state: "Maharashtra" },
    { city: "Ahmednagar", state: "Maharashtra" },
    { city: "Thane", state: "Maharashtra" },
    { city: "Delhi", state: "Delhi" },
    { city: "Bangalore", state: "Karnataka" },
    { city: "Hyderabad", state: "Telangana" },
    { city: "Goa", state: "Goa" },
];

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

/* =========================================
   BUS ICON
========================================= */

function BusIcon() {
    return (
        <svg
            width="30"
            height="30"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                x="5"
                y="4"
                width="22"
                height="23"
                rx="5"
                fill="#1F2937"
            />

            <rect
                x="8"
                y="7"
                width="16"
                height="9"
                rx="2"
                fill="#F3F4F6"
            />

            <path
                d="M8 19H24"
                stroke="#F3F4F6"
                strokeWidth="1.5"
            />

            <circle
                cx="10"
                cy="24"
                r="2"
                fill="#FACC15"
            />

            <circle
                cx="22"
                cy="24"
                r="2"
                fill="#FACC15"
            />

            <path
                d="M5 11H3"
                stroke="#1F2937"
                strokeWidth="2"
                strokeLinecap="round"
            />

            <path
                d="M27 11H29"
                stroke="#1F2937"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* =========================================
   WOMAN / GIRL ICON
========================================= */

function WomanIcon({ active }: { active: boolean }) {
    const color = active ? "#16A34A" : "#4B5563";

    return (
        <svg
            width="27"
            height="27"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Hair */}
            <path
                d="M8 14C6.8 7.8 10.2 3.5 16 3.5C21.8 3.5 25.2 7.8 24 14L22.5 19H9.5L8 14Z"
                fill={color}
            />

            {/* Face */}
            <path
                d="M10 12C10 8.7 12.4 6.5 16 6.5C19.6 6.5 22 8.7 22 12V15.2C22 18.8 19.4 21.5 16 21.5C12.6 21.5 10 18.8 10 15.2V12Z"
                fill="white"
                stroke={color}
                strokeWidth="1.5"
            />

            {/* Hair over forehead */}
            <path
                d="M9.8 11.5C10.2 7.8 12.5 5.8 16 5.8C19.5 5.8 21.8 7.8 22.2 11.5C20.8 10.2 19.2 9.4 17.5 9.2C15.3 8.9 13.2 9.8 11.4 11.5L10.5 13L9.8 11.5Z"
                fill={color}
            />

            {/* Eyes */}
            <circle
                cx="13.5"
                cy="14"
                r="0.9"
                fill={color}
            />

            <circle
                cx="18.5"
                cy="14"
                r="0.9"
                fill={color}
            />

            {/* Smile */}
            <path
                d="M14 17C15 18 17 18 18 17"
                stroke={color}
                strokeWidth="1.2"
                strokeLinecap="round"
            />

            {/* Neck */}
            <path
                d="M13.5 20V23H18.5V20"
                fill="white"
                stroke={color}
                strokeWidth="1.5"
            />

            {/* Dress */}
            <path
                d="M13.5 22C10.5 22.8 7.5 24.8 6.5 29H25.5C24.5 24.8 21.5 22.8 18.5 22"
                fill={color}
                opacity="0.18"
            />

            <path
                d="M13.5 22C10.5 22.8 7.5 24.8 6.5 29H25.5C24.5 24.8 21.5 22.8 18.5 22"
                stroke={color}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* =========================================
   MAIN COMPONENT
========================================= */

function BusSearch1() {
    const today = new Date();

    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);

    /* =========================================
       DATE FORMAT
    ========================================= */

    const formatDate = (dateValue: Date) => {
        const year = dateValue.getFullYear();

        const month = String(
            dateValue.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            dateValue.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const todayString = formatDate(today);
    const tomorrowString = formatDate(tomorrowDate);

    /* =========================================
       STATES
    ========================================= */

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [date, setDate] = useState(todayString);

    const [activeField, setActiveField] =
        useState<"from" | "to" | null>(null);

    const [calendarOpen, setCalendarOpen] =
        useState(false);

    const [womenOnly, setWomenOnly] =
        useState(false);

    const [selectedDate, setSelectedDate] =
        useState(today);

    const [calendarMonth, setCalendarMonth] =
        useState(today.getMonth());

    const [calendarYear, setCalendarYear] =
        useState(today.getFullYear());

    const [showYears, setShowYears] =
        useState(false);

    const [journeyStarted, setJourneyStarted] =
        useState(false);

    const searchBarRef =
        useRef<HTMLDivElement>(null);

    /* =========================================
       CLOSE DROPDOWNS OUTSIDE
    ========================================= */

    useEffect(() => {
        const handleClickOutside = (
            event: MouseEvent
        ) => {
            if (
                searchBarRef.current &&
                !searchBarRef.current.contains(
                    event.target as Node
                )
            ) {
                setActiveField(null);
                setCalendarOpen(false);
                setShowYears(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    /* =========================================
       FILTER CITIES
    ========================================= */

    const getFilteredCities = (
        value: string
    ) => {
        if (!value.trim()) {
            return [];
        }

        return cities.filter((city) =>
            city.city
                .toLowerCase()
                .includes(
                    value.toLowerCase()
                )
        );
    };

    const filteredFromCities =
        getFilteredCities(from);

    const filteredToCities =
        getFilteredCities(to);

    /* =========================================
       SELECT CITY
    ========================================= */

    const selectCity = (
        city: City,
        field: "from" | "to"
    ) => {
        if (field === "from") {
            setFrom(city.city);
        } else {
            setTo(city.city);
        }

        setActiveField(null);
    };

    /* =========================================
       SWAP LOCATIONS
    ========================================= */

    const swapLocations = () => {
        const currentFrom = from;

        setFrom(to);
        setTo(currentFrom);
    };

    /* =========================================
       OPEN CALENDAR
    ========================================= */

    const openCalendar = () => {
        setCalendarOpen(true);

        setActiveField(null);
        setShowYears(false);

        setCalendarMonth(
            selectedDate.getMonth()
        );

        setCalendarYear(
            selectedDate.getFullYear()
        );
    };

    /* =========================================
       SELECT DATE
    ========================================= */

    const selectDate = (newDate: Date) => {
        const selected = new Date(newDate);

        selected.setHours(
            0,
            0,
            0,
            0
        );

        const todayOnly =
            new Date(today);

        todayOnly.setHours(
            0,
            0,
            0,
            0
        );

        if (selected < todayOnly) {
            return;
        }

        setSelectedDate(selected);

        setDate(
            formatDate(selected)
        );

        setCalendarOpen(false);
        setShowYears(false);
    };

    /* =========================================
       PREVIOUS MONTH
    ========================================= */

    const previousMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);

            setCalendarYear(
                calendarYear - 1
            );
        } else {
            setCalendarMonth(
                calendarMonth - 1
            );
        }
    };

    /* =========================================
       NEXT MONTH
    ========================================= */

    const nextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);

            setCalendarYear(
                calendarYear + 1
            );
        } else {
            setCalendarMonth(
                calendarMonth + 1
            );
        }
    };

    /* =========================================
       CALENDAR DAYS
    ========================================= */

    const getCalendarDays = () => {
        const firstDay =
            new Date(
                calendarYear,
                calendarMonth,
                1
            );

        const lastDay =
            new Date(
                calendarYear,
                calendarMonth + 1,
                0
            );

        const previousMonthLastDay =
            new Date(
                calendarYear,
                calendarMonth,
                0
            );

        const days: {
            date: Date;
            currentMonth: boolean;
        }[] = [];

        const firstDayIndex =
            firstDay.getDay();

        for (
            let i =
                firstDayIndex - 1;
            i >= 0;
            i--
        ) {
            days.push({
                date: new Date(
                    calendarYear,
                    calendarMonth - 1,
                    previousMonthLastDay.getDate() -
                        i
                ),
                currentMonth: false,
            });
        }

        for (
            let day = 1;
            day <= lastDay.getDate();
            day++
        ) {
            days.push({
                date: new Date(
                    calendarYear,
                    calendarMonth,
                    day
                ),
                currentMonth: true,
            });
        }

        let nextDay = 1;

        while (days.length < 42) {
            days.push({
                date: new Date(
                    calendarYear,
                    calendarMonth + 1,
                    nextDay
                ),
                currentMonth: false,
            });

            nextDay++;
        }

        return days;
    };

    const calendarDays =
        getCalendarDays();

    /* =========================================
       YEARS
    ========================================= */

    const years = Array.from(
        {
            length: 31,
        },
        (_, index) =>
            today.getFullYear() -
            5 +
            index
    );

    /* =========================================
       SAME DATE
    ========================================= */

    const isSameDate = (
        first: Date,
        second: Date
    ) => {
        return (
            first.getFullYear() ===
                second.getFullYear() &&
            first.getMonth() ===
                second.getMonth() &&
            first.getDate() ===
                second.getDate()
        );
    };

    /* =========================================
       PAST DATE
    ========================================= */

    const isPastDate = (
        checkDate: Date
    ) => {
        const current =
            new Date(today);

        current.setHours(
            0,
            0,
            0,
            0
        );

        const check =
            new Date(checkDate);

        check.setHours(
            0,
            0,
            0,
            0
        );

        return check < current;
    };

    /* =========================================
       START JOURNEY
    ========================================= */

    const startJourney = () => {
        setJourneyStarted(true);

        setTimeout(() => {
            setJourneyStarted(false);
        }, 2500);
    };

    return (
        <section className="bus-search-section">

            <div
                ref={searchBarRef}
                className="bus-search-container"
            >

                {/* =========================================
                    SELECTED JOURNEY
                ========================================= */}

                <div className="journey-preview">

                    {/* =========================================
                        TOP CONTENT
                    ========================================= */}

                    <div className="journey-top-row">

                        {/* LEFT */}

                        <div className="preview-left">

                            <div className="preview-vehicle">
                                <BusIcon />
                            </div>

                            <div>

                                <span className="preview-label">
                                    Selected Journey
                                </span>

                                <h3>
                                    Travel from{" "}
                                    <span>
                                        {from ||
                                            "Your City"}
                                    </span>

                                    {" "}to{" "}

                                    <span>
                                        {to ||
                                            "Destination"}
                                    </span>
                                </h3>

                            </div>

                        </div>

                        {/* ROUTE */}

                        <div className="journey-route">

                            <div className="route-point">

                                <span className="route-dot" />

                                <small>
                                    START
                                </small>

                            </div>

                            <div className="route-line">
                                <span className="route-moving-dot" />
                            </div>

                            <div className="route-vehicle">
                                <BusIcon />
                            </div>

                            <div className="route-line">
                                <span className="route-moving-dot" />
                            </div>

                            <div className="route-point">

                                <MapPin
                                    size={21}
                                />

                                <small>
                                    DESTINATION
                                </small>

                            </div>

                        </div>

                        {/* START JOURNEY */}

                        <button
                            type="button"
                            onClick={
                                startJourney
                            }
                            className={`journey-button ${
                                journeyStarted
                                    ? "journey-button-active"
                                    : ""
                            }`}
                        >

                            <Sparkles
                                size={17}
                            />

                            <span>
                                {journeyStarted
                                    ? "Journey Started"
                                    : "Start Journey"}
                            </span>

                        </button>

                    </div>

                    {/* =========================================
                        EXISTING SEARCH FIELDS
                        NOW INSIDE JOURNEY CARD
                    ========================================= */}

                    <div className="journey-search-area">

                        <div className="bus-search-grid">

                            {/* =========================================
                                FROM + TO
                            ========================================= */}

                            <div className="from-to-wrapper">

                                {/* FROM */}

                                <div className="city-field-wrapper">

                                    <div
                                        className={`city-field ${
                                            activeField ===
                                            "from"
                                                ? "city-field-active"
                                                : ""
                                        }`}
                                    >

                                        <BusIcon />

                                        <div className="city-input-content">

                                            <div className="field-label">
                                                FROM
                                            </div>

                                            <input
                                                type="text"
                                                value={from}
                                                onChange={(event) => {
                                                    setFrom(
                                                        event
                                                            .target
                                                            .value
                                                    );

                                                    setActiveField(
                                                        "from"
                                                    );
                                                }}
                                                onFocus={() =>
                                                    setActiveField(
                                                        "from"
                                                    )
                                                }
                                                placeholder="Enter departure city"
                                                className="city-input"
                                            />

                                            <div className="field-helper">
                                                Select departure
                                            </div>

                                        </div>

                                    </div>

                                    {/* FROM SUGGESTIONS */}

                                    {activeField ===
                                        "from" &&
                                        filteredFromCities.length >
                                            0 && (
                                            <div className="city-suggestions">

                                                {filteredFromCities.map(
                                                    (
                                                        city
                                                    ) => (
                                                        <button
                                                            key={`${city.city}-${city.state}`}
                                                            type="button"
                                                            onClick={() =>
                                                                selectCity(
                                                                    city,
                                                                    "from"
                                                                )
                                                            }
                                                            className="city-suggestion"
                                                        >

                                                            <MapPin
                                                                size={
                                                                    17
                                                                }
                                                            />

                                                            <div>

                                                                <div className="suggestion-city">
                                                                    {
                                                                        city.city
                                                                    }
                                                                </div>

                                                                <div className="suggestion-state">
                                                                    {
                                                                        city.state
                                                                    }
                                                                </div>

                                                            </div>

                                                        </button>
                                                    )
                                                )}

                                            </div>
                                        )}

                                </div>

                                {/* TO */}

                                <div className="city-field-wrapper">

                                    <div
                                        className={`city-field ${
                                            activeField ===
                                            "to"
                                                ? "city-field-active"
                                                : ""
                                        }`}
                                    >

                                        <BusIcon />

                                        <div className="city-input-content">

                                            <div className="field-label">
                                                TO
                                            </div>

                                            <input
                                                type="text"
                                                value={to}
                                                onChange={(event) => {
                                                    setTo(
                                                        event
                                                            .target
                                                            .value
                                                    );

                                                    setActiveField(
                                                        "to"
                                                    );
                                                }}
                                                onFocus={() =>
                                                    setActiveField(
                                                        "to"
                                                    )
                                                }
                                                placeholder="Enter destination city"
                                                className="city-input"
                                            />

                                            <div className="field-helper">
                                                Select destination
                                            </div>

                                        </div>

                                    </div>

                                    {/* TO SUGGESTIONS */}

                                    {activeField ===
                                        "to" &&
                                        filteredToCities.length >
                                            0 && (
                                            <div className="city-suggestions">

                                                {filteredToCities.map(
                                                    (
                                                        city
                                                    ) => (
                                                        <button
                                                            key={`${city.city}-${city.state}`}
                                                            type="button"
                                                            onClick={() =>
                                                                selectCity(
                                                                    city,
                                                                    "to"
                                                                )
                                                            }
                                                            className="city-suggestion"
                                                        >

                                                            <MapPin
                                                                size={
                                                                    17
                                                                }
                                                            />

                                                            <div>

                                                                <div className="suggestion-city">
                                                                    {
                                                                        city.city
                                                                    }
                                                                </div>

                                                                <div className="suggestion-state">
                                                                    {
                                                                        city.state
                                                                    }
                                                                </div>

                                                            </div>

                                                        </button>
                                                    )
                                                )}

                                            </div>
                                        )}

                                </div>

                                {/* SWAP */}

                                <button
                                    type="button"
                                    onClick={
                                        swapLocations
                                    }
                                    title="Swap locations"
                                    className="swap-button"
                                >
                                    <ArrowRightLeft
                                        size={16}
                                    />
                                </button>

                            </div>

                            {/* =========================================
                                WOMEN ONLY + DATE
                            ========================================= */}

                            <div className="date-section">

                                {/* WOMEN ONLY */}

                                <div className="women-toggle-row">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWomenOnly(
                                                !womenOnly
                                            )
                                        }
                                        className={`women-toggle ${
                                            womenOnly
                                                ? "women-toggle-active"
                                                : ""
                                        }`}
                                    >

                                        <WomanIcon
                                            active={
                                                womenOnly
                                            }
                                        />

                                        <span
                                            className={`women-text ${
                                                womenOnly
                                                    ? "women-text-active"
                                                    : ""
                                            }`}
                                        >
                                            Booking For Women
                                        </span>

                                        <span
                                            className={`toggle-switch ${
                                                womenOnly
                                                    ? "toggle-switch-active"
                                                    : ""
                                            }`}
                                        >

                                            <span
                                                className={`toggle-circle ${
                                                    womenOnly
                                                        ? "toggle-circle-active"
                                                        : ""
                                                }`}
                                            />

                                        </span>

                                    </button>

                                </div>

                                {/* TRAVEL DATE */}

                                <div className="date-field-wrapper">

                                    <div className="date-field">

                                        <button
                                            type="button"
                                            onClick={
                                                openCalendar
                                            }
                                            title="Select travel date"
                                            className="calendar-icon-button"
                                        >
                                            <CalendarDays
                                                size={20}
                                                strokeWidth={
                                                    2
                                                }
                                            />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                openCalendar
                                            }
                                            className="date-text-button"
                                        >

                                            <span className="date-label">
                                                TRAVEL DATE
                                            </span>

                                            <span className="date-value">

                                                {date ===
                                                todayString
                                                    ? "Today"
                                                    : date ===
                                                      tomorrowString
                                                    ? "Tomorrow"
                                                    : selectedDate.toLocaleDateString(
                                                          "en-IN",
                                                          {
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                          }
                                                      )}

                                            </span>

                                        </button>

                                        {/* TODAY / TOMORROW */}

                                        <div className="quick-date-buttons">

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDate(
                                                        new Date(
                                                            today
                                                        )
                                                    );

                                                    setDate(
                                                        todayString
                                                    );
                                                }}
                                                className={`quick-date-button ${
                                                    date ===
                                                    todayString
                                                        ? "quick-date-active"
                                                        : ""
                                                }`}
                                            >
                                                Today
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDate(
                                                        new Date(
                                                            tomorrowDate
                                                        )
                                                    );

                                                    setDate(
                                                        tomorrowString
                                                    );
                                                }}
                                                className={`quick-date-button ${
                                                    date ===
                                                    tomorrowString
                                                        ? "quick-date-active"
                                                        : ""
                                                }`}
                                            >
                                                Tomorrow
                                            </button>

                                        </div>

                                    </div>

                                    {/* =========================================
                                        CALENDAR
                                    ========================================= */}

                                    {calendarOpen && (
                                        <div className="calendar-popup">

                                            {/* HEADER */}

                                            <div className="calendar-header">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousMonth
                                                    }
                                                    className="calendar-nav-button"
                                                >
                                                    <ChevronLeft
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowYears(
                                                            !showYears
                                                        )
                                                    }
                                                    className="calendar-month-button"
                                                >

                                                    {months[
                                                        calendarMonth
                                                    ]}{" "}
                                                    {
                                                        calendarYear
                                                    }

                                                    <ChevronDown
                                                        size={
                                                            15
                                                        }
                                                    />

                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextMonth
                                                    }
                                                    className="calendar-nav-button"
                                                >
                                                    <ChevronRight
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </button>

                                            </div>

                                            {/* YEARS */}

                                            {showYears ? (
                                                <div className="years-grid">

                                                    {years.map(
                                                        (
                                                            year
                                                        ) => (
                                                            <button
                                                                key={
                                                                    year
                                                                }
                                                                type="button"
                                                                onClick={() => {
                                                                    setCalendarYear(
                                                                        year
                                                                    );

                                                                    setShowYears(
                                                                        false
                                                                    );
                                                                }}
                                                                className={`year-button ${
                                                                    year ===
                                                                    calendarYear
                                                                        ? "year-button-active"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {
                                                                    year
                                                                }
                                                            </button>
                                                        )
                                                    )}

                                                </div>
                                            ) : (
                                                <>
                                                    {/* WEEK DAYS */}

                                                    <div className="week-days">

                                                        {[
                                                            "Sun",
                                                            "Mon",
                                                            "Tue",
                                                            "Wed",
                                                            "Thu",
                                                            "Fri",
                                                            "Sat",
                                                        ].map(
                                                            (
                                                                day
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        day
                                                                    }
                                                                    className="week-day"
                                                                >
                                                                    {
                                                                        day
                                                                    }
                                                                </div>
                                                            )
                                                        )}

                                                    </div>

                                                    {/* DAYS */}

                                                    <div className="calendar-days">

                                                        {calendarDays.map(
                                                            (
                                                                item,
                                                                index
                                                            ) => {

                                                                const past =
                                                                    isPastDate(
                                                                        item.date
                                                                    );

                                                                const selected =
                                                                    isSameDate(
                                                                        item.date,
                                                                        selectedDate
                                                                    );

                                                                const isToday =
                                                                    isSameDate(
                                                                        item.date,
                                                                        today
                                                                    );

                                                                return (
                                                                    <button
                                                                        key={`${item.date.toISOString()}-${index}`}
                                                                        type="button"
                                                                        disabled={
                                                                            past
                                                                        }
                                                                        onClick={() =>
                                                                            selectDate(
                                                                                item.date
                                                                            )
                                                                        }
                                                                        className={`calendar-day ${
                                                                            past
                                                                                ? "calendar-day-past"
                                                                                : selected
                                                                                ? "calendar-day-selected"
                                                                                : isToday
                                                                                ? "calendar-day-today"
                                                                                : item.currentMonth
                                                                                ? "calendar-day-current"
                                                                                : "calendar-day-other"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            item
                                                                                .date
                                                                                .getDate()
                                                                        }
                                                                    </button>
                                                                );
                                                            }
                                                        )}

                                                    </div>
                                                </>
                                            )}

                                        </div>
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}

export default BusSearch1;