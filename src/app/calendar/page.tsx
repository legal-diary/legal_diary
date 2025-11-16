'use client';

import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import HearingCalendar from '@/components/HearingCalendar/HearingCalendar';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <HearingCalendar />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
