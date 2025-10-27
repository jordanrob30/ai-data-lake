import { expect, test, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

import Confirmations from '../Pages/Confirmations'

test('confirms a mapping', () => {
  const mockPost = vi.fn()
  vi.mock('@inertiajs/react', () => ({ post: mockPost }))

  const pending = [{ id: 1, suggested_mapping: 'Test' }]
  const { getByText } = render(<Confirmations pendingMappings={pending} />)

  fireEvent.click(getByText('Confirm'))
  expect(mockPost).toHaveBeenCalledWith('/confirmations/1')
})


