import { render, screen } from '@testing-library/react';
import App from './App';

test('renders game title', () => {
  render(<App />);
  const title = screen.getByText(/Puyo Puyo Game/i);
  expect(title).toBeInTheDocument();
});
