const mockAxios = {
  defaults: {
    headers: {
      common: {},
    },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios),
};

export default mockAxios;
