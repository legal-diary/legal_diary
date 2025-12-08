'use client';

import React from 'react';
import { Card, Row, Col } from 'antd';

// Global shimmer animation styles
export const shimmerStyles = `
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

  .skeleton-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// Base skeleton line component
interface SkeletonLineProps {
  width?: string | number;
  height?: number;
  style?: React.CSSProperties;
  dark?: boolean;
  className?: string;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 16,
  style,
  dark = false,
  className = '',
}) => (
  <div
    className={`${dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'} ${className}`}
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
      flexShrink: 0,
      ...style,
    }}
  />
);

// Skeleton card component
interface SkeletonCardProps {
  lines?: number;
  showImage?: boolean;
  style?: React.CSSProperties;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 4,
  showImage = false,
  style,
}) => (
  <Card
    hoverable
    style={{
      height: '100%',
      borderRadius: '0.8rem',
      border: '1px solid #e8e8e8',
      ...style,
    }}
  >
    {showImage && (
      <div
        className="skeleton-shimmer"
        style={{ width: '100%', height: '120px', marginBottom: '16px', borderRadius: '8px' }}
      />
    )}
    <div style={{ marginBottom: '12px' }}>
      <SkeletonLine width="60%" height={20} style={{ marginBottom: '8px' }} />
      <SkeletonLine width="80%" height={14} />
    </div>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <SkeletonLine width={60} height={22} style={{ borderRadius: '4px' }} />
      <SkeletonLine width={50} height={22} style={{ borderRadius: '4px' }} />
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine
        key={i}
        width={i === lines - 1 ? '50%' : '100%'}
        height={12}
        style={{ marginBottom: '8px' }}
      />
    ))}
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
      <SkeletonLine width="100%" height={32} style={{ borderRadius: '6px' }} />
    </div>
  </Card>
);

// Cases page skeleton
export const CasesPageSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SkeletonLine width={60} height={24} />
        </div>
      }
      extra={<SkeletonLine width={100} height={32} style={{ borderRadius: '6px' }} />}
    >
      {/* Filters skeleton */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <SkeletonLine width={60} height={14} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <SkeletonLine width={50} height={14} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <SkeletonLine width={55} height={14} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
          </Col>
        </Row>
      </div>

      {/* Cards skeleton */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Col key={i} xs={24} sm={12} md={8} lg={6}>
            <SkeletonCard />
          </Col>
        ))}
      </Row>
    </Card>
  </>
);

// Case detail page skeleton
export const CaseDetailSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    {/* Header card */}
    <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
      <Col xs={24}>
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <SkeletonLine width={300} height={28} style={{ marginBottom: '8px' }} />
              <SkeletonLine width={150} height={16} />
            </Col>
            <Col>
              <div style={{ display: 'flex', gap: '8px' }}>
                <SkeletonLine width={80} height={32} style={{ borderRadius: '6px' }} />
                <SkeletonLine width={60} height={32} style={{ borderRadius: '6px' }} />
                <SkeletonLine width={70} height={32} style={{ borderRadius: '6px' }} />
                <SkeletonLine width={80} height={32} style={{ borderRadius: '6px' }} />
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>

    {/* Tabs skeleton */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
        {['Overview', 'Hearings', 'Documents', 'AI Analysis'].map((tab, i) => (
          <SkeletonLine key={tab} width={70 + i * 10} height={20} />
        ))}
      </div>
    </div>

    {/* Content skeleton */}
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ padding: '12px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
            <SkeletonLine width="40%" height={12} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="70%" height={16} />
          </div>
        ))}
      </div>

      {/* Description card */}
      <div style={{ marginTop: '24px' }}>
        <SkeletonLine width={150} height={20} style={{ marginBottom: '16px' }} />
        <SkeletonLine width="100%" height={14} style={{ marginBottom: '8px' }} />
        <SkeletonLine width="95%" height={14} style={{ marginBottom: '8px' }} />
        <SkeletonLine width="80%" height={14} />
      </div>
    </Card>
  </>
);

// Calendar page skeleton
export const CalendarSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <Card title={<SkeletonLine width={150} height={24} />} style={{ marginBottom: '16px' }}>
      {/* Calendar header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <SkeletonLine width={120} height={32} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <SkeletonCircle size={32} />
          <SkeletonCircle size={32} />
        </div>
      </div>

      {/* Calendar days header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <SkeletonLine key={day} width="100%" height={20} style={{ textAlign: 'center' }} />
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: '80px',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              padding: '8px',
            }}
          >
            <SkeletonLine width={20} height={16} style={{ marginBottom: '8px' }} />
            {i % 4 === 0 && <SkeletonLine width="90%" height={12} />}
          </div>
        ))}
      </div>
    </Card>

    {/* Hearings for date */}
    <Card
      title={<SkeletonLine width={200} height={20} />}
      extra={<SkeletonLine width={130} height={32} style={{ borderRadius: '6px' }} />}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '16px 0',
            borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          <SkeletonCircle size={40} />
          <div style={{ flex: 1 }}>
            <SkeletonLine width="60%" height={16} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="40%" height={12} style={{ marginBottom: '4px' }} />
            <SkeletonLine width={80} height={22} style={{ borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </Card>
  </>
);

// Table skeleton
interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 5,
  rows = 5,
  showHeader = true,
}) => (
  <div style={{ width: '100%' }}>
    <style>{shimmerStyles}</style>
    {showHeader && (
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} style={{ flex: i === columns - 1 ? 2 : 1 }}>
            <SkeletonLine width="70%" height={14} />
          </div>
        ))}
      </div>
    )}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} style={{ flex: colIndex === columns - 1 ? 2 : 1 }}>
            <SkeletonLine width={colIndex === 0 ? '80%' : '60%'} height={14} />
            {colIndex > 0 && colIndex < columns - 1 && (
              <SkeletonLine width="40%" height={10} style={{ marginTop: '4px' }} />
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Create case form skeleton
export const CreateCaseFormSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <Card title={<SkeletonLine width={150} height={24} />} style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <SkeletonLine width={100} height={14} style={{ marginBottom: '8px' }} />
          <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
        </Col>
        <Col xs={24} md={12}>
          <SkeletonLine width={80} height={14} style={{ marginBottom: '8px' }} />
          <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
        </Col>
      </Row>

      <div style={{ margin: '24px 0', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
        <SkeletonLine width={130} height={16} />
      </div>

      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={24} md={12}>
            <SkeletonLine width={90} height={14} style={{ marginBottom: '8px' }} />
            <SkeletonLine width="100%" height={40} style={{ borderRadius: '6px' }} />
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: '24px' }}>
        <SkeletonLine width={120} height={14} style={{ marginBottom: '8px' }} />
        <SkeletonLine width="100%" height={100} style={{ borderRadius: '6px' }} />
      </div>

      <div style={{ marginTop: '24px' }}>
        <SkeletonLine width="100%" height={48} style={{ borderRadius: '6px' }} />
      </div>
    </Card>
  </>
);

// Section loader wrapper
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

// Re-export dashboard skeletons for convenience
export {
  HeaderSkeleton,
  TodayScheduleSkeleton,
  UpcomingHearingsSkeleton,
  DashboardSkeleton,
} from '@/components/Dashboard/DashboardSkeleton';
