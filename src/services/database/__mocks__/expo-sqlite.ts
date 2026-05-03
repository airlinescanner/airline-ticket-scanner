/**
 * Mock для expo-sqlite для unit-тестирования
 */

interface MockDatabase {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  closeAsync: jest.Mock;
}

const mockDb: MockDatabase = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  closeAsync: jest.fn(),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

export { mockDb };
