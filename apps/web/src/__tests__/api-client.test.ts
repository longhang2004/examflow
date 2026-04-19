describe('API Client module', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('should export api object with get, post, put, patch, del methods', () => {
    jest.mock('axios', () => {
      const mockInstance = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      }
      return {
        __esModule: true,
        default: {
          create: jest.fn(() => mockInstance),
          post: jest.fn(),
        },
      }
    })

    const { api } = require('@/lib/api-client')
    expect(api).toHaveProperty('get')
    expect(api).toHaveProperty('post')
    expect(api).toHaveProperty('put')
    expect(api).toHaveProperty('patch')
    expect(api).toHaveProperty('del')
  })

  it('should create instance with correct headers', () => {
    const mockCreate = jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }))

    jest.mock('axios', () => ({
      __esModule: true,
      default: {
        create: mockCreate,
        post: jest.fn(),
      },
    }))

    require('@/lib/api-client')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('should unwrap API response data.data format', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { data: { id: '123', name: 'Test' } },
    })

    jest.mock('axios', () => ({
      __esModule: true,
      default: {
        create: jest.fn(() => ({
          get: mockGet,
          post: jest.fn(),
          put: jest.fn(),
          patch: jest.fn(),
          delete: jest.fn(),
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
          },
        })),
        post: jest.fn(),
      },
    }))

    const { api } = require('@/lib/api-client')
    const result = await api.get('/test')
    expect(result).toEqual({ id: '123', name: 'Test' })
  })

  it('should fall back to data when data.data is undefined', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      data: { message: 'created' },
    })

    jest.mock('axios', () => ({
      __esModule: true,
      default: {
        create: jest.fn(() => ({
          get: jest.fn(),
          post: mockPost,
          put: jest.fn(),
          patch: jest.fn(),
          delete: jest.fn(),
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
          },
        })),
        post: jest.fn(),
      },
    }))

    const { api } = require('@/lib/api-client')
    const result = await api.post('/test', { body: true })
    expect(result).toEqual({ message: 'created' })
  })
})
