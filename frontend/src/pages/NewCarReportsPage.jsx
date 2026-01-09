import React from 'react';
import ReportsPage from './ReportsPage';

// Wrapper component that passes carType='new' to the ReportsPage
export default function NewCarReportsPage() {
    return <ReportsPage carTypeFilter="new" pageTitle="New Car Reports" />;
}
