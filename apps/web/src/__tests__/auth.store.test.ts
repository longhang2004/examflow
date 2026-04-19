const mockPost = jest.fn()
const mockGet = jest.fn()

jest.mock('@/lib/api-client', () => ({
  api: {
    post: mockPost,
    get: mockGet,
  },
}))

import { useAuthStore } from '../store/auth.store'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false })
  })

  describe('login', () => {
    it('should set user and tokens on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        role: 'STUDENT' as const,
        plan: 'FREE' as const,
        createdAt: new Date().toISOString(),
      }

      mockPost.mockResolvedValueOnce({
        user: mockUser,
        tokens: { accessToken: 'at-123', refreshToken: 'rt-456' },
      })

      await useAuthStore.getState().login('test@example.com', 'password123')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('at-123')
      expect(state.isLoading).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'at-123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'rt-456')
    })

    it('should set isLoading during login', async () => {
      mockPost.mockImplementation(() => {
        expect(useAuthStore.getState().isLoading).toBe(true)
        return Promise.resolve({
          user: { id: '1', email: '', displayName: '', role: 'STUDENT', plan: 'FREE', createdAt: '' },
          tokens: { accessToken: 'at', refreshToken: 'rt' },
        })
      })

      await useAuthStore.getState().login('a@b.com', 'pw')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should reset isLoading on error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        useAuthStore.getState().login('a@b.com', 'pw'),
      ).rejects.toThrow('Network error')

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('should set user and tokens on successful registration', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'new@example.com',
        displayName: 'New User',
        role: 'TEACHER' as const,
        plan: 'FREE' as const,
        createdAt: new Date().toISOString(),
      }

      mockPost.mockResolvedValueOnce({
        user: mockUser,
        tokens: { accessToken: 'at-new', refreshToken: 'rt-new' },
      })

      await useAuthStore.getState().register({
        email: 'new@example.com',
        password: 'SecureP@ss1',
        displayName: 'New User',
        role: 'TEACHER',
      })

      const state = useAuthStore.getState()
      expect(state.user?.role).toBe('TEACHER')
      expect(state.accessToken).toBe('at-new')
    })
  })

  describe('logout', () => {
    it('should clear user, tokens, and storage', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', displayName: 'A', role: 'STUDENT', plan: 'FREE', createdAt: '' },
        accessToken: 'at-1',
      })

      mockPost.mockResolvedValueOnce(undefined)

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })

    it('should still clear state even if API call fails', async () => {
      useAuthStore.setState({
        user: { id: '1', email: '', displayName: '', role: 'STUDENT', plan: 'FREE', createdAt: '' },
        accessToken: 'at',
      })

      mockPost.mockRejectedValueOnce(new Error('Server down'))

      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('should return true and update tokens on success', async () => {
      localStorageMock.getItem.mockReturnValueOnce('old-refresh')

      mockPost.mockResolvedValueOnce({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      })

      const result = await useAuthStore.getState().refreshToken()

      expect(result).toBe(true)
      expect(useAuthStore.getState().accessToken).toBe('new-at')
    })

    it('should return false when no refresh token exists', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null)

      const result = await useAuthStore.getState().refreshToken()
      expect(result).toBe(false)
    })

    it('should return false on API error', async () => {
      localStorageMock.getItem.mockReturnValueOnce('some-token')
      mockPost.mockRejectedValueOnce(new Error('Expired'))

      const result = await useAuthStore.getState().refreshToken()
      expect(result).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should fetch user if token exists', async () => {
      localStorageMock.getItem.mockReturnValueOnce('existing-token')

      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'STUDENT' as const,
        plan: 'FREE' as const,
        createdAt: '',
      }
      mockGet.mockResolvedValueOnce(mockUser)

      await useAuthStore.getState().initialize()

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().accessToken).toBe('existing-token')
    })

    it('should clear state if token is invalid', async () => {
      localStorageMock.getItem.mockReturnValueOnce('bad-token')
      mockGet.mockRejectedValueOnce(new Error('401'))

      await useAuthStore.getState().initialize()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
    })

    it('should do nothing if no token', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null)

      await useAuthStore.getState().initialize()

      expect(mockGet).not.toHaveBeenCalled()
    })
  })
})
