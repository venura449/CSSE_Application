import { render, screen } from '@testing-library/react';
import React from 'react';
import Settings from './Settings.jsx';

it('renders settings page', () => {
  render(<Settings />);
  expect(screen.getByText('Settings')).toBeInTheDocument();
});



