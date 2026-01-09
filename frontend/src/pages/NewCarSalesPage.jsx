import React from 'react';
import SalesPage from './SalesPage';

// Wrapper component that passes carType='new' to the SalesPage
export default function NewCarSalesPage() {
    return <SalesPage carTypeFilter="new" pageTitle="New Car Sales" />;
}
