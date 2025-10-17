import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar.jsx';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
});

it('renders core nav links', () => {
  renderWithRouter(<Navbar />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Waste History')).toBeInTheDocument();
  expect(screen.getByText('Collections')).toBeInTheDocument();
  expect(screen.getByText('Payments')).toBeInTheDocument();
  expect(screen.getByText('Sensors')).toBeInTheDocument();
  expect(screen.getByText('Settings')).toBeInTheDocument();
});

it('shows Collector link for collector/authority', () => {
  localStorage.setItem('user', JSON.stringify({ email: 'c@collector.com', role: 'Collector' }));
  renderWithRouter(<Navbar />);
  expect(screen.getByText('Collector')).toBeInTheDocument();
});

it('toggles user menu and shows actions', () => {
  localStorage.setItem('user', JSON.stringify({ email: 'user@example.com', name: 'Test User' }));
  renderWithRouter(<Navbar />);
  fireEvent.click(screen.getByText(/Hi,/));
  expect(screen.getByText('Profile')).toBeInTheDocument();
  expect(screen.getByText('Logout')).toBeInTheDocument();
});



