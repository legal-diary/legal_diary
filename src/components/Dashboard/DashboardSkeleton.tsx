'use client';

import React from 'react';
import { Card } from 'antd';

// CSS-in-JS styles for shimmer animation
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e8e8e8 50%,
      #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite ease-in-out;
    border-radius: 4px;
  }

  .skeleton-shimmer-dark {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.1) 25%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.1) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite ease-in-out;
    border-radius: 4px;
  }
`;

// Skeleton line component
interface SkeletonLineProps {
  width?: string | number;
  height?: number;
  style?: React.CSSProperties;
  dark?: boolean;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 16,
  style,
  dark = false,
}) => (
  <div
    className={dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: `${height}px`,
      ...style,
    }}
  />
);

// Skeleton circle component
interface SkeletonCircleProps {
  size?: number;
  style?: React.CSSProperties;
  dark?: boolean;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 48,
  style,
  dark = false,
}) => (
  <div
    className={dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      ...style,
    }}
  />
);

// Header skeleton (for the top banner)
export const HeaderSkeleton: React.FC = () => (
  <div
    style={{
      marginBottom: '24px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '24px 32px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <SkeletonCircle size={36} dark />
        <div>
          <SkeletonLine width={100} height={14} dark style={{ marginBottom: '8px' }} />
          <SkeletonLine width={280} height={28} dark />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <SkeletonCircle size={48} dark style={{ margin: '0 auto 8px' }} />
        <SkeletonLine width={40} height={24} dark style={{ margin: '0 auto 4px' }} />
        <SkeletonLine width={80} height={12} dark style={{ margin: '0 auto' }} />
      </div>
    </div>
  </div>
);

// Table row skeleton
interface TableRowSkeletonProps {
  columns: number;
  rowHeight?: number;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({
  columns,
  rowHeight = 54,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0',
      height: `${rowHeight}px`,
      gap: '16px',
    }}
  >
    {Array.from({ length: columns }).map((_, index) => (
      <div key={index} style={{ flex: index === columns - 1 ? 2 : 1 }}>
        <SkeletonLine
          width={index === 0 ? '80%' : index === columns - 1 ? '60%' : '70%'}
          height={14}
        />
        {index > 0 && index < columns - 1 && (
          <SkeletonLine width="50%" height={12} style={{ marginTop: '6px' }} />
        )}
      </div>
    ))}
  </div>
);

// Today's schedule table skeleton
export const TodayScheduleSkeleton: React.FC = () => (
  <Card
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SkeletonCircle size={20} />
        <SkeletonLine width={130} height={18} />
        <SkeletonLine width={60} height={22} style={{ borderRadius: '10px' }} />
      </div>
    }
    extra={<SkeletonLine width={120} height={16} />}
    styles={{ body: { padding: 0 } }}
  >
    {/* Table header */}
    <div
      style={{
        display: 'flex',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
        gap: '16px',
      }}
    >
      {['Previous Date', 'Case Number', 'Party Name', 'Stage', 'Next Date', 'Court', 'Notes'].map((_, i) => (
        <div key={i} style={{ flex: i === 6 ? 2 : 1 }}>
          <SkeletonLine width="70%" height={12} />
        </div>
      ))}
    </div>

    {/* Table rows */}
    {[1, 2, 3, 4].map((row) => (
      <TableRowSkeleton key={row} columns={7} />
    ))}
  </Card>
);

// Upcoming hearings table skeleton
export const UpcomingHearingsSkeleton: React.FC = () => (
  <Card
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SkeletonCircle size={20} />
        <SkeletonLine width={130} height={18} />
        <SkeletonLine width={80} height={22} style={{ borderRadius: '10px' }} />
      </div>
    }
    extra={<SkeletonLine width={140} height={32} style={{ borderRadius: '6px' }} />}
  >
    <SkeletonLine width={300} height={14} style={{ marginBottom: '16px' }} />

    {/* Compact table rows for upcoming */}
    {[1, 2, 3, 4, 5].map((row) => (
      <div
        key={row}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 0',
          borderBottom: row < 5 ? '1px solid #f0f0f0' : 'none',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <SkeletonLine width={70} height={14} />
          <SkeletonLine width={40} height={10} style={{ marginTop: '4px' }} />
        </div>
        <div style={{ flex: 2 }}>
          <SkeletonLine width="60%" height={13} />
          <SkeletonLine width="40%" height={10} style={{ marginTop: '4px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <SkeletonLine width={80} height={20} style={{ borderRadius: '10px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <SkeletonLine width={70} height={20} style={{ borderRadius: '10px' }} />
        </div>
        <div style={{ width: '80px', display: 'flex', gap: '8px' }}>
          <SkeletonCircle size={24} />
          <SkeletonCircle size={24} />
        </div>
      </div>
    ))}
  </Card>
);

// Complete dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <HeaderSkeleton />
    <TodayScheduleSkeleton />
    <div style={{ margin: '32px 0 24px', borderTop: '1px solid #f0f0f0' }} />
    <UpcomingHearingsSkeleton />
  </>
);

// Individual section loading wrapper
interface SectionLoaderProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export const SectionLoader: React.FC<SectionLoaderProps> = ({
  loading,
  skeleton,
  children,
}) => {
  if (loading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
};

export default DashboardSkeleton;
