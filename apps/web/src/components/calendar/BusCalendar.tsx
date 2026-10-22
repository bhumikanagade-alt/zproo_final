import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useMemo, useState } from 'react';

type BusCalendarProps = {
  selectedDate?: Date | null;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
};

const WEEK_DAYS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function BusCalendar({
  selectedDate = null,
  onSelectDate,
  onClose,
}: BusCalendarProps) {
  const today = useMemo(
    () => startOfDay(new Date()),
    [],
  );

  const initialDate = selectedDate
    ? startOfDay(selectedDate)
    : today;

  const [currentMonth, setCurrentMonth] =
    useState<Date>(
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1,
      ),
    );

  const [tempSelectedDate, setTempSelectedDate] =
    useState<Date>(initialDate);

  const monthName = currentMonth.toLocaleString(
    'en-US',
    {
      month: 'short',
    },
  );

  const year = currentMonth.getFullYear();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      year,
      currentMonth.getMonth(),
      1,
    );

    const firstWeekDay = firstDay.getDay();

    const daysInCurrentMonth = new Date(
      year,
      currentMonth.getMonth() + 1,
      0,
    ).getDate();

    const daysInPreviousMonth = new Date(
      year,
      currentMonth.getMonth(),
      0,
    ).getDate();

    const days: Array<{
      date: Date;
      currentMonth: boolean;
    }> = [];

    for (
      let index = firstWeekDay - 1;
      index >= 0;
      index -= 1
    ) {
      days.push({
        date: new Date(
          year,
          currentMonth.getMonth() - 1,
          daysInPreviousMonth - index,
        ),
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= daysInCurrentMonth;
      day += 1
    ) {
      days.push({
        date: new Date(
          year,
          currentMonth.getMonth(),
          day,
        ),
        currentMonth: true,
      });
    }

    let nextMonthDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(
          year,
          currentMonth.getMonth() + 1,
          nextMonthDay,
        ),
        currentMonth: false,
      });

      nextMonthDay += 1;
    }

    return days;
  }, [currentMonth, year]);

  const goToPreviousMonth = () => {
    const previousMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1,
    );

    const minimumMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

    if (previousMonth < minimumMonth) {
      return;
    }

    setCurrentMonth(previousMonth);
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      ),
    );
  };

  const handleDateClick = (date: Date) => {
    const normalizedDate = startOfDay(date);

    if (normalizedDate < today) {
      return;
    }

    setTempSelectedDate(normalizedDate);
  };

  const handleToday = () => {
    setTempSelectedDate(today);

    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );
  };

  const handleDone = () => {
    onSelectDate(tempSelectedDate);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Select travel date"
      className="
        absolute
        right-0
        top-[calc(100%+5px)]
        z-[100]
        w-[300px]
        overflow-hidden
        rounded-lg
        border
        border-slate-200
        bg-white
        shadow-[0_8px_22px_rgba(15,23,42,0.15)]
      "
    >
      {/* HEADER */}

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-100
          px-2
          py-1.5
        "
      >
        <div className="flex items-center gap-1">
          <CalendarDays className="size-3 text-[#e50920]" />

          <span className="text-[9px] font-extrabold text-[#071a33]">
            {monthName} {year}
          </span>
        </div>

        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={goToPreviousMonth}
            disabled={
              currentMonth.getFullYear() ===
                today.getFullYear() &&
              currentMonth.getMonth() ===
                today.getMonth()
            }
            className="
              grid
              size-5
              place-items-center
              rounded
              border
              border-slate-200
              text-slate-500
              hover:border-[#e50920]
              hover:bg-red-50
              hover:text-[#e50920]
              disabled:opacity-25
            "
            aria-label="Previous month"
          >
            <ChevronLeft className="size-2.5" />
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            className="
              grid
              size-5
              place-items-center
              rounded
              border
              border-slate-200
              text-slate-500
              hover:border-[#e50920]
              hover:bg-red-50
              hover:text-[#e50920]
            "
            aria-label="Next month"
          >
            <ChevronRight className="size-2.5" />
          </button>
        </div>
      </div>

      {/* CALENDAR BODY */}

      <div className="px-1.5 pb-1 pt-1.5">
        {/* Weekdays */}

        <div className="grid grid-cols-7">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="
                flex
                h-4
                items-center
                justify-center
                text-[7px]
                font-extrabold
                text-slate-500
              "
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dates */}

        <div className="grid grid-cols-7">
          {calendarDays.map(
            ({
              date,
              currentMonth: isCurrentMonth,
            }) => {
              const isPast = date < today;

              const isSelected = isSameDay(
                date,
                tempSelectedDate,
              );

              const isToday = isSameDay(
                date,
                today,
              );

              return (
                <button
                  key={formatDate(date)}
                  type="button"
                  onClick={() =>
                    handleDateClick(date)
                  }
                  disabled={isPast}
                  aria-label={`Select ${date.toDateString()}`}
                  aria-pressed={isSelected}
                  className={[
                    'relative mx-auto flex size-5',
                    'items-center justify-center',
                    'rounded-full text-[7px] font-semibold',
                    'transition-all duration-100',

                    !isCurrentMonth
                      ? 'text-slate-300'
                      : isPast
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-[#071a33]',

                    !isPast && !isSelected
                      ? 'hover:bg-red-50 hover:text-[#e50920]'
                      : '',

                    isSelected
                      ? 'bg-[#e50920] text-white'
                      : '',

                    isToday && !isSelected
                      ? 'ring-1 ring-[#e50920]/50'
                      : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* FOOTER */}

      <div
        className="
          flex
          items-center
          justify-between
          border-t
          border-slate-100
          px-2
          py-1.5
        "
      >
        <button
          type="button"
          onClick={handleToday}
          className="
            rounded
            px-1.5
            py-0.5
            text-[7px]
            font-bold
            text-[#e50920]
            hover:bg-red-50
          "
        >
          Today
        </button>

        <button
          type="button"
          onClick={handleDone}
          className="
            rounded
            bg-[#e50920]
            px-2.5
            py-1
            text-[7px]
            font-bold
            text-white
            hover:bg-[#c7081c]
            active:scale-95
          "
        >
          Done
        </button>
      </div>
    </div>
  );
}