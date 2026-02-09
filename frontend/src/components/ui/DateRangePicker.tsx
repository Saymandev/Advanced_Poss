'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface DateRangePickerProps {
  checkInDate: string;
  checkOutDate: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  minDate?: Date;
  disabledDates?: Date[];
}

export function DateRangePicker({
  checkInDate,
  checkOutDate,
  onCheckInChange,
  onCheckOutChange,
  minDate = new Date(),
  disabledDates = [],
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'checkIn' | 'checkOut'>('checkIn');

  const checkIn = checkInDate ? new Date(checkInDate) : null;
  const checkOut = checkOutDate ? new Date(checkOutDate) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(minDate);
    const dateToCheck = startOfDay(date);

    // Can't select past dates
    if (isBefore(dateToCheck, today)) {
      return true;
    }

    // Check if date is in disabled dates
    return disabledDates.some(disabledDate => isSameDay(dateToCheck, disabledDate));
  };

  const isDateInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false;
    const dateToCheck = startOfDay(date);
    const checkInDay = startOfDay(checkIn);
    const checkOutDay = startOfDay(checkOut);
    return dateToCheck >= checkInDay && dateToCheck <= checkOutDay;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    const dateString = format(date, 'yyyy-MM-dd');

    if (selecting === 'checkIn') {
      onCheckInChange(dateString);
      // If check-out is before new check-in, clear it
      if (checkOut && date >= checkOut) {
        onCheckOutChange('');
        setSelecting('checkOut');
      } else {
        setSelecting('checkOut');
      }
    } else {
      // Check-out selection
      if (checkIn && date <= checkIn) {
        // If selected date is before check-in, make it the new check-in
        onCheckInChange(dateString);
        onCheckOutChange('');
        setSelecting('checkOut');
      } else {
        onCheckOutChange(dateString);
        setSelecting('checkIn');
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = monthStart.getDay();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month start */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {daysInMonth.map((day) => {
          const isDisabled = isDateDisabled(day);
          const isSelectedCheckIn = checkIn && isSameDay(day, checkIn);
          const isSelectedCheckOut = checkOut && isSameDay(day, checkOut);
          const isInRange = isDateInRange(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-colors
                ${isDisabled
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                }
                ${isSelectedCheckIn || isSelectedCheckOut
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : isInRange
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                }
                ${isToday && !isSelectedCheckIn && !isSelectedCheckOut
                  ? 'ring-2 ring-primary-400'
                  : ''
                }
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary-600"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-900/30"></div>
            <span>In Range</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span>Selecting: {selecting === 'checkIn' ? 'Check-In' : 'Check-Out'}</span>
        </div>
      </div>
    </div>
  );
}

