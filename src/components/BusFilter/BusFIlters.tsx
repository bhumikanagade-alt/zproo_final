import React, { useRef, useState } from "react";
import {
  Snowflake,
  Fan,
  BedDouble,
  Armchair,
  MapPin,
  Navigation,
  Wifi,
  Droplets,
  BatteryCharging,
  CheckCircle,
  Radio,
  Star,
  Tag,
  ShieldCheck,
  BusFront,
  ChevronDown,
  ChevronUp,
  Search,
  Moon,
  Sun,
  Sunset,
  Sunrise,
  Sparkles,
} from "lucide-react";

import "./BusFilters.css";
import { isPriceRangeValid } from "../../utils/validation";

interface FilterSectionProps {
  title: string;
  sectionKey: string;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  children: React.ReactNode;
}

interface CheckOptionProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

interface BusType {
  label: string;
  icon: React.ReactNode;
}

const quickFilters = [
  "Primo Bus",
  "Free Cancellation",
  "AC",
  "SLEEPER",
  "Single Seats",
  "SEATER",
  "NONAC",
  "18:00-24:00",
  "High Rated Buses",
  "Live Tracking",
];

const departureTimes = [
  "12:00-18:00",
  "18:00-24:00",
  "00:00-06:00",
];

const arrivalTimes = [
  "06:00-12:00",
  "00:00-06:00",
];

const busTypes: BusType[] = [
  {
    label: "AC",
    icon: <Snowflake />,
  },
  {
    label: "NONAC",
    icon: <Fan />,
  },
  {
    label: "SEATER",
    icon: <Armchair />,
  },
  {
    label: "SLEEPER",
    icon: <BedDouble />,
  },
];

const operators = [
  "Abhinav Deluxe",
  "Akanksha Travels",
  "Al Veera Tours And Travels",
  "Anandi Travels",
];

const boardingPoints = [
  "S T- Chinchwad Birla Hospital",
  "Akurdi",
  "Alandi Phata",
  "Ambegaon Budruk",
  "Aundh",
];

const droppingPoints = [
  "Ashoka Hotel",
  "Dudhi",
  "Gandhi Square",
  "Gorakshan",
];

const amenities = [
  "WIFI",
  "Water Bottle",
  "Blankets",
  "Charging Point",
];

const specialFeatures = [
  "New Bus",
  "On Time",
];

const MIN_PRICE = 100;
const MAX_PRICE = 5000;
const STEP = 50;

