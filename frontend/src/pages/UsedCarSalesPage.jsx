import React from 'react';
import SalesPage from './SalesPage';

// Wrapper component that passes carType='used' to the SalesPage
export default function UsedCarSalesPage() {
    return <SalesPage carTypeFilter="used" pageTitle="Used Car Sales" />;
}
