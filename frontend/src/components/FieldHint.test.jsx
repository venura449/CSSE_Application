import { render, screen } from '@testing-library/react';
import React from 'react';
import FieldHint from './FieldHint.jsx';

it('renders hint text', () => {
  render(<FieldHint>Helpful hint</FieldHint>);
  expect(screen.getByText('Helpful hint')).toBeInTheDocument();
});



