/**
 * Karnataka High Court & District Court Calendar 2026
 * Source: Official High Court of Karnataka Calendar 2026
 *
 * Legend:
 * - RED: Sundays, Second Saturdays, General Holidays
 * - BLUE: Vacations
 * - GREEN: Restricted Holidays
 */

export interface CourtHoliday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'general' | 'restricted' | 'vacation' | 'second_saturday' | 'sunday';
}

export interface VacationPeriod {
  name: string;
  startDate: string;
  endDate: string;
  color: string;
}

// Vacation Periods for 2026
export const VACATION_PERIODS: VacationPeriod[] = [
  {
    name: 'Summer Vacation',
    startDate: '2026-05-04',
    endDate: '2026-05-30',
    color: '#1890ff', // Blue
  },
  {
    name: 'Dasara Vacation',
    startDate: '2026-10-19',
    endDate: '2026-10-24',
    color: '#1890ff', // Blue
  },
  {
    name: 'Winter Vacation',
    startDate: '2026-12-21',
    endDate: '2026-12-31',
    color: '#1890ff', // Blue
  },
];

// General Holidays for 2026 (High Court & District Courts)
export const GENERAL_HOLIDAYS: CourtHoliday[] = [
  // January
  { date: '2026-01-01', name: 'New Year\'s Day', type: 'general' },
  { date: '2026-01-02', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-01-15', name: 'Uttarayana Punyakala/Sankranthi Festival', type: 'general' },
  { date: '2026-01-16', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-01-26', name: 'Republic Day', type: 'general' },

  // March
  { date: '2026-03-19', name: 'Chandramana Ugadi', type: 'general' },
  { date: '2026-03-20', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-03-21', name: 'Khutub-E-Ramzan*', type: 'general' }, // Moon dependent
  { date: '2026-03-30', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-03-31', name: 'Mahaveer Jayanti', type: 'general' },

  // April
  { date: '2026-04-03', name: 'Good Friday', type: 'general' },
  { date: '2026-04-13', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'general' },
  { date: '2026-04-20', name: 'Basava Jayanti/Akshaya Tritiya', type: 'general' },

  // May
  { date: '2026-05-01', name: 'May Day', type: 'general' },
  { date: '2026-05-28', name: 'Bakrid*', type: 'general' }, // Moon dependent

  // June
  { date: '2026-06-26', name: 'Last Day of Moharam*', type: 'general' }, // Moon dependent

  // August
  { date: '2026-08-15', name: 'Independence Day', type: 'general' },
  { date: '2026-08-21', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-08-26', name: 'Id-Milad*', type: 'general' }, // Moon dependent

  // September
  { date: '2026-09-04', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-09-14', name: 'Varasiddhi Vinayaka Vratha', type: 'general' },

  // October
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'general' },
  { date: '2026-10-09', name: 'Maharnavami/Ayudhapooja', type: 'general' },
  { date: '2026-10-11', name: 'Vijayadashami', type: 'general' },

  // November
  { date: '2026-11-09', name: 'Holiday (HC Calendar)', type: 'general' },
  { date: '2026-11-10', name: 'Balipadyami/Deepavali', type: 'general' },
  { date: '2026-11-27', name: 'Kanakadasa Jayanti', type: 'general' },

  // December
  { date: '2026-12-25', name: 'Christmas Day', type: 'general' },
];

// Restricted Holidays for 2026
export const RESTRICTED_HOLIDAYS: CourtHoliday[] = [
  { date: '2026-01-01', name: 'New Year\'s Day', type: 'restricted' },
  { date: '2026-01-27', name: 'Sri Madhvanavami', type: 'restricted' },
  { date: '2026-02-04', name: 'Shab-e-Barat', type: 'restricted' },
  { date: '2026-03-02', name: 'Holi Festival', type: 'restricted' },
  { date: '2026-03-17', name: 'Shab-e-Khader', type: 'restricted' },
  { date: '2026-03-20', name: 'Jamat-Ul-Vida', type: 'restricted' },
  { date: '2026-03-23', name: 'Devara Dasimayya Jayanti', type: 'restricted' },
  { date: '2026-03-27', name: 'Sri Ramanavami', type: 'restricted' },
  { date: '2026-04-04', name: 'Holy Saturday', type: 'restricted' },
  { date: '2026-04-21', name: 'Sri Shankaracharya Jayanti', type: 'restricted' },
  { date: '2026-04-22', name: 'Sri Ramanujacharya Jayanti', type: 'restricted' },
  { date: '2026-04-21', name: 'Sri Varamahalakshmi Vratha', type: 'restricted' },
  { date: '2026-07-27', name: 'Yajur Upakarma', type: 'restricted' },
  { date: '2026-08-28', name: 'Brahma Shri Narayana Guru Jayanti/Raksha Bandhan', type: 'restricted' },
  { date: '2026-04-09', name: 'Sri Krishnajanmashtami', type: 'restricted' },
  { date: '2026-08-09', name: 'Kanya Mariyamma Jayanti', type: 'restricted' },
  { date: '2026-09-17', name: 'Vishwakarma Jayanti', type: 'restricted' },
  { date: '2026-09-25', name: 'Ananta Padmanabha Vratha', type: 'restricted' },
  { date: '2026-10-21', name: 'Sri Varamahalakshmi Vratha', type: 'restricted' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'restricted' },
  { date: '2026-11-26', name: 'Huttari Festival', type: 'restricted' },
  { date: '2026-12-24', name: 'Christmas Eve', type: 'restricted' },
];

// Sitting Days (Courts work on these days despite being Saturday)
export const SITTING_DAYS_HIGH_COURT: string[] = [
  '2026-01-31', // Saturday
  '2026-02-21', // Saturday
  '2026-04-18', // Saturday
  '2026-04-25', // Saturday
  '2026-08-29', // Saturday
  '2026-09-19', // Saturday
  '2026-11-21', // Saturday
];

export const SITTING_DAYS_DISTRICT_COURT: string[] = [
  '2026-01-24', // Saturday
  '2026-02-28', // Saturday
  '2026-03-28', // Saturday
  '2026-04-25', // Saturday
  '2026-06-27', // Saturday
  '2026-07-25', // Saturday
  '2026-08-22', // Saturday
  '2026-09-26', // Saturday
  '2026-11-28', // Saturday
];

// Second Saturdays of 2026 (Non-working days)
export const SECOND_SATURDAYS_2026: string[] = [
  '2026-01-10',
  '2026-02-14',
  '2026-03-14',
  '2026-04-11',
  '2026-05-09',
  '2026-06-13',
  '2026-07-11',
  '2026-08-08',
  '2026-09-12',
  '2026-10-10',
  '2026-11-14',
  '2026-12-12',
];

// Helper function to get all Sundays in 2026
export function getSundaysIn2026(): string[] {
  const sundays: string[] = [];
  const date = new Date('2026-01-01');
  const endDate = new Date('2026-12-31');

  while (date <= endDate) {
    if (date.getDay() === 0) { // Sunday
      sundays.push(date.toISOString().split('T')[0]);
    }
    date.setDate(date.getDate() + 1);
  }
  return sundays;
}

// Check if a date falls within a vacation period
export function isVacationDay(dateStr: string): VacationPeriod | null {
  for (const vacation of VACATION_PERIODS) {
    if (dateStr >= vacation.startDate && dateStr <= vacation.endDate) {
      return vacation;
    }
  }
  return null;
}

// Check if a date is a second Saturday
export function isSecondSaturday(dateStr: string): boolean {
  return SECOND_SATURDAYS_2026.includes(dateStr);
}

// Check if a date is a Sunday
export function isSunday(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date.getDay() === 0;
}

// Check if a date is a general holiday
export function isGeneralHoliday(dateStr: string): CourtHoliday | null {
  return GENERAL_HOLIDAYS.find(h => h.date === dateStr) || null;
}

// Check if a date is a restricted holiday
export function isRestrictedHoliday(dateStr: string): CourtHoliday | null {
  return RESTRICTED_HOLIDAYS.find(h => h.date === dateStr) || null;
}

// Check if a date is a sitting day (overrides weekend)
export function isSittingDay(dateStr: string): boolean {
  return SITTING_DAYS_HIGH_COURT.includes(dateStr) || SITTING_DAYS_DISTRICT_COURT.includes(dateStr);
}

// Main function to get day status
export interface DayStatus {
  isWorkingDay: boolean;
  isHoliday: boolean;
  isVacation: boolean;
  isSecondSaturday: boolean;
  isSunday: boolean;
  isRestrictedHoliday: boolean;
  isSittingDay: boolean;
  holidayName?: string;
  vacationName?: string;
  color: 'working' | 'holiday' | 'vacation' | 'restricted' | 'sitting';
}

export function getDayStatus(dateStr: string): DayStatus {
  const vacation = isVacationDay(dateStr);
  const generalHoliday = isGeneralHoliday(dateStr);
  const restrictedHoliday = isRestrictedHoliday(dateStr);
  const secondSat = isSecondSaturday(dateStr);
  const sunday = isSunday(dateStr);
  const sittingDay = isSittingDay(dateStr);

  // Determine if it's a working day
  let isWorkingDay = true;
  let color: DayStatus['color'] = 'working';
  let holidayName: string | undefined;
  let vacationName: string | undefined;

  // Check vacation first (Blue)
  if (vacation) {
    isWorkingDay = false;
    color = 'vacation';
    vacationName = vacation.name;
  }

  // Check general holiday (Red)
  if (generalHoliday) {
    isWorkingDay = false;
    color = 'holiday';
    holidayName = generalHoliday.name;
  }

  // Check Sunday (Red)
  if (sunday) {
    isWorkingDay = false;
    color = 'holiday';
    holidayName = holidayName || 'Sunday';
  }

  // Check Second Saturday (Red)
  if (secondSat && !sittingDay) {
    isWorkingDay = false;
    color = 'holiday';
    holidayName = holidayName || '2nd Saturday';
  }

  // Sitting day overrides weekend (Green border or special indicator)
  if (sittingDay) {
    isWorkingDay = true;
    color = 'sitting';
    holidayName = 'Sitting Day';
  }

  // Restricted holiday (Green) - doesn't make it non-working by default
  if (restrictedHoliday && color === 'working') {
    color = 'restricted';
    holidayName = restrictedHoliday.name;
  }

  return {
    isWorkingDay,
    isHoliday: !!generalHoliday || sunday || (secondSat && !sittingDay),
    isVacation: !!vacation,
    isSecondSaturday: secondSat,
    isSunday: sunday,
    isRestrictedHoliday: !!restrictedHoliday,
    isSittingDay: sittingDay,
    holidayName,
    vacationName,
    color,
  };
}

// Calculate working days in a month
export function getWorkingDaysInMonth(year: number, month: number): number {
  // month is 0-indexed (0 = January)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = getDayStatus(dateStr);
    if (status.isWorkingDay) {
      workingDays++;
    }
  }

  return workingDays;
}

// Get all holidays in a month for display
export function getHolidaysInMonth(year: number, month: number): CourtHoliday[] {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  return GENERAL_HOLIDAYS.filter(h => h.date.startsWith(monthStr));
}
