import { bootReader } from './reader'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootReader())
} else {
  void bootReader()
}
