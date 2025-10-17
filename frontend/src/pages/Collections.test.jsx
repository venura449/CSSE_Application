import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Collections from './Collections.jsx';

vi.mock('../components/RouteMap.jsx', () => ({ default: () => <div>RouteMap</div> }));

beforeEach(() => {
  localStorage.clear();
});

it('renders calendar header and allows adding a local schedule', () => {
  render(<Collections />);
  expect(screen.getByText(/Schedule Pickup/i)).toBeInTheDocument();
  // fill form on right sidebar
  const dateInput = screen.getAllByRole('textbox').find(() => true); // time input is textbox; date input is type=date, not textbox
  const dateEl = screen.getAllByDisplayValue('')[0];
  fireEvent.change(dateEl, { target: { value: '2025-09-03' } });
  const timeInput = screen.getByPlaceholderText('e.g. 9:00 AM');
  fireEvent.change(timeInput, { target: { value: '9:15 AM' } });
  fireEvent.click(screen.getByText('Add Schedule'));
  expect(screen.getByText('Today\'s Route')).toBeInTheDocument();
});



