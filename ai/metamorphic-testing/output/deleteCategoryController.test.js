// Jest test suite for deleteCategoryController based on provided Metamorphic Relations
const { deleteCategoryController } = require('../controllers/categoryController');
const categoryModel = require('../models/categoryModel');

// Helper to mock Express req and res
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}
function mockRequest(params = {}, query = {}) {
  return { params, query };
}

jest.mock('../models/categoryModel');

describe('deleteCategoryController', () => {
  // MR-1 – Idempotence of a successful delete
  describe('MR: Idempotence of a successful delete', () => {
    test('should return 200 on first delete and 404 on second delete of same id', async () => {
      const existingId = '60f5a3b2c2a1f81234567890';
      // First call resolves to a document
      categoryModel.findByIdAndDelete.mockResolvedValueOnce({ _id: existingId });
      // Second call resolves to null (already deleted)
      categoryModel.findByIdAndDelete.mockResolvedValueOnce(null);

      const req = mockRequest({ id: existingId });
      const res = mockResponse();

      await deleteCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ success: true, message: 'Category deleted successfully' });

      // second invocation
      await deleteCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ success: false, message: 'Failed to delete because no category is found' });
    });
  });

  // MR-2 – Monotonicity with respect to existence of the id
  describe('MR: Monotonicity with respect to existence of the id', () => {
    test('both non‑existent ids should return 404 and success false', async () => {
      const nonExistId1 = '60f5a3b2c2a1f81234567891';
      const nonExistId2 = '60f5a3b2c2a1f81234567892';
      categoryModel.findByIdAndDelete.mockResolvedValue(null);

      const req1 = mockRequest({ id: nonExistId1 });
      const res1 = mockResponse();
      await deleteCategoryController(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(404);
      expect(res1.send).toHaveBeenCalledWith({ success: false, message: 'Failed to delete because no category is found' });

      const req2 = mockRequest({ id: nonExistId2 });
      const res2 = mockResponse();
      await deleteCategoryController(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(404);
      expect(res2.send).toHaveBeenCalledWith({ success: false, message: 'Failed to delete because no category is found' });
    });
  });

  // MR-3 – Consistency under ignored query parameters
  describe('MR: Consistency under ignored query parameters', () => {
    test('adding irrelevant query params does not change response', async () => {
      const existingId = '60f5a3b2c2a1f81234567893';
      categoryModel.findByIdAndDelete.mockResolvedValue({ _id: existingId });

      const reqBase = mockRequest({ id: existingId });
      const resBase = mockResponse();
      await deleteCategoryController(reqBase, resBase);
      const baseStatus = resBase.status.mock.calls[0][0];
      const basePayload = resBase.send.mock.calls[0][0];

      // reset mocks for second call
      resBase.status.mockClear();
      resBase.send.mockClear();

      const reqWithQuery = mockRequest({ id: existingId }, { foo: 'bar', debug: 'true' });
      await deleteCategoryController(reqWithQuery, resBase);
      const queryStatus = resBase.status.mock.calls[0][0];
      const queryPayload = resBase.send.mock.calls[0][0];

      expect(queryStatus).toBe(baseStatus);
      expect(queryPayload).toEqual(basePayload);
    });
  });

  // MR-4 – Effect of a malformed id on validation path
  describe('MR: Effect of a malformed id on validation path', () => {
    test('missing id and empty string id both return 422', async () => {
      const reqMissing = mockRequest({});
      const resMissing = mockResponse();
      await deleteCategoryController(reqMissing, resMissing);
      expect(resMissing.status).toHaveBeenCalledWith(422);
      expect(resMissing.send).toHaveBeenCalledWith({ success: false, message: 'Category id cannot be empty' });

      const reqEmpty = mockRequest({ id: '' });
      const resEmpty = mockResponse();
      await deleteCategoryController(reqEmpty, resEmpty);
      expect(resEmpty.status).toHaveBeenCalledWith(422);
      expect(resEmpty.send).toHaveBeenCalledWith({ success: false, message: 'Category id cannot be empty' });
    });
  });

  // MR-5 – Stability under deterministic id transformation that preserves existence
  describe('MR: Stability under deterministic id transformation that preserves existence', () => {
    test('different existing ids mapped bijectively both succeed', async () => {
      const idA = '60f5a3b2c2a1f81234567894';
      const idB = '60f5a3b2c2a1f81234567895';
      // Mock each call to return a document for its respective id
      categoryModel.findByIdAndDelete.mockImplementation(async (id) => ({ _id: id }));

      const reqA = mockRequest({ id: idA });
      const resA = mockResponse();
      await deleteCategoryController(reqA, resA);
      expect(resA.status).toHaveBeenCalledWith(200);
      expect(resA.send).toHaveBeenCalledWith({ success: true, message: 'Category deleted successfully' });

      const reqB = mockRequest({ id: idB });
      const resB = mockResponse();
      await deleteCategoryController(reqB, resB);
      expect(resB.status).toHaveBeenCalledWith(200);
      expect(resB.send).toHaveBeenCalledWith({ success: true, message: 'Category deleted successfully' });
    });
  });
});
