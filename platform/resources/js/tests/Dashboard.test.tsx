import { expect, test } from 'vitest'
import { render } from '@testing-library/react'

import Dashboard from '../Pages/Dashboard'

test('renders dashboard with title', () => {
  const { getByText } = render(<Dashboard />)
  expect(getByText('Dashboard')).toBeInTheDocument()
})


