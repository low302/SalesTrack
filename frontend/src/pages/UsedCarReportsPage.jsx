import React from 'react';
import ReportsPage from './ReportsPage';

// Wrapper component that passes carType='used' to the ReportsPage
export default function UsedCarReportsPage() {
    return <ReportsPage carTypeFilter="used" pageTitle="Used Car Reports" />;
}