const BusFilters: React.FC = () => {
  const [selectedFilters, setSelectedFilters] =
    useState<string[]>([]);

  const [minPrice, setMinPrice] =
    useState<number>(254);

  const [maxPrice, setMaxPrice] =
    useState<number>(5000);

  const priceSliderRef =
    useRef<HTMLDivElement>(null);

  const [openSections, setOpenSections] =
    useState<Record<string, boolean>>({
      quick: true,
      departure: true,
      arrival: true,
      busType: true,
      singleSeats: true,
      features: true,
      operator: true,
      boarding: true,
      dropping: true,
      price: true,
      amenities: true,
      special: true,
      rtc: false,
    });

  const [operatorSearch, setOperatorSearch] =
    useState("");

  const [boardingSearch, setBoardingSearch] =
    useState("");

  const [droppingSearch, setDroppingSearch] =
    useState("");

  const [amenitySearch, setAmenitySearch] =
    useState("");

  const isSelected = (value: string) =>
    selectedFilters.includes(value);

  const toggleFilter = (value: string) => {
    setSelectedFilters((previous) =>
      previous.includes(value)
        ? previous.filter(
            (item) => item !== value
          )
        : [...previous, value]
    );
  };

  const toggleSection = (section: string) => {
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  const clearAll = () => {
    setSelectedFilters([]);
    setMinPrice(MIN_PRICE);
    setMaxPrice(MAX_PRICE);
    setOperatorSearch("");
    setBoardingSearch("");
    setDroppingSearch("");
    setAmenitySearch("");
  };

  const minPricePercentage =
    ((minPrice - MIN_PRICE) /
      (MAX_PRICE - MIN_PRICE)) *
    100;

  const maxPricePercentage =
    ((maxPrice - MIN_PRICE) /
      (MAX_PRICE - MIN_PRICE)) *
    100;

  const updatePrice = (
    clientX: number,
    type: "min" | "max"
  ) => {
    if (!priceSliderRef.current) return;

    const rect =
      priceSliderRef.current.getBoundingClientRect();

    const position = Math.max(
      0,
      Math.min(
        clientX - rect.left,
        rect.width
      )
    );

    const percentage =
      position / rect.width;

    const rawPrice =
      MIN_PRICE +
      percentage *
        (MAX_PRICE - MIN_PRICE);

    const steppedPrice =
      Math.round(rawPrice / STEP) *
      STEP;

    const price = Math.max(
      MIN_PRICE,
      Math.min(
        steppedPrice,
        MAX_PRICE
      )
    );

    if (type === "min") {
      const nextMin = Math.min(
        price,
        maxPrice - STEP
      );

      if (isPriceRangeValid(nextMin, maxPrice)) {
        setMinPrice(nextMin);
      }
    } else {
      const nextMax = Math.max(
        price,
        minPrice + STEP
      );

      if (isPriceRangeValid(minPrice, nextMax)) {
        setMaxPrice(nextMax);
      }
    }
  };

  const handleMinPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const handleMove = (
      moveEvent: PointerEvent
    ) => {
      updatePrice(
        moveEvent.clientX,
        "min"
      );
    };

    const handleUp = () => {
      window.removeEventListener(
        "pointermove",
        handleMove
      );

      window.removeEventListener(
        "pointerup",
        handleUp
      );
    };

    window.addEventListener(
      "pointermove",
      handleMove
    );

    window.addEventListener(
      "pointerup",
      handleUp
    );
  };

  const handleMaxPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const handleMove = (
      moveEvent: PointerEvent
    ) => {
      updatePrice(
        moveEvent.clientX,
        "max"
      );
    };

    const handleUp = () => {
      window.removeEventListener(
        "pointermove",
        handleMove
      );

      window.removeEventListener(
        "pointerup",
        handleUp
      );
    };

    window.addEventListener(
      "pointermove",
      handleMove
    );

    window.addEventListener(
      "pointerup",
      handleUp
    );
  };

  const filteredOperators =
    operators.filter((item) =>
      item
        .toLowerCase()
        .includes(
          operatorSearch.toLowerCase()
        )
    );

  const filteredBoardingPoints =
    boardingPoints.filter((item) =>
      item
        .toLowerCase()
        .includes(
          boardingSearch.toLowerCase()
        )
    );

  const filteredDroppingPoints =
    droppingPoints.filter((item) =>
      item
        .toLowerCase()
        .includes(
          droppingSearch.toLowerCase()
        )
    );

  const filteredAmenities =
    amenities.filter((item) =>
      item
        .toLowerCase()
        .includes(
          amenitySearch.toLowerCase()
        )
    );

  return (
    <aside className="bus-filters">

      {/* HEADER */}

      <div className="filters-header">
        <h2>Filters</h2>

        <button
          type="button"
          className="clear-all"
          onClick={clearAll}
        >
          Clear all
        </button>
      </div>

      {/* QUICK FILTERS */}

      <FilterSection
        title="QUICK FILTERS / TAGS"
        sectionKey="quick"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="quick-filter-list">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`quick-filter ${
                isSelected(filter)
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                toggleFilter(filter)
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* DEPARTURE TIME */}

      <FilterSection
        title="DEPARTURE TIME FROM SOURCE"
        sectionKey="departure"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="time-grid">
          {departureTimes.map(
            (time, index) => (
              <button
                key={time}
                type="button"
                className={`filter-option-box ${
                  isSelected(time)
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  toggleFilter(time)
                }
              >
                <span className="option-icon">
                  {index === 0 && (
                    <Sunset />
                  )}

                  {index === 1 && (
                    <Sun />
                  )}

                  {index === 2 && (
                    <Moon />
                  )}
                </span>

                <span>{time}</span>
              </button>
            )
          )}
        </div>
      </FilterSection>

      {/* ARRIVAL TIME */}

      <FilterSection
        title="ARRIVAL TIME AT DESTINATION"
        sectionKey="arrival"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="time-grid">
          {arrivalTimes.map(
            (time, index) => (
              <button
                key={time}
                type="button"
                className={`filter-option-box ${
                  isSelected(time)
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  toggleFilter(time)
                }
              >
                <span className="option-icon">
                  {index === 0 ? (
                    <Sunrise />
                  ) : (
                    <Moon />
                  )}
                </span>

                <span>{time}</span>
              </button>
            )
          )}
        </div>
      </FilterSection>

      {/* BUS TYPE */}

      <FilterSection
        title="BUS TYPE"
        sectionKey="busType"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="bus-type-grid">
          {busTypes.map((type) => (
            <button
              key={type.label}
              type="button"
              className={`filter-option-box ${
                isSelected(type.label)
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                toggleFilter(type.label)
              }
            >
              <span className="option-icon">
                {type.icon}
              </span>

              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* SINGLE SEATS */}

      <FilterSection
        title="SINGLE WINDOW SEATER / SLEEPER"
        sectionKey="singleSeats"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <CheckOption
          label="Single Seats"
          selected={isSelected(
            "Single Seats"
          )}
          onClick={() =>
            toggleFilter(
              "Single Seats"
            )
          }
        />
      </FilterSection>

      {/* BUS FEATURES */}

      <FilterSection
        title="BUS FEATURES"
        sectionKey="features"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <CheckOption
          label="Live Tracking"
          icon={<Radio />}
          selected={isSelected(
            "Live Tracking"
          )}
          onClick={() =>
            toggleFilter(
              "Live Tracking"
            )
          }
        />

        <CheckOption
          label="High Rated Buses"
          icon={<Star />}
          selected={isSelected(
            "High Rated Buses"
          )}
          onClick={() =>
            toggleFilter(
              "High Rated Buses"
            )
          }
        />

        <CheckOption
          label="Deals"
          icon={<Tag />}
          selected={isSelected("Deals")}
          onClick={() =>
            toggleFilter("Deals")
          }
        />

        <CheckOption
          label="Primo Bus"
          icon={<Sparkles />}
          selected={isSelected(
            "Primo Bus"
          )}
          onClick={() =>
            toggleFilter("Primo Bus")
          }
        />

        <CheckOption
          label="Free Cancellation"
          icon={<ShieldCheck />}
          selected={isSelected(
            "Free Cancellation"
          )}
          onClick={() =>
            toggleFilter(
              "Free Cancellation"
            )
          }
        />
      </FilterSection>

      {/* BUS OPERATOR */}

      <FilterSection
        title="BUS OPERATOR"
        sectionKey="operator"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <SearchBox
          value={operatorSearch}
          onChange={setOperatorSearch}
          placeholder="Search Bus Operators"
        />

        {filteredOperators.map(
          (operator) => (
            <CheckOption
              key={operator}
              label={operator}
              selected={isSelected(
                operator
              )}
              onClick={() =>
                toggleFilter(operator)
              }
            />
          )
        )}

        <button
          type="button"
          className="view-all"
        >
          View All Bus Operators
        </button>
      </FilterSection>

      {/* BOARDING POINTS */}

      <FilterSection
        title="BOARDING POINTS"
        sectionKey="boarding"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <SearchBox
          value={boardingSearch}
          onChange={setBoardingSearch}
          placeholder="Search Boarding Points"
        />

        {filteredBoardingPoints.map(
          (point) => (
            <CheckOption
              key={point}
              label={point}
              icon={<MapPin />}
              selected={isSelected(point)}
              onClick={() =>
                toggleFilter(point)
              }
            />
          )
        )}

        <button
          type="button"
          className="view-all"
        >
          View All Boarding Points
        </button>
      </FilterSection>

      {/* DROPPING POINTS */}

      <FilterSection
        title="DROPPING POINTS"
        sectionKey="dropping"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <SearchBox
          value={droppingSearch}
          onChange={setDroppingSearch}
          placeholder="Search Dropping Points"
        />

        {filteredDroppingPoints.map(
          (point) => (
            <CheckOption
              key={point}
              label={point}
              icon={<Navigation />}
              selected={isSelected(point)}
              onClick={() =>
                toggleFilter(point)
              }
            />
          )
        )}

        <button
          type="button"
          className="view-all"
        >
          View All Dropping Points
        </button>
      </FilterSection>

      {/* PRICE RANGE */}

      <FilterSection
        title="PRICE RANGE"
        sectionKey="price"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="price-range-box">
          <div
            ref={priceSliderRef}
            className="price-range-slider"
          >
            <div className="price-range-track" />

            <div
              className="price-range-active"
              style={{
                left: `${minPricePercentage}%`,
                right: `${
                  100 -
                  maxPricePercentage
                }%`,
              }}
            />

            <div
              className="price-range-thumb"
              style={{
                left: `${minPricePercentage}%`,
              }}
              onPointerDown={
                handleMinPointerDown
              }
            />

            <div
              className="price-range-thumb"
              style={{
                left: `${maxPricePercentage}%`,
              }}
              onPointerDown={
                handleMaxPointerDown
              }
            />
          </div>

          <div className="price-values">
            <span>
              ₹
              {minPrice.toLocaleString(
                "en-IN"
              )}
            </span>

            <span>
              ₹
              {maxPrice.toLocaleString(
                "en-IN"
              )}
            </span>
          </div>
        </div>
      </FilterSection>

      {/* AMENITIES */}

      <FilterSection
        title="AMENITIES"
        sectionKey="amenities"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <SearchBox
          value={amenitySearch}
          onChange={setAmenitySearch}
          placeholder="Search Amenities"
        />

        {filteredAmenities.map(
          (amenity) => {
            let icon: React.ReactNode;

            if (amenity === "WIFI") {
              icon = <Wifi />;
            } else if (
              amenity === "Water Bottle"
            ) {
              icon = <Droplets />;
            } else if (
              amenity === "Blankets"
            ) {
              icon = <BedDouble />;
            } else {
              icon = <BatteryCharging />;
            }

            return (
              <CheckOption
                key={amenity}
                label={amenity}
                icon={icon}
                selected={isSelected(
                  amenity
                )}
                onClick={() =>
                  toggleFilter(
                    amenity
                  )
                }
              />
            );
          }
        )}

        <button
          type="button"
          className="view-all"
        >
          View All Amenities
        </button>
      </FilterSection>

      {/* SPECIAL BUS FEATURES */}

      <FilterSection
        title="SPECIAL BUS FEATURES"
        sectionKey="special"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        {specialFeatures.map(
          (feature) => (
            <CheckOption
              key={feature}
              label={feature}
              icon={
                feature === "New Bus" ? (
                  <BusFront />
                ) : (
                  <CheckCircle />
                )
              }
              selected={isSelected(
                feature
              )}
              onClick={() =>
                toggleFilter(feature)
              }
            />
          )
        )}
      </FilterSection>

      {/* RTC BUS TYPE */}

      <FilterSection
        title="RTC BUS TYPE"
        sectionKey="rtc"
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <CheckOption
          label="RTC Bus"
          icon={<BusFront />}
          selected={isSelected(
            "RTC Bus"
          )}
          onClick={() =>
            toggleFilter("RTC Bus")
          }
        />
      </FilterSection>

    </aside>
  );
};


/* =========================================
   FILTER SECTION
========================================= */

const FilterSection: React.FC<
  FilterSectionProps
> = ({
  title,
  sectionKey,
  openSections,
  toggleSection,
  children,
}) => {
  const isOpen =
    openSections[sectionKey];

  return (
    <section className="filter-section">
      <button
        type="button"
        className="section-header"
        onClick={() =>
          toggleSection(sectionKey)
        }
      >
        <span>{title}</span>

        {isOpen ? (
          <ChevronUp />
        ) : (
          <ChevronDown />
        )}
      </button>

      {isOpen && (
        <div className="section-content">
          {children}
        </div>
      )}
    </section>
  );
};


/* =========================================
   CHECK OPTION
========================================= */

const CheckOption: React.FC<
  CheckOptionProps
> = ({
  label,
  selected,
  onClick,
  icon,
}) => {
  return (
    <button
      type="button"
      className={`check-option ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
    >
      <span
        className={`custom-checkbox ${
          selected ? "checked" : ""
        }`}
      >
        {selected && "✓"}
      </span>

      {icon && (
        <span className="check-option-icon">
          {icon}
        </span>
      )}

      <span className="check-option-label">
        {label}
      </span>
    </button>
  );
};


/* =========================================
   SEARCH BOX
========================================= */

const SearchBox: React.FC<
  SearchBoxProps
> = ({
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="filter-search">
      <Search />

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
      />
    </div>
  );
};

export default BusFilters;