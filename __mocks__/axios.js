const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios)
};

module.exports = mockAxios;
module.exports.default = mockAxios;
